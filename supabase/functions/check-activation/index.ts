const functionVersion = "2026-09-08";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const deviceId = String(body.device_id ?? "").trim();
    const mode = body.mode === "check" ? "check_code" : "activate_code";
    if (!code || !deviceId) return response({ valid: false, message: "أدخل الكود وحاول مرة أخرى." }, 400);
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/${mode}`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: code, p_device_id: deviceId }),
    });
    const data = await result.json().catch(() => null);
    if (!result.ok) return response({ valid: false, message: "تعذر التحقق من التفعيل." }, 502);
    return response(data ?? { valid: false, message: "تعذر التحقق من التفعيل." });
  } catch {
    return response({ valid: false, message: "تعذر الاتصال بالخادم." }, 500);
  }
});
