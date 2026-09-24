import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import { Users, Printer } from 'lucide-react';

interface ExamOption {
  id: string;
  exam_name: string;
  subjects: { subject_name: string } | null;
}

interface StudentInfo {
  student_id: string;
  first_name: string;
  last_name: string;
  class: string;
}

interface ExamResultRow {
  id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  students: StudentInfo | null;
}

export function ResultsManagement() {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchResults();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam]);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('id, exam_name, subjects(subject_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
      return;
    }

    setExams(data || []);
  };

  const fetchResults = async () => {
    setLoading(true);

    let query = supabase
      .from('exam_results')
      .select(
        `
        id,
        score,
        total_questions,
        completed_at,
        exam_id,
        students(
          student_id,
          first_name,
          last_name,
          class
        )
      `
      )
      .order('completed_at', { ascending: false });

    if (selectedExam !== 'all') {
      query = query.eq('exam_id', selectedExam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exam results:', error);
      setResults([]);
    } else {
      setResults((data as unknown as ExamResultRow[]) || []);
    }

    setLoading(false);
  };

  const classes = useMemo(() => {
    const uniqueClasses = new Set(
      results
        .map((result) => result.students?.class)
        .filter((className): className is string => Boolean(className))
    );

    return Array.from(uniqueClasses).sort();
  }, [results]);

  const filtered = useMemo(() => {
    if (selectedClass === 'all') {
      return results;
    }

    return results.filter(
      (result) => result.students?.class === selectedClass
    );
  }, [results, selectedClass]);

  const avgPct =
    filtered.length > 0
      ? Math.round(
          (filtered.reduce(
            (sum, result) =>
              sum +
              (result.total_questions
                ? result.score / result.total_questions
                : 0),
            0
          ) /
            filtered.length) *
            100
        )
      : 0;

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ตัวกรอง */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <Select
            value={selectedExam}
            onValueChange={setSelectedExam}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="เลือกข้อสอบ" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                ข้อสอบทุกชุด
              </SelectItem>

              {exams.map((exam) => (
                <SelectItem
                  key={exam.id}
                  value={exam.id}
                >
                  {exam.exam_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <Select
            value={selectedClass}
            onValueChange={setSelectedClass}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="ทุกห้อง" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                ทุกห้อง
              </SelectItem>

              {classes.map((className) => (
                <SelectItem
                  key={className}
                  value={className}
                >
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* สรุปผล */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                จำนวนที่สอบแล้ว
              </p>

              <p className="mt-1 text-2xl font-bold text-primary">
                {filtered.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                คะแนนเฉลี่ย
              </p>

              <p className="mt-1 text-2xl font-bold text-primary">
                {avgPct}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                จำนวนข้อสอบที่มีผล
              </p>

              <p className="mt-1 text-2xl font-bold text-primary">
                {new Set(
                  filtered.map((result) => result.exam_id)
                ).size}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ไม่มีข้อมูล */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />

          <p>ยังไม่มีผลคะแนนในระบบ</p>
        </div>
      ) : (
        /* ตารางผลคะแนน */
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
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

                <TableHead className="text-center">
                  คะแนน
                </TableHead>

                <TableHead className="text-center">
                  %
                </TableHead>

                <TableHead>
                  วันที่สอบ
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((result, index) => {
                const percentage =
                  result.total_questions
                    ? Math.round(
                        (result.score /
                          result.total_questions) *
                          100
                      )
                    : 0;

                return (
                  <TableRow key={result.id}>
                    <TableCell>
                      {index + 1}
                    </TableCell>

                    <TableCell className="font-mono">
                      {result.students?.student_id ?? '-'}
                    </TableCell>

                    <TableCell>
                      {result.students
                        ? `${result.students.first_name} ${result.students.last_name}`
                        : '-'}
                    </TableCell>

                    <TableCell>
                      {result.students?.class ?? '-'}
                    </TableCell>

                    <TableCell className="text-center font-bold">
                      {result.score}/
                      {result.total_questions}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={
                          percentage >= 80
                            ? 'default'
                            : percentage >= 50
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {percentage}%
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {result.completed_at
                        ? new Date(
                            result.completed_at
                          ).toLocaleString('th-TH')
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
