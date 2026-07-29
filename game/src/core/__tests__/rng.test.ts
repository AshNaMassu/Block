import { describe, it, expect } from 'vitest';
import { createRng, randomSeed, randInt, pick } from '../rng';

describe('rng', () => {
  describe('createRng', () => {
    it('одинаковый seed → одинаковая последовательность', () => {
      const a = createRng(42);
      const b = createRng(42);
      const seqA = Array.from({ length: 10 }, () => a.next());
      const seqB = Array.from({ length: 10 }, () => b.next());
      expect(seqA).toEqual(seqB);
    });

    it('разный seed → разная последовательность', () => {
      const a = createRng(1);
      const b = createRng(2);
      const seqA = Array.from({ length: 10 }, () => a.next());
      const seqB = Array.from({ length: 10 }, () => b.next());
      expect(seqA).not.toEqual(seqB);
    });

    it('значения в диапазоне [0, 1)', () => {
      const rng = createRng(123);
      for (let i = 0; i < 1000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('getState возобновляет последовательность', () => {
      const a = createRng(999);
      a.next();
      a.next();
      const state = a.getState();
      // Продолжаем
      const next3A = [a.next(), a.next(), a.next()];
      // Создаём новый с тем же состоянием
      const b = createRng(state);
      const next3B = [b.next(), b.next(), b.next()];
      expect(next3A).toEqual(next3B);
    });
  });

  describe('randomSeed', () => {
    it('возвращает целое в диапазоне uint32', () => {
      for (let i = 0; i < 100; i++) {
        const s = randomSeed();
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(s)).toBe(true);
      }
    });
  });

  describe('randInt', () => {
    it('возвращает значения в [0, n)', () => {
      const rng = createRng(7);
      for (let i = 0; i < 1000; i++) {
        const v = randInt(rng.next, 6);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(6);
      }
    });

    it('n=1 всегда возвращает 0', () => {
      const rng = createRng(7);
      for (let i = 0; i < 100; i++) {
        expect(randInt(rng.next, 1)).toBe(0);
      }
    });

    it('бросает на n <= 0', () => {
      const rng = createRng(7);
      expect(() => randInt(rng.next, 0)).toThrow();
      expect(() => randInt(rng.next, -1)).toThrow();
    });
  });

  describe('pick', () => {
    it('возвращает элемент массива', () => {
      const rng = createRng(5);
      const arr = ['a', 'b', 'c'];
      for (let i = 0; i < 100; i++) {
        expect(arr).toContain(pick(rng.next, arr));
      }
    });

    it('бросает на пустом массиве', () => {
      const rng = createRng(5);
      expect(() => pick(rng.next, [])).toThrow();
    });
  });
});
