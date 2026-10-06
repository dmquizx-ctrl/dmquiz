import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { student_id, exam_id, answers, cap_at_50_percent } = await req.json();

    if (!student_id || !exam_id || !answers) {
      return new Response(
        JSON.stringify({ error: 'ข้อมูลไม่ครบถ้วน' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existing } = await supabase
      .from('exam_results')
      .select('id')
      .eq('student_id', student_id)
      .eq('exam_id', exam_id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'คุณได้ทำข้อสอบชุดนี้ไปแล้ว' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: examQuestions, error: eqError } = await supabase
      .from('exam_questions')
      .select('question_id, question_order, questions(id, correct_answer)')
      .eq('exam_id', exam_id)
      .order('question_order');

    if (eqError || !examQuestions) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อสอบ' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let rawScore = 0;
    const totalQuestions = examQuestions.length;

    for (const eq of examQuestions) {
      const q = eq.questions as any;
      if (q && answers[eq.question_id] === q.correct_answer) {
        rawScore++;
      }
    }

    const shouldCapAt50Percent = Boolean(cap_at_50_percent);
    const maxScoreAt50Percent = shouldCapAt50Percent ? Math.max(0, Math.floor(totalQuestions * 0.5)) : totalQuestions;
    const finalScore = shouldCapAt50Percent ? Math.min(rawScore, maxScoreAt50Percent) : rawScore;

    const { data: result, error: insertError } = await supabase
      .from('exam_results')
      .insert({
        student_id,
        exam_id,
        score: finalScore,
        total_questions: totalQuestions,
        answers,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถบันทึกผลสอบได้' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: finalScore,
        total_questions: totalQuestions,
        raw_score: rawScore,
        capped_at_50: shouldCapAt50Percent && rawScore > maxScoreAt50Percent,
        result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Submit exam error:', error);
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาด' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
