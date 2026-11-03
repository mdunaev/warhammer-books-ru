/* Обзор: фракции, оценки и популярность, авторы, эпохи, темы, переводы. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  let io = null;

  // --------------------------------------------------------- Фракции
  function factionsChart(box) {
    const prim = {};
    D.BOOKS.forEach((b) => (prim[b.factions[0]] = (prim[b.factions[0]] || 0) + 1));
    const groups = D.META.groups.map((g) => ({
      name: g.name, id: g.id,
      children: D.META.factions.filter((f) => f.group === g.id && prim[f.id]).map((f) => ({ name: f.name, id: f.id, color: f.color, value: prim[f.id] }))
    })).filter((g) => g.children.length);
    const size = 640;
    if (!window.d3) { box.innerHTML = barsHTML(groups.flatMap((g) => g.children).sort((a, b) => b.value - a.value), (x) => `#/?fac=${x.id}`); return; }
    const root = d3.pack().size([size, size]).padding((d) => (d.depth === 0 ? 14 : 3))(d3.hierarchy({ children: groups }).sum((d) => d.value || 0).sort((a, b) => b.value - a.value));
    let n = 0;
    const nodes = root.descendants().slice(1).map((d) => {
      const delay = Math.min(n++ * 18, 900);
      if (d.depth === 1) {
        return `<g><circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${D.GROUP_HEX[d.data.id]}" fill-opacity=".07" stroke="${D.GROUP_HEX[d.data.id]}" stroke-opacity=".45" stroke-dasharray="3 5" style="transform-origin:${d.x}px ${d.y}px;animation:popIn .8s var(--ease-back) both ${delay}ms"/>
          <text class="pack-group-label" x="${d.x}" y="${Math.max(12, d.y - d.r - 6)}" text-anchor="middle">${u.esc(d.data.name)}</text></g>`;
      }
      const fs = Math.max(10, Math.min(15, d.r / 3.4));
      const words = shorten(d.data.name, d.r, fs).split(" ");
      const lines = words.length > 1 && d.r > 30 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [words.join(" ")];
      const lab = d.r > 20 ? lines.map((ln, k) => `<text x="${d.x}" y="${d.y + (k - (lines.length - 1) / 2) * fs * 1.1 + (d.r > 34 ? -4 : 4)}" style="font-size:${fs}px">${u.esc(ln)}</text>`).join("") +
        (d.r > 34 ? `<text x="${d.x}" y="${d.y + lines.length * fs * 0.6 + 10}" style="font-size:12px;opacity:.75;font-family:var(--f-text) !important">${d.value}</text>` : "") : "";
      return `<a href="#/?fac=${d.data.id}" class="bubble"><title>${u.esc(d.data.name)}: ${u.books(d.value)}</title>
        <circle class="leaf" cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${d.data.color}" stroke="rgba(236,208,139,.35)" style="transform-origin:${d.x}px ${d.y}px;animation:popIn .7s var(--ease-back) both ${delay}ms"/>${lab}</a>`;
    }).join("");
    box.innerHTML = `<svg class="svg-chart" viewBox="0 -10 ${size} ${size + 10}" style="max-width:640px;margin:0 auto">${nodes}</svg>`;
  }
  // Влезает ли подпись в круг: на две строки при большом круге
  function shorten(s, r, fs) {
    const perLine = Math.floor((r * 1.7) / (fs * 0.55));
    const max = r > 30 ? perLine * 2 : perLine;
    return s.length > max ? s.slice(0, Math.max(3, max - 1)) + "…" : s;
  }

  function barsHTML(items, href, color) {
    const max = Math.max(...items.map((x) => x.value), 1);
    return `<div class="bars">${items.map((x, i) => `<a class="bar-row" href="${href(x)}" style="text-decoration:none"><span class="bl">${u.esc(x.name)}${x.sub ? `<small>${u.esc(x.sub)}</small>` : ""}</span>
      <span class="bt"><i style="width:${(x.value / max) * 100}%;--c:${x.color || color || "var(--gold)"};animation-delay:${i * 40}ms"></i></span><span class="bn">${x.value}</span></a>`).join("")}</div>`;
  }

  // ----------------------------------------- Оценка против популярности
  function scatterChart(box) {
    const pts = D.BOOKS.filter((b) => b.rating && b.voters >= 5);
    const W = 900, H = 520, L = 56, R = 20, T = 24, B = 50;
    const maxV = Math.max(...pts.map((b) => b.voters));
    const minV = 5;
    const yMin = 6.4, yMax = 9;
    const x = (v) => L + (Math.log10(v / minV) / Math.log10(maxV / minV)) * (W - L - R);
    const y = (r) => T + (1 - (u.clamp(r, yMin, yMax) - yMin) / (yMax - yMin)) * (H - T - B);
    const medV = pts.map((b) => b.voters).sort((a, b) => a - b)[Math.floor(pts.length / 2)];
    const cutR = 7.9;
    const xs = [5, 10, 30, 100, 300, 1000].filter((v) => v <= maxV);
    const ys = [];
    for (let r = Math.ceil(yMin * 2) / 2; r <= yMax; r += 0.5) ys.push(r);
    let n = 0;
    const dots = pts.map((b) => `<circle class="dot" data-bid="${b.id}" cx="${x(b.voters).toFixed(1)}" cy="${y(b.rating).toFixed(1)}" r="${S.isRead(b.id) ? 6.5 : 5.5}" fill="${b.groupColor}" fill-opacity=".85" stroke="${S.isRead(b.id) ? "#fff" : "rgba(0,0,0,.4)"}" stroke-width="1.2" style="transform-origin:${x(b.voters).toFixed(1)}px ${y(b.rating).toFixed(1)}px;animation:popIn .6s var(--ease-back) both ${Math.min(n++ * 4, 900)}ms"/>`).join("");
    const qx = x(medV), qy = y(cutR);
    box.innerHTML = `<div class="chart-scroll"><svg class="svg-chart" viewBox="0 0 ${W} ${H}" style="min-width:640px">
      ${ys.map((r) => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(r)}" y2="${y(r)}"/><text x="${L - 10}" y="${y(r) + 4}" text-anchor="end">${r.toFixed(1)}</text>`).join("")}
      ${xs.map((v) => `<line class="grid-line" x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}"/><text x="${x(v)}" y="${H - B + 18}" text-anchor="middle">${v}</text>`).join("")}
      <rect x="${L}" y="${T}" width="${qx - L}" height="${qy - T}" fill="var(--gold)" opacity=".06"/>
      <line x1="${qx}" x2="${qx}" y1="${T}" y2="${H - B}" stroke="var(--line-3)" stroke-dasharray="5 4"/>
      <line x1="${L}" x2="${W - R}" y1="${qy}" y2="${qy}" stroke="var(--line-3)" stroke-dasharray="5 4"/>
      <text x="${L + 10}" y="${T + 18}" style="fill:var(--gold-2);font-family:var(--f-display);font-size:17px">Скрытые жемчужины</text>
      <text x="${W - R - 10}" y="${T + 18}" text-anchor="end" style="fill:var(--gold-2);font-family:var(--f-display);font-size:17px">Признанная классика</text>
      <text x="${W - R - 10}" y="${H - B - 10}" text-anchor="end" style="fill:var(--text-3);font-family:var(--f-display);font-size:16px">Популярные, оценка пониже</text>
      <text x="${L + 10}" y="${H - B - 10}" style="fill:var(--text-3);font-family:var(--f-display);font-size:16px">Для узкого круга</text>
      ${dots}
      <text class="axis-title" x="${W - R}" y="${H - 8}" text-anchor="end">Сколько людей оценили →</text>
      <text class="axis-title" x="12" y="${T - 8}">Средняя оценка</text>
    </svg></div>
    <div class="legend">${D.META.groups.map((g) => `<span style="--c:${D.GROUP_HEX[g.id]}"><i></i>${g.name}</span>`).join("")}<span>Белая обводка — вы прочитали</span></div>`;
    const gems = pts.filter((b) => b.voters < medV && b.rating >= cutR).sort((a, b) => b.rating - a.rating).slice(0, 6);
    if (gems.length) {
      box.insertAdjacentHTML("beforeend", `<div class="rule"><span>Скрытые жемчужины</span></div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${gems.map((b) => ui.cardHTML(b, { meta: (x) => `★ ${x.rating.toFixed(2)} · ${x.voters} ${u.plural(x.voters, "оценка", "оценки", "оценок")}` })).join("")}</div>`);
    }
  }

  // --------------------------------------------------------- Авторы
  function authorsChart(box) {
    const top = D.AUTHORS.slice(0, 18);
    const max = top[0]?.books.length || 1;
    box.innerHTML = `<div class="bars">${top.map((a, i) => {
      const segs = ["imperium", "chaos", "xenos"].map((g) => ({ g, n: a.books.filter((b) => b.group === g).length })).filter((s) => s.n);
      return `<a class="bar-row" href="#/?author=${encodeURIComponent(a.en)}&sort=year" style="text-decoration:none"><span class="bl">${u.esc(a.ru)}${a.avg ? `<small>★ ${a.avg.toFixed(1)}</small>` : ""}</span>
        <span class="bt" style="width:${(a.books.length / max) * 100}%">${segs.map((s) => `<i style="flex:${s.n};--c:${D.GROUP_HEX[s.g]};animation-delay:${i * 40}ms"></i>`).join("")}</span><span class="bn">${a.books.length}</span></a>`;
    }).join("")}</div>
    <div class="legend">${D.META.groups.map((g) => `<span style="--c:${D.GROUP_HEX[g.id]}"><i></i>${g.name}</span>`).join("")}<span>★ — средняя оценка книг автора</span></div>`;
  }

  // ------------------------------------------------------ Эпохи и темы
  function erasChart(box) {
    const items = D.META.eras.map((e, i) => ({ id: e.id, name: e.name, sub: e.range, value: D.BOOKS.filter((b) => b.era === e.id).length, color: A.ERA_COLORS?.[i] })).filter((x) => x.value);
    box.innerHTML = barsHTML(items, (x) => `#/?era=${x.id}&sort=tl`);
  }
  function tagsChart(box) {
    const items = D.META.tags.map((t) => ({ id: t.id, name: t.name, value: D.BOOKS.filter((b) => b.tags.includes(t.id)).length })).filter((x) => x.value).sort((a, b) => b.value - a.value);
    box.innerHTML = barsHTML(items, (x) => `#/?tag=${x.id}`, "var(--red-2)");
  }

  // -------------------------------------------------------- Переводы
  function ruChart(box) {
    const cats = [["official", "Официальный перевод", "#c9a25a"], ["fan", "Фанатский перевод", "#7f9fbf"], ["none", "Только на английском", "#5a5248"]];
    const total = D.BOOKS.length;
    const cnt = (k, list = D.BOOKS) => list.filter((b) => (b.ru || "none") === k).length;
    const R = 80, C = 2 * Math.PI * R;
    let off = 0;
    const arcs = cats.map(([k, , col], i) => {
      const frac = cnt(k) / total;
      const s = `<circle cx="110" cy="110" r="${R}" fill="none" stroke="${col}" stroke-width="30" stroke-dasharray="${frac * C} ${C}" stroke-dashoffset="${-off * C}" style="animation:grow 1s var(--ease) both ${i * 150}ms"/>`;
      off += frac;
      return s;
    }).join("");
    const byDecade = {};
    D.BOOKS.forEach((b) => { const d = Math.floor(b.year / 10) * 10; (byDecade[d] = byDecade[d] || []).push(b); });
    box.innerHTML = `<div class="donut-wrap">
      <svg viewBox="0 0 220 220" style="width:200px;transform:rotate(-90deg)">${arcs}</svg>
      <div style="flex:1;min-width:200px">${cats.map(([k, name, col]) => `<a class="bar-row" href="#/?ru=${k}" style="grid-template-columns:1fr auto;text-decoration:none"><span class="bl"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${col};margin-right:8px"></span>${name}</span><span class="bn">${cnt(k)} · ${Math.round((cnt(k) / total) * 100)}%</span></a>`).join("")}
        <p style="color:var(--text-2);font-size:14px;margin:14px 0 6px">Доля переведённых по десятилетиям выхода:</p>
        ${Object.keys(byDecade).sort().map((d) => { const L = byDecade[d]; const p = Math.round((L.filter((b) => b.ru).length / L.length) * 100); return `<div class="bar-row" style="cursor:default"><span class="bl">${d}-е <small>${u.books(L.length)}</small></span><span class="bt"><i style="width:${p}%;--c:var(--gold)"></i></span><span class="bn">${p}%</span></div>`; }).join("")}
      </div></div>`;
  }

  const CHARTS = [
    { id: "fac", title: "Про кого пишут больше всего", lead: "Размер круга — сколько книг, где фракция главная. Нажмите на круг, чтобы открыть эти книги.", draw: factionsChart },
    { id: "scatter", title: "Оценка против популярности", lead: "Каждая точка — книга с оценками на FantLab. Справа — те, что прочитали многие. Сверху — те, что понравились больше. В левом верхнем углу прячутся сильные, но малоизвестные книги.", draw: scatterChart },
    { id: "authors", title: "Главные авторы", lead: "Сколько книг автора в каталоге и про какую сторону он пишет.", draw: authorsChart },
    { id: "eras", title: "Книги по эпохам", lead: "Какие периоды истории описаны подробнее всего.", draw: erasChart, half: true },
    { id: "tags", title: "О чём книги", lead: "Самые частые темы. Одна книга может попасть в несколько.", draw: tagsChart, half: true },
    { id: "ru", title: "Что можно прочитать на русском", lead: "Официальные переводы, фанатские и книги без перевода.", draw: ruChart }
  ];

  function render(el) {
    A.app.currentList = D.BOOKS.map((b) => b.id);
    const classics = D.BOOKS.filter((b) => b.rec === 1).length;
    const avg = D.BOOKS.filter((b) => b.rating).reduce((s, b, _, a) => s + b.rating / a.length, 0);
    const voters = D.BOOKS.reduce((s, b) => s + (b.voters || 0), 0);
    el.innerHTML = `<div class="page-head"><h1 class="page-title"><small>Каталог в цифрах</small>Обзор</h1>
      <p class="page-lead">Что пишут, кто пишет и что любят читатели. Всё кликабельно: любой столбик или круг открывает нужные книги.</p></div>
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:22px">
        <div class="stat framed"><b data-count="${D.BOOKS.length}">0</b><span>книг в каталоге</span></div>
        <div class="stat framed"><b data-count="${classics}">0</b><span>отмечены как классика</span></div>
        <div class="stat framed"><b>${avg.toFixed(2)}</b><span>средняя оценка на FantLab</span></div>
        <div class="stat framed"><b data-count="${voters}">0</b><span>оценок читателей учтено</span></div>
      </div>
      <div class="ov-grid">${CHARTS.map((c) => `<div class="chart-card" data-chart="${c.id}" data-reveal style="${c.half ? "" : "grid-column:1/-1"}"><h3>${c.title}</h3><p>${c.lead}</p><div class="chart-box" style="min-height:120px"></div></div>`).join("")}</div>`;
    u.$$("[data-count]", el).forEach((x) => ui.countUp(x, Number(x.dataset.count)));
    io?.disconnect();
    const draw = (card) => {
      const c = CHARTS.find((x) => x.id === card.dataset.chart);
      if (c && !card.dataset.drawn) { card.dataset.drawn = "1"; c.draw(card.querySelector(".chart-box")); }
    };
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { draw(e.target); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
      u.$$("[data-chart]", el).forEach((c) => io.observe(c));
    } else u.$$("[data-chart]", el).forEach(draw);
  }

  A.views = A.views || {};
  A.views.overview = {
    title: "Обзор",
    render,
    // После отметок: обводка точек на графике и печати на карточках «скрытых жемчужин»
    refresh() {
      u.$$("#view circle.dot[data-bid]").forEach((c) => {
        const r = S.isRead(c.dataset.bid);
        c.setAttribute("stroke", r ? "#fff" : "rgba(0,0,0,.4)");
        c.setAttribute("r", r ? 6.5 : 5.5);
      });
      u.$$("#view .card[data-id]").forEach((c) => ui.refreshCard(c));
    },
    destroy() { io?.disconnect(); io = null; }
  };
})(window.App);
