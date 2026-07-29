# 📋 PROGRESS.md — Elemental Blast

Чек-лист реализации MVP. Обновляется после каждой задачи/этапа.

Стек: **TypeScript 5.x + Phaser 3 + Vite + Vitest**.
ГДД: [GDD-2.md](./GDD-2.md) | Техника: [TECH_TASKS.md](./TECH_TASKS.md)

Статусы: `[ ]` не начато · `[~]` в процессе · `[x]` готово · `[!]` заблокировано

---

## Milestone 0. Подготовка проекта

- [x] **T-001.** Создать репозиторий и базовый TS + Phaser + Vite проект
  - [x] TypeScript strict включён (5.9.3)
  - [x] Phaser 3 подключён (3.90.0)
  - [x] Vite dev server работает (ready in 406ms, HTTP 200 на `/` и `/src/main.ts`)
  - [x] Нет ошибок типов (`tsc --noEmit` чисто, `vite build` проходит → `dist/`)
- [x] **T-002.** Настроить ESLint, Prettier, Vitest
  - [x] `npm run lint` работает (eslint 8.57.1, без ошибок)
  - [x] `npm run test` запускает тесты (vitest 1.6.1, smoke 2/2)
  - [x] Prettier форматирует код (3.9.6, `format`/`format:check`)
  - [x] `npm run check` — единая команда (lint → format → tsc → test)
- [x] **T-003.** Настроить структуру папок
  - [x] Созданы `core`, `game` (scenes/objects/input/fx/ui), `platform`, `config`, `utils`, `i18n`
  - [x] Каждый модуль имеет barrel `index.ts` с описанием назначения
  - [x] В `core` нет импорта Phaser (ESLint-правило `no-restricted-imports` в `src/core/.eslintrc.cjs`, проверено — ловит нарушение)

---

## Milestone 1. Core-логика (`src/core`, без Phaser)

- [x] **T-010.** Core types (`src/core/types.ts`)
  - [x] Grid, Cell, Piece, Hand, GameState, FuryState, EnergyState
  - [x] Расширено под GDD v1.3: LineInfo, ComboReward, CleansingReward, PlacementResult, PlacementSource
  - [x] Типы экспортируются, нет Phaser-зависимостей
- [x] **T-011.** RNG (детерминированный)
  - [x] mulberry32, одинаков seed → одинаковая последовательность
  - [x] getState/getState для сохранения/восстановления
  - [x] хелперы randInt, pick, randomSeed
  - [x] 10 unit-тестов (детерминированность, возобновление, диапазоны)
- [x] **T-012.** Grid module (`grid.ts`)
  - [x] createGrid, cloneGrid, isInside, isEmpty, setCell/getCell
  - [x] hasAnyEmptyCell, hasAnyFilledCell, clearCells
  - [x] countFilled, countSpecialCells, gridToString (для дебага)
  - [x] Размеры вынесены в `src/config/balance.ts` (BOARD_SIZE и т.д.)
  - [x] 13 unit-тестов
- [x] **T-013.** Shapes module (`shapes.ts`) + `config/shapes.ts`
  - [x] 12 базовых масок Block Blast (Dot, I2–I5, Square2/3, L/J/T/S/Z) в config
  - [x] Авто-генерация уникальных поворотов (1/2/4 по симметрии) с нормализацией и дедупликацией
  - [x] Веса по категориям клеток (1/2/3/4/5/9 → 12/13/15/35/18/7%), применяются к baseId
  - [x] canPlaceShape, canPlaceAnywhere, getShapeCells
  - [x] spawnNormalPiece/spawnNormalBatch с уникальными id
  - [x] 23 unit-теста (повороты, нормализация, веса, постановка, спавн)
- [x] **T-014.** Line detection (`lines.ts`)
  - [x] findFullLines (строки top→bottom, столбцы left→right — детерминированно)
  - [x] classifyLine: 8 multi = normal (защита), 7+1 multi = elemental, mixed = normal
  - [x] unionLineCells (дедупликация пересечений для snapshot)
  - [x] Очки за линии вынесены в `config/balance.ts` (SCORE_LINE_*)
  - [x] 15 unit-тестов
