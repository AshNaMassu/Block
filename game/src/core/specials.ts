/**
 * Спецфигуры-детонаторы: обычные фигуры в руке, которые при постановке детонируют.
 *
 * Четыре стихии — четыре детонатора (редизайн GDD-2 v1.3 §3.3):
 * - 🔥 Fire (Пожар) 1×1: выжигает область 3×3 вокруг клетки. Разрушенные клетки
 *   очищаются, пустые заполняются огнём («взрыв со следом»).
 * - 💧 Tide (Прилив) 1×2: смывает всю строку или столбец. Ориентация решается
 *   самим перетаскиванием (горизонтально положил = строка, вертикально = столбец).
 *   Пустые клетки линии заполняются водой (след).
 * - 🌀 Vortex (Вихрь) 1×1: сметает со всего поля все клетки самой частой стихии
 *   (детерминировано: при равенстве — меньший ElementId). Без следа — его «след»
 *   это само освобождённое место.
 * - 🌿 Spring (Родник) 2×2: перекрашивает область 4×4 вокруг себя в доминирующую
 *   стихию области (пустые клетки тоже заполняются). Конструктивный сетап-инструмент.
 *
 * Детонация каждой спецфигуры даёт +1 ⚡ в шкалу своей стихии (engine).
 */
import { BOARD_SIZE } from '../config/balance';
import type {
  Cell,
  DetonationResult,
  ElementId,
  Grid,
  LineOrientation,
  SpecialType,
  Vec2,
} from './types';
import { isInside } from './grid';

/** Стихия детонатора (его цвет и энергия от детонации). */
export const SPECIAL_ELEMENT: Record<SpecialType, ElementId> = {
  fire: 0,
  tide: 1,
  spring: 2,
  vortex: 3,
};

/** Форма спецфигуры в руке. Tide имеет две ориентации, остальные фиксированы. */
export function specialShape(type: SpecialType, orientation: LineOrientation = 'row'): Vec2[] {
  switch (type) {
    case 'fire':
      return [{ x: 0, y: 0 }];
    case 'tide':
      return orientation === 'row'
        ? [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ]
        : [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ];
    case 'vortex':
      return [{ x: 0, y: 0 }];
    case 'spring':
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ];
  }
}

/** Клетка стихии детонатора (обычная клетка элемента; multi не нужен — детонирует сразу). */
export function makeSpecialCell(type: SpecialType): Cell {
  return { element: SPECIAL_ELEMENT[type], multi: false, special: false };
}

/**
 * Область детонации по типу и точке постановки (upper-left клетки фигуры).
 * Vortex не имеет фиксированной области — см. getVortexSweep.
 */
export function getDetonationRegion(
  type: SpecialType,
  target: Vec2,
  orientation: LineOrientation = 'row',
): Vec2[] {
  switch (type) {
    case 'fire':
      return regionAround(target, 1);
    case 'tide':
      return lineRegion(target, orientation);
    case 'vortex':
      return [];
    case 'spring':
      // 4×4 вокруг 2×2 фигуры: центр фигуры = target..target+1, область = ±1.
      return regionAround({ x: target.x, y: target.y }, 1, 4);
  }
}

/** Квадрат размера size×size с центром на target (radius = (size-1)/2), clamp к полю. */
function regionAround(center: Vec2, radius: number, size = 3): Vec2[] {
  const cells: Vec2[] = [];
  const x0 = center.x - radius;
  const y0 = center.y - radius;
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (isInside(x0 + dx, y0 + dy)) cells.push({ x: x0 + dx, y: y0 + dy });
    }
  }
  return cells;
}

/** Регион Tide: вся строка (row) или столбец (column) через target. */
function lineRegion(target: Vec2, orientation: LineOrientation): Vec2[] {
  const cells: Vec2[] = [];
  if (orientation === 'row') {
    for (let x = 0; x < BOARD_SIZE; x++) cells.push({ x, y: target.y });
  } else {
    for (let y = 0; y < BOARD_SIZE; y++) cells.push({ x: target.x, y });
  }
  return cells;
}

