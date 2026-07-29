# 🛠 TECH_TASKS.md — Elemental Blast (Appendix B)

**Техническая спецификация MVP Elemental Blast.** Дополняет [GDD-2.md](./GDD-2.md) (правила, баланс, дизайн). Здесь — стек, архитектура, типы, модули, milestones и задачи T-001..T-060.

**Движок / стек:** TypeScript 5.x (strict) + Phaser 3 + Vite + Vitest + Yandex Games SDK v2.

---

## B.1. Финальный технический стек

| Слой | Технология | Назначение |
|---|---|---|
| Язык | TypeScript 5.x, strict | Основной язык |
| Игровой движок | Phaser 3 | Рендер, ввод, сцены, твины, частицы, звук |
| Сборка | Vite | dev-server, build, preview |
| Тесты | Vitest | Unit-тесты core-логики |
| Линтер | ESLint | Качество кода |
| Форматтер | Prettier | Единый стиль |
| SDK | Yandex Games SDK v2 | Реклама, сейвы, аналитика, игрок |
| Валидация конфигов/сейвов | zod (опционально) | Защита от битых данных |
| RNG | mulberry32 / alea | Детерминированный спавн |
| Ассеты | TexturePacker / free atlas | Атлас спрайтов |
| Звук | Phaser.Sound | SFX / BGM |

---

## B.2. Рекомендуемые версии

```json
{
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

Если появятся более новые стабильные версии — можно использовать их, но major-версию Phaser зафиксировать как `3.x`.

---

## B.3. Главные архитектурные принципы

### 1. Core-логика не зависит от Phaser

Весь игровой расчёт в `src/core`.

**Запрещено:**
```ts
import Phaser from "phaser";
```
внутри `src/core`.

Core знает только: `grid`, `pieces`, `shapes`, `energy`, `combo`, `cleansing`, `specials`, `score`, `stars`, `fury`, `rng`, `rules`.

### 2. Phaser — только view и input

Phaser отвечает за: отрисовку поля/фигур, drag & drop, анимации, частицы, звук, сцены, UI, передачу пользовательских действий в core.

Phaser не должен сам считать: линии, энергию, комбо, очищение, награды, game over.

### 3. Platform abstraction

Yandex SDK, реклама, сейвы, аналитика спрятаны за интерфейсом:

```ts
interface IPlatform {
  init(): Promise<void>;
  showRewardedVideo(): Promise<boolean>;
  showInterstitial(): Promise<boolean>;
  save(data: SaveData): Promise<void>;
  load(): Promise<SaveData | null>;
  track(event: string, params?: Record<string, unknown>): void;
}
```

Реализации: `YandexPlatform`, `MockPlatform`, `WebPlatform`.

Это позволит: разрабатывать локально без SDK, тестировать rewarded как заглушку, позже перенести на другую платформу.

### 4. Конфиги отдельно от кода

Все балансные таблицы вынести в `src/config`:
```ts
elements.ts, shapes.ts, balance.ts, comboTable.ts,
overflowTable.ts, specials.ts, onboarding.ts
```
Никакие числа баланса не должны быть размазаны по сценам Phaser.

### 5. Детерминированный RNG

Для онбординга, тестов и аналитики — seed-based:
```ts
type RngState = number;
function nextRandom(state: RngState): number;
```
- Обычная игра: случайный seed.
- Онбординг: фиксированный seed или scripted-последовательность.
- Тесты: фиксированный seed.

---

## B.4. Структура проекта

```
elemental-blast/
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── README.md
│
├── public/
│   └── assets/
│       ├── images/
│       ├── audio/
│       └── fonts/
│
└── src/
    ├── main.ts
    │
    ├── config/
    │   ├── index.ts
    │   ├── elements.ts
    │   ├── shapes.ts
    │   ├── balance.ts
    │   ├── comboTable.ts
    │   ├── overflowTable.ts
    │   ├── specials.ts
    │   └── onboarding.ts
    │
    ├── core/
    │   ├── types.ts
    │   ├── rng.ts
    │   ├── grid.ts
    │   ├── shapes.ts
    │   ├── lines.ts
    │   ├── energy.ts
    │   ├── combo.ts
    │   ├── cleansing.ts
    │   ├── pure.ts
    │   ├── specials.ts
    │   ├── hand.ts
    │   ├── gameover.ts
    │   ├── engine.ts
    │   │
    │   └── __tests__/
    │       ├── lines.test.ts
    │       ├── energy.test.ts
    │       ├── combo.test.ts
    │       ├── cleansing.test.ts
    │       ├── pure.test.ts
    │       ├── specials.test.ts
    │       ├── hand.test.ts
    │       ├── gameover.test.ts
    │       └── engine.test.ts
    │
    ├── game/
    │   ├── scenes/
    │   │   ├── BootScene.ts
    │   │   ├── PreloadScene.ts
    │   │   ├── MenuScene.ts
    │   │   ├── GameScene.ts
    │   │   ├── GameOverScene.ts
    │   │   └── HowToScene.ts
    │   │
    │   ├── objects/
    │   │   ├── BoardView.ts
    │   │   ├── CellView.ts
    │   │   ├── PieceView.ts
    │   │   ├── HandView.ts
    │   │   ├── EnergyView.ts
    │   │   ├── FuryView.ts
    │   │   └── HudView.ts
    │   │
    │   ├── input/
    │   │   ├── DragController.ts
    │   │   └── SpecialInputController.ts
    │   │
    │   ├── fx/
    │   │   ├── LineClearFx.ts
    │   │   ├── CleansingFx.ts
    │   │   ├── FuryFx.ts
    │   │   ├── SpecialFillFx.ts
    │   │   └── ParticlePool.ts
    │   │
    │   └── ui/
    │       ├── Button.ts
    │       ├── Toast.ts
    │       ├── Modal.ts
    │       └── OrientationButton.ts
    │
    ├── platform/
    │   ├── IPlatform.ts
    │   ├── YandexPlatform.ts
    │   ├── MockPlatform.ts
    │   ├── storage.ts
    │   ├── analytics.ts
    │   └── ads.ts
    │
    ├── i18n/
    │   ├── index.ts
    │   ├── ru.ts
    │   └── en.ts
    │
    └── utils/
        ├── math.ts
        ├── coords.ts
        ├── events.ts
        └── debug.ts
