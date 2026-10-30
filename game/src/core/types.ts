/**
 * Базовые типы core-логики. Соответствуют TECH_TASKS.md B.5 + GDD-2 v1.3.
 *
 * Здесь НЕТ зависимости от Phaser — только чистые данные.
 */

/** Стихия: 🔥 огонь / 💧 вода / 🌿 земля / 💨 воздух. */
export type ElementId = 0 | 1 | 2 | 3;

/**
 * Спецфигура-детонатор: 🔥 Пожар / 💧 Прилив / 🌀 Вихрь / 🌿 Родник.
 * Одинаковые с обычными фигурами: ставятся перетаскиванием, при постановке детонируют.
 * Эскалация по мощности: fire → tide → vortex → spring.
 */
export type SpecialType = 'fire' | 'tide' | 'vortex' | 'spring';

/** Тип фигуры в руке. */
export type PieceKind = 'normal' | 'rainbow' | 'special';

/** Ориентация для спецфигуры Линия (ряд/столбец). */
export type LineOrientation = 'row' | 'column';

/** Тип постановки — для защиты от рекурсии спецфигур (GDD 3.4). */
export type PlacementSource = 'normal' | 'rainbow' | 'special';

/** Координата клетки на поле. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Клетка поля.
 * - `element`: стихия (0..3) для обычной клетки, или -1 для multi-клетки.
 * - `multi`: флаг мульти-стихийной клетки (считается любой стихией в линиях).
 *   У обычных клеток false.
 * - `special`: флаг клетки, созданной спецфигурой (подмножество multi).
 *   Нужен для аналитики и визуала.
 */
export interface Cell {
  element: ElementId | -1;
  multi: boolean;
  special: boolean;
}

/** Поле 8×8. null — пустая клетка. */
export type Grid = (Cell | null)[][];

/** Маска формы фигуры — список клеток относительно опорной (target). */
export interface ShapeDefinition {
  /** Стабильный идентификатор формы, напр. 'L-small', 'Square3'. */
  id: string;
  /** Человекочитаемое имя. */
  name: string;
  /** Клетки формы, координаты относительно (0,0) — опорной точки. */
  cells: Vec2[];
  /** Размер bounding box (для категоризации весов). */
  cellCount: number;
  /** Имя базовой маски (до поворота) — для применения весов. */
  baseId: string;
}

/** Фигура в руке. */
export interface Piece {
  /** Уникальный идентификатор фигуры в рамках сессии. */
  id: string;
  kind: PieceKind;
  /** Для normal/rainbow — клетки формы. У special фигуры форма не определена. */
  shape: Vec2[];
  /** Для normal/special — стихия. У rainbow — undefined. */
  element?: ElementId;
  /** Для special — тип спецфигуры-детонатора. */
  special?: SpecialType;
  /** Для special Tide — ориентация постановки (1×2 → строка, 2×1 → столбец). */
  orientation?: LineOrientation;
}

/** Рука: 6 слотов (3 обычных + до 3 бонусных). null — пустой слот. */
export type Hand = (Piece | null)[];

/**
 * Активный Fury Mode.
 * - `until`: Unix-millis, до какого момента действует.
 * - `mult`: множитель очков (1.5..5.0).
 * - `element`: стихия Очищения, запустившего Fury (для визуала).
 */
export interface FuryState {
  until: number;
  mult: number;
  element: ElementId;
}

/** Состояние шкалы Энергии: 3 слота. */
export interface EnergyState {
  slots: ElementId[];
}

/** Состояние RNG (для детерминированности и сейвов). */
export type RngState = number;

/** Награда спецфигурой (от комбо или Чистого Очищения). */
export interface SpecialReward {
  type: SpecialType;
  count: number;
}

/** Информация о замкнутой линии (результат детекции). */
export interface LineInfo {
  type: LineOrientation;
  /** Индекс строки или столбца. */
  index: number;
  /** Клетки линии (8 штук). */
  cells: Vec2[];
  /** Стихийная ли линия (8/8 одной стихии, см. GDD 3.1). */
  isElemental: boolean;
  /** Стихия для стихийной линии, null для обычной. */
  element: ElementId | null;
}

