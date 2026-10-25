import { describe, it, expect } from 'vitest';
import {
  SPECIAL_ELEMENT,
  specialShape,
  getDetonationRegion,
  dominantElement,
  getVortexSweep,
  detonate,
} from '../specials';
import { createGrid, setCell, getCell } from '../grid';
import type { Cell, ElementId } from '../types';

const el = (e: ElementId): Cell => ({ element: e, multi: false, special: false });
const multi = (): Cell => ({ element: -1, multi: true, special: false });

describe('specials — детонаторы', () => {
  describe('SPECIAL_ELEMENT', () => {
    it('fire=0, tide=1, spring=2, vortex=3', () => {
      expect(SPECIAL_ELEMENT.fire).toBe(0);
      expect(SPECIAL_ELEMENT.tide).toBe(1);
      expect(SPECIAL_ELEMENT.spring).toBe(2);
      expect(SPECIAL_ELEMENT.vortex).toBe(3);
    });
  });

  describe('specialShape', () => {
    it('fire — 1×1', () => {
      expect(specialShape('fire')).toEqual([{ x: 0, y: 0 }]);
    });
    it('tide row — 1×2 горизонтально, column — вертикально', () => {
      expect(specialShape('tide', 'row')).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
      expect(specialShape('tide', 'column')).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ]);
    });
    it('vortex — 1×1, spring — 2×2', () => {
      expect(specialShape('vortex')).toHaveLength(1);
      expect(specialShape('spring')).toHaveLength(4);
    });
  });

  describe('getDetonationRegion — Fire 3×3', () => {
    it('3×3 вокруг клетки, в поле', () => {
      const r = getDetonationRegion('fire', { x: 3, y: 3 });
      expect(r).toHaveLength(9);
      expect(r).toContainEqual({ x: 2, y: 2 });
      expect(r).toContainEqual({ x: 4, y: 4 });
    });
    it('у края clamp: (0,0) → только внутри поля', () => {
      const r = getDetonationRegion('fire', { x: 0, y: 0 });
      expect(r).toHaveLength(4); // (0,0),(1,0),(0,1),(1,1)
      expect(r.every((c) => c.x >= 0 && c.y >= 0)).toBe(true);
    });
  });

  describe('getDetonationRegion — Tide строка/столбец', () => {
    it('row: вся строка 8 клеток', () => {
      const r = getDetonationRegion('tide', { x: 3, y: 4 }, 'row');
      expect(r).toHaveLength(8);
      expect(r.every((c) => c.y === 4)).toBe(true);
    });
    it('column: весь столбец 8 клеток', () => {
      const r = getDetonationRegion('tide', { x: 3, y: 4 }, 'column');
      expect(r).toHaveLength(8);
      expect(r.every((c) => c.x === 3)).toBe(true);
    });
  });

  describe('getDetonationRegion — Spring 4×4', () => {
    it('4×4 вокруг 2×2 фигуры', () => {
      const r = getDetonationRegion('spring', { x: 3, y: 3 });
      expect(r).toHaveLength(16);
      expect(r).toContainEqual({ x: 2, y: 2 });
      expect(r).toContainEqual({ x: 5, y: 5 });
    });
    it('у края clamp: (0,0) → клетки 0..2', () => {
      const r = getDetonationRegion('spring', { x: 0, y: 0 });
      expect(r).toHaveLength(9);
      expect(r.every((c) => c.x >= 0 && c.x <= 2 && c.y >= 0 && c.y <= 2)).toBe(true);
    });
  });

  describe('dominantElement', () => {
    it('самая частая стихия; при равенстве — меньший id', () => {
      const g = createGrid();
      setCell(g, 0, 0, el(0));
      setCell(g, 1, 0, el(0));
      setCell(g, 2, 0, el(1));
      expect(
        dominantElement(g, [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ]),
      ).toBe(0);
      setCell(g, 3, 0, el(1));
      // 2 огня vs 2 воды → меньший id (огонь)
      expect(
        dominantElement(g, [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 3, y: 0 },
        ]),
      ).toBe(0);
    });
    it('multi-клетки не учитываются', () => {
      const g = createGrid();
      setCell(g, 0, 0, multi());
      setCell(g, 1, 0, el(2));
      expect(
        dominantElement(g, [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ]),
      ).toBe(2);
    });
    it('нет занятых → fallback', () => {
      const g = createGrid();
      expect(dominantElement(g, [{ x: 0, y: 0 }], 3)).toBe(3);
      expect(dominantElement(g, [{ x: 0, y: 0 }])).toBeNull();
    });
  });

  describe('getVortexSweep', () => {
    it('самая частая стихия и все её клетки', () => {
      const g = createGrid();
      setCell(g, 0, 0, el(0));
      setCell(g, 1, 0, el(0));
      setCell(g, 2, 0, el(1));
      const sweep = getVortexSweep(g);
      expect(sweep!.element).toBe(0);
      expect(sweep!.cells).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    });
    it('пустое поле → null', () => {
      expect(getVortexSweep(createGrid())).toBeNull();
    });
    it('при равенстве — меньший ElementId', () => {
      const g = createGrid();
      setCell(g, 0, 0, el(3));
      setCell(g, 1, 0, el(1));
      expect(getVortexSweep(g)!.element).toBe(1);
    });
  });

  describe('detonate — Fire: разрушение + след из огня', () => {
    it('занятые очищаются, пустые заполняются огнём', () => {
      const g = createGrid();
      setCell(g, 3, 3, el(1)); // вода — разрушится
      // (2,2) останется пустой до детонации → станет огнём
      const res = detonate(g, 'fire', { x: 3, y: 3 });
      expect(res.type).toBe('fire');
      expect(res.element).toBe(0);
      expect(res.destroyed).toEqual([{ x: 3, y: 3 }]);
      expect(res.seeded).toHaveLength(9); // вся 3×3 пустая после выжигания
      for (const c of res.region) {
        expect(getCell(g, c.x, c.y)).toEqual(el(0));
      }
    });
    it('клетки следа — обычные клетки стихии (не multi)', () => {
      const g = createGrid();
      detonate(g, 'fire', { x: 4, y: 4 });
      const c = getCell(g, 4, 4)!;
      expect(c.multi).toBe(false);
      expect(c.element).toBe(0);
    });
  });

  describe('detonate — Tide: смыв строки/столбца + след из воды', () => {
    it('row: занятые смыты, вся строка становится водой (→ стихийная линия)', () => {
      const g = createGrid();
      setCell(g, 0, 2, el(0));
      setCell(g, 7, 2, el(3));
      const res = detonate(g, 'tide', { x: 3, y: 2 }, 'row');
      expect(res.destroyed).toEqual([
        { x: 0, y: 2 },
        { x: 7, y: 2 },
      ]);
      expect(res.seeded).toHaveLength(8); // вся строка — след из воды
      for (let x = 0; x < 8; x++) {
        expect(getCell(g, x, 2)).toEqual(el(1));
      }
    });
    it('column: аналогично для столбца', () => {
      const g = createGrid();
      setCell(g, 5, 0, el(0));
      const res = detonate(g, 'tide', { x: 5, y: 4 }, 'column');
      expect(res.destroyed).toEqual([{ x: 5, y: 0 }]);
      expect(res.seeded).toHaveLength(8);
      expect(getCell(g, 5, 4)).toEqual(el(1));
    });
  });

  describe('detonate — Vortex: сметание стихии', () => {
    it('убирает все клетки самой частой стихии, без следа', () => {
      const g = createGrid();
      setCell(g, 0, 0, el(0));
      setCell(g, 1, 1, el(0));
      setCell(g, 2, 2, el(1));
      setCell(g, 3, 3, multi());
      const res = detonate(g, 'vortex', { x: 0, y: 0 });
      expect(res.sweptElement).toBe(0);
      expect(res.destroyed).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
      expect(res.seeded).toEqual([]);
      expect(getCell(g, 0, 0)).toBeNull();
      expect(getCell(g, 2, 2)).toEqual(el(1)); // вода не тронута
      expect(getCell(g, 3, 3)).toEqual(multi()); // multi не тронута
    });
    it('пустое поле → пустая детонация', () => {
      const res = detonate(createGrid(), 'vortex', { x: 0, y: 0 });
      expect(res.sweptElement).toBeNull();
      expect(res.destroyed).toEqual([]);
    });
  });

  describe('detonate — Spring: перекраска 4×4 в доминанту', () => {
    it('занятые перекрашиваются, пустые заполняются', () => {
      const g = createGrid();
      setCell(g, 2, 2, el(0)); // огонь
      setCell(g, 3, 3, el(0)); // огонь
      setCell(g, 4, 4, el(1)); // вода — перекрасится
      const res = detonate(g, 'spring', { x: 3, y: 3 });
      expect(res.type).toBe('spring');
      expect(res.destroyed).toEqual([]);
      expect(res.seeded).toHaveLength(13); // 16 - 3 занятые
      expect(res.repainted).toEqual([{ x: 4, y: 4 }]); // вода → доминанта
      for (const c of res.region) {
        expect(getCell(g, c.x, c.y)).toEqual(el(0)); // вся 4×4 — огонь
      }
    });
    it('пустая область → доминанта = стихия Родника (земля)', () => {
      const g = createGrid();
      const res = detonate(g, 'spring', { x: 3, y: 3 });
      expect(getCell(g, 3, 3)).toEqual(el(2));
      expect(res.seeded).toHaveLength(16);
    });
    it('multi-клетки перекрашиваются в доминанту', () => {
      const g = createGrid();
      setCell(g, 3, 3, multi());
      setCell(g, 4, 4, el(1));
      const res = detonate(g, 'spring', { x: 3, y: 3 });
      // Вода единственная не-multi → доминанта 1
      expect(getCell(g, 3, 3)).toEqual(el(1));
      expect(res.repainted).toContainEqual({ x: 3, y: 3 });
    });
  });
});
