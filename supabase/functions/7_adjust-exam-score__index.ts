import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ปรับคะแนนด้วยมือ: ถ้าคะแนนเกิน 50% ของคะแนนเต็ม ให้ลดเหลือ 50% (ไม่เพิ่มคะแนนให้ใคร)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { result_id } = await req.json();
    if (!result_id) {
      return json({ error: 'กรุณาระบุ result_id' }, 400);
    }

    const { data: row, error: findError } = await supabase
      .from('exam_results')
      .select('id, score, total_questions')
      .eq('id', result_id)
      .maybeSingle();

    if (findError) {
      console.error('Find result error:', findError);
      return json({ error: 'ไม่สามารถอ่านผลสอบได้', details: findError.message }, 500);
    }
    if (!row) {
      return json({ error: 'ไม่พบผลสอบ' }, 404);
    }

    const oldScore = Number(row.score);
    const cappedScore = Number(row.total_questions) * 0.5;

    if (oldScore <= cappedScore) {
      return json({
        success: true,
        changed: false,
        score: oldScore,
        total_questions: row.total_questions,
        message: 'คะแนนไม่เกิน 50% อยู่แล้ว ไม่มีการเปลี่ยนแปลง',
      });
    }

    const { error: updateError } = await supabase
      .from('exam_results')
      .update({ score: cappedScore })
      .eq('id', result_id);

    if (updateError) {
      console.error('Update score error:', updateError);
      return json({ error: 'ไม่สามารถปรับคะแนนได้', details: updateError.message }, 500);
    }

    console.log(`Adjusted result ${result_id}: ${oldScore} -> ${cappedScore}`);

    return json({
      success: true,
      changed: true,
      old_score: oldScore,
      score: cappedScore,
      total_questions: row.total_questions,
    });
  } catch (error) {
    console.error('Adjust exam score error:', error);
    return json({ error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' }, 500);
  }
});
