const functionVersion = "2026-09-08";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

function headers(req: Request, contentType = false) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = configuredOrigin === "*" || origin === configuredOrigin || origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173";
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || configuredOrigin) : configuredOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function response(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req, true) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: headers(req) });
  try {
    if (req.method !== "POST") return response(req, { error: "method_not_allowed" }, 405);
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const deviceId = String(body.device_id ?? "").trim();
    const mode = body.mode === "check" ? "check_code" : "activate_code";
    if (!code || !deviceId) return response(req, { valid: false, message: "أدخل الكود وحاول مرة أخرى." }, 400);
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/${mode}`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: code, p_device_id: deviceId }),
    });
    const data = await result.json().catch(() => null);
    if (!result.ok) return response(req, { valid: false, message: "تعذر التحقق من التفعيل." }, 502);
    return response(req, data ?? { valid: false, message: "تعذر التحقق من التفعيل." });
  } catch {
    return response(req, { valid: false, message: "تعذر الاتصال بالخادم." }, 500);
  }
});
