import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, FileText, Users, ClipboardList, BarChart, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import { StudentImport } from '@/components/StudentImport';
import { ExamManagement } from '@/components/ExamManagement';
import { QuestionManagement } from '@/components/QuestionManagement';
import { TeacherManagement } from '@/components/TeacherManagement';
import { SubjectManagement } from '@/components/SubjectManagement';
import { ResultsManagement } from '@/components/ResultsManagement';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.userType !== 'admin') navigate('/login');
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/login'); };
  if (!user) return null;

  const tabClass = 'gap-2 rounded-xl border border-transparent bg-white/60 py-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 data-[state=active]:!text-white data-[state=active]:!shadow-md';

  return (
    <div className="page-shell">
      <header className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 text-white shadow-xl shadow-rose-500/15">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="container relative mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15"><ShieldCheck className="h-7 w-7" /></div>
            <div><p className="text-sm font-medium text-orange-100">ศูนย์ควบคุมระบบ</p><h1 className="text-2xl font-bold sm:text-3xl">ระบบจัดการข้อสอบ</h1><p className="text-sm text-orange-100">ผู้ดูแลระบบ: {user.username}</p></div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"><LogOut className="h-4 w-4" />ออกจากระบบ</Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="border-0 bg-gradient-to-br from-orange-500 to-rose-500 text-white"><CardContent className="p-5"><p className="text-sm text-orange-100">บทบาทปัจจุบัน</p><p className="mt-2 text-xl font-bold">ผู้ดูแลระบบ</p></CardContent></Card>
          <Card className="border-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white"><CardContent className="p-5"><p className="text-sm text-fuchsia-100">เมนูจัดการ</p><p className="mt-2 text-3xl font-bold">6</p></CardContent></Card>
          <Card className="border-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white"><CardContent className="p-5"><p className="text-sm text-slate-300">สถานะระบบ</p><p className="mt-2 text-xl font-bold">พร้อมใช้งาน</p></CardContent></Card>
        </section>

        <section className="content-panel p-3 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200/70 pb-4"><div><h2 className="text-xl font-bold text-slate-800">เมนูหลักของผู้ดูแล</h2><p className="text-sm text-slate-500">จัดการข้อมูลและติดตามระบบสอบจากจุดเดียว</p></div><div className="hidden rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 sm:block">ADMIN CONTROL</div></div>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-slate-200/80 p-1.5 sm:grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="questions" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-blue-500 data-[state=active]:!to-cyan-500`}><FileText className="h-4 w-4" />จัดการข้อสอบ</TabsTrigger>
              <TabsTrigger value="teachers" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-violet-500 data-[state=active]:!to-indigo-600`}><GraduationCap className="h-4 w-4" />จัดการครู</TabsTrigger>
              <TabsTrigger value="subjects" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-emerald-500 data-[state=active]:!to-teal-600`}><BookOpen className="h-4 w-4" />จัดการรายวิชา</TabsTrigger>
              <TabsTrigger value="students" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-orange-500 data-[state=active]:!to-rose-500`}><Users className="h-4 w-4" />จัดการนักเรียน</TabsTrigger>
              <TabsTrigger value="exams" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-cyan-500 data-[state=active]:!to-sky-600`}><ClipboardList className="h-4 w-4" />สร้างชุดข้อสอบ</TabsTrigger>
              <TabsTrigger value="results" className={`${tabClass} data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-fuchsia-500 data-[state=active]:!to-purple-600`}><BarChart className="h-4 w-4" />ผลคะแนน</TabsTrigger>
            </TabsList>
            <TabsContent value="questions" className="pt-5"><QuestionManagement /></TabsContent>
            <TabsContent value="teachers" className="space-y-4 pt-5"><Card><CardHeader><CardTitle>จัดการครู</CardTitle><CardDescription>เพิ่ม แก้ไข และจัดการข้อมูลครู</CardDescription></CardHeader></Card><TeacherManagement /></TabsContent>
            <TabsContent value="subjects" className="space-y-4 pt-5"><Card><CardHeader><CardTitle>จัดการรายวิชา</CardTitle><CardDescription>เพิ่ม แก้ไข และจัดการรายวิชาตามหลักสูตร</CardDescription></CardHeader></Card><SubjectManagement /></TabsContent>
            <TabsContent value="students" className="space-y-4 pt-5"><Card><CardHeader><CardTitle>จัดการนักเรียน</CardTitle><CardDescription>นำเข้าข้อมูลนักเรียนและจัดการข้อมูล</CardDescription></CardHeader></Card><StudentImport /></TabsContent>
            <TabsContent value="exams" className="pt-5"><ExamManagement /></TabsContent>
            <TabsContent value="results" className="space-y-4 pt-5"><Card><CardHeader><CardTitle>ผลคะแนนการสอบ</CardTitle><CardDescription>ดูและจัดการผลคะแนนของนักเรียน</CardDescription></CardHeader></Card><ResultsManagement /></TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
