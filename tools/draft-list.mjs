// Черновой отбор ~250 книг по 40K и Ереси Хоруса.
// Берёт лучшие по оценкам Fantlab и добавляет обязательные книги, которым не хватило голосов.
// Запуск: node tools/draft-list.mjs
// Результат: data/sources/draft-list.json и data/sources/draft-list.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const all = JSON.parse(fs.readFileSync(path.join(root, "data/sources/candidates.json"), "utf8"));
const L = all.filter((b) => b.universe === "40k");

const AUTO_COUNT = 205;

// Байесовская оценка: мало голосов -> тянем к среднему. Плюс бонус за популярность.
const C = 7.5, M = 40;
const score = (b) => {
  const v = b.voters, r = b.rating ?? C;
  return (v / (v + M)) * r + (M / (v + M)) * C + 0.45 * Math.log10(v + 1);
};

// Обязательные книги: важны для серий и лора, но у них мало русских оценок (новые или без перевода).
const MUST = [
  "First and Only", "The Master of Mankind", "The Talon of Horus", "Plague War", "Godblight",
  "Gate of Bones", "The Silent King", "Throne of Light", "The Iron Kingdom", "The Martyr's Tomb",
  "Sea of Souls", "Hand of Abaddon", "Path of the Warrior", "Path of the Seer", "Path of the Outcast",
  "The Twice-Dead King: Ruin", "The Twice-Dead King: Reign", "Severed", "Warboss", "Day of Ascension",
  "Farsight: Crisis of Faith", "Shadowsun: The Last of Kiru's Line", "Leviathan", "Krieg", "Cadia Stands",
  "Cadian Honour", "Creed: Ashes of Cadia", "Steel Tread", "Grim Repast", "The Emperor's Legion",
  "The Regent's Shadow", "Assassinorum: Kingmaker", "Mephiston: Blood of Sanguinius", "The Bloodied Rose",
  "Lucius: The Faultless Blade", "Lords of Silence", "Angron: The Red Angel", "Urdesh: The Serpent and the Saint",
  "Interceptor City", "Brothers of the Snake", "Witchbringer", "Castellan", "Sepulturum", "Fall of Cadia",
  "Indomitus", "Spear of the Emperor", "Ahriman: Sorcerer", "Ahriman: Unchanged", "Fabius Bile: Clonelord",
  "Fabius Bile: Manflayer", "Path of the Incubus", "Path of the Archon", "Valedor", "Shroud of Night",
  "Infinite and the Divine", "Dark Imperium", "The Lion: Son of the Forest", "Bloodlines", "Hive. Part One"
];

const norm = (s) => (s || "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
const byTitle = new Map();
for (const b of L) {
  const k = norm(b.titleEn);
  if (!byTitle.has(k) || byTitle.get(k).voters < b.voters) byTitle.set(k, b);
}
const findMust = (t) => {
  const k = norm(t);
  if (byTitle.has(k)) return byTitle.get(k);
  // Fantlab часто пишет «Серия: Название». Ищем по вхождению.
  const hits = L.filter((b) => { const n = norm(b.titleEn); return n.endsWith(k) || n.includes(k); });
  return hits.sort((a, b) => b.voters - a.voters)[0] || null;
};

let pool = L.filter((b) => b.voters >= 12 && (b.rating ?? 0) >= 6.9);
pool = pool.filter((b) => b.type !== "anthology" || (b.voters >= 60 && b.rating >= 7.6));
pool.sort((a, b) => score(b) - score(a));

const picked = new Map();
for (const b of pool.slice(0, AUTO_COUNT)) picked.set(b.fantlabId, { ...b, why: "оценки" });
const missing = [];
for (const t of MUST) {
  const b = findMust(t);
  if (!b) { missing.push(t); continue; }
  if (!picked.has(b.fantlabId)) picked.set(b.fantlabId, { ...b, why: "обязательная" });
}

const list = [...picked.values()].sort((a, b) =>
  (a.series[0] || "яя").localeCompare(b.series[0] || "яя", "ru") || (a.year || 0) - (b.year || 0));
fs.writeFileSync(path.join(root, "data/sources/draft-list.json"), JSON.stringify(list, null, 1));

// Читаемая таблица
const esc = (s) => String(s ?? "").replace(/\|/g, "/");
let md = `# Черновой список: ${list.length} книг (40K и Ересь Хоруса)\n\n`;
md += `Отбор: ${AUTO_COUNT} лучших по оценкам Fantlab + обязательные книги, которым не хватило голосов.\n`;
md += `Колонка «Почему»: «оценки» — прошла по рейтингу, «обязательная» — добавлена вручную.\n\n`;
if (missing.length) md += `Не нашлись на Fantlab (добавить вручную): ${missing.join(", ")}\n\n`;
let cur = null;
for (const b of list) {
  const s = b.series[0] || "Вне серий";
  if (s !== cur) { cur = s; md += `\n## ${s}\n\n| Название | Оригинал | Автор | Год | Оценка | Голосов | Почему |\n|---|---|---|---|---|---|---|\n`; }
  md += `| ${esc(b.titleRu || "—")} | ${esc(b.titleEn)} | ${esc(b.authorsRu.join(", "))} | ${b.year ?? ""} | ${b.rating ?? ""} | ${b.voters} | ${b.why} |\n`;
}
fs.writeFileSync(path.join(root, "data/sources/draft-list.md"), md);

const cnt = (f) => list.reduce((m, b) => ((m[f(b)] = (m[f(b)] || 0) + 1), m), {});
console.log("Всего в черновике:", list.length);
console.log("Почему:", cnt((b) => b.why));
console.log("Есть русский перевод:", list.filter((b) => b.titleRu).length);
console.log("Не нашлись:", missing);
