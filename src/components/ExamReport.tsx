import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowDownAZ,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Printer,
  RotateCcw,
  Trophy,
  Users,
} from 'lucide-react';
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

// Score-band styling shared by badges, the distribution chart and the print sheet.
const SCORE_BANDS = [
  { label: 'ดีเยี่ยม', min: 80, dot: 'bg-emerald-500', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'ดี', min: 60, dot: 'bg-sky-500', text: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'พอใช้', min: 50, dot: 'bg-amber-500', text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'ควรปรับปรุง', min: 0, dot: 'bg-rose-500', text: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
] as const;

const bandFor = (percentage: number) => SCORE_BANDS.find((b) => percentage >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
const pct = (score: number, total: number) => (total ? Math.round((Number(score) / Number(total)) * 100) : 0);

type SortKey = 'name' | 'score';

const ExamReport = ({ teacherId }: Props) => {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
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

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const percentages = filtered.map((r) => pct(r.score, r.total_questions));
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passCount = percentages.filter((p) => p >= 50).length;
    const buckets = SCORE_BANDS.map((band, i) => {
      const upperExclusive = i === 0 ? Infinity : SCORE_BANDS[i - 1].min;
      const count = percentages.filter((p) => p >= band.min && p < upperExclusive).length;
      return { ...band, count };
    });
    return {
      average: average.toFixed(1),
      averageScore: (filtered.reduce((sum, r) => sum + Number(r.score), 0) / filtered.length).toFixed(2),
      highest,
      lowest,
      passCount,
      passRate: Math.round((passCount / filtered.length) * 100),
      buckets,
    };
  }, [filtered]);

  const sortedRows = useMemo(() => {
    const rows = [...filtered];
    if (sortKey === 'score') {
      rows.sort((a, b) => pct(b.score, b.total_questions) - pct(a.score, a.total_questions));
    } else {
      rows.sort((a, b) => {
        const classCompare = String(a.students?.class || '').localeCompare(String(b.students?.class || ''), 'th');
        if (classCompare) return classCompare;
        return String(a.students?.student_id || '').localeCompare(String(b.students?.student_id || ''), 'th', { numeric: true });
      });
    }
    return rows;
  }, [filtered, sortKey]);

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

        {/* Stat cards + score distribution — screen only */}
        {selectedExam && stats && (
          <div className="grid grid-cols-2 gap-3 print-controls sm:grid-cols-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />นักเรียนที่สอบ</div>
              <p className="mt-1 text-2xl font-semibold">{filtered.length}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" />คะแนนเฉลี่ย</div>
              <p className="mt-1 text-2xl font-semibold">{stats.averageScore}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {totalQuestions}</span></p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5" />คะแนนสูงสุด - ต่ำสุด</div>
              <p className="mt-1 text-2xl font-semibold">{stats.highest}%<span className="mx-1 text-sm font-normal text-muted-foreground">-</span>{stats.lowest}%</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />ผ่านเกณฑ์ (≥50%)</div>
              <p className="mt-1 text-2xl font-semibold">{stats.passRate}%<span className="ml-1 text-sm font-normal text-muted-foreground">({stats.passCount}/{filtered.length} คน)</span></p>
            </div>
          </div>
        )}

        {selectedExam && stats && (
          <div className="rounded-xl border bg-white p-4 print-controls">
            <p className="mb-3 text-sm font-semibold">การกระจายคะแนน</p>
            <div className="space-y-2">
              {stats.buckets.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 text-xs font-medium ${b.text}`}>{b.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${b.dot}`}
                      style={{ width: filtered.length ? `${(b.count / filtered.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedExam && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print-controls">
          <div><p className="text-sm font-semibold">ผลคะแนนนักเรียน</p><p className="text-xs text-muted-foreground">เลือกห้องเรียนเพื่อกรองข้อมูล หรือเรียงลำดับคะแนน</p></div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-full bg-white sm:w-[160px]"><SelectValue placeholder="ทุกห้อง" /></SelectTrigger><SelectContent><SelectItem value="all">ทุกห้อง</SelectItem>{classes.map((className) => <SelectItem key={className} value={className}>ห้อง {className}</SelectItem>)}</SelectContent></Select>
            <Button
              variant="outline"
              onClick={() => setSortKey((k) => (k === 'name' ? 'score' : 'name'))}
              title={sortKey === 'name' ? 'เรียงตามชื่อ - กดเพื่อเรียงตามคะแนน' : 'เรียงตามคะแนน - กดเพื่อเรียงตามชื่อ'}
            >
              {sortKey === 'name' ? <ArrowDownAZ className="mr-2 h-4 w-4" /> : <ArrowUpDown className="mr-2 h-4 w-4" />}
              {sortKey === 'name' ? 'เรียงตามชื่อ' : 'เรียงตามคะแนน'}
            </Button>
            <Button disabled={!filtered.length} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />พิมพ์รายงานคะแนน (A4)</Button>
          </div>
        </div>}

        {/* Print-only document */}
        {selectedExam && currentExam && printRows.length > 0 && stats && <div className="print-document">
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
          <div className="print-summary">
            <span>จำนวนนักเรียนที่มีผลคะแนน: {printRows.length} คน</span>
            <span>คะแนนเต็ม: {totalQuestions} | เฉลี่ย: {stats.averageScore} ({stats.average}%)</span>
            <span>สูงสุด/ต่ำสุด: {stats.highest}% / {stats.lowest}%</span>
            <span>ผ่านเกณฑ์: {stats.passRate}% ({stats.passCount}/{printRows.length} คน)</span>
          </div>
          <table className="print-table">
            <thead><tr><th>ลำดับ</th><th>เลขประจำตัวนักเรียน</th><th>ชื่อ - นามสกุล</th><th>ชั้นเรียน</th><th>คะแนนที่ได้</th><th>คิดเป็นร้อยละ</th><th>ระดับผลการเรียน</th></tr></thead>
            <tbody>{printRows.map((result, index) => {
              const percentage = pct(result.score, result.total_questions);
              const band = bandFor(percentage);
              return <tr key={result.id}><td>{index + 1}</td><td>{result.students?.student_id || '-'}</td><td>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</td><td>{result.students?.class || '-'}</td><td>{result.score}/{result.total_questions}</td><td>{percentage}%</td><td>{band.label}</td></tr>;
            })}</tbody>
          </table>
          <footer className="print-signature"><div>ลงชื่อ ........................................................ ผู้จัดทำรายงาน</div><div>วันที่ ............ / ............ / ............</div></footer>
        </div>}

        {loadingResults && <div className="rounded-xl border bg-white p-10 text-center"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />กำลังโหลดผลคะแนน...</div>}
        {!loadingResults && !selectedExam && <div className="rounded-xl border border-dashed p-10 text-center text-slate-500"><FileText className="mx-auto mb-3 h-10 w-10" />กรุณาเลือกชุดข้อสอบ</div>}
        {!loadingResults && selectedExam && !filtered.length && <div className="rounded-xl border border-dashed p-10 text-center text-slate-500"><Users className="mx-auto mb-3 h-10 w-10" />ยังไม่มีผลคะแนนในข้อมูลที่เลือก</div>}

        {!loadingResults && sortedRows.length > 0 && <div className="overflow-hidden rounded-xl border border-slate-200 print-controls">
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>#</TableHead><TableHead>รหัสนักเรียน</TableHead><TableHead>ชื่อ-สกุล</TableHead><TableHead>ห้อง</TableHead><TableHead className="text-center">คะแนน</TableHead><TableHead className="text-center">ระดับ</TableHead><TableHead className="text-center">จัดการ</TableHead></TableRow></TableHeader>
            <TableBody>{sortedRows.map((result, index) => {
              const percentage = pct(result.score, result.total_questions);
              const band = bandFor(percentage);
              return (
                <TableRow key={result.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{result.students?.student_id || '-'}</TableCell>
                  <TableCell>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</TableCell>
                  <TableCell>{result.students?.class || '-'}</TableCell>
                  <TableCell className="text-center font-medium">{result.score}/{result.total_questions} <span className="text-xs text-muted-foreground">({percentage}%)</span></TableCell>
                  <TableCell className="text-center"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${band.chip}`}>{band.label}</span></TableCell>
                  <TableCell className="text-center"><Button size="sm" variant="outline" disabled={resettingId === result.id} onClick={() => handleReset(result)}>{resettingId === result.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}ให้ทำใหม่</Button></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>}
      </CardContent>
    </Card>
  );
};

export default ExamReport;
