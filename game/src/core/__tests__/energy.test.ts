import { describe, it, expect } from 'vitest';
import { addEnergy, freeSlots, isFull } from '../energy';
import { ENERGY_CAPACITY, OVERFLOW_CAP } from '../../config/balance';
import type { ElementId } from '../types';

const F = 0 as ElementId;
const W = 1 as ElementId;

describe('energy', () => {
  describe('freeSlots / isFull', () => {
    it('empty → all free', () => {
      expect(freeSlots([])).toBe(ENERGY_CAPACITY);
      expect(isFull([])).toBe(false);
    });
    it('full → 0 free', () => {
      expect(freeSlots([F, F, F])).toBe(0);
      expect(isFull([F, F, F])).toBe(true);
    });
  });

  describe('addEnergy — без Очищения', () => {
    it('0/3 + 1 → 1/3, no cleansing', () => {
      const r = addEnergy([], [F]);
      expect(r.slots).toEqual([F]);
      expect(r.cleansing).toBeNull();
    });
    it('0/3 + 2 → 2/3, no cleansing', () => {
      const r = addEnergy([], [F, F]);
      expect(r.slots).toEqual([F, F]);
      expect(r.cleansing).toBeNull();
    });
    it('1/3 + 1 → 2/3, no cleansing', () => {
      const r = addEnergy([F], [W]);
      expect(r.slots).toEqual([F, W]);
      expect(r.cleansing).toBeNull();
    });
  });

  describe('addEnergy — Очищение ровно в 3/3 (overflow 0)', () => {
    it('2/3 + 1 → cleansing overflow 0, slots empty', () => {
      const r = addEnergy([F, F], [F]);
      expect(r.slots).toEqual([]);
      expect(r.cleansing).not.toBeNull();
      expect(r.cleansing!.overflow).toBe(0);
    });
    it('0/3 + 3 → cleansing overflow 0', () => {
      const r = addEnergy([], [F, F, F]);
      expect(r.cleansing!.overflow).toBe(0);
      expect(r.slots).toEqual([]);
    });
  });

  describe('addEnergy — переполнение', () => {
    it('2/3 + 2 → overflow +1', () => {
      const r = addEnergy([F, F], [F, F]);
      expect(r.cleansing!.overflow).toBe(1);
    });
    it('1/3 + 3 → overflow +1', () => {
      const r = addEnergy([F], [F, F, F]);
      expect(r.cleansing!.overflow).toBe(1);
    });
    it('2/3 + 3 → overflow +2', () => {
      const r = addEnergy([F, F], [F, F, F]);
      expect(r.cleansing!.overflow).toBe(2);
    });
    it('2/3 + 6 → overflow cap +5 (не +6)', () => {
      const r = addEnergy([F, F], [F, F, F, F, F, F]);
      expect(r.cleansing!.overflow).toBe(OVERFLOW_CAP);
    });
  });

  describe('addEnergy — Чистое Очищение', () => {
    it('consumed одной стихии → isPure=true', () => {
      const r = addEnergy([], [F, F, F]);
      expect(r.cleansing!.isPure).toBe(true);
      expect(r.cleansing!.element).toBe(F);
    });
    it('consumed двух стихий → isPure=false', () => {
      // [F, F] было + [W] gained → consumed [F, F, W]
      const r = addEnergy([F, F], [W]);
      expect(r.cleansing!.isPure).toBe(false);
    });
    it('порядок gained важен: [W,W,W] на пустой → pure W', () => {
      const r = addEnergy([], [W, W, W]);
      expect(r.cleansing!.isPure).toBe(true);
      expect(r.cleansing!.element).toBe(W);
    });
    it('mixed gained на пустой → не pure', () => {
      const r = addEnergy([], [F, W, F]);
      expect(r.cleansing!.isPure).toBe(false);
    });
  });

  describe('addEnergy — шкала сбрасывается после Очищения', () => {
    it('slots пустой после любого Очищения', () => {
      const r = addEnergy([F, F], [F, F, F]);
      expect(r.slots).toEqual([]);
    });
  });
});
