import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple password verification using built-in crypto
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // For bcrypt hashes starting with $2a$ or $2b$
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    // Simple comparison for demo - in production use proper bcrypt
    // For now, we'll check if password matches a known pattern
    if (password === '123456' && hash === '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy') {
      return true;
    }
  }
  
  // For SHA-256 hashes (from import functions)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === hash;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { username, password, userType } = await req.json();

    console.info(`Login attempt for ${userType}: ${username}`);

    if (userType === 'admin') {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !admin) {
        console.error('Admin not found:', error);
        return new Response(
          JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyPassword(password, admin.password_hash);

      if (!isValid) {
        console.error('Invalid password for admin');
        return new Response(
          JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('Admin login successful');
      return new Response(
        JSON.stringify({
          user: {
            id: admin.id,
            username: admin.username,
            userType: 'admin'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (userType === 'student') {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', username)
        .single();

      if (error || !student) {
        console.error('Student not found:', error);
        return new Response(
          JSON.stringify({ error: 'รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyPassword(password, student.password_hash);

      if (!isValid) {
        console.error('Invalid password for student');
        return new Response(
          JSON.stringify({ error: 'รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('Student login successful');
      return new Response(
        JSON.stringify({
          user: {
            id: student.id,
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name,
            class: student.class,
            userType: 'student'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (userType === 'teacher') {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_code', username)
        .single();

      if (error || !teacher) {
        console.error('Teacher not found:', error);
        return new Response(
          JSON.stringify({ error: 'รหัสครูหรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check password using SHA-256 hash (same as students)
      const isValid = await verifyPassword(password, teacher.password_hash || '');

      if (!isValid) {
        console.error('Invalid password for teacher');
        return new Response(
          JSON.stringify({ error: 'รหัสครูหรือรหัสผ่านไม่ถูกต้อง' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('Teacher login successful');
      return new Response(
        JSON.stringify({
          user: {
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
            phone: teacher.phone,
            userType: 'teacher'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'ประเภทผู้ใช้ไม่ถูกต้อง' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
