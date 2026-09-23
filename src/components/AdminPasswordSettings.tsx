import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { changeAdminPassword } from '@/lib/adminAccount.functions';
import { KeyRound } from 'lucide-react';

export const AdminPasswordSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const submit = useServerFn(changeAdminPassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'รหัสผ่านไม่ตรงกัน', description: 'กรุณายืนยันรหัสผ่านใหม่ให้ตรงกัน', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'รหัสผ่านสั้นเกินไป', description: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await submit({
        data: {
          username: user?.username ?? '',
          currentPassword,
          newPassword,
        },
      });
      toast({ title: 'เปลี่ยนรหัสผ่านสำเร็จ', description: 'ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
      toast({ title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />เปลี่ยนรหัสผ่านผู้ดูแลระบบ</CardTitle>
        <CardDescription>บัญชี: {user?.username}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</Button>
        </form>
      </CardContent>
    </Card>
  );
};