```

---

## B.5. Основные типы данных (`src/core/types.ts`)

```ts
export type ElementId = 0 | 1 | 2 | 3;

export type SpecialType = "bomb" | "line" | "cross" | "apocalypse";

export type PieceKind = "normal" | "rainbow" | "special";

export type LineOrientation = "row" | "column";

export interface Vec2 { x: number; y: number; }

export interface Cell {
  element: ElementId | -1;
  multi: boolean;
  special: boolean;
}

export type Grid = (Cell | null)[][];

export interface Piece {
  id: string;
  kind: PieceKind;
  shape: Vec2[];
  element?: ElementId;
  special?: SpecialType;
  orientation?: LineOrientation;
}

export type Hand = (Piece | null)[];

export interface FuryState {
  until: number;
  mult: number;
  element: ElementId;
}

export interface EnergyState { slots: ElementId[]; }

export interface GameState {
  grid: Grid;
  hand: Hand;
  score: number;
  best: number;
  stars: number;
  energy: EnergyState;
  fury: FuryState | null;
  rngState: number;
  tutorialCompleted: boolean;
}
```

---

## B.6. Core-модули

### B.6.1. `grid.ts`

Отвечает: создание поля 8×8, проверка координат, установка/очистка клеток, поиск пустых клеток, клонирование для snapshot.

```ts
createGrid(): Grid;
cloneGrid(grid: Grid): Grid;
isInside(x: number, y: number): boolean;
isEmpty(grid: Grid, x: number, y: number): boolean;
hasAnyEmptyCell(grid: Grid): boolean;
clearCells(grid: Grid, cells: Vec2[]): void;
```

### B.6.2. `shapes.ts`

Отвечает: хранение Block Blast масок, генерация уникальных поворотов, нормализация, проверка размещения, выбор фигуры по весам.

```ts
getAllShapes(): ShapeDefinition[];
getShapeById(id: string): ShapeDefinition;
canPlaceShape(grid: Grid, shape: Vec2[], target: Vec2): boolean;
getShapeCells(shape: Vec2[], target: Vec2): Vec2[];
canPlaceAnywhere(grid: Grid, shape: Vec2[]): boolean;
spawnPiece(rng: Rng, weights: SpawnWeights): Piece;
```

### B.6.3. `lines.ts`

Отвечает: поиск полных строк и столбцов, классификация, защита от 8 multi, детерминированный порядок (строки сверху вниз, затем столбцы слева направо).

```ts
interface LineInfo {
  type: "row" | "column";
  index: number;
  cells: Vec2[];
  isElemental: boolean;
  element: ElementId | null;
}

