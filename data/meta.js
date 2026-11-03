// Справочники: сеттинги, эпохи, фракции, темы.
// Это единый источник ID. Книги в data/books.js ссылаются только на эти ID.
window.META = {
  settings: [
    { id: "40k", name: "Warhammer 40,000", short: "40K", color: "#b8862f",
      about: "Сорок первое тысячелетие. Человечество держится на вере, страхе и бесконечной войне." },
    { id: "hh", name: "Ересь Хоруса (30K)", short: "30K", color: "#9c3b2a",
      about: "Десять тысяч лет назад. Любимый сын Императора восстаёт, и Галактика раскалывается надвое." }
  ],

  // Эпохи. axis — общая шкала хронологии. Для 40K/30K tl = (M-1)*1000 + год, т.е. 005.M31 = 30005.
    eras: [
    { id: "dark-age", axis: "40k", name: "Объединение Терры", range: "до 798.M30", from: 0, to: 29797,
      about: "Император объединяет Терру и создаёт первых воинов-генетиков." },
    { id: "great-crusade", axis: "40k", name: "Великий крестовый поход", range: "798.M30 — 004.M31", from: 29798, to: 30004,
      about: "Легионы примархов возвращают разбросанные миры человечества. Время надежды перед падением." },
    { id: "heresy", axis: "40k", name: "Ересь Хоруса", range: "005 — 013.M31", from: 30005, to: 30013,
      about: "Хорус предаёт Императора. Половина легионов идёт за ним, и начинается гражданская война." },
    { id: "siege", axis: "40k", name: "Осада Терры", range: "014.M31", from: 30014, to: 30014,
      about: "Последняя битва Ереси у стен Императорского дворца." },
    { id: "after-heresy", axis: "40k", name: "После Ереси", range: "M31 — M37", from: 30015, to: 36999,
      about: "Чистка, нашествие Зверя, Эпоха Отступничества. Империум застывает в догмах." },
    { id: "dark-millennium", axis: "40k", name: "Тёмное тысячелетие", range: "M38 — 998.M41", from: 37000, to: 40998,
      about: "Классический сорокатысячный мир: инквизиторы, гвардейцы и вечная война на всех фронтах." },
    { id: "indomitus", axis: "40k", name: "Эра Индомитус", range: "999.M41 — M42", from: 40999, to: 49999,
      about: "Галактику рассекает Великий Разлом. Гиллиман возвращается и ведёт новый крестовый поход." },
  ],

  // Фракции. parent — родитель для фильтра (фильтр по родителю включает детей).
  // group — крупная группа. num — номер легиона (для обложек).
  factions: [
    // --- 40K / 30K: Империум
    { id: "imperium", name: "Империум", group: "imperium", color: "#a8843c" },
    { id: "astartes", name: "Космодесант", group: "imperium", color: "#4a6a8c" },
    { id: "dark-angels", name: "Тёмные Ангелы", parent: "astartes", group: "imperium", num: "I", color: "#1f4a2c" },
    { id: "white-scars", name: "Белые Шрамы", parent: "astartes", group: "imperium", num: "V", color: "#b9b3a6" },
    { id: "space-wolves", name: "Космические Волки", parent: "astartes", group: "imperium", num: "VI", color: "#6b7c8a" },
    { id: "imperial-fists", name: "Имперские Кулаки", parent: "astartes", group: "imperium", num: "VII", color: "#c9a227" },
    { id: "blood-angels", name: "Кровавые Ангелы", parent: "astartes", group: "imperium", num: "IX", color: "#8e1b1b" },
    { id: "iron-hands", name: "Железные Руки", parent: "astartes", group: "imperium", num: "X", color: "#3b3b3b" },
    { id: "ultramarines", name: "Ультрамарины", parent: "astartes", group: "imperium", num: "XIII", color: "#1f3f8a" },
    { id: "salamanders", name: "Саламандры", parent: "astartes", group: "imperium", num: "XVIII", color: "#2f6b3a" },
    { id: "raven-guard", name: "Гвардия Ворона", parent: "astartes", group: "imperium", num: "XIX", color: "#24262b" },
    { id: "black-templars", name: "Чёрные Храмовники", parent: "astartes", group: "imperium", color: "#1c1c1c" },
    { id: "grey-knights", name: "Серые Рыцари", parent: "astartes", group: "imperium", color: "#7d8691" },
    { id: "deathwatch", name: "Караул Смерти", parent: "astartes", group: "imperium", color: "#2a2a2a" },
    { id: "custodes", name: "Адептус Кустодес", group: "imperium", color: "#b8902f" },
    { id: "sisters", name: "Сёстры Битвы", group: "imperium", color: "#7a1f2b" },
    { id: "inquisition", name: "Инквизиция", group: "imperium", color: "#5a1a1a" },
    { id: "guard", name: "Имперская Гвардия", group: "imperium", color: "#5b6146" },
    { id: "mechanicus", name: "Адептус Механикус", group: "imperium", color: "#9a3324" },
    { id: "navy", name: "Флот и вольные торговцы", group: "imperium", color: "#2c4a6b" },
    { id: "assassins", name: "Ассасины", group: "imperium", color: "#33303a" },
    { id: "knights", name: "Имперские Рыцари", group: "imperium", color: "#7b5a2a" },
    { id: "arbites", name: "Арбитрес и подулей", group: "imperium", color: "#4b4f57" },

    // --- 40K / 30K: Хаос
    { id: "chaos", name: "Хаос и культы", group: "chaos", color: "#5c1f3a" },
    { id: "daemons", name: "Демоны", parent: "chaos", group: "chaos", color: "#6e1a2a" },
    { id: "chaos-marines", name: "Космодесант Хаоса", parent: "chaos", group: "chaos", color: "#3f2b2b" },
    { id: "emperors-children", name: "Дети Императора", parent: "chaos-marines", group: "chaos", num: "III", color: "#6b2a6b" },
    { id: "iron-warriors", name: "Железные Воины", parent: "chaos-marines", group: "chaos", num: "IV", color: "#5d5d58" },
    { id: "night-lords", name: "Повелители Ночи", parent: "chaos-marines", group: "chaos", num: "VIII", color: "#1d2a4a" },
    { id: "world-eaters", name: "Пожиратели Миров", parent: "chaos-marines", group: "chaos", num: "XII", color: "#8a2a1f" },
    { id: "sons-of-horus", name: "Сыны Хоруса / Чёрный Легион", parent: "chaos-marines", group: "chaos", num: "XVI", color: "#2f4a3a" },
    { id: "death-guard", name: "Гвардия Смерти", parent: "chaos-marines", group: "chaos", num: "XIV", color: "#6b6b3a" },
    { id: "thousand-sons", name: "Тысяча Сынов", parent: "chaos-marines", group: "chaos", num: "XV", color: "#7a2222" },
    { id: "word-bearers", name: "Несущие Слово", parent: "chaos-marines", group: "chaos", num: "XVII", color: "#5a1d1d" },
    { id: "alpha-legion", name: "Альфа-Легион", parent: "chaos-marines", group: "chaos", num: "XX", color: "#2a5a63" },

    // --- 40K: Чужие
    { id: "aeldari", name: "Эльдар", group: "xenos", color: "#2f6e6a" },
    { id: "drukhari", name: "Тёмные эльдар", parent: "aeldari", group: "xenos", color: "#3b2b4f" },
    { id: "necrons", name: "Некроны", group: "xenos", color: "#2f5f3a" },
    { id: "orks", name: "Орки", group: "xenos", color: "#4f6b22" },
    { id: "tau", name: "Т'ау", group: "xenos", color: "#a0703a" },
    { id: "tyranids", name: "Тираниды и культы", group: "xenos", color: "#5a2a5a" },
    { id: "xenos", name: "Прочие чужие", group: "xenos", color: "#4a5a5a" }
  ],

  groups: [
    { id: "imperium", name: "Империум", setting: ["40k", "hh"] },
    { id: "chaos", name: "Хаос", setting: ["40k", "hh"] },
    { id: "xenos", name: "Чужие", setting: ["40k", "hh"] }
  ],

  // Где происходит действие. Для карты галактики.
  segmenta: [
    { id: "solar", name: "Сегментум Солар", about: "Сердце Империума: Терра, Марс и ближайшие миры." },
    { id: "obscurus", name: "Сегментум Обскурус", about: "Север галактики: Кадийские Врата и край Ока Ужаса." },
    { id: "ultima", name: "Сегментум Ультима", about: "Восток: Ультрамар, империя т'ау и самые дальние рубежи." },
    { id: "tempestus", name: "Сегментум Темпестус", about: "Юг: Бакка и глухие миры у края галактики." },
    { id: "pacificus", name: "Сегментум Пацификус", about: "Запад: Миры Саббат и долгие крестовые походы." },
    { id: "eye", name: "Око Ужаса", about: "Рана в реальности, где правит Хаос." },
    { id: "beyond", name: "Вне карты", about: "Варп, Паутина, Комморра, дальний космос и миры, место которых в книгах не указано." },
    { id: "many", name: "По всей галактике", about: "Действие скачет между многими мирами." }
  ],

  tags: [
    { id: "war", name: "Война и битвы" },
    { id: "siege", name: "Осада" },
    { id: "space", name: "Бои в космосе" },
    { id: "intrigue", name: "Интриги и политика" },
    { id: "mystery", name: "Расследование" },
    { id: "horror", name: "Хоррор" },
    { id: "betrayal", name: "Предательство" },
    { id: "tragedy", name: "Трагедия" },
    { id: "sorcery", name: "Колдовство и варп" },
    { id: "humor", name: "Юмор" },
    { id: "epic", name: "Эпический размах" },
    { id: "character", name: "Портрет героя" },
    { id: "villain-pov", name: "Глазами злодея" },
    { id: "xenos-pov", name: "Глазами нелюдей" },
    { id: "survival", name: "Выживание" },
    { id: "adventure", name: "Приключения" },
    { id: "lore", name: "Важно для лора" }
  ],

  formats: [
    { id: "novel", name: "Роман" },
    { id: "novella", name: "Повесть" },
    { id: "anthology", name: "Сборник" }
  ],

  recs: [
    { id: 1, name: "Классика", hint: "Лучшее в своей области. Стоит прочитать каждому." },
    { id: 2, name: "Рекомендуем", hint: "Крепкая книга. Хорошо заходит, если интересна тема." },
    { id: 3, name: "Для фанатов", hint: "Для тех, кто уже увлёкся. Часть серии или ниша." }
  ]
};
