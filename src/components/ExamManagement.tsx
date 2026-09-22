import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, EyeOff, Clock, FileQuestion } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

interface Exam {
  id: string;
  exam_name: string;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export const ExamManagement = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    exam_name: '',
    question_count: 10,
    duration_minutes: 60,
    is_active: true,
  });

  useEffect(() => {
    fetchExams();
    fetchTotalQuestions();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลชุดข้อสอบได้',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalQuestions = async () => {
    try {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalQuestions(count || 0);
    } catch (error) {
      console.error('Error fetching question count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // เช็กจำนวนข้อสอบเฉพาะตอนสร้างชุดใหม่เท่านั้น
    if (!editingExam && totalQuestions > 0 && formData.question_count > totalQuestions) {
      toast({
        title: 'ข้อผิดพลาด',
        description: `จำนวนข้อสอบต้องไม่เกิน ${totalQuestions} ข้อ (จำนวนข้อสอบในคลัง)`,
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingExam) {
        const { data, error } = await supabase
          .from('exams')
          .update({
            exam_name: formData.exam_name,
            question_count: Number(formData.question_count),
            duration_minutes: Number(formData.duration_minutes),
            is_active: formData.is_active,
          })
          .eq('id', editingExam.id)
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('ไม่สามารถอัปเดตได้ โปรดตรวจสอบสิทธิ์ RLS Policy ใน Supabase');
        }

        toast({
          title: 'สำเร็จ',
          description: 'แก้ไขชุดข้อสอบเรียบร้อยแล้ว',
        });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert([{
            exam_name: formData.exam_name,
            question_count: Number(formData.question_count),
            duration_minutes: Number(formData.duration_minutes),
            is_active: formData.is_active,
          }]);

        if (error) throw error;

        toast({
          title: 'สำเร็จ',
          description: 'สร้างชุดข้อสอบเรียบร้อยแล้ว',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchExams();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบชุดข้อสอบนี้? การลบจะลบคำถามและผลการสอบที่เกี่ยวข้องด้วย')) return;

    try {
      const response = await supabase.functions.invoke('delete-exam', {
        body: { exam_id: id }
      });

      if (response.error) throw response.error;
      const data = response.data;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'สำเร็จ',
        description: 'ลบชุดข้อสอบเรียบร้อยแล้ว',
      });

      fetchExams();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบชุดข้อสอบได้',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ is_active: !exam.is_active })
        .eq('id', exam.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('ไม่สามารถเปลี่ยนสถานะได้ ติดสิทธิ์ RLS ใน Supabase');
      }

      toast({
        title: 'สำเร็จ',
        description: exam.is_active ? 'ปิดการใช้งานชุดข้อสอบแล้ว' : 'เปิดการใช้งานชุดข้อสอบแล้ว',
      });

      fetchExams();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถเปลี่ยนสถานะได้',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      exam_name: '',
      question_count: 10,
      duration_minutes: 60,
      is_active: true,
    });
    setEditingExam(null);
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      exam_name: exam.exam_name,
      question_count: exam.question_count,
      duration_minutes: exam.duration_minutes,
      is_active: exam.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>จัดการชุดข้อสอบ</CardTitle>
              <CardDescription>
                มีข้อสอบในคลัง {totalQuestions} ข้อ
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  สร้างชุดข้อสอบใหม่
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingExam ? 'แก้ไขชุดข้อสอบ' : 'สร้างชุดข้อสอบใหม่'}
                    </DialogTitle>
                    <DialogDescription>
                      ระบบจะสุ่มข้อสอบจากคลังคำถามตามจำนวนที่กำหนด
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="exam_name">ชื่อชุดข้อสอบ *</Label>
                      <Input
                        id="exam_name"
                        value={formData.exam_name}
                        onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                        placeholder="เช่น แบบทดสอบกลางภาค"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="question_count">จำนวนข้อสอบ *</Label>
                        <Input
                          id="question_count"
                          type="number"
                          min="1"
                          value={formData.question_count}
                          onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 0 })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="duration_minutes">เวลาทำข้อสอบ (นาที) *</Label>
                        <Input
                          id="duration_minutes"
                          type="number"
                          min="1"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>เปิดใช้งานชุดข้อสอบ</Label>
                        <p className="text-sm text-muted-foreground">
                          นักเรียนจะสามารถเข้าทำข้อสอบชุดนี้ได้
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit">
                      {editingExam ? 'บันทึกการแก้ไข' : 'สร้างชุดข้อสอบ'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">ยังไม่มีชุดข้อสอบในระบบ</p>
              <p className="text-sm mt-1">เริ่มต้นสร้างชุดข้อสอบแรกของคุณ</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อชุดข้อสอบ</TableHead>
                    <TableHead className="text-center">จำนวนข้อ</TableHead>
                    <TableHead className="text-center">เวลา</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        {exam.exam_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          <FileQuestion className="h-3 w-3" />
                          {exam.question_count} ข้อ
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {exam.duration_minutes} นาที
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleActive(exam)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                          style={{
                            backgroundColor: exam.is_active ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                            color: exam.is_active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {exam.is_active ? (
                            <>
                              <Eye className="h-3 w-3" />
                              เปิดใช้งาน
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              ปิดใช้งาน
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(exam)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exam.id)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
