import { describe, it, expect } from 'vitest';
import { getComboReward, upgradeSpecial } from '../combo';
import { applyPureCleansing } from '../pure';
import type { CleansingReward, SpecialReward } from '../types';

function makeCleansing(over: Partial<CleansingReward> = {}): CleansingReward {
  return {
    overflow: 0,
    baseScore: 6000,
    stars: 1,
    rainbowCount: 3,
    furySec: 30,
    furyMult: 1.5,
    isPure: false,
    element: 0,
    ...over,
  };
}

describe('combo', () => {
  describe('getComboReward', () => {
    it('0 lines → null', () => {
      expect(getComboReward(0, true)).toBeNull();
    });
    it('1 line → null', () => {
      expect(getComboReward(1, true)).toBeNull();
    });
    it('2 lines → Bomb x1, +2000', () => {
      const r = getComboReward(2, true);
      expect(r).not.toBeNull();
      expect(r!.lines).toBe(2);
      expect(r!.bonusScore).toBe(2000);
      expect(r!.special).toEqual({ type: 'bomb', count: 1 });
    });
    it('3 lines → Line x1, +6000', () => {
      const r = getComboReward(3, true);
      expect(r!.special).toEqual({ type: 'line', count: 1 });
      expect(r!.bonusScore).toBe(6000);
    });
    it('4 lines → Cross x1, +12000', () => {
      const r = getComboReward(4, true);
      expect(r!.special).toEqual({ type: 'cross', count: 1 });
      expect(r!.bonusScore).toBe(12000);
    });
    it('5 lines → Apocalypse x1, +20000', () => {
      const r = getComboReward(5, true);
      expect(r!.special).toEqual({ type: 'apocalypse', count: 1 });
      expect(r!.bonusScore).toBe(20000);
    });
    it('6 lines → Apocalypse x2, +30000', () => {
      const r = getComboReward(6, true);
      expect(r!.special).toEqual({ type: 'apocalypse', count: 2 });
      expect(r!.bonusScore).toBe(30000);
    });
    it('>6 lines → null (за пределами таблицы)', () => {
      expect(getComboReward(7, true)).toBeNull();
    });

    describe('защита от рекурсии (canAwardSpecial=false)', () => {
      it('2 lines но постановка спецфигуры → bonus есть, special null', () => {
        const r = getComboReward(2, false);
        expect(r!.bonusScore).toBe(2000);
        expect(r!.special).toBeNull();
      });
      it('5 lines но постановка спецфигуры → bonus есть, special null', () => {
        const r = getComboReward(5, false);
        expect(r!.bonusScore).toBe(20000);
        expect(r!.special).toBeNull();
      });
    });
  });

  describe('upgradeSpecial', () => {
    it('null → Bomb x1 (Pure без комбо)', () => {
      expect(upgradeSpecial(null)).toEqual({ type: 'bomb', count: 1 });
    });
    it('bomb → line', () => {
      expect(upgradeSpecial({ type: 'bomb', count: 1 })).toEqual({ type: 'line', count: 1 });
    });
    it('line → cross', () => {
      expect(upgradeSpecial({ type: 'line', count: 1 })).toEqual({ type: 'cross', count: 1 });
    });
    it('cross → apocalypse x1', () => {
      expect(upgradeSpecial({ type: 'cross', count: 1 })).toEqual({
        type: 'apocalypse',
        count: 1,
      });
    });
    it('apocalypse x1 → apocalypse x2', () => {
      expect(upgradeSpecial({ type: 'apocalypse', count: 1 })).toEqual({
        type: 'apocalypse',
        count: 2,
      });
    });
    it('apocalypse x2 → без изменений (максимум)', () => {
      expect(upgradeSpecial({ type: 'apocalypse', count: 2 })).toEqual({
        type: 'apocalypse',
        count: 2,
      });
    });
  });
});

// Хелпер для создания CleansingReward в тестах pure
function makeCleansingForPure(over: Partial<CleansingReward> = {}): CleansingReward {
  return makeCleansing(over);
}

describe('pure', () => {
  const bomb: SpecialReward = { type: 'bomb', count: 1 };

  it('не pure → не меняется, special как есть', () => {
    const c = makeCleansingForPure({ isPure: false });
    const r = applyPureCleansing(c, bomb);
    expect(r.applied).toBe(false);
    expect(r.cleansing.baseScore).toBe(6000);
    expect(r.special).toEqual(bomb);
  });

  it('pure без комбо-спецфигуры → Bomb x1', () => {
    const c = makeCleansingForPure({ isPure: true });
    const r = applyPureCleansing(c, null);
    expect(r.applied).toBe(true);
    expect(r.special).toEqual({ type: 'bomb', count: 1 });
  });

  it('pure с bomb → line, очки x2, fury x1.5, +1 star', () => {
    const c = makeCleansingForPure({ isPure: true, baseScore: 9000, furySec: 40, stars: 2 });
    const r = applyPureCleansing(c, bomb);
    expect(r.applied).toBe(true);
    expect(r.special).toEqual({ type: 'line', count: 1 });
    expect(r.cleansing.baseScore).toBe(18000);
    expect(r.cleansing.furySec).toBe(60);
    expect(r.cleansing.stars).toBe(3);
  });

  it('pure с apocalypse x1 → apocalypse x2', () => {
    const c = makeCleansingForPure({ isPure: true });
    const r = applyPureCleansing(c, { type: 'apocalypse', count: 1 });
    expect(r.special).toEqual({ type: 'apocalypse', count: 2 });
  });
});