- [x] **T-015.** Snapshot clearing (`snapshot.ts`)
  - [x] scanSnapshot: найти все линии на снимке, посчитать очки/элементы, НЕ мутируя
  - [x] applyClear: очистить union одним проходом после подсчёта наград
  - [x] Защита double-clear: пересечение строки/столбца — обе линии в подсчёте
  - [x] 11 unit-тестов (включая критичный double-clear)
- [x] **T-016.** Energy and cleansing (`energy.ts`, `cleansing.ts`)
  - [x] addEnergy: consumed = старые+новые до ENERGY_CAPACITY, overflow cap = OVERFLOW_CAP
  - [x] Чистое Очищение по consumed одной стихии
  - [x] getCleansingReward из OVERFLOW_TABLE config (очки/звёзды/радужные/Fury по overflow)
  - [x] Шкала сбрасывается после Очищения, лишнее не переносится
  - [x] 16 unit-тестов
- [x] **T-017.** Combo rewards (`combo.ts`)
  - [x] getComboReward: 2→Bomb, 3→Line, 4→Cross, 5→Apocalypse, 6→Apocalypse×2
  - [x] Защита от рекурсии: canAwardSpecial=false (постановка спецфигуры) → bonus есть, special null
  - [x] upgradeSpecial: bomb→line→cross→apocalypse×1→apocalypse×2
  - [x] 20 unit-тестов (включая pure, т.к. pure тестировал через applyPureCleansing)
- [x] **T-018.** Pure cleansing (`pure.ts`)
  - [x] applyPureCleansing: ×2 очков, ×1.5 Fury duration, +1 star
  - [x] Апгрейд спецфигуры; если не было → Bomb×1
  - [x] Покрыто тестами в combo.test.ts (блок pure)
- [x] **T-019.** Special regions and wildcard-fill (`specials.ts`)
  - [x] Bomb 2×2 (clamp), Line row/column, Cross row+col, Apocalypse 2 rows+2 cols (28 клеток)
  - [x] fillSpecialCells — только пустые клетки, занятые не трогает
  - [x] `Cell { element: -1, multi: true, special: true }`
  - [x] canUseSpecial (≥1 пустая клетка в регионе)
  - [x] 18 unit-тестов
- [x] **T-020.** Hand and bonus overflow (`hand.ts`)
  - [x] createHand (6 null), makeRainbowPiece/makeSpecialPiece
  - [x] addRainbowPieces/addSpecialPieces с конвертацией при переполнении
  - [x] Конвертация: радужные → +500 × mult, спецфигуры → +1000 × mult (mult до Fury)
  - [x] refillNormalIfNeeded, removePieceById, getPieceById
  - [x] 14 unit-тестов
- [x] **T-021.** Game over (`gameover.ts`)
  - [x] canUsePiece: normal/rainbow по маскам, special — есть пустая клетка
  - [x] hasAnyMove: ни одна фигура не используется → Game Over
  - [x] rainbow рассматривается как 1×1
  - [x] 10 unit-тестов
- [x] **T-022.** GameEngine facade (`engine.ts` + `fury.ts`)
  - [x] placePiece / useSpecial возвращают PlacementResult
  - [x] Все 4 оси: линии → комбо → энергия/Очищение → Чистое (порядок GDD 4.5)
  - [x] Fury (`fury.ts`): currentMultiplier (Difficulty × Star × Fury), startFury, tickFury
  - [x] Конвертация руки идёт ДО нового Fury (множитель multBefore)
  - [x] Защита от рекурсии спецфигур (useSpecial не выдаёт combo-special)
  - [x] Game over проверяется в конце каждого хода
- [x] **T-023.** Core integration tests (`engine.test.ts`)
  - [x] Базовая постановка, невозможная постановка
  - [x] 1 стихийная линия (elemental vs mixed), 2-line комбо → Bomb
  - [x] Очищение overflow 0 (pure) и overflow +1
  - [x] Pure без комбо → Bomb×1, pure + combo Bomb → Line (апгрейд)
  - [x] Спецфигура wildcard-fill, защита от рекурсии (no combo), нет пустых клеток → fail
  - [x] Защита 8 multi = обычная линия
  - [x] Hand overflow конвертация в очки
  - [x] Game Over (через hasAnyMove), Fury активируется после Очищения
  - [x] 18 integration-тестов, всего в проекте 170/170 ✓

