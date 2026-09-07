const GOOGLE_BASE = "https://generativelanguage.googleapis.com";

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-File-Name,X-File-Size");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-File-Name,X-File-Size");
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

  const mimeType =
    req.headers["content-type"] || "application/octet-stream";

  const sizeBytes =
    req.headers["x-file-size"] ||
    req.headers["content-length"] ||
    "0";

  const fileName =
    decodeURIComponent(req.headers["x-file-name"] || "audio");

  try {

    /*
     * فقط نبدأ جلسة رفع مع Gemini.
     *
     * الملف نفسه لن يمر عبر Vercel.
     * Vercel يرجع للمتصفح رابط جلسة الرفع فقط.
     */

    const start = await fetch(
      `${GOOGLE_BASE}/upload/v1beta/files?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",

        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(sizeBytes),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          file: {
            display_name: fileName
          }
        })
      }
    );

    if (!start.ok) {

      const text = await start.text();

      let message = text;

      try {
        const data = JSON.parse(text);

        if (data?.error?.message) {
          message = data.error.message;
        }
      } catch (_) {}

      return sendJson(res, start.status, {
        error: message
      });
    }

    const uploadUrl =
      start.headers.get("x-goog-upload-url");

    if (!uploadUrl) {
      return sendJson(res, 502, {
        error: "Google لم يرجع رابط جلسة الرفع."
      });
    }

    /*
     * نرسل للمتصفح رابط جلسة الرفع.
     *
     * لا نرسل GEMINI_API_KEY للمتصفح.
     */

    return sendJson(res, 200, {
      uploadUrl: uploadUrl,
      mimeType: mimeType,
      sizeBytes: Number(sizeBytes),
      fileName: fileName
    });

  } catch (err) {

    return sendJson(res, 500, {
      error: String(
        err && err.message
          ? err.message
          : err
      )
    });
  }
};