findFullLines(grid: Grid): LineInfo[];
getLineInfo(cells: Cell[]): LineInfo;
```

Правило:
- Если все клетки multi → обычная линия.
- Если есть хотя бы одна обычная не-multi клетка и все такие клетки одной стихии → стихийная.
- Иначе → обычная.

### B.6.4. `energy.ts`

Отвечает: добавление энергии, consumed slots, overflow, детерминированный порядок потребления.

```ts
interface EnergyResult { cleansing: CleansingResult | null; }
addEnergy(state: EnergyState, gainedElements: ElementId[]): EnergyResult;
```

Правила: `consumed = старые слоты + новые по порядку, пока не наберётся 3`. `overflow = gainedElements.length - freeSlots`. `overflow cap = 5`. Лишняя энергия не переносится.

### B.6.5. `combo.ts`

```ts
interface ComboReward {
  bonusScore: number;
  special: SpecialReward | null;
}
getComboReward(elementalLines: number): ComboReward;
```

Таблица (из GDD секция 3.2):
- 2 линии → +2000, Bomb ×1
- 3 линии → +6000, Line ×1
- 4 линии → +12000, Cross ×1
- 5 линии → +20000, Apocalypse ×1
- 6 линии → +30000, Apocalypse ×2

### B.6.6. `cleansing.ts`

```ts
interface CleansingResult {
  overflow: number;
  baseScore: number;
  stars: number;
  rainbowCount: number;
  furySec: number;
  furyMult: number;
  isPure: boolean;
  element: ElementId;
}
getCleansingReward(overflow: number, consumed: ElementId[]): CleansingResult;
```

### B.6.7. `pure.ts`

```ts
applyPureCleansing(
  cleansing: CleansingResult,
  comboSpecial: SpecialReward | null
): { cleansing: CleansingResult; comboSpecial: SpecialReward };
```

Порядок апгрейда: `Bomb → Line → Cross → Apocalypse ×1 → Apocalypse ×2`. Если комбо-спецфигуры не было → Pure даёт Bomb ×1.

### B.6.8. `specials.ts`

```ts
getSpecialRegion(
  type: SpecialType,
  target: Vec2,
  orientation?: LineOrientation
): Vec2[];

getEmptyCellsInRegion(grid: Grid, region: Vec2[]): Vec2[];
fillSpecialCells(grid: Grid, cells: Vec2[]): number;
```

Регионы:
- **Bomb:** 2×2, target = upper-left, clamp.
- **Line:** row или column, зависит от orientation.
- **Cross:** row + column через target.
- **Apocalypse:** 2 rows + 2 columns, target = upper-left 2×2, clamp.

### B.6.9. `hand.ts`

```ts
addRainbowPieces(state: GameState, count: number, conversionMultiplier: number): void;
addSpecialPieces(state: GameState, type: SpecialType, count: number, conversionMultiplier: number): void;
refillNormalHandIfNeeded(state: GameState): void;
```

Важно: `conversionMultiplier = CurrentMult` **до** применения нового Fury.

### B.6.10. `gameover.ts`

```ts
hasAnyMove(state: GameState): boolean;
```

Правила: обычная/радужная фигура → можно поставить хотя бы куда-то. Спецфигура → на поле есть хотя бы одна пустая клетка.

### B.6.11. `engine.ts` (фасад для Phaser)

```ts
class GameEngine {
  state: GameState;

  startGame(options?: StartOptions): void;
  placePiece(pieceId: string, target: Vec2): PlacementResult;
  useSpecial(pieceId: string, target: Vec2, orientation?: LineOrientation): PlacementResult;
  canPlacePiece(pieceId: string, target: Vec2): boolean;
  hasAnyMove(): boolean;
}

