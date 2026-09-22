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

    const { exam_id } = await req.json();

    if (!exam_id) {
      return new Response(
        JSON.stringify({ error: 'กรุณาระบุ exam_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`Deleting exam ${exam_id}`);

    // Delete related records first to avoid foreign key constraint errors
    const { error: questionsError } = await supabase
      .from('exam_questions')
      .delete()
      .eq('exam_id', exam_id);

    if (questionsError) {
      console.error('Error deleting exam questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถลบคำถามในชุดข้อสอบได้', details: questionsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: resultsError } = await supabase
      .from('exam_results')
      .delete()
      .eq('exam_id', exam_id);

    if (resultsError) {
      console.error('Error deleting exam results:', resultsError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถลบผลการสอบได้', details: resultsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: examError } = await supabase
      .from('exams')
      .delete()
      .eq('id', exam_id);

    if (examError) {
      console.error('Error deleting exam:', examError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถลบชุดข้อสอบได้', details: examError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info('Exam deleted successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete exam error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
