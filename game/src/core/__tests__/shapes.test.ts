import { describe, it, expect } from 'vitest';
import {
  SHAPE_POOL,
  getShapeById,
  getAllShapes,
  getShapeCells,
  canPlaceShape,
  canPlaceAnywhere,
  spawnNormalPiece,
  spawnNormalBatch,
  resetPieceIdCounter,
} from '../shapes';
import { createGrid, setCell } from '../grid';
import { createRng } from '../rng';
import { BOARD_SIZE } from '../../config/balance';

describe('shapes', () => {
  describe('SHAPE_POOL (генерация поворотов)', () => {
    it('содержит все базовые формы (по baseId)', () => {
      const baseIds = new Set(SHAPE_POOL.map((s) => s.baseId));
      for (const expected of [
        'Dot',
        'I2',
        'I3',
        'I4',
        'I5',
        'Square2',
        'Square3',
        'L',
        'J',
        'T',
        'S',
        'Z',
      ]) {
        expect(baseIds.has(expected)).toBe(true);
      }
    });

    it('Square2 и Square3 имеют 1 ориентацию (симметричные)', () => {
      const sq2 = SHAPE_POOL.filter((s) => s.baseId === 'Square2');
      const sq3 = SHAPE_POOL.filter((s) => s.baseId === 'Square3');
      expect(sq2).toHaveLength(1);
      expect(sq3).toHaveLength(1);
    });

    it('Dot имеет 1 ориентацию', () => {
      expect(SHAPE_POOL.filter((s) => s.baseId === 'Dot')).toHaveLength(1);
    });

    it('I2–I5 имеют по 2 ориентации (H/V)', () => {
      for (const id of ['I2', 'I3', 'I4', 'I5']) {
        expect(SHAPE_POOL.filter((s) => s.baseId === id)).toHaveLength(2);
      }
    });

    it('S/Z имеют по 2 ориентации', () => {
      expect(SHAPE_POOL.filter((s) => s.baseId === 'S')).toHaveLength(2);
      expect(SHAPE_POOL.filter((s) => s.baseId === 'Z')).toHaveLength(2);
    });

    it('L/J/T имеют по 4 ориентации', () => {
      for (const id of ['L', 'J', 'T']) {
        expect(SHAPE_POOL.filter((s) => s.baseId === id)).toHaveLength(4);
      }
    });

    it('все повороты нормализованы (min x=0, min y=0)', () => {
      for (const s of SHAPE_POOL) {
        const minX = Math.min(...s.cells.map((c) => c.x));
        const minY = Math.min(...s.cells.map((c) => c.y));
        expect(minX).toBe(0);
        expect(minY).toBe(0);
      }
    });

    it('все повороты уникальны внутри baseId', () => {
      const byBase = new Map<string, string[]>();
      for (const s of SHAPE_POOL) {
        const key = s.cells
          .map((c) => `${c.x},${c.y}`)
          .sort()
          .join('|');
        const arr = byBase.get(s.baseId) ?? [];
        arr.push(key);
        byBase.set(s.baseId, arr);
      }
      for (const keys of byBase.values()) {
        expect(new Set(keys).size).toBe(keys.length);
      }
    });

    it('каждая форма сохраняет число клеток базовой маски', () => {
      for (const s of SHAPE_POOL) {
        expect(s.cells).toHaveLength(s.cellCount);
      }
    });
  });

  describe('getShapeById', () => {
    it('находит форму по id', () => {
      const s = getShapeById('I3__r0');
      expect(s.baseId).toBe('I3');
    });
    it('бросает на неизвестном id', () => {
      expect(() => getShapeById('Nope')).toThrow();
    });
  });

  describe('getShapeCells', () => {
    it('сдвигает клетки на target', () => {
      const cells = getShapeCells(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        { x: 3, y: 4 },
      );
      expect(cells).toEqual([
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ]);
    });
  });

  describe('canPlaceShape', () => {
    it('true для пустой области в поле', () => {
      const g = createGrid();
      const i3 = getShapeById('I3__r0');
      expect(canPlaceShape(g, i3.cells, { x: 0, y: 0 })).toBe(true);
    });
    it('false если клетка занята', () => {
      const g = createGrid();
      setCell(g, 1, 0, { element: 0, multi: false, special: false });
      const i3 = getShapeById('I3__r0');
      expect(canPlaceShape(g, i3.cells, { x: 0, y: 0 })).toBe(false);
    });
    it('false если выходит за границу', () => {
      const g = createGrid();
      const i3 = getShapeById('I3__r0');
      expect(canPlaceShape(g, i3.cells, { x: BOARD_SIZE - 1, y: 0 })).toBe(false);
    });
  });

  describe('canPlaceAnywhere', () => {
    it('true на пустом поле', () => {
      const g = createGrid();
      const i3 = getShapeById('I3__r0');
      expect(canPlaceAnywhere(g, i3.cells)).toBe(true);
    });
    it('false если всё забито', () => {
      const g = createGrid();
      for (let y = 0; y < BOARD_SIZE; y++)
        for (let x = 0; x < BOARD_SIZE; x++)
          setCell(g, x, y, { element: 0, multi: false, special: false });
      const i3 = getShapeById('I3__r0');
      expect(canPlaceAnywhere(g, i3.cells)).toBe(false);
    });
    it('true если есть хоть одна подходящая область', () => {
      const g = createGrid();
      // Заполняем всё, оставляя полосу 1×3 пустой
      for (let y = 0; y < BOARD_SIZE; y++)
        for (let x = 0; x < BOARD_SIZE; x++)
          if (!(y === 0 && x < 3)) setCell(g, x, y, { element: 0, multi: false, special: false });
      const i3 = getShapeById('I3__r0');
      expect(canPlaceAnywhere(g, i3.cells)).toBe(true);
      // А I4 уже не влезет
      const i4 = getShapeById('I4__r0');
      expect(canPlaceAnywhere(g, i4.cells)).toBe(false);
    });
  });

  describe('spawnNormalPiece', () => {
    it('генерирует фигуру с kind=normal и элементом 0..3', () => {
      resetPieceIdCounter();
      const rng = createRng(42);
      const p = spawnNormalPiece(rng.next);
      expect(p.kind).toBe('normal');
      expect(p.element).toBeGreaterThanOrEqual(0);
      expect(p.element).toBeLessThanOrEqual(3);
      expect(p.shape.length).toBeGreaterThan(0);
      expect(typeof p.id).toBe('string');
    });

    it('детерминирован при одинаковом seed', () => {
      resetPieceIdCounter();
      const a = spawnNormalPiece(createRng(99).next);
      resetPieceIdCounter();
      const b = spawnNormalPiece(createRng(99).next);
      expect(a).toEqual(b);
    });

    it('id уникальны и возрастают', () => {
      resetPieceIdCounter();
      const rng = createRng(1).next;
      const a = spawnNormalPiece(rng);
      const b = spawnNormalPiece(rng);
      const c = spawnNormalPiece(rng);
      expect(a.id).not.toBe(b.id);
      expect(b.id).not.toBe(c.id);
    });
  });

  describe('spawnNormalBatch', () => {
    it('генерирует count фигур', () => {
      resetPieceIdCounter();
      const rng = createRng(7).next;
      const batch = spawnNormalBatch(rng, 3);
      expect(batch).toHaveLength(3);
      expect(batch.every((p) => p.kind === 'normal')).toBe(true);
    });
  });

  describe('getAllShapes', () => {
    it('возвращает тот же массив, что SHAPE_POOL', () => {
      expect(getAllShapes()).toBe(SHAPE_POOL);
    });
  });
});
