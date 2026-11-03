// Проставляет в index.html отпечатки содержимого для своих css/js: style.css?v=1a2b3c4d.
// Файл изменился — изменилась ссылка, и браузер (и GitHub Pages) не покажет старую версию из кэша.
// Запуск: node tools/stamp-assets.mjs (build-data.mjs вызывает его сам)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexFile = path.join(root, "index.html");
let html = fs.readFileSync(indexFile, "utf8");
let count = 0;
html = html.replace(/(src|href)="((?:css|js|data)\/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (m, attr, file) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return m;
  const v = crypto.createHash("sha1").update(fs.readFileSync(full)).digest("hex").slice(0, 8);
  count++;
  return `${attr}="${file}?v=${v}"`;
});
fs.writeFileSync(indexFile, html);
console.log(`Отпечатки проставлены: ${count} файлов`);