---

## Milestone 2. Phaser greybox

- [x] **T-030.** BootScene and PreloadScene
  - [x] BootScene (фон + скрытие DOM-заглушки → Preload)
  - [x] PreloadScene (процедурная генерация всех текстур через Graphics.generateTexture)
  - [x] Переход Boot → Preload → Menu
  - [ ] Инициализация платформы (M4, T-050/T-052; сейчас greybox storage-стаб)
- [x] **T-031.** MenuScene (Play, How To, best, stars, multiplier)
  - [x] Кнопка Play → GameScene
  - [x] Кнопка How To → модальный текст-оверлей (4 оси наград)
  - [x] best / stars / текущий множитель из registry (storage.loadMeta + fury.currentMultiplier)
- [x] **T-032.** BoardView (8×8, обновление клеток, multi-клетки)
  - [x] CellView: пустая/стихийная/multi-клетки отличаются текстурами
  - [x] BoardView.update(grid) — полный перерисов состояния
  - [x] showPreview/clearPreview — overlay подсветки цели (зелёный/красный)
  - [x] showSpecialRegion — overlay региона спецфигуры (пустые зелёным, занятые тусклым)
- [x] **T-033.** HandView and PieceView (6 слотов, 3 вида фигур)
  - [x] 6 слотов (3 normal + 3 bonus с золотой рамкой)
  - [x] normal фигуры видны (клетки по element)
  - [x] спецфигуры отрисованы (фон + символ 💣⚡✚☄ поверх)
  - [x] rainbow визуал (TEX_RAINBOW 4-секторный + золотой контур)
  - [x] HandView.update — diff по id, пересоздаёт только изменившиеся слоты
- [x] **T-034.** DragController для обычных/rainbow (preview, pointercancel)
  - [x] Фигуру можно перетащить (со смещением вверх от пальца, GDD §14)
  - [x] Preview целевых клеток (зелёный/красный по engine.canPlacePiece)
  - [x] Валидная постановка → engine.placePiece; невалидная → отмена (tween-возврат)
  - [x] pointercancel / pointerupoutside / gameout → отмена
  - [x] rainbow в drag (1×1, ставится как multi)
- [x] **T-035.** Rainbow piece placement
  - [x] rainbow ставится через placePiece как multi-клетка 1×1 (engine уже считает)
  - [x] визуал в слоте + drag-копии (TEX_RAINBOW)
- [x] **T-036.** SpecialInputController (Bomb/Cross/Apocalypse overlay, Line orientation button)
  - [x] тап по спецфигуре выбирает её; повторный тап → отмена
  - [x] bomb — overlay 2×2 (target=upper-left, clamp); cross — ряд+столбец; apocalypse — 2 ряда+2 столбца
  - [x] line — кнопка переключения ориентации (↔ ряд / ↕ столбец)
  - [x] тап по полю → target; «ПРИМЕНИТЬ» → engine.useSpecial (выключена если нет пустых клеток)
  - [x] маршрутизация pointerdown в GameScene: спец-режим имеет приоритет над drag
- [x] **T-037.** HUD, EnergyView, FuryView
  - [x] HudView: score / best / stars / multiplier (update из state + currentMult)
  - [x] EnergyView: 3 слота стихий, update из energy.slots
  - [x] FuryView: таймер (осталось сек) + множитель + аура-кольцо цветом стихии
  - [x] Fury-тикер 200мс: engine.tickFury + перерисов HUD/Fury по timestamp

---

## Milestone 3. Игровой поток

- [ ] **T-040.** Placement flow (input → engine → view)
- [ ] **T-041.** Line clear FX (object pool)
- [ ] **T-042.** Cleansing flow (3/3 → анимация, радужные, Fury)
- [ ] **T-043.** Combo flow (спецфигуры в бонусный слот, конвертация при переполнении)
- [ ] **T-044.** Pure cleansing flow (×2, ×1.5 Fury, апгрейд)
- [ ] **T-045.** Fury mode (таймер, множитель к будущим очкам, перезапись)
- [ ] **T-046.** Game over flow (rewarded continue ×1, interstitial если не continue)

