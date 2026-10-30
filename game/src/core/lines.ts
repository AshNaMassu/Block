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
import type { Cell, ElementId, Grid, LineInfo, LineOrientation } from './types';

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
 * Неполная стихийная линия — «нить» (DES-6, DESIGN §6).
 *
 * Ряд/столбец, где все обычные не-multi клетки одной стихии, их 6 или 7,
 * а остальные клетки пусты или multi (multi совместим с любой стихией —
 * радуга, поставленная в пустую клетку, замыкает нить в стихийную линию).
 */
export interface ElementalThread {
  type: LineOrientation;
  index: number;
  /** Стихия нити (цвет свечения). */
  element: ElementId;
  /** Сколько обычных клеток стихии уже стоит (6 или 7). */
  natural: number;
}

/**
 * Найти все нити на поле (6–7 клеток одной стихии, без чужих стихий в линии).
 * Порядок как у findFullLines: строки сверху вниз, затем столбцы слева направо.
 */
export function findElementalThreads(grid: Grid): ElementalThread[] {
  const threads: ElementalThread[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const t = threadInLine(Array.from({ length: BOARD_SIZE }, (_, x) => grid[y]![x]));
    if (t) threads.push({ type: 'row', index: y, ...t });
  }
  for (let x = 0; x < BOARD_SIZE; x++) {
    const t = threadInLine(Array.from({ length: BOARD_SIZE }, (_, y) => grid[y]![x]));
    if (t) threads.push({ type: 'column', index: x, ...t });
  }
  return threads;
}

/** Стихия нити в линии из 8 клеток, null — нити нет. */
function threadInLine(cells: (Cell | null)[]): { element: ElementId; natural: number } | null {
  let element: ElementId | null = null;
  let natural = 0;
  let empty = 0;
  for (const c of cells) {
    if (!c) {
      empty++;
      continue;
    }
    if (c.multi) continue; // multi совместим с любой стихией
    const el = c.element as ElementId; // multi отсечён выше — стихия обычная
    if (element === null) element = el;
    else if (el !== element) return null; // чужая стихия — нити нет
    natural++;
  }
  if (element === null || natural < 6 || empty === 0) return null;
  return { element, natural };
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
