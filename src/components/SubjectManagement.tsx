import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

const SUBJECT_CATEGORIES = [
  "วิทยาการคำนวณ",
  "คณิตศาสตร์",
  "วิทยาศาสตร์",
  "ภาษาไทย",
  "ภาษาอังกฤษ",
  "สังคมศึกษา",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "การป้องกันการทุจริต",
  "อื่น ๆ",
];

const GRADE_LEVELS = [
  "ป.1",
  "ป.2",
  "ป.3",
  "ป.4",
  "ป.5",
  "ป.6",
];

const ACADEMIC_YEARS = Array.from({ length: 2585 - 2569 + 1 }, (_, i) => String(2569 + i));

const SEMESTERS = [
  { value: "1", label: "ภาคเรียนที่ 1" },
  { value: "2", label: "ภาคเรียนที่ 2" },
];

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  subject_category?: string | null;
  curriculum: string;
  grade_level: string;
  semester: string;
  academic_year: string;
  teacher_id: string | null;
  teachers?: { first_name: string; last_name: string } | null;
}

interface Teacher {
  id: string;
  teacher_code: string;
  first_name: string;
  last_name: string;
}

const emptyForm = {
  subject_code: "",
  subject_name: "",
  subject_category: "อื่น ๆ",
  curriculum: "",
  grade_level: "",
  semester: "",
  academic_year: "",
  teacher_id: "",
};

