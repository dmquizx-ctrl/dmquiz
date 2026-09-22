const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, pages = [] } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'ไม่พบเนื้อหาข้อสอบในไฟล์' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `คุณคือผู้ช่วยแปลงข้อสอบปรนัยภาษาไทยจากข้อความดิบให้เป็นข้อมูล JSON
กติกา:
- ตัวเลือกภาษาไทย ก/ข/ค/ง ให้แปลงเป็น A/B/C/D ตามลำดับ
- ถ้าข้อสอบมีเฉลยอยู่ท้ายเอกสาร (ตาราง "เฉลย") ให้จับคู่เฉลยกับข้อให้ถูกต้อง ถ้าไม่มีเฉลยให้ใส่ correct_answer เป็น ""
- ข้อความจาก PDF ภาษาไทยอาจมีช่องว่างแทรกผิด (เช่น "ท า" = "ทำ", "ส าคัญ" = "สำคัญ") ให้แก้คำให้ถูกต้อง
- option_count = 4 ถ้ามีตัวเลือก ก-ง, = 3 ถ้ามีแค่ ก-ค
- ห้ามแต่งข้อสอบเพิ่มเอง ใช้เฉพาะที่ปรากฏในเอกสาร
- ถ้าข้อใดต้องอาศัยภาพเพื่อเข้าใจโจทย์หรือตัวเลือก ให้ระบุ has_image=true พร้อม page_number และกรอบ image_crop แบบพิกัด 0-1000 (x,y,width,height) โดยครอบเฉพาะภาพประกอบและป้ายตัวเลือกที่จำเป็น ไม่ครอบข้อความโจทย์
- ถ้าไม่ต้องใช้ภาพ ให้ has_image=false และไม่ต้องระบุกรอบภาพ`;

    const userContent: any[] = [{ type: 'text', text: `แปลงข้อสอบต่อไปนี้เป็น JSON:\n\n${text.slice(0, 60000)}` }];
    for (const page of Array.isArray(pages) ? pages.slice(0, 20) : []) {
      if (typeof page === 'string' && page.startsWith('data:image/')) {
        userContent.push({ type: 'image_url', image_url: { url: page } });
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_questions',
              description: 'ส่งคืนรายการข้อสอบที่แปลงแล้ว',
              parameters: {
                type: 'object',
                properties: {
                  exam_title: { type: 'string', description: 'ชื่อข้อสอบ/หัวข้อจากเอกสาร' },
                  duration_minutes: { type: 'number', description: 'เวลาสอบเป็นนาที ถ้าไม่ระบุใช้ 60' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: { type: 'string' },
                        option_a: { type: 'string' },
                        option_b: { type: 'string' },
                        option_c: { type: 'string' },
                        option_d: { type: 'string' },
                        correct_answer: { type: 'string', enum: ['A', 'B', 'C', 'D', ''] },
                        option_count: { type: 'number', enum: [3, 4] },
                        has_image: { type: 'boolean' },
                        page_number: { type: 'number' },
                        image_crop: {
                          type: 'object',
                          properties: {
                            x: { type: 'number' }, y: { type: 'number' },
                            width: { type: 'number' }, height: { type: 'number' },
                          },
                          required: ['x', 'y', 'width', 'height'],
                          additionalProperties: false,
                        },
                      },
                      required: ['question_text', 'option_a', 'option_b', 'option_c', 'correct_answer', 'option_count'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['exam_title', 'duration_minutes', 'questions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_questions' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'ใช้งาน AI บ่อยเกินไป กรุณาลองใหม่อีกครั้ง' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'เครดิต AI หมด กรุณาเติมเครดิต' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI ประมวลผลไม่สำเร็จ' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: 'ไม่สามารถอ่านข้อสอบจากไฟล์นี้ได้' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(call.function.arguments);
    const questions = (parsed.questions || []).map((q: any) => ({
      question_text: String(q.question_text || '').trim(),
      option_a: String(q.option_a || '').trim(),
      option_b: String(q.option_b || '').trim(),
      option_c: String(q.option_c || '').trim(),
      option_d: String(q.option_d || '').trim(),
      correct_answer: ['A', 'B', 'C', 'D'].includes(q.correct_answer) ? q.correct_answer : '',
      option_count: q.option_count === 3 ? 3 : 4,
      has_image: q.has_image === true,
      page_number: Number.isInteger(q.page_number) ? q.page_number : null,
      image_crop: q.image_crop || null,
    })).filter((q: any) => q.question_text && q.option_a && q.option_b);

    return new Response(
      JSON.stringify({
        success: true,
        exam_title: parsed.exam_title || 'ข้อสอบนำเข้า',
        duration_minutes: parsed.duration_minutes || 60,
        questions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('parse-exam-file error:', error);
    return new Response(JSON.stringify({ error: 'เกิดข้อผิดพลาดในการอ่านไฟล์' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