---

## Milestone 4. Платформа, онбординг, полировка

- [ ] **T-050.** Platform abstraction (IPlatform, MockPlatform, YandexPlatform)
- [ ] **T-051.** LocalStorage save/resume
- [ ] **T-052.** Yandex SDK integration (rewarded, interstitial, player data)
- [ ] **T-053.** Analytics (все события GDD)
- [ ] **T-054.** Onboarding controller (controlled-спавн, skip)
- [ ] **T-055.** Sound (BGM adaptive, SFX, toggle)
- [ ] **T-056.** Polish FX (pop, laser, radial wave, cascade, flash, aura)
- [ ] **T-057.** Debug panel (?debug=1)
- [ ] **T-058.** Performance pass (60 FPS, mobile)
- [ ] **T-059.** Build and ZIP для Яндекс Игр
- [ ] **T-060.** QA checklist

---

## Журнал

<!-- В хронологическом порядке: дата + задача + краткое решение -->

### 2026-07-23 — Milestone 2, Фаза B (rainbow/спецфигуры/Energy/Fury) ✓
Добивка серых T-035/T-036/T-037. Теперь весь геймплей GDD виден на экране.
**T-035 (rainbow):** оказался почти бесплатным — engine уже считает rainbow как 1×1 multi через `placePiece`, а `TEX_RAINBOW` (4-секторный + золотой контур) уже генерировался и в PieceView, и в drag-копии. Без изменений кода, только подтверждение.
**T-037 (Energy/Fury):** `objects/EnergyView.ts` — 3 слота стихий (ENERGY_CAPACITY), update из `energy.slots`, пустые — тёмный фон, заполненные — текстура стихии. `objects/FuryView.ts` — индикатор активного Fury: таймер (осталось сек по timestamp `fury.until`), множитель ×N, аура-кольцо цветом стихии Очищения; скрыт когда Fury не активен (`tickFury`). Интегрированы в `GameScene.refresh` + Fury-тикер 200мс теперь также обновляет HUD/Fury (множитель падает при истечении). Layout: добавлены `energyRowWidth/energySlotX/ENERGY_*` и `FURY_X/Y`.
**T-036 (SpecialInputController):** `input/SpecialInputController.ts` — тап-ориентированный поток: тап по спецфигуре → выбор + панель (для Line — кнопка ориентации ↔/↕; для всех — ПРИМЕНИТЬ/ОТМЕНА); тап по полю → target; overlay региона через новый `BoardView.showSpecialRegion(region, emptyCells)` (пустые клетки зелёным, занятые — тусклым); ПРИМЕНИТЬ выключена если нет пустых клеток → `engine.useSpecial(id, target, orientation)`. Регионы — из core (`getSpecialRegion`/`getEmptyCellsInRegion`): bomb 2×2, line ряд/столбец, cross ряд+столбец (15), apocalypse 2ряда+2столбца.
**Маршрутизация ввода:** DragController рефакторнут — убрана авто-подписка на `pointerdown`, старт drag'а теперь через публичный `tryStartDrag(pointer)`. GameScene — единый маршрутизатор: спец-режим (активен или тап по спецфигуре) имеет приоритет, иначе drag обычной/rainbow фигуры. Устранена потенциальная гонка двух контроллеров.
**Символы спецфигур:** в PreloadScene спец-текстуры — тёмный фон + золотая рамка (упростил: убрал попытку слить Text-символ в текстуру через generateTexture — Phaser так не умеет), а символы 💣⚡✚☄ рисуются в PieceView поверх фона через Text.
**Гоччи:** (1) утечка — ОТМЕНА-кнопка панели создавалась в scene, но не добавлялась в контейнер → не уничтожалась при closePanel; исправил (добавил в panel, cancelBtn поле). (2) Постоянные `File has been modified since read` на layout.ts после `npm run format`/`build` — рассинхрон трекинга harness; лечил свежим Read перед Edit или полным Write. (3) Prettier переформатирует файлы после format-команды — повторный `npm run check` обязателен.
**Проверки:** `npm run check` зелёно (170/170), `npm run build` проходит (41 модуль, 1.5 МБ / 351 КБ gzip).
**Дальше:** Milestone 3 (игровой поток: FX очистки линий, анимации Очищения/комбо/чистого/Fury, rewarded-continue). Smoke-проверка Фазы Б в браузере (`npm run dev`): спецфигуры появляются в бонусных слотах после комбо; Energy заполняется от стихийных линий; при 3/3 стартует Fury с таймером.