export function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsResult, teachersResult] = await Promise.all([
        supabase.from("subjects").select("*, teachers(first_name, last_name)").order("subject_name"),
        supabase.from("teachers").select("*").order("teacher_code"),
      ]);
      if (subjectsResult.error) throw subjectsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      setSubjects((subjectsResult.data || []) as Subject[]);
      setTeachers(teachersResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const grades = useMemo(
    () => [...new Set(subjects.map((subject) => subject.grade_level).filter(Boolean))].sort(),
    [subjects],
  );

  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesSearch = !query || [subject.subject_code, subject.subject_name, subject.grade_level]
        .some((value) => value.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "all" || (subject.subject_category || "อื่น ๆ") === categoryFilter;
      const matchesGrade = gradeFilter === "all" || subject.grade_level === gradeFilter;
      const matchesTeacher = teacherFilter === "all" || subject.teacher_id === teacherFilter;
      return matchesSearch && matchesCategory && matchesGrade && matchesTeacher;
    });
  }, [subjects, searchTerm, categoryFilter, gradeFilter, teacherFilter]);

  const groupedSubjects = useMemo(() => {
    return filteredSubjects.reduce<Record<string, Subject[]>>((groups, subject) => {
      const category = subject.subject_category || "อื่น ๆ";
      (groups[category] ||= []).push(subject);
      return groups;
    }, {});
  }, [filteredSubjects]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setGradeFilter("all");
    setTeacherFilter("all");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subjectData: any = {
        subject_code: formData.subject_code.trim(),
        subject_name: formData.subject_name.trim(),
        subject_category: formData.subject_category,
        curriculum: formData.curriculum.trim(),
        grade_level: formData.grade_level.trim(),
        semester: formData.semester.trim(),
        academic_year: formData.academic_year.trim(),
        teacher_id: formData.teacher_id || null,
      };
      const result = editingSubject
        ? await supabase.from("subjects").update(subjectData).eq("id", editingSubject.id)
        : await supabase.from("subjects").insert(subjectData);
      if (result.error) throw result.error;
      toast.success(editingSubject ? "แก้ไขรายวิชาเรียบร้อยแล้ว" : "เพิ่มรายวิชาเรียบร้อยแล้ว");
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving subject:", error);
      toast.error(error.code === "23505" ? "รหัสวิชาซ้ำในปีการศึกษาและภาคเรียนเดียวกัน" : "ไม่สามารถบันทึกรายวิชาได้");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบรายวิชานี้ใช่หรือไม่?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      console.error(error);
      toast.error("ไม่สามารถลบรายวิชาได้");
      return;
    }
    toast.success("ลบรายวิชาเรียบร้อยแล้ว");
    fetchData();
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingSubject(null);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      subject_category: subject.subject_category || "อื่น ๆ",
      curriculum: subject.curriculum,
      grade_level: subject.grade_level,
      semester: subject.semester,
      academic_year: subject.academic_year,
      teacher_id: subject.teacher_id || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="p-4">กำลังโหลด...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">รายวิชาทั้งหมด ({filteredSubjects.length})</h3>
          <p className="text-sm text-muted-foreground">ค้นหาและกรองรายวิชาตามหมวด ชั้นเรียน หรือครูผู้สอน</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />เพิ่มรายวิชาใหม่</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editingSubject ? "แก้ไขรายวิชา" : "เพิ่มรายวิชาใหม่"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label htmlFor="subject_code">รหัสวิชา *</Label><Input id="subject_code" value={formData.subject_code} onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })} required /></div>
                <div><Label htmlFor="subject_name">ชื่อวิชา *</Label><Input id="subject_name" value={formData.subject_name} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label>หมวดวิชา *</Label><Select value={formData.subject_category} onValueChange={(value) => setFormData({ ...formData, subject_category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECT_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>ระดับชั้น *</Label><Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}><SelectTrigger><SelectValue placeholder="เลือกระดับชั้น" /></SelectTrigger><SelectContent>{GRADE_LEVELS.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label htmlFor="curriculum">หลักสูตร *</Label><Input id="curriculum" value={formData.curriculum} onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })} placeholder="เช่น 2560" required /></div>
                <div><Label htmlFor="teacher_id">ครูผู้สอน</Label><Select value={formData.teacher_id || "none"} onValueChange={(value) => setFormData({ ...formData, teacher_id: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="เลือกครูผู้สอน" /></SelectTrigger><SelectContent><SelectItem value="none">ไม่ระบุ</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.teacher_code} - {teacher.first_name} {teacher.last_name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><Label>ภาคเรียน *</Label><Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}><SelectTrigger><SelectValue placeholder="เลือกภาคเรียน" /></SelectTrigger><SelectContent>{SEMESTERS.map((sem) => <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>)}</SelectContent></Select></div><div><Label>ปีการศึกษา *</Label><Select value={formData.academic_year} onValueChange={(value) => setFormData({ ...formData, academic_year: value })}><SelectTrigger><SelectValue placeholder="เลือกปีการศึกษา" /></SelectTrigger><SelectContent>{ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button><Button type="submit">{editingSubject ? "บันทึก" : "เพิ่มรายวิชา"}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 rounded-xl border bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9 bg-white" placeholder="ค้นหารหัสหรือชื่อวิชา" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="bg-white"><SelectValue placeholder="หมวดวิชา" /></SelectTrigger><SelectContent><SelectItem value="all">ทุกหมวดวิชา</SelectItem>{SUBJECT_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger className="bg-white"><SelectValue placeholder="ระดับชั้น" /></SelectTrigger><SelectContent><SelectItem value="all">ทุกระดับชั้น</SelectItem>{grades.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent></Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}><SelectTrigger className="bg-white"><SelectValue placeholder="ครูผู้สอน" /></SelectTrigger><SelectContent><SelectItem value="all">ครูทุกคน</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</SelectItem>)}</SelectContent></Select>
      </div>
      {(searchTerm || categoryFilter !== "all" || gradeFilter !== "all" || teacherFilter !== "all") && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-4 w-4" />ล้างตัวกรอง</Button>}

      <div className="space-y-6">
        {Object.keys(groupedSubjects).length === 0 ? <div className="rounded-md border p-8 text-center text-muted-foreground">ไม่พบรายวิชาตามตัวกรอง</div> : Object.entries(groupedSubjects).map(([category, categorySubjects]) => (
          <section key={category} className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-emerald-50 px-4 py-3"><h4 className="font-semibold text-emerald-900">{category}</h4><span className="rounded-full bg-white px-3 py-1 text-xs text-emerald-700">{categorySubjects.length} รายวิชา</span></div>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>รหัสวิชา</TableHead><TableHead>ชื่อวิชา</TableHead><TableHead>ระดับชั้น</TableHead><TableHead>ภาคเรียน/ปีการศึกษา</TableHead><TableHead>ครูผู้สอน</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader><TableBody>{categorySubjects.map((subject) => <TableRow key={subject.id}><TableCell className="font-medium">{subject.subject_code}</TableCell><TableCell>{subject.subject_name}</TableCell><TableCell>{subject.grade_level}</TableCell><TableCell>{subject.semester}/{subject.academic_year}</TableCell><TableCell>{subject.teachers ? `${subject.teachers.first_name} ${subject.teachers.last_name}` : "-"}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openEditDialog(subject)}><Pencil className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => handleDelete(subject.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table></div>
          </section>
        ))}
      </div>
    </div>
  );
}
