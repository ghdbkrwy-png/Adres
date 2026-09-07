(function(){
  "use strict";
  const $ = UI.$;

  let cfg = Store.loadCfg();

  UI.renderTopbar(null);
  UI.renderTabnav(null, null);
  UI.mountModals();
  Shared.wireChrome(cfg, Store.saveCfg, {});

  const pickBtn = $("tr-pick-btn");
  const fileInput = $("tr-file-input");
  const statusEl = $("tr-status");
  const resultWrap = $("tr-result-wrap");
  const textEl = $("tr-text");

  pickBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if(file) transcribeFile(file);
  });

  const SYSTEM_PROMPT = "أنت خبير تفريغ صوتي بدقة عالية جدًا. استمع للتسجيل المرفق بالكامل من أوله لآخره واكتب كل ما قيل فيه " +
    "بدون اختصار أو تلخيص أو حذف أي جزء. رتب النص بفقرات منطقية حسب تغيّر المتحدث أو الموضوع، وضع علامات ترقيم صحيحة ومناسبة. " +
    "إذا كان هناك أكثر من متحدث ويمكن تمييزهم، ابدأ سطر كل متحدث جديد بـ \"المتحدث 1:\" أو \"المتحدث 2:\" وهكذا (أو باسمه إذا ذُكر بالتسجيل). " +
    "لا تضف أي تعليق أو مقدمة أو خلاصة من عندك أبدًا — فقط النص المفرّغ نفسه.";

  async function transcribeFile(file){
    resultWrap.classList.add("hidden");
    textEl.textContent = "";
    pickBtn.disabled = true;
    statusEl.classList.remove("err");
    statusEl.textContent = "جارِ رفع الملف… 0%";

    try{
      const fileObj = await Gemini.uploadSource(file, (pct) => {
        statusEl.textContent = `جارِ رفع الملف… ${pct}%`;
      });

      statusEl.textContent = "جارِ تحضير الملف…";
      const finalState = await Gemini.pollUntilActive(fileObj.name, () => {
        statusEl.textContent = "جارِ تحضير الملف…";
      });
      if(finalState === "FAILED") throw new Error("تعذّرت معالجة الملف الصوتي من طرف Google");

      statusEl.textContent = "جارِ الاستماع والتفريغ…";
      resultWrap.classList.remove("hidden");

      const contents = [{
        role: "user",
        parts: [
          { file_data: { mime_type: fileObj.mimeType || file.type || "audio/mpeg", file_uri: fileObj.uri } },
          { text: "فرّغ هذا التسجيل الآن." }
        ]
      }];
      await Gemini.streamGenerate(SYSTEM_PROMPT, contents, (partial) => {
        textEl.textContent = partial;
      });
      statusEl.textContent = "تم التفريغ ✓";
    }catch(err){
      statusEl.textContent = "صار خطأ: " + (err.message || err);
      statusEl.classList.add("err");
      UI.toast("تعذّر تفريغ الصوت: " + (err.message || err), true);
    }finally{
      pickBtn.disabled = false;
    }
  }

  $("tr-copy-btn").addEventListener("click", () => {
    const text = textEl.innerText;
    if(!text.trim()){ UI.toast("ما في نص للنسخ بعد", true); return; }
    navigator.clipboard.writeText(text)
      .then(() => UI.toast("انتسخ النص"))
      .catch(() => UI.toast("تعذّر النسخ — انسخه يدويًا", true));
  });

  $("tr-print-btn").addEventListener("click", () => {
    if(!textEl.innerText.trim()){ UI.toast("ما في نص للطباعة بعد", true); return; }
    window.print();
  });

  $("tr-download-btn").addEventListener("click", () => {
    const text = textEl.innerText;
    if(!text.trim()){ UI.toast("ما في نص للتنزيل بعد", true); return; }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "تفريغ-صوتي.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();