### 2026-07-23 — Milestone 2, Фаза A (играбельный greybox-цикл) ✓
Старт view-слоя. Цель Фазы А — довести до играбельного цикла: меню → поле → drag обычной фигуры → постановка → очистка линий → refill руки → game over. Полировка FX и спецфигуры/rainbow/Energy/Fury оставлены на Фазу Б.
**Конфиг/раскладка:** `src/config/elements.ts` (палитра стихий из GDD §13: 🔥`#FF6B47` 💧`#4CC9F0` 🌿`#52B788` 💨`#B58DFF`, фон `#0F0E17`, сетка `#2D2B40`, радужная золото `#FFD700` + preview/UI-цвета); `src/game/layout.ts` (portrait 1080×1920: CELL=120, поле 60/300..1260, HUD сверху, бонусные слоты 1490 / обычные 1750); `src/game/textures.ts` (реестр ключей процедурных текстур).
**Платформа-стаб:** `src/platform/storage.ts` (greybox localStorage по ключам GDD 7.1 `elemental_blast_best/_stars/_save`, защита от битого JSON) — чистая точка под рефактор в `IPlatform` (T-050/051).
**Сцены:** BootScene (фон + скрытие DOM-заглушки → Preload) → PreloadScene (генерация всех текстур через `Graphics.generateTexture`, без ассетов) → MenuScene (тайтл, Play, How To-оверлей, best/stars/mult) → GameScene (владелец `GameEngine`, цикл хода, game-over оверлей, Fury-тикер 200мс).
**View-объекты:** CellView (пустая/стихийная/multi), BoardView (8×8 + preview overlay), PieceView (normal/rainbow/special, центрирование bbox), HandView (6 слотов, diff по id), HudView (score/best/stars/mult).
**Ввод:** DragController — drag со смещением вверх от пальца (GDD §14), preview валидности по `engine.canPlacePiece`, валид → `placePiece`, невалид → tween-возврат, `pointercancel`/`pointerupoutside`/`gameout` → отмена.
**UI:** Button (rounded-rect + text + hover, переиспользуется в Menu/GameOver).
**Архитектура:** GameScene владеет engine, перетаскивание → PlacementResult → полный перерисов состояния; core не тронут (правило B.3.1 сохранено). `main.ts` подключает сцены `[Boot, Preload, Menu, Game]`.
**Проверки:** `npm run check` зелёно (lint+format+tsc+170/170 тестов), `npm run build` проходит (1.5 МБ JS / 350 КБ gzip — Phaser крупный, ожидаемо для greybox).
**Гоччи:** (1) ESLint `consistent-type-imports` требует `import type Phaser` в файлах, где Phaser только в типах (DragController). (2) `no-self-assign` ловит `pointer.x = pointer.x`. (3) prettier требовал reflow в 8 файлах — разовый `npm run format`.
**Дальше:** Фаза Б (T-035 rainbow в drag, T-036 SpecialInputController + overlays, T-037 EnergyView+FuryView) — после smoke-проверки Фазы А в браузере (`npm run dev`).


### 2026-07-22 — T-013, T-014 ✓
**T-013 (shapes):** `src/config/shapes.ts` (12 базовых масок Block Blast: Dot, I2–I5, Square2/3, L/J/T/S/Z — канон из Appendix A) + `src/core/shapes.ts` (авто-генерация уникальных поворотов через rotate90+normalize+дедупликацию: 1/2/4 ориентации по симметрии; canPlaceShape/canPlaceAnywhere/getShapeCells; spawnNormalPiece/Batch с уникальными id и весами по категориям клеток 12/13/15/35/18/7%). 23 unit-теста.
**T-014 (lines):** `src/core/lines.ts` — `findFullLines` (строки top→bottom, затем столбцы left→right — детерминированно, критично для consumed/pure), `classifyLine` (защита «8 multi = normal», 7+1 multi = elemental, mixed = normal), `unionLineCells` (дедупликация пересечений для snapshot-очистки). Очки за линии вынесены в `config/balance.ts`. 15 unit-тестов покрывают все правила классификации, порядок, пересечения, дедупликацию.
**Гочча:** кириллица в .test.ts сломалась при сохранении редактором (Windows-1251 вместо UTF-8) — пока пишем имена тестов на латинице/ASCII.


