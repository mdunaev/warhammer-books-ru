// Собирает data/books.js из:
//   data/sources/selection.json  — финальный список и данные Fantlab
//   data/raw/<chunk>.json        — подробности от исследования (эпоха, фракции, описание...)
//   data/sources/covers.json     — обложки и число страниц
//   tools/paths-curated.json     — пути чтения (если есть)
// Книги без подробностей получают заглушки и флаг stub: true.
// Запуск: node tools/build-data.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => path.join(root, ...a);
const readJson = (f, d = null) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(p("data/meta.js"), "utf8"), ctx);
const META = ctx.window.META;
const eraIds = new Set(META.eras.map((e) => e.id));

const selection = readJson(p("data/sources/selection.json"));
const covers = readJson(p("data/sources/covers.json"), {});
const key = (b) => (b.fantlabId != null ? String(b.fantlabId) : b.titleEn);

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Подробности из пачек
const enriched = new Map();
const series = new Map();
const authors = {};
const chunkPaths = [];
const rawDir = p("data/raw");
for (const f of fs.readdirSync(rawDir).filter((f) => f.endsWith(".json"))) {
  const data = readJson(path.join(rawDir, f));
  for (const s of data.series || []) if (!series.has(s.id)) series.set(s.id, s);
  Object.assign(authors, data.authors || {});
  for (const b of data.books || []) enriched.set(`${b.fantlabId ?? "-"}|${b.titleEn}`, b);
  for (const pth of data.paths || []) chunkPaths.push({ ...pth, source: f.replace(".json", "") });
}

// Псевдонимы: показываем имя с обложки
const AUTHOR_ALIAS = { "Alex Stewart": "Sandy Mitchell" };
// Русское имя псевдонима — тоже как на русских обложках (FantLab пишет настоящее имя)
const AUTHOR_ALIAS_RU = { "Sandy Mitchell": "Сэнди Митчелл" };
const clean = (s) => (typeof s === "string" ? s.replace(/[​-‍﻿]/g, "").trim() : s);
// Эпоха всегда считается по дате tl — так границы эпох едины для всех пачек
const eraByTl = (tl) => META.eras.find((e) => tl >= e.from && tl <= e.to)?.id;

let stubs = 0;
const books = selection.map((s) => {
  const e = enriched.get(`${s.fantlabId ?? "-"}|${s.titleEn}`);
  s.authorsEn.forEach((en, i) => { if (!authors[en]) authors[en] = s.authorsRu[i] || en; });
  const c = covers[key(s)] || {};
  const base = {
    id: slug(s.titleEn),
    n: s.fantlabId != null ? s.fantlabId.toString(36) : slug(s.titleEn),
    fantlabId: s.fantlabId,
    titleRu: s.titleRu,
    titleEn: s.titleEn,
    ru: s.ru,
    ruYear: s.ruYear,
    authors: s.authorsEn,
    year: s.year,
    rating: s.rating,
    voters: s.voters,
    pages: c.pages || null,
    cover: { ru: c.ru || null, en: c.en || null }
  };
  if (e) {
    return {
      ...base,
      id: e.id || base.id,
      titleRu: e.titleRu ?? base.titleRu,
      ru: e.ru ?? base.ru,
      ruYear: e.ruYear ?? base.ruYear,
      authors: e.authors?.length ? e.authors : base.authors,
      year: e.year || base.year,
      setting: e.setting, series: e.series ?? null, seriesNo: e.seriesNo ?? null, format: e.format,
      factions: e.factions, era: e.era, tl: e.tl, tlLabel: e.tlLabel, tlApprox: !!e.tlApprox,
      place: e.place, segmentum: e.segmentum, tags: e.tags, rec: e.rec, entry: !!e.entry,
      heroes: e.heroes || [], desc: e.desc, hook: e.hook, prereq: e.prereq || [], note: e.note || null
    };
  }
  stubs++;
  const hh = s.series[0] === "Ересь Хоруса";
  return {
    ...base, stub: true,
    setting: hh ? "hh" : "40k", series: null, seriesNo: null, format: s.type,
    factions: hh ? ["astartes"] : ["imperium"], era: hh ? "heresy" : "dark-millennium",
    tl: hh ? 30008 : 40500, tlLabel: hh ? "~M31" : "~M41", tlApprox: true,
    place: "—", segmentum: "many", tags: ["war", "epic"], rec: 2, entry: false,
    heroes: [], desc: "Описание скоро появится.", hook: "", prereq: [], note: null
  };
});

for (const b of books) {
  b.titleEn = clean(b.titleEn);
  b.titleRu = clean(b.titleRu);
  b.authors = b.authors.map((a) => AUTHOR_ALIAS[a] || a);
  const era = eraByTl(b.tl);
  if (era && era !== b.era) { console.log(`эпоха по дате: ${b.id} ${b.era} → ${era}`); b.era = era; }
}
for (const [real, pen] of Object.entries(AUTHOR_ALIAS)) authors[pen] = AUTHOR_ALIAS_RU[pen] || authors[pen] || authors[real] || pen;

