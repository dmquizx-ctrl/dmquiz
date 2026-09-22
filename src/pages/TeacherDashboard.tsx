import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  LogOut,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  Upload,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import TeacherQuestionManager from '@/components/TeacherQuestionManager';
import ExamReport from '@/components/ExamReport';
import ExamImport from '@/components/ExamImport';

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  grade_level: string;
  semester: string;
  academic_year: string;
  curriculum: string;
  is_active?: boolean;
}

const cardColors = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-400',
  'from-amber-400 to-orange-500',
];

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.userType !== 'teacher') {
      navigate('/login');
      return;
    }
    fetchTeacherData();
  }, [user, navigate]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('subject_code');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubjectActive = async (subjectId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: nextStatus })
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === subjectId ? { ...subject, is_active: nextStatus } : subject
        )
      );

      toast({
        title: 'อัปเดตสถานะสำเร็จ',
        description: nextStatus
          ? 'เปิดให้นักเรียนมองเห็นรายวิชานี้แล้ว'
          : 'ซ่อนรายวิชานี้ไว้แล้ว',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเปลี่ยนสถานะเปิด-ปิดวิชาได้',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="font-medium text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const activeSubjectsCount = subjects.filter((subject) => subject.is_active ?? true).length;
  const hiddenSubjectsCount = subjects.length - activeSubjectsCount;
  const tabClass =
    'gap-2 rounded-xl border border-transparent bg-white/60 py-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 data-[state=active]:!text-white data-[state=active]:!shadow-md';

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-500/15">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="container relative mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm text-violet-100">
                <Sparkles className="h-4 w-4" />
                พื้นที่จัดการเรียนการสอน
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">Dashboard ครู</h1>
              <p className="text-sm text-violet-100">
                ครู {user.first_name} {user.last_name} ({user.teacher_code})
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Stat Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-blue-100">รายวิชาทั้งหมด</p>
              <p className="mt-2 text-3xl font-bold">{subjects.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-100">เปิดให้นักเรียนเห็น</p>
              <p className="mt-2 text-3xl font-bold">{activeSubjectsCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-amber-50">ซ่อนไว้</p>
              <p className="mt-2 text-3xl font-bold">{hiddenSubjectsCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-violet-100">สถานะระบบ</p>
              <p className="mt-2 text-xl font-bold">พร้อมใช้งาน</p>
            </CardContent>
          </Card>
        </section>

        {/* Action Panel */}
        <section className="content-panel p-3 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">เมนูหลักของครู</h2>
              <p className="text-sm text-slate-500">จัดการรายวิชา ข้อสอบ และรายงานคะแนน</p>
            </div>
            <div className="hidden rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 sm:block">
              TEACHER AREA
            </div>
          </div>

          <Tabs defaultValue="subjects" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-slate-200/80 p-1.5 md:grid-cols-4">
              <TabsTrigger
                value="subjects"
                className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-blue-500 data-[state=active]:!to-cyan-500`}
              >
                <BookOpen className="h-4 w-4" />
                รายวิชาที่สอน
              </TabsTrigger>
              <TabsTrigger
                value="questions"
                className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-violet-500 data-[state=active]:!to-indigo-600`}
              >
                <ClipboardList className="h-4 w-4" />
                คลังข้อสอบ
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-cyan-500 data-[state=active]:!to-sky-600`}
              >
                <Upload className="h-4 w-4" />
                นำเข้าข้อสอบ
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-emerald-500 data-[state=active]:!to-teal-600`}
              >
                <BarChart3 className="h-4 w-4" />
                รายงานคะแนน
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subjects" className="pt-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    รายวิชาที่สอน
                  </CardTitle>
                  <CardDescription>
                    เปิดหรือซ่อนรายวิชาให้นักเรียนเห็นได้ตามต้องการ
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {subjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-500">
                      ยังไม่มีรายวิชาที่ได้รับมอบหมาย
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {subjects.map((subject, index) => {
                        const isActive = subject.is_active ?? true;
                        return (
                          <Card
                            key={subject.id}
                            className="overflow-hidden border border-slate-200/80 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div
                              className={`h-2 bg-gradient-to-r ${
                                cardColors[index % cardColors.length]
                              }`}
                            />
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-lg">
                                    {subject.subject_code}
                                  </CardTitle>
                                  <CardDescription>{subject.subject_name}</CardDescription>
                                </div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    isActive
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isActive ? 'เปิดใช้งาน' : 'ซ่อน'}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2 text-sm text-slate-600">
                                <p>
                                  <b>ชั้น:</b> {subject.grade_level}
                                </p>
                                <p>
                                  <b>ภาคเรียน:</b> {subject.semester}
                                </p>
                                <p>
                                  <b>ปีการศึกษา:</b> {subject.academic_year}
                                </p>
                                <p>
                                  <b>หลักสูตร:</b> {subject.curriculum}
                                </p>
                              </div>
                              <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2">
                                <span className="text-sm">แสดงให้นักเรียนเห็น</span>
                                <Switch
                                  id={`active-${subject.id}`}
                                  checked={isActive}
                                  onCheckedChange={() =>
                                    handleToggleSubjectActive(subject.id, isActive)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between border-t pt-2 text-xs">
                                <span className="text-slate-500">สถานะ</span>
                                <span
                                  className={`flex items-center gap-1 font-semibold ${
                                    isActive ? 'text-emerald-600' : 'text-slate-500'
                                  }`}
                                >
                                  {isActive ? (
                                    <>
                                      <Eye className="h-3.5 w-3.5" />
                                      แสดงผล
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3.5 w-3.5" />
                                      ซ่อน
                                    </>
                                  )}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="pt-2">
              <TeacherQuestionManager teacherId={user.id} subjects={subjects} />
            </TabsContent>
            <TabsContent value="import" className="pt-2">
              <ExamImport teacherId={user.id} subjects={subjects} onImported={fetchTeacherData} />
            </TabsContent>
            <TabsContent value="reports" className="pt-2">
              <ExamReport teacherId={user.id} />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
};

export default TeacherDashboard;
