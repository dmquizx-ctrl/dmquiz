import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { students } = await req.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: 'ข้อมูลนักเรียนไม่ถูกต้อง' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Importing ${students.length} students...`);

    // Hash passwords and prepare data
    const studentsToInsert = await Promise.all(
      students.map(async (student: any) => {
        const passwordHash = await hashPassword(student.student_id);
        return {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          class: student.class,
          password_hash: passwordHash
        };
      })
    );

    // Insert students with upsert to handle duplicates
    const { data, error } = await supabase
      .from('students')
      .upsert(studentsToInsert, { onConflict: 'student_id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('Error inserting students:', error);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถบันทึกข้อมูลได้', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Successfully imported ${data?.length || 0} students`);

    return new Response(
      JSON.stringify({
        message: 'นำเข้าข้อมูลสำเร็จ',
        count: data?.length || 0,
        students: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