interface PlacementResult {
  ok: boolean;
  placedCells: Vec2[];
  clearedLines: LineInfo[];
  elementalLines: number;
  combo: ComboReward | null;
  cleansing: CleansingResult | null;
  pure: boolean;
  specialFill: SpecialFillResult | null;
  scoreGained: number;
  starsGained: number;
  rainbowAdded: number;
  specialAdded: SpecialReward | null;
  furyStarted: FuryState | null;
  handRefilled: boolean;
  gameOver: boolean;
}
```

---

## B.7. Phaser-сцены

- **BootScene:** инициализировать платформу, загрузить сейв, определить меню/resume, запустить Preload.
- **PreloadScene:** загрузить атласы, звук, шрифты, прогресс.
- **MenuScene:** кнопка Play, кнопка How To, звёзды, текущий множитель, best score.
- **GameScene (главная):** BoardView, HandView, HudView, EnergyView, FuryView, DragController, SpecialInputController, вызов GameEngine, проигрывание FX по PlacementResult.
- **GameOverScene:** счёт, Restart, Continue (rewarded), Menu, interstitial (если continue не использован).
- **HowToScene:** текстовое описание 4 осей, примеры стихийной линии, комбо, спецфигур.

---

## B.8. View-объекты

- **BoardView:** рисует 8×8, обновляет клетки, preview, валидные/невалидные зоны, line clear FX.
- **PieceView:** визуал обычной / радужной / спецфигуры, состояния selected/drag.
- **HandView:** 6 слотов (3 обычных + 3 бонусных пунктиром), тап по фигуре, drag обычной/радужной, тап по спецфигуре.
- **EnergyView:** 3 слота, цвет стихии, анимация заполнения/потребления.
- **FuryView:** иконка стихии, таймер, множитель, пульсация, скрытие при завершении.

---

## B.9. Input

### B.9.1. Обычные и радужные фигуры (drag & drop)

```
1. pointerdown на PieceView.
2. Создать drag-спрайт.
3. Поднять фигуру чуть выше пальца.
4. pointermove → обновлять позицию и target cell.
5. Показывать preview на BoardView.
6. pointerup: если canPlace → engine.placePiece; иначе → вернуть в руку.
7. pointercancel → отменить drag.
```

Важно: фигура отображается со смещением вверх, чтобы палец не перекрывал место постановки.

### B.9.2. Спецфигуры

**Bomb / Cross / Apocalypse:**
```
1. Тап по спецфигуре.
2. Показать overlay области.
3. Тап по клетке-якорю.
4. engine.useSpecial.
```

**Line:**
```
1. Тап по Line.
2. Показать кнопку ориентации row/column.
3. Показать preview строки или столбца.
4. Тап по целевой строке/столбцу.
5. engine.useSpecial.
```

---

## B.10. Платформа и Yandex SDK

### B.10.1. Интерфейс

```ts
export interface IPlatform {
  init(): Promise<void>;
  showRewardedVideo(): Promise<boolean>;
  showInterstitial(): Promise<boolean>;
  save(data: SaveData): Promise<void>;
  load(): Promise<SaveData | null>;
  track(event: string, params?: Record<string, unknown>): void;
}
```

### B.10.2. `YandexPlatform`

```ts
class YandexPlatform implements IPlatform {
  private ysdk: unknown;

  async init() { this.ysdk = await YaGames.init(); }

  async showRewardedVideo(): Promise<boolean> {
    // показать rewarded, вернуть true если досмотрен
  }

  async showInterstitial(): Promise<boolean> {
    // показать interstitial, учитывать cooldown 180 секунд
  }

  async save(data: SaveData) {
    // player.setData или fallback localStorage
  }

  async load() { /* player.getData */ }

