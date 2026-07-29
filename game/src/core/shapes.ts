/**
 * Работа с формами фигур: повороты, нормализация, проверка постановки, спавн.
 *
 * Не зависит от Phaser. Конфиг масок и весов — в `src/config/shapes.ts`.
 */
import { BASE_SHAPES, SHAPE_CATEGORIES } from '../config/shapes';
import type { Grid, Piece, ShapeDefinition, Vec2 } from './types';
import { isInside, isEmpty } from './grid';
import { randInt, pick } from './rng';
import { ELEMENT_COUNT } from '../config/balance';

// ─── Базовый пул с поворотами (генерируется один раз) ───────────────────────

/** Сериализовать cells в строку для дедупликации. Координаты должны быть нормализованы. */
function keyOf(cells: Vec2[]): string {
  return cells
    .map((c) => `${c.x},${c.y}`)
    .sort()
    .join('|');
}

/** Нормализовать cells: сдвинуть так, чтобы min x = 0, min y = 0. */
function normalize(cells: Vec2[]): Vec2[] {
  let minX = Infinity;
  let minY = Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
  }
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
}

/** Повернуть cells на 90° по часовой: (x, y) → (-y, x), затем нормализовать. */
function rotate90(cells: Vec2[]): Vec2[] {
  return normalize(cells.map(({ x, y }) => ({ x: -y, y: x })));
}

/** Сгенерировать все уникальные повороты базовой маски (0°, 90°, 180°, 270°). */
function uniqueRotations(base: Vec2[]): Vec2[][] {
  const seen = new Set<string>();
  const result: Vec2[][] = [];
  let current = normalize(base);
  for (let i = 0; i < 4; i++) {
    const k = keyOf(current);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(current);
    }
    current = rotate90(current);
  }
  return result;
}

/** Полный пул форм со всеми уникальными поворотами. Генерируется один раз при импорте. */
function buildPool(): ShapeDefinition[] {
  const pool: ShapeDefinition[] = [];
  for (const base of BASE_SHAPES) {
    const rotations = uniqueRotations(base.cells);
    rotations.forEach((cells, i) => {
      pool.push({
        id: rotations.length === 1 ? base.id : `${base.id}__r${i}`,
        name: base.name,
        cells,
        cellCount: cells.length,
        baseId: base.id,
      });
    });
  }
  return pool;
}

export const SHAPE_POOL: readonly ShapeDefinition[] = buildPool();

// ─── Поиск и проверка постановки ────────────────────────────────────────────

/** Получить форму по id. */
export function getShapeById(id: string): ShapeDefinition {
  const s = SHAPE_POOL.find((x) => x.id === id);
  if (!s) throw new Error(`Shape not found: ${id}`);
  return s;
}

/** Все формы. */
export function getAllShapes(): readonly ShapeDefinition[] {
  return SHAPE_POOL;
}

/** Клетки формы при постановке в опорную точку target. */
export function getShapeCells(shape: Vec2[], target: Vec2): Vec2[] {
  return shape.map((c) => ({ x: target.x + c.x, y: target.y + c.y }));
}

/** Можно ли поставить форму (все клетки в поле и пустые). */
export function canPlaceShape(grid: Grid, shape: Vec2[], target: Vec2): boolean {
  for (const c of getShapeCells(shape, target)) {
    if (!isInside(c.x, c.y) || !isEmpty(grid, c.x, c.y)) return false;
  }
  return true;
}

/** Существует ли хоть одна позиция, куда можно поставить форму. */
export function canPlaceAnywhere(grid: Grid, shape: Vec2[]): boolean {
  // Перебор всех опорных точек на поле
  const size = grid.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (canPlaceShape(grid, shape, { x, y })) return true;
    }
  }
  return false;
}

// ─── Спавн фигур ────────────────────────────────────────────────────────────

/**
 * Выбрать форму по весам категорий.
 * Алгоритм:
 * 1. Выбрать категорию (по весу).
 * 2. Среди форм с cellCount == категории выбрать случайную.
 * 3. Среди её поворотов — случайный.
 */
function pickShapeByWeight(rngNext: () => number): ShapeDefinition {
  const totalWeight = SHAPE_CATEGORIES.reduce((s, c) => s + c.weight, 0);
  let r = randInt(rngNext, totalWeight);
  let chosenCategory = SHAPE_CATEGORIES[0]!;

  for (const cat of SHAPE_CATEGORIES) {
    if (r < cat.weight) {
      chosenCategory = cat;
      break;
    }
    r -= cat.weight;
  }

  const categoryShapes = SHAPE_POOL.filter((s) => s.cellCount === chosenCategory.cellCount);

  if (categoryShapes.length === 0) {
    // Фоллбэк: любая форма
    return pick(rngNext, SHAPE_POOL);
  }

  // Сначала выбираем базовую маску, затем её ориентацию.
  // Это соответствует GDD: веса применяются к базовой маске, не к каждому повороту.
  const baseIds = [...new Set(categoryShapes.map((s) => s.baseId))];
  const baseId = pick(rngNext, baseIds);
  const rotations = categoryShapes.filter((s) => s.baseId === baseId);

  return pick(rngNext, rotations);
}

/** Счётчик для генерации уникальных id фигур. */
let pieceIdCounter = 0;

/** Сбросить счётчик id (для тестов). */
export function resetPieceIdCounter(): void {
  pieceIdCounter = 0;
}

/** Сгенерировать случайную обычную фигуру: форма по весам + случайная стихия. */
export function spawnNormalPiece(rngNext: () => number): Piece {
  const shape = pickShapeByWeight(rngNext);
  const element = randInt(rngNext, ELEMENT_COUNT) as 0 | 1 | 2 | 3;
  return {
    id: `n${pieceIdCounter++}`,
    kind: 'normal',
    shape: shape.cells.map((c) => ({ ...c })),
    element,
  };
}

/** Сгенерировать тройку обычных фигур (обновление руки). */
export function spawnNormalBatch(rngNext: () => number, count: number): Piece[] {
  return Array.from({ length: count }, () => spawnNormalPiece(rngNext));
}
