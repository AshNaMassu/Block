import { describe, it, expect } from 'vitest';
import { canUsePiece, hasAnyMove } from '../gameover';
import { createGrid, setCell } from '../grid';
import type { GameState, Piece } from '../types';
import { BOARD_SIZE } from '../../config/balance';

const fire = () => ({ element: 0 as const, multi: false, special: false });

function makeState(hand: (Piece | null)[], grid = createGrid()): GameState {
  return {
    grid,
    hand,
    score: 0,
    best: 0,
    stars: 0,
    energy: { slots: [] },
    fury: null,
    rngState: 1,
    tutorialCompleted: true,
  };
}

const normalPiece = (id: string, shape = [{ x: 0, y: 0 }]): Piece => ({
  id,
  kind: 'normal',
  shape,
  element: 0,
});
const rainbowPiece = (id: string): Piece => ({
  id,
  kind: 'rainbow',
  shape: [{ x: 0, y: 0 }],
});
const specialPiece = (id: string): Piece => ({
  id,
  kind: 'special',
  shape: [],
  special: 'bomb',
});

describe('gameover', () => {
  describe('canUsePiece', () => {
    it('normal фигура помещается на пустое поле → true', () => {
      const s = makeState([normalPiece('a')]);
      expect(canUsePiece(s, s.hand[0]!)).toBe(true);
    });

    it('normal фигура не помещается на забитое поле → false', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const s = makeState([normalPiece('a')], g);
      expect(canUsePiece(s, s.hand[0]!)).toBe(false);
    });

    it('rainbow как 1×1: есть пустая клетка → true', () => {
      const s = makeState([rainbowPiece('a')]);
      expect(canUsePiece(s, s.hand[0]!)).toBe(true);
    });

    it('rainbow: поле полностью забито → false', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const s = makeState([rainbowPiece('a')], g);
      expect(canUsePiece(s, s.hand[0]!)).toBe(false);
    });

    it('special: есть пустая клетка → true (wildcard-fill)', () => {
      const s = makeState([specialPiece('a')]);
      expect(canUsePiece(s, s.hand[0]!)).toBe(true);
    });

    it('special: поле полностью забито → false', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const s = makeState([specialPiece('a')], g);
      expect(canUsePiece(s, s.hand[0]!)).toBe(false);
    });
  });

  describe('hasAnyMove', () => {
    it('есть обычный ход → true', () => {
      const s = makeState([normalPiece('a')]);
      expect(hasAnyMove(s)).toBe(true);
    });

    it('спецфигура спасает когда обычные не помещаются', () => {
      const g = createGrid();
      // Оставляем 1 пустую клетку, I3 не влезет, но Bomb подойдёт (только 1 клетка нужна)
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      // Сетим обратно null через прямой доступ
      g[0]![0] = null;
      const i3 = normalPiece('a', [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
      const s = makeState([i3, specialPiece('b')], g);
      expect(hasAnyMove(s)).toBe(true); // спасает спецфигура
    });

    it('нет ходов и нет пустых клеток → false', () => {
      const g = createGrid();
      for (let x = 0; x < BOARD_SIZE; x++)
        for (let y = 0; y < BOARD_SIZE; y++) setCell(g, x, y, fire());
      const s = makeState([normalPiece('a'), specialPiece('b')], g);
      expect(hasAnyMove(s)).toBe(false);
    });

    it('пустая рука → false', () => {
      const s = makeState([null, null, null]);
      expect(hasAnyMove(s)).toBe(false);
    });
  });
});
