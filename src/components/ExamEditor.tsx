import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Save } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuestionImage } from '@/components/QuestionImage';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  option_count: number;
  image_path: string | null;
}

interface ExamQuestion {
  id: string;
  question_order: number;
  questions: Question;
}

interface Exam {
  id: string;
  exam_name: string;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
  subject_id: string | null;
  teacher_id: string | null;
}

interface ExamEditorProps {
  exam: Exam;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const ExamEditor = ({ exam, open, onOpenChange, onSaved }: ExamEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [formData, setFormData] = useState({
    exam_name: exam.exam_name,
    question_count: exam.question_count,
    duration_minutes: exam.duration_minutes,
    is_active: exam.is_active,
  });

  useEffect(() => {
    if (open) {
      fetchExamQuestions();
      setFormData({
        exam_name: exam.exam_name,
        question_count: exam.question_count,
        duration_minutes: exam.duration_minutes,
        is_active: exam.is_active,
      });
    }
  }, [open, exam]);

  const fetchExamQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_questions')
        .select('id, question_order, questions(*)')
        .eq('exam_id', exam.id)
        .order('question_order');

      if (error) throw error;

      const typedData = (data || []).map((item) => ({
        id: item.id,
        question_order: item.question_order,
        questions: item.questions as unknown as Question,
      }));
      setExamQuestions(typedData);
    } catch (error: any) {
      console.error('Error fetching exam questions:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดคำถามได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // แก้ไขให้บันทึกผ่าน Supabase Database โดยตรง ไม่ผ่าน Edge Function
  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('exams')
        .update({
          exam_name: formData.exam_name,
          question_count: formData.question_count,
          duration_minutes: formData.duration_minutes,
          is_active: formData.is_active,
        })
        .eq('id', exam.id);

      if (error) throw error;

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'อัปเดตข้อมูลข้อสอบเรียบร้อยแล้ว',
      });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถบันทึกข้อสอบได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = async (examQuestionId: string) => {
    try {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', examQuestionId);

      if (error) throw error;

      toast({
        title: 'ลบคำถามสำเร็จ',
      });
      fetchExamQuestions();
    } catch (error: any) {
      console.error('Error removing question:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบคำถามได้',
        variant: 'destructive',
      });
    }
  };

  const getAnswerLabel = (answer: string) => {
    const labels: Record<string, string> = {
      A: 'ก',
      B: 'ข',
      C: 'ค',
      D: 'ง',
    };
    return labels[answer] || answer;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อสอบ</DialogTitle>
          <DialogDescription>
            แก้ไขรายละเอียดและจัดการคำถามในข้อสอบ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Exam Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ตั้งค่าข้อสอบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam_name">ชื่อข้อสอบ</Label>
                <Input
                  id="exam_name"
                  value={formData.exam_name}
                  onChange={(e) =>
                    setFormData({ ...formData, exam_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question_count">จำนวนข้อ</Label>
                  <Input
                    id="question_count"
                    type="number"
                    min="1"
                    value={formData.question_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        question_count: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">ระยะเวลา (นาที)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>เปิดใช้งานข้อสอบ</Label>
                  <p className="text-sm text-muted-foreground">
                    นักเรียนจะสามารถเห็นและทำข้อสอบนี้ได้
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                คำถามในข้อสอบ ({examQuestions.length} ข้อ)
              </CardTitle>
              <CardDescription>
                รายการคำถามที่ถูกเลือกเข้ามาในชุดข้อสอบนี้
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  กำลังโหลด...
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  ยังไม่มีคำถามในข้อสอบนี้
                </div>
              ) : (
                <div className="space-y-4">
                  {examQuestions.map((eq) => (
                    <Card key={eq.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                ข้อ {eq.question_order}
                              </span>
                              <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                                {eq.questions.option_count} ตัวเลือก
                              </span>
                            </div>
                            <p className="font-medium mb-2">
                              {eq.questions.question_text}
                            </p>
                            <QuestionImage
                              path={eq.questions.image_path}
                              alt={`รูปประกอบข้อ ${eq.question_order}`}
                              className="mb-3"
                            />
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div
                                className={
                                  eq.questions.correct_answer === 'A'
                                    ? 'text-green-600 font-medium'
                                    : ''
                                }
                              >
                                ก. {eq.questions.option_a}
                              </div>
                              <div
                                className={
                                  eq.questions.correct_answer === 'B'
                                    ? 'text-green-600 font-medium'
                                    : ''
                                }
                              >
                                ข. {eq.questions.option_b}
                              </div>
                              <div
                                className={
                                  eq.questions.correct_answer === 'C'
                                    ? 'text-green-600 font-medium'
                                    : ''
                                }
                              >
                                ค. {eq.questions.option_c}
                              </div>
                              {eq.questions.option_count === 4 && (
                                <div
                                  className={
                                    eq.questions.correct_answer === 'D'
                                      ? 'text-green-600 font-medium'
                                      : ''
                                  }
                                >
                                  ง. {eq.questions.option_d}
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              เฉลย: {getAnswerLabel(eq.questions.correct_answer)}
                            </p>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ลบคำถามนี้?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  คำถามจะถูกนำออกจากข้อสอบนี้ (ไม่ได้ลบออกจากคลังข้อสอบ)
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveQuestion(eq.id)}
                                >
                                  ลบ
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamEditor;
