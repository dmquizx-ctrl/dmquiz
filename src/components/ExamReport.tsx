import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowDownAZ,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  LucideIcon,
  Loader2,
  PenLine,
  Printer,
  RotateCcw,
  Trophy,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  class: string;
}

interface ExamResult {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  students: Student | null;
  exams: { exam_name: string } | null;
}

interface ExamOption {
  id: string;
  exam_name: string;
  subject_id: string | null;
  subject_name: string;
  grade_level: string;
  semester: string;
  academic_year: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  teacherId: string;
}

// Sentinel value for "type the preparer's name in myself" in the teacher Select.
const CUSTOM_TEACHER = '__custom__';

type SortKey = 'name' | 'score';

interface ScoreBand {
  label: string;
  min: number;
  dot: string;
  text: string;
  chip: string;
}

// ---------------------------------------------------------------------------
// Constants & pure helpers — kept outside the component so they aren't
// recreated on every render.
// ---------------------------------------------------------------------------

const GRADE_ORDER = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];

function compareGrades(a: string, b: string): number {
  const indexA = GRADE_ORDER.indexOf(a);
  const indexB = GRADE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return a.localeCompare(b, 'th');
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

function compareStudents(a: ExamResult, b: ExamResult): number {
  const classCompare = String(a.students?.class ?? '').localeCompare(String(b.students?.class ?? ''), 'th');
  if (classCompare !== 0) return classCompare;
  return String(a.students?.student_id ?? '').localeCompare(String(b.students?.student_id ?? ''), 'th', { numeric: true });
}

// Score-band styling shared by table badges, the distribution chart and the print sheet.
const SCORE_BANDS: ScoreBand[] = [
  { label: 'ดีเยี่ยม', min: 80, dot: 'bg-emerald-500', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'ดี', min: 60, dot: 'bg-sky-500', text: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'พอใช้', min: 50, dot: 'bg-amber-500', text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'ควรปรับปรุง', min: 0, dot: 'bg-rose-500', text: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
];

function getScoreBand(percentage: number): ScoreBand {
  return SCORE_BANDS.find((band) => percentage >= band.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

function toPercentage(score: number, total: number): number {
  return total ? Math.round((Number(score) / Number(total)) * 100) : 0;
}

interface ReportStats {
  averageScore: string;
  averagePercentage: string;
  highest: number;
  lowest: number;
  passCount: number;
  passRate: number;
  distribution: Array<ScoreBand & { count: number }>;
}

function computeStats(results: ExamResult[]): ReportStats | null {
  if (!results.length) return null;

  const percentages = results.map((r) => toPercentage(r.score, r.total_questions));
  const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  const averageScore = results.reduce((sum, r) => sum + Number(r.score), 0) / results.length;
  const passCount = percentages.filter((p) => p >= 50).length;

  const distribution = SCORE_BANDS.map((band, i) => {
    const upperExclusive = i === 0 ? Infinity : SCORE_BANDS[i - 1].min;
    const count = percentages.filter((p) => p >= band.min && p < upperExclusive).length;
    return { ...band, count };
  });

  return {
    averageScore: averageScore.toFixed(2),
    averagePercentage: averagePercentage.toFixed(1),
    highest: Math.max(...percentages),
    lowest: Math.min(...percentages),
    passCount,
    passRate: Math.round((passCount / results.length) * 100),
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        {hint && <span className="ml-1 text-sm font-normal text-muted-foreground">{hint}</span>}
      </p>
    </div>
  );
}

function ScoreBadge({ percentage }: { percentage: number }) {
  const band = getScoreBand(percentage);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${band.chip}`}>
      {band.label}
    </span>
  );
}

// Print-only performance indicator. The on-screen ScoreBadge tells bands
// apart purely by pastel background color, which converges to near-identical
// gray on a black & white printer. This renders a filled-dot count (4 dots
// for the top band down to 1 for the bottom) alongside a bold label, so the
// ranking survives with zero reliance on color.
const PRINT_LEVEL_DOTS = SCORE_BANDS.length;

function PrintLevelBadge({ percentage }: { percentage: number }) {
  const band = getScoreBand(percentage);
  const bandIndex = SCORE_BANDS.findIndex((b) => b.label === band.label);
  const filled = PRINT_LEVEL_DOTS - bandIndex;
  return (
    <span className="print-level">
      <span className="print-level-dots" aria-hidden="true">
        {Array.from({ length: PRINT_LEVEL_DOTS }).map((_, i) => (
          <span key={i} className={`print-dot${i < filled ? ' print-dot-filled' : ''}`} />
        ))}
      </span>
      <span className="print-level-label">{band.label}</span>
    </span>
  );
}

function DistributionChart({ distribution, total }: { distribution: ReportStats['distribution']; total: number }) {
  return (
    <div className="rounded-xl border bg-white p-4 print-controls">
      <p className="mb-3 text-sm font-semibold">การกระจายคะแนน</p>
      <div className="space-y-2">
        {distribution.map((band) => (
          <div key={band.label} className="flex items-center gap-3">
            <span className={`w-24 shrink-0 text-xs font-medium ${band.text}`}>{band.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${band.dot} transition-[width]`}
                style={{ width: total ? `${(band.count / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{band.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintReport({
  exam,
  results,
  stats,
  preparerName,
  directorName,
}: {
  exam: ExamOption;
  results: ExamResult[];
  stats: ReportStats;
  preparerName: string;
  directorName: string;
}) {
  return (
    <div className="print-document">
      <header className="print-header">
        <p className="print-kicker">รายงานผลการประเมินผลสัมฤทธิ์ทางการเรียน</p>
        <div className="print-meta">
          <p className="print-meta-line"><strong>รายวิชา:</strong> {exam.subject_name}</p>
          <div className="print-meta-row">
            <p><strong>ระดับชั้น:</strong> {exam.grade_level}</p>
            <p>ภาคเรียนที่ {exam.semester || '-'} ปีการศึกษา {exam.academic_year || '-'}</p>
            <p><strong>วันที่พิมพ์:</strong> {new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>
      </header>

      <div className="print-summary">
        <div className="print-stat">
          <span className="print-stat-label">นักเรียนที่มีผลคะแนน</span>
          <span className="print-stat-value">{results.length} คน</span>
        </div>
        <div className="print-stat">
          <span className="print-stat-label">คะแนนเฉลี่ย</span>
          <span className="print-stat-value">{stats.averageScore} <small>({stats.averagePercentage}%)</small></span>
        </div>
        <div className="print-stat">
          <span className="print-stat-label">สูงสุด / ต่ำสุด</span>
          <span className="print-stat-value">{stats.highest}% / {stats.lowest}%</span>
        </div>
        <div className="print-stat">
          <span className="print-stat-label">ผ่านเกณฑ์ (≥50%)</span>
          <span className="print-stat-value">{stats.passRate}% <small>({stats.passCount}/{results.length} คน)</small></span>
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>เลขประจำตัวนักเรียน</th>
            <th>ชื่อ - นามสกุล</th>
            <th>ชั้นเรียน</th>
            <th>คะแนนที่ได้</th>
            <th>คิดเป็นร้อยละ</th>
            <th>ระดับผลการเรียน</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const percentage = toPercentage(result.score, result.total_questions);
            return (
              <tr key={result.id}>
                <td className="print-cell-center">{index + 1}</td>
                <td>{result.students?.student_id ?? '-'}</td>
                <td>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</td>
                <td>{result.students?.class ?? '-'}</td>
                <td className="print-cell-center">{result.score}/{result.total_questions}</td>
                <td className="print-cell-center">{percentage}%</td>
                <td className="print-cell-center">
                  <PrintLevelBadge percentage={percentage} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className="print-signature">
        <div className="print-signature-box">
          <p className="print-signature-line">ลงชื่อ ........................................................</p>
          <p className="print-signature-name">({preparerName || '.'.repeat(30)})</p>
          <p className="print-signature-role">ผู้จัดทำรายงาน</p>
          <p className="print-signature-date">วันที่ ............ / ............ / ............</p>
        </div>
        <div className="print-signature-box">
          <p className="print-signature-line">ลงชื่อ ........................................................</p>
          <p className="print-signature-name">({directorName || '.'.repeat(30)})</p>
          <p className="print-signature-role">ผู้อำนวยการโรงเรียน</p>
          <p className="print-signature-date">วันที่ ............ / ............ / ............</p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
      <Icon className="mx-auto mb-3 h-10 w-10" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ExamReport = ({ teacherId }: Props) => {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // --- Report signatures: who prepared it, and the school director's name ---
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teacherId || CUSTOM_TEACHER);
  const [customPreparerName, setCustomPreparerName] = useState('');
  const [directorName, setDirectorName] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('examReport.directorName')) || '',
  );

  const { toast } = useToast();

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, exam_name, subject_id, subjects(subject_name, grade_level, semester, academic_year)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped: ExamOption[] = (data ?? []).map((e: any) => ({
        id: e.id,
        exam_name: e.exam_name,
        subject_id: e.subject_id,
        subject_name: e.subjects?.subject_name || 'ไม่ระบุวิชา',
        grade_level: e.subjects?.grade_level || 'ไม่ระบุชั้น',
        semester: e.subjects?.semester || '',
        academic_year: e.subjects?.academic_year || '',
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
        .select('id, score, total_questions, completed_at, students(student_id, first_name, last_name, class), exams(exam_name)')
        .eq('exam_id', selectedExam)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      setResults((data as ExamResult[]) ?? []);
    } catch (error: any) {
      setResults([]);
      toast({ title: 'โหลดคะแนนไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingResults(false);
    }
  };

  // Pulled in for the "ผู้จัดทำรายงาน" (report preparer) dropdown on the print
  // sheet. If the teachers table is unavailable or empty this fails
  // silently — the UI falls back to a plain text field so printing never
  // breaks because of it.
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });
      if (error) throw error;
      setTeachers((data as Teacher[]) ?? []);
    } catch {
      setTeachers([]);
    }
  };

  useEffect(() => { fetchExams(); }, [teacherId]);
  useEffect(() => { fetchTeachers(); }, []);
  useEffect(() => { fetchResults(); }, [selectedExam]);

  // Remember the director's name locally so it doesn't need retyping every
  // time a new report is printed.
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('examReport.directorName', directorName);
  }, [directorName]);

  const subjects = useMemo(
    () => [...new Set(exams.map((e) => e.subject_name))].sort((a, b) => a.localeCompare(b, 'th')),
    [exams],
  );

  const grades = useMemo(
    () => [...new Set(exams.filter((e) => e.subject_name === selectedSubject).map((e) => e.grade_level))].sort(compareGrades),
    [exams, selectedSubject],
  );

  const examsForSelection = useMemo(
    () => exams.filter((e) => e.subject_name === selectedSubject && e.grade_level === selectedGrade),
    [exams, selectedSubject, selectedGrade],
  );

  const filteredResults = results;

  const sortedResults = useMemo(() => {
    const rows = [...filteredResults];
    return sortKey === 'score'
      ? rows.sort((a, b) => toPercentage(b.score, b.total_questions) - toPercentage(a.score, a.total_questions))
      : rows.sort(compareStudents);
  }, [filteredResults, sortKey]);

  // The printed sheet is always in a stable, class-then-name order regardless of the on-screen sort.
  const printResults = useMemo(() => [...filteredResults].sort(compareStudents), [filteredResults]);

  const currentExam = exams.find((e) => e.id === selectedExam);
  const totalQuestions = filteredResults[0]?.total_questions ?? 0;
  const stats = useMemo(() => computeStats(filteredResults), [filteredResults]);

  const usingCustomPreparer = selectedTeacherId === CUSTOM_TEACHER || !teachers.length;
  const preparerName = useMemo(() => {
    if (usingCustomPreparer) return customPreparerName;
    const match = teachers.find((t) => t.id === selectedTeacherId);
    return match ? `${match.first_name} ${match.last_name}` : customPreparerName;
  }, [usingCustomPreparer, teachers, selectedTeacherId, customPreparerName]);

  const resetSelection = () => {
    setSelectedExam('');
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
  };

  const handleReset = async (result: ExamResult) => {
    const studentName = result.students ? `${result.students.first_name} ${result.students.last_name}` : 'นักเรียนคนนี้';
    const confirmed = window.confirm(`ต้องการให้นักเรียน ${studentName} ทำข้อสอบใหม่หรือไม่?\nผลสอบเดิมจะถูกลบออกจากระบบ`);
    if (!confirmed) return;

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
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-5 w-5 text-primary" />
          รายงานคะแนนสอบ
        </CardTitle>
        <CardDescription>เลือกรายวิชา ชั้นเรียน และข้อสอบเพื่อดูผลคะแนนของนักเรียน</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Step 1–3: subject → grade → exam */}
        <div className="rounded-xl border bg-slate-50/70 p-4 print-controls">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="font-semibold">เลือกข้อมูลรายงาน</p>
              <p className="text-xs text-muted-foreground">เลือกวิชา → ชั้นเรียน → ชุดข้อสอบ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" />
                1. รายวิชา
              </label>
              <Select value={selectedSubject} onValueChange={handleSubjectChange} disabled={loadingExams || !subjects.length}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกรายวิชา" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <GraduationCap className="h-4 w-4 text-primary" />
                2. ชั้นเรียน
              </label>
              <Select value={selectedGrade} onValueChange={handleGradeChange} disabled={!selectedSubject || !grades.length}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกชั้นเรียน" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                3. ชุดข้อสอบ
              </label>
              <Select value={selectedExam} onValueChange={handleExamChange} disabled={!selectedGrade || !examsForSelection.length}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกชุดข้อสอบ" />
                </SelectTrigger>
                <SelectContent>
                  {examsForSelection.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.exam_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedExam && currentExam && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 print-controls">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">กำลังดู:</span>
            <Badge variant="secondary">{currentExam.subject_name}</Badge>
            <Badge variant="secondary">{currentExam.grade_level}</Badge>
            <span className="text-sm font-medium">{currentExam.exam_name}</span>
          </div>
        )}

        {selectedExam && stats && (
          <div className="grid grid-cols-2 gap-3 print-controls sm:grid-cols-4">
            <StatCard icon={Users} label="นักเรียนที่สอบ" value={String(filteredResults.length)} />
            <StatCard icon={BarChart3} label="คะแนนเฉลี่ย" value={stats.averageScore} hint={`/ ${totalQuestions}`} />
            <StatCard icon={Trophy} label="คะแนนสูงสุด - ต่ำสุด" value={`${stats.highest}% - ${stats.lowest}%`} />
            <StatCard
              icon={CheckCircle2}
              label="ผ่านเกณฑ์ (≥50%)"
              value={`${stats.passRate}%`}
              hint={`(${stats.passCount}/${filteredResults.length} คน)`}
            />
          </div>
        )}

        {selectedExam && stats && (
          <DistributionChart distribution={stats.distribution} total={filteredResults.length} />
        )}

        {selectedExam && (
          <div className="rounded-xl border bg-slate-50/70 p-4 print-controls">
            <div className="mb-3 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold">ผู้ลงนามในรายงาน</p>
                <p className="text-xs text-muted-foreground">ใช้แสดงในเอกสารที่พิมพ์ออกมา</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">ผู้จัดทำรายงาน</label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="เลือกครูผู้จัดทำรายงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_TEACHER}>พิมพ์ชื่อเอง...</SelectItem>
                  </SelectContent>
                </Select>
                {usingCustomPreparer && (
                  <Input
                    className="mt-2 h-11 bg-white"
                    placeholder="ชื่อ-สกุล ผู้จัดทำรายงาน"
                    value={customPreparerName}
                    onChange={(e) => setCustomPreparerName(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">ผู้อำนวยการโรงเรียน</label>
                <Input
                  className="h-11 bg-white"
                  placeholder="ชื่อ-สกุล ผู้อำนวยการโรงเรียน"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {selectedExam && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print-controls">
            <div>
              <p className="text-sm font-semibold">ผลคะแนนนักเรียน</p>
              <p className="text-xs text-muted-foreground">เรียงลำดับคะแนนหรือพิมพ์รายงาน</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setSortKey((key) => (key === 'name' ? 'score' : 'name'))}
                title={sortKey === 'name' ? 'เรียงตามชื่อ - กดเพื่อเรียงตามคะแนน' : 'เรียงตามคะแนน - กดเพื่อเรียงตามชื่อ'}
              >
                {sortKey === 'name' ? <ArrowDownAZ className="mr-2 h-4 w-4" /> : <ArrowUpDown className="mr-2 h-4 w-4" />}
                {sortKey === 'name' ? 'เรียงตามชื่อ' : 'เรียงตามคะแนน'}
              </Button>

              <Button disabled={!filteredResults.length} onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                พิมพ์รายงานคะแนน (A4)
              </Button>
            </div>
          </div>
        )}

        {selectedExam &&
          currentExam &&
          printResults.length > 0 &&
          stats &&
          typeof document !== 'undefined' &&
          createPortal(
            <div id="print-portal-root">
              <PrintReport
                exam={currentExam}
                results={printResults}
                stats={stats}
                preparerName={preparerName}
                directorName={directorName}
              />
            </div>,
            document.body,
          )}

        {loadingResults && (
          <div className="rounded-xl border bg-white p-10 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            กำลังโหลดผลคะแนน...
          </div>
        )}
        {!loadingResults && !selectedExam && <EmptyState icon={FileText} message="กรุณาเลือกชุดข้อสอบ" />}
        {!loadingResults && selectedExam && !filteredResults.length && (
          <EmptyState icon={Users} message="ยังไม่มีผลคะแนนในข้อมูลที่เลือก" />
        )}

        {!loadingResults && sortedResults.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 print-controls">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>#</TableHead>
                  <TableHead>รหัสนักเรียน</TableHead>
                  <TableHead>ชื่อ-สกุล</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead className="text-center">คะแนน</TableHead>
                  <TableHead className="text-center">ระดับ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result, index) => {
                  const percentage = toPercentage(result.score, result.total_questions);
                  return (
                    <TableRow key={result.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{result.students?.student_id ?? '-'}</TableCell>
                      <TableCell>{result.students ? `${result.students.first_name} ${result.students.last_name}` : '-'}</TableCell>
                      <TableCell>{result.students?.class ?? '-'}</TableCell>
                      <TableCell className="text-center font-medium">
                        {result.score}/{result.total_questions}{' '}
                        <span className="text-xs text-muted-foreground">({percentage}%)</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge percentage={percentage} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" disabled={resettingId === result.id} onClick={() => handleReset(result)}>
                          {resettingId === result.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          )}
                          ให้ทำใหม่
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamReport;