/**
 * Доминирующая стихия среди занятых не-multi клеток в списке.
 * При равенстве — меньший ElementId. Если клеток нет → fallback (или null).
 */
export function dominantElement(
  grid: Grid,
  cells: Vec2[],
  fallback: ElementId | null = null,
): ElementId | null {
  const counts = [0, 0, 0, 0];
  let any = false;
  for (const c of cells) {
    if (!isInside(c.x, c.y)) continue;
    const cell = grid[c.y]![c.x];
    if (cell && !cell.multi) {
      counts[cell.element]++;
      any = true;
    }
  }
  if (!any) return fallback;
  let best = 0;
  for (let e = 1; e < counts.length; e++) {
    if (counts[e]! > counts[best]!) best = e;
  }
  return best as ElementId;
}

/**
 * Вихрь: самая частая стихия на поле (не-multi клетки).
 * При равенстве — меньший ElementId. Пустое поле → null.
 */
export function getVortexSweep(grid: Grid): { element: ElementId; cells: Vec2[] } | null {
  const element = dominantElement(grid, allCells(), null);
  if (element === null) return null;
  const cells = allCells().filter((c) => {
    const cell = grid[c.y]![c.x];
    return cell !== null && !cell.multi && cell.element === element;
  });
  return { element, cells };
}

function allCells(): Vec2[] {
  const cells: Vec2[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) cells.push({ x, y });
  }
  return cells;
}

/**
 * Детонировать спецфигуру в точке постановки. Мутирует grid.
 * Вызывается engine ПОСЛЕ постановки клетки фигуры и ДО скана линий.
 *
 * Паттерн «взрыв со следом» (fire/tide): сначала clear занятых клеток области,
 * затем пустые (изначально пустые) клетки заполняются стихией детонатора.
 */
export function detonate(
  grid: Grid,
  type: SpecialType,
  target: Vec2,
  orientation: LineOrientation = 'row',
): DetonationResult {
  const element = SPECIAL_ELEMENT[type];

  if (type === 'vortex') {
    const sweep = getVortexSweep(grid);
    if (!sweep) {
      return {
        type,
        element,
        region: [],
        destroyed: [],
        seeded: [],
        repainted: [],
        sweptElement: null,
      };
    }
    clearCellsAt(grid, sweep.cells);
    return {
      type,
      element,
      region: sweep.cells,
      destroyed: sweep.cells,
      seeded: [],
      repainted: [],
      sweptElement: sweep.element,
    };
  }

  const region = getDetonationRegion(type, target, orientation);
  const destroyed: Vec2[] = [];
  const seeded: Vec2[] = [];
  const repainted: Vec2[] = [];

  if (type === 'spring') {
    // Родник: перекрасить ВСЮ область в доминирующую стихию области,
    // пустые клетки заполнить. Разрушений нет.
    const dominant = dominantElement(grid, region, element) ?? element;
    for (const c of region) {
      const cell = grid[c.y]![c.x];
      if (cell === null) {
        grid[c.y]![c.x] = { element: dominant, multi: false, special: false };
        seeded.push(c);
      } else if (!cell.multi && cell.element !== dominant) {
        grid[c.y]![c.x] = { element: dominant, multi: false, special: false };
        repainted.push(c);
      } else if (cell.multi) {
        grid[c.y]![c.x] = { element: dominant, multi: false, special: false };
        repainted.push(c);
      }
    }
    return { type, element, region, destroyed, seeded, repainted, sweptElement: null };
  }

  // Fire/Tide: разрушить занятые, пустые заполнить следом стихии.
  for (const c of region) {
    if (grid[c.y]![c.x] !== null) destroyed.push(c);
  }
  clearCellsAt(grid, destroyed);
  for (const c of region) {
    if (grid[c.y]![c.x] === null) {
      grid[c.y]![c.x] = makeSpecialCell(type);
      seeded.push(c);
    }
  }
  return { type, element, region, destroyed, seeded, repainted, sweptElement: null };
}

function clearCellsAt(grid: Grid, cells: Vec2[]): void {
  for (const { x, y } of cells) {
    if (isInside(x, y)) grid[y]![x] = null;
  }
}
