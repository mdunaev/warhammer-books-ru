// Скачивает с api.fantlab.ru деревья межавторских циклов и собирает список книг-кандидатов.
// Запуск: node tools/fetch-fantlab.mjs
// Результат: data/sources/fantlab/*.json (сырые ответы) и data/sources/candidates.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data/sources/fantlab");
fs.mkdirSync(outDir, { recursive: true });

// Корневые циклы Fantlab
const ROOTS = [
  { id: 40000, universe: "40k" },     // Warhammer 40,000 (включая Ересь Хоруса)
  { id: 1507007, universe: "whf" },   // Warhammer Fantasy Battles
  { id: 993733, universe: "aos" },    // Эра Сигмара
  { id: 1328606, universe: "40k" }    // Warhammer Crime
];
const TYPES = { "роман": "novel", "повесть": "novella", "антология": "anthology", "сборник": "anthology" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, cacheFile) {
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const res = await fetch(url, { headers: { "User-Agent": "scriptorium-fan-catalog/0.1 (non-commercial)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const data = await res.json();
  if (cacheFile) fs.writeFileSync(cacheFile, JSON.stringify(data));
  await sleep(400); // бережём сервер Fantlab
  return data;
}

const cyr = (s) => /[а-яё]/i.test(s || "");
const books = new Map();

for (const r of ROOTS) {
  const data = await getJson(`https://api.fantlab.ru/work/${r.id}/extended`, path.join(outDir, `cycle-${r.id}.json`));
  const stack = []; // цепочка родительских циклов по глубине
  for (const c of data.children || []) {
    const deep = Number(c.deep) || 1;
    stack.length = deep - 1;
    if (c.work_type === "цикл") { stack[deep - 1] = { id: c.work_id, ru: c.work_name, en: c.work_name_orig }; continue; }
    const type = TYPES[c.work_type];
    if (!type) continue;
    const series = stack.filter(Boolean).map((s) => s.ru || s.en);
    const prev = books.get(c.work_id);
    if (prev) { prev.seriesAlt.push(series.join(" / ")); continue; }
    books.set(c.work_id, {
      fantlabId: c.work_id,
      universe: r.universe,
      type,
      titleRu: cyr(c.work_name) ? c.work_name : null,
      titleEn: c.work_name_orig || (!cyr(c.work_name) ? c.work_name : null),
      year: c.work_year || null,
      authorsRu: (c.authors || []).map((a) => a.name),
      authorIds: (c.authors || []).map((a) => a.id),
      rating: c.val_midmark ? Number(c.val_midmark) : null,
      voters: Number(c.val_voters) || 0,
      series,
      seriesAlt: [],
      notFinished: !!c.work_notfinished,
      preparing: !!c.work_preparing
    });
  }
}

const list = [...books.values()].sort((a, b) => b.voters - a.voters);
fs.writeFileSync(path.join(root, "data/sources/candidates.json"), JSON.stringify(list, null, 1));

// Короткая сводка
const by = (arr, f) => arr.reduce((m, b) => ((m[f(b)] = (m[f(b)] || 0) + 1), m), {});
console.log("Всего произведений:", list.length);
console.log("По вселенным:", by(list, (b) => b.universe));
console.log("По типам:", by(list, (b) => b.type));
console.log("С русским названием:", list.filter((b) => b.titleRu).length);
for (const t of [5, 10, 20, 50]) {
  const sel = list.filter((b) => b.voters >= t);
  console.log(`>= ${t} оценок: ${sel.length}`, by(sel, (b) => b.universe));
}
const goodish = list.filter((b) => b.voters >= 10 && b.rating >= 7);
console.log("Оценок >= 10 и рейтинг >= 7:", goodish.length);
