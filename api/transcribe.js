// مسار مخصص لتفريغ الصوت بس — منفصل تمامًا عن /api/chat.js وعن موديل الشات.
// السبب: نفس المشكلة يلي صارت اليوم (علة بموديل الشات أثّرت على الصوت) ما لازم
// تصير مرة ثانية — كل ميزة إلها موديلها الخاص، إذا وحد فيهم صار فيه مشكلة، الباقي يضل شغال.
export const config = { runtime: "edge" };

const GOOGLE_BASE = "https://generativelanguage.googleapis.com";

function json(obj, status){
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

export default async function handler(request){
  if(request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const API_KEY = process.env.GEMINI_API_KEY;
  if(!API_KEY) return json({ error: "GEMINI_API_KEY مو مضاف بمتغيرات البيئة على Vercel" }, 500);

  // موديل مخصص لتفريغ الصوت — يُقرأ من GEMINI_AUDIO_MODEL (منفصل عن GEMINI_TEXT_MODEL).
  // الافتراضي gemini-3.1-flash-lite: محسَّن تحديدًا لمهام تفريغ الصوت (ASR)، أرخص،
  // ومؤكد ما فيه علة الـ500 يلي صارت مع gemini-3.6-flash على المدخلات الصوتية.
  const AUDIO_MODEL = process.env.GEMINI_AUDIO_MODEL || "gemini-3.1-flash-lite";

  try{
    const body = await request.json(); // { systemInstruction, contents }
    const upstream = await fetch(
      `${GOOGLE_BASE}/v1beta/models/${AUDIO_MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: body.contents,
          systemInstruction: body.systemInstruction ? { parts:[{ text: body.systemInstruction }] } : undefined,
          generationConfig: { temperature: 0.2 } // أقل من الشات عمدًا — نص حرفي وليس إبداعي
        })
      }
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "text/event-stream" }
    });
  }catch(err){
    return json({ error: String(err && err.message || err) }, 500);
  }
}
