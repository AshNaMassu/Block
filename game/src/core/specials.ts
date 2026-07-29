/**
 * Спецфигуры: регионы и wildcard-fill (GDD-2 v1.3, секция 3.3).
 *
 * Спецфигура втекает в область — заполняет ПУСТЫЕ клетки как multi-special.
 * Занятые клетки не трогает (безопаснее, не ломает стихийные линии).
 *
 * Регионы:
 * - 💣 Bomb: квадрат 2×2 от точки тапа, clamp к полю.
 * - ⚡ Line: строка ИЛИ столбец (по orientation).
 * - ✚ Cross: строка + столбец через target.
 * - ☄ Apocalypse: 2 строки + 2 столбца от target как upper-left 2×2, clamp.
 *
 * Использование валидно, если в области есть ≥1 пустая клетка (GDD 3.3).
 */
import { BOARD_SIZE } from '../config/balance';
import type { Cell, Grid, LineOrientation, SpecialType, Vec2 } from './types';
import { isInside } from './grid';

/** Клетка спецфигуры (multi + special=true). */
export function makeSpecialCell(): Cell {
  return { element: -1, multi: true, special: true };
}

/**
 * Получить регион спецфигуры по типу и точке тапа.
 * Для Line требует orientation. Возвращает ВСЕ клетки области (включая вне поля? нет — clamp).
 *
 * @param type тип спецфигуры
 * @param target точка тапа (для Bomb/Cross/Apocalypse — anchor; для Line — координата в линии)
 * @param orientation только для Line: 'row' | 'column'
 */
export function getSpecialRegion(
  type: SpecialType,
  target: Vec2,
  orientation?: LineOrientation,
): Vec2[] {
  switch (type) {
    case 'bomb':
      return bombRegion(target);
    case 'line':
      return lineRegion(target, orientation ?? 'row');
    case 'cross':
      return crossRegion(target);
    case 'apocalypse':
      return apocalypseRegion(target);
  }
}

/** Регион Bomb: 2×2 от target как upper-left, clamp к полю. */
function bombRegion(target: Vec2): Vec2[] {
  // Clamp upper-left так, чтобы 2×2 поместился в поле
  const x0 = Math.min(target.x, BOARD_SIZE - 2);
  const y0 = Math.min(target.y, BOARD_SIZE - 2);
  const cells: Vec2[] = [];
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      cells.push({ x: x0 + dx, y: y0 + dy });
    }
  }
  return cells;
}

/** Регион Line: вся строка или весь столбец через target. */
function lineRegion(target: Vec2, orientation: LineOrientation): Vec2[] {
  const cells: Vec2[] = [];
  if (orientation === 'row') {
    for (let x = 0; x < BOARD_SIZE; x++) cells.push({ x, y: target.y });
  } else {
    for (let y = 0; y < BOARD_SIZE; y++) cells.push({ x: target.x, y });
  }
  return cells;
}

/** Регион Cross: строка + столбец через target (15 уникальных клеток). */
function crossRegion(target: Vec2): Vec2[] {
  const seen = new Set<number>();
  const cells: Vec2[] = [];
  const push = (x: number, y: number) => {
    const k = y * BOARD_SIZE + x;
    if (!seen.has(k)) {
      seen.add(k);
      cells.push({ x, y });
    }
  };
  for (let x = 0; x < BOARD_SIZE; x++) push(x, target.y);
  for (let y = 0; y < BOARD_SIZE; y++) push(target.x, y);
  return cells;
}

/** Регион Apocalypse: 2 строки + 2 столбца от target как upper-left 2×2, clamp. */
function apocalypseRegion(target: Vec2): Vec2[] {
  const x0 = Math.min(target.x, BOARD_SIZE - 2);
  const y0 = Math.min(target.y, BOARD_SIZE - 2);
  const rows = [y0, y0 + 1];
  const cols = [x0, x0 + 1];
  const seen = new Set<number>();
  const cells: Vec2[] = [];
  const push = (x: number, y: number) => {
    const k = y * BOARD_SIZE + x;
    if (!seen.has(k)) {
      seen.add(k);
      cells.push({ x, y });
    }
  };
  for (const r of rows) for (let x = 0; x < BOARD_SIZE; x++) push(x, r);
  for (const c of cols) for (let y = 0; y < BOARD_SIZE; y++) push(c, y);
  return cells;
}

/** Найти пустые клетки в области. */
export function getEmptyCellsInRegion(grid: Grid, region: Vec2[]): Vec2[] {
  return region.filter((c) => isInside(c.x, c.y) && grid[c.y]![c.x] === null);
}

/**
 * Заполнить пустые клетки области как special-multi.
 * Мутирует grid. Возвращает число заполненных и их координаты.
 *
 * НЕ заполняет занятые клетки.
 */
export function fillSpecialCells(
  grid: Grid,
  region: Vec2[],
): {
  filled: number;
  cells: Vec2[];
} {
  const filledCells: Vec2[] = [];
  const cell = makeSpecialCell();
  for (const c of region) {
    if (isInside(c.x, c.y) && grid[c.y]![c.x] === null) {
      grid[c.y]![c.x] = { ...cell };
      filledCells.push(c);
    }
  }
  return { filled: filledCells.length, cells: filledCells };
}

/**
 * Валидна ли постановка спецфигуры: в области есть ≥1 пустая клетка.
 * GDD 3.3: если пустых нет — использование отменяется.
 */
export function canUseSpecial(grid: Grid, region: Vec2[]): boolean {
  return getEmptyCellsInRegion(grid, region).length > 0;
}
