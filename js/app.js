/* Приложение: маршруты, шапка, настройки, общие обработчики. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  const NAV = [
    { id: "library", href: "#/", name: "Библиотека", short: "Книги", icon: "library" },
    { id: "timeline", href: "#/timeline", name: "Хронология", short: "Время", icon: "clock" },
    { id: "galaxy", href: "#/galaxy", name: "Галактика", short: "Карта", icon: "galaxy" },
    { id: "paths", href: "#/paths", name: "Пути чтения", short: "Пути", icon: "route" },
    { id: "overview", href: "#/overview", name: "Обзор", short: "Обзор", icon: "chart" },
    { id: "mine", href: "#/mine", name: "Мои книги", short: "Мои", icon: "user" }
  ];

  const app = {
    current: null,       // текущий раздел
    currentList: [],     // id книг в порядке текущего вида (для стрелок в окне книги)
    lastClicked: null,   // карточка, по которой кликнули (для перелёта обложки)
    baseHash: "#/",
    bookPushed: false,
    go(hash, opts = {}) {
      if (opts.replace) { history.replaceState(null, "", hash); route(); }
      else if (location.hash === hash) route();
      else location.hash = hash;
    },
    setQuery(hash) { history.replaceState(null, "", hash); app.baseHash = hash; }
  };
  A.app = app;

  function parse() {
    const h = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "library", arg: parts.slice(1).join("/"), params: new URLSearchParams(qs || "") };
  }

  function renderNav(active) {
    const links = (cls) => NAV.map((n) => `<a href="${n.href}" class="${n.id === active ? "active" : ""}" data-nav="${n.id}">${cls === "b" ? ui.icon(n.icon) : ""}<span>${cls === "b" ? n.short : n.name}</span>${n.id === "mine" ? `<span class="badge-count" id="cnt-${cls}" hidden></span>` : ""}</a>`).join("");
    u.$("#nav").innerHTML = links("t");
    u.$("#bottom-nav").innerHTML = links("b");
    updateCounts();
  }
  function setActive(active) {
    u.$$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === active));
  }
  function updateCounts(bump) {
    const n = S.counts().read;
    ["t", "b"].forEach((k) => {
      const el = document.getElementById("cnt-" + k);
      if (!el) return;
      el.hidden = !n;
      el.textContent = n;
      if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
  }

  const hasView = (name) => Object.prototype.hasOwnProperty.call(A.views, name) && typeof A.views[name].render === "function";
  let navGen = 0;

  function renderView(name, params, force) {
    if (!hasView(name)) name = "library";
    const view = A.views[name];
    // Пока идёт отложенный переход (View Transition), «тот же раздел» считаем по цели перехода
    const same = !app.pending && app.current === name && !force;
    if (same && view.update) { view.update(u.$("#view"), params); return; }
    ui.hideTip();
    const gen = ++navGen;
    app.pending = name;
    const doRender = () => {
      if (gen !== navGen) return; // переход устарел: пользователь уже ушёл дальше
      app.pending = null;
      if (app.current && A.views[app.current]?.destroy) A.views[app.current].destroy();
      ui.resetReveal();
      // Новый пустой контейнер: старые обработчики событий уходят вместе со старым элементом
      const old = u.$("#view");
      const el = old.cloneNode(false);
      old.replaceWith(el);
      el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter");
      app.current = name;
      setActive(name);
      view.render(el, params);
      ui.reveal(el);
      document.title = (view.title ? view.title + " · " : "") + "Скрипторий — карта книг 40K";
    };
    if (app.current && app.current !== name) { ui.transition(doRender); window.scrollTo({ top: 0, behavior: "instant" }); }
    else doRender();
  }

  function route() {
    const r = parse();
    if (r.name === "book") {
      if (!app.current) {
        const bookHash = location.hash;
        renderView("library", new URLSearchParams());
        history.replaceState(null, "", bookHash); // библиотека под окном переписала адрес — вернуть ссылку на книгу
      }
      const from = app.lastClicked && app.lastClicked.dataset.id === r.arg ? app.lastClicked : null;
      app.lastClicked = null;
      A.modal.book(decodeURIComponent(r.arg), { from, onClose: closeBook });
      app.inBook = true;
      return;
    }
    const wasInBook = app.inBook;
    app.inBook = false;
    if (A.modal.isOpen()) A.modal.close(!wasInBook);
    app.bookPushed = false;
    // Вернулись из окна книги на ту же страницу — не перерисовываем, только обновляем отметки
    if (wasInBook && app.current && (location.hash || "#/") === app.baseHash) { A.views[app.current]?.refresh?.(); return; }
    if (r.name === "share") { renderView("mine", r.params, true); A.views.mine.showShared(r.arg); return; }
    app.baseHash = location.hash || "#/";
    renderView(hasView(r.name) ? r.name : "library", r.params);
  }

  function closeBook() {
    if (app.bookPushed) { app.bookPushed = false; history.back(); }
    else {
      A.modal.close();
      app.inBook = false;
      history.replaceState(null, "", app.baseHash);
      if (app.current) A.views[app.current]?.refresh?.();
      else renderView("library", new URLSearchParams());
    }
  }

  // Открыть книгу из любого места
  function openBook(id, fromEl) {
    app.lastClicked = fromEl || null;
    app.bookPushed = !A.modal.isOpen();
    if (A.modal.isOpen()) app.go(`#/book/${id}`, { replace: true });
    else location.hash = `#/book/${id}`;
  }
  app.openBook = openBook;

  // ---------------------------------------------------- Общие обработчики
  function wireGlobal() {
    document.addEventListener("click", (e) => {
      const qa = e.target.closest(".qa[data-act]");
      if (qa) {
        e.stopPropagation();
        const card = qa.closest(".card");
        if (qa.dataset.act === "read") { ui.markRead(card.dataset.id, qa); ui.refreshCard(card, true); }
        else { ui.markWant(card.dataset.id, qa); ui.refreshCard(card); }
        return;
      }
      if (e.target.closest(".modal")) return;
      const card = e.target.closest(".card[data-id], [data-bid]");
      if (card && !e.target.closest("a, button:not(.card)")) {
        openBook(card.dataset.id || card.dataset.bid, card);
      }
    });
    document.addEventListener("keydown", (e) => {
      // Книгу можно открыть с клавиатуры из любого вида: карточки, корешки, строки, станции, миниатюры
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".card[data-id], [data-bid], [data-open]")) {
        e.preventDefault();
        if (e.target.closest(".modal")) { e.target.click(); return; }
        openBook(e.target.dataset.id || e.target.dataset.bid, e.target);
        return;
      }
      if (e.key === "/" && !e.target.matches?.("input, textarea") && !A.modal.isOpen()) { e.preventDefault(); focusSearch(); }
    });
    // Подсказки над точками графиков и звёздами. Перестраиваем, только когда сменилась книга.
    let tipBid = null;
    document.addEventListener("pointermove", (e) => {
      const t = e.target.closest?.("[data-bid]");
      if (!t || t.closest(".modal")) { if (tipBid) { ui.hideTip(); tipBid = null; } return; }
      if (t.dataset.bid === tipBid) { ui.tipMove(e.clientX, e.clientY); return; }
      const b = D.byId.get(t.dataset.bid);
      if (b) { tipBid = b.id; ui.tip(ui.bookTip(b), e.clientX, e.clientY); }
    }, { passive: true });
    document.addEventListener("scroll", () => { ui.hideTip(); tipBid = null; }, { passive: true });
    window.addEventListener("scriptorium:storage-failed", () =>
      ui.toast("Браузер не даёт сохранять отметки. Они пропадут после перезагрузки. Сохраните их файлом в «Моих книгах».", 7000));

    S.on((ch) => { if (ch.type === "read" || ch.type === "import") updateCounts(ch.on); });
  }

  function focusSearch() {
    if (app.current !== "library") app.go("#/");
    setTimeout(() => { const i = u.$("#lib-q"); i?.focus(); i?.scrollIntoView({ block: "center", behavior: "smooth" }); }, 80);
  }

  // ---------------------------------------------------------- Настройки
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    u.$("#btn-theme").innerHTML = ui.icon(t === "light" ? "moon" : "sun");
    document.querySelector('meta[name="theme-color"]').content = t === "light" ? "#efe6d1" : "#0d0b09";
  }
  function toggleSettings() {
    const ex = u.$(".popover");
    if (ex) { ex.remove(); return; }
    const mode = D.coverMode();
    const pop = document.createElement("div");
    pop.className = "popover";
    pop.innerHTML = `
      <h5>Тема</h5>
      <div class="tabs"><button data-theme="dark" class="${S.pref("theme", "dark") === "dark" ? "on" : ""}">Ночь</button><button data-theme="light" class="${S.pref("theme", "dark") === "light" ? "on" : ""}">Пергамент</button></div>
      <h5 style="margin-top:14px">Обложки</h5>
      ${D.CONFIG.realCovers ? `<div class="tabs"><button data-covers="ru" class="${mode === "ru" ? "on" : ""}">Русские</button><button data-covers="en" class="${mode === "en" ? "on" : ""}">Оригинал</button><button data-covers="off" class="${mode === "off" ? "on" : ""}">Свои</button></div>
      <p>«Свои» — обложки, нарисованные сайтом. Работают без интернета.</p>` : `<p>Настоящие обложки отключены на этом сайте.</p>`}
      <h5 style="margin-top:14px">Мои отметки</h5>
      <div style="display:flex;gap:6px"><button class="btn small" data-x="export">${ui.icon("download")} Сохранить</button><button class="btn small" data-x="import">${ui.icon("upload")} Загрузить</button></div>
      <p>Отметки хранятся в этом браузере. Сохраните файл, чтобы перенести их на другое устройство.</p>`;
    document.body.appendChild(pop);
    pop.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.theme) { S.setPref("theme", t.dataset.theme); applyTheme(t.dataset.theme); pop.querySelectorAll("[data-theme]").forEach((b) => b.classList.toggle("on", b === t)); }
      if (t.dataset.covers) { S.setPref("covers", t.dataset.covers); pop.querySelectorAll("[data-covers]").forEach((b) => b.classList.toggle("on", b === t)); renderView(app.current, parse().params, true); }
      if (t.dataset.x === "export") S.exportFile();
      if (t.dataset.x === "import") importFile();
    });
    setTimeout(() => document.addEventListener("click", function off(e) {
      if (!pop.contains(e.target) && e.target.closest("#btn-settings") === null) { pop.remove(); document.removeEventListener("click", off); }
    }), 0);
  }
  function importFile() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        S.importData(data);
        ui.toast("Отметки загружены");
        renderView(app.current, parse().params, true);
      } catch { ui.toast("Не получилось прочитать файл"); }
    };
    inp.click();
  }
  app.importFile = importFile;

  // ------------------------------------------------------------- Запуск
  function init() {
    u.$("#brand-sigil").innerHTML = ui.SIGIL;
    u.$("#btn-search").innerHTML = ui.icon("search");
    u.$("#btn-settings").innerHTML = ui.icon("gear");
    applyTheme(S.pref("theme", document.documentElement.dataset.theme || "dark"));
    u.$("#btn-theme").addEventListener("click", () => { const t = document.documentElement.dataset.theme === "light" ? "dark" : "light"; S.setPref("theme", t); applyTheme(t); });
    u.$("#btn-settings").addEventListener("click", toggleSettings);
    u.$("#btn-search").addEventListener("click", focusSearch);
    if (window.DATA_BUILT) u.$("#data-built").textContent = `Данные обновлены ${window.DATA_BUILT.split("-").reverse().join(".")}.`;
    renderNav("library");
    wireGlobal();
    ui.initDust();
    ui.initTilt();
    window.addEventListener("hashchange", route);
    route();
  }
  A.views = A.views || {};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window.App);
