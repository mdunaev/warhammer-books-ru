// Проверка файлов data/raw/<chunk>.json по правилам data/raw/_SPEC.md.
// Запуск: node tools/validate-chunk.mjs data/raw/hh-a.json [ещё файлы...]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/meta.js"), "utf8"), ctx);
const META = ctx.window.META;

const ids = (arr) => new Set(arr.map((x) => x.id));
const settings = ids(META.settings);
const factions = ids(META.factions);
const tags = ids(META.tags);
const formats = ids(META.formats);
const segmenta = ids(META.segmenta);
const eras = Object.fromEntries(META.eras.map((e) => [e.id, e]));

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let total = 0;
let errors = 0;
const err = (file, id, msg) => { errors++; console.log(`  ✗ ${path.basename(file)} [${id}] ${msg}`); };

for (const file of process.argv.slice(2)) {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { err(file, "-", "JSON не читается: " + e.message); continue; }

  // Сверка с входным списком
  const inFile = path.join(path.dirname(file), "in", path.basename(file));
  if (fs.existsSync(inFile)) {
    const input = JSON.parse(fs.readFileSync(inFile, "utf8")).books;
    const key = (b) => `${b.fantlabId ?? "-"}|${b.titleEn}`;
    const out = new Set((data.books || []).map((b) => `${b.fantlabId ?? "-"}|${b.titleEn}`));
    const inp = new Set(input.map(key));
    for (const k of inp) if (!out.has(k)) err(file, k, "книга из входного списка пропала (fantlabId и titleEn должны совпадать)");
    for (const k of out) if (!inp.has(k)) err(file, k, "лишняя книга, её нет во входном списке");
  }

  const seriesIds = new Set((data.series || []).map((s) => s.id));
  const authors = data.authors || {};
  const seen = new Set();
  for (const s of data.series || []) {
    if (!s.id || !s.name || !s.nameEn || !settings.has(s.setting)) err(file, s.id, "серия: нужны id, name, nameEn, setting (40k|hh)");
  }
  for (const b of data.books || []) {
    total++;
    const id = b.id || "?";
    if (!("fantlabId" in b)) err(file, id, "нет поля fantlabId (может быть null)");
    if (seen.has(id)) err(file, id, "дубликат id");
    seen.add(id);
    if (!b.titleEn) err(file, id, "нет titleEn");
    else if (!(id === slug(b.titleEn) || (id.startsWith(slug(b.titleEn) + "-") && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))))
      err(file, id, `id должен быть slug("${b.titleEn}") = ${slug(b.titleEn)} или slug плюс «-фамилия» (только a-z, 0-9 и дефисы)`);
    if (!["official", "fan", null].includes(b.ru ?? null)) err(file, id, "ru должен быть official|fan|null");
    if (b.ru && !b.titleRu) err(file, id, "ru задан, а titleRu пустой");
    if (!b.ru && b.titleRu) err(file, id, "titleRu есть, а ru = null");
    if (!Array.isArray(b.authors) || !b.authors.length) err(file, id, "нет authors");
    else for (const a of b.authors) if (!authors[a]) err(file, id, `автора "${a}" нет в карте authors`);
    if (!Number.isInteger(b.year) || b.year < 1985 || b.year > 2027) err(file, id, "странный year");
    if (!settings.has(b.setting)) err(file, id, "setting должен быть 40k|hh");
    if (b.series != null && !seriesIds.has(b.series)) err(file, id, `серии "${b.series}" нет в series`);
    if (b.seriesNo != null && typeof b.seriesNo !== "number") err(file, id, "seriesNo должен быть числом или null");
    if (!formats.has(b.format)) err(file, id, "плохой format");
    if (!Array.isArray(b.factions) || !b.factions.length || b.factions.length > 4) err(file, id, "factions: 1-4 шт.");
    else for (const f of b.factions) if (!factions.has(f)) err(file, id, `неизвестная фракция "${f}"`);
    const era = eras[b.era];
    if (!era) err(file, id, `неизвестная эпоха "${b.era}"`);
    else {
      if (b.setting === "hh" && era.to > 30014) err(file, id, `сеттинг hh, а эпоха ${b.era} после Ереси`);
      if (b.setting === "40k" && era.from < 30015) err(file, id, `сеттинг 40k, а эпоха ${b.era} до конца Ереси`);
      if (!Number.isFinite(b.tl) || b.tl < era.from || b.tl > era.to) err(file, id, `tl=${b.tl} вне диапазона эпохи ${b.era} [${era.from}..${era.to}]`);
    }
    if (!b.tlLabel) err(file, id, "нет tlLabel");
    if (typeof b.tlApprox !== "boolean") err(file, id, "tlApprox должен быть true/false");
    if (!b.place) err(file, id, "нет place");
    if (!segmenta.has(b.segmentum)) err(file, id, `неизвестный segmentum "${b.segmentum}"`);
    if (!Array.isArray(b.tags) || b.tags.length < 2 || b.tags.length > 5) err(file, id, "tags: 2-5 шт.");
    else for (const t of b.tags) if (!tags.has(t)) err(file, id, `неизвестный тег "${t}"`);
    if (![1, 2, 3].includes(b.rec)) err(file, id, "rec должен быть 1|2|3");
    if (typeof b.entry !== "boolean") err(file, id, "entry должен быть true/false");
    if (!b.desc || b.desc.length < 140 || b.desc.length > 420) err(file, id, `desc длиной ${b.desc ? b.desc.length : 0} (нужно 180-350)`);
    if (b.desc && !/[а-яё]/i.test(b.desc)) err(file, id, "desc не на русском");
    if (!b.hook || b.hook.length > 110) err(file, id, `hook длиной ${b.hook ? b.hook.length : 0} (нужно до 90)`);
    if (b.prereq && !Array.isArray(b.prereq)) err(file, id, "prereq должен быть массивом");
  }
  for (const p of data.paths || []) {
    if (!p.id || !p.name || !Array.isArray(p.steps)) err(file, p.id, "путь: нужны id, name, steps");
  }
  console.log(`${path.basename(file)}: книг ${data.books?.length ?? 0}, серий ${data.series?.length ?? 0}, путей ${data.paths?.length ?? 0}`);
}
console.log(errors ? `\nОшибок: ${errors}` : `\nOK (${total} книг)`);
process.exit(errors ? 1 : 0);
