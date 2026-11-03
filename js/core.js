/* Основа: помощники и личные данные читателя (хранятся только в этом браузере). */
window.App = window.App || {};

(function (A) {
  "use strict";

  // ------------------------------------------------------------ Помощники
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ROMAN = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  function roman(n) {
    if (!n || n < 1 || n !== Math.floor(n)) return n ? String(n) : "";
    let s = "";
    for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; }
    return s;
  }

  // Русские окончания: plural(5, "книга", "книги", "книг")
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  const books = (n) => `${n} ${plural(n, "книга", "книги", "книг")}`;
  const fmtNum = (n) => Number(n).toLocaleString("ru-RU");

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === "number" ? seed : hash(String(seed));
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function shuffle(arr, rand = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const mq = (q) => window.matchMedia(q).matches;
  const reduced = () => mq("(prefers-reduced-motion: reduce)");
  const touch = () => mq("(hover: none)");
  const mobile = () => mq("(max-width: 680px)");

  // base64url для JSON (поддерживает кириллицу)
  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    try {
      const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { return null; }
  }

  A.u = { $, $$, esc, clamp, roman, plural, books, fmtNum, hash, rng, debounce, shuffle, reduced, touch, mobile, encode, decode };

  // ------------------------------------------------- Личные данные читателя
  const KEY = "scriptorium.v1";
  const blank = () => ({ v: 1, read: {}, want: {}, rating: {}, lists: [], prefs: {} });
  let state = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
  } catch { /* приватный режим или запрет хранилища — работаем без сохранения */ }

  const listeners = new Set();
  let storageOk = true;
  function save(change) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch {
      // Приватный режим или нет места: предупреждаем один раз, работаем дальше в памяти
      if (storageOk) { storageOk = false; window.dispatchEvent(new CustomEvent("scriptorium:storage-failed")); }
    }
    listeners.forEach((fn) => fn(change));
  }
  // Отметки в другой вкладке: подхватываем, чтобы не затереть их старым снимком
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = Object.assign(blank(), JSON.parse(e.newValue || "{}"));
      listeners.forEach((fn) => fn({ type: "import" }));
    } catch { /* битые данные из другой вкладки игнорируем */ }
  });

  // Проверка данных из файла: только ожидаемые типы, безопасные id списков
  const SAFE_ID = /^l[a-z0-9]{2,40}$/;
  const newListId = () => "l" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  function cleanMarks(obj) {
    const out = {};
    if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) {
      if (typeof k === "string" && k.length < 200 && Number.isFinite(Number(v))) out[k] = Number(v);
    }
    return out;
  }

  const S = {
    get state() { return state; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    isRead: (id) => !!state.read[id],
    isWant: (id) => !!state.want[id],
    rating: (id) => state.rating[id] || 0,
    pref: (k, d) => (k in state.prefs ? state.prefs[k] : d),
    setPref(k, v) { state.prefs[k] = v; save({ type: "pref", k }); },

    toggleRead(id) {
      if (state.read[id]) delete state.read[id];
      else { state.read[id] = Date.now(); delete state.want[id]; }
      save({ type: "read", id, on: !!state.read[id] });
      return !!state.read[id];
    },
    toggleWant(id) {
      if (state.want[id]) delete state.want[id];
      else state.want[id] = Date.now();
      save({ type: "want", id, on: !!state.want[id] });
      return !!state.want[id];
    },
    setRating(id, n) {
      if (state.rating[id] === n || !n) delete state.rating[id];
      else state.rating[id] = n;
      save({ type: "rating", id });
    },

    lists: () => state.lists,
    list: (lid) => state.lists.find((l) => l.id === lid),
    createList(name, ids = []) {
      const l = { id: newListId(), name: String(name || "Новый список").slice(0, 80), books: [...ids], created: Date.now() };
      state.lists.push(l);
      save({ type: "lists" });
      return l;
    },
    renameList(lid, name) { const l = S.list(lid); if (l && name) { l.name = name; save({ type: "lists" }); } },
    deleteList(lid) { state.lists = state.lists.filter((l) => l.id !== lid); save({ type: "lists" }); },
    inList: (lid, id) => !!S.list(lid)?.books.includes(id),
    toggleInList(lid, id) {
      const l = S.list(lid);
      if (!l) return;
      const i = l.books.indexOf(id);
      if (i >= 0) l.books.splice(i, 1); else l.books.push(id);
      save({ type: "lists" });
    },

    counts: () => ({ read: Object.keys(state.read).length, want: Object.keys(state.want).length }),

    exportFile() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `scriptorium-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    // Слияние: ничего не теряем, добавляем из файла
    importData(data) {
      if (!data || typeof data !== "object") throw new Error("bad file");
      Object.assign(state.read, cleanMarks(data.read));
      Object.assign(state.want, cleanMarks(data.want));
      for (const [k, v] of Object.entries(cleanMarks(data.rating))) if (v >= 1 && v <= 5) state.rating[k] = Math.round(v);
      for (const l of Array.isArray(data.lists) ? data.lists : []) {
        if (!l || !Array.isArray(l.books)) continue;
        const books = l.books.filter((id) => typeof id === "string" && id.length < 200);
        const id = typeof l.id === "string" && SAFE_ID.test(l.id) ? l.id : newListId();
        const ex = state.lists.find((x) => x.id === id);
        if (ex) ex.books = [...new Set([...ex.books, ...books])];
        else state.lists.push({ id, name: String(l.name || "Список").slice(0, 80), books, created: Number(l.created) || Date.now() });
      }
      for (const id of Object.keys(state.read)) delete state.want[id];
      save({ type: "import" });
    }
  };
  A.store = S;
})(window.App);