  track(event, params) { /* Metrica / analytics */ }
}
```

### B.10.3. `MockPlatform` (для локальной разработки)

```ts
class MockPlatform implements IPlatform {
  async init() {}
  async showRewardedVideo() { console.log("Rewarded mock: success"); return true; }
  async showInterstitial() { console.log("Interstitial mock"); return true; }
  async save(data) { localStorage.setItem("elemental_blast_save", JSON.stringify(data)); }
  async load() {
    const raw = localStorage.getItem("elemental_blast_save");
    return raw ? JSON.parse(raw) : null;
  }
  track(event, params) { console.log("analytics", event, params); }
}
```

---

## B.11. Сохранения

### B.11.1. LocalStorage keys

```
elemental_blast_best
elemental_blast_stars
elemental_blast_save
elemental_blast_settings
elemental_blast_onboarding
```

### B.11.2. Save schema

```ts
interface SaveData {
  version: number;
  best: number;
  stars: number;
  tutorialCompleted: boolean;
  settings: { sound: boolean; music: boolean };
  session?: {
    grid: Grid;
    hand: Hand;
    score: number;
    energySlots: ElementId[];
    fury: FuryState | null;
    rngState: number;
  };
}
```

### B.11.3. Когда сохранять

После каждого хода, при pause, при `visibilitychange → hidden`, перед показом рекламы, при game over.

---

## B.12. Аналитика

События из GDD реализуются через `platform.track`.

### B.12.1. Обязательные события

`game_start`, `piece_placed`, `line_cleared`, `combo_reward`, `special_received`, `cleansing`, `pure_cleansing`, `special_placed`, `special_cells_on_board`, `first_special_received`, `bonus_overflow_converted`, `fury_started`, `game_over`, `rewarded`.

### B.12.2. Пример

```ts
platform.track("combo_reward", {
  lines: 3,
  special_type: "line",
  source: "normal_piece",
  session_index: 4,
});
```

---

## B.13. Онбординг

### B.13.1. Контроллер

`src/config/onboarding.ts` + `src/game/OnboardingController.ts`.

Задача: управлять `tutorialMode`, подменять спавн фигур, подсвечивать цели, показывать тосты, отслеживать прогресс шагов.

### B.13.2. Шаги из GDD (секция 12)

1. Тапни фигуру, потом клетку поля.
2. Заполни обычную линию.
3. Собери стихийную линию 8/8.
4. Сделай комбо 2 стихийные линии.
5. Получи Bomb.
6. Используй Bomb.
7. Получи Очищение.
8. (Опционально) комбо 3 линии → Line.

### B.13.3. Skip

Кнопка Skip видна в онбординге. После skip: `tutorialCompleted = true`, игра продолжается в обычном режиме.

---

## B.14. Производительность и мобильная адаптация

### B.14.1. Scale

```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1080,
  height: 1920,
}
```

Базовая логическая высота `1920`.

### B.14.2. Portrait

Игра только портретная. При landscape — заглушка: «Поверни телефон вертикально».

### B.14.3. Touch

```css
html, body {
  overscroll-behavior: none;
  touch-action: none;
  user-select: none;
}
```

Отключить: context menu, double tap zoom.

### B.14.4. Object pooling

Пулы для: частиц, вспышек, line clear эффектов, toast'ов, мелких спрайтов.

### B.14.5. Texture atlas

```
elements.png + elements.json
ui.png       + ui.json
fx.png       + fx.json
```

### B.14.6. Size budget

- HTML + JS: < 3 МБ
- Assets: < 10 МБ
- Total: < 15 МБ (максимум < 20 МБ)

---

## B.15. Сборка и публикация

### B.15.1. Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "lint": "eslint src",
    "format": "prettier --write src"
  }
}
```

### B.15.2. Vite config

```ts
export default defineConfig({
  base: "./",  // относительные пути для ZIP
});
```

### B.15.3. Build

```bash
npm run build
```

Результат: `dist/index.html`, `dist/assets/...`.

### B.15.4. ZIP для Яндекс Игр

**Важно:** в корне ZIP должен быть `index.html`, а не `dist/index.html`.

```bash
cd dist
zip -r ../elemental-blast.zip .
```

---

## B.16. Тестирование (обязательные unit-тесты)

### Линии
- обычная линия → 1000, no energy
- стихийная линия → 2500, +1 energy
- 7 fire + 1 multi → elemental fire
- 1 fire + 7 multi → elemental fire
- 8 multi → normal line
- mixed elements → normal line

### Snapshot
- строка и столбец пересекаются — обе линии считаются до очистки
- очищается union клеток
- нет двойного начисления за одну клетку

### Energy
- 0/3 + 1 → 1/3
- 0/3 + 3 → cleansing overflow 0
- 2/3 + 1 → cleansing overflow 0
- 2/3 + 2 → cleansing overflow +1
- 0/3 + 4 → cleansing overflow +1
- overflow cap +5

### Pure
- consumed 🔥🔥🔥 → pure
- consumed 🔥🔥💧 → not pure
- pure без combo → Bomb ×1
- pure с Bomb → Line
- pure с Line → Cross
- pure с Cross → Apocalypse
- pure с Apocalypse ×2 → upgrade ignored

### Combo
- 1 elemental line → no special
- 2 lines → Bomb
- 3 lines → Line
- 4 lines → Cross
- 5 lines → Apocalypse
- 6 lines → Apocalypse ×2
- special placement → no combo special

### Specials
- Bomb region clamp
- Line row/column
- Cross row+col
- Apocalypse 2 rows + 2 cols
- filled only empty cells
- occupied cells unchanged
- no empty cells → cancel
- special cells have `multi=true, special=true`

### Hand overflow
- rainbow overflow → +500 × oldMult
- special overflow → +1000 × oldMult
- new Fury не влияет на конвертацию

### Game over
- нет обычных ходов, но есть пустая клетка и Bomb → not game over
- нет ходов и нет пустых клеток → game over
- обычная фигура помещается → not game over
- rainbow 1×1 и есть пустая клетка → not game over

