import { describe, it, expect } from 'vitest';
import {
  makeSpecialCell,
  getSpecialRegion,
  getEmptyCellsInRegion,
  fillSpecialCells,
  canUseSpecial,
} from '../specials';
import { createGrid, setCell, getCell } from '../grid';
import { BOARD_SIZE } from '../../config/balance';
import type { Cell } from '../types';

const fire = (): Cell => ({ element: 0, multi: false, special: false });

describe('specials', () => {
  describe('makeSpecialCell', () => {
    it('element=-1, multi=true, special=true', () => {
      expect(makeSpecialCell()).toEqual({ element: -1, multi: true, special: true });
    });
  });

  describe('getSpecialRegion — Bomb', () => {
    it('2×2 от (2,2) → 4 клетки', () => {
      const r = getSpecialRegion('bomb', { x: 2, y: 2 });
      expect(r).toHaveLength(4);
      expect(r).toContainEqual({ x: 2, y: 2 });
      expect(r).toContainEqual({ x: 3, y: 3 });
    });
    it('clamp у правого края: (7,7) → (6,6)..(7,7)', () => {
      const r = getSpecialRegion('bomb', { x: 7, y: 7 });
      expect(r.map((c) => `${c.x},${c.y}`).sort()).toEqual(['6,6', '6,7', '7,6', '7,7']);
    });
    it('clamp у нижнего края: (5,7) → верх 6', () => {
      const r = getSpecialRegion('bomb', { x: 5, y: 7 });
      expect(r.every((c) => c.y >= 6 && c.y <= 7)).toBe(true);
      expect(r.every((c) => c.x >= 5 && c.x <= 6)).toBe(true);
    });
  });

  describe('getSpecialRegion — Line', () => {
    it('row: 8 клеток в строке target.y', () => {
      const r = getSpecialRegion('line', { x: 3, y: 4 }, 'row');
      expect(r).toHaveLength(8);
      expect(r.every((c) => c.y === 4)).toBe(true);
    });
    it('column: 8 клеток в столбце target.x', () => {
      const r = getSpecialRegion('line', { x: 3, y: 4 }, 'column');
      expect(r).toHaveLength(8);
      expect(r.every((c) => c.x === 3)).toBe(true);
    });
    it('без orientation → default row', () => {
      const r = getSpecialRegion('line', { x: 0, y: 0 });
      expect(r.every((c) => c.y === 0)).toBe(true);
    });
  });

  describe('getSpecialRegion — Cross', () => {
    it('строка + столбец = 15 уникальных клеток', () => {
      const r = getSpecialRegion('cross', { x: 3, y: 4 });
      expect(r).toHaveLength(15); // 8 + 8 - 1
      const keys = new Set(r.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(15);
    });
    it('содержит пересечение', () => {
      const r = getSpecialRegion('cross', { x: 3, y: 4 });
      expect(r).toContainEqual({ x: 3, y: 4 });
    });
  });

  describe('getSpecialRegion — Apocalypse', () => {
    it('2 строки + 2 столбца = 28 уникальных клеток', () => {
      const r = getSpecialRegion('apocalypse', { x: 2, y: 2 });
      // 2*8 + 2*8 - 4 (пересечения 2×2) = 28
      expect(r).toHaveLength(28);
      const keys = new Set(r.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(28);
    });
    it('clamp у края: (7,7) → rows 6,7 cols 6,7', () => {
      const r = getSpecialRegion('apocalypse', { x: 7, y: 7 });
      // Все клетки в строках 6,7 или столбцах 6,7
      expect(r.every((c) => c.y === 6 || c.y === 7 || c.x === 6 || c.x === 7)).toBe(true);
    });
  });

  describe('getEmptyCellsInRegion', () => {
    it('пустое поле → все клетки региона пустые', () => {
      const g = createGrid();
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      expect(getEmptyCellsInRegion(g, region)).toHaveLength(4);
    });
    it('занятые клетки исключаются', () => {
      const g = createGrid();
      setCell(g, 2, 2, fire());
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      expect(getEmptyCellsInRegion(g, region)).toHaveLength(3);
    });
  });

  describe('fillSpecialCells', () => {
    it('заполняет пустые клетки special-multi', () => {
      const g = createGrid();
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      const res = fillSpecialCells(g, region);
      expect(res.filled).toBe(4);
      for (const c of region) {
        expect(getCell(g, c.x, c.y)).toEqual({ element: -1, multi: true, special: true });
      }
    });
    it('не трогает занятые клетки', () => {
      const g = createGrid();
      setCell(g, 2, 2, fire());
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      const res = fillSpecialCells(g, region);
      expect(res.filled).toBe(3);
      expect(getCell(g, 2, 2)).toEqual(fire()); // не перезаписана
    });
    it('если всё занято → filled=0', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      const res = fillSpecialCells(g, region);
      expect(res.filled).toBe(0);
    });
  });

  describe('canUseSpecial', () => {
    it('есть пустая клетка → true', () => {
      const g = createGrid();
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      expect(canUseSpecial(g, region)).toBe(true);
    });
    it('всё забито → false', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const region = getSpecialRegion('bomb', { x: 2, y: 2 });
      expect(canUseSpecial(g, region)).toBe(false);
    });
  });
});