/** Награда Очищения (Ось В — переполнение, GDD 4.3). */
export interface CleansingReward {
  /** Величина переполнения 0..5. */
  overflow: number;
  /** Базовые очки Очищения (до множителей pure/fury). */
  baseScore: number;
  /** Звёзды. */
  stars: number;
  /** Сколько радужных выдать (поверх базы 3). */
  rainbowCount: number;
  /** Длительность Fury в секундах. */
  furySec: number;
  /** Множитель Fury. */
  furyMult: number;
  /** Чистое ли Очищение (3 consumed одной стихии). */
  isPure: boolean;
  /** Стихия consumed-слотов (для чистого — единственная, иначе первая). */
  element: ElementId;
}

/** Награда за комбо стихийных линий (Ось Б, GDD 3.2). */
export interface ComboReward {
  /** Сколько стихийных линий в комбо (2..6). */
  lines: number;
  /** Бонусные очки за комбо. */
  bonusScore: number;
  /** Спецфигура (null если линий < 2). */
  special: SpecialReward | null;
}

/**
 * Результат детонации спецфигуры при постановке.
 * Детонация мутирует grid ДО скана линий — «след» (seeded/repainted) может
 * замкнуть линии, которые засчитаются в том же ходе.
 */
export interface DetonationResult {
  type: SpecialType;
  /** Стихия детонатора (и его следа). */
  element: ElementId;
  /** Все клетки области детонации (для FX). */
  region: Vec2[];
  /** Разрушенные клетки (были заняты → очищены). */
  destroyed: Vec2[];
  /** Клетки следа: были пустыми → заполнены стихией детонатора. */
  seeded: Vec2[];
  /** Перекрашенные клетки (Родник: занятые, сменившие стихию). */
  repainted: Vec2[];
  /** Сметённая стихия (Вихрь), null для остальных. */
  sweptElement: ElementId | null;
}

/**
 * Полный результат постановки фигуры или использования спецфигуры.
 * То, что view получает от engine, чтобы отыграть FX и обновить UI.
 */
export interface PlacementResult {
  ok: boolean;
  /** Причина, если ok=false (напр. 'no_empty_cells'). */
  reason?: string;
  /** Клетки, поставленные/заполненные фигурой. */
  placedCells: Vec2[];
  /** Замкнутые линии (по снимку). */
  clearedLines: LineInfo[];
  /** Сколько из них стихийных. */
  elementalLines: number;
  /** Очки за линии (1000/2500 × количество). */
  lineScore: number;
  /** Очистка (Ось В), null если не было. */
  combo: ComboReward | null;
  /** Очищение (Ось В), null если не было. */
  cleansing: CleansingReward | null;
  /** Сработало ли Чистое Очищение (Ось Г). */
  pure: boolean;
  /** Детонация спецфигуры, null если это не спецфигура. */
  detonation: DetonationResult | null;
  /** Итоговые очки за ход (все оси + конвертации). */
  scoreGained: number;
  /** Звёзды за ход. */
  starsGained: number;
  /** Сколько радужных добавлено в руку. */
  rainbowAdded: number;
  /** Спецфигура, добавленная в руку (от комбо/чистого). */
  specialAdded: SpecialReward | null;
  /** Запущенный/перезаписанный Fury, null если не было. */
  furyStarted: FuryState | null;
  /** Обновилась ли обычная тройка (refill). */
  handRefilled: boolean;
  /** Наступил ли Game Over после хода. */
  gameOver: boolean;
}

/** Статистика забега (DES-13, для Game Over). */
export interface RunStats {
  /** Закрыто линий всего. */
  lines: number;
  /** Из них стихийных. */
  elemental: number;
  /** Очищений. */
  cleansings: number;
  /** Лучшее комбо (макс. линий за ход). */
  maxCombo: number;
  /** Использовано детонаторов. */
  specialsUsed: number;
}

/** Полное игровое состояние (сериализуется в сейв). */
export interface GameState {
  grid: Grid;
  hand: Hand;
  score: number;
  best: number;
  stars: number;
  energy: EnergyState;
  fury: FuryState | null;
  rngState: RngState;
  tutorialCompleted: boolean;
  runStats: RunStats;
}