// Уникальность id по всему каталогу (а не только внутри пачки): фамилия автора, затем номер
const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const seen = new Set();
for (const b of books) {
  if (!SAFE.test(b.id)) { console.warn("небезопасный id, заменён на slug:", b.id); b.id = slug(b.titleEn) || "book"; }
  if (seen.has(b.id)) {
    const base = `${b.id}-${slug(b.authors[0] || "x").split("-").pop() || "x"}`;
    let id = base, k = 2;
    while (seen.has(id)) id = `${base}-${k++}`;
    console.warn("повтор id:", b.id, "→", id);
    b.id = id;
  }
  seen.add(b.id);
  if (!eraIds.has(b.era)) console.warn("неизвестная эпоха:", b.id, b.era);
}
// «Можно начинать с неё» — короткий ручной список вместо щедрых отметок исследования
const entryList = readJson(p("tools/entry-curated.json"), null);
if (entryList) {
  const set = new Set(entryList.ids);
  for (const id of set) if (!books.some((b) => b.id === id)) console.warn("entry-curated: нет книги", id);
  for (const b of books) b.entry = set.has(b.id);
}

const nSeen = new Set();
for (const b of books) { if (nSeen.has(b.n)) throw new Error(`повтор кода книги n=${b.n} (${b.id})`); nSeen.add(b.n); }

// Пути чтения: ручные + предложенные исследованием. Убираем шаги с неизвестными книгами.
const ids = new Set(books.map((b) => b.id));
const cur = readJson(p("tools/paths-curated.json"), { paths: [], order: [], hide: [] });
// Автоматический путь: вся основная серия Ереси по номерам, затем «Осада Терры» в порядке её пути
// Пути по целой серии: "series:<id>" — по номерам, "series-year:<id>" — по году выхода.
// Подписи шагов берутся из пути, предложенного исследованием, если он есть.
for (const pth of cur.paths) {
  const m = /^(series|series-year):(.+)$/.exec(pth.auto || "");
  if (!m) continue;
  const inSeries = books.filter((b) => b.series === m[2]);
  inSeries.sort(m[1] === "series"
    ? (a, b) => (a.seriesNo ?? 999) - (b.seriesNo ?? 999) || a.tl - b.tl
    : (a, b) => a.year - b.year || (a.seriesNo ?? 999) - (b.seriesNo ?? 999));
  const old = chunkPaths.find((x) => x.id === pth.id);
  pth.steps = inSeries.map((b) => ({ id: b.id, note: old?.steps.find((s) => s.id === b.id)?.note || b.hook || "" }));
}
for (const pth of cur.paths) {
  if (pth.auto !== "heresy-all") continue;
  const main = books.filter((b) => b.series === "horus-heresy")
    .sort((a, b) => (a.seriesNo ?? 999) - (b.seriesNo ?? 999) || a.year - b.year);
  const siegePath = chunkPaths.find((x) => x.id === "path-siege-of-terra");
  const siege = siegePath ? siegePath.steps.map((s) => s.id) : books.filter((b) => b.series === "siege-of-terra").map((b) => b.id);
  pth.steps = [...main.map((b) => ({ id: b.id, note: b.seriesNo ? `Книга № ${b.seriesNo}` : "Отдельный роман серии" })),
    ...siege.map((id) => ({ id, note: "Осада Терры" }))];
}
const all = [...cur.paths, ...chunkPaths.filter((cp) => !cur.paths.some((c) => c.id === cp.id))]
  .filter((pth) => !(cur.hide || []).includes(pth.id));
const rank = (id) => { const i = (cur.order || []).indexOf(id); return i < 0 ? 999 : i; };
all.sort((a, b) => rank(a.id) - rank(b.id));
const paths = all
  .map((pth) => {
    const steps = (pth.steps || []).filter((s) => ids.has(s.id));
    const dropped = (pth.steps || []).length - steps.length;
    if (dropped) console.warn(`путь ${pth.id}: убрано шагов с неизвестными книгами: ${dropped}`);
    return { ...pth, steps };
  })
  .filter((pth) => pth.steps.length >= 3);

const header = "// Сгенерировано tools/build-data.mjs. Не редактировать вручную.\n";
fs.writeFileSync(p("data/books.js"),
  header +
  `window.BOOKS = ${JSON.stringify(books)};\n` +
  `window.SERIES = ${JSON.stringify([...series.values()])};\n` +
  `window.AUTHORS = ${JSON.stringify(authors)};\n` +
  `window.PATHS = ${JSON.stringify(paths)};\n` +
  `window.DATA_BUILT = ${JSON.stringify(new Date().toISOString().slice(0, 10))};\n`);

console.log(`Книг: ${books.length} (с подробностями ${books.length - stubs}, заглушек ${stubs})`);
console.log(`Серий: ${series.size}, авторов: ${Object.keys(authors).length}, путей чтения: ${paths.length}`);
console.log(`Размер: ${Math.round(fs.statSync(p("data/books.js")).size / 1024)} КБ`);
await import("./stamp-assets.mjs"); // свежие отпечатки файлов в index.html
