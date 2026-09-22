import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, FileQuestion, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuestionImage } from '@/components/QuestionImage';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  subject_id: string | null;
  teacher_id: string | null;
  created_at: string;
  image_path: string | null;
  subjects?: { subject_code: string; subject_name: string };
  teachers?: { first_name: string; last_name: string };
}

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  grade_level: string;
}

const convertFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

const uploadQuestionImage = async (file: File, previousPath: string | null) => {
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('question-images')
    .upload(filePath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (uploadError) throw new Error(uploadError.message || 'ไม่สามารถอัปโหลดรูปภาพได้');

  await removeStoredImage(previousPath);
  return filePath;
};

const removeStoredImage = async (path: string | null) => {
  if (!path || path.startsWith('data:') || path.startsWith('http') || path.startsWith('blob:')) return;
  const { error } = await supabase.storage.from('question-images').remove([path]);
  if (error) console.error('Could not remove image:', error.message);
};

export const QuestionManagement = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', subject_id: 'none',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const fetchData = async () => {
    try {
      const [questionsResult, subjectsResult] = await Promise.all([
        supabase.from('questions').select('*, subjects(subject_code, subject_name), teachers(first_name, last_name)').order('created_at', { ascending: false }),
        supabase.from('subjects').select('id, subject_code, subject_name, grade_level').order('subject_code'),
      ]);
      if (questionsResult.error) throw questionsResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      setQuestions((questionsResult.data || []) as Question[]);
      setSubjects((subjectsResult.data || []) as Subject[]);
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลข้อสอบได้', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'ชนิดไฟล์ไม่รองรับ', description: 'รองรับเฉพาะ JPG, PNG และ WebP', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'ไฟล์ใหญ่เกินไป', description: 'กรุณาเลือกรูปภาพขนาดไม่เกิน 3MB', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const oldPath = editingQuestion?.image_path || null;
      let imagePath = oldPath;
      if (imageFile) imagePath = await uploadQuestionImage(imageFile, oldPath);
      else if (removeExistingImage) {
        imagePath = null;
        await removeStoredImage(oldPath);
      }

      const questionData = {
        question_text: formData.question_text,
        option_a: formData.option_a,
        option_b: formData.option_b,
        option_c: formData.option_c,
        option_d: formData.option_d,
        correct_answer: formData.correct_answer,
        subject_id: formData.subject_id !== 'none' ? formData.subject_id : null,
        image_path: imagePath,
      };
      const result = editingQuestion
        ? await supabase.from('questions').update(questionData).eq('id', editingQuestion.id)
        : await supabase.from('questions').insert([questionData]);
      if (result.error) throw result.error;
      toast({ title: 'สำเร็จ', description: editingQuestion ? 'แก้ไขข้อสอบเรียบร้อยแล้ว' : 'เพิ่มข้อสอบเรียบร้อยแล้ว' });
      setIsDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast({ title: 'เกิดข้อผิดพลาด', description: error.message || 'ไม่สามารถบันทึกข้อมูลได้', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบข้อสอบนี้?')) return;
    try {
      const question = questions.find((item) => item.id === id);
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      await removeStoredImage(question?.image_path || null);
      toast({ title: 'สำเร็จ', description: 'ลบข้อสอบเรียบร้อยแล้ว' });
      await fetchData();
    } catch (error: any) {
      toast({ title: 'เกิดข้อผิดพลาด', description: error.message || 'ไม่สามารถลบข้อสอบได้', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', subject_id: 'none' });
    setEditingQuestion(null);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null); setRemoveExistingImage(false);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setFormData({ question_text: question.question_text, option_a: question.option_a, option_b: question.option_b, option_c: question.option_c, option_d: question.option_d, correct_answer: question.correct_answer, subject_id: question.subject_id || 'none' });
    setImageFile(null); setImagePreview(null); setRemoveExistingImage(false); setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card><CardHeader><div className="flex justify-between items-center"><div><CardTitle>จัดการคำถาม</CardTitle><CardDescription>มีคำถามในคลัง {questions.length} ข้อ</CardDescription></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> เพิ่มคำถามใหม่</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"><form onSubmit={handleSubmit}><DialogHeader><DialogTitle>{editingQuestion ? 'แก้ไขคำถาม' : 'เพิ่มคำถามใหม่'}</DialogTitle><DialogDescription>กรอกข้อมูลคำถามและตัวเลือกทั้งหมด</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="subject_id">รายวิชา</Label><Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}><SelectTrigger><SelectValue placeholder="เลือกรายวิชา (ไม่บังคับ)" /></SelectTrigger><SelectContent><SelectItem value="none">ไม่ระบุ</SelectItem>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.subject_code} - {subject.subject_name} ({subject.grade_level})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label htmlFor="question_text">คำถาม *</Label><Textarea id="question_text" value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} placeholder="พิมพ์คำถาม..." required rows={3} /></div>
              <div className="grid gap-2"><Label htmlFor="image">รูปประกอบคำถาม (ถ้ามี)</Label><Input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
                {imagePreview && <div className="relative w-fit mt-2"><img src={imagePreview} alt="ตัวอย่างรูปใหม่" className="max-h-40 rounded-md border object-contain" /><Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={handleRemoveImage}><X className="h-3 w-3" /></Button></div>}
                {!imagePreview && !removeExistingImage && editingQuestion?.image_path && <div className="relative w-fit mt-2"><QuestionImage path={editingQuestion.image_path} alt="รูปเดิม" className="max-h-40" /><Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={handleRemoveImage}><X className="h-3 w-3" /></Button></div>}
              </div>
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((option, index) => <div className="grid gap-2" key={option}><Label htmlFor={option}>ตัวเลือก {String.fromCharCode(65 + index)} *</Label><Input id={option} value={formData[option]} onChange={(e) => setFormData({ ...formData, [option]: e.target.value })} placeholder={`ตัวเลือก ${String.fromCharCode(65 + index)}`} required /></div>)}
              <div className="grid gap-2"><Label htmlFor="correct_answer">คำตอบที่ถูกต้อง *</Label><select id="correct_answer" value={formData.correct_answer} onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
            </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>ยกเลิก</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : editingQuestion ? 'บันทึกการแก้ไข' : 'เพิ่มคำถาม'}</Button></DialogFooter>
          </form></DialogContent>
        </Dialog>
      </div></CardHeader></Card>
      <Card><CardContent className="pt-6">{isLoading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลดข้อมูล...</div> : questions.length === 0 ? <div className="text-center py-12 text-muted-foreground"><FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="text-lg font-medium">ยังไม่มีคำถามในระบบ</p><p className="text-sm mt-1">เริ่มต้นเพิ่มคำถามแรกของคุณ</p></div> : <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>รายวิชา</TableHead><TableHead>คำถาม</TableHead><TableHead className="text-center">คำตอบที่ถูกต้อง</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader><TableBody>{questions.map((question) => <TableRow key={question.id}><TableCell className="min-w-[150px]">{question.subjects ? `${question.subjects.subject_code} - ${question.subjects.subject_name}` : '-'}</TableCell><TableCell className="max-w-md">{question.image_path && <QuestionImage path={question.image_path} alt="รูปประกอบคำถาม" className="mb-2 max-h-20" />}<div className="line-clamp-2">{question.question_text}</div></TableCell><TableCell className="text-center"><span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">{question.correct_answer}</span></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => openEditDialog(question)} className="gap-1"><Edit className="h-4 w-4" /> แก้ไข</Button><Button variant="ghost" size="sm" onClick={() => handleDelete(question.id)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /> ลบ</Button></div></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    </div>
  );
};
