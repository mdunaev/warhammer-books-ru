/* Галактика: книги-звёзды по секторам. Стилизованная схема, а не официальная карта. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  const W = 1000, H = 660;
  // Условные области на схеме (своя раскладка)
  const REG = {
    obscurus: { x: 470, y: 150, r: 118 },
    eye: { x: 282, y: 120, r: 72 },
    solar: { x: 520, y: 348, r: 98, labelLeft: true },
    ultima: { x: 805, y: 330, r: 160 },
    tempestus: { x: 520, y: 560, r: 92 },
    pacificus: { x: 210, y: 370, r: 135 },
    beyond: { x: 900, y: 585, r: 72 },
    many: { x: 105, y: 575, r: 88 }
  };

  let root, timer = null, playing = false, idx = 0, order = [], focusSeg = null, side = "all", raf = 0;

  // ---------------------------------------------- Великий Разлом (999.M41)
  // Своя живописная туманность на канвасе: из воронки Ока Ужаса на восток,
  // между Обскурусом и Соларом и через север Ультимы (Баал — к северу, Ультрамар — к югу).
  const RIFT_TL = 40999; // 999.M41
  const EYE = { x: 282, y: 120 };
  const RIFT_PATH = [[282, 120], [338, 158], [410, 206], [500, 234], [596, 236], [690, 250], [786, 276], [880, 296], [985, 316]];
  // Сцена открытия: вдох, прорыв, удар, оседание
  const SC = { build: 750, tear: 1350, boom: 450, settle: 800 };
  const RIFT_PAUSE_MS = SC.build + SC.tear + SC.boom + SC.settle;
  const RIFT_SEGS = new Set(["obscurus", "solar", "ultima"]);

  let riftOn = false, riftRaf = 0, scene = null, riftImg = null, GEO = null, SPR = null;

  const clamp01 = (v) => u.clamp(v, 0, 1);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  // Сглаженный шум (value noise) и его сумма октав — для «живой» формы
  function noise1(seed) {
    const r = u.rng(seed), T = Array.from({ length: 256 }, () => r());
    return (x) => {
      const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
      return T[i & 255] * (1 - s) + T[(i + 1) & 255] * s;
    };
  }
  const fbm = (n, x) => n(x) * 0.55 + n(x * 2.1 + 17) * 0.3 + n(x * 4.3 + 41) * 0.15;

  // Осевая линия: сплайн через опорные точки, равномерно по длине, с извилинами; ширина по шуму
  function riftGeometry() {
    if (GEO) return GEO;
    const P = RIFT_PATH, dense = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      for (let s = 0; s < 24; s++) {
        const t = s / 24, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    dense.push(P[P.length - 1]);
    const acc = [0];
    for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = acc[acc.length - 1], M = 320, base = [];
    for (let k = 0, j = 0; k < M; k++) {
      const L = (k / (M - 1)) * total;
      while (j < acc.length - 2 && acc[j + 1] < L) j++;
      const f = (L - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
      base.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
    }
    const nM = noise1("rift-meander"), nW = noise1("rift-width");
    const normalAt = (arr, i) => {
      const a = arr[Math.max(0, i - 1)], b = arr[Math.min(arr.length - 1, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    };
    const meander = base.map((p, i) => {
      const t = i / (M - 1), [nx, ny] = normalAt(base, i);
      const m = (fbm(nM, t * 9) - 0.5) * 16 * Math.min(1, t * 8);
      return [p[0] + nx * m, p[1] + ny * m];
    });
    const pts = meander.map((p, i) => {
      const t = i / (M - 1), [nx, ny] = normalAt(meander, i);
      const w = (10 + 32 * Math.pow(1 - t, 0.8)) * (0.72 + 0.56 * fbm(nW, t * 7));
      return { x: p[0], y: p[1], nx, ny, t, w };
    });
    GEO = { pts };
    return GEO;
  }
  const at = (t) => GEO.pts[Math.round(clamp01(t) * (GEO.pts.length - 1))];
  // Ближайшая точка Разлома; side < 0 — север (Нихилус), side > 0 — юг (Санктус)
  function nearestRift(x, y) {
    let best = GEO.pts[0], bd = Infinity;
    for (const p of GEO.pts) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    return { p: best, d: Math.sqrt(bd), side: Math.sign(best.nx * (x - best.x) + best.ny * (y - best.y)) || -1 };
  }
  const clearance = (p) => p.w * 1.15 + 9;

  // Кисти: мягкие светящиеся мазки разных цветов (рисуются один раз)
  function sprites() {
    if (SPR) return SPR;
    const mk = (rgb, mid, midA = 0.35) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(mid, `rgba(${rgb},${midA})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return c;
    };
    SPR = {
      magenta: mk("255,50,160", 0.3), violet: mk("140,60,255", 0.35), crimson: mk("215,25,70", 0.3),
      pink: mk("255,185,232", 0.22), white: mk("255,246,252", 0.18), blue: mk("80,110,255", 0.35),
      dark: mk("4,1,10", 0.45, 0.6), mask: mk("255,255,255", 0.5, 1)
    };
    return SPR;
  }
  function put(c, k, img, x, y, size, alpha) {
    if (alpha <= 0.003) return;
    c.globalAlpha = Math.min(1, alpha);
    const s = size * k;
    c.drawImage(img, x * k - s / 2, y * k - s / 2, s, s);
  }

  // Неподвижная картина Разлома: туманность, пыль, нити, раскалённая жила, воронка Ока
  function paintRift(w, h) {
    const G = riftGeometry(), SP = sprites(), r = u.rng("rift-paint"), k = w / W;
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const c = off.getContext("2d");
    const dens = u.mobile() ? 0.55 : 1;
    const gauss = () => (r() + r() + r() - 1.5) / 0.5;
    const fade = (t) => Math.min(1, t / 0.05) * (1 - Math.pow(Math.max(0, (t - 0.78) / 0.22), 1.4));

    c.globalCompositeOperation = "lighter";
    // Воронка Ока: закрученные рукава, из которых вытекает Разлом
    for (let arm = 0; arm < 3; arm++) {
      for (let s = 0; s < 1; s += 0.01) {
        const a = arm * 2.094 + s * 7.2, rad = 5 + s * 64;
        put(c, k, s < 0.45 ? SP.magenta : SP.violet, EYE.x + Math.cos(a) * rad * 1.15, EYE.y + Math.sin(a) * rad * 0.8, 24 - s * 10, 0.1 * (1 - s));
      }
    }
    put(c, k, SP.violet, EYE.x, EYE.y, 150, 0.22);
    put(c, k, SP.pink, EYE.x, EYE.y, 64, 0.35);
    put(c, k, SP.white, EYE.x, EYE.y, 18, 0.55);

    // Внешний ореол: крупные холодные облака — масштаб варп-шторма
    for (let i = 0, N = Math.round(520 * dens); i < N; i++) {
      const t = r(), p = at(t), o = gauss() * p.w * 1.25;
      put(c, k, r() < 0.65 ? SP.violet : SP.blue, p.x + p.nx * o, p.y + p.ny * o, (40 + r() * 70) * (0.6 + p.w / 50), (0.025 + r() * 0.03) * fade(t));
    }
    // Туманность: тысячи мазков вдоль оси; у оси горячее, к краям холоднее
    for (let i = 0, N = Math.round(2800 * dens); i < N; i++) {
      const t = Math.pow(r(), 1.12), p = at(t), g = gauss(), o = g * p.w * 0.72;
      const x = p.x + p.nx * o + (r() - 0.5) * 8, y = p.y + p.ny * o + (r() - 0.5) * 8;
      const edge = Math.min(1, Math.abs(g) / 2.2);
      const img = edge < 0.22 ? (r() < 0.45 ? SP.pink : SP.magenta) : edge < 0.6 ? (r() < 0.6 ? SP.magenta : SP.crimson) : (r() < 0.7 ? SP.violet : SP.blue);
      put(c, k, img, x, y, (12 + r() * 34) * (0.55 + p.w / 42), (0.04 + r() * 0.07) * fade(t) * (1 - edge * 0.5));
    }
    // Яркие сгустки — «узлы» шторма
    for (let i = 0, N = Math.round(60 * dens); i < N; i++) {
      const t = r(), p = at(t), o = gauss() * p.w * 0.35;
      put(c, k, r() < 0.5 ? SP.magenta : SP.crimson, p.x + p.nx * o, p.y + p.ny * o, (30 + r() * 40) * (0.6 + p.w / 50), 0.1 * fade(t));
    }
    // Тёмные прожилки пыли дают объём
    c.globalCompositeOperation = "source-over";
    for (let i = 0, N = Math.round(380 * dens); i < N; i++) {
      const t = r(), p = at(t), o = (r() - 0.5) * p.w * 1.3;
      put(c, k, SP.dark, p.x + p.nx * o, p.y + p.ny * o, 10 + r() * 22, 0.2 * fade(t));
    }
    // Нити энергии, текущие вдоль Разлома
    c.globalCompositeOperation = "lighter";
    c.lineCap = "round"; c.lineJoin = "round";
    for (let i = 0, N = Math.round(30 * (dens < 1 ? 0.7 : 1)); i < N; i++) {
      const t0 = r() * 0.95, len = 0.04 + r() * 0.16, o0 = (r() - 0.5) * 1.4, wob = noise1("fil" + i);
      c.beginPath();
      for (let s = 0; s <= 24; s++) {
        const t = t0 + (len * s) / 24;
        if (t > 1) break;
        const p = at(t), o = (o0 + (wob(s * 0.35) - 0.5) * 0.9) * p.w * 0.6;
        const X = (p.x + p.nx * o) * k, Y = (p.y + p.ny * o) * k;
        if (s) c.lineTo(X, Y); else c.moveTo(X, Y);
      }
      const a = fade(t0) * (0.18 + r() * 0.22);
      c.globalAlpha = 1;
      c.strokeStyle = `rgba(255,90,190,${a * 0.3})`; c.lineWidth = (4 + r() * 4) * k; c.stroke();
      c.strokeStyle = `rgba(255,205,240,${a * 0.6})`; c.lineWidth = (0.4 + r() * 0.5) * k; c.stroke();
    }
    // Раскалённая жила: рваная, с разрывами
    const nCore = noise1("rift-core");
    let open = false;
    const flush = () => {
      if (!open) return;
      c.strokeStyle = "rgba(255,110,205,0.3)"; c.lineWidth = 6 * k; c.stroke();
      c.strokeStyle = "rgba(255,235,250,0.65)"; c.lineWidth = 0.9 * k; c.stroke();
      open = false;
    };
    for (let i = 0; i < G.pts.length; i++) {
      const p = G.pts[i], gate = nCore(i * 0.18) > 0.38 && p.t < 0.9;
      if (!gate) { flush(); continue; }
      const j = (r() - 0.5) * 3.2, X = (p.x + p.nx * j) * k, Y = (p.y + p.ny * j) * k;
      if (!open) { c.beginPath(); c.moveTo(X, Y); open = true; } else c.lineTo(X, Y);
    }
    flush();
    // Горячие узлы
    for (let i = 0; i < 40; i++) {
      const t = r(), p = at(t), o = (r() - 0.5) * p.w * 0.4;
      put(c, k, SP.white, p.x + p.nx * o, p.y + p.ny * o, 4 + r() * 9, 0.45 * fade(t));
    }
    c.globalAlpha = 1;
    return off;
  }

  // Тёмно-фиолетовая мгла над севером (Империум Нихилус). Рисуется один раз с размытыми краями.
  let hazeImg = null;
  function buildHaze(w, h) {
    const G = riftGeometry(), k = w / W, last = G.pts[G.pts.length - 1];
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const c = off.getContext("2d");
    if ("filter" in c) c.filter = `blur(${Math.max(2, Math.round(16 * k))}px)`;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(W * k, 0); c.lineTo(W * k, last.y * k);
    for (let i = G.pts.length - 1; i >= 0; i -= 2) c.lineTo(G.pts[i].x * k, G.pts[i].y * k);
    c.lineTo(200 * k, 40 * k); c.lineTo(0, 20 * k);
    c.closePath();
    const gr = c.createRadialGradient(610 * k, -90 * k, 0, 610 * k, -90 * k, 660 * k);
    gr.addColorStop(0, "rgba(16,11,36,0.82)"); gr.addColorStop(0.5, "rgba(31,13,51,0.58)");
    gr.addColorStop(0.78, "rgba(42,15,59,0.22)"); gr.addColorStop(1, "rgba(42,15,59,0)");
    c.fillStyle = gr;
    c.fill();
    return off;
  }
  function paintHaze(c, k, alpha) {
    if (alpha <= 0.01 || !hazeImg) return;
    c.save();
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(hazeImg, 0, 0);
    c.restore();
  }

  // Динамическая воронка Ока: раскручивается перед прорывом
  function drawVortex(c, k, I, spin) {
    if (I <= 0.01) return;
    const SP = sprites();
    for (let arm = 0; arm < 3; arm++) {
      for (let s = 0; s < 1; s += 0.025) {
        const a = arm * 2.094 + s * 7 + spin, rad = 6 + s * (58 + 26 * I);
        put(c, k, s < 0.45 ? SP.magenta : SP.violet, EYE.x + Math.cos(a) * rad * 1.15, EYE.y + Math.sin(a) * rad * 0.8, 30 - s * 14, 0.17 * I * (1 - s));
      }
    }
    put(c, k, SP.pink, EYE.x, EYE.y, 50 + 80 * I, 0.38 * I);
    put(c, k, SP.white, EYE.x, EYE.y, 14 + 26 * I, 0.75 * I);
  }

  function riftCanvas() { return root ? u.$("#g-riftc", root) : null; }
  function clearRift() {
    const cv = riftCanvas();
    if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
  }
  function drawRiftStatic() {
    const cv = riftCanvas();
    if (!cv || !riftImg) return;
    const c = cv.getContext("2d"), k = cv.width / W;
    c.clearRect(0, 0, cv.width, cv.height);
    paintHaze(c, k, 1);
    c.globalAlpha = 1;
    c.drawImage(riftImg, 0, 0);
  }
  // Подогнать канвас под размер карты и нарисовать картину Разлома и мглы (без вывода на экран)
  function buildRiftImages() {
    const cv = riftCanvas();
    if (!cv) return false;
    const box = cv.getBoundingClientRect();
    if (!box.width) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (riftImg && cv.width === w && cv.height === h) return "same"; // размер тот же — картина готова
    cv.width = w; cv.height = h;
    riftImg = paintRift(cv.width, cv.height);
    hazeImg = buildHaze(cv.width, cv.height);
    return "new";
  }
  // При запуске и смене размера окна. Идущую сцену прерываем, только если картина перерисована.
  function rebuildRift() {
    const res = buildRiftImages();
    if (!res || (scene && res === "same")) return;
    if (scene) endScene(true, true);
    else if (riftOn) drawRiftStatic();
    else clearRift();
  }

  function sceneBubble(beat) {
    if (!root) return;
    u.$("#g-time", root).textContent = "999.M41";
    u.$("#g-now", root).textContent = ["Око Ужаса пробуждается", "Открывается Великий Разлом", "Галактика расколота надвое"][beat];
    placeBubble();
  }
  function setNames(on) { u.$("#g-rift-names", root)?.classList.toggle("on", on); }

  // Остановить сцену. final — оставить готовый Разлом; callDone — продолжить проигрывание.
  function endScene(final, callDone) {
    cancelAnimationFrame(riftRaf); riftRaf = 0;
    const sc = scene;
    scene = null;
    if (!sc) return;
    sc.wrap.style.transform = "";
    sc.wrap.classList.remove("rift-scene", "rift-hold", "rift-flash");
    if (final && riftOn) { sc.wrap.classList.add("rift-open"); setNames(true); drawRiftStatic(); }
    if (callDone) sc.done?.();
  }

  function startScene(done) {
    const cv = riftCanvas(), wrap = u.$(".galaxy-wrap", root);
    if (!cv || !riftImg || !wrap) { drawRiftStatic(); done?.(); return; }
    const mk = () => { const o = document.createElement("canvas"); o.width = cv.width; o.height = cv.height; return o; };
    wrap.classList.remove("rift-open");
    setNames(false);
    wrap.classList.add("rift-scene", "rift-hold");
    scene = { start: performance.now(), last: 0, done, wrap, cv, ctx: cv.getContext("2d"), k: cv.width / W,
      mask: mk(), temp: mk(), revealed: 0, beat: -1, sparks: [], bolts: [], nextBolt: 0, maskFull: false };
    sceneBubble(0);
    riftRaf = requestAnimationFrame(sceneFrame);
  }

  function lightning(x, y, ang, len) {
    const pts = [[x, y]], n = 5 + Math.floor(Math.random() * 4);
    let a = ang, cx = x, cy = y;
    for (let i = 0; i < n; i++) {
      a += (Math.random() - 0.5) * 1.2;
      const L = (len / n) * (0.6 + Math.random() * 0.8);
      cx += Math.cos(a) * L; cy += Math.sin(a) * L;
      pts.push([cx, cy]);
    }
    return { pts, life: 0, max: 0.1 + Math.random() * 0.12 };
  }

  function sceneFrame(now) {
    const sc = scene;
    if (!sc) return;
    if (document.hidden) { stop(); return; }
    const e = now - sc.start;
    if (e >= RIFT_PAUSE_MS) { endScene(true, true); return; }
    const dt = sc.last ? Math.min(0.05, (now - sc.last) / 1000) : 0.016;
    sc.last = now;
    const { ctx, k, cv } = sc, SP = sprites();
    const B = SC.build, T = SC.tear, X = SC.boom;
    const pBuild = clamp01(e / B), pTear = clamp01((e - B) / T), pBoom = clamp01((e - B - T) / X);
    const pAfter = clamp01((e - B - T) / (X + SC.settle));
    const prog = smooth(pTear);
    const beat = e < B ? 0 : e < B + T ? 1 : 2;
    if (beat !== sc.beat) {
      sc.beat = beat;
      sceneBubble(beat);
      if (beat === 2) {
        // Удар: звёзды «выдыхают», вспышка, север погружается в мглу
        sc.wrap.classList.remove("rift-hold");
        sc.wrap.classList.add("rift-open", "rift-flash");
        setNames(true);
      }
    }

    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-over";
    // Затаившаяся галактика
    const dark = beat === 0 ? 0.48 * easeOut(pBuild) : beat === 1 ? 0.48 : 0.48 * (1 - easeOut(clamp01((e - B - T) / (X + SC.settle * 0.7))));
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(4,2,10,${dark.toFixed(3)})`;
    ctx.fillRect(0, 0, cv.width, cv.height);
    paintHaze(ctx, k, beat === 2 ? smooth(pAfter) : 0);

    // Разлом «прожигается» мягкой маской вслед за фронтом
    const m = sc.mask.getContext("2d");
    put(m, k, SP.mask, EYE.x, EYE.y, 2 * (24 + 46 * easeOut(pBuild)), 1);
    while (sc.revealed < prog) {
      sc.revealed = Math.min(prog, sc.revealed + 0.004);
      const p = at(sc.revealed);
      put(m, k, SP.mask, p.x, p.y, 2 * (p.w * 2.4 + 22), 1);
    }
    if (beat === 2 && !sc.maskFull) { m.globalAlpha = 1; m.fillStyle = "#fff"; m.fillRect(0, 0, cv.width, cv.height); sc.maskFull = true; }
    const tc = sc.temp.getContext("2d");
    tc.globalAlpha = 1;
    tc.globalCompositeOperation = "copy"; tc.drawImage(riftImg, 0, 0);
    tc.globalCompositeOperation = "destination-in"; tc.drawImage(sc.mask, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(sc.temp, 0, 0);

    ctx.globalCompositeOperation = "lighter";
    // Воронка: раскрутка и затихание
    const vort = beat === 0 ? easeIn(pBuild) : beat === 1 ? 1 : 1 - smooth(pAfter);
    drawVortex(ctx, k, vort, (e / 1000) * (1.5 + 5 * vort));
    // Стягивающиеся кольца перед прорывом
    if (beat === 0) {
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2; i++) {
        const q = clamp01(pBuild * 1.15 - i * 0.15), rr = (140 - 120 * easeIn(q)) * k;
        if (q <= 0 || rr <= 2) continue;
        ctx.beginPath(); ctx.ellipse(EYE.x * k, EYE.y * k, rr * 1.15, rr * 0.8, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${i ? "170,140,255" : "255,170,225"},${(0.55 * q).toFixed(3)})`;
        ctx.lineWidth = 1.6 * k; ctx.stroke();
      }
    }
    // Фронт прорыва: раскалённая голова, шлейф, молнии, искры
    if (beat === 1) {
      const p = at(prog), q = at(Math.max(0, prog - 0.012)), ang = Math.atan2(p.y - q.y, p.x - q.x);
      put(ctx, k, SP.violet, p.x, p.y, 170, 0.35);
      put(ctx, k, SP.pink, p.x, p.y, 110, 0.6);
      put(ctx, k, SP.white, p.x, p.y, 30, 1);
      ctx.save();
      ctx.translate(p.x * k, p.y * k); ctx.rotate(ang);
      ctx.globalAlpha = 0.55; ctx.drawImage(SP.pink, -170 * k, -10 * k, 190 * k, 20 * k);
      ctx.globalAlpha = 0.9; ctx.drawImage(SP.white, -70 * k, -3 * k, 80 * k, 6 * k);
      ctx.globalAlpha = 0.45; ctx.drawImage(SP.white, -80 * k, -1.5 * k, 160 * k, 3 * k);
      ctx.drawImage(SP.white, -1.5 * k, -50 * k, 3 * k, 100 * k);
      ctx.restore();
      if (e >= sc.nextBolt) {
        sc.nextBolt = e + 45 + Math.random() * 40;
        for (let i = 0; i < 2; i++) {
          const dir = Math.atan2(p.ny, p.nx) + (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
          sc.bolts.push(lightning(p.x, p.y, dir, 40 + Math.random() * 80));
        }
        if (prog > 0.15 && Math.random() < 0.5) {
          const pr = at(Math.random() * prog * 0.9), dir = Math.atan2(pr.ny, pr.nx) + (Math.random() < 0.5 ? 0 : Math.PI);
          sc.bolts.push(lightning(pr.x, pr.y, dir, 25 + Math.random() * 50));
        }
      }
      const tx = Math.cos(ang), ty = Math.sin(ang);
      for (let i = 0, n = u.mobile() ? 4 : 9; i < n && sc.sparks.length < 520; i++) {
        const back = 50 + Math.random() * 150, lat = (Math.random() - 0.5) * 320;
        sc.sparks.push({ x: p.x, y: p.y, vx: -tx * back + p.nx * lat, vy: -ty * back + p.ny * lat, life: 0, max: 0.45 + Math.random() * 0.7, s: 2 + Math.random() * 4 });
      }
    }
    // Молнии
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
    sc.bolts = sc.bolts.filter((b) => (b.life += dt) < b.max);
    for (const b of sc.bolts) {
      const a = (1 - b.life / b.max) * (Math.random() < 0.3 ? 0.45 : 1);
      ctx.beginPath();
      b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      ctx.strokeStyle = `rgba(255,110,205,${(0.3 * a).toFixed(3)})`; ctx.lineWidth = 5 * k; ctx.stroke();
      ctx.strokeStyle = `rgba(255,242,255,${a.toFixed(3)})`; ctx.lineWidth = 1.1 * k; ctx.stroke();
    }
    // Искры
    sc.sparks = sc.sparks.filter((s) => (s.life += dt) < s.max);
    for (const s of sc.sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.vy *= 0.97;
      const f = 1 - s.life / s.max;
      put(ctx, k, SP.pink, s.x, s.y, 1 + s.s * f * 2, f);
    }
    // Удар: вспышка и две ударные волны от середины Разлома
    if (beat === 2) {
      const flash = clamp01((e - B - T) / 260);
      if (flash < 1) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,200,240,${(0.55 * (1 - flash) ** 2).toFixed(3)})`;
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
      const mid = at(0.48);
      [[0, "255,175,230"], [0.13, "150,125,255"]].forEach(([delay, rgb]) => {
        const q = clamp01((e - B - T) / 950 - delay);
        if (q <= 0 || q >= 1) return;
        const rx = (30 + 720 * easeOut(q)) * k;
        ctx.beginPath(); ctx.ellipse(mid.x * k, mid.y * k, rx, rx * 0.52, -0.08, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${(0.32 * (1 - q)).toFixed(3)})`; ctx.lineWidth = (16 * (1 - q) + 2) * k; ctx.stroke();
        ctx.strokeStyle = `rgba(255,240,252,${(0.75 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1.4 * k; ctx.stroke();
      });
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // Дрожь карты: лёгкая на вдохе, сильная при ударе
    const amp = beat === 0 ? 1.1 * pBuild : beat === 1 ? 1.4 + 1.6 * prog : 7 * (1 - pBoom) ** 2;
    sc.wrap.style.transform = amp > 0.25 ? `translate(${((Math.random() - 0.5) * 2 * amp).toFixed(1)}px,${((Math.random() - 0.5) * 2 * amp).toFixed(1)}px)` : "";
    riftRaf = requestAnimationFrame(sceneFrame);
  }

  // Показать или скрыть Разлом. animate — сцена открытия (только при проигрывании).
  function setRift(on, animate, done) {
    if (!root) return;
    if (on === riftOn && !animate) return;
    endScene(false, false);
    riftOn = on;
    const wrap = u.$(".galaxy-wrap", root);
    if (!on) { wrap?.classList.remove("rift-open"); setNames(false); clearRift(); return; }
    if (!riftImg) buildRiftImages(); // картина ещё не готова (первый кадр не наступил) — строим сразу
    if (!animate || u.reduced() || document.hidden || !riftImg) {
      wrap?.classList.add("rift-open"); setNames(true); drawRiftStatic();
      if (animate) done?.();
      return;
    }
    startScene(done);
  }

  // По канону: Кадия — у Ока со стороны Санктуса, Баал — в Нихилусе, Ультрамар — в Санктусе
  const LORE_SIDES = [
    { re: /Кади/i, side: 1, t: [0.07, 0.2] },
    { re: /Баал/i, side: -1, t: [0.6, 0.74] },
    { re: /Ультрамар|Макрагг|Иакс/i, side: 1 }
  ];

  // Звёзды не садятся на Разлом. Книги эры Индомитус из соседних секторов встают вдоль его края.
  function placeStars() {
    riftGeometry();
    const out = [];
    D.BOOKS.forEach((b) => {
      const R = REG[b.segmentum] || REG.many;
      const hp = u.hash(b.place || b.id);
      const ang = ((hp % 3600) / 3600) * Math.PI * 2;
      const rad = Math.sqrt(((hp >>> 12) % 1000) / 1000) * R.r * 0.68;
      const cx = R.x + Math.cos(ang) * rad, cy = R.y + Math.sin(ang) * rad * 0.82;
      const r2 = u.rng(b.id);
      const ja = r2() * Math.PI * 2, jr = 6 + r2() * 14;
      const size = 2.2 + Math.min(5, Math.sqrt(b.voters || 1) / 7);
      let x = cx + Math.cos(ja) * jr, y = cy + Math.sin(ja) * jr;
      let north = false;
      if (REG[b.segmentum] && b.segmentum !== "many" && b.segmentum !== "beyond") {
        let n = nearestRift(x, y);
        const lore = LORE_SIDES.find((l) => l.re.test(b.place || ""));
        // Место из канона: своя сторона, а для Кадии и Баала — свой участок вдоль Разлома
        if (lore?.t) n = { p: at(lore.t[0] + r2() * (lore.t[1] - lore.t[0])), d: 0, side: lore.side };
        else if (lore && n.side !== lore.side) n = { ...n, d: 0, side: lore.side };
        const clear = clearance(n.p);
        const hugs = (lore?.t || (b.era === "indomitus" && RIFT_SEGS.has(b.segmentum))) && n.d < clear + 70;
        if (b.segmentum !== "eye" && (hugs || n.d < clear + 2)) {
          const dist = clear + (hugs ? 3 + r2() * 14 : 3 + r2() * 10);
          x = u.clamp(n.p.x + n.p.nx * n.side * dist, 8, W - 8);
          y = u.clamp(n.p.y + n.p.ny * n.side * dist, 8, H - 8);
        }
        north = b.segmentum !== "eye" && nearestRift(x, y).side < 0;
      }
      out.push({ b, x, y, size, north });
    });
    return out;
  }

  function svgHTML(stars) {
    const segCount = {};
    D.BOOKS.forEach((b) => (segCount[b.segmentum] = (segCount[b.segmentum] || 0) + 1));
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Схема галактики с книгами по секторам">
      <defs>
        <radialGradient id="g-core"><stop offset="0" stop-color="#fff3d0" stop-opacity=".9"/><stop offset=".3" stop-color="#e8c27a" stop-opacity=".35"/><stop offset="1" stop-color="#e8c27a" stop-opacity="0"/></radialGradient>
        <radialGradient id="g-eye"><stop offset="0" stop-color="#ff4a5a" stop-opacity=".55"/><stop offset=".6" stop-color="#8a1a5a" stop-opacity=".25"/><stop offset="1" stop-color="#8a1a5a" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="560" cy="320" r="110" fill="url(#g-core)" opacity=".5"/>
      <circle cx="${REG.eye.x}" cy="${REG.eye.y}" r="${REG.eye.r * 1.2}" fill="url(#g-eye)"/>
      ${Object.entries(REG).map(([id, R]) => {
        // Подпись сектора сверху; у Солара — слева, чтобы её не закрывал Разлом
        const tx = R.labelLeft ? R.x - R.r - 8 : R.x, ty = R.labelLeft ? R.y - 4 : R.y - R.r * 0.86 - 8;
        const anchor = R.labelLeft ? "end" : "middle";
        return `<g data-seg="${id}"><ellipse class="g-region" data-seg="${id}" cx="${R.x}" cy="${R.y}" rx="${R.r}" ry="${R.r * 0.86}"/>
        <text x="${tx}" y="${ty}" text-anchor="${anchor}" style="font-size:${R.r > 90 ? 17 : 14}px;letter-spacing:.06em">${u.esc(D.segmenta[id]?.name.replace("Сегментум ", "") || id)}</text>
        <text x="${tx}" y="${ty + 18}" text-anchor="${anchor}" style="font-size:11px;fill:rgba(236,208,139,.5);font-family:var(--f-text)">${u.books(segCount[id] || 0)}</text></g>`;
      }).join("")}
      <g id="g-rift-names" class="rift-names" aria-hidden="true">
        <text class="rl-main" x="668" y="182" text-anchor="middle">Великий Разлом</text>
        <text class="rl-sub" x="668" y="197" text-anchor="middle">999.M41 · галактика расколота надвое</text>
        <text class="rift-realm-label" x="760" y="78" text-anchor="middle">ИМПЕРИУМ НИХИЛУС</text>
        <text class="rift-realm-label" x="360" y="508" text-anchor="middle">ИМПЕРИУМ САНКТУС</text>
      </g>
      <g id="g-stars">${stars.map((s) => `<g class="g-star${s.north ? " rift-north" : ""}" data-bid="${s.b.id}" data-seg="${s.b.segmentum}" data-group="${s.b.group}" transform="translate(${s.x.toFixed(1)},${s.y.toFixed(1)})"><g class="rift-star-light">
        <circle class="halo" r="3" fill="${s.b.groupColor}" opacity="0"/>
        <circle r="${(s.size * 2.6).toFixed(1)}" fill="${s.b.groupColor}" opacity=".16"/>
        <circle class="core" r="${s.size.toFixed(1)}" fill="${s.b.groupColor}" stroke="${S.isRead(s.b.id) ? "#fff" : "none"}" stroke-width="1.2"/>
      </g></g>`).join("")}</g>
    </svg>`;
  }

  // Фон: спиральная галактика из точек (рисуется один раз)
  function drawBackground(cv) {
    const box = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = box.width * dpr; cv.height = box.height * dpr;
    const ctx = cv.getContext("2d");
    const sx = cv.width / W, sy = cv.height / H;
    const rand = u.rng(42);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const N = u.mobile() ? 1400 : 3200;
    for (let i = 0; i < N; i++) {
      const arm = i % 4;
      const t = Math.pow(rand(), 0.7) * 4.2;
      const a = t * 1.15 + (arm * Math.PI) / 2 + (rand() - 0.5) * 0.55;
      const rr = 18 + t * 92 + (rand() - 0.5) * 40;
      const x = 560 + Math.cos(a) * rr * 1.25, y = 320 + Math.sin(a) * rr * 0.78;
      const warm = rand() > 0.35;
      ctx.fillStyle = warm ? `rgba(236,208,139,${0.08 + rand() * 0.35})` : `rgba(170,190,230,${0.06 + rand() * 0.25})`;
      ctx.beginPath(); ctx.arc(x * sx, y * sy, (0.4 + rand() * 1.3) * dpr, 0, 6.283); ctx.fill();
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand() * 0.5})`;
      ctx.fillRect(rand() * cv.width, rand() * cv.height, dpr, dpr);
    }
  }

  function applyFilter() {
    u.$$(".g-star", root).forEach((g) => {
      const b = D.byId.get(g.dataset.bid);
      const okSide = side === "all" || b.group === side;
      const okSeg = !focusSeg || b.segmentum === focusSeg;
      const okTime = !playing && idx === order.length ? true : order.indexOf(b) <= idx;
      g.classList.toggle("dim", !(okSide && okSeg && okTime));
    });
    u.$$(".g-region", root).forEach((r) => r.classList.toggle("hl", r.dataset.seg === focusSeg));
  }

  const STEP_MS = 260; // одна книга за шаг: успеваешь прочитать дату и название
  const THUMB = 16;    // ширина ползунка у бегунка

  function setIdx(i, light) {
    idx = u.clamp(i, 0, order.length);
    const all = idx >= order.length;
    const b = order[Math.min(idx, order.length - 1)];
    const date = all ? "Вся история" : b ? b.tlLabel : "";
    const title = all ? `${u.books(order.length)} на карте` : b ? b.title : "";
    u.$("#g-time", root).textContent = date;
    u.$("#g-now", root).textContent = title;
    const range = u.$("#g-range", root);
    range.value = idx;
    range.setAttribute("aria-valuetext", `${date}. ${title}`);
    placeBubble();
    applyFilter();
    // После 999.M41 Разлом на карте; при перемотке назад он гаснет
    setRift(all || (b && b.tl >= RIFT_TL), false);
    if (light && b) {
      const g = u.$(`.g-star[data-bid="${CSS.escape(b.id)}"]`, root);
      if (g) { g.classList.remove("lit"); void g.getBBox(); g.classList.add("lit"); }
    }
  }

  // Подпись над бегунком: едет за ползунком, но не вылезает за края полосы
  function placeBubble() {
    const track = u.$("#g-track", root), bub = u.$("#g-bubble", root), range = u.$("#g-range", root);
    if (!track || !bub || !range) return;
    const pct = order.length ? idx / order.length : 1;
    const x = range.offsetLeft + THUMB / 2 + pct * (range.clientWidth - THUMB);
    const half = bub.offsetWidth / 2;
    const left = u.clamp(x, half, track.clientWidth - half);
    bub.style.left = `${left}px`;
    bub.style.setProperty("--tip", `${x - left + half}px`);
  }

  function setPlayButton(on) {
    if (!root) return;
    const btn = u.$("#g-play", root);
    if (!btn) return;
    btn.innerHTML = on ? `${ui.icon("pause")}<span>Пауза</span>` : `${ui.icon("play")}<span>Проиграть историю</span>`;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function play() {
    if (playing) { stop(); return; }
    if (idx >= order.length) setIdx(0);
    playing = true;
    setPlayButton(true);
    const tick = () => {
      timer = null;
      if (document.hidden) { stop(); return; }
      if (idx >= order.length - 1) { stop(); setIdx(order.length); return; }
      const cur = order[idx], nxt = order[idx + 1];
      // Момент открытия Разлома: сцена, затем история продолжается с этой книги
      if (cur && nxt && cur.tl < RIFT_TL && nxt.tl >= RIFT_TL && !riftOn && !u.reduced()) {
        setRift(true, true, () => {
          setIdx(idx, true);
          timer = setTimeout(tick, STEP_MS);
        });
        setIdx(idx + 1);       // Разлом уже «включён» — неподвижная картина не рисуется
        if (scene) sceneBubble(0);
        return;
      }
      setIdx(idx + 1, true);
      timer = setTimeout(tick, u.reduced() ? 10 : STEP_MS);
    };
    timer = setTimeout(tick, 50);
  }
  function stop() {
    const inScene = !!scene;
    clearTimeout(timer); timer = null;
    playing = false;
    endScene(true, false);
    if (inScene && root) setIdx(idx);
    setPlayButton(false);
  }

  function render(el) {
    stop();
    cancelAnimationFrame(raf);
    A.views.galaxy._off?.();
    root = el;
    riftOn = false;
    riftImg = null;
    order = D.BOOKS.slice().sort((a, b) => a.tl - b.tl || a.year - b.year);
    idx = order.length;
    A.app.currentList = order.map((b) => b.id);
    const stars = placeStars();
    const segCount = {};
    D.BOOKS.forEach((b) => (segCount[b.segmentum] = (segCount[b.segmentum] || 0) + 1));
    el.innerHTML = `<div class="page-head"><h1 class="page-title"><small>Где разворачиваются события</small>Галактика</h1>
      <p class="page-lead">Каждая звезда — книга. Цвет — сторона, размер — сколько людей её оценили. Схема условная: это наша карта, а не официальная.</p></div>
      <div class="galaxy-controls g-player">
        <button class="btn gold g-play" id="g-play" aria-pressed="false"></button>
        <div class="g-track" id="g-track">
          <div class="g-bubble" id="g-bubble" aria-hidden="true"><b id="g-time"></b><span id="g-now"></span></div>
          <input type="range" class="g-range" id="g-range" min="0" max="${order.length}" value="${order.length}" step="1" aria-label="Момент истории">
        </div>
      </div>
      <div class="galaxy-controls"><div class="fchips">${[["all", "Все"], ["imperium", "Империум"], ["chaos", "Хаос"], ["xenos", "Чужие"]].map(([id, n]) => `<button class="chip${side === id ? " on" : ""}" data-side="${id}" ${id !== "all" ? `style="--c:${D.GROUP_HEX[id]}"` : ""}>${id !== "all" ? '<span class="dot"></span>' : ""}${n}</button>`).join("")}</div></div>
      <div class="galaxy-wrap" data-reveal><canvas id="g-bg"></canvas><canvas id="g-riftc" class="g-rift-canvas" aria-hidden="true"></canvas>${svgHTML(stars)}</div>
      <div class="seg-list">${D.META.segmenta.filter((s) => segCount[s.id]).map((s) => `<div class="seg-card" data-segcard="${s.id}" data-reveal><span>${segCount[s.id]}</span><b>${u.esc(s.name)}</b><p>${u.esc(s.about)}</p></div>`).join("")}</div>`;

    const cv = u.$("#g-bg", el);
    let active = true, resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!active) return; drawBackground(cv); rebuildRift(); placeBubble(); }, 200);
    };
    const onVisibility = () => { if (document.hidden) stop(); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    u.$("#g-play", el).addEventListener("click", play);
    u.$("#g-range", el).addEventListener("input", (e) => {
      const value = Number(e.target.value);
      stop(); setIdx(value);
    });
    const onClick = (e) => {
      const sd = e.target.closest("[data-side]");
      if (sd) { side = sd.dataset.side; u.$$("[data-side]", el).forEach((x) => x.classList.toggle("on", x === sd)); applyFilter(); return; }
      const sc = e.target.closest("[data-segcard]");
      const reg = e.target.closest(".g-region");
      const seg = sc?.dataset.segcard || reg?.dataset.seg;
      if (seg) {
        if (focusSeg === seg && sc) { A.app.go(`#/?seg=${seg}`); return; }
        focusSeg = focusSeg === seg ? null : seg;
        u.$$("[data-segcard]", el).forEach((x) => x.style.borderColor = x.dataset.segcard === focusSeg ? "var(--gold)" : "");
        if (focusSeg && sc) { ui.toast("Нажмите ещё раз, чтобы открыть эти книги в библиотеке"); u.$(".galaxy-wrap", el).scrollIntoView({ behavior: "smooth", block: "center" }); }
        applyFilter();
      }
    };
    el.addEventListener("click", onClick);
    A.views.galaxy._off = () => {
      active = false;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("click", onClick);
    };
    setPlayButton(false);
    setIdx(order.length);
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!active) return;
      drawBackground(cv);
      rebuildRift();
      placeBubble();
    });
  }

  A.views = A.views || {};
  A.views.galaxy = {
    title: "Галактика",
    render,
    refresh() {
      if (!root?.isConnected) return;
      u.$$(".g-star[data-bid] circle.core", root).forEach((c) => c.setAttribute("stroke", S.isRead(c.closest(".g-star").dataset.bid) ? "#fff" : "none"));
    },
    destroy() { stop(); riftOn = false; riftImg = null; cancelAnimationFrame(raf); raf = 0; A.views.galaxy._off?.(); focusSeg = null; root = null; }
  };
})(window.App);
