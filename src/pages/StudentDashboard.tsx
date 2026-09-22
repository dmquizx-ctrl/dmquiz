import { useEffect, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, FileText, CheckCircle2, LogOut, GraduationCap, Sparkles } from 'lucide-react';

interface Exam {
  id: string;
  exam_name: string;
  duration_minutes: number;
  question_count: number;
  is_active: boolean;
}

interface SubjectWithExams {
  id: string;
  subject_code: string;
  subject_name: string;
  grade_level: string;
  is_active: boolean;
  exams: Exam[];
}

const subjectColors = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-400',
  'from-orange-400 to-rose-500',
];

export const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<SubjectWithExams[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.userType !== 'student') {
      navigate('/login');
      return;
    }

    fetchStudentDashboardData();
  }, [user, navigate]);

  const fetchStudentDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const studentClass = user.class?.trim();

      // Only load subjects assigned to the student's own classroom. Without a
      // class value, do not fall back to loading every active subject.
      if (!studentClass) {
        setSubjects([]);
      } else {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*, exams(*)')
          .eq('is_active', true)
          .eq('grade_level', studentClass)
          .order('subject_name');

        if (subjectsError) throw subjectsError;
        setSubjects((subjectsData ?? []) as SubjectWithExams[]);
      }

      setCompletedExamIds([]);
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลนักเรียนได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (examId: string) => navigate(`/exam/${examId}`);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-600 shadow-lg">
          กำลังโหลดข้อมูลนักเรียน...
        </div>
      </div>
    );
  }

  const activeExamCount = subjects.reduce(
    (total, subject) => total + (subject.exams?.filter((exam) => exam.is_active).length || 0),
    0,
  );
  const totalQuestionCount = subjects.reduce(
    (total, subject) =>
      total + (subject.exams || []).reduce((subjectTotal, exam) => subjectTotal + (exam.question_count || 0), 0),
    0,
  );

  return (
    <div className="page-shell min-h-screen w-full">
      <header className="relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/15">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative flex w-full items-center justify-between px-4 py-6 sm:px-8 lg:px-16">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/10 shadow-lg shadow-indigo-500/20 backdrop-blur-md">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100">ระบบจัดการข้อสอบ</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{user?.displayName || user?.email || 'นักเรียน'}</h1>
              <p className="mt-1 text-sm text-blue-100/90">นักเรียน: {user?.email || 'student'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 rounded-xl border-white/25 bg-white/10 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-white/20 hover:text-white">
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/15">
            <CardContent className="p-5"><p className="text-sm text-blue-100">จำนวนวิชา</p><p className="mt-2 text-3xl font-bold">{subjects.length}</p></CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/15">
            <CardContent className="p-5"><p className="text-sm text-cyan-100">ข้อสอบที่เปิดใช้งาน</p><p className="mt-2 text-3xl font-bold">{activeExamCount}</p></CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/15">
            <CardContent className="p-5"><p className="text-sm text-emerald-100">จำนวนข้อสอบ</p><p className="mt-2 text-3xl font-bold">{totalQuestionCount}</p></CardContent>
          </Card>
        </section>

        <section className="content-panel p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
            <div><h2 className="text-xl font-bold text-slate-800">รายวิชาของนักเรียน</h2><p className="text-sm text-slate-500">ดูข้อสอบและเลือกทำแบบทดสอบที่ต้องการ</p></div>
            <Badge className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-100">{activeExamCount} ข้อสอบพร้อมทำ</Badge>
          </div>
          <div className="space-y-4">
            {subjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">ยังไม่มีรายวิชาในห้องเรียนของคุณ</div>
            ) : subjects.map((subject, index) => (
              <Card key={subject.id} className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${subjectColors[index % subjectColors.length]} text-white`}><BookOpen className="h-5 w-5" /></div>
                      <div><CardTitle className="text-lg">{subject.subject_name}</CardTitle><p className="text-sm text-slate-500">{subject.subject_code} · ระดับ {subject.grade_level}</p></div>
                    </div>
                    <Badge variant="outline">{subject.exams?.filter((exam) => exam.is_active).length || 0} ข้อสอบ</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {subject.exams?.filter((exam) => exam.is_active).map((exam) => {
                      const isCompleted = completedExamIds.includes(exam.id);
                      return <div key={exam.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{exam.exam_name}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />{exam.duration_minutes} นาที</p></div>{isCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Sparkles className="h-5 w-5 text-blue-500" />}</div><div className="mb-3 flex items-center gap-2 text-xs text-slate-500"><FileText className="h-3.5 w-3.5" />{exam.question_count} ข้อ</div><Button className="w-full" disabled={isCompleted} onClick={() => handleStartExam(exam.id)}>{isCompleted ? 'ทำข้อสอบแล้ว' : 'เริ่มทำข้อสอบ'}</Button></div>;
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
