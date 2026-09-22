import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle, Trash2, Archive, Send, Lock, Shuffle } from 'lucide-react';
import { fromLocalInputValue } from '@/lib/examSchedule';
import { cropPageImage, fileToDataUrl, uploadQuestionImage } from '@/lib/questionImages';
import { QuestionImage } from '@/components/QuestionImage';


interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
}

interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  option_count: number;
  has_image?: boolean;
  page_number?: number | null;
  image_crop?: { x: number; y: number; width: number; height: number } | null;
  image_path?: string | null;
  image_preview?: string | null;
}

interface ExamImportProps {
  teacherId: string;
  subjects: Subject[];
  onImported?: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const THAI_LETTERS: Record<string, string> = { A: 'ก', B: 'ข', C: 'ค', D: 'ง' };

const ExamImport = ({ teacherId, subjects, onImported }: ExamImportProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [subjectId, setSubjectId] = useState('');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState<false | 'bank' | 'exam'>(false);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [examName, setExamName] = useState('');
  const [duration, setDuration] = useState(60);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [expectedCount, setExpectedCount] = useState<number | null>(null);


  const extractPdfContent = async (file: File) => {
    const pdfjs: any = await import('pdfjs-dist');
    const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let text = '';
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n\n';
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ไม่สามารถอ่านภาพจาก PDF ได้');
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas.toDataURL('image/jpeg', 0.72));
    }
    return { text, pages };
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const { text, pages } = await extractPdfContent(file);
        setRawText(text);
        setPageImages(pages);
        const countMatch = text.match(/(?:ทั้งหมด|จำนวน|\()\s*(\d+)\s*ข้อ/i);
        setExpectedCount(countMatch ? Number(countMatch[1]) : null);
        toast({ title: 'อ่านไฟล์ PDF สำเร็จ', description: `พบ ${pages.length} หน้า พร้อมรูปประกอบ` });
      } else {
        const text = await file.text();
        setRawText(text);
        toast({ title: 'อ่านไฟล์สำเร็จ' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'อ่านไฟล์ไม่สำเร็จ', description: 'ลองคัดลอกข้อความมาวางแทน', variant: 'destructive' });
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast({ title: 'กรุณาอัปโหลดไฟล์หรือวางข้อความข้อสอบ', variant: 'destructive' });
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-exam-file', {
        body: { text: rawText, pages: pageImages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const nextQuestions = await Promise.all((data.questions || []).map(async (q: ParsedQuestion) => {
        if (!q.has_image || !q.page_number || !q.image_crop || !pageImages[q.page_number - 1]) return q;
        try {
          const image_preview = await cropPageImage(pageImages[q.page_number - 1], q.image_crop);
          return { ...q, image_preview };
        } catch {
          return q;
        }
      }));
      setQuestions(nextQuestions);
      setExamName((prev) => prev || data.exam_title || '');
      setDuration(data.duration_minutes || 60);
      toast({ title: `พบข้อสอบ ${data.questions?.length || 0} ข้อ`, description: 'ตรวจสอบเฉลยก่อนบันทึก' });
    } catch (e: any) {
      toast({ title: e.message || 'วิเคราะห์ไม่สำเร็จ', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<ParsedQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const shuffleArray = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const handleShuffle = () => {
    if (questions.some((q) => q.image_preview || q.image_path)) {
      toast({ title: 'ข้อสอบมีตัวเลือกเป็นรูปภาพ', description: 'ระบบไม่สุ่มตัวเลือกเพื่อป้องกันรูปและเฉลยคลาดเคลื่อน', variant: 'destructive' });
      return;
    }
    const missing = questions.findIndex((q) => !LETTERS.includes(q.correct_answer));
    if (missing >= 0) {
      toast({ title: `ข้อ ${missing + 1} ยังไม่ได้เลือกเฉลย จึงสุ่มไม่ได้`, variant: 'destructive' });
      return;
    }

    // สร้างเป้าหมายตำแหน่งเฉลยแบบเฉลี่ยเท่า ๆ กัน แยกตามจำนวนตัวเลือก
    const targetsByCount: Record<number, string[]> = {};
    [3, 4].forEach((count) => {
      const idxs = questions.map((q, i) => ({ q, i })).filter(({ q }) => (q.option_count === 3 ? 3 : 4) === count);
      if (!idxs.length) return;
      const letters = LETTERS.slice(0, count);
      const seq: string[] = [];
      for (let i = 0; i < idxs.length; i++) seq.push(letters[i % count]);
      targetsByCount[count] = shuffleArray(seq);
    });

    const cursor: Record<number, number> = { 3: 0, 4: 0 };

    const next = questions.map((q) => {
      const count = q.option_count === 3 ? 3 : 4;
      const letters = LETTERS.slice(0, count);
      const values = letters.map((L) => q[`option_${L.toLowerCase()}` as keyof ParsedQuestion] as string);
      const correctValue = values[letters.indexOf(q.correct_answer)];

      const target = targetsByCount[count][cursor[count]++];
      const others = shuffleArray(values.filter((_, idx) => letters[idx] !== q.correct_answer));

      const patch: Partial<ParsedQuestion> = { correct_answer: target };
      let oi = 0;
      letters.forEach((L) => {
        const key = `option_${L.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
        patch[key] = L === target ? correctValue : others[oi++];
      });
      return { ...q, ...patch };
    });

    setQuestions(next);
    const dist = LETTERS.map((L) => `${THAI_LETTERS[L]}=${next.filter((q) => q.correct_answer === L).length}`).join(' ');
    toast({ title: 'สุ่มตัวเลือกใหม่แล้ว', description: `กระจายเฉลย: ${dist}` });
  };


  const handleSave = async (mode: 'bank' | 'exam') => {
    if (!subjectId) {
      toast({ title: 'กรุณาเลือกรายวิชา', variant: 'destructive' });
      return;
    }
    const missing = questions.findIndex((q) => !LETTERS.includes(q.correct_answer));
    if (missing >= 0) {
      toast({ title: `ข้อ ${missing + 1} ยังไม่ได้เลือกเฉลย`, variant: 'destructive' });
      return;
    }
    const start = fromLocalInputValue(startAt);
    const end = fromLocalInputValue(endAt);
    if (mode === 'exam' && start && end && new Date(end) <= new Date(start)) {
      toast({ title: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มสอบ', variant: 'destructive' });
      return;
    }
    setSaving(mode);
    try {
      const questionsWithImages = await Promise.all(questions.map(async (question) => {
        if (!question.image_preview) return question;
        const image_path = await uploadQuestionImage(question.image_preview, question.image_path);
        return { ...question, image_path, image_preview: undefined };
      }));
      const { data, error } = await supabase.functions.invoke('import-exam', {
        body: {
          teacher_id: teacherId,
          subject_id: subjectId,
          questions: questionsWithImages,
          create_exam: mode === 'exam',
          exam_name: examName || 'ข้อสอบนำเข้า',
          duration_minutes: duration,
          start_at: mode === 'exam' ? start : null,
          end_at: mode === 'exam' ? end : null,
          is_locked: mode === 'exam' ? needsUnlock : false,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'นำเข้าสำเร็จ',
        description:
          mode === 'exam'
            ? `บันทึก ${data.imported} ข้อ และส่งข้อสอบให้นักเรียน${
                needsUnlock ? ' (รอผู้ดูแลระบบปลดล็อก)' : ' ตามเวลาที่กำหนด'
              }`
            : `บันทึก ${data.imported} ข้อ เข้าคลังข้อสอบแล้ว`,
      });
      setQuestions([]);
      setRawText('');
      setFileName('');
      setExamName('');
      setStartAt('');
      setEndAt('');
      setNeedsUnlock(false);
      setPageImages([]);
      setExpectedCount(null);
      if (fileRef.current) fileRef.current.value = '';
      onImported?.();
    } catch (e: any) {
      toast({ title: e.message || 'บันทึกไม่สำเร็จ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  const unanswered = questions.filter((q) => !LETTERS.includes(q.correct_answer)).length;
  const imageCount = questions.filter((q) => q.image_preview || q.image_path).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            นำเข้าข้อสอบจากไฟล์
          </CardTitle>
          <CardDescription>
            อัปโหลดไฟล์ข้อสอบ (PDF หรือข้อความ) ระบบจะใช้ AI แยกโจทย์ ตัวเลือก ก-ง และเฉลยให้อัตโนมัติ
            จากนั้นสร้างชุดข้อสอบให้นักเรียนเข้าสอบและตรวจคะแนนได้ทันที
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>รายวิชา *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกรายวิชา" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.subject_code} - {s.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ไฟล์ข้อสอบ (.pdf, .txt)</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {fileName && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> {fileName}
            </p>
          )}

          {pageImages.length > 0 && (
            <div className="rounded-md border bg-secondary/40 p-3 text-sm">
              อ่านเอกสารแล้ว {pageImages.length} หน้า{expectedCount ? ` • เอกสารระบุ ${expectedCount} ข้อ` : ''} ระบบจะวิเคราะห์ภาพพร้อมข้อความ
            </div>
          )}

          <div className="space-y-2">
            <Label>หรือวางข้อความข้อสอบ</Label>
            <Textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'1. คำถาม...\nก. ตัวเลือก\nข. ตัวเลือก\n...\n\nเฉลย: 1. ข'}
            />
          </div>

          <Button onClick={handleParse} disabled={parsing || !rawText.trim()} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            {parsing ? 'กำลังวิเคราะห์ด้วย AI...' : 'วิเคราะห์ข้อสอบด้วย AI'}
          </Button>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                ตรวจสอบข้อสอบ
                <Badge variant="secondary">{questions.length} ข้อ</Badge>
                {imageCount > 0 && <Badge variant="outline">มีรูป {imageCount} ข้อ</Badge>}
              </CardTitle>
              {unanswered > 0 ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> ยังไม่มีเฉลย {unanswered} ข้อ
                </Badge>
              ) : (
                <Badge className="flex items-center gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" /> มีเฉลยครบทุกข้อ
                </Badge>
              )}
            </div>
            <CardDescription>คลิกตัวอักษรเพื่อกำหนดข้อที่ถูกต้อง</CardDescription>
            {expectedCount && questions.length !== expectedCount && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                เอกสารระบุ {expectedCount} ข้อ แต่ระบบพบ {questions.length} ข้อ กรุณาตรวจสอบก่อนบันทึก
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">การกระจายเฉลย:</span>
                {LETTERS.map((L) => (
                  <Badge key={L} variant="outline">
                    {THAI_LETTERS[L]} = {questions.filter((q) => q.correct_answer === L).length} ข้อ
                  </Badge>
                ))}
              </div>
              <Button variant="secondary" onClick={handleShuffle} disabled={unanswered > 0} className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                สุ่มตัวเลือกและเฉลยให้กระจายเท่า ๆ กัน
              </Button>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-3 pr-1">
              {questions.map((q, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {i + 1}. {q.question_text}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <QuestionImage previewUrl={q.image_preview} path={q.image_path} alt={`รูปประกอบข้อ ${i + 1}`} className="mx-auto" />
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`เลือกรูปประกอบข้อ ${i + 1}`}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5_000_000) {
                          toast({ title: 'รูปมีขนาดใหญ่เกิน 5 MB', variant: 'destructive' });
                          return;
                        }
                        updateQuestion(i, { image_preview: await fileToDataUrl(file), has_image: true });
                      }}
                    />
                    {(q.image_preview || q.image_path) && (
                      <Button variant="outline" size="icon" onClick={() => updateQuestion(i, { image_preview: null, image_path: null, has_image: false })} title="ลบรูป">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {LETTERS.slice(0, q.option_count).map((L) => {
                      const key = `option_${L.toLowerCase()}` as keyof ParsedQuestion;
                      const selected = q.correct_answer === L;
                      return (
                        <button
                          key={L}
                          type="button"
                          onClick={() => updateQuestion(i, { correct_answer: L })}
                          className={`text-left text-sm rounded-md border px-3 py-2 transition-colors ${
                            selected ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/60'
                          }`}
                        >
                          <span className="font-bold mr-2">{THAI_LETTERS[L]}.</span>
                          {q[key] as string}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">ขั้นตอนที่ 1 — เก็บเข้าคลังข้อสอบ</p>
                <p className="text-sm text-muted-foreground">
                  บันทึกคำถามทั้งหมดเข้าคลังข้อสอบของรายวิชานี้ โดยยังไม่ส่งให้นักเรียนสอบ
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleSave('bank')}
                disabled={!!saving}
                className="w-full gap-2"
              >
                <Archive className="h-4 w-4" />
                {saving === 'bank' ? 'กำลังบันทึก...' : 'เก็บข้อสอบเข้าคลัง'}
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">ขั้นตอนที่ 2 — ส่งให้นักเรียนสอบตามเวลาที่กำหนด</p>
                <p className="text-sm text-muted-foreground">
                  เก็บเข้าคลังพร้อมสร้างชุดข้อสอบ และกำหนดช่วงเวลาที่นักเรียนเข้าสอบได้
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ชื่อชุดข้อสอบ</Label>
                  <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="เช่น ข้อสอบปลายภาค" />
                </div>
                <div className="space-y-2">
                  <Label>เวลาทำข้อสอบ (นาที)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>เปิดให้สอบตั้งแต่</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ปิดรับการสอบ</Label>
                  <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                หากไม่ระบุช่วงเวลา นักเรียนจะสอบได้ตลอดเวลาที่ข้อสอบเปิดใช้งาน
              </p>
              <div className="flex items-start gap-2">
                <Checkbox id="needs-unlock" checked={needsUnlock} onCheckedChange={(v) => setNeedsUnlock(!!v)} />
                <Label htmlFor="needs-unlock" className="cursor-pointer font-normal">
                  <span className="flex items-center gap-1 font-medium">
                    <Lock className="h-3.5 w-3.5" /> ล็อกไว้ก่อน ให้ผู้ดูแลระบบปลดล็อกจึงสอบได้
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    ใช้กรณีต้องสอบเรียงตามลำดับรายวิชา
                  </span>
                </Label>
              </div>
              <Button onClick={() => handleSave('exam')} disabled={!!saving} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {saving === 'exam' ? 'กำลังบันทึก...' : 'เก็บเข้าคลัง และส่งให้นักเรียนสอบ'}
              </Button>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExamImport;
