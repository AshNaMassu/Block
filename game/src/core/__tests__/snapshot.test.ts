import { describe, it, expect } from 'vitest';
import { scanSnapshot, applyClear, scoreForLine } from '../snapshot';
import { createGrid, setCell, getCell } from '../grid';
import { BOARD_SIZE, SCORE_LINE_NORMAL, SCORE_LINE_ELEMENTAL } from '../../config/balance';
import type { Cell } from '../types';

const fire = (): Cell => ({ element: 0, multi: false, special: false });
const water = (): Cell => ({ element: 1, multi: false, special: false });
const multi = (): Cell => ({ element: -1, multi: true, special: false });

describe('snapshot', () => {
  describe('scanSnapshot', () => {
    it('empty grid -> no lines, zero score', () => {
      const s = scanSnapshot(createGrid());
      expect(s.lines).toHaveLength(0);
      expect(s.elementalLines).toHaveLength(0);
      expect(s.lineScore).toBe(0);
      expect(s.gainedElements).toHaveLength(0);
      expect(s.cellsToClear).toHaveLength(0);
    });

    it('1 elemental row -> correct score + element', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      const s = scanSnapshot(g);
      expect(s.lines).toHaveLength(1);
      expect(s.elementalLines).toHaveLength(1);
      expect(s.lineScore).toBe(SCORE_LINE_ELEMENTAL);
      expect(s.gainedElements).toEqual([0]);
      expect(s.cellsToClear).toHaveLength(8);
    });

    it('1 normal row -> normal score, no element', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, x % 2 === 0 ? fire() : water());
      const s = scanSnapshot(g);
      expect(s.elementalLines).toHaveLength(0);
      expect(s.lineScore).toBe(SCORE_LINE_NORMAL);
      expect(s.gainedElements).toHaveLength(0);
    });

    it('row + column intersect -> both counted, union dedup', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 3, fire());
      for (let y = 0; y < BOARD_SIZE; y++) setCell(g, 3, y, fire());
      const s = scanSnapshot(g);
      expect(s.lines).toHaveLength(2);
      expect(s.elementalLines).toHaveLength(2);
      expect(s.lineScore).toBe(2 * SCORE_LINE_ELEMENTAL);
      expect(s.gainedElements).toEqual([0, 0]);
      // 8 + 8 - 1 intersection = 15
      expect(s.cellsToClear).toHaveLength(15);
    });

    it('elemental row (fire) + elemental column (water) -> 2 different elements', () => {
      const g = createGrid();
      // Row 0: fire (7 cells, col 3 оставлен)
      for (let x = 0; x < BOARD_SIZE; x++) if (x !== 3) setCell(g, x, 0, fire());
      // Col 3: water (rows 1..7) + water at (3,0) для пересечения НЕ делаем
      // Нужна строка 0 огнём ВСЯ, и столбец 3 водою ВСЯ — пересечение (3,0) одно,
      // оно не может быть одновременно огнём и водой. Делаем (3,0)=multi.
      setCell(g, 3, 0, multi());
      for (let y = 1; y < BOARD_SIZE; y++) setCell(g, 3, y, water());
      const s = scanSnapshot(g);
      expect(s.elementalLines).toHaveLength(2);
      // row0 = fire (multi counts as fire), column3 = water (multi counts as water)
      expect(s.gainedElements).toEqual([0, 1]);
    });

    it('gainedElements в порядке строк-затем-столбцов', () => {
      const g = createGrid();
      // Две строки (0 и 5) огнём, один столбец (3) водой
      for (let x = 0; x < BOARD_SIZE; x++) {
        setCell(g, x, 0, x === 3 ? multi() : fire());
        setCell(g, x, 5, x === 3 ? multi() : fire());
      }
      for (let y = 1; y < BOARD_SIZE; y++) if (y !== 5) setCell(g, 3, y, water());
      const s = scanSnapshot(g);
      // Порядок: row0, row5, column3
      expect(s.lines.map((l) => `${l.type}${l.index}`)).toEqual(['row0', 'row5', 'column3']);
      expect(s.gainedElements).toEqual([0, 0, 1]);
    });

    it('не мутирует grid', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      const before = JSON.stringify(g);
      scanSnapshot(g);
      expect(JSON.stringify(g)).toBe(before);
    });
  });

  describe('applyClear', () => {
    it('очищает клетки из cellsToClear', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      const s = scanSnapshot(g);
      applyClear(g, s.cellsToClear);
      for (let x = 0; x < BOARD_SIZE; x++) expect(getCell(g, x, 0)).toBeNull();
    });

    it('оставляет клетки вне линий', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 0, fire());
      setCell(g, 0, 1, fire()); // вне линии
      const s = scanSnapshot(g);
      applyClear(g, s.cellsToClear);
      expect(getCell(g, 0, 1)).not.toBeNull();
    });
  });

  describe('scoreForLine', () => {
    it('elemental vs normal', () => {
      expect(scoreForLine(true)).toBe(SCORE_LINE_ELEMENTAL);
      expect(scoreForLine(false)).toBe(SCORE_LINE_NORMAL);
    });
  });

  describe('защита от double-clear бага', () => {
    it('пересечение строки и столбца: обе линии в подсчёте до очистки', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++) setCell(g, x, 3, fire());
      for (let y = 0; y < BOARD_SIZE; y++) setCell(g, 3, y, fire());
      const s = scanSnapshot(g);
      // КРИТИЧНО: обе линии найдены на снимке (не «одна удалилась, другая потерялась»)
      expect(s.lines).toHaveLength(2);
      // Очистка одним проходом по union
      applyClear(g, s.cellsToClear);
      // Поле должно быть чистым от линий (но могла остаться клетка вне линий)
      const after = scanSnapshot(g);
      expect(after.lines).toHaveLength(0);
    });
  });
});
