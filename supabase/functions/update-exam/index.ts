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

    const { exam_id, exam_name, question_count, duration_minutes, is_active, start_at, end_at, is_locked } = await req.json();

    console.info(`Updating exam ${exam_id}`);

    if (!exam_id) {
      return new Response(
        JSON.stringify({ error: 'กรุณาระบุ exam_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updates: Record<string, unknown> = {};
    if (exam_name !== undefined) updates.exam_name = exam_name;
    if (question_count !== undefined) updates.question_count = question_count;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (is_active !== undefined) updates.is_active = is_active;
    if (start_at !== undefined) updates.start_at = start_at || null;
    if (end_at !== undefined) updates.end_at = end_at || null;
    if (is_locked !== undefined) updates.is_locked = !!is_locked;

    const { data, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', exam_id)
      .select()
      .single();


    if (error) {
      console.error('Error updating exam:', error);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถอัปเดตข้อสอบได้', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info('Exam updated successfully');
    return new Response(
      JSON.stringify({ success: true, exam: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update exam error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
