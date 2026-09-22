import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      exam_name, 
      subject_id, 
      question_count, 
      duration_minutes, 
      teacher_id 
    } = await req.json();

    console.log('Creating exam:', { exam_name, subject_id, question_count, duration_minutes, teacher_id });

    // Validate required fields
    if (!exam_name || !subject_id || !teacher_id) {
      return new Response(
        JSON.stringify({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify teacher exists
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, teacher_code')
      .eq('id', teacher_id)
      .single();

    if (teacherError || !teacher) {
      console.error('Teacher not found:', teacherError);
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อมูลครู' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify subject belongs to teacher
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name')
      .eq('id', subject_id)
      .eq('teacher_id', teacher_id)
      .single();

    if (subjectError || !subject) {
      console.error('Subject not found or not assigned to teacher:', subjectError);
      return new Response(
        JSON.stringify({ error: 'ไม่พบรายวิชาหรือรายวิชาไม่ได้รับมอบหมายให้คุณ' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the exam with subject and teacher links
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        exam_name: exam_name,
        question_count: question_count || 10,
        duration_minutes: duration_minutes || 60,
        is_active: true,
        created_by: null, // We don't link to admins, this is teacher-created
        subject_id: subject_id,
        teacher_id: teacher_id
      })
      .select()
      .single();

    if (examError) {
      console.error('Error creating exam:', examError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถสร้างข้อสอบได้: ' + examError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Exam created:', exam);

    // Generate questions for the exam from the specific subject and teacher
    const { error: genError } = await supabase.rpc('generate_exam_questions', {
      p_exam_id: exam.id,
      p_question_count: question_count || 10,
      p_subject_id: subject_id,
      p_teacher_id: teacher_id
    });

    if (genError) {
      console.error('Error generating questions:', genError);
      // Don't fail the whole request, just log the error
    }

    console.log('Exam creation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        exam: exam,
        message: 'สร้างข้อสอบสำเร็จ'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดในระบบ' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