`src/core/grid.ts`: createGrid/cloneGrid/isInside/isEmpty/setCell/getCell/clearCells + хелперы hasAnyEmptyCell/hasAnyFilledCell/countFilled/countSpecialCells/gridToString (для дебага). Размеры вынесены в новый `src/config/balance.ts` (BOARD_SIZE, HAND_SIZE, ENERGY_CAPACITY, OVERFLOW_CAP и т.д.) — правило «магических чисел вне config». 13 unit-тестов покрывают создание, клонирование (глубокое, независимость), границы, очистку с out-of-bounds координатами, подсчёт special-клеток.
**Гочча:** относительный импорт из `src/core/__tests__/` в `src/config/` — `../../config/` (не `../../../`).


**T-010 (типы):** `src/core/types.ts` — все сущности по TECH_TASKS.md B.5 + расширение под актуальный GDD v1.3: `PlacementSource` (нормал/rainbow/special, для защиты от рекурсии спецфигур), `LineInfo`, `ComboReward`, `CleansingReward`, `SpecialFillResult`, `PlacementResult` (полный результат хода для view). Чистые данные, без Phaser.
**T-011 (RNG):** `src/core/rng.ts` — mulberry32 (быстрый, хорошо распределён, state = одно число). API: `createRng(seed)` → `{next, getState}`, `randomSeed()`, `randInt`, `pick`. 10 unit-тестов покрывают: одинаковый seed → одинаковая последовательность, возобновление через getState, диапазоны [0,1) и [0,n), ошибки на пустых массивах/n≤0.


Создано дерево `src/`: `core` (+ `__tests__`), `game` (+ `scenes/objects/input/fx/ui`), `platform`, `config`, `utils`, `i18n`. В каждом — barrel `index.ts` с описанием назначения модуля (пока `export {}`). Ключевое архитектурное правило "core не зависит от Phaser" (TECH_TASKS.md B.3.1) закреплено линтером: `src/core/.eslintrc.cjs` с `no-restricted-imports` на `'phaser'`. Проверено: временный импорт Phaser в core ловится с понятным сообщением и ссылкой на B.3.1, после удаления — `npm run check` зелёный.
**Milestone 0 закрыт.** Готов каркас: TS strict + Phaser 3 + Vite + Vitest, линт/формат/тесты работают, структура модулей + guard на core.


Конфиги ESLint/Prettier/Vitest уже лежали из T-001, проверена их работоспособность. Добавлен `src/__tests__/smoke.test.ts` (2 базовых assertion'a, будет заменён реальными тестами в T-023). В `package.json` добавлены скрипты `format:check` и `check` (единая команда `lint → format:check → tsc → test`). `npm run check` проходит зелёно.


Создан каркас проекта. Конфиги: `package.json`, `tsconfig.json` (strict + noUnusedLocals/Parameters), `vite.config.ts` (`base: "./"` для ZIP), `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc.json`, `.gitignore`. `index.html` — чистая стартовая страница с DOM-заглушкой «Загрузка…». `src/main.ts` — минимальная BootScene (фон #0F0E17, текст-заглушка) + Phaser.Game c portrait FIT-масштабом 1080×1920. Старый прототип `index.html` сохранён как `prototype-v1.html.old`.
Установлено: phaser 3.90.0, typescript 5.9.3, vite 5.4.21, vitest 1.6.1, eslint 8.57.1, prettier 3.9.6.
**Гочча:** в окружении был `NODE_ENV=production` + `npm config omit=dev`, из-за чего обычный `npm install` ставил только `phaser`. Решено через `npm install --include=dev`. На будущее: всегда `--include=dev` или убрать `omit=dev` из npm config.
Проверки: `tsc --noEmit` чисто, `npm run build` проходит (dist/, ~1.4MB JS / 340KB gzip), dev-сервер отвечает HTTP 200.

