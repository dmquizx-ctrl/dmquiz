import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Teacher {
  id: string;
  teacher_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    teacher_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .order("teacher_code");

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("ไม่สามารถโหลดข้อมูลครูได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTeacher) {
        // Update password only if a new password is provided
        const password_hash = formData.password
          ? await hashPassword(formData.password)
          : undefined;

        const { error } = await supabase
          .from("teachers")
          .update({
            teacher_code: formData.teacher_code,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || null,
            phone: formData.phone || null,
            ...(password_hash ? { password_hash } : {}),
          })
          .eq("id", editingTeacher.id);

        if (error) throw error;
        toast.success("แก้ไขข้อมูลครูเรียบร้อยแล้ว");
      } else {
        // Use custom password or default to teacher_code
        const passwordToHash = formData.password || formData.teacher_code;
        const password_hash = await hashPassword(passwordToHash);
        const { error } = await supabase.from("teachers").insert({
          teacher_code: formData.teacher_code,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          password_hash,
        });

        if (error) throw error;
        toast.success("เพิ่มครูเรียบร้อยแล้ว");
      }

      resetForm();
      setIsDialogOpen(false);
      fetchTeachers();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      if (error.code === '23505') {
        toast.error("รหัสครูซ้ำ กรุณาใช้รหัสอื่น");
      } else {
        toast.error("ไม่สามารถบันทึกข้อมูลครูได้");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบครูคนนี้ใช่หรือไม่?")) return;

    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);

      if (error) throw error;
      toast.success("ลบครูเรียบร้อยแล้ว");
      fetchTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("ไม่สามารถลบครูได้");
    }
  };

  const resetForm = () => {
    setFormData({
      teacher_code: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
    });
    setEditingTeacher(null);
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacher_code: teacher.teacher_code,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email || "",
      phone: teacher.phone || "",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-4">กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            เพิ่มครูใหม่
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? "แก้ไขข้อมูลครู" : "เพิ่มครูใหม่"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="teacher_code">รหัสครู *</Label>
              <Input
                id="teacher_code"
                value={formData.teacher_code}
                onChange={(e) =>
                  setFormData({ ...formData, teacher_code: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="first_name">ชื่อ *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">นามสกุล *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="password">
                รหัสผ่าน {editingTeacher ? "(เว้นว่างถ้าไม่ต้องการเปลี่ยน)" : "(เว้นว่าง = ใช้รหัสครู)"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={editingTeacher ? "กรอกเฉพาะเมื่อต้องการเปลี่ยน" : "เว้นว่างจะใช้รหัสครูเป็นรหัสผ่าน"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit">
                {editingTeacher ? "บันทึก" : "เพิ่มครู"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสครู</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  ยังไม่มีข้อมูลครู
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.teacher_code}</TableCell>
                  <TableCell>
                    {teacher.first_name} {teacher.last_name}
                  </TableCell>
                  <TableCell>{teacher.email || "-"}</TableCell>
                  <TableCell>{teacher.phone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(teacher)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
