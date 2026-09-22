import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, UserCog, BookOpen, Sparkles } from 'lucide-react';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(studentId, studentPassword, 'student');
      toast({ title: 'เข้าสู่ระบบสำเร็จ', description: 'ยินดีต้อนรับเข้าสู่ระบบสอบออนไลน์' });
      navigate('/student');
    } catch (error: any) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(adminUsername, adminPassword, 'admin');
      toast({ title: 'เข้าสู่ระบบสำเร็จ', description: 'ยินดีต้อนรับเข้าสู่ระบบจัดการ' });
      navigate('/admin');
    } catch (error: any) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(teacherCode, teacherPassword, 'teacher');
      toast({ title: 'เข้าสู่ระบบสำเร็จ', description: 'ยินดีต้อนรับเข้าสู่ระบบครู' });
      navigate('/teacher');
    } catch (error: any) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const tabClass = 'gap-1.5 rounded-xl border border-transparent bg-white/60 py-3 text-xs font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 sm:gap-2 sm:text-sm';

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_42%)]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center text-white">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
            <GraduationCap className="h-8 w-8 text-cyan-200" />
          </div>
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium tracking-wide text-cyan-200">
            <Sparkles className="h-4 w-4" />
            <span>ONLINE EXAMINATION</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ระบบสอบออนไลน์</h1>
          <p className="mt-2 text-sm text-blue-100/75">เข้าสู่ระบบเพื่อเริ่มทำข้อสอบ</p>
        </div>

        <Card className="border border-white/25 bg-white/95 shadow-2xl shadow-blue-950/40 backdrop-blur-xl dark:bg-slate-900/90">
          <CardHeader className="pb-4 text-left">
            <CardTitle className="text-2xl text-slate-900 dark:text-white">เข้าสู่ระบบ</CardTitle>
            <CardDescription>เลือกประเภทผู้ใช้งานของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl bg-slate-100/90 p-2 dark:bg-slate-800/80">
                <TabsTrigger value="student" className={`${tabClass} hover:text-blue-700 data-[state=active]:!border-blue-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-blue-500 data-[state=active]:!to-cyan-500 data-[state=active]:!text-white data-[state=active]:!shadow-md`}>
                  <GraduationCap className="h-4 w-4" />นักเรียน
                </TabsTrigger>
                <TabsTrigger value="teacher" className={`${tabClass} hover:text-violet-700 data-[state=active]:!border-violet-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-violet-500 data-[state=active]:!to-indigo-600 data-[state=active]:!text-white data-[state=active]:!shadow-md`}>
                  <BookOpen className="h-4 w-4" />ครู
                </TabsTrigger>
                <TabsTrigger value="admin" className={`${tabClass} hover:text-orange-700 data-[state=active]:!border-orange-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-orange-500 data-[state=active]:!to-rose-500 data-[state=active]:!text-white data-[state=active]:!shadow-md`}>
                  <UserCog className="h-4 w-4" />ผู้ดูแลระบบ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="student-id">รหัสนักเรียน</Label><Input id="student-id" type="text" placeholder="กรอกรหัสนักเรียน" value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <div className="space-y-2"><Label htmlFor="student-password">รหัสผ่าน</Label><Input id="student-password" type="password" placeholder="กรอกรหัสผ่าน (รหัสนักเรียน)" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <Button type="submit" className="h-11 w-full bg-gradient-to-r from-blue-500 to-cyan-500 font-semibold shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-cyan-600" disabled={isLoading}>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Button>
                </form>
              </TabsContent>

              <TabsContent value="teacher" className="mt-5 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/80 p-4">
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="teacher-code">รหัสครู</Label><Input id="teacher-code" type="text" placeholder="กรอกรหัสครู" value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <div className="space-y-2"><Label htmlFor="teacher-password">รหัสผ่าน</Label><Input id="teacher-password" type="password" placeholder="กรอกรหัสผ่าน" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <Button type="submit" className="h-11 w-full bg-gradient-to-r from-violet-500 to-indigo-600 font-semibold shadow-lg shadow-violet-500/25 transition-all hover:from-violet-600 hover:to-indigo-700" disabled={isLoading}>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="mt-5 space-y-4 rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="admin-username">ชื่อผู้ใช้</Label><Input id="admin-username" type="text" placeholder="กรอกชื่อผู้ใช้" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <div className="space-y-2"><Label htmlFor="admin-password">รหัสผ่าน</Label><Input id="admin-password" type="password" placeholder="กรอกรหัสผ่าน" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required disabled={isLoading} className="h-11 bg-white/80 dark:bg-slate-950/50" /></div>
                  <Button type="submit" className="h-11 w-full bg-gradient-to-r from-orange-500 to-rose-500 font-semibold shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-rose-600" disabled={isLoading}>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-blue-100/55">โรงเรียนบ้านดอนมูล</p>
      </div>
    </div>
  );
};

export default Login;
