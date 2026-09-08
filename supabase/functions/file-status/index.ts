const _v = "2026-09-08";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const url = new URL(req.url); const name = url.searchParams.get("name"); const code = url.searchParams.get("code") ?? ""; const deviceId = url.searchParams.get("device_id") ?? "";
    const auth = await fetch(`${supabaseUrl}/rest/v1/rpc/check_code`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_code: code, p_device_id: deviceId }) });
    if (!auth.ok || !(await auth.json()).valid) return json({ error: "التفعيل غير صالح." }, 403);
    if (!name) return json({ error: "missing name" }, 400);
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(Deno.env.get("GEMINI_API_KEY") ?? "")}`);
    return json(await upstream.json().catch(() => ({ error: "invalid_response" })), upstream.status);
  } catch { return json({ error: "تعذر التحقق من حالة الملف." }, 500); }
});