---

## B.17. Debug-инструменты

Скрытая debug-панель (доступ: `?debug=1` в URL или 5 тапов по версии билда):

- выдать Bomb / Line / Cross / Apocalypse
- установить энергию 1/3, 2/3
- запустить Fury
- force cleansing
- force pure
- показать FPS
- показать seed
- включить grid coordinates
- переключить SDK mock
- skip onboarding

---

## B.18. Разбиение задач на реализацию

### Milestone 0. Подготовка проекта

#### T-001. Создать репозиторий и базовый проект
**Цель:** пустой TS + Phaser + Vite проект запускается.
**Output:** `npm install && npm run dev` открывает базовую Phaser-сцену.
**Acceptance:** TypeScript strict включён, Phaser 3 подключён, Vite dev server работает, нет ошибок линтера.

#### T-002. Настроить ESLint, Prettier, Vitest
**Цель:** единый стиль и тестовая инфраструктура.
**Acceptance:** `npm run lint` работает, `npm run test` запускает пустые тесты, prettier форматирует код.

#### T-003. Настроить структуру папок
**Цель:** создать `core`, `game`, `platform`, `config`, `utils`, `i18n`.
**Acceptance:** структура соответствует B.4, в core нет импорта Phaser.

---

### Milestone 1. Core-логика

#### T-010. Core types
**Цель:** описать все базовые типы.
**Output:** `src/core/types.ts`.
**Acceptance:** Grid, Cell, Piece, Hand, GameState, FuryState, EnergyState; типы экспортируются; нет Phaser-зависимостей.

#### T-011. RNG
**Цель:** детерминированный генератор случайных чисел.
**Acceptance:** одинаковый seed даёт одинаковую последовательность; можно сохранить/восстановить rngState.

#### T-012. Grid module
**Цель:** базовые операции с полем.
**Acceptance:** createGrid создаёт 8×8 null; clearCells очищает указанные клетки; hasAnyEmptyCell работает; cloneGrid делает глубокую копию.

#### T-013. Shapes module
**Цель:** Block Blast pool, повороты, веса.
**Acceptance:** Appendix A фигуры описаны; уникальные повороты генерируются; веса применяются к базовой маске; canPlaceShape проверяет границы и занятые клетки.

#### T-014. Line detection
**Цель:** поиск и классификация линий.
**Acceptance:** строки находятся сверху вниз; столбцы слева направо; 8 multi = normal; 7 fire + 1 multi = elemental fire; mixed = normal; есть unit-тесты.

#### T-015. Snapshot clearing
**Цель:** очистка union всех линий без поломки пересечений.
**Acceptance:** если строка и столбец полные одновременно, обе считаются; очистка происходит после всех расчётов; нет double-clear бага.

#### T-016. Energy and cleansing
**Цель:** энергия, overflow, cleansing.
**Acceptance:** consumed считается детерминированно; overflow считается правильно; overflow cap = 5; cleansing возвращает награду по таблице.

#### T-017. Combo rewards
**Цель:** комбо-таблица.
**Acceptance:** 2 lines → Bomb; 3 lines → Line; 4 lines → Cross; 5 lines → Apocalypse; 6 lines → Apocalypse ×2; combo не выдаётся для special placement.

#### T-018. Pure cleansing
**Цель:** чистое очищение и апгрейд спецфигуры.
**Acceptance:** pure определяется по consumed; очки ×2; fury duration ×1.5; +1 star; апгрейд спецфигуры работает; если combo special не было → Bomb.

#### T-019. Special regions and wildcard-fill
**Цель:** регионы Bomb / Line / Cross / Apocalypse.
**Acceptance:** Bomb 2×2 clamp работает; Line row/column работает; Cross row+col работает; Apocalypse 2 rows + 2 cols работает; заполняются только пустые клетки; создаются `Cell { element: -1, multi: true, special: true }`.

#### T-020. Hand and bonus overflow
**Цель:** рука, refill, конвертация бонусов.
**Acceptance:** 3 обычных + 3 бонусных; refill только когда 3 обычных слота пусты; радужные конвертируются в +500 × oldMult; спецфигуры конвертируются в +1000 × oldMult; oldMult берётся до нового Fury.

#### T-021. Game over
**Цель:** честная проверка ходов.
**Acceptance:** обычные фигуры проверяются по маскам; rainbow проверяется как 1×1; special учитывает наличие пустой клетки; нет ложного game over.

