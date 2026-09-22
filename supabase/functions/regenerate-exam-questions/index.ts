import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { exam_id, question_count, subject_id, teacher_id } = await req.json();

    console.info(`Regenerating questions for exam ${exam_id}, count: ${question_count}`);

    if (!exam_id || !question_count) {
      return new Response(
        JSON.stringify({ error: 'กรุณาระบุ exam_id และ question_count' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the database function to regenerate questions
    const { error } = await supabase.rpc('generate_exam_questions', {
      p_exam_id: exam_id,
      p_question_count: question_count,
      p_subject_id: subject_id || null,
      p_teacher_id: teacher_id || null
    });

    if (error) {
      console.error('Error regenerating questions:', error);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถสุ่มข้อสอบใหม่ได้', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update the exam's question_count
    await supabase
      .from('exams')
      .update({ question_count })
      .eq('id', exam_id);

    console.info('Questions regenerated successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Regenerate questions error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
