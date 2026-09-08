const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const model = Deno.env.get("GEMINI_TTS_MODEL") ?? "gemini-3.1-flash-tts-preview";
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
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: body.prompt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: body.speechConfig } }) });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return json({ error: "حدث خطأ في خدمة الصوت." }, upstream.status);
    return json(data);
  } catch { return json({ error: "حدث خطأ أثناء توليد الصوت." }, 500); }
});
