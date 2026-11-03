/* Библиотека: сетка обложек, корешки на полке, список. Сортировки, группировки, фильтры. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  const ARRAY_KEYS = ["setting", "era", "fac", "tag", "rec", "ru", "fmt", "seg"];
  let st = null;          // состояние фильтров
  let root = null;
  let userGroup = false;  // пользователь сам выбрал группировку
  let unsub = null;

  // Допустимые значения фильтров: всё из адреса сверяется со справочниками
  const has = (obj, k) => obj != null && Object.prototype.hasOwnProperty.call(obj, k);
  const ALLOWED = {
    setting: (v) => has(D.settings, v), era: (v) => has(D.eras, v), fac: (v) => has(D.factions, v), tag: (v) => has(D.tags, v),
    rec: (v) => [1, 2, 3].includes(v), ru: (v) => ["official", "fan", "none"].includes(v), fmt: (v) => has(D.formats, v), seg: (v) => has(D.segmenta, v)
  };
  const VIEWS = ["grid", "spines", "list"];
  // На узком экране фильтры — выезжающая шторка. Закрытая шторка недоступна для клавиатуры (inert).
  const SHEET = window.matchMedia("(max-width: 980px)");
  function syncSheet() {
    const f = root && u.$(".filters", root);
    if (f) f.inert = SHEET.matches && !f.classList.contains("open");
  }
  SHEET.addEventListener?.("change", syncSheet);

  function fromParams(p) {
    const s = JSON.parse(JSON.stringify(D.DEFAULT_LIB));
    ARRAY_KEYS.forEach((k) => {
      const v = p.get(k);
      if (v) s[k] = [...new Set(v.split(",").filter(Boolean).map((x) => (k === "rec" ? Number(x) : x)))].filter(ALLOWED[k]);
    });
    if (p.get("q")) s.q = p.get("q").slice(0, 100);
    if (["read", "unread", "want"].includes(p.get("status"))) s.status = p.get("status");
    if (p.get("author") && D.authorMap.has(p.get("author"))) s.author = p.get("author");
    if (p.get("series") && has(D.series, p.get("series"))) s.series = p.get("series");
    if (p.get("entry")) s.entry = true;
    const year = (x) => { const n = Number(x); return Number.isInteger(n) && n >= D.YEAR_MIN && n <= D.YEAR_MAX ? n : null; };
    s.y1 = year(p.get("y1"));
    s.y2 = year(p.get("y2"));
    if (has(D.sortById, p.get("sort"))) s.sort = p.get("sort");
    if (p.get("dir") === "-1") s.dir = -1;
    if (has(D.groupById, p.get("group"))) { s.group = p.get("group"); userGroup = true; }
    const view = p.get("view") || S.pref("libView", "grid");
    s.view = VIEWS.includes(view) ? view : "grid";
    return s;
  }
  function toHash(s) {
    const p = new URLSearchParams();
    ARRAY_KEYS.forEach((k) => s[k].length && p.set(k, s[k].join(",")));
    ["q", "status", "author", "series"].forEach((k) => s[k] && p.set(k, s[k]));
    if (s.entry) p.set("entry", "1");
    if (s.y1) p.set("y1", s.y1);
    if (s.y2) p.set("y2", s.y2);
    if (s.sort !== "rec") p.set("sort", s.sort);
    if (s.dir === -1) p.set("dir", "-1");
    if (s.group !== "none") p.set("group", s.group);
    if (s.view !== "grid") p.set("view", s.view);
    const qs = p.toString();
    return "#/" + (qs ? "?" + qs : "");
  }
  const activeCount = (s) => ARRAY_KEYS.reduce((n, k) => n + s[k].length, 0) + (s.entry ? 1 : 0) + (s.status ? 1 : 0) + (s.author ? 1 : 0) + (s.series ? 1 : 0) + (s.y1 ? 1 : 0) + (s.y2 ? 1 : 0);

  // Количество книг по значению (по всему каталогу — чтобы цифры не прыгали)
  const countBy = (fn) => D.BOOKS.reduce((m, b) => { [].concat(fn(b)).forEach((k) => (m[k] = (m[k] || 0) + 1)); return m; }, {});
  let COUNTS = null;
  function counts() {
    if (COUNTS) return COUNTS;
    const facAll = {};
    D.BOOKS.forEach((b) => {
      const set = new Set();
      b.factions.forEach((f) => { let x = D.factions[f]; while (x) { set.add(x.id); x = x.parent ? D.factions[x.parent] : null; } });
      set.forEach((f) => (facAll[f] = (facAll[f] || 0) + 1));
    });
    COUNTS = {
      setting: countBy((b) => b.setting), era: countBy((b) => b.era), fac: facAll, tag: countBy((b) => b.tags),
      rec: countBy((b) => b.rec), ru: countBy((b) => b.ru || "none"), fmt: countBy((b) => b.format), seg: countBy((b) => b.segmentum)
    };
    return COUNTS;
  }

  // ----------------------------------------------------------- Разметка
  function chip(key, val, label, n, color, sub) {
    const on = key === "entry" ? st.entry : key === "status" ? st.status === val : st[key].includes(val);
    return `<button class="chip${sub ? " sub" : ""}${on ? " on" : ""}" data-f="${key}" data-v="${val}"${color ? ` style="--c:${color}"` : ""}>${color ? '<span class="dot"></span>' : ""}${u.esc(label)}${n != null ? ` <span class="n">${n}</span>` : ""}</button>`;
  }

  function filtersHTML() {
    const c = counts();
    const F = D.META.factions;
    const facBlock = D.META.groups.map((g) => {
      const tops = F.filter((f) => f.group === g.id && !f.parent && c.fac[f.id]);
      return `<div class="ftitle">${u.esc(g.name)}</div><div class="fchips">${tops.map((f) => {
        const kids = (D.children[f.id] || []).filter((k) => c.fac[k]);
        const sub = kids.map((k) => {
          const kk = D.factions[k];
          const grand = (D.children[k] || []).filter((x) => c.fac[x]);
          return chip("fac", k, kk.name, c.fac[k], kk.color, true) + (grand.length ? `<div class="fsub" style="flex-basis:100%">${grand.map((x) => chip("fac", x, D.factions[x].name, c.fac[x], D.factions[x].color, true)).join("")}</div>` : "");
        }).join("");
        return chip("fac", f.id, f.name, c.fac[f.id], f.color) + (sub ? `<div class="fsub" style="flex-basis:100%">${sub}</div>` : "");
      }).join("")}</div>`;
    }).join("");

    return `
      <div class="filters-head"><b>Фильтры</b><button class="icon-btn" data-x="close-filters" aria-label="Закрыть">${ui.icon("x")}</button></div>
      <div class="fgroup"><h4>Мир</h4><div class="fchips">${D.META.settings.map((s) => chip("setting", s.id, s.short === "30K" ? "Ересь Хоруса" : "40K", c.setting[s.id], s.color)).join("")}</div></div>
      <div class="fgroup"><h4>С чего начать</h4><div class="fchips">
        ${D.META.recs.map((r) => chip("rec", r.id, r.name, c.rec[r.id])).join("")}
        ${chip("entry", "1", "Можно начинать с неё", D.BOOKS.filter((b) => b.entry).length)}
      </div></div>
      <div class="fgroup"><h4>Эпоха <button data-clear="era">сбросить</button></h4><div class="fchips">${D.META.eras.filter((e) => c.era[e.id]).map((e) => chip("era", e.id, e.name, c.era[e.id])).join("")}</div></div>
      <div class="fgroup"><h4>Фракции <button data-clear="fac">сбросить</button></h4>${facBlock}</div>
      <div class="fgroup"><h4>Темы <button data-clear="tag">сбросить</button></h4><div class="fchips">${D.META.tags.filter((t) => c.tag[t.id]).map((t) => chip("tag", t.id, t.name, c.tag[t.id])).join("")}</div></div>
      <div class="fgroup"><h4>Место в галактике</h4><div class="fchips">${D.META.segmenta.filter((s) => c.seg[s.id]).map((s) => chip("seg", s.id, s.name.replace("Сегментум ", ""), c.seg[s.id])).join("")}</div></div>
      <div class="fgroup"><h4>Перевод</h4><div class="fchips">${chip("ru", "official", "Официальный", c.ru.official)}${chip("ru", "fan", "Фанатский", c.ru.fan)}${chip("ru", "none", "Нет перевода", c.ru.none)}</div></div>
      <div class="fgroup"><h4>Формат</h4><div class="fchips">${D.META.formats.filter((f) => c.fmt[f.id]).map((f) => chip("fmt", f.id, f.name, c.fmt[f.id])).join("")}</div></div>
      <div class="fgroup"><h4>Мои отметки</h4><div class="fchips">${chip("status", "unread", "Не прочитанные")}${chip("status", "read", "Прочитанные")}${chip("status", "want", "Хочу прочитать")}</div></div>
      <div class="fgroup"><h4>Год выхода</h4><div class="range-row">с <input type="number" data-y="y1" min="${D.YEAR_MIN}" max="${D.YEAR_MAX}" placeholder="${D.YEAR_MIN}" value="${st.y1 || ""}"> по <input type="number" data-y="y2" min="${D.YEAR_MIN}" max="${D.YEAR_MAX}" placeholder="${D.YEAR_MAX}" value="${st.y2 || ""}"></div></div>
      <div class="fgroup"><button class="btn small ghost" data-x="reset" style="width:100%">Сбросить все фильтры</button>
        <button class="btn small gold filters-toggle" data-x="close-filters" style="width:100%;margin-top:8px">Показать книги</button></div>`;
  }

  function heroHTML() {
    const n = D.BOOKS.length;
    const seriesN = Object.keys(D.seriesBooks).length;
    const classics = D.BOOKS.filter((b) => b.rec === 1).length;
    const read = S.counts().read;
    return `<section class="hero" data-reveal>
      <div>
        <h1><em data-count="${n}">${n}</em> ${u.plural(n, "книга", "книги", "книг")}<br>о сорок первом тысячелетии</h1>
        <p>Warhammer 40,000 и Ересь Хоруса на одной карте. Сортируйте по хронологии мира, году выхода или оценкам читателей. Отмечайте прочитанное и собирайте свои списки.</p>
        <div class="hero-actions">
          <button class="btn gold" data-x="quiz">${ui.icon("spark")} Подобрать книгу</button>
          <button class="btn" data-x="random">${ui.icon("dice")} Случайная книга</button>
          <a class="btn ghost" href="#/paths">${ui.icon("route")} С чего начать</a>
        </div>
      </div>
      <div class="stats">
        <div class="stat framed"><b data-count="${seriesN}">0</b><span>серий</span></div>
        <div class="stat framed"><b data-count="${D.AUTHORS.length}">0</b><span>авторов</span></div>
        <div class="stat framed"><b data-count="${classics}">0</b><span>книг-классики</span></div>
        <div class="stat framed"><b data-count="${read}">0</b><span>${read ? "прочитано вами" : "прочитано вами — отметьте первую"}</span></div>
      </div>
    </section>`;
  }

  function toolbarHTML() {
    const views = [["grid", "Обложки", "grid"], ["spines", "Корешки", "spines"], ["list", "Список", "list"]];
    return `<div class="toolbar">
      <div class="toolbar-row">
        <div class="search-wrap">${ui.icon("search")}<input class="input" id="lib-q" type="search" placeholder="Название, автор, герой, планета…" value="${u.esc(st.q)}" autocomplete="off" aria-label="Поиск по книгам"></div>
        <select class="select" data-x="group" aria-label="Группировать">${D.GROUPS.map((g) => `<option value="${g.id}"${st.group === g.id ? " selected" : ""}>${g.id === "none" ? "Без групп" : "Группы: " + g.name.toLowerCase()}</option>`).join("")}</select>
        <div class="tabs" role="group" aria-label="Вид">${views.map(([id, name, ic]) => `<button data-view="${id}" class="${st.view === id ? "on" : ""}" title="${name}" aria-label="${name}">${ui.icon(ic)}</button>`).join("")}</div>
        <button class="btn small filters-toggle" data-x="open-filters">${ui.icon("filter")} Фильтры <span class="n" id="f-count"></span></button>
        <div class="result-count" id="res-count"></div>
      </div>
      <div class="toolbar-row">
        <span class="label">Сортировка</span>
        <div class="sort-chips">${D.SORTS.map((s) => `<button class="chip${st.sort === s.id ? " on" : ""}" data-sort="${s.id}" title="${u.esc(s.hint || "")}">${s.name}</button>`).join("")}</div>
        <button class="icon-btn dir-btn${st.dir === -1 ? " desc" : ""}" data-x="dir" title="Обратный порядок" aria-label="Обратный порядок">${ui.icon("sort")}</button>
        <button class="icon-btn" data-x="share" title="Скопировать ссылку на эту подборку" aria-label="Скопировать ссылку на подборку">${ui.icon("share")}</button>
      </div>
    </div>`;
  }

  function activeHTML() {
    const out = [];
    const lab = {
      setting: (v) => (v === "hh" ? "Ересь Хоруса" : "40K"), era: (v) => D.eras[v]?.name, fac: (v) => D.factions[v]?.name, tag: (v) => D.tags[v]?.name,
      rec: (v) => D.META.recs[v - 1]?.name, ru: (v) => ({ official: "Официальный перевод", fan: "Фанатский перевод", none: "Без перевода" })[v],
      fmt: (v) => D.formats[v]?.name, seg: (v) => D.segmenta[v]?.name
    };
    ARRAY_KEYS.forEach((k) => st[k].forEach((v) => out.push(`<button class="chip on" data-rm="${k}" data-v="${u.esc(v)}">${u.esc(lab[k](v))}</button>`)));
    if (st.entry) out.push(`<button class="chip on" data-rm="entry">Можно начинать</button>`);
    if (st.status) out.push(`<button class="chip on" data-rm="status">${{ read: "Прочитанные", unread: "Не прочитанные", want: "Хочу прочитать" }[st.status]}</button>`);
    if (st.author) out.push(`<button class="chip on" data-rm="author">Автор: ${u.esc(D.AUTH[st.author] || st.author)}</button>`);
    if (st.series) out.push(`<button class="chip on" data-rm="series">Серия: ${u.esc(D.series[st.series]?.name || st.series)}</button>`);
    if (st.y1 || st.y2) out.push(`<button class="chip on" data-rm="years">Годы: ${st.y1 || D.YEAR_MIN}–${st.y2 || D.YEAR_MAX}</button>`);
    if (st.q) out.push(`<button class="chip on" data-rm="q">«${u.esc(st.q)}»</button>`);
    if (out.length > 1) out.push(`<button class="chip" data-x="reset">Сбросить всё</button>`);
    return out.join("");
  }

  function groupHead(g, i, total) {
    if (g.key === "all") return "";
    const read = g.books.filter((b) => S.isRead(b.id)).length;
    return `<div class="group-head" data-flip="g-${u.esc(g.key)}"><span class="gnum">${u.roman(i + 1)}</span><h3>${u.esc(g.label)}</h3>
      <span class="gmeta">${u.books(g.books.length)}${read ? ` · прочитано ${read}` : ""}</span>
      ${g.about ? `<p>${u.esc(g.about)}</p>` : ""}
      ${read ? `<div class="gbar"><i style="width:${(read / g.books.length) * 100}%"></i></div>` : ""}</div>`;
  }

  function resultsHTML(list) {
    const sort = D.sortById[st.sort];
    const groups = D.groupBooks(list, st.group);
    if (!list.length) {
      return `<div class="empty"><b>Ничего не нашлось</b>Попробуйте убрать часть фильтров.<br><br><button class="btn" data-x="reset">Сбросить фильтры</button></div>`;
    }
    if (st.view === "spines") {
      return `<div class="shelf">${groups.map((g, i) => groupHead(g, i) + g.books.map((b) => spineHTML(b)).join("") + `<div class="shelf-row-end"></div>`).join("")}</div>`;
    }
    if (st.view === "list") {
      return `<div class="rows"><div class="row rows-head"><span></span><span>Книга</span><span class="hide-m">Автор</span><span class="hide-m num">Год</span><span class="hide-m">Когда</span><span class="num">Оценка</span><span class="hide-m"></span></div>
        ${groups.map((g, i) => groupHead(g, i) + g.books.map(rowHTML).join("")).join("")}</div>`;
    }
    return `<div class="grid">${groups.map((g, i) => groupHead(g, i) + g.books.map((b) => ui.cardHTML(b, { meta: sort.meta })).join("")).join("")}</div>`;
  }

  function spineHTML(b) {
    const p = b.pages || 380;
    const w = Math.round(u.clamp(18 + p / 18, 24, 58));
    const h = Math.round(180 + (u.hash(b.id) % 50));
    return `<div class="spine${S.isRead(b.id) ? " is-read" : ""}" data-bid="${b.id}" data-flip="${b.id}" style="--c:${b.color};--w:${w}px;--h:${h}px" title="${u.esc(b.title)}" tabindex="0" role="button" aria-label="${u.esc(b.title)}">
      <span class="sp-no">${b.fac.num || (b.seriesNo ? u.roman(b.seriesNo) : "")}</span><span class="sp-title">${u.esc(b.title)}</span><span class="sp-no">${b.rec === 1 ? "✦" : ""}</span></div>`;
  }
  function rowHTML(b) {
    const read = S.isRead(b.id), want = S.isWant(b.id);
    return `<div class="row" data-bid="${b.id}" data-flip="${b.id}" tabindex="0" role="button" aria-label="${u.esc(b.title)}">${ui.coverHTML(b)}
      <div class="rt"><b>${u.esc(b.title)}</b><span>${b.titleRu ? u.esc(b.titleEn) + " · " : ""}${u.esc(b.fac.name)}</span></div>
      <span class="muted hide-m">${u.esc(b.authorsRu.join(", "))}</span>
      <span class="num hide-m">${b.year}</span>
      <span class="muted hide-m">${u.esc(b.tlLabel)}</span>
      <span class="num">${b.rating ? b.rating.toFixed(2) : "—"}</span>
      <span class="rstat hide-m">${b.rec === 1 ? '<i style="background:var(--red)" title="Классика"></i>' : ""}<i class="${read ? "read" : want ? "want" : ""}"></i></span></div>`;
  }

  // ------------------------------------------------------------ Логика
  function current() {
    return D.sortBooks(D.filterBooks(st), st.sort, st.dir);
  }

  function update(opts = {}) {
    const list = current();
    A.app.currentList = list.map((b) => b.id);
    const res = u.$("#lib-results", root);
    const draw = () => { res.innerHTML = resultsHTML(list); };
    if (opts.noFlip) draw(); else ui.flip(res, draw);
    u.$("#res-count", root).innerHTML = `<b>${list.length}</b> из ${D.BOOKS.length}`;
    u.$("#lib-active", root).innerHTML = activeHTML();
    const n = activeCount(st);
    u.$("#f-count", root).textContent = n ? `· ${n}` : "";
    // подсветка чипов
    u.$$("[data-f]", root).forEach((c) => {
      const k = c.dataset.f, v = k === "rec" ? Number(c.dataset.v) : c.dataset.v;
      c.classList.toggle("on", k === "entry" ? st.entry : k === "status" ? st.status === v : st[k].includes(v));
    });
    u.$$("[data-sort]", root).forEach((c) => c.classList.toggle("on", c.dataset.sort === st.sort));
    u.$(".dir-btn", root)?.classList.toggle("desc", st.dir === -1);
    u.$$("[data-view]", root).forEach((c) => c.classList.toggle("on", c.dataset.view === st.view));
    const sel = u.$('[data-x="group"]', root);
    if (sel) sel.value = st.group;
    A.app.setQuery(toHash(st));
  }

  function wire() {
    const search = u.$("#lib-q", root);
    const myRoot = root;
    // Если пользователь уже ушёл из библиотеки, отложенный поиск ничего не делает
    search.addEventListener("input", u.debounce(() => { if (root !== myRoot || !myRoot.isConnected) return; st.q = search.value; update(); }, 180));

    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-f],[data-sort],[data-x],[data-view],[data-rm],[data-clear]");
      if (!t) return;
      if (t.dataset.f) {
        const k = t.dataset.f, v = k === "rec" ? Number(t.dataset.v) : t.dataset.v;
        if (k === "entry") st.entry = !st.entry;
        else if (k === "status") st.status = st.status === v ? "" : v;
        else st[k] = st[k].includes(v) ? st[k].filter((x) => x !== v) : [...st[k], v];
        update();
      } else if (t.dataset.sort) {
        const s = t.dataset.sort;
        if (s === st.sort) { if (s === "random") D.reshuffle(); else st.dir = -st.dir; }
        else { st.sort = s; st.dir = 1; if (s === "random") D.reshuffle(); if (!userGroup) st.group = D.sortById[s].group || "none"; }
        update();
      } else if (t.dataset.view) {
        st.view = t.dataset.view;
        S.setPref("libView", st.view);
        update({ noFlip: true });
        u.$("#lib-results", root).classList.remove("enter"); void root.offsetWidth;
      } else if (t.dataset.rm) {
        const k = t.dataset.rm;
        if (k === "entry") st.entry = false;
        else if (k === "status" || k === "author" || k === "series" || k === "q") { st[k] = ""; if (k === "q") search.value = ""; }
        else if (k === "years") { st.y1 = st.y2 = null; u.$$("[data-y]", root).forEach((i) => (i.value = "")); }
        else st[k] = st[k].filter((x) => String(x) !== t.dataset.v);
        update();
      } else if (t.dataset.clear) {
        st[t.dataset.clear] = [];
        update();
      } else if (t.dataset.x === "dir") { st.dir = -st.dir; update(); }
      else if (t.dataset.x === "reset") {
        const keep = { sort: st.sort, dir: st.dir, group: st.group, view: st.view };
        st = Object.assign(JSON.parse(JSON.stringify(D.DEFAULT_LIB)), keep);
        search.value = "";
        u.$$("[data-y]", root).forEach((i) => (i.value = ""));
        update();
      } else if (t.dataset.x === "open-filters") {
        const f = u.$(".filters", root);
        f.classList.add("open");
        f.inert = false;
        setTimeout(() => u.$(".filters [data-f]", root)?.focus(), 60);
      } else if (t.dataset.x === "close-filters") {
        const f = u.$(".filters", root);
        f.classList.remove("open");
        f.inert = SHEET.matches;
        u.$('[data-x="open-filters"]', root)?.focus({ preventScroll: true });
      }
      else if (t.dataset.x === "share") {
        const url = location.href;
        (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => ui.toast("Ссылка на подборку скопирована"), () => window.prompt("Скопируйте ссылку:", url));
      }
      else if (t.dataset.x === "quiz") A.modal.quiz();
      else if (t.dataset.x === "random") randomBook(t);
    });
    root.addEventListener("change", (e) => {
      if (e.target.matches('[data-x="group"]')) { st.group = e.target.value; userGroup = true; update(); }
      if (e.target.matches("[data-y]")) {
        const v = Number(e.target.value) || null;
        st[e.target.dataset.y] = v ? u.clamp(v, D.YEAR_MIN, D.YEAR_MAX) : null;
        update();
      }
    });
  }

  function randomBook(btn) {
    const pool = D.filterBooks(Object.assign({}, st, { status: "unread" }));
    const list = pool.length ? pool : D.BOOKS;
    const b = list[Math.floor(Math.random() * list.length)];
    const r = btn.getBoundingClientRect();
    ui.sparks(r.left + r.width / 2, r.top + r.height / 2);
    setTimeout(() => A.app.openBook(b.id), 180);
  }

  function render(el, params) {
    root = el;
    userGroup = false;
    st = fromParams(params);
    const hasFilters = activeCount(st) > 0 || st.q;
    el.innerHTML = `${hasFilters ? "" : heroHTML()}
      ${toolbarHTML()}
      <div class="active-filters" id="lib-active"></div>
      <div class="lib">
        <aside class="filters" aria-label="Фильтры">${filtersHTML()}</aside>
        <section id="lib-results" aria-live="polite"></section>
      </div>`;
    wire();
    syncSheet();
    update({ noFlip: true });
    u.$$("[data-count]", el).forEach((x) => ui.countUp(x, Number(x.dataset.count)));
    unsub = S.on((ch) => {
      if (root !== el || !el.isConnected) return;
      if (ch.type === "import") update({ noFlip: true });
      // Фильтр по моим отметкам: после отметки книга должна уйти из выдачи или появиться в ней
      else if ((ch.type === "read" || ch.type === "want") && st.status) update();
    });
  }

  A.views = A.views || {};
  A.views.library = {
    title: "",
    render,
    update(el, params) {
      // Переход по ссылке-фильтру внутри библиотеки (например, из окна книги)
      const next = fromParams(params);
      const same = toHash(next) === toHash(st);
      if (same) return;
      st = next;
      const s = u.$("#lib-q", root); if (s) s.value = st.q;
      update();
      window.scrollTo({ top: Math.max(0, u.$(".toolbar", root).offsetTop - 80), behavior: "smooth" });
    },
    refresh() { if (root && st) update({ noFlip: true }); },
    destroy() { unsub?.(); unsub = null; }
  };
})(window.App);
