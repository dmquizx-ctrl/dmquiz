import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, HelpCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuestionImage } from '@/components/QuestionImage';
import { fileToDataUrl, uploadQuestionImage } from '@/lib/questionImages';

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  subject_id: string;
  option_count: number;
  created_at: string;
  image_path: string | null;
  subjects?: Subject;
}

interface TeacherQuestionManagerProps {
  teacherId: string;
  subjects: Subject[];
}

const TeacherQuestionManager = ({ teacherId, subjects }: TeacherQuestionManagerProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ใช้ ref นี้กันการ setState หลัง component unmount ไปแล้ว (เช่น ครูสลับแท็บระหว่างกำลังโหลด/บันทึกอยู่)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [formData, setFormData] = useState({
    subject_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    option_count: 4,
    image_path: null as string | null,
    image_preview: null as string | null
  });

  useEffect(() => {
    fetchQuestions();
  }, [teacherId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*, subjects(id, subject_code, subject_name)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!isMountedRef.current) return;
      setQuestions((data || []) as unknown as Question[]);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      if (!isMountedRef.current) return;
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดคำถามได้',
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject_id: '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      option_count: 4,
      image_path: null,
      image_preview: null
    });
    setEditingQuestion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      subject_id: question.subject_id,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      option_count: question.option_count || 4,
      image_path: question.image_path,
      image_preview: null
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.subject_id || !formData.question_text.trim()) {
      toast({
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        description: 'ต้องเลือกรายวิชาและกรอกคำถาม',
        variant: 'destructive',
      });
      return;
    }

    const requiredOptions = formData.option_count === 3
      ? [formData.option_a, formData.option_b, formData.option_c]
      : [formData.option_a, formData.option_b, formData.option_c, formData.option_d];

    if (requiredOptions.some(opt => !opt.trim())) {
      toast({
        title: 'กรุณากรอกตัวเลือกทั้งหมด',
        description: formData.option_count === 3
          ? 'ต้องกรอกตัวเลือก ก ข ค ทุกข้อ'
          : 'ต้องกรอกตัวเลือก ก ข ค ง ทุกข้อ',
        variant: 'destructive',
      });
      return;
    }

    if (formData.option_count === 3 && formData.correct_answer === 'D') {
      toast({
        title: 'คำตอบไม่ถูกต้อง',
        description: 'กรุณาเลือกคำตอบจาก ก ข ค เท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const imagePath = formData.image_preview
        ? await uploadQuestionImage(formData.image_preview, formData.image_path)
        : formData.image_path;
      const questionData = {
        subject_id: formData.subject_id,
        teacher_id: teacherId,
        question_text: formData.question_text.trim(),
        option_a: formData.option_a.trim(),
        option_b: formData.option_b.trim(),
        option_c: formData.option_c.trim(),
        option_d: formData.option_count === 4 ? formData.option_d.trim() : '-',
        correct_answer: formData.correct_answer,
        option_count: formData.option_count,
        image_path: imagePath,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;

        toast({
          title: 'แก้ไขคำถามสำเร็จ',
          description: 'คำถามได้รับการอัปเดตแล้ว',
        });
      } else {
        const { error } = await supabase
          .from('questions')
          .insert([questionData]);

        if (error) throw error;

        toast({
          title: 'เพิ่มคำถามสำเร็จ',
          description: 'คำถามถูกเพิ่มเข้าคลังข้อสอบแล้ว',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถบันทึกคำถามได้',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setDeletingId(questionId);
    try {
      // เช็คก่อนว่าคำถามนี้ถูกนำไปใช้ในข้อสอบชุดใดแล้วหรือไม่ — ถ้าใช้อยู่ ห้ามลบ
      // เพื่อไม่ให้กระทบข้อสอบ/ผลคะแนนของนักเรียนที่เคยทำไปแล้วหรือกำลังจะทำ
      const { data: usedIn, error: checkError } = await supabase
        .from('exam_questions')
        .select('exam_id')
        .eq('question_id', questionId)
        .limit(1);

      if (checkError) throw checkError;

      if (usedIn && usedIn.length > 0) {
        toast({
          title: 'ไม่สามารถลบได้',
          description: 'คำถามนี้ถูกใช้อยู่ในข้อสอบชุดหนึ่งแล้ว การลบอาจกระทบข้อสอบหรือผลคะแนนของนักเรียน',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: 'ลบคำถามสำเร็จ',
        description: 'คำถามถูกลบออกจากคลังข้อสอบแล้ว',
      });

      fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบคำถามได้',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ฟังก์ชันลบคำถามทั้งหมด — อนุญาตให้ลบเฉพาะตามรายวิชาที่เลือกกรองอยู่เท่านั้น
  // ห้ามลบข้ามทุกรายวิชาโดยเด็ดขาด เพื่อป้องกันการลบผิดชั้น/ผิดวิชาโดยไม่ตั้งใจ
  const handleDeleteAll = async () => {
    if (filterSubject === 'all') {
      toast({
        title: 'ไม่สามารถลบได้',
        description: 'กรุณาเลือกรายวิชาที่ต้องการลบก่อน ระบบไม่อนุญาตให้ลบคำถามข้ามทุกรายวิชาในครั้งเดียว',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkDeleting(true);
    try {
      const targetIds = filteredQuestions.map(q => q.id);
      if (targetIds.length === 0) return;

      // เช็คก่อนว่าข้อไหนในกลุ่มนี้ถูกใช้อยู่ในข้อสอบแล้วบ้าง — ข้อที่ใช้อยู่จะไม่ถูกลบ
      // เพื่อไม่ให้กระทบข้อสอบหรือผลคะแนนของนักเรียนที่เคยทำหรือกำลังจะทำ
      const { data: usedRows, error: checkError } = await supabase
        .from('exam_questions')
        .select('question_id')
        .in('question_id', targetIds);

      if (checkError) throw checkError;

      const usedIds = new Set((usedRows || []).map(r => r.question_id));
      const deletableIds = targetIds.filter(id => !usedIds.has(id));

      if (deletableIds.length === 0) {
        toast({
          title: 'ไม่สามารถลบได้',
          description: 'คำถามทุกข้อในรายวิชานี้ถูกใช้อยู่ในข้อสอบแล้ว จึงไม่สามารถลบข้อใดได้เลย',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', deletableIds);

      if (error) throw error;

      const skippedCount = targetIds.length - deletableIds.length;
      toast({
        title: 'ลบคำถามสำเร็จ',
        description: skippedCount > 0
          ? `ลบไปแล้ว ${deletableIds.length} ข้อ (ข้าม ${skippedCount} ข้อที่ถูกใช้ในข้อสอบอยู่)`
          : `ลบคำถามในรายวิชานี้ทั้งหมด ${deletableIds.length} ข้อแล้ว`,
      });

      fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting all questions:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบคำถามทั้งหมดได้',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filteredQuestions = filterSubject === 'all'
    ? questions
    : questions.filter(q => q.subject_id === filterSubject);

  const getAnswerLabel = (answer: string) => {
    const labels: Record<string, string> = {
      'A': 'ก',
      'B': 'ข',
      'C': 'ค',
      'D': 'ง'
    };
    return labels[answer] || answer;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">กำลังโหลดคำถาม...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            คลังข้อสอบ
          </CardTitle>
          <CardDescription>
            จัดการคำถามในคลังข้อสอบของคุณ ({questions.length} ข้อ)
          </CardDescription>
        </div>

        {/* แถบปุ่มจัดการด้านบน */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ปุ่ม "ลบคำถามทั้งหมด" แสดงเฉพาะเมื่อเลือกรายวิชาเจาะจงไว้แล้วเท่านั้น
              ถ้ากรองแบบ "ทุกรายวิชา" (all) จะไม่แสดงปุ่มนี้เลย เพื่อป้องกันการลบข้ามชั้น/ข้ามวิชาโดยไม่ตั้งใจ */}
          {filterSubject !== 'all' && filteredQuestions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  ลบคำถามทั้งหมด (วิชานี้)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบคำถามทั้งหมด?</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณแน่ใจหรือไม่ว่าต้องการลบคำถามจำนวน {filteredQuestions.length} ข้อ
                    ในรายวิชาที่เลือกอยู่นี้? การกระทำนี้ไม่สามารถยกเลิกได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBulkDeleting}>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={isBulkDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isBulkDeleting ? 'กำลังลบ...' : 'ยืนยันลบทั้งหมด'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มคำถามใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'แก้ไขคำถาม' : 'เพิ่มคำถามใหม่'}
                </DialogTitle>
                <DialogDescription>
                  กรอกโจทย์และตัวเลือก พร้อมระบุคำตอบที่ถูกต้อง
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>รายวิชา</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรายวิชา" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subject_code} - {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>จำนวนตัวเลือก</Label>
                  <Select
                    value={formData.option_count.toString()}
                    onValueChange={(value) => {
                      const count = parseInt(value);
                      setFormData({
                        ...formData,
                        option_count: count,
                        correct_answer: count === 3 && formData.correct_answer === 'D' ? 'A' : formData.correct_answer
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ตัวเลือก (ก, ข, ค) - สำหรับ ป.1-3</SelectItem>
                      <SelectItem value="4">4 ตัวเลือก (ก, ข, ค, ง) - สำหรับ ป.4 ขึ้นไป</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>โจทย์คำถาม</Label>
                  <Textarea
                    placeholder="พิมพ์โจทย์คำถามที่นี่..."
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>รูปประกอบ (ถ้ามี)</Label>
                  <QuestionImage path={formData.image_path} previewUrl={formData.image_preview} alt="รูปประกอบคำถาม" />
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5_000_000) {
                          toast({ title: 'รูปมีขนาดใหญ่เกิน 5 MB', variant: 'destructive' });
                          event.target.value = '';
                          return;
                        }
                        try {
                          const dataUrl = await fileToDataUrl(file);
                          setFormData(prev => ({ ...prev, image_preview: dataUrl }));
                        } catch (err) {
                          console.error('Error reading image file:', err);
                          toast({
                            title: 'ไม่สามารถอ่านไฟล์รูปได้',
                            description: 'ไฟล์อาจเสียหายหรือไม่รองรับ กรุณาลองเลือกไฟล์ใหม่',
                            variant: 'destructive',
                          });
                        } finally {
                          // เคลียร์ค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้ (บางเบราว์เซอร์ไม่ยิง onChange ถ้าค่าค้างอยู่)
                          event.target.value = '';
                        }
                      }}
                    />
                    {(formData.image_path || formData.image_preview) && (
                      <Button variant="outline" size="icon" onClick={() => setFormData({ ...formData, image_path: null, image_preview: null })} title="ลบรูป">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ตัวเลือก ก.</Label>
                    <Input
                      placeholder="ตัวเลือก ก"
                      value={formData.option_a}
                      onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ตัวเลือก ข.</Label>
                    <Input
                      placeholder="ตัวเลือก ข"
                      value={formData.option_b}
                      onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ตัวเลือก ค.</Label>
                    <Input
                      placeholder="ตัวเลือก ค"
                      value={formData.option_c}
                      onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    />
                  </div>
                  {formData.option_count === 4 && (
                    <div className="space-y-2">
                      <Label>ตัวเลือก ง.</Label>
                      <Input
                        placeholder="ตัวเลือก ง"
                        value={formData.option_d}
                        onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>คำตอบที่ถูกต้อง</Label>
                  <RadioGroup
                    value={formData.correct_answer}
                    onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="answer-a" />
                      <Label htmlFor="answer-a" className="cursor-pointer">ก.</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="answer-b" />
                      <Label htmlFor="answer-b" className="cursor-pointer">ข.</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="answer-c" />
                      <Label htmlFor="answer-c" className="cursor-pointer">ค.</Label>
                    </div>
                    {formData.option_count === 4 && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="D" id="answer-d" />
                        <Label htmlFor="answer-d" className="cursor-pointer">ง.</Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : (editingQuestion ? 'บันทึกการแก้ไข' : 'เพิ่มคำถาม')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {subjects.length > 1 && (
          <div className="mb-4">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="กรองตามรายวิชา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกรายวิชา</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.subject_code} - {subject.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filterSubject === 'all'
              ? 'ยังไม่มีคำถามในคลังข้อสอบ กดปุ่มด้านบนเพื่อเพิ่มคำถามใหม่'
              : 'ไม่มีคำถามในรายวิชานี้'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => (
              <Card key={question.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          ข้อ {index + 1}
                        </span>
                        {question.subjects && (
                          <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                            {question.subjects.subject_code}
                          </span>
                        )}
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                          {question.option_count || 4} ตัวเลือก
                        </span>
                      </div>
                      <p className="font-medium mb-3">{question.question_text}</p>
                      <QuestionImage path={question.image_path} alt={`รูปประกอบข้อ ${index + 1}`} className="mb-3" />
                      <div className={`grid grid-cols-1 gap-2 text-sm ${(question.option_count || 4) === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        <div className={`p-2 rounded ${question.correct_answer === 'A' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' : 'bg-muted'}`}>
                          ก. {question.option_a}
                        </div>
                        <div className={`p-2 rounded ${question.correct_answer === 'B' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' : 'bg-muted'}`}>
                          ข. {question.option_b}
                        </div>
                        <div className={`p-2 rounded ${question.correct_answer === 'C' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' : 'bg-muted'}`}>
                          ค. {question.option_c}
                        </div>
                        {(question.option_count || 4) === 4 && (
                          <div className={`p-2 rounded ${question.correct_answer === 'D' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' : 'bg-muted'}`}>
                            ง. {question.option_d}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        เฉลย: {getAnswerLabel(question.correct_answer)} |
                        สร้างเมื่อ: {new Date(question.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" disabled={deletingId === question.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบคำถาม</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจหรือไม่ว่าต้องการลบคำถามนี้? การกระทำนี้ไม่สามารถยกเลิกได้
                              (ระบบจะตรวจสอบก่อนว่าคำถามนี้ถูกใช้ในข้อสอบชุดใดอยู่หรือไม่)
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === question.id}>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(question.id)}
                              disabled={deletingId === question.id}
                            >
                              {deletingId === question.id ? 'กำลังลบ...' : 'ลบคำถาม'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherQuestionManager;
