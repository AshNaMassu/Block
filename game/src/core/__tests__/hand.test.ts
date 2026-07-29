import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHand,
  makeRainbowPiece,
  makeSpecialPiece,
  addRainbowPieces,
  addSpecialPieces,
  findEmptyBonusSlot,
  refillNormalIfNeeded,
  removePieceById,
  resetHandPieceIdCounter,
} from '../hand';
import {
  HAND_NORMAL_SIZE,
  HAND_SIZE,
  SCORE_RAINBOW_OVERFLOW,
  SCORE_SPECIAL_OVERFLOW,
} from '../../config/balance';
import type { Piece } from '../types';

const makeNormal = (id: string): Piece => ({
  id,
  kind: 'normal',
  shape: [{ x: 0, y: 0 }],
  element: 0,
});

describe('hand', () => {
  beforeEach(() => resetHandPieceIdCounter());

  describe('createHand', () => {
    it('6 null слотов', () => {
      const h = createHand();
      expect(h).toHaveLength(HAND_SIZE);
      expect(h.every((p) => p === null)).toBe(true);
    });
  });

  describe('makeRainbowPiece / makeSpecialPiece', () => {
    it('rainbow: kind=rainbow, shape 1×1', () => {
      const p = makeRainbowPiece();
      expect(p.kind).toBe('rainbow');
      expect(p.shape).toEqual([{ x: 0, y: 0 }]);
    });
    it('special: kind=special, type сохранён', () => {
      const p = makeSpecialPiece('bomb');
      expect(p.kind).toBe('special');
      expect(p.special).toBe('bomb');
    });
  });

  describe('findEmptyBonusSlot', () => {
    it('пустая рука → слот 3', () => {
      expect(findEmptyBonusSlot(createHand())).toBe(HAND_NORMAL_SIZE);
    });
    it('все бонусные заняты → -1', () => {
      const h = createHand();
      h[3] = makeRainbowPiece();
      h[4] = makeRainbowPiece();
      h[5] = makeRainbowPiece();
      expect(findEmptyBonusSlot(h)).toBe(-1);
    });
  });

  describe('addRainbowPieces', () => {
    it('добавляет в пустые бонусные слоты', () => {
      const h = createHand();
      const score = addRainbowPieces(h, 3, 1);
      expect(score).toBe(0);
      expect(h[3]?.kind).toBe('rainbow');
      expect(h[4]?.kind).toBe('rainbow');
      expect(h[5]?.kind).toBe('rainbow');
    });
    it('переполнение → конвертация в очки', () => {
      const h = createHand();
      h[3] = makeRainbowPiece();
      h[4] = makeRainbowPiece();
      h[5] = makeRainbowPiece();
      const score = addRainbowPieces(h, 2, 1.5);
      expect(score).toBe(Math.round(2 * SCORE_RAINBOW_OVERFLOW * 1.5));
    });
    it('частичное переполнение', () => {
      const h = createHand();
      h[5] = makeRainbowPiece(); // 1 слот занят, 2 свободны
      const score = addRainbowPieces(h, 3, 2.0);
      expect(score).toBe(Math.round(1 * SCORE_RAINBOW_OVERFLOW * 2.0));
      expect(h[3]?.kind).toBe('rainbow');
      expect(h[4]?.kind).toBe('rainbow');
    });
  });

  describe('addSpecialPieces', () => {
    it('добавляет спецфигуры', () => {
      const h = createHand();
      const score = addSpecialPieces(h, 'cross', 2, 1);
      expect(score).toBe(0);
      expect(h[3]?.kind).toBe('special');
      expect(h[3]?.special).toBe('cross');
      expect(h[4]?.kind).toBe('special');
    });
    it('переполнение → конвертация', () => {
      const h = createHand();
      h[3] = makeRainbowPiece();
      const score = addSpecialPieces(h, 'apocalypse', 5, 1);
      // 2 слота свободны → 3 в конвертацию
      expect(score).toBe(3 * SCORE_SPECIAL_OVERFLOW);
    });
  });

  describe('refillNormalIfNeeded', () => {
    it('заполняет тройку если все 3 пусты', () => {
      const h = createHand();
      const spawner = () => makeNormal('x');
      const refilled = refillNormalIfNeeded(h, spawner);
      expect(refilled).toBe(true);
      expect(h[0]).not.toBeNull();
      expect(h[1]).not.toBeNull();
      expect(h[2]).not.toBeNull();
    });
    it('не заполняет если хотя бы один занят', () => {
      const h = createHand();
      h[0] = makeNormal('keep');
      const refilled = refillNormalIfNeeded(h, () => makeNormal('x'));
      expect(refilled).toBe(false);
      expect(h[0]?.id).toBe('keep');
      expect(h[1]).toBeNull();
    });
  });

  describe('removePieceById', () => {
    it('удаляет по id, возвращает true', () => {
      const h = createHand();
      h[0] = makeNormal('abc');
      expect(removePieceById(h, 'abc')).toBe(true);
      expect(h[0]).toBeNull();
    });
    it('false если не найден', () => {
      const h = createHand();
      expect(removePieceById(h, 'nope')).toBe(false);
    });
  });
});
