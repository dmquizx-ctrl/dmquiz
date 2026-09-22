import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXTERNAL_SUPABASE_URL = 'https://fsqfwiygfvaayfqtkzhc.supabase.co';
const EXTERNAL_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcWZ3aXlnZnZhYXlmcXRremhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzMTksImV4cCI6MjA2NTQ4MjMxOX0.Xm12nbcousdjP7H6Wz2vY3DXTRGVkocqxd_EBApsrh0';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body with term filters
    const { academic_year, semester } = await req.json();

    if (!academic_year || !semester) {
      return new Response(
        JSON.stringify({ error: 'กรุณาระบุปีการศึกษาและภาคเรียน' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connect to external Supabase
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY);

    console.info(`Fetching students from external API for academic year ${academic_year}, semester ${semester}...`);

    // Fetch students from external database filtered by term
    const { data: externalStudents, error: fetchError } = await externalSupabase
      .from('students')
      .select('*')
      .eq('academicYear', academic_year)
      .eq('semester', semester);

    if (fetchError) {
      console.error('Error fetching external students:', fetchError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถดึงข้อมูลนักเรียนจาก API ภายนอกได้', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!externalStudents || externalStudents.length === 0) {
      console.info('No students found in external database');
      return new Response(
        JSON.stringify({ message: 'ไม่พบข้อมูลนักเรียน', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Found ${externalStudents.length} students in external database`);

    // Transform and insert students
    const studentsToInsert = await Promise.all(
      externalStudents.map(async (student: any) => {
        const sid = student.studentId || student.student_id || student.id;
        const passwordHash = await hashPassword(sid);
        
        return {
          student_id: sid,
          first_name: student.firstNameTh || student.first_name || student.name || 'ไม่ระบุ',
          last_name: student.lastNameTh || student.last_name || '',
          class: student.grade || student.class || 'ไม่ระบุ',
          password_hash: passwordHash
        };
      })
    );

    // Insert students (upsert to handle duplicates)
    const { data: insertedStudents, error: insertError } = await supabase
      .from('students')
      .upsert(studentsToInsert, { onConflict: 'student_id', ignoreDuplicates: false })
      .select();

    if (insertError) {
      console.error('Error inserting students:', insertError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถบันทึกข้อมูลนักเรียนได้', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Successfully synced ${insertedStudents?.length || 0} students`);

    return new Response(
      JSON.stringify({
        message: 'นำเข้าข้อมูลนักเรียนสำเร็จ',
        count: insertedStudents?.length || 0,
        students: insertedStudents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
