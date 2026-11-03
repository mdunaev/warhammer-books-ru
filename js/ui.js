/* Интерфейс: иконки, обложки, карточки, эффекты, подсказки, уведомления. */
(function (A) {
  "use strict";
  const { u } = A;
  const D = A.data;
  const S = A.store;

  // ------------------------------------------------------------------ Иконки
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    sort: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/>',
    spines: '<path d="M4 20V5M8 20V3M12 20V7M16.5 20l-2-14M20 20V6"/><path d="M2 21h20"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    library: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5zM6 19h13v2H6.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    galaxy: '<circle cx="12" cy="12" r="2"/><path d="M12 3c5 0 9 2.5 9 6s-4 4-9 3-9-.5-9 3 4 6 9 6"/><path d="M3 9c0-3.5 4-6 9-6"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
    user: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5z"/><path d="M9 8h6M9 12h4"/><path d="m14.5 15.5 1.5 1.5 3-3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'
  };
  const icon = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

  // Свой знак проекта: компасная звезда над раскрытой книгой
  const SIGIL = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
    <circle cx="20" cy="20" r="18.2"/><circle cx="20" cy="20" r="15" stroke-dasharray="1.2 2.6" opacity=".8"/>
    <path d="M20 3.5l2.2 11.6L34 17l-11.8 1.9L20 30.5l-2.2-11.6L6 17l11.8-1.9z" fill="currentColor" fill-opacity=".18"/>
    <path d="M11 27.5c3.2-1.8 6.2-1.8 9 0 2.8-1.8 5.8-1.8 9 0v4.2c-3.2-1.8-6.2-1.8-9 0-2.8-1.8-5.8-1.8-9 0z" fill="currentColor" fill-opacity=".25"/>
    <path d="M20 27.5v4.2"/></svg>`;

  // «Печать чистоты»: восковая печать с лентами — знак классики
  const SEAL = `<svg viewBox="0 0 30 46" aria-hidden="true">
    <path d="M9 18 6.5 44l4.5-3.6 3.3 4.6L15.5 20z" fill="#e9dcbb"/><path d="M15.5 20l1 25 3.4-4.6 4.6 3.6L21 18z" fill="#d8c79e"/>
    <path d="M9.5 30.5h4.6M9.2 34h4.8M17.2 30.5h4.4M17.5 34h4.4" stroke="#8a6c3c" stroke-width=".7" opacity=".7"/>
    <path d="M15 1.8c1.6 0 2.2 1.3 3.6 1.5 1.5.2 2.6-.6 3.7.4 1 1 .3 2.3.9 3.6.6 1.3 2 1.8 2 3.4 0 1.5-1.3 2.1-1.6 3.5-.3 1.4.6 2.6-.4 3.7-1.1 1-2.4.3-3.7.9-1.3.7-1.8 2.1-3.4 2.1s-2.1-1.4-3.4-2.1c-1.3-.6-2.6.1-3.7-.9-1-1.1-.1-2.3-.4-3.7C8.3 13.2 7 12.6 7 11.1c0-1.6 1.4-2.1 2-3.4.6-1.3-.1-2.6.9-3.6 1.1-1 2.2-.2 3.7-.4 1.4-.2 1.8-1.5 3.4-1.5z" fill="#9b1d21"/>
    <circle cx="15" cy="11.6" r="6.2" fill="none" stroke="#e57b70" stroke-width=".8" opacity=".75"/>
    <path d="M15 7.2l1.2 2.8 3 .3-2.3 2 .7 2.9-2.6-1.6-2.6 1.6.7-2.9-2.3-2 3-.3z" fill="#f5c0b2" opacity=".92"/></svg>`;

  // Эмблема на запасной обложке: номер легиона или знак стороны
  const GLYPH = {
    imperium: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 4l4 12h12l-10 7 4 13-10-8-10 8 4-13L4 16h12z"/></svg>',
    chaos: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="20" cy="20" r="7"/><path d="M20 3v10M20 27v10M3 20h10M27 20h10M8 8l7 7M25 25l7 7M32 8l-7 7M15 25l-7 7"/></svg>',
    xenos: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 3l14 17-14 17L6 20z"/><path d="M20 11l7 9-7 9-7-9z"/></svg>'
  };

  // ------------------------------------------------------------- Обложки
  function coverHTML(b, opts = {}) {
    const url = D.coverUrl(b, opts.mode);
    const top = b.series ? `${u.esc(b.seriesName)}${b.seriesNo ? " · " + u.esc(u.roman(b.seriesNo) || b.seriesNo) : ""}` : u.esc(D.settings[b.setting]?.short || "");
    const mark = b.fac.num ? `<span>${b.fac.num}</span>` : GLYPH[b.group] || "";
    const vt = opts.vt ? ` style="--c:${b.color};view-transition-name:book-cover"` : ` style="--c:${b.color}"`;
    return `<div class="cover"${vt}>
      <div class="fallback"><div class="fb-top">${top}</div><div class="fb-mark">${mark}</div>
        <div class="fb-title">${u.esc(b.title)}<span class="fb-author">${u.esc(b.authorsRu.join(", "))}</span></div></div>
      ${url ? `<img src="${u.esc(url)}" alt="Обложка: ${u.esc(b.title)}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('ok')" onerror="this.remove()">` : ""}
    </div>`;
  }

  function cardHTML(b, opts = {}) {
    const read = S.isRead(b.id), want = S.isWant(b.id);
    const meta = opts.meta ? opts.meta(b) : b.authorsRu[0];
    return `<article class="card${read ? " is-read" : ""}" data-id="${b.id}" data-flip="${b.id}" tabindex="0" aria-label="${u.esc(b.title)}">
      <div class="cover-wrap">
        ${coverHTML(b)}
        ${b.rec === 1 ? `<div class="seal" title="Классика">${SEAL}</div>` : ""}
        ${b.entry ? `<div class="ribbon">Начни здесь</div>` : ""}
        ${read ? `<div class="stamp"><i>ПРОЧТЕНО</i></div>` : ""}
        <div class="card-actions">
          <button class="qa read${read ? " on" : ""}" data-act="read" title="Прочитано" aria-label="Отметить прочитанной">${icon("check")}</button>
          <button class="qa want${want ? " on" : ""}" data-act="want" title="Хочу прочитать" aria-label="Хочу прочитать">${icon("bookmark")}</button>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${u.esc(b.title)}</h3>
        <div class="card-meta">${opts.metaHTML ? opts.metaHTML(b) : `<span class="k">${u.esc(meta)}</span>`}</div>
        ${opts.inside ? `<div class="card-inside">внутри: «${u.esc(opts.inside)}»</div>` : ""}
      </div>
    </article>`;
  }

  // Обновить карточку после отметки, не перерисовывая всю страницу
  function refreshCard(card, stampIt) {
    const id = card.dataset.id;
    const read = S.isRead(id), want = S.isWant(id);
    card.classList.toggle("is-read", read);
    card.querySelector(".qa.read")?.classList.toggle("on", read);
    card.querySelector(".qa.want")?.classList.toggle("on", want);
    const wrap = card.querySelector(".cover-wrap");
    let st = wrap?.querySelector(".stamp");
    if (read && !st && wrap) {
      wrap.insertAdjacentHTML("beforeend", `<div class="stamp"><i>ПРОЧТЕНО</i></div>`);
      if (stampIt) { card.classList.remove("stamping"); void card.offsetWidth; card.classList.add("stamping"); }
    } else if (!read && st) st.remove();
  }

  // ---------------------------------------------------------- Эффекты
  // FLIP: карточки плавно перелетают на новые места после пересортировки
  function flip(container, render, opts = {}) {
    if (u.reduced() || !container) { render(); return; }
    const vh = window.innerHeight;
    const before = new Map();
    container.querySelectorAll("[data-flip]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) before.set(el.dataset.flip, r);
    });
    render();
    let n = 0;
    const max = u.mobile() ? 40 : 120;
    container.querySelectorAll("[data-flip]").forEach((el) => {
      if (n > max) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const b = before.get(el.dataset.flip);
      if (b) {
        const dx = b.left - r.left, dy = b.top - r.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 650, easing: "cubic-bezier(.22,1,.36,1)", delay: Math.min(n++ * 5, 160) });
      } else if (opts.enter !== false) {
        el.animate([{ opacity: 0, transform: "translateY(26px) scale(.9)" }, { opacity: 1, transform: "none" }],
          { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)", delay: Math.min(n++ * 14, 360), fill: "backwards" });
      }
    });
  }

  // Наклон обложки за курсором с бликом
  function initTilt() {
    if (u.touch() || u.reduced()) return;
    let active = null;
    document.addEventListener("pointermove", (e) => {
      const wrap = e.target.closest?.(".card .cover-wrap, .book-cover .cover-wrap");
      if (active && active !== wrap) reset(active);
      if (!wrap) return;
      active = wrap;
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      const k = wrap.closest(".book-cover") ? 10 : 14;
      wrap.style.setProperty("--ry", `${(px - 0.5) * k}deg`);
      wrap.style.setProperty("--rx", `${(0.5 - py) * k}deg`);
      const cov = wrap.querySelector(".cover");
      cov?.style.setProperty("--gx", `${px * 100}%`);
      cov?.style.setProperty("--gy", `${py * 100}%`);
      wrap.closest(".card")?.classList.add("tilting");
    }, { passive: true });
    function reset(w) {
      w.style.removeProperty("--rx"); w.style.removeProperty("--ry");
      w.closest(".card")?.classList.remove("tilting");
      active = null;
    }
    document.addEventListener("pointerleave", () => active && reset(active), true);
    document.addEventListener("pointerout", (e) => {
      if (active && !active.contains(e.relatedTarget)) reset(active);
    }, { passive: true });
  }

  // Золотая пыль на фоне
  function initDust() {
    const cv = document.getElementById("dust");
    if (!cv || u.reduced()) return;
    const ctx = cv.getContext("2d");
    let w, h, dpr, parts = [], raf = 0, running = true;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(u.mobile() ? 26 : 70, (innerWidth * innerHeight) / 22000));
      parts = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(any) {
      return { x: Math.random() * w, y: any ? Math.random() * h : h + 10, r: (Math.random() * 1.6 + 0.4) * dpr,
        vy: -(Math.random() * 0.25 + 0.05) * dpr, vx: (Math.random() - 0.5) * 0.12 * dpr, a: Math.random() * 0.5 + 0.15, t: Math.random() * 6.28 };
    }
    function color() { return document.documentElement.dataset.theme === "light" ? "138,100,32" : "236,208,139"; }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      const c = color();
      for (const p of parts) {
        p.y += p.vy; p.x += p.vx + Math.sin((p.t += 0.01)) * 0.08 * dpr;
        if (p.y < -10) Object.assign(p, spawn(false));
        const a = p.a * (0.6 + 0.4 * Math.sin(p.t * 2));
        ctx.beginPath(); ctx.fillStyle = `rgba(${c},${a})`; ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      raf = running ? requestAnimationFrame(tick) : 0;
    }
    resize();
    addEventListener("resize", u.debounce(resize, 200));
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running && !raf) raf = requestAnimationFrame(tick);
    });
    raf = requestAnimationFrame(tick);
  }

  // Искры из точки (например, при отметке «прочитано»)
  function sparks(x, y, color) {
    if (u.reduced()) return;
    const n = u.mobile() ? 10 : 16;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      if (color) { s.style.background = color; s.style.boxShadow = `0 0 10px ${color}`; }
      s.style.left = x + "px"; s.style.top = y + "px";
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 30 + Math.random() * 46;
      s.animate([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist + 20}px)) scale(0)`, opacity: 0 }
      ], { duration: 650 + Math.random() * 300, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => s.remove();
    }
  }

  // Счётчик, который «набегает» до значения
  function countUp(el, to, ms = 1200) {
    if (!el) return;
    if (u.reduced()) { el.textContent = u.fmtNum(to); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = u.fmtNum(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Появление при прокрутке. При смене раздела наблюдатель сбрасывается.
  let io = null;
  function resetReveal() { io?.disconnect(); io = null; }
  function reveal(root = document) {
    if (!("IntersectionObserver" in window) || u.reduced()) { u.$$("[data-reveal]", root).forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    u.$$("[data-reveal]:not(.in)", root).forEach((el) => io.observe(el));
  }

  // Плавный переход между состояниями страницы (View Transitions), если браузер умеет.
  // fn выполнится ровно один раз: в переходе или по страховочному таймеру, если браузер не рисует кадры.
  function transition(fn) {
    if (!document.startViewTransition || u.reduced() || document.hidden) { fn(); return null; }
    let ran = false;
    const once = () => { if (!ran) { ran = true; fn(); } };
    let t;
    try { t = document.startViewTransition(once); } catch { once(); return null; }
    // Прерванный переход — нормальная ситуация, не ошибка
    [t.ready, t.finished, t.updateCallbackDone].forEach((p) => p?.catch?.(() => {}));
    setTimeout(once, 400);
    return t;
  }

  // ---------------------------------------------------- Подсказка у курсора
  let tipEl = null, tipW = 0, tipH = 0, tipRaf = 0;
  function tip(html, x, y) {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.setAttribute("aria-hidden", "true"); document.body.appendChild(tipEl); }
    tipEl.innerHTML = html;
    tipEl.classList.add("show");
    const r = tipEl.getBoundingClientRect();
    tipW = r.width; tipH = r.height;
    place(x, y);
  }
  function place(x, y) {
    let left = x + 16, top = y + 16;
    if (left + tipW > innerWidth - 10) left = x - tipW - 16;
    if (top + tipH > innerHeight - 10) top = y - tipH - 16;
    tipEl.style.left = Math.max(8, left) + "px";
    tipEl.style.top = Math.max(8, top) + "px";
  }
  // Только сдвинуть подсказку, не перестраивая её (раз в кадр)
  function tipMove(x, y) {
    if (!tipEl || tipRaf) return;
    tipRaf = requestAnimationFrame(() => { tipRaf = 0; place(x, y); });
  }
  function hideTip() { tipEl?.classList.remove("show"); }
  function bookTip(b) {
    return `<div class="tip-in">${coverHTML(b, { eager: true })}<div><b>${u.esc(b.title)}</b>
      <span>${u.esc(b.authorsRu.join(", "))} · ${b.year}</span><span>${u.esc(b.tlLabel)} · ${u.esc(b.fac.name)}</span>
      ${b.rating ? `<span>★ ${b.rating.toFixed(2)} · ${u.fmtNum(b.voters)} ${u.plural(b.voters, "оценка", "оценки", "оценок")}</span>` : ""}</div></div>`;
  }

  // ------------------------------------------------------------ Уведомления
  function toast(msg, ms = 2400) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
  }

  // Отметить «прочитано» с эффектами; используется везде
  function markRead(id, fromEl) {
    const on = S.toggleRead(id);
    const b = D.byId.get(id);
    if (on && fromEl) {
      const r = fromEl.getBoundingClientRect();
      sparks(r.left + r.width / 2, r.top + r.height / 2, "#e2554c");
    }
    toast(on ? `«${b?.title}» — прочитано` : `Отметка снята`);
    return on;
  }
  function markWant(id, fromEl) {
    const on = S.toggleWant(id);
    const b = D.byId.get(id);
    if (on && fromEl) {
      const r = fromEl.getBoundingClientRect();
      sparks(r.left + r.width / 2, r.top + r.height / 2);
    }
    toast(on ? `«${b?.title}» — в списке «Хочу прочитать»` : `Убрано из «Хочу прочитать»`);
    return on;
  }

  A.ui = { icon, SIGIL, SEAL, coverHTML, cardHTML, refreshCard, flip, initTilt, initDust, sparks, countUp, reveal, resetReveal, transition, tip, tipMove, hideTip, bookTip, toast, markRead, markWant };
})(window.App);
