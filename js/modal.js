/* Окна: карточка книги, подбор книги. */
(function (A) {
  "use strict";
  const { u, ui } = A;
  const D = A.data;
  const S = A.store;

  let root = null, onClose = null, keyHandler = null, lastFocus = null, closeTimer = 0, token = 0;
  // Пока открыто окно, остальная страница недоступна для клавиатуры и экранного диктора
  const BACKGROUND = ["#view", ".topbar", ".footer", "#bottom-nav"];
  const setInert = (on) => BACKGROUND.forEach((s) => { const el = document.querySelector(s); if (el) el.inert = on; });

  function open(html, opts = {}) {
    close(true);
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    root = document.getElementById("modal-root");
    const r = root;
    r.innerHTML = `<div class="modal-backdrop" data-close></div>
      <div class="modal${opts.narrow ? " narrow" : ""}" role="dialog" aria-modal="true" tabindex="-1" aria-label="${u.esc(opts.label || "Окно")}">
        <button class="icon-btn modal-close" data-close aria-label="Закрыть">${ui.icon("x")}</button>
        <div class="modal-body">${html}</div>
      </div>`;
    r.style.pointerEvents = "auto";
    document.body.style.overflow = "hidden";
    setInert(true);
    if (opts.instant) r.classList.add("open");
    else requestAnimationFrame(() => requestAnimationFrame(() => { if (root === r) r.classList.add("open"); }));
    onClose = opts.onClose || null;
    // Обработчики вешаем на новые элементы окна, а не на постоянный контейнер — иначе они копятся
    const onClick = (e) => { if (e.target.closest("[data-close]")) requestClose(); };
    r.querySelector(".modal-backdrop").addEventListener("click", onClick);
    r.querySelector(".modal").addEventListener("click", onClick);
    keyHandler = (e) => {
      if (e.key === "Escape") requestClose();
      if (opts.onKey) opts.onKey(e);
    };
    document.addEventListener("keydown", keyHandler);
    setTimeout(() => root?.querySelector(".modal")?.focus?.({ preventScroll: true }), 50);
    return root.querySelector(".modal-body");
  }

  function requestClose() {
    if (onClose) onClose(); else close();
  }

  function close(instant) {
    token++; // отменяет отложенное открытие книги, если оно ещё не случилось
    if (!root) return;
    const r = root;
    document.removeEventListener("keydown", keyHandler);
    document.body.style.overflow = "";
    setInert(false);
    r.classList.remove("open");
    r.style.pointerEvents = "none";
    root = null;
    onClose = null;
    // Очищаем, только если за это время не открыли новое окно
    const done = () => { if (!root) r.innerHTML = ""; };
    clearTimeout(closeTimer);
    if (instant) done(); else closeTimer = setTimeout(done, 380);
    lastFocus?.focus?.({ preventScroll: true });
  }
  const isOpen = () => !!root;

  // ------------------------------------------------------------ Книга
  function miniTimeline(b) {
    const eras = D.META.eras;
    const e = b.eraObj;
    const frac = e ? u.clamp((b.tl - e.from) / Math.max(1, e.to - e.from), 0.05, 0.95) : 0.5;
    const pos = ((b.eraIdx + frac) / eras.length) * 100;
    const colors = ["#6b5a3a", "#8a6a2a", "#9a3b2a", "#7a2a1f", "#4a5a5a", "#5a5a3a", "#2f4a6a"];
    return `<div class="mini-tl" title="${u.esc(e?.name || "")}"><div class="bar">${eras.map((x, i) => `<i style="background:${colors[i]}" title="${u.esc(x.name)}"></i>`).join("")}</div>
      <div class="pin" style="left:${pos}%"></div></div>`;
  }

  function bookHTML(b) {
    const read = S.isRead(b.id), want = S.isWant(b.id), my = S.rating(b.id);
    const sBooks = b.series ? D.seriesBooks[b.series] : null;
    const idx = sBooks ? sBooks.indexOf(b) : -1;
    const prereq = (b.prereq || []).map((id) => D.byId.get(id)).filter(Boolean);
    const inPaths = D.PATHS.filter((p) => p.books.includes(b));
    const both = b.cover?.ru && b.cover?.en && D.coverMode() !== "off";
    const fmt = D.formats[b.format]?.name;
    const tr = b.ru === "official" ? `Есть перевод${b.ruYear ? ` (${b.ruYear})` : ""}` : b.ru === "fan" ? "Фанатский перевод" : "Только на английском";
    const recName = D.META.recs[b.rec - 1];
    const ratingPct = b.rating ? u.clamp(((b.rating - 5) / 4) * 100, 4, 100) : 0;

    return `
    <div class="book">
      <aside class="book-aside">
        <div class="book-cover">
          <div class="cover-wrap">${ui.coverHTML(b, { vt: true, eager: true })}${b.rec === 1 ? `<div class="seal">${ui.SEAL}</div>` : ""}</div>
          ${both ? `<div class="cover-switch"><button data-cover="ru" class="${D.coverMode() !== "en" ? "on" : ""}">Русская</button><button data-cover="en" class="${D.coverMode() === "en" ? "on" : ""}">Оригинал</button></div>` : ""}
          <div class="book-actions">
            <button class="btn red${read ? " on" : ""}" data-act="read">${ui.icon("check")}<span>${read ? "Прочитано" : "Прочитал"}</span></button>
            <button class="btn${want ? " on" : ""}" data-act="want">${ui.icon("bookmark")}<span>${want ? "В планах" : "Хочу"}</span></button>
            <button class="btn wide ghost" data-act="lists">${ui.icon("plus")}<span>В мой список</span></button>
          </div>
          <div class="list-picker" hidden></div>
          <div class="stars" role="radiogroup" aria-label="Моя оценка">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= my ? "on" : ""}" aria-label="${n} из 5">${ui.icon("star")}</button>`).join("")}</div>
          <div class="stars-label">${my ? "Моя оценка: " + my + " из 5" : "Моя оценка"}</div>
        </div>
      </aside>
      <div class="book-main">
        <h2>${u.esc(b.title)}</h2>
        ${b.titleRu ? `<div class="orig">${u.esc(b.titleEn)}</div>` : ""}
        <div class="byline">${b.authors.map((en, i) => `<a href="#/?author=${encodeURIComponent(en)}">${u.esc(b.authorsRu[i])}</a>`).join(", ")} · ${b.year}${fmt && b.format !== "novel" ? " · " + u.esc(fmt.toLowerCase()) : ""}</div>
        <div class="book-badges">
          ${b.rec === 1 ? `<span class="bbadge classic">Классика</span>` : `<span class="bbadge" title="${u.esc(recName?.hint)}">${u.esc(recName?.name)}</span>`}
          ${b.entry ? `<span class="bbadge entry">Можно начинать с неё</span>` : ""}
          <span class="bbadge">${u.esc(tr)}</span>
          <span class="bbadge" style="border-color:${D.settings[b.setting]?.color}">${u.esc(D.settings[b.setting]?.name)}</span>
        </div>
        ${b.hook ? `<div class="book-hook">${u.esc(b.hook)}</div>` : ""}
        <p class="book-desc">${u.esc(b.desc)}</p>
        ${b.note ? `<p class="book-desc" style="color:var(--gold-2);font-size:15px">${u.esc(b.note)}</p>` : ""}

        <div class="facts">
          <div class="fact"><small>Когда</small><b>${u.esc(b.tlLabel)}${b.tlApprox ? " <span style='color:var(--text-3)'>(примерно)</span>" : ""}</b><div style="font-size:13px;color:var(--text-2)">${u.esc(b.eraObj?.name || "")}</div>${miniTimeline(b)}</div>
          <div class="fact"><small>Где</small><b>${u.esc(b.place)}</b><div style="font-size:13px;color:var(--text-2)">${u.esc(D.segmenta[b.segmentum]?.name || "")}</div></div>
          <div class="fact"><small>Оценка читателей FantLab</small>${b.rating ? `<span class="big">${b.rating.toFixed(2)}</span> <span style="color:var(--text-3);font-size:13px">${u.fmtNum(b.voters)} ${u.plural(b.voters, "оценка", "оценки", "оценок")}</span><div class="meter"><i style="width:${ratingPct}%"></i></div>` : `<b style="color:var(--text-3)">Пока нет оценок</b>`}</div>
          <div class="fact"><small>Объём</small><b>${b.pages ? `около ${b.pages} стр.` : "—"}</b><div style="font-size:13px;color:var(--text-2)">${u.esc(fmt || "")}</div></div>
        </div>

        <div class="sect-title">Про кого</div>
        <div class="fchips">
          ${b.factions.map((f) => `<a class="chip" style="--c:${D.factions[f]?.color}" href="#/?fac=${f}"><span class="dot"></span>${u.esc(D.factions[f]?.name)}</a>`).join("")}
          ${b.tags.map((t) => `<a class="chip" href="#/?tag=${t}">${u.esc(D.tags[t]?.name)}</a>`).join("")}
        </div>
        ${b.heroes?.length ? `<p style="color:var(--text-2);margin:12px 0 0;font-size:15px">Герои: ${b.heroes.map(u.esc).join(", ")}</p>` : ""}

        ${sBooks && sBooks.length > 1 ? `
          <div class="sect-title">Серия «${u.esc(b.seriesName)}» · ${idx + 1} из ${sBooks.length}</div>
          <div class="series-strip">${sBooks.map((x) => `<div class="mini${x === b ? " current" : ""}${S.isRead(x.id) ? " read" : ""}" data-open="${u.esc(x.id)}" title="${u.esc(x.title)}" tabindex="0" role="button" aria-label="${u.esc(x.title)}">${ui.coverHTML(x)}<span>${x.seriesNo ? "№ " + x.seriesNo : u.esc(x.year)}</span></div>`).join("")}</div>` : ""}

        ${prereq.length ? `<div class="sect-title">Лучше прочитать сначала</div>
          <div class="series-strip">${prereq.map((x) => `<div class="mini${S.isRead(x.id) ? " read" : ""}" data-open="${u.esc(x.id)}" title="${u.esc(x.title)}" tabindex="0" role="button" aria-label="${u.esc(x.title)}">${ui.coverHTML(x)}<span>${u.esc(x.title)}</span></div>`).join("")}</div>` : ""}

        ${inPaths.length ? `<div class="sect-title">Есть в путях чтения</div>
          <div class="fchips">${inPaths.map((p) => `<a class="chip" style="--c:${p.color}" href="#/paths?p=${p.id}"><span class="dot"></span>${u.esc(p.name)} · шаг ${p.books.indexOf(b) + 1}</a>`).join("")}</div>` : ""}

        <div class="sect-title">Где почитать подробнее</div>
        <div class="links-row">${D.links(b).map((l) => `<a class="btn small ghost" href="${l.url}" target="_blank" rel="noopener">${u.esc(l.name)} ${ui.icon("ext")}</a>`).join("")}</div>
      </div>
    </div>
    <div class="book-nav">
      <button class="btn small ghost" data-nav="-1">${ui.icon("left")} Предыдущая</button>
      <button class="btn small ghost" data-nav="1">Следующая ${ui.icon("right")}</button>
    </div>`;
  }

  function listPickerHTML(b) {
    const lists = S.lists();
    return `${lists.length ? lists.map((l) => `<label><input type="checkbox" data-list="${u.esc(l.id)}" ${S.inList(l.id, b.id) ? "checked" : ""}> ${u.esc(l.name)} <span style="color:var(--text-3)">· ${l.books.length}</span></label>`).join("") : `<span style="font-size:13px;color:var(--text-3)">Списков пока нет. Создайте первый:</span>`}
      <div class="new"><input type="text" placeholder="Название списка" maxlength="60" data-newlist><button class="btn small" data-act="newlist">${ui.icon("plus")}</button></div>`;
  }

  function book(id, opts = {}) {
    const b = D.byId.get(id);
    if (!b) { ui.toast("Книга не найдена"); return; }
    const src = opts.from?.querySelector?.(".cover");
    const useVT = !!(src && document.startViewTransition && !u.reduced() && !isOpen());
    const render = () => {
      const body = open(bookHTML(b), { label: b.title, instant: useVT, onClose: opts.onClose, onKey: (e) => {
        if (e.target.tagName === "INPUT") return;
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      } });
      wire(body, b, opts);
    };
    const my = ++token;
    if (useVT) {
      src.style.viewTransitionName = "book-cover";
      // Если до отрисовки пользователь ушёл со страницы книги — окно не открываем
      const t = ui.transition(() => { src.style.viewTransitionName = ""; if (my === token) render(); });
      const clear = () => { const c = document.querySelector(".modal .cover"); if (c) c.style.viewTransitionName = ""; };
      if (t) t.finished.then(clear, clear); else clear();
    } else {
      render();
      const c = document.querySelector(".modal .cover");
      if (c) c.style.viewTransitionName = "";
    }

    function step(dir) {
      const list = (A.app.currentList || []).filter((x) => D.byId.has(x));
      const i = list.indexOf(id);
      if (i < 0 || !list.length) return;
      const next = list[(i + dir + list.length) % list.length];
      A.app.go(`#/book/${next}`, { replace: true });
    }
    opts.step = step;
  }

  function wire(body, b, opts) {
    body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act],[data-star],[data-open],[data-nav],[data-cover],a[href^='#/']");
      if (!t) return;
      if (t.dataset.act === "read") {
        const on = ui.markRead(b.id, t);
        t.classList.toggle("on", on);
        t.querySelector("span").textContent = on ? "Прочитано" : "Прочитал";
        const w = body.querySelector('[data-act="want"]');
        w.classList.toggle("on", S.isWant(b.id));
        w.querySelector("span").textContent = S.isWant(b.id) ? "В планах" : "Хочу";
      } else if (t.dataset.act === "want") {
        const on = ui.markWant(b.id, t);
        t.classList.toggle("on", on);
        t.querySelector("span").textContent = on ? "В планах" : "Хочу";
      } else if (t.dataset.act === "lists") {
        const pk = body.querySelector(".list-picker");
        pk.hidden = !pk.hidden;
        if (!pk.hidden) { pk.innerHTML = listPickerHTML(b); pk.querySelector("[data-newlist]")?.focus(); }
      } else if (t.dataset.act === "newlist") {
        const inp = body.querySelector("[data-newlist]");
        const name = inp.value.trim();
        if (!name) { inp.focus(); return; }
        S.createList(name, [b.id]);
        ui.toast(`Список «${name}» создан`);
        body.querySelector(".list-picker").innerHTML = listPickerHTML(b);
      } else if (t.dataset.star) {
        S.setRating(b.id, Number(t.dataset.star));
        const my = S.rating(b.id);
        body.querySelectorAll("[data-star]").forEach((s) => s.classList.toggle("on", Number(s.dataset.star) <= my));
        body.querySelector(".stars-label").textContent = my ? `Моя оценка: ${my} из 5` : "Моя оценка";
        if (my) ui.sparks(e.clientX, e.clientY);
      } else if (t.dataset.open) {
        A.app.go(`#/book/${t.dataset.open}`, { replace: true });
      } else if (t.dataset.nav) {
        opts.step?.(Number(t.dataset.nav));
      } else if (t.dataset.cover) {
        const url = t.dataset.cover === "en" ? b.cover.en : b.cover.ru;
        const cov = body.querySelector(".book-cover .cover");
        let img = cov?.querySelector("img");
        // Если прошлая картинка не загрузилась, её уже убрали — создаём заново
        if (!img && cov && url) {
          img = document.createElement("img");
          img.alt = `Обложка: ${b.title}`;
          img.referrerPolicy = "no-referrer";
          img.onload = () => cov.classList.add("ok");
          img.onerror = () => img.remove();
          cov.appendChild(img);
        }
        if (img && url) { cov.classList.remove("ok"); img.src = url; }
        body.querySelectorAll("[data-cover]").forEach((x) => x.classList.toggle("on", x === t));
      } else if (t.matches("a[href^='#/']")) {
        e.preventDefault();
        close(true);
        A.app.go(t.getAttribute("href"));
      }
    });
    body.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-list]");
      if (cb) S.toggleInList(cb.dataset.list, b.id);
    });
    body.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("[data-newlist]")) body.querySelector('[data-act="newlist"]').click();
    });
  }

  // ------------------------------------------------------ Подбор книги
  const QUIZ = [
    { id: "mood", q: "Чего хочется?", opts: [
      { v: "war", t: "Войны и битв", why: "много битв", tags: ["war", "siege", "space"] },
      { v: "intrigue", t: "Интриг и тайн", why: "интриги и тайны", tags: ["intrigue", "mystery", "betrayal"] },
      { v: "horror", t: "Мрака и ужаса", why: "мрачная", tags: ["horror", "survival", "tragedy"] },
      { v: "humor", t: "Посмеяться", why: "с юмором", tags: ["humor", "adventure"] },
      { v: "epic", t: "Большой истории", why: "эпичная", tags: ["epic", "lore", "tragedy"] }
    ] },
    { id: "side", q: "Чьими глазами?", opts: [
      { v: "imperium", t: "Империума" }, { v: "chaos", t: "Хаоса" }, { v: "xenos", t: "Чужих" }, { v: "any", t: "Всё равно" }
    ] },
    { id: "exp", q: "Ваш опыт?", opts: [
      { v: "new", t: "Только начинаю" }, { v: "some", t: "Пару книг читал" }, { v: "pro", t: "Читал много" }
    ] },
    { id: "lang", q: "На каком языке?", opts: [
      { v: "ru", t: "Только по-русски" }, { v: "any", t: "Можно на английском" }
    ] }
  ];

  function quiz() {
    const ans = {};
    const body = open(`<div class="quiz">
        <h3>Подобрать книгу</h3>
        <p style="color:var(--text-2);margin:0">Четыре вопроса — и три книги, с которых стоит начать.</p>
        ${QUIZ.map((q) => `<div class="q"><b>${q.q}</b><div class="fchips">${q.opts.map((o) => `<button class="chip" data-q="${q.id}" data-v="${o.v}">${o.t}</button>`).join("")}</div></div>`).join("")}
        <div class="quiz-out"></div>
      </div>`, { narrow: true, label: "Подбор книги" });
    body.addEventListener("click", (e) => {
      const c = e.target.closest("[data-q]");
      if (c) {
        ans[c.dataset.q] = c.dataset.v;
        body.querySelectorAll(`[data-q="${c.dataset.q}"]`).forEach((x) => x.classList.toggle("on", x === c));
        if (Object.keys(ans).length === QUIZ.length) showResult();
        return;
      }
      // Кнопки «прочитано/хочу» на карточке обрабатывает общий обработчик — подбор не закрываем
      if (e.target.closest(".qa")) return;
      const card = e.target.closest(".card");
      if (card) { close(true); A.app.go(`#/book/${card.dataset.id}`); }
    });
    function showResult() {
      const mood = QUIZ[0].opts.find((o) => o.v === ans.mood);
      const scored = D.BOOKS.filter((b) => !S.isRead(b.id) && !b.stub && (ans.lang !== "ru" || b.ru)).map((b) => {
        let s = 0;
        const why = [];
        const hit = b.tags.filter((t) => mood.tags.includes(t)).length;
        s += hit * 3;
        if (ans.side !== "any") { if (b.group === ans.side) { s += 4; } else s -= 3; }
        if (ans.exp === "new") { if (b.entry) { s += 5; why.push("можно начинать с неё"); } else s -= 4; if (b.rec === 1) s += 2; }
        if (ans.exp === "some") { s += b.rec === 1 ? 3 : b.rec === 2 ? 1 : -1; }
        if (ans.exp === "pro") { if (b.rec === 1 && b.voters > 300) s -= 1; s += (b.score || 7) - 7; }
        s += ((b.score || 7.3) - 7.3) * 2;
        if (b.rec === 1) why.push("классика");
        if (hit) why.push(mood.why);
        return { b, s, why };
      }).sort((a, b) => b.s - a.s);
      const top = [];
      const usedSeries = new Set();
      for (const x of scored) {
        if (x.b.series && usedSeries.has(x.b.series)) continue;
        top.push(x);
        if (x.b.series) usedSeries.add(x.b.series);
        if (top.length === 3) break;
      }
      body.querySelector(".quiz-out").innerHTML = `<div class="rule"><span>Вам подойдут</span></div>
        <div class="quiz-result">${top.map((x, i) => ui.cardHTML(x.b, { metaHTML: () => `<span class="why">${u.esc(x.why.slice(0, 2).join(", ") || x.b.authorsRu[0])}</span>` }).replace('class="card', `style="animation-delay:${i * 0.12}s" class="card`)).join("")}</div>`;
      const r = body.querySelector(".quiz-out").getBoundingClientRect();
      ui.sparks(r.left + r.width / 2, r.top + 30);
      body.querySelector(".quiz-out").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  A.modal = { open, close, isOpen, book, quiz };
})(window.App);
