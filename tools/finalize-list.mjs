// Финальный список книг: черновик + дополнения, данные о переводе и обложках с Fantlab,
// английские имена авторов, раскладка по пачкам для сбора подробностей.
// Запуск: node tools/finalize-list.mjs
// Результат: data/sources/selection.json и data/raw/in/<chunk>.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => path.join(root, "data/sources", f);
const cacheDir = src("fantlab");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fantlab(kind, id) {
  const file = path.join(cacheDir, `${kind}-${id}.json`);
  if (fs.existsSync(file)) return readJson(file);
  const url = kind === "work" ? `https://api.fantlab.ru/work/${id}/extended` : `https://api.fantlab.ru/autor/${id}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "scriptorium-fan-catalog/0.1 (non-commercial)" } });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      fs.writeFileSync(file, JSON.stringify(data));
      await sleep(350);
      return data;
    } catch (e) {
      await sleep(1500);
    }
  }
  console.warn("не скачалось:", url);
  return null;
}

const all = readJson(src("candidates.json")).filter((b) => b.universe === "40k");
const byId = new Map(all.map((b) => [b.fantlabId, b]));
const draft = readJson(src("draft-list.json"));
const picked = new Map(draft.map((b) => [b.fantlabId, b]));

// 1. Ересь Хоруса целиком: все романы основной серии
for (const b of all) {
  if (b.type === "novel" && b.series.length === 1 && b.series[0] === "Ересь Хоруса" && !picked.has(b.fantlabId)) {
    picked.set(b.fantlabId, { ...b, why: "серия целиком" });
  }
}
// 2. Книги, которые не нашлись по названию
for (const t of ["First & Only", "Shadowsun: The Patient Hunter"]) {
  const b = all.find((x) => x.titleEn === t);
  if (b && !picked.has(b.fantlabId)) picked.set(b.fantlabId, { ...b, why: "обязательная" });
}
// 3. Дыры в сериях (добавлены после первого сбора; идут отдельной пачкой «extras»)
const EXTRAS = ["His Last Command", "Blood Pact", "Salvations Reach", "Vainglorious", "Tales of Heresy", "The Primarchs",
  "The Wolftime", "Traitor Rock", "Hive. Part Two", "Mark of Calth", "Legacies of Betrayal", "War Without End",
  "Eye of Terra", "Shattered Legions", "Born of Flame"];
for (const t of EXTRAS) {
  const b = all.filter((x) => x.titleEn === t).sort((p, q) => q.voters - p.voters)[0];
  if (b && !picked.has(b.fantlabId)) picked.set(b.fantlabId, { ...b, why: "серия целиком", extra: true });
  else if (!b) console.warn("нет на Fantlab:", t);
}

const books = [...picked.values()];

// 3. Подробности с Fantlab: перевод, обложка, число страниц
// Сначала загружаем все карточки: нужно знать, какие издания общие у нескольких книг (сборники).
const authorIds = new Set();
const works = new Map();
for (const b of books) {
  b.authorIds.forEach((a) => authorIds.add(a));
  const w = await fantlab("work", b.fantlabId);
  // Без ответа Fantlab нельзя определить перевод: лучше остановиться, чем записать неправду
  if (!w) throw new Error(`Fantlab не ответил по книге ${b.titleEn} (${b.fantlabId}). Повторите позже.`);
  works.set(b.fantlabId, w);
}
const allEditions = (w) => Object.values(w.editions_blocks || {}).flatMap((x) => x.list || []);
const editionUse = new Map();
for (const w of works.values()) for (const e of allEditions(w)) editionUse.set(e.edition_id, (editionUse.get(e.edition_id) || 0) + 1);
const normName = (s) => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();

for (const b of books) {
  const w = works.get(b.fantlabId);
  const blocks = Object.values(w.editions_blocks || {});
  const list = (title) => blocks.filter((x) => x.title === title).flatMap((x) => x.list || []);
  const ruPaper = list("Издания").filter((e) => e.lang_code === "ru");
  const ruFan = list("Самиздат и фэнзины").filter((e) => e.lang_code === "ru");
  const ruEbook = blocks.filter((x) => /Электронные/.test(x.title)).flatMap((x) => x.list || []).filter((e) => e.lang_code === "ru");
  // «Оригинал» — только английское издание, а не первое попавшееся иностранное
  const foreign = list("Издания на иностранных языках").filter((e) => e.lang_code === "en");
  const ruTranslation = (w.translations || []).some((t) => t.lang_code === "ru");
  // Фанатский перевод — только при подтверждении: самиздат-издание или перевод в карточке Fantlab
  b.ru = ruPaper.length || ruEbook.length ? "official" : (ruFan.length || (b.titleRu && ruTranslation)) ? "fan" : null;
  if (!b.ru) b.titleRu = null;

  // Сборник (омнибус): издание общее у нескольких книг каталога или очень толстое с другим названием.
  // Его обложка и толщина к отдельной книге не относятся.
  const titles = [b.titleRu, b.titleEn].map(normName).filter(Boolean);
  const sameName = (e) => titles.some((t) => normName(e.name).includes(t) || t.includes(normName(e.name)));
  const omnibus = (e) => (editionUse.get(e.edition_id) || 0) > 1 || ((Number(e.pages) || 0) >= 760 && !sameName(e));
  const single = (arr) => arr.filter((e) => !omnibus(e));
  const pic = (e) => (e && e.pic_num > 0 ? `https://fantlab.ru/images/editions/big/${e.edition_id}` : null);
  const newestPic = (arr) => pic(single(arr).filter((e) => e.pic_num > 0).sort((x, y) => (y.year || 0) - (x.year || 0))[0]);
  const firstPic = (arr) => pic(single(arr).filter((e) => e.pic_num > 0).sort((x, y) => (x.year || 9999) - (y.year || 9999))[0]);
  b.covers = {
    // Русская: самое новое отдельное издание; для фанатских переводов — самиздат. Оригинал: первое отдельное английское.
    ru: b.ru === "official" ? newestPic(ruPaper) : b.ru === "fan" ? newestPic(ruFan) : null,
    en: firstPic(foreign),
    any: null
  };
  // Толщина — по отдельным изданиям (сначала русским, потом английским)
  const pagesOf = (arr) => single(arr).map((e) => Number(e.pages)).filter((n) => n > 40 && n < 1500).sort((x, y) => x - y);
  const pr = pagesOf(ruPaper), pe = pagesOf(foreign);
  const pp = pr.length ? pr : pe;
  b.pages = pp.length ? pp[Math.floor(pp.length / 2)] : null;
  b.ruYear = ruPaper.length ? Math.min(...ruPaper.map((e) => e.year || 9999)) : null;
}