#### T-022. GameEngine facade
**Цель:** объединить core-модули.
**Acceptance:** placePiece возвращает PlacementResult; useSpecial возвращает PlacementResult; все 4 оси работают; порядок начисления соответствует GDD.

#### T-023. Core integration tests
**Цель:** покрыть сценарии целиком.
**Acceptance:** тест на 2-line combo; тест на 3-line combo; тест на overflow +1; тест на pure + combo; тест на special placement без combo; тест на 8 multi; тест на hand overflow.

---

### Milestone 2. Phaser greybox

#### T-030. BootScene and PreloadScene
**Цель:** базовые сцены и загрузка ассетов.
**Acceptance:** BootScene инициирует платформу; PreloadScene грузит placeholder-ассеты; есть переход в MenuScene.

#### T-031. MenuScene
**Цель:** меню.
**Acceptance:** кнопка Play; кнопка How To; показывается best; показывается stars; показывается multiplier.

#### T-032. BoardView
**Цель:** отрисовка поля 8×8.
**Acceptance:** поле видно; клетки обновляются из GameState; пустые и заполненные клетки отличаются; multi-клетки отличаются.

#### T-033. HandView and PieceView
**Цель:** отрисовка руки.
**Acceptance:** 6 слотов; обычные фигуры видны; радужные видны; спецфигуры видны; бонусные слоты выделены.

#### T-034. DragController для обычных фигур
**Цель:** drag & drop.
**Acceptance:** фигуру можно перетащить; есть preview; валидная постановка подсвечивается; невалидная постановка отменяется; pointercancel обрабатывается.

#### T-035. Rainbow piece placement
**Цель:** радужная ставится как обычная 1×1.
**Acceptance:** rainbow можно перетащить; engine.placePiece вызывается; клетка создаётся как multi.

#### T-036. SpecialInputController
**Цель:** использование спецфигур.
**Acceptance:** тап по спецфигуре выбирает её; Bomb показывает 2×2 overlay; Cross показывает row+col overlay; Line показывает orientation button; Apocalypse показывает 2 rows + 2 cols overlay; тап по цели вызывает engine.useSpecial.

#### T-037. HUD, EnergyView, FuryView
**Цель:** верхний интерфейс.
**Acceptance:** счёт обновляется; рекорд обновляется; звёзды обновляются; энергия показывает 3 слота; Fury показывает таймер и множитель.

---

### Milestone 3. Игровой поток

#### T-040. Placement flow
**Цель:** связать input, engine и view.
**Acceptance:** после постановки фигуры engine возвращает результат; BoardView обновляется; линии очищаются; очки начисляются; рука обновляется.

#### T-041. Line clear FX
**Цель:** визуал очистки линий.
**Acceptance:** обычная линия имеет один эффект; стихийная линия имеет более выраженный эффект; эффекты используют object pool.

#### T-042. Cleansing flow
**Цель:** Очищение.
**Acceptance:** при 3/3 запускается анимация; выдаются радужные; стартует Fury; показывается toast; после Очищения энергия пустая.

#### T-043. Combo flow
**Цель:** комбо и спецфигуры.
**Acceptance:** при 2+ стихийных линиях выдаётся спецфигура; показывается toast; спецфигура появляется в бонусном слоте; если рука полная — конвертация в очки.

#### T-044. Pure cleansing flow
**Цель:** визуал и логика чистого очищения.
**Acceptance:** pure определяется; очки ×2; Fury дольше; спецфигура апгрейдится; есть отдельный toast/эффект.

#### T-045. Fury mode
**Цель:** активный Fury.
**Acceptance:** таймер тикает; множитель применяется к будущим очкам; линии текущего хода не получают новый Fury; Fury перезаписывается новым Очищением; Fury визуально подсвечивает поле.

#### T-046. Game over flow
**Цель:** game over и continue.
**Acceptance:** game over срабатывает честно; экран показывает счёт; rewarded continue очищает 5 клеток; continue доступен 1 раз за партию; interstitial показывается только если continue не использован.

---

### Milestone 4. Платформа, онбординг, полировка

#### T-050. Platform abstraction
**Цель:** отделить SDK.
**Acceptance:** есть IPlatform; есть MockPlatform; есть YandexPlatform; код игры не обращается к YaGames напрямую.

#### T-051. LocalStorage save/resume
**Цель:** сохранение.
**Acceptance:** best сохраняется; stars сохраняются; текущая партия сохраняется; после перезапуска можно продолжить; битый save не ломает игру.

