/* Данные: справочники, производные поля книг, фильтры, сортировки, группировки. */
(function (A) {
  "use strict";
  const { u } = A;
  const META = window.META;
  const CONFIG = Object.assign({ realCovers: true, defaultCovers: "ru" }, window.CONFIG || {});

  // Словари без прототипа: ключи из адреса вроде "__proto__" или "constructor" ничего не найдут
  const byKey = (arr) => Object.assign(Object.create(null), Object.fromEntries(arr.map((x) => [x.id, x])));
  const factions = byKey(META.factions);
  const eras = byKey(META.eras);
  const tags = byKey(META.tags);
  const groups = byKey(META.groups);
  const segmenta = byKey(META.segmenta);
  const settings = byKey(META.settings);
  const formats = byKey(META.formats);
  const series = byKey(window.SERIES || []);
  const AUTH = window.AUTHORS || {};
  const eraOrder = Object.fromEntries(META.eras.map((e, i) => [e.id, i]));
  const facOrder = Object.fromEntries(META.factions.map((f, i) => [f.id, i]));
  const GROUP_COLOR = { imperium: "var(--imperium)", chaos: "var(--chaos)", xenos: "var(--xenos)" };
  const GROUP_HEX = { imperium: "#c9a25a", chaos: "#c0443f", xenos: "#3fae9f" };

  // Потомки фракции (для фильтра «Космодесант Хаоса» → все легионы)
  const children = {};
  META.factions.forEach((f) => { if (f.parent) (children[f.parent] = children[f.parent] || []).push(f.id); });
  function descendants(id) {
    const out = [id];
    (children[id] || []).forEach((c) => out.push(...descendants(c)));
    return out;
  }
  function topFaction(id) {
    let f = factions[id];
    while (f && f.parent) f = factions[f.parent];
    return f;
  }

  // Байесовская оценка: мало голосов — тянем к среднему
  const C = 7.5, M = 25;
  const bayes = (r, v) => (r && v ? (v / (v + M)) * r + (M / (v + M)) * C : null);

  const BOOKS = (window.BOOKS || []).map((b) => {
    const fac = factions[b.factions[0]] || factions.imperium;
    const s = b.series ? series[b.series] : null;
    const authorsRu = b.authors.map((en) => AUTH[en] || en);
    const x = Object.assign({}, b, {
      title: b.titleRu || b.titleEn,
      authorsRu,
      fac,
      color: fac.color,
      group: fac.group,
      groupColor: GROUP_HEX[fac.group],
      seriesObj: s,
      seriesName: s ? s.name : null,
      eraObj: eras[b.era],
      eraIdx: eraOrder[b.era] ?? 99,
      score: bayes(b.rating, b.voters)
    });
    x.search = [b.titleRu, b.titleEn, ...authorsRu, ...b.authors, ...(b.heroes || []), b.place, s?.name, s?.nameEn, ...b.factions.map((f) => factions[f]?.name)]
      .filter(Boolean).join(" ").toLowerCase().replace(/ё/g, "е");
    return x;
  });
  const byId = new Map(BOOKS.map((b) => [b.id, b]));
  const byN = new Map(BOOKS.map((b) => [String(b.n), b]));

  // Книги серии по порядку
  const seriesBooks = {};
  BOOKS.forEach((b) => { if (b.series) (seriesBooks[b.series] = seriesBooks[b.series] || []).push(b); });
  Object.values(seriesBooks).forEach((arr) => arr.sort((a, b) => (a.seriesNo ?? 999) - (b.seriesNo ?? 999) || a.tl - b.tl || a.year - b.year));

  // Авторы
  const authorMap = new Map();
  BOOKS.forEach((b) => b.authors.forEach((en, i) => {
    if (!authorMap.has(en)) authorMap.set(en, { en, ru: b.authorsRu[i], books: [] });
    authorMap.get(en).books.push(b);
  }));
  const AUTHORS_LIST = [...authorMap.values()].map((a) => {
    const rated = a.books.filter((b) => b.rating);
    a.avg = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : null;
    a.classics = a.books.filter((b) => b.rec === 1).length;
    return a;
  }).sort((a, b) => b.books.length - a.books.length || a.ru.localeCompare(b.ru, "ru"));

  // Обложки
  function coverMode() {
    if (!CONFIG.realCovers) return "off";
    return A.store.pref("covers", CONFIG.defaultCovers);
  }
  function coverUrl(b, mode = coverMode()) {
    if (mode === "off" || !b.cover) return null;
    if (mode === "en") return b.cover.en || b.cover.ru || null;
    return b.cover.ru || b.cover.en || null;
  }

  // ----------------------------------------------------------- Фильтры
  const DEFAULT_LIB = { q: "", setting: [], era: [], fac: [], tag: [], rec: [], entry: false, ru: [], fmt: [], seg: [], status: "", author: "", series: "", y1: null, y2: null, sort: "rec", dir: 1, group: "none", view: "grid" };

  function filterBooks(f, list = BOOKS) {
    const S = A.store;
    const q = (f.q || "").trim().toLowerCase().replace(/ё/g, "е");
    const facSet = f.fac.length ? new Set(f.fac.flatMap(descendants)) : null;
    return list.filter((b) => {
      if (q && !q.split(/\s+/).every((w) => b.search.includes(w))) return false;
      if (f.setting.length && !f.setting.includes(b.setting)) return false;
      if (f.era.length && !f.era.includes(b.era)) return false;
      if (facSet && !b.factions.some((x) => facSet.has(x))) return false;
      if (f.tag.length && !f.tag.every((t) => b.tags.includes(t))) return false;
      if (f.rec.length && !f.rec.includes(b.rec)) return false;
      if (f.entry && !b.entry) return false;
      if (f.ru.length && !f.ru.includes(b.ru || "none")) return false;
      if (f.fmt.length && !f.fmt.includes(b.format)) return false;
      if (f.seg.length && !f.seg.includes(b.segmentum)) return false;
      if (f.author && !b.authors.includes(f.author)) return false;
      if (f.series && b.series !== f.series) return false;
      if (f.y1 && b.year < f.y1) return false;
      if (f.y2 && b.year > f.y2) return false;
      if (f.status === "read" && !S.isRead(b.id)) return false;
      if (f.status === "want" && !S.isWant(b.id)) return false;
      if (f.status === "unread" && S.isRead(b.id)) return false;
      return true;
    });
  }

  // ---------------------------------------------------------- Сортировки
  const cmpStr = (a, b) => String(a).localeCompare(String(b), "ru");
  const SORTS = [
    { id: "rec", name: "Сначала главное", hint: "Классика и точки входа вперёд",
      cmp: (a, b) => a.rec - b.rec || (b.entry - a.entry) || (b.score ?? 0) - (a.score ?? 0),
      meta: (b) => (b.rec === 1 ? "Классика" : b.rec === 2 ? "Рекомендуем" : "Для фанатов") },
    { id: "tl", name: "Хронология мира", hint: "Когда происходят события",
      cmp: (a, b) => a.tl - b.tl || (a.series === b.series ? (a.seriesNo ?? 0) - (b.seriesNo ?? 0) : 0) || a.year - b.year,
      meta: (b) => b.tlLabel, group: "era" },
    { id: "year", name: "Год выхода", hint: "Когда книга вышла на английском",
      cmp: (a, b) => a.year - b.year || cmpStr(a.title, b.title), meta: (b) => String(b.year) },
    { id: "score", name: "Оценка читателей", hint: "Оценка FantLab с поправкой на число голосов",
      cmp: (a, b) => (b.score ?? -1) - (a.score ?? -1), meta: (b) => (b.rating ? `★ ${b.rating.toFixed(2)}` : "нет оценок"), dirFlip: true },
    { id: "popular", name: "Популярность", hint: "Сколько людей оценили книгу",
      cmp: (a, b) => b.voters - a.voters, meta: (b) => `${u.fmtNum(b.voters)} ${u.plural(b.voters, "оценка", "оценки", "оценок")}`, dirFlip: true },
    { id: "series", name: "По сериям", hint: "Серии по порядку книг",
      cmp: (a, b) => cmpStr(a.seriesName || "яяя", b.seriesName || "яяя") || (a.seriesNo ?? 999) - (b.seriesNo ?? 999) || a.tl - b.tl,
      meta: (b) => (b.series ? `${b.seriesName}${b.seriesNo ? " · " + b.seriesNo : ""}` : "Отдельная книга"), group: "series" },
    { id: "title", name: "Название", cmp: (a, b) => cmpStr(a.title, b.title), meta: (b) => b.authorsRu[0] },
    { id: "author", name: "Автор", cmp: (a, b) => cmpStr(a.authorsRu[0], b.authorsRu[0]) || a.year - b.year, meta: (b) => b.authorsRu[0], group: "author" },
    { id: "pages", name: "Толщина", hint: "Число страниц",
      cmp: (a, b) => (b.pages ?? 0) - (a.pages ?? 0), meta: (b) => (b.pages ? `~${b.pages} стр.` : "—"), dirFlip: true },
    { id: "random", name: "Случайно", cmp: null, meta: (b) => b.authorsRu[0] }
  ];
  const sortById = byKey(SORTS);
  let randomSeed = Date.now();
  function sortBooks(list, sortId, dir = 1) {
    const s = sortById[sortId] || SORTS[0];
    if (s.id === "random") return u.shuffle(list, u.rng(randomSeed));
    const arr = list.slice().sort(s.cmp);
    return dir === -1 ? arr.reverse() : arr;
  }
  function reshuffle() { randomSeed = Date.now(); }

  // ---------------------------------------------------------- Группировки
  const GROUPS = [
    { id: "none", name: "Без групп" },
    { id: "era", name: "Эпоха", key: (b) => b.era, label: (k) => eras[k]?.name, about: (k) => `${eras[k]?.range} · ${eras[k]?.about}`, order: (k) => eraOrder[k] },
    { id: "group", name: "Сторона", key: (b) => b.group, label: (k) => groups[k]?.name, order: (k) => ["imperium", "chaos", "xenos"].indexOf(k) },
    { id: "faction", name: "Фракция", key: (b) => b.factions[0], label: (k) => factions[k]?.name, order: (k) => facOrder[k] },
    { id: "series", name: "Серия", key: (b) => b.series || "~", label: (k) => (k === "~" ? "Отдельные книги" : series[k]?.name || k), order: null },
    { id: "author", name: "Автор", key: (b) => b.authors[0], label: (k) => AUTH[k] || k, order: null },
    { id: "decade", name: "Десятилетие", key: (b) => String(Math.floor(b.year / 10) * 10), label: (k) => `${k}-е`, order: (k) => Number(k) },
    { id: "segmentum", name: "Место в галактике", key: (b) => b.segmentum, label: (k) => segmenta[k]?.name, about: (k) => segmenta[k]?.about, order: (k) => META.segmenta.findIndex((s) => s.id === k) },
    { id: "rec", name: "Рекомендация", key: (b) => String(b.rec), label: (k) => META.recs[k - 1]?.name, about: (k) => META.recs[k - 1]?.hint, order: (k) => Number(k) }
  ];
  const groupById = byKey(GROUPS);

  // Возвращает [{key, label, about, books}] — порядок групп следует за сортировкой, если у группы нет своего порядка
  function groupBooks(list, groupId) {
    const g = groupById[groupId];
    if (!g || g.id === "none") return [{ key: "all", books: list }];
    const map = new Map();
    list.forEach((b, i) => {
      const k = g.key(b);
      if (!map.has(k)) map.set(k, { key: k, label: g.label(k) || k, about: g.about ? g.about(k) : "", books: [], first: i });
      map.get(k).books.push(b);
    });
    const arr = [...map.values()];
    if (g.order) arr.sort((a, b) => (g.order(a.key) ?? 999) - (g.order(b.key) ?? 999));
    else if (g.id === "series" || g.id === "author") arr.sort((a, b) => (a.key === "~") - (b.key === "~") || b.books.length - a.books.length || a.first - b.first);
    return arr;
  }

  // ---------------------------------------------------- Пути чтения
  const PATH_COLORS = ["#d4a84f", "#c9473f", "#4fb3a5", "#6f8fd6", "#b170c9", "#d1793f", "#8fb355", "#d06a92", "#5aa0c8", "#c7b45b"];
  const PATHS = (window.PATHS || []).map((p, i) => Object.assign({}, p, {
    color: p.color || PATH_COLORS[i % PATH_COLORS.length],
    books: p.steps.map((s) => byId.get(s.id)).filter(Boolean)
  }));

  // Ссылки на внешние каталоги
  function links(b) {
    const q = encodeURIComponent(b.titleEn);
    const out = [];
    if (b.fantlabId) out.push({ name: "FantLab", url: `https://fantlab.ru/work${b.fantlabId}` });
    out.push({ name: "Lexicanum", url: `https://wh40k.lexicanum.com/mediawiki/index.php?search=${q}` });
    out.push({ name: "Goodreads", url: `https://www.goodreads.com/search?q=${encodeURIComponent(b.titleEn + " " + (b.authors[0] || ""))}` });
    return out;
  }

  // Год выхода — диапазон
  const years = BOOKS.map((b) => b.year);
  const YEAR_MIN = Math.min(...years), YEAR_MAX = Math.max(...years);

  A.data = {
    META, CONFIG, BOOKS, byId, byN, factions, eras, tags, groups, segmenta, settings, formats, series, seriesBooks,
    AUTHORS: AUTHORS_LIST, authorMap, AUTH, SORTS, sortById, GROUPS, groupById, PATHS, GROUP_COLOR, GROUP_HEX,
    YEAR_MIN, YEAR_MAX, DEFAULT_LIB, descendants, topFaction, children,
    filterBooks, sortBooks, reshuffle, groupBooks, coverMode, coverUrl, links
  };
})(window.App);
