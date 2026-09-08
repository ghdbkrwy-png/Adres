const _v = "2026-09-08";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const model = Deno.env.get("GEMINI_TRANSCRIBE_MODEL") ?? "gemini-3.5-transcribe";
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
    if (!body.file_uri || !String(body.mime_type ?? "").startsWith("audio/")) return json({ error: "نوع الملف الصوتي غير صالح." }, 400);
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey }, body: JSON.stringify({ model, input: [{ type: "audio", uri: body.file_uri, mime_type: body.mime_type }], generation_config: { transcription_config: { mode: { type: "verbatim" } } } }) });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return json({ error: "فشل تفريغ التسجيل." }, upstream.status);
    let text = typeof data?.output_text === "string" ? data.output_text : "";
    if (!text && Array.isArray(data?.steps)) for (const step of data.steps) for (const content of step?.content ?? []) if (content?.type === "text") text += content.text ?? "";
    if (!text && Array.isArray(data?.outputs)) for (const output of data.outputs) text += typeof output?.text === "string" ? output.text : "";
    if (!text.trim()) return json({ error: "لم يرجع التسجيل نصًا." }, 502);
    return json({ text: text.trim(), model });
  } catch { return json({ error: "حدث خطأ أثناء تفريغ التسجيل." }, 500); }
});
