import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      teacher_id,
      subject_id,
      questions,
      create_exam,
      exam_name,
      duration_minutes,
      start_at,
      end_at,
      is_locked,
    } = await req.json();


    if (!teacher_id || !subject_id || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: 'ข้อมูลไม่ครบถ้วน' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const invalid = questions.find((q: any) => !['A', 'B', 'C', 'D'].includes(q.correct_answer));
    if (invalid) {
      return new Response(JSON.stringify({ error: 'มีข้อที่ยังไม่ได้เลือกเฉลย' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = questions.map((q: any) => ({
      question_text: q.question_text,
      image_path: q.image_path || null,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_count === 3 ? '-' : (q.option_d || '-'),
      correct_answer: q.correct_answer,
      option_count: q.option_count === 3 ? 3 : 4,
      subject_id,
      teacher_id,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('questions')
      .insert(rows)
      .select('id');

    if (insertError) {
      console.error('Insert questions error:', insertError);
      return new Response(JSON.stringify({ error: 'บันทึกคำถามไม่สำเร็จ: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let exam = null;
    if (create_exam) {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert({
          exam_name: exam_name || 'ข้อสอบนำเข้า',
          question_count: inserted!.length,
          duration_minutes: duration_minutes || 60,
          is_active: true,
          subject_id,
          teacher_id,
          start_at: start_at || null,
          end_at: end_at || null,
          is_locked: !!is_locked,
        })
        .select()
        .single();


      if (examError) {
        console.error('Create exam error:', examError);
        return new Response(
          JSON.stringify({ error: 'บันทึกคำถามแล้ว แต่สร้างชุดข้อสอบไม่สำเร็จ', imported: inserted!.length }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const examQuestions = inserted!.map((q, i) => ({
        exam_id: examData.id,
        question_id: q.id,
        question_order: i + 1,
      }));

      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestions);
      if (eqError) {
        console.error('exam_questions error:', eqError);
        return new Response(
          JSON.stringify({ error: 'สร้างชุดข้อสอบไม่สำเร็จ: ' + eqError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      exam = examData;
    }

    return new Response(
      JSON.stringify({ success: true, imported: inserted!.length, exam }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('import-exam error:', error);
    return new Response(JSON.stringify({ error: 'เกิดข้อผิดพลาด' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