#### T-052. Yandex SDK integration
**Цель:** интеграция SDK.
**Acceptance:** YaGames.init вызывается; rewarded video работает; interstitial работает; player data сохраняется; ошибки SDK не роняют игру.

#### T-053. Analytics
**Цель:** события.
**Acceptance:** все события из GDD отправляются; параметры соответствуют GDD; в dev-mode события логируются.

#### T-054. Onboarding controller
**Цель:** controlled-онбординг.
**Acceptance:** игрок проходит 6–8 шагов; первое комбо гарантировано; игрок получает Bomb; игрок использует Bomb; игрок видит Очищение; есть skip.

#### T-055. Sound
**Цель:** BGM и SFX.
**Acceptance:** звук включается после первого жеста; есть toggle sound/music; настройки сохраняются; BGM меняется на Fury.

#### T-056. Polish FX
**Цель:** сочность.
**Acceptance:** постановка pop; линия laser; стихийная линия радиальная волна; special fill каскадный; cleansing вспышка; Fury aura.

#### T-057. Debug panel
**Цель:** инструменты QA.
**Acceptance:** можно выдать спецфигуру; можно установить энергию; можно запустить Fury; можно пропустить онбординг; debug выключен в production без query-параметра.

#### T-058. Performance pass
**Цель:** стабильные 60 FPS.
**Acceptance:** нет утечек текстур; частицы в пулах; нет создания объектов в update loop; игра работает на слабом Android; размер билда в бюджете.

#### T-059. Build and ZIP
**Цель:** собрать билд для Яндекс Игр.
**Acceptance:** `npm run build` проходит; `dist/index.html` открывается; в ZIP index.html в корне; ассеты используют относительные пути; SDK подключается.

#### T-060. QA checklist
**Цель:** финальная проверка.
**Acceptance:** core loop работает; combo работает; specials работают; pure работает; Fury работает; rewarded работает; save работает; onboarding проходится; нет критичных багов.

---

## B.19. Рекомендуемый roadmap

### Неделя 1. Core (T-001..T-023)
Результат: headless-логика полностью работает; все критичные тесты зелёные; можно симулировать партию без Phaser.

### Неделя 2. Phaser greybox (T-030..T-037)
Результат: поле видно; фигуры таскаются; спецфигуры вызываются; HUD работает.

### Неделя 3. Игровой поток (T-040..T-046)
Результат: полный цикл партии; линии; комбо; очищение; Fury; game over.

### Неделя 4. Платформа и полировка (T-050..T-060)
Результат: Yandex SDK; сейвы; аналитика; онбординг; звук; FX; билд для публикации.

---

## B.20. Правила для агентов

### Обязательные правила

1. Язык: TypeScript strict.
2. Рендер: Phaser 3.
3. Сборка: Vite.
4. Тесты: Vitest.
5. Core-логика не импортирует Phaser.
6. Все числа баланса берутся из config.
7. Любое изменение правил сопровождается тестом.
8. Нельзя добавлять новые механики без изменения GDD.
9. Нельзя использовать `any` без комментария.
10. SDK вызывается только через IPlatform.
11. Сохранения только через platform/storage.
12. Аналитика только через platform/analytics.

### Definition of Done для задачи

- Код компилируется без ошибок.
- ESLint без ошибок.
- Vitest проходит.
- Нет импорта Phaser в core.
- Нет хардкода баланса вне config.
- Изменение проверено в dev-сборке.
- Обновлён changelog или комментарий в задаче.

---

## B.21. Технические риски TS + Phaser

| Риск | Митигейшн |
|---|---|
| Drag & drop неудобен на мобильных | Кастомный DragController, смещение фигуры вверх, pointercancel, preview |
| Phaser-сцены превратятся в spaghetti | Жёсткое разделение: core / game / platform |
| Агенты будут писать логику в сценах | Запрет импорта Phaser в core, code review, тесты |
| SDK-реклама сломает состояние игры | Пауза игры перед рекламой, resume после, таймеры на timestamp |
| Сейвы повредятся | Версия save-схемы, валидация, fallback на новый сейв |
| Большой билд | Атласы, сжатие, lazy assets, size budget |
| Много частиц на слабых устройствах | Object pool, лимиты, mobile fallback |
| Баланс будет меняться и ломать код | Все таблицы в config, тесты на правила, а не на числа |
| Онбординг не доведёт до комбо | Controlled-спавн, аналитика `first_special_received` |
| Fury-таймеры поедут при сворачивании | Использовать timestamp и паузу при `visibilitychange` |
