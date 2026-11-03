// Обложки и число страниц для книг из data/sources/selection.json.
// Fantlab: обложки русского и оригинального изданий (уже в selection.json).
// Open Library: оригинальная обложка, если на Fantlab её нет.
// Запуск: node tools/covers.mjs
// Результат: data/sources/covers.json  { "<fantlabId|titleEn>": { ru, en, pages } }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => path.join(root, "data/sources", f);
const books = JSON.parse(fs.readFileSync(src("selection.json"), "utf8"));
const outFile = src("covers.json");
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (b) => (b.fantlabId != null ? String(b.fantlabId) : b.titleEn);

// Возвращает { ok, url }. ok = false — сеть или сервер подвели, такую книгу спросим в следующий раз.
async function openLibrary(b) {
  const params = new URLSearchParams({ title: b.titleEn, fields: "title,author_name,cover_i,first_publish_year", limit: "5" });
  if (b.authorsEn?.[0]) params.set("author", b.authorsEn[0].split(" ").slice(-1)[0]);
  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, { headers: { "User-Agent": "scriptorium-fan-catalog/0.1" } });
    if (!res.ok) return { ok: false, url: null };
    const data = await res.json();
    const doc = (data.docs || []).find((d) => d.cover_i);
    return { ok: true, url: doc ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null };
  } catch { return { ok: false, url: null }; } finally { await sleep(900); }
}

function pages(b) {
  if (b.fantlabId == null) return null;
  const f = path.join(src("fantlab"), `work-${b.fantlabId}.json`);
  if (!fs.existsSync(f)) return null;
  const w = JSON.parse(fs.readFileSync(f, "utf8"));
  const eds = Object.values(w.editions_blocks || {}).flatMap((x) => x.list || []);
  const p = eds.map((e) => Number(e.pages)).filter((n) => n > 40 && n < 2000).sort((a, b) => a - b);
  return p.length ? p[Math.floor(p.length / 2)] : null;
}

let olHits = 0;
for (const b of books) {
  const k = key(b);
  const rec = out[k] || {};
  rec.ru = b.covers?.ru || null;
  // Ручные обложки (manual) не трогаем. Иначе: английское издание с Fantlab, потом Open Library.
  // Старое значение rec.en не переносим — оно могло быть взято по устаревшим правилам.
  if (!(rec.manual && rec.en)) {
    rec.en = b.covers?.en || null;
    if (!rec.en) {
      if (!rec.olOk) {
        const r = await openLibrary(b);
        if (r.ok) { rec.olOk = true; rec.olUrl = r.url; if (r.url) olHits++; }
      }
      rec.en = rec.olUrl || null;
    }
  }
  delete rec.olTried;
  if (!rec.ru && !rec.en) rec.en = b.covers?.any || null;
  rec.pages = b.pages !== undefined ? b.pages : pages(b); // толщина без сборников (считает finalize-list)
  out[k] = rec;
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
}
// Одна и та же обложка Open Library у нескольких книг — поиск промахнулся (часто это сборник). Снимаем у всех.
const byUrl = new Map();
for (const [k, rec] of Object.entries(out)) if (rec.en && !rec.manual && rec.en.includes("openlibrary")) byUrl.set(rec.en, [...(byUrl.get(rec.en) || []), k]);
for (const [url, keys] of byUrl) {
  if (keys.length < 2) continue;
  console.log("Общая обложка Open Library снята:", keys.join(", "), url);
  for (const k of keys) { out[k].en = null; out[k].olUrl = null; }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

const vals = Object.values(out);
console.log("Книг:", vals.length);
console.log("Русская обложка:", vals.filter((v) => v.ru).length, "| оригинальная:", vals.filter((v) => v.en).length, "| нет никакой:", vals.filter((v) => !v.ru && !v.en).length);
console.log("Найдено в Open Library:", olHits, "| со страницами:", vals.filter((v) => v.pages).length);
