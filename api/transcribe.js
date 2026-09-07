const GOOGLE_BASE = "https://generativelanguage.googleapis.com";

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "method not allowed"
    });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY غير مضاف في Vercel Environment Variables"
    });
  }

  const body = req.body || {};

  const fileUri = body.fileUri;
  const mimeType = body.mimeType;

  if (!fileUri) {
    return sendJson(res, 400, {
      error: "لم يتم إرسال رابط الملف الصوتي."
    });
  }

  if (!mimeType || !String(mimeType).startsWith("audio/")) {
    return sendJson(res, 400, {
      error: "نوع الملف الصوتي غير صالح."
    });
  }

  const TRANSCRIBE_MODEL =
    process.env.GEMINI_TRANSCRIBE_MODEL ||
    "gemini-3.5-transcribe";

  try {

    const upstream = await fetch(
      `${GOOGLE_BASE}/v1beta/interactions`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },

        body: JSON.stringify({
          model: TRANSCRIBE_MODEL,

          input: [
            {
              type: "audio",
              uri: fileUri,
              mime_type: mimeType
            }
          ],

          generation_config: {
            transcription_config: {
              mode: {
                type: "verbatim"
              }
            }
          }
        })
      }
    );

    const responseText = await upstream.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = {
        raw: responseText
      };
    }

    if (!upstream.ok) {

      let message = "فشل Gemini في تفريغ التسجيل.";

      if (data && data.error) {

        if (typeof data.error === "string") {
          message = data.error;
        } else if (data.error.message) {
          message = data.error.message;
        }

      }

      return sendJson(res, upstream.status, {
        error: message,
        details: data
      });
    }

    /*
     * أولًا نحاول output_text
     */
    let transcript = "";

    if (data && typeof data.output_text === "string") {
      transcript = data.output_text;
    }

    /*
     * الاستجابة الحديثة تستخدم steps.
     * نستخرج جميع أجزاء النص من model_output.
     */
    if (!transcript && Array.isArray(data?.steps)) {

      for (const step of data.steps) {

        if (!step || step.type !== "model_output") {
          continue;
        }

        if (!Array.isArray(step.content)) {
          continue;
        }

        for (const content of step.content) {

          if (
            content &&
            content.type === "text" &&
            typeof content.text === "string"
          ) {
            transcript += content.text;
          }

        }
      }
    }

    /*
     * دعم إضافي للاستجابة القديمة outputs
     */
    if (!transcript && Array.isArray(data?.outputs)) {

      for (const output of data.outputs) {

        if (
          output &&
          output.type === "text" &&
          typeof output.text === "string"
        ) {
          transcript += output.text;
        }

        else if (
          output &&
          typeof output.text === "string"
        ) {
          transcript += output.text;
        }

        else if (
          output &&
          Array.isArray(output.content)
        ) {

          for (const content of output.content) {

            if (
              content &&
              typeof content.text === "string"
            ) {
              transcript += content.text;
            }

          }
        }
      }
    }

    transcript = transcript.trim();

    if (!transcript) {

      return sendJson(res, 502, {
        error: "Gemini استقبل التسجيل لكنه لم يرجع نصًا.",
        debug: {
          model: TRANSCRIBE_MODEL,
          status: data?.status || null,
          id: data?.id || null,
          has_steps: Array.isArray(data?.steps),
          steps_count: Array.isArray(data?.steps)
            ? data.steps.length
            : 0
        }
      });
    }

    return sendJson(res, 200, {
      text: transcript,
      model: TRANSCRIBE_MODEL
    });

  } catch (err) {

    return sendJson(res, 500, {
      error: err?.message || String(err)
    });

  }

};