// 4. Английские имена авторов
const authorsEn = {};
for (const id of authorIds) {
  const a = await fantlab("autor", id);
  authorsEn[id] = { ru: a?.name || null, en: a?.name_orig || a?.name || null };
}
for (const b of books) {
  b.authorsEn = b.authorIds.map((id) => authorsEn[id]?.en).filter(Boolean);
}

// 5. Книга без записи на Fantlab
books.push({
  fantlabId: null, universe: "40k", type: "novel", titleRu: null, titleEn: "Severed", year: 2019,
  authorsRu: ["Нейт Кроули"], authorsEn: ["Nate Crowley"], authorIds: [], rating: null, voters: 0,
  series: [], seriesAlt: [], ru: null, covers: { ru: null, en: null, any: null }, ruYear: null, why: "обязательная"
});

// 6. Раскладка по пачкам
const CHUNKS = {
  "extras": (b) => !!b.extra,
  "hh-a": (b) => b.series[0] === "Ересь Хоруса" && b.series.length === 1 && b.year <= 2012,
  "hh-b": (b) => b.series[0] === "Ересь Хоруса" && (b.series.length === 1 || b.series[1] === "Ересь Хоруса. Персонажи") && !(b.series.length === 1 && b.year <= 2012),
  "hh-c": (b) => b.series[0] === "Ересь Хоруса",
  "guard-a": (b) => ["Миры Саббат", "Кайафас Каин"].includes(b.series[0]),
  "guard-b": (b) => ["Имперская Гвардия", "Астра Милитарум", "Кадия", "Крестовый поход Махариуса", "Лорд Солар Махариус",
    "Сверхтяжёлые танки", "Тёмный клубок", "Люсиль фон Шард"].includes(b.series[0]),
  "inquisition": (b) => ["Инквизитор", "Крипты Терры", "Тёмная ересь", "Warhammer Crime", "Warhammer Horror 40,000", "Арбитр",
    "Некромунда", "Ассасинорум", "Сестра Августа Сантора", "Хранители Трона", "Кузницы Марса", "Велизарий Коул", "Hive",
    "Castellan Crowe Series"].includes(b.series[0]),
  "astartes": (b) => ["Битвы Космодесанта", "Космический Волк", "Испивающие Души", "Ультрамарины", "Кровь Асахейма", "Караул Смерти",
    "Кархародоны", "Серые Рыцари", "Легенды Космического Десанта", "Мефистон", "Железные Змеи", "Завоевания Космодесанта"].includes(b.series[0]),
  "chaos-xenos": (b) => ["Ариман", "Фабий Байл", "Повелители Ночи", "Чёрный Легион", "Word Bearers", "Железные Воины", "Люций",
    "Пути эльдаров", "Пути тёмных эльдаров", "Дважды мёртвый царь", "Тразин Неисчислимый и Орикан Предсказатель",
    "Уфтхак Чёрный Гребень", "Farsight"].includes(b.series[0]) || ["Severed", "Shadowsun: The Patient Hunter"].includes(b.titleEn),
  "modern-misc": () => true
};
for (const b of books) b.chunk = Object.entries(CHUNKS).find(([, f]) => f(b))[0];

fs.writeFileSync(src("selection.json"), JSON.stringify(books, null, 1));

const inDir = path.join(root, "data/raw/in");
fs.mkdirSync(inDir, { recursive: true });
for (const chunk of Object.keys(CHUNKS)) {
  const part = books.filter((b) => b.chunk === chunk);
  const authors = {};
  part.forEach((b) => b.authorsEn.forEach((en, i) => (authors[en] = b.authorsRu[i] || en)));
  const input = part.map((b) => ({
    fantlabId: b.fantlabId, titleEn: b.titleEn, titleRu: b.titleRu, ru: b.ru, authors: b.authorsEn, year: b.year,
    fantlabType: b.type, fantlabSeries: b.series.join(" / "), fantlabRating: b.rating, fantlabVoters: b.voters
  }));
  fs.writeFileSync(path.join(inDir, `${chunk}.json`), JSON.stringify({ chunk, authors, books: input }, null, 1));
  console.log(chunk.padEnd(12), part.length);
}
console.log("Всего:", books.length, "| перевод:", ["official", "fan", null].map((r) => `${r}=${books.filter((b) => b.ru === r).length}`).join(" "));
console.log("Обложка Fantlab есть:", books.filter((b) => b.covers.ru || b.covers.en || b.covers.any).length);
