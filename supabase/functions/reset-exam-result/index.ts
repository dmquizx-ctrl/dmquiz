import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';


// ======================================================
// CORS
// ======================================================

const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',

};


// ======================================================
// EDGE FUNCTION
// ======================================================

Deno.serve(async (req) => {


  // ----------------------------------------------------
  // OPTIONS / CORS
  // ----------------------------------------------------

  if (req.method === 'OPTIONS') {

    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders,
      }
    );

  }


  // ----------------------------------------------------
  // ONLY POST
  // ----------------------------------------------------

  if (req.method !== 'POST') {

    return new Response(

      JSON.stringify({
        error:
          'Method not allowed',
      }),

      {
        status: 405,

        headers: {
          ...corsHeaders,

          'Content-Type':
            'application/json',
        },
      }

    );

  }


  try {


    // ==================================================
    // SUPABASE
    // ==================================================

    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL'
      );

    const supabaseServiceKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      );


    if (
      !supabaseUrl ||
      !supabaseServiceKey
    ) {

      throw new Error(
        'ไม่พบค่า Supabase Environment'
      );

    }


    const supabase =
      createClient(
        supabaseUrl,
        supabaseServiceKey
      );


    // ==================================================
    // READ BODY
    // ==================================================

    const body =
      await req.json();


    const {
      result_id,
      student_id,
      exam_id,
    } = body;


    // ==================================================
    // VALIDATE
    // ==================================================

    if (
      !result_id &&
      !(student_id && exam_id)
    ) {

      return new Response(

        JSON.stringify({

          error:
            'กรุณาระบุ result_id หรือ student_id และ exam_id',

        }),

        {
          status: 400,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }

      );

    }


    // ==================================================
    // DELETE RESULT
    // ==================================================

    let query =
      supabase
        .from('exam_results')
        .delete();


    // --------------------------------------------------
    // CASE 1
    // result_id
    // --------------------------------------------------

    if (result_id) {

      query =
        query.eq(
          'id',
          result_id
        );

    }


    // --------------------------------------------------
    // CASE 2
    // student_id + exam_id
    // --------------------------------------------------

    else {

      query =
        query
          .eq(
            'student_id',
            student_id
          )
          .eq(
            'exam_id',
            exam_id
          );

    }


    // ==================================================
    // EXECUTE DELETE
    // ==================================================

    const {
      data,
      error,
    } =
      await query.select(
        'id, student_id, exam_id, score, total_questions'
      );


    // ==================================================
    // ERROR
    // ==================================================

    if (error) {

      console.error(
        'Reset exam result error:',
        error
      );


      return new Response(

        JSON.stringify({

          error:
            'ไม่สามารถรีเซ็ตผลสอบได้',

          details:
            error.message,

        }),

        {
          status: 500,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }

      );

    }


    // ==================================================
    // NOT FOUND
    // ==================================================

    if (
      !data ||
      data.length === 0
    ) {

      return new Response(

        JSON.stringify({

          error:
            'ไม่พบผลสอบของนักเรียนที่ต้องการรีเซ็ต',

        }),

        {
          status: 404,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }

      );

    }


    // ==================================================
    // LOG
    // ==================================================

    console.log(
      'Reset exam result:',
      data
    );


    // ==================================================
    // SUCCESS
    // ==================================================

    return new Response(

      JSON.stringify({

        success: true,

        message:
          'รีเซ็ตผลสอบเรียบร้อยแล้ว นักเรียนสามารถทำข้อสอบใหม่ได้',

        deleted_count:
          data.length,

        deleted:
          data,

      }),

      {

        status: 200,

        headers: {

          ...corsHeaders,

          'Content-Type':
            'application/json',

        },

      }

    );


  } catch (error) {


    // ==================================================
    // CATCH ERROR
    // ==================================================

    console.error(
      'Reset exam result error:',
      error
    );


    const errorMessage =
      error instanceof Error
        ? error.message
        : 'เกิดข้อผิดพลาดในการรีเซ็ตผลสอบ';


    return new Response(

      JSON.stringify({

        error:
          errorMessage,

      }),

      {

        status: 500,

        headers: {

          ...corsHeaders,

          'Content-Type':
            'application/json',

        },

      }

    );

  }

});
