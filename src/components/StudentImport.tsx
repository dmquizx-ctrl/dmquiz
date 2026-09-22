import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  class: string;
}

interface StudentImportProps {
  onImportComplete?: () => void;
}

export const StudentImport = ({ onImportComplete }: StudentImportProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, class')
      .order('class')
      .order('student_id');

    if (!error && data) {
      setStudents(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const studentsData = jsonData.map((row: any) => ({
        student_id: String(row['รหัสนักเรียน'] || row['student_id'] || ''),
        first_name: String(row['ชื่อ'] || row['first_name'] || ''),
        last_name: String(row['สกุล'] || row['last_name'] || ''),
        class: String(row['ชั้น'] || row['class'] || ''),
      }));

      if (studentsData.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์');

      const { data: result, error } = await supabase.functions.invoke('import-students', {
        body: { students: studentsData }
      });

      if (error) throw error;

      toast({ title: 'สำเร็จ', description: `นำเข้าข้อมูลนักเรียน ${result.count} คน` });
      fetchStudents();
      onImportComplete?.();
    } catch (error: any) {
      toast({ title: 'เกิดข้อผิดพลาด', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleSyncFromAPI = async () => {
    if (!selectedYear || !selectedSemester) {
      toast({ title: 'กรุณาเลือกข้อมูล', description: 'กรุณาเลือกปีการศึกษาและภาคเรียน', variant: 'destructive' });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-students', {
        body: { academic_year: selectedYear, semester: selectedSemester }
      });

      if (error) throw error;

      toast({ title: 'สำเร็จ', description: `ดึงข้อมูลนักเรียน ${data.count} คน` });
      fetchStudents();
      onImportComplete?.();
    } catch (error: any) {
      toast({ title: 'เกิดข้อผิดพลาด', description: error.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast({ title: 'สำเร็จ', description: 'ลบข้อมูลนักเรียนแล้ว' });
    }
  };

  const downloadTemplate = () => {
    const template = [{ 'รหัสนักเรียน': '12345', 'ชื่อ': 'สมชาย', 'สกุล': 'ใจดี', 'ชั้น': 'ม.3/1' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_template.xlsx');
    toast({ title: 'สำเร็จ', description: 'ดาวน์โหลดไฟล์ตัวอย่างเรียบร้อย' });
  };

  const currentYear = new Date().getFullYear() + 543;
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const classes = [...new Set(students.map(s => s.class))].sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = searchTerm === '' ||
      s.student_id.includes(searchTerm) ||
      s.first_name.includes(searchTerm) ||
      s.last_name.includes(searchTerm);
    const matchesClass = filterClass === 'all' || s.class === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-4">
      {/* Import tools */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isImporting} className="gap-2">
                <Upload className="h-4 w-4" />
                {isImporting ? 'กำลังนำเข้า...' : 'นำเข้าจาก Excel'}
              </Button>
              <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </Button>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold">ดึงข้อมูลจาก API</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ปีการศึกษา</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue placeholder="เลือกปีการศึกษา" /></SelectTrigger>
                    <SelectContent>
                      {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ภาคเรียน</Label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger><SelectValue placeholder="เลือกภาคเรียน" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="secondary" onClick={handleSyncFromAPI} disabled={isSyncing} className="gap-2 w-full">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก API'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              รายชื่อนักเรียน
              <Badge variant="secondary">{filteredStudents.length} คน</Badge>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส/ชื่อ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="ทุกชั้น" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกชั้น</SelectItem>
                  {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ไม่พบข้อมูลนักเรียน</p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>รหัสนักเรียน</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>สกุล</TableHead>
                    <TableHead>ชั้น</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono">{student.student_id}</TableCell>
                      <TableCell>{student.first_name}</TableCell>
                      <TableCell>{student.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{student.class}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};