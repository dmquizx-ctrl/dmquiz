import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { z } from 'npm:zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  image_data_url: z.string().min(1).max(7_000_000),
  previous_path: z.string().max(500).nullable().optional(),
});

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: 'ข้อมูลรูปภาพไม่ถูกต้องหรือรูปมีขนาดใหญ่เกินไป' }, 400);
    }

    const { image_data_url, previous_path } = parsed.data;
    const match = image_data_url.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) {
      return jsonResponse({ error: 'รองรับเฉพาะรูปภาพประเภท JPG, PNG และ WebP เท่านั้น' }, 400);
    }

    const mime = match[1];
    let bytes: Uint8Array;
    try {
      const binary = atob(match[2]);
      bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
      return jsonResponse({ error: 'ข้อมูลรูปภาพไม่ถูกต้อง' }, 400);
    }

    if (bytes.byteLength === 0 || bytes.byteLength > 5_000_000) {
      return jsonResponse({ error: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('ยังไม่ได้ตั้งค่า Supabase environment variables');
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage.from('question-images').upload(filePath, bytes, {
      contentType: mime,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    if (previous_path && !previous_path.startsWith('data:') && !previous_path.startsWith('http')) {
      const { error: removeError } = await client.storage.from('question-images').remove([previous_path]);
      if (removeError) console.error('Could not remove previous image:', removeError.message);
    }

    return jsonResponse({ path: filePath }, 200);
  } catch (error) {
    console.error('save-question-image:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'ไม่สามารถบันทึกรูปภาพได้' },
      500,
    );
  }
});
// redeploy trigger
