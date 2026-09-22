import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import {
  BarChart3,
  Users,
  RotateCcw,
  Loader2,
  BookOpen,
  GraduationCap,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';


// ======================================================
// TYPES
// ======================================================

interface ExamResult {
  id: string;

  score: number;

  total_questions: number;

  completed_at: string;

  students: {
    student_id: string;

    first_name: string;

    last_name: string;

    class: string;
  };

  exams: {
    exam_name: string;
  };
}


interface ExamOption {
  id: string;

  exam_name: string;

  subject_id: string | null;

  subject_name: string;

  grade_level: string;
}


// ======================================================
// PROPS
// ======================================================

interface Props {
  teacherId: string;
}


// ======================================================
// GRADE ORDER
// ======================================================

const GRADE_ORDER = [
  'ป.1',
  'ป.2',
  'ป.3',
  'ป.4',
  'ป.5',
  'ป.6',
];


const gradeSort = (
  a: string,
  b: string
) => {

  const ai =
    GRADE_ORDER.indexOf(a);

  const bi =
    GRADE_ORDER.indexOf(b);


  if (ai === -1 && bi === -1) {
    return a.localeCompare(b);
  }


  if (ai === -1) {
    return 1;
  }


  if (bi === -1) {
    return -1;
  }


  return ai - bi;
};


// ======================================================
// COMPONENT
// ======================================================

const ExamReport = ({
  teacherId,
}: Props) => {


  // ====================================================
  // STATE
  // ====================================================

  const [exams, setExams] =
    useState<ExamOption[]>([]);


  const [results, setResults] =
    useState<ExamResult[]>([]);


  // รายวิชา
  const [selectedSubject, setSelectedSubject] =
    useState<string>('');


  // ชั้นเรียน
  const [selectedGrade, setSelectedGrade] =
    useState<string>('');


  // ข้อสอบ
  const [selectedExam, setSelectedExam] =
    useState<string>('');


  // ห้อง
  const [selectedClass, setSelectedClass] =
    useState<string>('all');


  const [loadingExams, setLoadingExams] =
    useState(false);


  const [loadingResults, setLoadingResults] =
    useState(false);


  const [resettingId, setResettingId] =
    useState<string | null>(null);


  const { toast } =
    useToast();


  // ====================================================
  // LOAD EXAMS
  // ====================================================

  useEffect(() => {

    fetchExams();

  }, [teacherId]);


  // ====================================================
  // LOAD RESULTS WHEN EXAM CHANGES
  // ====================================================

  useEffect(() => {

    if (selectedExam) {

      fetchResults();

    } else {

      setResults([]);

    }

  }, [selectedExam]);


  // ====================================================
  // FETCH EXAMS
  // ====================================================

  const fetchExams = async () => {

    setLoadingExams(true);


    try {

      const {
        data,
        error,
      } = await supabase
        .from('exams')
        .select(
          `
          id,
          exam_name,
          subject_id,
          subjects(
            subject_name,
            grade_level
          )
          `
        )
        .eq(
          'teacher_id',
          teacherId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );


      if (error) {

        console.error(
          'Fetch exams error:',
          error
        );


        toast({

          title:
            'โหลดข้อมูลข้อสอบไม่สำเร็จ',

          description:
            error.message,

          variant:
            'destructive',

        });


        return;

      }


      const mapped: ExamOption[] =
        (data || []).map(
          (e: any) => ({

            id:
              e.id,

            exam_name:
              e.exam_name,

            subject_id:
              e.subject_id,

            subject_name:
              e.subjects?.subject_name ||
              'ไม่ระบุวิชา',

            grade_level:
              e.subjects?.grade_level ||
              'ไม่ระบุชั้น',

          })
        );


      setExams(mapped);


      // ----------------------------------------------
      // เลือกรายวิชาแรกให้อัตโนมัติ
      // ----------------------------------------------

      if (mapped.length > 0) {

        const firstSubject =
          mapped[0].subject_name;

        setSelectedSubject(
          firstSubject
        );

      }

    } catch (error: any) {

      console.error(
        'Fetch exams error:',
        error
      );

    } finally {

      setLoadingExams(false);

    }

  };


  // ====================================================
  // SUBJECT LIST
  // ====================================================

  const subjects = useMemo(() => {

    const unique =
      [
        ...new Set(
          exams.map(
            e =>
              e.subject_name
          )
        ),
      ];


    return unique.sort(
      (a, b) =>
        a.localeCompare(
          b,
          'th'
        )
    );

  }, [exams]);


  // ====================================================
  // GRADES FOR SELECTED SUBJECT
  // ====================================================

  const gradesForSubject =
    useMemo(() => {

      if (!selectedSubject) {
        return [];
      }


      const grades =
        [
          ...new Set(
            exams
              .filter(
                e =>
                  e.subject_name ===
                  selectedSubject
              )
              .map(
                e =>
                  e.grade_level
              )
          ),
        ];


      return grades.sort(
        gradeSort
      );

    }, [
      exams,
      selectedSubject,
    ]);


  // ====================================================
  // EXAMS FOR SELECTED SUBJECT + GRADE
  // ====================================================

  const examsForSelection =
    useMemo(() => {

      if (
        !selectedSubject ||
        !selectedGrade
      ) {

        return [];

      }


      return exams.filter(
        e =>
          e.subject_name ===
            selectedSubject &&
          e.grade_level ===
            selectedGrade
      );

    }, [
      exams,
      selectedSubject,
      selectedGrade,
    ]);


  // ====================================================
  // SUBJECT CHANGE
  // ====================================================

  const handleSubjectChange = (
    value: string
  ) => {

    setSelectedSubject(
      value
    );


    const grades =
      [
        ...new Set(
          exams
            .filter(
              e =>
                e.subject_name ===
                value
            )
            .map(
              e =>
                e.grade_level
            )
        ),
      ].sort(
        gradeSort
      );


    // เลือกชั้นแรกให้อัตโนมัติ
    const firstGrade =
      grades[0] || '';


    setSelectedGrade(
      firstGrade
    );


    // ยังไม่เลือกข้อสอบ
    setSelectedExam(
      ''
    );


    setSelectedClass(
      'all'
    );


    setResults([]);

  };


  // ====================================================
  // GRADE CHANGE
  // ====================================================

  const handleGradeChange = (
    value: string
  ) => {

    setSelectedGrade(
      value
    );


    setSelectedExam(
      ''
    );


    setSelectedClass(
      'all'
    );


    setResults([]);

  };


  // ====================================================
  // EXAM CHANGE
  // ====================================================

  const handleExamChange = (
    value: string
  ) => {

    setSelectedExam(
      value
    );


    setSelectedClass(
      'all'
    );

  };


  // ====================================================
  // FETCH RESULTS
  // ====================================================

  const fetchResults = async () => {

    if (!selectedExam) {

      setResults([]);

      return;

    }


    setLoadingResults(true);


    try {

      const {
        data,
        error,
      } = await supabase
        .from('exam_results')
        .select(
          `
          id,
          score,
          total_questions,
          completed_at,
          students(
            student_id,
            first_name,
            last_name,
            class
          ),
          exams(
            exam_name
          )
          `
        )
        .eq(
          'exam_id',
          selectedExam
        )
        .order(
          'completed_at',
          {
            ascending: false,
          }
        );


      if (error) {

        console.error(
          'Fetch results error:',
          error
        );


        toast({

          title:
            'โหลดคะแนนไม่สำเร็จ',

          description:
            error.message,

          variant:
            'destructive',

        });


        setResults([]);

        return;

      }


      setResults(
        (data as any) || []
      );

    } catch (error: any) {

      console.error(
        'Fetch results error:',
        error
      );


      setResults([]);

    } finally {

      setLoadingResults(
        false
      );

    }

  };


  // ====================================================
  // CLASS LIST
  // ====================================================

  const classes = useMemo(() => {

    return [
      ...new Set(
        results
          .map(
            r =>
              r.students?.class
          )
          .filter(Boolean)
      ),
    ].sort(
      (a, b) =>
        String(a).localeCompare(
          String(b),
          'th'
        )
    );

  }, [results]);


  // ====================================================
  // FILTER RESULTS
  // ====================================================

  const filtered =
    selectedClass === 'all'
      ? results
      : results.filter(
          r =>
            r.students?.class ===
            selectedClass
        );


  // ====================================================
  // STATISTICS
  // ====================================================

  const totalStudents =
    filtered.length;


  const avgScore =
    totalStudents > 0
      ? (
          filtered.reduce(
            (
              sum,
              r
            ) =>
              sum +
              Number(
                r.score
              ),
            0
          ) /
          totalStudents
        ).toFixed(1)
      : '0';


  const maxScore =
    totalStudents > 0
      ? Math.max(
          ...filtered.map(
            r =>
              Number(
                r.score
              )
          )
        )
      : 0;


  const minScore =
    totalStudents > 0
      ? Math.min(
          ...filtered.map(
            r =>
              Number(
                r.score
              )
          )
        )
      : 0;


  const totalQuestions =
    filtered.length > 0
      ? filtered[0]
          .total_questions
      : 0;


  // ====================================================
  // RESET / ALLOW RETAKE
  // ====================================================

  const handleReset = async (
    r: ExamResult
  ) => {

    const studentName =
      r.students
        ? `${r.students.first_name} ${r.students.last_name}`
        : 'นักเรียนคนนี้';


    const studentId =
      r.students?.student_id ||
      '-';


    const examName =
      r.exams?.exam_name ||
      'ข้อสอบชุดนี้';


    const confirmed =
      window.confirm(

        `ต้องการให้นักเรียนทำข้อสอบใหม่หรือไม่?

นักเรียน: ${studentName}
รหัสนักเรียน: ${studentId}
ข้อสอบ: ${examName}
คะแนนเดิม: ${r.score}/${r.total_questions}

เมื่อกด "ตกลง"
ผลสอบเดิมจะถูกลบออกจากระบบ
และนักเรียนสามารถเข้าสอบใหม่ได้`

      );


    if (!confirmed) {

      return;

    }


    setResettingId(
      r.id
    );


    try {

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          'reset-exam-result',
          {
            body: {
              result_id:
                r.id,
            },
          }
        );


      if (error) {

        throw error;

      }


      if (
        !data ||
        data.success !== true
      ) {

        throw new Error(
          data?.error ||
          'ไม่สามารถรีเซ็ตผลสอบได้'
        );

      }


      toast({

        title:
          'รีเซ็ตผลสอบสำเร็จ',

        description:
          `${studentName} สามารถทำข้อสอบใหม่ได้แล้ว`,

      });


      await fetchResults();

    } catch (
      error: any
    ) {

      console.error(
        'Reset error:',
        error
      );


      toast({

        title:
          'รีเซ็ตไม่สำเร็จ',

        description:
          error?.message ||
          'ไม่สามารถรีเซ็ตผลสอบได้',

        variant:
          'destructive',

      });

    } finally {

      setResettingId(
        null
      );

    }

  };


  // ====================================================
  // CURRENT EXAM
  // ====================================================

  const currentExam =
    exams.find(
      e =>
        e.id ===
        selectedExam
    );


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <Card className="border-slate-200 shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <CardHeader
        className="pb-4"
      >

        <CardTitle
          className="flex items-center gap-2 text-xl"
        >

          <BarChart3
            className="h-5 w-5 text-primary"
          />

          รายงานคะแนนสอบ

        </CardTitle>


        <CardDescription>

          เลือกรายวิชา ชั้นเรียน และข้อสอบ
          เพื่อดูผลคะแนนของนักเรียน

        </CardDescription>

      </CardHeader>


      <CardContent
        className="space-y-5"
      >


        {/* =================================================
            STEP SELECT
        ================================================= */}

        <div
          className="rounded-xl border bg-slate-50/70 p-4"
        >

          <div
            className="mb-4 flex items-center gap-2"
          >

            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"
            >

              <FileText
                className="h-4 w-4 text-primary"
              />

            </div>


            <div>

              <p
                className="font-semibold"
              >
                เลือกข้อมูลรายงาน
              </p>

              <p
                className="text-xs text-muted-foreground"
              >
                เลือกตามลำดับ รายวิชา → ชั้น → ข้อสอบ
              </p>

            </div>

          </div>


          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >


            {/* =========================================
                SUBJECT
            ========================================= */}

            <div>

              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
              >

                <BookOpen
                  className="h-4 w-4 text-primary"
                />

                1. รายวิชา

              </label>


              <Select
                value={
                  selectedSubject
                }
                onValueChange={
                  handleSubjectChange
                }
                disabled={
                  loadingExams ||
                  subjects.length === 0
                }
              >

                <SelectTrigger
                  className="h-11 bg-white"
                >

                  <SelectValue
                    placeholder={
                      loadingExams
                        ? 'กำลังโหลด...'
                        : 'เลือกรายวิชา'
                    }
                  />

                </SelectTrigger>


                <SelectContent>

                  {subjects.map(
                    subject => (

                      <SelectItem
                        key={subject}
                        value={subject}
                      >

                        {subject}

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>


            {/* =========================================
                GRADE
            ========================================= */}

            <div>

              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
              >

                <GraduationCap
                  className="h-4 w-4 text-primary"
                />

                2. ชั้นเรียน

              </label>


              <Select
                value={
                  selectedGrade
                }
                onValueChange={
                  handleGradeChange
                }
                disabled={
                  !selectedSubject ||
                  gradesForSubject.length === 0
                }
              >

                <SelectTrigger
                  className="h-11 bg-white"
                >

                  <SelectValue
                    placeholder="เลือกชั้นเรียน"
                  />

                </SelectTrigger>


                <SelectContent>

                  {gradesForSubject.map(
                    grade => (

                      <SelectItem
                        key={grade}
                        value={grade}
                      >

                        {grade}

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>


            {/* =========================================
                EXAM
            ========================================= */}

            <div>

              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
              >

                <FileText
                  className="h-4 w-4 text-primary"
                />

                3. ชุดข้อสอบ

              </label>


              <Select
                value={
                  selectedExam
                }
                onValueChange={
                  handleExamChange
                }
                disabled={
                  !selectedGrade ||
                  examsForSelection.length === 0
                }
              >

                <SelectTrigger
                  className="h-11 bg-white"
                >

                  <SelectValue
                    placeholder="เลือกชุดข้อสอบ"
                  />

                </SelectTrigger>


                <SelectContent>

                  {examsForSelection.map(
                    exam => (

                      <SelectItem
                        key={exam.id}
                        value={exam.id}
                      >

                        {exam.exam_name}

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>

          </div>

        </div>


        {/* =================================================
            CURRENT SELECTION
        ================================================= */}

        {selectedExam &&
          currentExam && (

            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
            >

              <CheckCircle2
                className="h-4 w-4 text-primary"
              />


              <span
                className="text-sm text-muted-foreground"
              >
                กำลังดู:
              </span>


              <Badge
                variant="secondary"
              >
                {currentExam.subject_name}
              </Badge>


              <Badge
                variant="secondary"
              >
                {currentExam.grade_level}
              </Badge>


              <span
                className="text-sm font-medium"
              >
                {currentExam.exam_name}
              </span>

            </div>

          )}


        {/* =================================================
            CLASS FILTER
        ================================================= */}

        {selectedExam && (
          <div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >

            <div>

              <p
                className="text-sm font-semibold"
              >
                ผลคะแนนนักเรียน
              </p>

              <p
                className="text-xs text-muted-foreground"
              >
                เลือกห้องเรียนเพื่อกรองข้อมูล
              </p>

            </div>


            <div
              className="w-full sm:w-[180px]"
            >

              <Select
                value={
                  selectedClass
                }
                onValueChange={
                  setSelectedClass
                }
              >

                <SelectTrigger
                  className="bg-white"
                >

                  <SelectValue
                    placeholder="ทุกห้อง"
                  />

                </SelectTrigger>


                <SelectContent>

                  <SelectItem
                    value="all"
                  >
                    ทุกห้อง
                  </SelectItem>


                  {classes.map(
                    classroom => (

                      <SelectItem
                        key={
                          classroom as string
                        }
                        value={
                          classroom as string
                        }
                      >

                        ห้อง {
                          classroom as string
                        }

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>

          </div>
        )}


        {/* =================================================
            STATISTICS
        ================================================= */}

        {selectedExam &&
          filtered.length > 0 && (

            <div
              className="grid grid-cols-2 gap-3 md:grid-cols-4"
            >

              {/* จำนวน */}

              <Card
                className="border-slate-200"
              >

                <CardContent
                  className="p-4"
                >

                  <div
                    className="flex items-center justify-between"
                  >

                    <div>

                      <p
                        className="text-xs text-muted-foreground"
                      >
                        จำนวนที่สอบแล้ว
                      </p>

                      <p
                        className="mt-1 text-2xl font-bold"
                      >
                        {totalStudents}
                      </p>

                    </div>


                    <Users
                      className="h-7 w-7 text-primary/60"
                    />

                  </div>

                </CardContent>

              </Card>


              {/* เฉลี่ย */}

              <Card
                className="border-slate-200"
              >

                <CardContent
                  className="p-4"
                >

                  <p
                    className="text-xs text-muted-foreground"
                  >
                    คะแนนเฉลี่ย
                  </p>

                  <p
                    className="mt-1 text-2xl font-bold text-primary"
                  >

                    {avgScore}/
                    {totalQuestions}

                  </p>

                </CardContent>

              </Card>


              {/* สูงสุด */}

              <Card
                className="border-slate-200"
              >

                <CardContent
                  className="p-4"
                >

                  <p
                    className="text-xs text-muted-foreground"
                  >
                    คะแนนสูงสุด
                  </p>

                  <p
                    className="mt-1 text-2xl font-bold text-green-600"
                  >

                    {maxScore}/
                    {totalQuestions}

                  </p>

                </CardContent>

              </Card>


              {/* ต่ำสุด */}

              <Card
                className="border-slate-200"
              >

                <CardContent
                  className="p-4"
                >

                  <p
                    className="text-xs text-muted-foreground"
                  >
                    คะแนนต่ำสุด
                  </p>

                  <p
                    className="mt-1 text-2xl font-bold text-red-600"
                  >

                    {minScore}/
                    {totalQuestions}

                  </p>

                </CardContent>

              </Card>

            </div>

          )}


        {/* =================================================
            LOADING
        ================================================= */}

        {loadingResults && (

          <div
            className="rounded-xl border bg-white p-10 text-center"
          >

            <Loader2
              className="mx-auto mb-3 h-8 w-8 animate-spin text-primary"
            />

            <p
              className="text-sm text-muted-foreground"
            >
              กำลังโหลดผลคะแนน...
            </p>

          </div>

        )}


        {/* =================================================
            NO EXAM SELECTED
        ================================================= */}

        {!loadingResults &&
          !selectedExam && (

            <div
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
            >

              <FileText
                className="mx-auto mb-3 h-10 w-10 text-slate-400"
              />

              <p
                className="font-medium text-slate-700"
              >
                กรุณาเลือกชุดข้อสอบ
              </p>

              <p
                className="mt-1 text-sm text-slate-500"
              >
                เลือกรายวิชา → ชั้นเรียน → ชุดข้อสอบ
              </p>

            </div>

          )}


        {/* =================================================
            NO RESULT
        ================================================= */}

        {!loadingResults &&
          selectedExam &&
          filtered.length === 0 && (

            <div
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
            >

              <Users
                className="mx-auto mb-3 h-10 w-10 text-slate-400"
              />

              <p
                className="font-medium text-slate-700"
              >
                ยังไม่มีผลคะแนน
              </p>

              <p
                className="mt-1 text-sm text-slate-500"
              >
                ยังไม่มีนักเรียนเข้าสอบชุดนี้
                หรือไม่มีข้อมูลในห้องที่เลือก
              </p>

            </div>

          )}


        {/* =================================================
            RESULT TABLE
        ================================================= */}

        {!loadingResults &&
          filtered.length > 0 && (

            <div
              className="overflow-hidden rounded-xl border border-slate-200"
            >

              <Table>

                <TableHeader>

                  <TableRow
                    className="bg-slate-50"
                  >

                    <TableHead
                      className="w-12"
                    >
                      #
                    </TableHead>


                    <TableHead>
                      รหัสนักเรียน
                    </TableHead>


                    <TableHead>
                      ชื่อ-สกุล
                    </TableHead>


                    <TableHead>
                      ห้อง
                    </TableHead>


                    <TableHead
                      className="text-center"
                    >
                      คะแนน
                    </TableHead>


                    <TableHead
                      className="text-center"
                    >
                      ร้อยละ
                    </TableHead>


                    <TableHead>
                      วันที่สอบ
                    </TableHead>


                    <TableHead
                      className="text-center"
                    >
                      จัดการ
                    </TableHead>

                  </TableRow>

                </TableHeader>


                <TableBody>

                  {filtered.map(
                    (
                      r,
                      index
                    ) => {

                      const percentage =
                        r.total_questions
                          ? Math.round(
                              (Number(
                                r.score
                              ) /
                                Number(
                                  r.total_questions
                                )) *
                                100
                            )
                          : 0;


                      const isResetting =
                        resettingId ===
                        r.id;


                      return (

                        <TableRow
                          key={r.id}
                        >

                          {/* # */}

                          <TableCell>
                            {index + 1}
                          </TableCell>


                          {/* รหัส */}

                          <TableCell
                            className="font-mono"
                          >

                            {
                              r.students
                                ?.student_id ||
                              '-'
                            }

                          </TableCell>


                          {/* ชื่อ */}

                          <TableCell>

                            <div
                              className="font-medium"
                            >

                              {r.students
                                ? `${r.students.first_name} ${r.students.last_name}`
                                : '-'}

                            </div>

                          </TableCell>


                          {/* ห้อง */}

                          <TableCell>

                            {
                              r.students
                                ?.class ||
                              '-'
                            }

                          </TableCell>


                          {/* คะแนน */}

                          <TableCell
                            className="text-center"
                          >

                            <span
                              className="font-bold"
                            >

                              {r.score}/
                              {
                                r.total_questions
                              }

                            </span>

                          </TableCell>


                          {/* % */}

                          <TableCell
                            className="text-center"
                          >

                            <Badge
                              variant={
                                percentage >=
                                80
                                  ? 'default'
                                  : percentage >=
                                    50
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >

                              {percentage}%

                            </Badge>

                          </TableCell>


                          {/* DATE */}

                          <TableCell
                            className="whitespace-nowrap text-sm text-muted-foreground"
                          >

                            {r.completed_at
                              ? new Date(
                                  r.completed_at
                                ).toLocaleString(
                                  'th-TH',
                                  {
                                    year:
                                      'numeric',
                                    month:
                                      'numeric',
                                    day:
                                      'numeric',
                                    hour:
                                      '2-digit',
                                    minute:
                                      '2-digit',
                                  }
                                )
                              : '-'}

                          </TableCell>


                          {/* ACTION */}

                          <TableCell
                            className="text-center"
                          >

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                isResetting
                              }
                              onClick={() =>
                                handleReset(
                                  r
                                )
                              }
                            >

                              {isResetting ? (

                                <Loader2
                                  className="mr-1 h-3.5 w-3.5 animate-spin"
                                />

                              ) : (

                                <RotateCcw
                                  className="mr-1 h-3.5 w-3.5"
                                />

                              )}


                              {isResetting
                                ? 'กำลังรีเซ็ต...'
                                : 'ให้ทำใหม่'}

                            </Button>

                          </TableCell>

                        </TableRow>

                      );

                    }
                  )}

                </TableBody>

              </Table>

            </div>

          )}

      </CardContent>

    </Card>

  );

};


export default ExamReport;
