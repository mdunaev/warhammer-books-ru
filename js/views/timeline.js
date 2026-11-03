/* Хронология: река времени, годы выхода, «написано и происходит». */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  const ERA_COLORS = ["#6b5a3a", "#9a7a2a", "#a3402a", "#8a2a1f", "#3f6a6a", "#6a6a3a", "#2f5a8a"];
  let root, mode = "river", side = "all", io = null;

  function tlFmt(tl) {
    const m = Math.floor(tl / 1000) + 1, y = tl % 1000;
    return `${String(y).padStart(3, "0")}.M${m}`;
  }

  function filtered() {
    return D.BOOKS.filter((b) => side === "all" || b.group === side);
  }

  function controls() {
    const sides = [["all", "Все"], ["imperium", "Империум"], ["chaos", "Хаос"], ["xenos", "Чужие"]];
    return `<div class="chart-controls">
      <div class="tabs" role="tablist">${[["river", "Река времени"], ["years", "Годы выхода"], ["links", "Написано и происходит"]].map(([id, n]) => `<button data-mode="${id}" class="${mode === id ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="fchips" style="margin-left:auto">${sides.map(([id, n]) => `<button class="chip${side === id ? " on" : ""}" data-side="${id}" ${id !== "all" ? `style="--c:${D.GROUP_HEX[id]}"` : ""}>${id !== "all" ? '<span class="dot"></span>' : ""}${n}</button>`).join("")}</div>
    </div>`;
  }

  // ------------------------------------------------------- Река времени
  function riverHTML(list) {
    const byEra = D.META.eras.map((e, i) => ({ e, i, books: list.filter((b) => b.era === e.id).sort((a, b) => a.tl - b.tl || (a.series === b.series ? (a.seriesNo ?? 0) - (b.seriesNo ?? 0) : a.year - b.year)) }))
      .filter((x) => x.books.length);
    const map = `<div class="era-map" role="navigation" aria-label="Эпохи">${byEra.map((x) => `<button data-era="${x.e.id}" style="--c:${ERA_COLORS[x.i]};flex:${Math.max(1, Math.sqrt(x.books.length))}"><b>${u.esc(x.e.name)}</b><span>${u.books(x.books.length)}</span></button>`).join("")}</div>`;
    let k = 0;
    const blocks = byEra.map((x) => `<section class="era-block" id="era-${x.e.id}" style="--c:${ERA_COLORS[x.i]}">
        <div class="era-title" data-reveal><div class="rn">ЭПОХА ${u.roman(x.i + 1)}</div><h3>${u.esc(x.e.name)}</h3><div class="range">${u.esc(x.e.range)} · ${u.books(x.books.length)}</div><p>${u.esc(x.e.about)}</p></div>
        ${x.books.map((b) => {
          const side = k++ % 2 ? "r" : "l";
          return `<article class="r-item ${side}${S.isRead(b.id) ? " is-read" : ""}" data-bid="${b.id}" style="--c:${b.color}" data-reveal tabindex="0" role="button" aria-label="${u.esc(b.title)}, ${u.esc(b.tlLabel)}">
            ${ui.coverHTML(b)}
            <div><div class="date">${u.esc(b.tlLabel)}${b.tlApprox ? "<i>примерно</i>" : ""}</div>
            <h4>${u.esc(b.title)}</h4><p>${u.esc(b.hook || b.authorsRu.join(", "))}</p>
            <div class="place">${ui.icon("pin")}${u.esc(b.place)} · ${u.esc(b.authorsRu[0])}, ${b.year}</div></div>
          </article>`;
        }).join("")}
      </section>`).join("");
    return map + `<div class="river">${blocks}</div>`;
  }

  function wireRiver() {
    const btns = u.$$(".era-map button", root);
    btns.forEach((b) => b.addEventListener("click", () => {
      const sec = document.getElementById("era-" + b.dataset.era);
      sec?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    io?.disconnect();
    if (!("IntersectionObserver" in window)) return;
    io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id.replace("era-", "");
        btns.forEach((b) => b.classList.toggle("on", b.dataset.era === id));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    u.$$(".era-block", root).forEach((s) => io.observe(s));
  }

  // -------------------------------------------------------- Годы выхода
  let colorBy = "group";
  function colorOf(b) {
    if (colorBy === "setting") return D.settings[b.setting].color;
    if (colorBy === "ru") return b.ru === "official" ? "#c9a25a" : b.ru === "fan" ? "#7f9fbf" : "#5a5248";
    return b.groupColor;
  }
  function legend() {
    if (colorBy === "setting") return D.META.settings.map((s) => `<span style="--c:${s.color}"><i></i>${s.name}</span>`).join("");
    if (colorBy === "ru") return `<span style="--c:#c9a25a"><i></i>Официальный перевод</span><span style="--c:#7f9fbf"><i></i>Фанатский</span><span style="--c:#5a5248"><i></i>Нет перевода</span>`;
    return D.META.groups.map((g) => `<span style="--c:${D.GROUP_HEX[g.id]}"><i></i>${g.name}</span>`).join("");
  }
  const MILESTONES = [
    ["first-only", "Начало «Призраков Гаунта»"], ["xenos", "Первая книга «Эйзенхорна»"], ["horus-rising", "Старт «Ереси Хоруса»"],
    ["dark-imperium", "Эра Индомитус"], ["the-solar-war", "Начало «Осады Терры»"], ["the-end-and-the-death-volume-i", "Финал Ереси"]
  ];
  function yearsHTML(list) {
    const ids = new Set(list.map((b) => b.id));
    const years = [];
    for (let y = D.YEAR_MIN; y <= D.YEAR_MAX; y++) years.push(y);
    const byYear = Object.fromEntries(years.map((y) => [y, []]));
    D.BOOKS.forEach((b) => byYear[b.year]?.push(b));
    const order = { imperium: 0, chaos: 1, xenos: 2 };
    let n = 0;
    const cols = years.map((y) => {
      const arr = byYear[y].sort((a, b) => order[a.group] - order[b.group] || a.tl - b.tl);
      const inN = arr.filter((b) => ids.has(b.id)).length;
      const ms = MILESTONES.find(([id]) => D.byId.get(id)?.year === y);
      return `<div class="ycol" title="${y}">
        ${arr.map((b) => `<div class="blk${ids.has(b.id) ? "" : " out"}${S.isRead(b.id) ? " read" : ""}" data-bid="${b.id}" style="--c:${colorOf(b)};animation-delay:${Math.min(n++ * 4, 900)}ms"></div>`).join("")}
        <div class="ycnt"${ms ? ' style="color:var(--gold-2)" title="' + u.esc(ms[1]) + '"' : ""}>${ms ? "✦ " : ""}${inN || ""}</div>
        <div class="ylab"${ms ? ' style="color:var(--gold-2)"' : ""}>${y % 5 === 0 || ms ? y : "’" + String(y).slice(2)}</div>
      </div>`;
    }).join("");
    const msList = MILESTONES.map(([id, t]) => { const b = D.byId.get(id); return b ? `<span><b style="color:var(--gold-2)">✦ ${b.year}</b> — ${t}</span>` : ""; }).join("");
    const peak = years.reduce((m, y) => (byYear[y].length > byYear[m].length ? y : m), years[0]);
    return `<div class="chart-card" data-reveal>
      <h3>Сколько книг выходило каждый год</h3>
      <p>Каждый кирпичик — одна книга из каталога. Наведите, чтобы увидеть название, нажмите, чтобы открыть. Больше всего книг вышло в ${peak} году — ${u.books(byYear[peak].length)}.</p>
      <div class="chart-controls"><span style="font-size:13px;color:var(--text-3)">Цвет:</span><div class="tabs">${[["group", "Сторона"], ["setting", "Мир"], ["ru", "Перевод"]].map(([id, nm]) => `<button data-colorby="${id}" class="${colorBy === id ? "on" : ""}">${nm}</button>`).join("")}</div></div>
      <div class="chart-scroll"><div class="years">${cols}</div><div class="years-axis"></div></div>
      <div class="legend">${legend()}</div>
      <div class="legend" style="margin-top:14px;flex-direction:column;gap:4px">${msList}</div>
    </div>`;
  }

  // ------------------------------------------- Написано и происходит
  function linksHTML(list) {
    const W = 1000, H = 520, top = 60, bot = H - 70, padX = 30;
    const x1 = (y) => padX + ((y - D.YEAR_MIN) / Math.max(1, D.YEAR_MAX - D.YEAR_MIN)) * (W - padX * 2);
    // Нижняя ось: эпохи шириной по числу книг, внутри — по порядку событий
    const all = D.BOOKS.slice().sort((a, b) => a.tl - b.tl);
    const eraCounts = D.META.eras.map((e) => all.filter((b) => b.era === e.id).length);
    const total = eraCounts.reduce((s, c) => s + Math.max(c, 0), 0) || 1;
    const eraX = [];
    let acc = padX;
    D.META.eras.forEach((e, i) => {
      const w = eraCounts[i] ? Math.max(40, (eraCounts[i] / total) * (W - padX * 2 - 40 * D.META.eras.length) + 40) : 0;
      eraX.push({ e, i, x: acc, w });
      acc += w;
    });
    const scale = (W - padX) / acc;
    eraX.forEach((r) => { r.x *= scale; r.w *= scale; });
    const pos = new Map();
    eraX.forEach((r) => {
      const inEra = all.filter((b) => b.era === r.e.id);
      inEra.forEach((b, j) => pos.set(b.id, r.x + ((j + 0.5) / inEra.length) * r.w));
    });
    const ids = new Set(list.map((b) => b.id));
    let n = 0;
    const paths = all.filter((b) => ids.has(b.id)).map((b) => {
      const xa = x1(b.year) + ((u.hash(b.id) % 9) - 4), xb = pos.get(b.id);
      return `<path class="link-path" data-bid="${b.id}" pathLength="1" style="--d:${Math.min(n++ * 4, 1200)}ms" stroke="${b.groupColor}" d="M${xa.toFixed(1)},${top} C${xa.toFixed(1)},${(top + bot) / 2} ${xb.toFixed(1)},${(top + bot) / 2} ${xb.toFixed(1)},${bot}"/>`;
    }).join("");
    const yTicks = [];
    for (let y = Math.ceil(D.YEAR_MIN / 5) * 5; y <= D.YEAR_MAX; y += 5) yTicks.push(y);
    return `<div class="chart-card" data-reveal>
      <h3>Когда написано — и когда происходит</h3>
      <p>Сверху — год выхода книги. Снизу — эпоха, в которой идёт действие. Видно, как авторы годами возвращаются в прошлое вселенной: Ересь Хоруса пишут с 2006 года, а события там на десять тысяч лет раньше «основного» сорокового тысячелетия.</p>
      <div class="chart-scroll"><svg class="svg-chart" id="links-svg" viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Связь года выхода и эпохи действия">
        <text class="axis-title" x="${padX}" y="18">Год выхода</text>
        <line x1="${padX}" x2="${W - padX}" y1="${top}" y2="${top}" stroke="var(--line-2)"/>
        ${yTicks.map((y) => `<g><line x1="${x1(y)}" x2="${x1(y)}" y1="${top - 6}" y2="${top}" stroke="var(--line-3)"/><text x="${x1(y)}" y="${top - 12}" text-anchor="middle">${y}</text></g>`).join("")}
        <g>${paths}</g>
        ${eraX.filter((r) => r.w).map((r, k) => `<g><rect x="${r.x + 1}" y="${bot}" width="${r.w - 2}" height="8" fill="${ERA_COLORS[r.i]}" rx="2"/><text x="${r.x + r.w / 2}" y="${bot + (r.w < 110 && k % 2 ? 40 : 24)}" text-anchor="middle" style="font-size:${r.w < 90 ? 10.5 : 12}px">${u.esc(r.w < 60 ? r.e.name.split(" ")[0] : r.e.name)}</text></g>`).join("")}
        <text class="axis-title" x="${padX}" y="${H - 8}">Эпоха действия</text>
      </svg></div>
      <div class="legend">${D.META.groups.map((g) => `<span style="--c:${D.GROUP_HEX[g.id]}"><i></i>${g.name}</span>`).join("")}</div>
    </div>`;
  }
  function wireLinks() {
    const svg = u.$("#links-svg", root);
    if (!svg) return;
    svg.addEventListener("pointerover", (e) => {
      const p = e.target.closest(".link-path");
      if (!p) return;
      svg.classList.add("hovering");
      u.$$(".link-path.hl", svg).forEach((x) => x.classList.remove("hl"));
      p.classList.add("hl");
      p.parentNode.appendChild(p);
    });
    svg.addEventListener("pointerleave", () => { svg.classList.remove("hovering"); u.$$(".link-path.hl", svg).forEach((x) => x.classList.remove("hl")); });
  }

  // ------------------------------------------------------------ Сборка
  function draw() {
    const list = filtered();
    A.app.currentList = list.slice().sort((a, b) => a.tl - b.tl).map((b) => b.id);
    const body = u.$("#tl-body", root);
    body.innerHTML = mode === "river" ? riverHTML(list) : mode === "years" ? yearsHTML(list) : linksHTML(list);
    if (mode === "river") wireRiver();
    if (mode === "links") wireLinks();
    ui.reveal(body);
  }

  function render(el, params) {
    root = el;
    mode = params.get("mode") || mode;
    el.innerHTML = `<div class="page-head"><h1 class="page-title"><small>Десять тысяч лет истории</small>Хронология</h1>
      <p class="page-lead">Где каждая книга стоит во времени вселенной — и когда она вышла у нас.</p></div>
      <div id="tl-controls">${controls()}</div><div id="tl-body"></div>`;
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-mode],[data-side],[data-colorby]");
      if (!t) return;
      if (t.dataset.mode) { mode = t.dataset.mode; A.app.setQuery(`#/timeline?mode=${mode}`); }
      if (t.dataset.side) side = t.dataset.side;
      if (t.dataset.colorby) colorBy = t.dataset.colorby;
      u.$("#tl-controls", root).innerHTML = controls();
      ui.transition(draw);
    });
    draw();
  }

  A.views = A.views || {};
  A.views.timeline = {
    title: "Хронология",
    render,
    // После отметок в окне книги — обновить признак «прочитано»
    refresh() {
      if (!root?.isConnected) return;
      u.$$(".r-item[data-bid]", root).forEach((x) => x.classList.toggle("is-read", S.isRead(x.dataset.bid)));
      u.$$(".blk[data-bid]", root).forEach((x) => x.classList.toggle("read", S.isRead(x.dataset.bid)));
    },
    destroy() { io?.disconnect(); io = null; }
  };
  A.timelineFmt = tlFmt;
  A.ERA_COLORS = ERA_COLORS;
})(window.App);
