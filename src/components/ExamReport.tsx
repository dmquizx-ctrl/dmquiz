import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, CheckCircle2, FileText, GraduationCap, Loader2, Printer, RotateCcw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExamResult {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  students: { student_id: string; first_name: string; last_name: string; class: string } | null;
  exams: { exam_name: string } | null;
}

interface ExamOption {
  id: string;
  exam_name: string;
  subject_id: string | null;
  subject_code: string;
  subject_name: string;
  grade_level: string;
}

interface Props { teacherId: string }

const GRADE_ORDER = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];
const gradeSort = (a: string, b: string) => {
  const ai = GRADE_ORDER.indexOf(a);
  const bi = GRADE_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b, 'th');
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
};

const ExamReport = ({ teacherId }: Props) => {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`id, exam_name, subject_id, subjects(subject_code, subject_name, grade_level)`)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((e: any): ExamOption => ({
        id: e.id,
        exam_name: e.exam_name,
        subject_id: e.subject_id,
        subject_code: e.subjects?.subject_code || '-',
        subject_name: e.subjects?.subject_name || 'ไม่ระบุวิชา',
        grade_level: e.subjects?.grade_level || 'ไม่ระบุชั้น',
      }));
      setExams(mapped);
      if (mapped.length) setSelectedSubject((current) => current || mapped[0].subject_name);
    } catch (error: any) {
      toast({ title: 'โหลดข้อมูลข้อสอบไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchResults = async () => {
    if (!selectedExam) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`id, score, total_questions, completed_at, students(student_id, first_name, last_name, class), exams(exam_name)`)
        .eq('exam_id', selectedExam)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      setResults((data as ExamResult[]) || []);
    } catch (error: any) {
      setResults([]);
      toast({ title: 'โหลดคะแนนไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => { fetchExams(); }, [teacherId]);
  useEffect(() => { fetchResults(); }, [selectedExam]);

  const subjects = useMemo(() => [...new Set(exams.map((e) => e.subject_name))].sort((a, b) => a.localeCompare(b, 'th')), [exams]);
  const grades = useMemo(() => [...new Set(exams.filter((e) => e.subject_name === selectedSubject).map((e) => e.grade_level))].sort(gradeSort), [exams, selectedSubject]);
  const examsForSelection = useMemo(() => exams.filter((e) => e.subject_name === selectedSubject && e.grade_level === selectedGrade), [exams, selectedSubject, selectedGrade]);
  const classes = useMemo(() => [...new Set(results.map((r) => r.students?.class).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'th')), [results]);
  const filtered = selectedClass === 'all' ? results : results.filter((r) => r.students?.class === selectedClass);
  const currentExam = exams.find((e) => e.id === selectedExam);
  const totalQuestions = filtered[0]?.total_questions || 0;
  const average = filtered.length ? (filtered.reduce((sum, r) => sum + Number(r.score), 0) / filtered.length).toFixed(2) : '0.00';

  const printRows = useMemo(() => [...filtered].sort((a, b) => {
    const classCompare = String(a.students?.class || '').localeCompare(String(b.students?.class || ''), 'th');
    if (classCompare) return classCompare;
    return String(a.students?.student_id || '').localeCompare(String(b.students?.student_id || ''), 'th', { numeric: true });
  }), [filtered]);

  const resetSelection = () => {
    setSelectedExam('');
    setSelectedClass('all');
    setResults([]);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedGrade('');
    resetSelection();
  };

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    resetSelection();
  };

  const handleExamChange = (value: string) => {
    setSelectedExam(value);
    setSelectedClass('all');
  };

  const handleReset = async (result: ExamResult) => {
    const name = result.students ? `${result.students.first_name} ${result.students.last_name}` : 'นักเรียนคนนี้';
    if (!window.confirm(`ต้องการให้นักเรียน ${name} ทำข้อสอบใหม่หรือไม่?\nผลสอบเดิมจะถูกลบออกจากระบบ`)) return;
    setResettingId(result.id);
    try {
      const { data, error } = await supabase.functions.invoke('reset-exam-result', { body: { result_id: result.id } });
      if (error || !data?.success) throw error || new Error(data?.error || 'ไม่สามารถรีเซ็ตผลสอบได้');
      toast({ title: 'รีเซ็ตผลสอบสำเร็จ' });
      await fetchResults();
    } catch (error: any) {
      toast({ title: 'รีเซ็ตไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setResettingId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4 print-controls">
        <CardTitle className="flex items-center gap-2 text-xl"><BarChart3 className="h-5 w-5 text-primary" />รายงานคะแนนสอบ</CardTitle>
        <CardDescription>เลือกรายวิชา ชั้นเรียน และข้อสอบเพื่อดูผลคะแนนของนักเรียน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-slate-50/70 p-4 print-controls">
          <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><div><p className="font-semibold">เลือกข้อมูลรายงาน</p><p className="text-xs text-muted-foreground">เลือกวิชา → ชั้นเรียน → ชุดข้อสอบ</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><BookOpen className="h-4 w-4 text-primary" />1. รายวิชา</label><Select value={selectedSubject} onValueChange={handleSubjectChange} disabled={loadingExams || !subjects.length}><SelectTrigger className="h-11 bg-white"><SelectValue placeholder="เลือกรายวิชา" /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject} value={subject}>{exams.find((e) => e.subject_name === subject)?.subject_code} - {subject}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="h-4 w-4 text-primary" />2. ชั้นเรียน</label><Select value={selectedGrade} onValueChange={handleGradeChange} disabled={!selectedSubject || !grades.length}><SelectTrigger className="h-11 bg-white"><SelectValue placeholder="เลือกชั้นเรียน" /></SelectTrigger><SelectContent>{grades.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><FileText className="h-4 w-4 text-primary" />3. ชุดข้อสอบ</label><Select value={selectedExam} onValueChange={handleExamChange} disabled={!selectedGrade || !examsForSelection.length}><SelectTrigger className="h-11 bg-white"><SelectValue placeholder="เลือกชุดข้อสอบ" /></SelectTrigger><SelectContent>{examsForSelection.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.exam_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>

        {selectedExam && currentExam && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 print-controls"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">กำลังดู:</span><Badge variant="secondary">{currentExam.subject_name}</Badge><Badge variant="secondary">{currentExam.grade_level}</Badge><span className="text-sm font-medium">{currentExam.exam_name}</span></div>}

        {selectedExam && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print-controls"><div><p className="text-sm font-semibold">ผลคะแนนนักเรียน</p><p className="text-xs text-muted-foreground">เลือกห้องเรียนเพื่อกรองข้อมูล</p></div><div className="flex w-full gap-2 sm:w-auto"><Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-full bg-white sm:w-[180px]"><SelectValue placeholder="ทุกห้อง" /></SelectTrigger><SelectContent><SelectItem value="all">ทุกห้อง</SelectItem>{classes.map((className) => <SelectItem key={className} value={className}>ห้อง {className}</SelectItem>)}</SelectContent></Select><Button disabled={!filtered.length} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />พิมพ์รายงานคะแนน (A4)</Button></div></div>}

        {selectedExam && currentExam && printRows.length > 0 && <div className="print-document">
          <header className="print-header">
            <p className="print-organization">รายงานผลการประเมินผลสัมฤทธิ์ทางการเรียน</p>
            <h1>รายงานผลคะแนนการทดสอบ</h1>
            <div className="print-meta-grid">
              <p><strong>รายวิชา:</strong> {currentExam.subject_name}</p>
              <p><strong>รหัสวิชา:</strong> {currentExam.subject_code}</p>
              <p><strong>ชุดข้อสอบ:</strong> {currentExam.exam_name}</p>
              <p><strong>ระดับชั้น:</strong> {currentExam.grade_level}</p>
              <p><strong>ห้องเรียน:</strong> {selectedClass === 'all' ? 'ทุกห้อง' : selectedClass}</p>
              <p><strong>วันที่พิมพ์:</strong> {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </header>
          <div className="print-summary"><span>จำนวนนักเรียนที่มีผลคะแนน: {printRows.length} คน</span><span>คะแนนเต็ม: {totalQuestions} คะแนน | คะแนนเฉลี่ย: {average}</span></div>
          <table className="print-table">
            <thead><tr><th>ลำดับ</th><th>เลขประจำตัวนักเรียน</th><th>ชื่อ - นามสกุล</th><th>ชั้นเรียน</th><th>คะแนนที่ได้</th><th>คิดเป็นร้อยละ</th></tr></thead>
            <tbody>{printRows.map((result, index) => { const percentage = result.total_questions ? Math.round(Number(result.score) / Number(result.total_questions) * 100) : 0; return <tr key={result.id}><td>{index + 1}</td><td>{result.students?.student_id || '-'}</td><td>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</td><td>{result.students?.class || '-'}</td><td>{result.score}/{result.total_questions}</td><td>{percentage}%</td></tr>; })}</tbody>
          </table>
          <footer className="print-signature"><div>ลงชื่อ ........................................................ ผู้จัดทำรายงาน</div><div>วันที่ ............ / ............ / ............</div></footer>
        </div>}

        {loadingResults && <div className="rounded-xl border bg-white p-10 text-center"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />กำลังโหลดผลคะแนน...</div>}
        {!loadingResults && !selectedExam && <div className="rounded-xl border border-dashed p-10 text-center text-slate-500"><FileText className="mx-auto mb-3 h-10 w-10" />กรุณาเลือกชุดข้อสอบ</div>}
        {!loadingResults && selectedExam && !filtered.length && <div className="rounded-xl border border-dashed p-10 text-center text-slate-500"><Users className="mx-auto mb-3 h-10 w-10" />ยังไม่มีผลคะแนนในข้อมูลที่เลือก</div>}

        {!loadingResults && filtered.length > 0 && <div className="overflow-hidden rounded-xl border border-slate-200 print-controls"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead>#</TableHead><TableHead>รหัสนักเรียน</TableHead><TableHead>ชื่อ-สกุล</TableHead><TableHead>ห้อง</TableHead><TableHead className="text-center">คะแนน</TableHead><TableHead className="text-center">จัดการ</TableHead></TableRow></TableHeader><TableBody>{filtered.map((result, index) => <TableRow key={result.id}><TableCell>{index + 1}</TableCell><TableCell>{result.students?.student_id || '-'}</TableCell><TableCell>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</TableCell><TableCell>{result.students?.class || '-'}</TableCell><TableCell className="text-center">{result.score}/{result.total_questions}</TableCell><TableCell className="text-center"><Button size="sm" variant="outline" disabled={resettingId === result.id} onClick={() => handleReset(result)}>{resettingId === result.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}ให้ทำใหม่</Button></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent>
    </Card>
  );
};

export default ExamReport;
