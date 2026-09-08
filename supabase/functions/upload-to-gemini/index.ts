const _v = "2026-09-08";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
async function authorized(code: string, deviceId: string) { const r = await fetch(`${supabaseUrl}/rest/v1/rpc/check_code`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_code: code, p_device_id: deviceId }) }); return r.ok && Boolean((await r.json()).valid); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const body = await req.json();
    if (!(await authorized(String(body.code ?? ""), String(body.device_id ?? "")))) return json({ error: "التفعيل غير صالح." }, 403);
    const path = String(body.storage_path ?? "");
    const mimeType = String(body.mime_type ?? "application/octet-stream");
    if (!path) return json({ error: "لم يتم تحديد الملف." }, 400);
    const fileResponse = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent("user-files")}/${path.split("/").map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } });
    if (!fileResponse.ok || !fileResponse.body) return json({ error: "تعذر قراءة الملف المرفوع." }, 502);
    const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(geminiKey)}`, { method: "POST", headers: { "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(body.size_bytes ?? 0), "X-Goog-Upload-Header-Content-Type": mimeType, "Content-Type": "application/json" }, body: JSON.stringify({ file: { display_name: body.file_name ?? "file" } }) });
    if (!start.ok) return json({ error: "تعذر بدء رفع الملف إلى خدمة الذكاء الاصطناعي." }, 502);
    const uploadUrl = start.headers.get("x-goog-upload-url");
    if (!uploadUrl) return json({ error: "تعذر إنشاء رابط الرفع." }, 502);
    const uploaded = await fetch(uploadUrl, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Type": mimeType }, body: fileResponse.body, duplex: "half" });
    const data = await uploaded.json().catch(() => null);
    if (!uploaded.ok) return json({ error: "تعذر رفع الملف إلى خدمة الذكاء الاصطناعي." }, 502);
    return json(data);
  } catch { return json({ error: "حدث خطأ أثناء رفع الملف." }, 500); }
});
