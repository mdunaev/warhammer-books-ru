# Data spec for book chunks (40K and Horus Heresy only)

Each research chunk gets an INPUT file `data/raw/in/<chunk>.json` and writes ONE OUTPUT file `data/raw/<chunk>.json`.
Validate with: `node tools/validate-chunk.mjs data/raw/<chunk>.json` — it must print OK. Fix every error.

All IDs for settings, eras, factions, segmenta, tags, formats come from `data/meta.js`. Never invent new ones.

## Input

```json
{ "chunk": "hh-a", "authors": { "Dan Abnett": "Дэн Абнетт" },
  "books": [ { "fantlabId": 36166, "titleEn": "Horus Rising", "titleRu": "Возвышение Хоруса", "ru": "official",
               "authors": ["Dan Abnett"], "year": 2006, "fantlabType": "novel",
               "fantlabSeries": "Ересь Хоруса", "fantlabRating": 7.84, "fantlabVoters": 1186 } ] }
```

The list of books is FIXED: output exactly these books, no more, no fewer.
`fantlabRating` / `fantlabVoters` are Russian reader ratings — one useful signal for `rec`.

## Output file shape

```json
{
  "chunk": "hh-a",
  "authors": { "Dan Abnett": "Дэн Абнетт" },
  "series": [ { "id": "horus-heresy", "name": "Ересь Хоруса", "nameEn": "The Horus Heresy", "setting": "hh" } ],
  "books": [ ... ],
  "paths": [ ... ],
  "fixes": [ "free text: anything in the input that looked wrong (bad Russian title, wrong year...)" ]
}
```

- `authors`: copy from input (you may fix an obviously wrong Russian spelling).
- `series`: every series id used in `books`. `name` Russian (official Russian series name if one exists), `nameEn` English.

Shared series ids (use exactly these when relevant):
`horus-heresy` (main numbered Horus Heresy series), `siege-of-terra`, `primarchs` (The Horus Heresy: Primarchs),
`hh-characters` (Horus Heresy Characters), `gaunts-ghosts`, `ciaphas-cain`, `eisenhorn`, `ravenor`, `bequin`,
`dawn-of-fire`, `dark-imperium`, `the-beast-arises`, `space-marine-battles`, `warhammer-crime`, `warhammer-horror`.
Other series: kebab-case slug of the English series name.

## Book object

```json
{
  "fantlabId": 36166,
  "id": "horus-rising",
  "titleEn": "Horus Rising",
  "titleRu": "Возвышение Хоруса",
  "ru": "official",
  "authors": ["Dan Abnett"],
  "year": 2006,
  "setting": "hh",
  "series": "horus-heresy",
  "seriesNo": 1,
  "format": "novel",
  "factions": ["sons-of-horus", "imperium"],
  "era": "great-crusade",
  "tl": 30003,
  "tlLabel": "003.M31",
  "tlApprox": false,
  "place": "Шестьдесят Три Девятнадцать, Давин",
  "segmentum": "many",
  "tags": ["betrayal", "epic", "character"],
  "rec": 1,
  "entry": true,
  "heroes": ["Гарвель Локен", "Хорус"],
  "desc": "...",
  "hook": "...",
  "prereq": [],
  "note": null
}
```

Field rules:

- `fantlabId`, `titleEn`, `titleRu`, `ru`, `authors`, `year`: copy from input. Change only if clearly wrong, and list the change in `fixes`.
- `id`: kebab-case slug of `titleEn`. Lowercase, strip diacritics, drop apostrophes, every run of non `[a-z0-9]` -> `-`, trim dashes. Keep leading "the". "The Flight of the Eisenstein" -> `the-flight-of-the-eisenstein`. "First & Only" -> `first-only`.
- `setting`: `hh` = set before 015.M31 (Unification, Great Crusade, Heresy, Siege of Terra, End and Death). `40k` = everything later.
- `series` / `seriesNo`: series id or `null`; number in that series per the publisher's numbering (Black Library / Lexicanum), may be decimal; `null` if unnumbered.
- `format`: `novel` | `novella` | `anthology` (use `fantlabType` as a hint).
- `factions`: 1-4 ids from meta.js, most important first. Prefer the most specific id (`night-lords`, not `chaos-marines`). Horus Heresy legions use the legion id even before they fell.
- `era`: era id from meta.js. `tl`: integer inside that era's [from, to] range. Formula `(M - 1) * 1000 + year`: 005.M31 -> 30005, 999.M41 -> 40999, 111.M42 -> 41111. Use Lexicanum. If only the millennium is known, pick a sensible middle and set `tlApprox: true`. Books of one series must keep their story order on `tl`.
- `tlLabel`: short label: `"005.M31"`, `"~M41"`, `"ок. 760.M41"`, `"999.M41"`.
- `place`: main location in Russian (planet / system / ship), short. `segmentum`: id from `segmenta` in meta.js (`many` if it jumps around, `beyond` for warp / Webway / Commorragh / deep space).
- `tags`: 2-5 tag ids from meta.js.
- `rec`: 1 = classic / must-read (about 20-25% of your chunk), 2 = recommended, 3 = for fans / weaker. Combine Fantlab rating, Goodreads / Reddit (r/40kLore, r/Warhammer40k) consensus. Be honest: weak books get 3.
- `entry`: `true` if a newcomer can start here without reading anything else.
- `heroes`: 0-3 main characters, Russian names as used in Russian editions.
- `desc`: Russian, 2-3 sentences, 180-350 characters. The premise and what makes the book special. No ending spoilers.
- `hook`: Russian, ONE short punchy line, under 90 characters, why to read it. Example: "Гвардейцы без родины против целого крестового похода Хаоса."
- `prereq`: optional ids of books worth reading first (slug rule; ids from other chunks are fine).
- `note`: optional short Russian hint ("Сборник рассказов, можно пропустить", "Читать после «Галактики в огне»") or `null`.

COPYRIGHT: `desc` and `hook` must be YOUR OWN words. Never copy or closely paraphrase publisher blurbs, back-cover text, Fantlab annotations, Lexicanum or wiki text.
STYLE: simple, lively Russian. Short sentences. No bureaucratic phrasing.

## Paths (optional, up to 2)

Suggested reading orders inside your area:

```json
{ "id": "path-eisenhorn", "name": "Инквизиция Абнетта", "about": "Одна фраза, зачем этот путь.",
  "steps": [ { "id": "xenos", "note": "Почему здесь, 1 фраза" } ] }
```

## Accuracy

Accuracy beats speed. Verify in-universe dates, series numbers and factions you are not sure about
(wh40k.lexicanum.com, fantlab.ru). If a date is genuinely unknown, estimate from context and set `tlApprox: true`.
