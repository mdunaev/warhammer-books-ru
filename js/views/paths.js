/* Пути чтения: маршруты как линии метро, с прогрессом. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  let root, open = new Set();

  function ring(pct, color) {
    const r = 24, c = 2 * Math.PI * r;
    return `<div class="ring" style="--c:${color}"><svg viewBox="0 0 58 58"><circle class="track" cx="29" cy="29" r="${r}"/><circle class="val" cx="29" cy="29" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - pct)}"/></svg><b>${Math.round(pct * 100)}%</b></div>`;
  }

  // Общая схема: все пути линиями, книги — станции
  function overviewSVG() {
    const paths = D.PATHS;
    if (!paths.length) return "";
    const maxLen = Math.max(...paths.map((p) => p.books.length));
    const step = Math.max(14, Math.min(34, 760 / maxLen));
    const rad = Math.min(7, step / 2.3);
    const rowH = 34, padL = 220, W = Math.max(760, padL + maxLen * step + 30), H = paths.length * rowH + 20;
    return `<div class="chart-card" data-reveal><h3>Все пути на одной схеме</h3>
      <p>Линия — путь, кружок — книга. Закрашенные кружки вы уже прочитали. Нажмите на кружок, чтобы открыть книгу.</p>
      <div class="chart-scroll"><svg class="svg-chart" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 900)}px">
      ${paths.map((p, i) => {
        const y = 20 + i * rowH;
        const x2 = padL + (p.books.length - 1) * step;
        return `<g><text x="${padL - 16}" y="${y + 4}" text-anchor="end" style="font-size:13px;fill:var(--text)">${u.esc(p.name)}</text>
          <line x1="${padL}" x2="${x2}" y1="${y}" y2="${y}" stroke="${p.color}" stroke-width="5" stroke-linecap="round" pathLength="1" class="metro-line" style="--d:${i * 80}ms"/>
          ${p.books.map((b, j) => `<circle class="dot" data-bid="${b.id}" cx="${padL + j * step}" cy="${y}" r="${rad.toFixed(1)}" fill="${S.isRead(b.id) ? p.color : "var(--bg)"}" stroke="${p.color}" stroke-width="${rad > 5 ? 3 : 2}"/>`).join("")}</g>`;
      }).join("")}
      </svg></div></div>`;
  }

  function cardHTML(p) {
    const read = p.books.filter((b) => S.isRead(b.id)).length;
    const pct = p.books.length ? read / p.books.length : 0;
    const next = p.books.find((b) => !S.isRead(b.id));
    const show = open.has(p.id) ? p.books.length : Math.min(p.books.length, 6);
    const stepNote = (b) => p.steps.find((s) => s.id === b.id)?.note || b.hook || "";
    return `<article class="path-card" id="path-${p.id}" style="--c:${p.color}" data-reveal>
      <div class="path-head">${ring(pct, p.color)}<div><h3>${u.esc(p.name)}</h3><p>${u.esc(p.about || "")}</p>
        <p style="margin-top:6px;color:var(--text-3);font-size:13px">${u.books(p.books.length)} · прочитано ${read}${next ? "" : " · путь пройден!"}</p></div></div>
      <div class="metro">${p.books.slice(0, show).map((b, j) => `<div class="station${S.isRead(b.id) ? " read" : ""}${b === next ? " next" : ""}" data-bid="${b.id}" tabindex="0" role="button" aria-label="${j + 1}. ${u.esc(b.title)}">
          ${ui.coverHTML(b)}<div><b>${j + 1}. ${u.esc(b.title)}${b === next ? '<span class="next-tag">Следующая</span>' : ""}</b><span>${u.esc(stepNote(b))}</span></div></div>`).join("")}</div>
      ${p.books.length > 6 ? `<button class="path-more" data-more="${p.id}">${open.has(p.id) ? "Свернуть" : `Показать весь путь — ещё ${p.books.length - 6}`}</button>` : ""}
    </article>`;
  }

  function animateRings(scope) {
    requestAnimationFrame(() => requestAnimationFrame(() => u.$$(".ring .val", scope).forEach((c) => (c.style.strokeDashoffset = c.dataset.off))));
  }

  function draw(el) {
    const total = new Set(D.PATHS.flatMap((p) => p.books.map((b) => b.id))).size;
    el.innerHTML = `<div class="page-head"><h1 class="page-title"><small>Как читать</small>Пути чтения</h1>
      <p class="page-lead">${D.PATHS.length} ${u.plural(D.PATHS.length, "маршрут", "маршрута", "маршрутов")} по ${u.books(total)}. Каждый путь — порядок, в котором книги лучше всего раскрываются. Начните с «Первого шага», если вы новичок.</p></div>
      ${overviewSVG()}
      <div class="paths">${D.PATHS.map(cardHTML).join("")}</div>`;
  }

  function render(el, params) {
    root = el;
    A.app.currentList = D.PATHS.flatMap((p) => p.books.map((b) => b.id));
    draw(el);
    el.addEventListener("click", (e) => {
      const m = e.target.closest("[data-more]");
      if (!m) return;
      const id = m.dataset.more;
      open.has(id) ? open.delete(id) : open.add(id);
      const p = D.PATHS.find((x) => x.id === id);
      const card = u.$(`#path-${CSS.escape(id)}`, el);
      card.outerHTML = cardHTML(p);
      const fresh = u.$(`#path-${CSS.escape(id)}`, el);
      fresh.classList.add("in");
      animateRings(fresh);
    });
    animateRings(el);
    const focus = params.get("p");
    if (focus) setTimeout(() => {
      const c = document.getElementById("path-" + focus);
      if (c) { c.classList.add("in"); c.scrollIntoView({ behavior: "smooth", block: "center" }); c.animate([{ boxShadow: "0 0 0 0 var(--glow)" }, { boxShadow: "0 0 0 8px var(--glow)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400 }); }
    }, 300);
  }

  A.views = A.views || {};
  A.views.paths = {
    title: "Пути чтения",
    render,
    // После отметок в окне книги: перерисовать прогресс, сохранив раскрытые пути и место на странице
    refresh() {
      if (!root?.isConnected) return;
      draw(root);
      u.$$("[data-reveal]", root).forEach((x) => x.classList.add("in"));
      animateRings(root);
    }
  };
})(window.App);
