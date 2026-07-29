/**
 * Операции над полем 8×8.
 *
 * Все функции чистые (кроме явной мутации переданного grid).
 * Не зависит от Phaser.
 */
import { BOARD_SIZE } from '../config/balance';
import type { Cell, Grid, Vec2 } from './types';

/** Создать пустое поле 8×8 (все клетки null). */
export function createGrid(): Grid {
  const grid: Grid = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    grid[y] = new Array<Cell | null>(BOARD_SIZE).fill(null);
  }
  return grid;
}

/** Глубокая копия поля (для снимков). */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/** Проверка, что координата в пределах поля. */
export function isInside(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/** Пустая ли клетка (null). */
export function isEmpty(grid: Grid, x: number, y: number): boolean {
  return grid[y]![x] === null;
}

/** Есть ли на поле хоть одна пустая клетка. */
export function hasAnyEmptyCell(grid: Grid): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (grid[y]![x] === null) return true;
    }
  }
  return false;
}

/** Есть ли на поле хоть одна заполненная клетка. */
export function hasAnyFilledCell(grid: Grid): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (grid[y]![x] !== null) return true;
    }
  }
  return false;
}

/** Поставить клетку. Мутирует grid. */
export function setCell(grid: Grid, x: number, y: number, cell: Cell): void {
  grid[y]![x] = cell;
}

/** Получить клетку (или null). */
export function getCell(grid: Grid, x: number, y: number): Cell | null {
  return grid[y]![x];
}

/** Очистить указанные клетки (→ null). Мутирует grid. */
export function clearCells(grid: Grid, cells: Vec2[]): void {
  for (const { x, y } of cells) {
    if (isInside(x, y)) grid[y]![x] = null;
  }
}

/** Подсчитать заполненные клетки. */
export function countFilled(grid: Grid): number {
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (grid[y]![x] !== null) count++;
    }
  }
  return count;
}

/** Подсчитать клетки с флагом special (от спецфигур, для аналитики). */
export function countSpecialCells(grid: Grid): number {
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const c = grid[y]![x];
      if (c?.special) count++;
    }
  }
  return count;
}

/** Дамп поля в компактную строку (для дебага и тестов). */
export function gridToString(grid: Grid): string {
  const char = (c: Cell | null): string => {
    if (!c) return '.';
    if (c.multi) return c.special ? 'S' : 'M';
    return String(c.element);
  };
  return grid.map((row) => row.map(char).join('')).join('\n');
}
