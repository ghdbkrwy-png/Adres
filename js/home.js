(function(){
  "use strict";
  const $ = UI.$;

  let notebooks = Store.loadNotebooks();
  let cfg = Store.loadCfg();

  UI.renderTopbar(null);
  UI.renderTabnav(null, null);
  UI.mountModals();
  Shared.wireChrome(cfg, Store.saveCfg, { onCfgSaved: () => render() });

  $("home-tagline").textContent = APP_CONFIG.APP_TAGLINE + "، حتى لو كانت ممسوحة ضوئيًا أو غير مرتبة.";

  function render(){
    UI.renderHome(notebooks, openNotebook, deleteNotebook, openNewNbModal);
  }

  function openNotebook(id){ location.href = `chat.html?nb=${encodeURIComponent(id)}`; }

  function deleteNotebook(nb){
    if(!confirm(`حذف دفتر "${nb.name}"؟`)) return;
    notebooks = notebooks.filter(x => x.id !== nb.id);
    Store.saveNotebooks(notebooks);
    render();
  }

  function openNewNbModal(){
    $("newnb-name").value = "";
    UI.openModal("modal-newnb");
    $("newnb-name").focus();
  }
  $("newnb-cancel").addEventListener("click", () => UI.closeModal("modal-newnb"));
  $("newnb-create").addEventListener("click", () => {
    const name = $("newnb-name").value.trim() || "دفتر بدون اسم";
    const nb = { id: Store.uid(), name, createdAt: Date.now(), sources: [], notes: [], chat: [] };
    notebooks.push(nb);
    Store.saveNotebooks(notebooks);
    UI.closeModal("modal-newnb");
    openNotebook(nb.id);
  });
  $("newnb-name").addEventListener("keydown", (e) => { if(e.key === "Enter") $("newnb-create").click(); });

  /* ---------- جديد: قسم "أدوات إضافية" — يضيف رابط لصفحة تفريغ الصوت ---------- */
  function renderTools(){
    if($("tools-section")) return; // ما نكرره لو render() انصدت أكثر من مرة
    const grid = $("nb-grid");
    const section = document.createElement("div");
    section.id = "tools-section";
    section.style.marginTop = "30px";
    section.innerHTML = `
      <div class="home-hero" style="margin-bottom:12px;">
        <h1 style="font-size:16.5px;">أدوات إضافية</h1>
      </div>
      <div class="nb-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
        <a href="transcribe.html" class="nb-card" style="text-decoration:none;">
          <div class="nb-icon">${icon("mic")}</div>
          <h3>تفريغ الصوت</h3>
          <div class="nb-meta">حوّل أي تسجيل صوتي لنص مكتوب مرتب</div>
        </a>
      </div>
    `;
    grid.parentElement.appendChild(section);
  }

  render();
  renderTools();
})();
