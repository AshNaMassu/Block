import { describe, it, expect } from 'vitest';
import {
  createGrid,
  cloneGrid,
  isInside,
  isEmpty,
  hasAnyEmptyCell,
  hasAnyFilledCell,
  setCell,
  getCell,
  clearCells,
  countFilled,
  countSpecialCells,
  gridToString,
} from '../grid';
import { BOARD_SIZE } from '../../config/balance';
import type { Cell } from '../types';

const fire: Cell = { element: 0, multi: false, special: false };
const special: Cell = { element: -1, multi: true, special: true };

describe('grid', () => {
  describe('createGrid', () => {
    it('создаёт поле BOARD_SIZE × BOARD_SIZE из null', () => {
      const g = createGrid();
      expect(g).toHaveLength(BOARD_SIZE);
      expect(g[0]).toHaveLength(BOARD_SIZE);
      for (const row of g) for (const c of row) expect(c).toBeNull();
    });
  });

  describe('cloneGrid', () => {
    it('делает глубокую копию', () => {
      const g = createGrid();
      setCell(g, 0, 0, fire);
      const clone = cloneGrid(g);
      // Мутируем клон — оригинал не должен измениться
      setCell(clone, 0, 0, special);
      expect(getCell(g, 0, 0)).toEqual(fire);
      expect(getCell(clone, 0, 0)).toEqual(special);
    });
  });

  describe('isInside', () => {
    it('внутри — true', () => {
      expect(isInside(0, 0)).toBe(true);
      expect(isInside(BOARD_SIZE - 1, BOARD_SIZE - 1)).toBe(true);
    });
    it('снаружи — false', () => {
      expect(isInside(-1, 0)).toBe(false);
      expect(isInside(0, -1)).toBe(false);
      expect(isInside(BOARD_SIZE, 0)).toBe(false);
      expect(isInside(0, BOARD_SIZE)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('null → true, занятая → false', () => {
      const g = createGrid();
      expect(isEmpty(g, 0, 0)).toBe(true);
      setCell(g, 0, 0, fire);
      expect(isEmpty(g, 0, 0)).toBe(false);
    });
  });

  describe('hasAnyEmptyCell / hasAnyFilledCell', () => {
    it('пустое поле: empty=true, filled=false', () => {
      const g = createGrid();
      expect(hasAnyEmptyCell(g)).toBe(true);
      expect(hasAnyFilledCell(g)).toBe(false);
    });
    it('полностью заполненное поле: empty=false, filled=true', () => {
      const g = createGrid();
      for (let y = 0; y < BOARD_SIZE; y++)
        for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, y, fire);
      expect(hasAnyEmptyCell(g)).toBe(false);
      expect(hasAnyFilledCell(g)).toBe(true);
    });
  });

  describe('setCell / getCell', () => {
    it('ставит и читает клетку', () => {
      const g = createGrid();
      setCell(g, 3, 4, fire);
      expect(getCell(g, 3, 4)).toEqual(fire);
      expect(getCell(g, 0, 0)).toBeNull();
    });
  });

  describe('clearCells', () => {
    it('очищает указанные клетки, остальные не трогает', () => {
      const g = createGrid();
      setCell(g, 0, 0, fire);
      setCell(g, 1, 0, fire);
      setCell(g, 2, 0, fire);
      clearCells(g, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
      expect(getCell(g, 0, 0)).toBeNull();
      expect(getCell(g, 1, 0)).toBeNull();
      expect(getCell(g, 2, 0)).toEqual(fire);
    });
    it('игнорирует координаты вне поля', () => {
      const g = createGrid();
      expect(() => clearCells(g, [{ x: -1, y: 0 }])).not.toThrow();
      expect(() => clearCells(g, [{ x: 0, y: 99 }])).not.toThrow();
    });
  });

  describe('countFilled', () => {
    it('считает заполненные', () => {
      const g = createGrid();
      expect(countFilled(g)).toBe(0);
      setCell(g, 0, 0, fire);
      setCell(g, 1, 1, fire);
      expect(countFilled(g)).toBe(2);
    });
  });

  describe('countSpecialCells', () => {
    it('считает только special-клетки', () => {
      const g = createGrid();
      setCell(g, 0, 0, fire);
      setCell(g, 1, 0, special);
      setCell(g, 2, 0, { element: -1, multi: true, special: false });
      expect(countSpecialCells(g)).toBe(1);
    });
  });

  describe('gridToString', () => {
    it('читаемый дамп', () => {
      const g = createGrid();
      setCell(g, 0, 0, fire);
      setCell(g, 1, 0, { element: 1, multi: false, special: false });
      setCell(g, 2, 0, special);
      const s = gridToString(g);
      expect(s.split('\n')).toHaveLength(BOARD_SIZE);
      expect(s.startsWith('01S')).toBe(true); // fire=0, water=1, special=S
    });
  });
});
