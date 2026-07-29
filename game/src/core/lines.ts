/**
 * Детекция и классификация линий.
 *
 * Правила (GDD-2 v1.3, секция 3.1):
 * - Линия = строка или столбец, заполненные 8/8.
 * - Стихийная линия: в ней есть хотя бы одна обычная не-multi клетка,
 *   и все такие клетки одной стихии. Multi-клетки считаются любой стихией.
 * - Защита от «бесплатной» стихийной линии: 8 multi = обычная линия (GDD 3.1).
 *
 * Порядок детерминированный (GDD 3.6): сначала строки сверху вниз (row 0..7),
 * затем столбцы слева направо (col 0..7). Это влияет на порядок gainedElements,
 * consumed слотов энергии и расчёт Чистого Очищения.
 */
import { BOARD_SIZE } from '../config/balance';
import type { Cell, Grid, LineInfo, LineOrientation } from './types';

/**
 * Классифицировать уже найденную линию (8 клеток).
 *
 * Алгоритм:
 * 1. Собрать обычные не-multi клетки.
 * 2. Если их 0 → обычная (8 multi, защита).
 * 3. Если все одной стихии → стихийная.
 * 4. Иначе → обычная.
 */
export function classifyLine(cells: (Cell | null)[]): {
  isElemental: boolean;
  element: number | null;
} {
  // Обычные не-multi клетки
  const natural: number[] = [];
  for (const c of cells) {
    if (c && !c.multi) natural.push(c.element);
  }
  if (natural.length === 0) return { isElemental: false, element: null };
  const first = natural[0]!;
  for (const el of natural) {
    if (el !== first) return { isElemental: false, element: null };
  }
  return { isElemental: true, element: first };
}

/** Полная ли строка. */
function isRowFull(grid: Grid, y: number): boolean {
  for (let x = 0; x < BOARD_SIZE; x++) {
    if (grid[y]![x] === null) return false;
  }
  return true;
}

/** Полный ли столбец. */
function isColFull(grid: Grid, x: number): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    if (grid[y]![x] === null) return false;
  }
  return true;
}

/**
 * Найти все полные линии на снимке поля.
 *
 * Порядок: строки сверху вниз, затем столбцы слева направо.
 * Возвращает массив LineInfo в этом порядке.
 */
export function findFullLines(grid: Grid): LineInfo[] {
  const lines: LineInfo[] = [];

  // Строки сверху вниз
  for (let y = 0; y < BOARD_SIZE; y++) {
    if (!isRowFull(grid, y)) continue;
    const cells = Array.from({ length: BOARD_SIZE }, (_, x) => ({ x, y }));
    const { isElemental, element } = classifyLine(cells.map((c) => grid[c.y]![c.x]));
    lines.push({
      type: 'row' as LineOrientation,
      index: y,
      cells,
      isElemental,
      element: element as LineInfo['element'],
    });
  }

  // Столбцы слева направо
  for (let x = 0; x < BOARD_SIZE; x++) {
    if (!isColFull(grid, x)) continue;
    const cells = Array.from({ length: BOARD_SIZE }, (_, y) => ({ x, y }));
    const { isElemental, element } = classifyLine(cells.map((c) => grid[c.y]![c.x]));
    lines.push({
      type: 'column' as LineOrientation,
      index: x,
      cells,
      isElemental,
      element: element as LineInfo['element'],
    });
  }

  return lines;
}

/**
 * Собрать множество всех клеток из списка линий (для snapshot-очистки).
 * Дедуплицирует пересечения (строка ∩ столбец = 1 клетка).
 */
export function unionLineCells(lines: LineInfo[]): { x: number; y: number }[] {
  const seen = new Set<number>();
  const out: { x: number; y: number }[] = [];
  for (const line of lines) {
    for (const c of line.cells) {
      const k = c.y * BOARD_SIZE + c.x;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ x: c.x, y: c.y });
      }
    }
  }
  return out;
}
