import { describe, it, expect } from 'vitest';
import { classifyLine, findFullLines, unionLineCells } from '../lines';
import { createGrid, setCell } from '../grid';
import { BOARD_SIZE } from '../../config/balance';
import type { Cell } from '../types';

const fire = (extra: Partial<Cell> = {}): Cell => ({
  element: 0,
  multi: false,
  special: false,
  ...extra,
});
const water = (): Cell => ({ element: 1, multi: false, special: false });
const multi = (extra: Partial<Cell> = {}): Cell => ({
  element: -1,
  multi: true,
  special: false,
  ...extra,
});

describe('lines', () => {
  describe('classifyLine', () => {
    it('8 fire -> elemental fire', () => {
      const cells = Array.from({ length: 8 }, () => fire());
      expect(classifyLine(cells)).toEqual({ isElemental: true, element: 0 });
    });

    it('mixed natural elements -> normal', () => {
      const cells = [fire(), fire(), water(), fire(), fire(), fire(), fire(), fire()];
      expect(classifyLine(cells)).toEqual({ isElemental: false, element: null });
    });

    it('7 fire + 1 multi -> elemental fire (multi counts as any)', () => {
      const cells = [fire(), fire(), fire(), fire(), fire(), fire(), fire(), multi()];
      expect(classifyLine(cells)).toEqual({ isElemental: true, element: 0 });
    });

    it('1 fire + 7 multi -> elemental fire', () => {
      const cells = [fire(), multi(), multi(), multi(), multi(), multi(), multi(), multi()];
      expect(classifyLine(cells)).toEqual({ isElemental: true, element: 0 });
    });

    it('8 multi -> normal (PROTECTION vs free elemental line)', () => {
      const cells = Array.from({ length: 8 }, () => multi());
      expect(classifyLine(cells)).toEqual({ isElemental: false, element: null });
    });

    it('8 special-multi -> normal (special is subset of multi)', () => {
      const cells = Array.from({ length: 8 }, () => multi({ special: true }));
      expect(classifyLine(cells)).toEqual({ isElemental: false, element: null });
    });
  });

  describe('findFullLines', () => {
    it('empty grid -> no lines', () => {
      expect(findFullLines(createGrid())).toEqual([]);
    });

    it('full fire row -> 1 elemental row', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 3, fire());
      const lines = findFullLines(g);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ type: 'row', index: 3, isElemental: true, element: 0 });
    });

    it('full mixed row -> normal', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, x % 2 === 0 ? fire() : water());
      const lines = findFullLines(g);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ type: 'row', isElemental: false, element: null });
    });

    it('order: rows top->bottom, then columns left->right', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 5, fire());
      for (let y = 0; y < BOARD_SIZE; y++) {
        setCell(g, 2, y, fire());
        setCell(g, 4, y, fire());
      }
      const lines = findFullLines(g);
      expect(lines.map((l) => `${l.type}${l.index}`)).toEqual(['row5', 'column2', 'column4']);
    });

    it('row and column intersect: both found', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 3, fire());
      for (let y = 0; y < BOARD_SIZE; y++) setCell(g, 3, y, fire());
      const lines = findFullLines(g);
      expect(lines).toHaveLength(2);
      expect(lines.some((l) => l.type === 'row' && l.index === 3)).toBe(true);
      expect(lines.some((l) => l.type === 'column' && l.index === 3)).toBe(true);
    });

    it('each line has 8 cells', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      const lines = findFullLines(g);
      expect(lines[0]!.cells).toHaveLength(BOARD_SIZE);
    });
  });

  describe('unionLineCells', () => {
    it('deduplicates row/column intersections', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 3, fire());
      for (let y = 0; y < BOARD_SIZE; y++) setCell(g, 3, y, fire());
      const lines = findFullLines(g);
      const union = unionLineCells(lines);
      // 8 + 8 - 1 (intersection) = 15
      expect(union).toHaveLength(15);
      const keys = new Set(union.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(15);
    });

    it('empty list -> empty result', () => {
      expect(unionLineCells([])).toEqual([]);
    });

    it('one line -> 8 cells', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      const lines = findFullLines(g);
      expect(unionLineCells(lines)).toHaveLength(8);
    });
  });
});
