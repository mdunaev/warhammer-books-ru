/* Мои книги: прогресс, «хочу прочитать», свои списки, обмен списками по ссылке. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  let root = null, unsub = null, shared = null;

  // Ссылка со списком: #/share/<base64url({n: имя, b: [коды книг]})>
  function shareLink(name, ids) {
    const payload = u.encode({ n: name, b: ids.map((id) => D.byId.get(id)?.n).filter(Boolean) });
    // Адрес сайта из настроек (для публикации) или текущий адрес без «#…» — работает и для file://
    const base = D.CONFIG.publicUrl || location.href.split("#")[0];
    return `${base}#/share/${payload}`;
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); ui.toast("Ссылка скопирована"); }
    catch { window.prompt("Скопируйте ссылку:", text); }
  }

  function bar(label, val, max, color, href) {
    const p = max ? Math.round((val / max) * 100) : 0;
    return `<a class="bar-row" ${href ? `href="${href}"` : ""} style="text-decoration:none;grid-template-columns:minmax(110px,170px) minmax(0,1fr) 64px"><span class="bl">${u.esc(label)}</span><span class="bt"><i style="width:${p}%;--c:${color}"></i></span><span class="bn">${val}/${max}</span></a>`;
  }

  function statsHTML() {
    const readIds = Object.keys(S.state.read).filter((id) => D.byId.has(id));
    const read = readIds.map((id) => D.byId.get(id));
    const total = D.BOOKS.length;
    const pct = total ? read.length / total : 0;
    const R = 96, C = 2 * Math.PI * R;
    const pages = read.reduce((s, b) => s + (b.pages || 0), 0);
    const classics = D.BOOKS.filter((b) => b.rec === 1);
    const favFac = Object.entries(read.reduce((m, b) => ((m[b.factions[0]] = (m[b.factions[0]] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0];
    const rated = Object.entries(S.state.rating).filter(([id]) => D.byId.has(id));
    const myAvg = rated.length ? rated.reduce((s, [, r]) => s + r, 0) / rated.length : 0;
    return `<div class="mine-top">
      <div class="big-ring"><svg viewBox="0 0 220 220"><defs><linearGradient id="ringGrad" x1="0" x2="1"><stop offset="0" stop-color="var(--gold)"/><stop offset="1" stop-color="var(--red-2)"/></linearGradient></defs>
        <circle class="track" cx="110" cy="110" r="${R}"/><circle class="val" id="big-val" cx="110" cy="110" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - pct)}"/></svg>
        <div class="center"><div><b data-count="${read.length}">0</b><span>из ${total} прочитано</span></div></div></div>
      <div>
        <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px">
          <div class="stat framed"><b data-count="${pages}">0</b><span>страниц позади (примерно)</span></div>
          <div class="stat framed"><b>${read.filter((b) => b.rec === 1).length}<small style="font-size:18px;color:var(--text-3)">/${classics.length}</small></b><span>классики прочитано</span></div>
          <div class="stat framed"><b data-count="${S.counts().want}">0</b><span>в планах</span></div>
          <div class="stat framed"><b>${myAvg ? myAvg.toFixed(1) : "—"}</b><span>ваша средняя оценка</span></div>
        </div>
        ${favFac ? `<p style="margin:0 0 12px;color:var(--text-2)">Чаще всего вы читаете про фракцию <a href="#/?fac=${favFac[0]}&status=unread">${u.esc(D.factions[favFac[0]]?.name)}</a>.</p>` : ""}
        <div class="bars">
          ${D.META.settings.map((s) => bar(s.name, read.filter((b) => b.setting === s.id).length, D.BOOKS.filter((b) => b.setting === s.id).length, s.color, `#/?setting=${s.id}&status=unread`)).join("")}
          ${D.META.groups.map((g) => bar(g.name, read.filter((b) => b.group === g.id).length, D.BOOKS.filter((b) => b.group === g.id).length, D.GROUP_HEX[g.id], `#/?status=unread`)).join("")}
        </div>
      </div>
    </div>`;
  }

  function collHTML(title, ids, opts = {}) {
    const books = ids.map((id) => D.byId.get(id)).filter(Boolean);
    return `<section class="coll" data-reveal ${opts.lid ? `data-lid="${u.esc(opts.lid)}"` : ""}>
      <div class="coll-head"><h3>${u.esc(title)}</h3><span class="n">${u.books(books.length)}</span><span class="sp"></span>${opts.actions || ""}</div>
      ${books.length ? `<div class="grid">${books.map((b) => ui.cardHTML(b, { meta: opts.meta || ((x) => x.authorsRu[0]) })).join("")}</div>` : `<div class="coll-empty">${opts.empty || "Здесь пока пусто."}</div>`}
    </section>`;
  }

  function sharedHTML() {
    if (!shared) return "";
    const ids = shared.b.map((n) => D.byN.get(String(n))?.id).filter(Boolean);
    return `<div class="chart-card" style="border-color:var(--gold)" data-reveal>
      <h3>Вам прислали список «${u.esc(shared.n || "Без названия")}»</h3>
      <p>${u.books(ids.length)}. Список откроется только у вас — его можно сохранить к себе.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"><button class="btn gold" data-x="save-shared">${ui.icon("plus")} Сохранить себе</button><button class="btn ghost" data-x="close-shared">Скрыть</button></div>
      <div class="coll"><div class="grid">${ids.map((id) => ui.cardHTML(D.byId.get(id))).join("")}</div></div>
    </div>`;
  }

  function draw() {
    const readIds = Object.entries(S.state.read).filter(([id]) => D.byId.has(id)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const wantIds = Object.entries(S.state.want).filter(([id]) => D.byId.has(id)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    A.app.currentList = [...wantIds, ...readIds, ...S.lists().flatMap((l) => l.books)];
    // Барабан показывает и открывает одну и ту же книгу
    slotPick = wantIds.length ? D.byId.get(wantIds[0]) : null;
    const nothing = !readIds.length && !wantIds.length && !S.lists().length;
    root.innerHTML = `<div class="page-head"><h1 class="page-title"><small>Личный архив</small>Мои книги</h1>
      <p class="page-lead">Всё хранится только в этом браузере. Сохраните файл, чтобы перенести отметки на другое устройство.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
        <button class="btn small" data-x="export">${ui.icon("download")} Сохранить файл</button>
        <button class="btn small" data-x="import">${ui.icon("upload")} Загрузить файл</button>
      </div></div>
      ${sharedHTML()}
      ${nothing ? `<div class="empty framed" style="border:1px solid var(--line);border-radius:16px" data-reveal><b>Начните свой архив</b>Отмечайте книги галочкой «Прочитано» или закладкой «Хочу прочитать».<br>Здесь появится прогресс, статистика и ваши списки.<br><br>
        <a class="btn gold" href="#/">${ui.icon("library")} В библиотеку</a> <button class="btn" data-x="quiz">${ui.icon("spark")} Подобрать книгу</button></div>` : statsHTML()}
      ${wantIds.length ? `<div class="chart-card" data-reveal><h3>Что читать дальше?</h3><p>Крутаните барабан — он выберет книгу из ваших планов.</p>
        <div style="display:grid;grid-template-columns:minmax(0,180px) minmax(0,1fr);gap:20px;align-items:center"><div class="slot" id="slot">${ui.coverHTML(D.byId.get(wantIds[0]))}</div>
        <div><b id="slot-title" style="font-family:var(--f-display);font-size:26px;display:block;line-height:1.1">${u.esc(D.byId.get(wantIds[0]).title)}</b><p id="slot-hook" style="color:var(--text-2)">${u.esc(D.byId.get(wantIds[0]).hook || "")}</p>
          <button class="btn gold" data-x="spin">${ui.icon("dice")} Крутить</button> <button class="btn ghost" data-x="open-slot">Открыть книгу</button></div></div></div>` : ""}
      ${collHTML("Хочу прочитать", wantIds, { empty: "Нажмите закладку на обложке, чтобы добавить книгу в планы.", actions: wantIds.length ? `<button class="btn small ghost" data-share="want">${ui.icon("share")} Поделиться</button>` : "" })}
      ${S.lists().map((l) => collHTML(l.name, l.books, { lid: l.id, empty: "Добавляйте книги кнопкой «В мой список» в окне книги.",
        actions: `<button class="btn small ghost" data-share="${u.esc(l.id)}">${ui.icon("share")} Поделиться</button><button class="icon-btn" data-rename="${u.esc(l.id)}" title="Переименовать" aria-label="Переименовать список">${ui.icon("edit")}</button><button class="icon-btn" data-del="${u.esc(l.id)}" title="Удалить список" aria-label="Удалить список">${ui.icon("trash")}</button>` })).join("")}
      <div style="margin:-10px 0 28px"><button class="btn" data-x="newlist">${ui.icon("plus")} Новый список</button></div>
      ${collHTML("Прочитано", readIds, { meta: (b) => (S.rating(b.id) ? "★".repeat(S.rating(b.id)) : b.authorsRu[0]), empty: "Пока ничего. Нажмите галочку на обложке, когда дочитаете книгу.", actions: readIds.length ? `<button class="btn small ghost" data-share="read">${ui.icon("share")} Поделиться</button>` : "" })}`;
    u.$$("[data-count]", root).forEach((x) => ui.countUp(x, Number(x.dataset.count)));
    requestAnimationFrame(() => requestAnimationFrame(() => { const v = u.$("#big-val", root); if (v) v.style.strokeDashoffset = v.dataset.off; }));
    ui.reveal(root);
  }

  let slotPick = null;
  function spin(btn) {
    const ids = Object.keys(S.state.want).filter((id) => D.byId.has(id));
    if (!ids.length) return;
    const slot = u.$("#slot", root);
    btn.disabled = true;
    slot.classList.add("spinning");
    let n = 0;
    const total = u.reduced() ? 1 : 16 + Math.floor(Math.random() * 6);
    const tick = () => {
      const b = D.byId.get(ids[Math.floor(Math.random() * ids.length)]);
      slot.innerHTML = ui.coverHTML(b, { eager: true });
      slotPick = b;
      if (++n < total) setTimeout(tick, 60 + n * 9);
      else {
        slot.classList.remove("spinning");
        u.$("#slot-title", root).textContent = b.title;
        u.$("#slot-hook", root).textContent = b.hook || "";
        const r = slot.getBoundingClientRect();
        ui.sparks(r.left + r.width / 2, r.top + r.height / 2);
        btn.disabled = false;
      }
    };
    tick();
  }

  function wire() {
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-x],[data-share],[data-rename],[data-del]");
      if (!t) return;
      e.stopPropagation();
      const x = t.dataset.x;
      if (x === "export") S.exportFile();
      else if (x === "import") A.app.importFile();
      else if (x === "quiz") A.modal.quiz();
      else if (x === "spin") spin(t);
      else if (x === "open-slot") { if (slotPick) A.app.openBook(slotPick.id, u.$("#slot", root)); }
      else if (x === "newlist") { const name = window.prompt("Название нового списка:", "Мой список"); if (name && name.trim()) { S.createList(name.trim()); ui.toast(`Список «${name.trim()}» создан`); } }
      else if (x === "save-shared") {
        if (!shared) return;
        // Сначала убираем панель, потом создаём список: создание сразу перерисует страницу
        const data = shared;
        shared = null;
        history.replaceState(null, "", "#/mine");
        A.app.baseHash = "#/mine";
        const ids = data.b.map((n) => D.byN.get(String(n))?.id).filter(Boolean);
        S.createList(String(data.n || "Присланный список"), ids);
        ui.toast("Список сохранён");
      } else if (x === "close-shared") { shared = null; history.replaceState(null, "", "#/mine"); draw(); }
      else if (t.dataset.share) {
        const k = t.dataset.share;
        const ids = k === "want" ? Object.keys(S.state.want) : k === "read" ? Object.keys(S.state.read) : S.list(k)?.books || [];
        const name = k === "want" ? "Хочу прочитать" : k === "read" ? "Прочитано" : S.list(k)?.name;
        copy(shareLink(name, ids));
      } else if (t.dataset.rename) {
        const l = S.list(t.dataset.rename);
        const name = window.prompt("Новое название:", l?.name || "");
        if (name && name.trim()) S.renameList(l.id, name.trim());
      } else if (t.dataset.del) {
        const l = S.list(t.dataset.del);
        if (l && window.confirm(`Удалить список «${l.name}»? Книги останутся в каталоге.`)) S.deleteList(l.id);
      }
    }, true);
  }

  function render(el) {
    root = el;
    wire();
    draw();
    unsub = S.on((ch) => { if (["lists", "import", "read", "want", "rating"].includes(ch.type) && !A.modal.isOpen()) draw(); });
  }

  A.views = A.views || {};
  A.views.mine = {
    title: "Мои книги",
    render,
    refresh() { if (root) draw(); },
    destroy() { unsub?.(); unsub = null; },
    showShared(payload) {
      const data = u.decode(payload);
      if (!data || !Array.isArray(data.b)) { ui.toast("Ссылка на список повреждена"); return; }
      shared = data;
      if (root) draw();
    }
  };
})(window.App);
