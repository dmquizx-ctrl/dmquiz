import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, CheckCircle, ArrowLeft, ArrowRight, ShieldAlert, Maximize } from 'lucide-react';
import { QuestionImage } from '@/components/QuestionImage';

interface ExamQuestion {
  question_id: string;
  question_order: number;
  questions: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_count: number | null;
    image_path: string | null;
  };
}

interface ExamInfo {
  id: string;
  exam_name: string;
  duration_minutes: number;
  question_count: number;
  subjects: { grade_level: string } | null;
}

const ExamTaking = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total_questions: number } | null>(null);

  // โหมดบังคับเต็มหน้าจอ (Anti-Cheating State)
  const [isFullScreen, setIsFullScreen] = useState(false);

  // ---- Refs used to avoid stale closures / race conditions ----
  const answersRef = useRef(answers);
  const submittingRef = useRef(false);
  const resultRef = useRef(result);
  const endTimeRef = useRef<number | null>(null);
  const storageKeyRef = useRef<string | null>(null);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { resultRef.current = result; }, [result]);

  // localStorage key scoped to this student + this exam
  useEffect(() => {
    if (user?.id && examId) {
      storageKeyRef.current = `exam-answers:${user.id}:${examId}`;
    }
  }, [user?.id, examId]);

  // ---- Persist answers locally so a refresh/crash doesn't lose progress ----
  useEffect(() => {
    if (!storageKeyRef.current) return;
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(answers));
    } catch {
      // localStorage may be unavailable
    }
  }, [answers]);

  useEffect(() => {
    let isMounted = true;

    if (!user || user.userType !== 'student') {
      navigate('/login');
      return;
    }
    if (examId) {
      fetchExam(isMounted);
    }

    return () => {
      isMounted = false;
    };
  }, [user, examId]);

  const fetchExam = async (isMounted: boolean) => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, exam_name, duration_minutes, question_count, subject_id, teacher_id, subjects(grade_level)')
        .eq('id', examId!)
        .eq('is_active', true)
        .single();

      if (!isMounted) return;

      if (examError || !examData) {
        toast({ title: 'ไม่พบข้อสอบหรือข้อสอบปิดใช้งานแล้ว', variant: 'destructive' });
        navigate('/student');
        return;
      }

      const examGrade = (examData.subjects as any)?.grade_level;
      if (examGrade && examGrade !== user!.class) {
        toast({ title: 'ข้อสอบชุดนี้ไม่ได้เปิดให้ชั้นเรียนของคุณ', variant: 'destructive' });
        navigate('/student');
        return;
      }

      const { data: existingResults } = await supabase
        .from('exam_results')
        .select('id')
        .eq('student_id', user!.id)
        .eq('exam_id', examId!);

      if (!isMounted) return;

      const existing = existingResults && existingResults.length > 0 ? existingResults[0] : null;

      if (existing) {
        toast({ title: 'คุณได้ทำข้อสอบชุดนี้ไปแล้ว', variant: 'destructive' });
        navigate('/student');
        return;
      }

      if (!isMounted) return;
      setExam(examData);

      endTimeRef.current = Date.now() + examData.duration_minutes * 60 * 1000;
      setTimeLeft(examData.duration_minutes * 60);

      const loadQuestions = async () =>
        await supabase
          .from('exam_questions')
          .select('question_id, question_order, questions(id, question_text, option_a, option_b, option_c, option_d, option_count, image_path)')
          .eq('exam_id', examId!)
          .order('question_order');

      let { data: questionsData, error: qError } = await loadQuestions();

      if (qError) throw qError;

      if (!questionsData || questionsData.length === 0) {
        const { error: regenError } = await supabase.functions.invoke('regenerate-exam-questions', {
          body: {
            exam_id: examId,
            question_count: (examData as any).question_count || 10,
            subject_id: (examData as any).subject_id || null,
            teacher_id: (examData as any).teacher_id || null,
          },
        });

        if (regenError) console.error('regenerate-exam-questions failed:', regenError);

        ({ data: questionsData, error: qError } = await loadQuestions());
        if (qError) throw qError;
      }

      if (!isMounted) return;

      if (!questionsData || questionsData.length === 0) {
        toast({ title: 'ข้อสอบยังไม่มีคำถาม กรุณาติดต่อครูผู้สอน', variant: 'destructive' });
        navigate('/student');
        return;
      }

      setQuestions((questionsData as any) || []);

      if (storageKeyRef.current) {
        try {
          const saved = localStorage.getItem(storageKeyRef.current);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') setAnswers(parsed);
          }
        } catch {}
      }
    } catch (error) {
      if (!isMounted) return;
      console.error(error);
      toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || resultRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await supabase.functions.invoke('submit-exam', {
          body: { student_id: user!.id, exam_id: examId, answers: answersRef.current }
        });

        if (response.error) throw response.error;
        const data = response.data;
        if (data.error) throw new Error(data.error);

        setResult({ score: data.score, total_questions: data.total_questions });
        toast({ title: `ส่งข้อสอบสำเร็จ! ได้ ${data.score}/${data.total_questions} คะแนน` });

        if (storageKeyRef.current) {
          try { localStorage.removeItem(storageKeyRef.current); } catch {}
        }

        // ปลดล็อกออกจากโหมดเต็มหน้าจอเมื่อส่งข้อสอบเรียบร้อย
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(res => setTimeout(res, 1000 * attempt));
        }
      }
    }

    if (lastError) {
      toast({
        title: lastError.message || 'ไม่สามารถส่งข้อสอบได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    }

    submittingRef.current = false;
    setSubmitting(false);
  }, [examId, user, toast]);

  // ฟังก์ชันสลับเข้าสู่โหมดเต็มหน้าจอ (Full Screen Request)
  const handleStartExamFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      setIsFullScreen(true);
    }
  };

  // ระบบป้องกันการทุจริตขั้นสูง (Anti-Cheating Protection)
  useEffect(() => {
    if (result) return;

    // 1. บล็อกการคลิกขวา
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: 'ไม่อนุญาตให้ใช้งาน',
        description: 'ปิดการใช้งานคลิกขวาเพื่อป้องกันการทุจริต',
        variant: 'destructive',
      });
    };

    // 2. บล็อกการคัดลอก / วาง / ตัดข้อความ
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: 'ไม่อนุญาตให้ใช้งาน',
        description: 'ห้ามคัดลอกหรือวางข้อความในระหว่างทำข้อสอบ',
        variant: 'destructive',
      });
    };

    // 3. บล็อกปุ่ม F12 และคีย์ลัดตรวจสอบโค้ด
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'c', 'C', 'v', 'V', 's', 'S'].includes(e.key))
      ) {
        e.preventDefault();
        toast({
          title: 'เตือนภัย',
          description: 'ไม่อนุญาตให้ใช้งานปุ่มคีย์ลัดนี้',
          variant: 'destructive',
        });
      }
    };

    // 4. ตรวจจับการหลุดโฟกัสหน้าต่าง (Blur Event - ป้องกันการคลิกไปหน้า AI ด้านข้าง)
    const handleWindowBlur = () => {
      if (!resultRef.current && isFullScreen) {
        toast({
          title: 'เตือนภัยทุจริต!',
          description: 'ห้ามคลิกออกนอกหน้าต่างข้อสอบหรือสลับโปรแกรมเด็ดขาด',
          variant: 'destructive',
        });
      }
    };

    // 5. ตรวจจับการออกจากโหมดเต็มหน้าจอ
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && !resultRef.current) {
        setIsFullScreen(false);
        toast({
          title: 'เตือนภัย!',
          description: 'กรุณาทำข้อสอบในโหมดเต็มหน้าจอเท่านั้น',
          variant: 'destructive',
        });
      } else if (document.fullscreenElement) {
        setIsFullScreen(true);
      }
    };

    // 6. ตรวจจับการสลับแท็บ
    const handleVisibilityChange = () => {
      if (document.hidden && !resultRef.current) {
        toast({
          title: 'เตือนภัย',
          description: 'ห้ามออกจากหน้าทำข้อสอบหรือสลับแท็บเด็ดขาด!',
          variant: 'destructive',
        });
      }
    };

    // 7. เตือนก่อนปิดแท็บหรือรีเฟรชหน้าเว็บ
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!resultRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [result, isFullScreen, toast]);

  // Timer
  useEffect(() => {
    if (!exam || result || endTimeRef.current == null || !isFullScreen) return;

    const tick = () => {
      const remainingMs = endTimeRef.current! - Date.now();
      const remainingSec = Math.max(0, Math.round(remainingMs / 1000));
      setTimeLeft(remainingSec);
      if (remainingSec <= 0) {
        clearInterval(timer);
        handleSubmit();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [exam, result, isFullScreen, handleSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">กำลังโหลดข้อสอบ...</p></div>;
  }

  if (result) {
    const percentage = Math.round((result.score / result.total_questions) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">ส่งข้อสอบเรียบร้อย!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg font-medium">{exam?.exam_name}</p>
            <div className="text-5xl font-bold text-primary">{result.score}/{result.total_questions}</div>
            <p className="text-muted-foreground">คิดเป็น {percentage}%</p>
            <Button onClick={() => navigate('/student')} className="w-full mt-4">
              กลับหน้าหลัก
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // หน้าจอครอบบังคับเข้า Fullscreen ก่อนทำข้อสอบ
  if (!isFullScreen) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto animate-bounce" />
            <CardTitle className="text-2xl font-bold">ระเบียบการเข้าทำข้อสอบ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700 space-y-2 text-sm">
              <p className="font-semibold text-amber-400">⚠️ ระบบป้องกันการทุจริตจะทำงานเมื่อเปิดข้อสอบ:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>ต้องทำข้อสอบใน<b>โหมดเต็มหน้าจอ (Full Screen)</b> เท่านั้น</li>
                <li>ห้ามคลิกออกนอกหน้าจอ หรือแบ่งครึ่งหน้าจอกับโปรแกรมอื่น (รวมถึง AI)</li>
                <li>ห้ามคลิกขวา, คัดลอก หรือใช้ปุ่มคีย์ลัดช่วยเหลือ</li>
              </ul>
            </div>
            <Button onClick={handleStartExamFullScreen} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-base gap-2">
              <Maximize className="h-5 w-5" /> เข้าสู่โหมดเต็มหน้าจอและเริ่มทำข้อสอบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const q = currentQ?.questions;
  const optionCount = q?.option_count || 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background select-none">
      {/* Sticky header with timer */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-primary truncate">{exam?.exam_name}</h1>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 60 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Question navigation dots */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all
                ${i === currentIndex ? 'border-primary bg-primary text-primary-foreground' :
                  answers[questions[i]?.question_id] ? 'border-green-500 bg-green-500/20 text-green-700' :
                  'border-muted-foreground/30 text-muted-foreground'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        {q && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">
                ข้อ {currentIndex + 1} / {questions.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-medium leading-relaxed">{q.question_text}</p>
              <QuestionImage path={q.image_path} alt={`รูปประกอบข้อ ${currentIndex + 1}`} className="mx-auto" />
              <RadioGroup
                value={answers[currentQ.question_id] || ''}
                onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQ.question_id]: val }))}
                className="space-y-3"
              >
                {['A', 'B', 'C', 'D'].slice(0, optionCount).map((opt) => {
                  const optionKey = `option_${opt.toLowerCase()}` as keyof typeof q;
                  return (
                    <div key={opt} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                      ${answers[currentQ.question_id] === opt ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value={opt} id={`opt-${opt}`} />
                      <Label htmlFor={`opt-${opt}`} className="flex-1 cursor-pointer">
                        <span className="font-bold mr-2">{opt}.</span>
                        {q[optionKey] as string}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> ข้อก่อนหน้า
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(i => i + 1)}>
              ข้อถัดไป <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                  <CheckCircle className="h-4 w-4 mr-1" /> ส่งข้อสอบ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันส่งข้อสอบ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ตอบแล้ว {Object.keys(answers).length}/{questions.length} ข้อ
                    {Object.keys(answers).length < questions.length && ' (ยังตอบไม่ครบ)'}
                    <br />เมื่อส่งแล้วจะไม่สามารถแก้ไขได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'กำลังส่ง...' : 'ยืนยันส่ง'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Answered count */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          ตอบแล้ว {Object.keys(answers).length}/{questions.length} ข้อ
        </p>
      </main>
    </div>
  );
};

export default ExamTaking;
