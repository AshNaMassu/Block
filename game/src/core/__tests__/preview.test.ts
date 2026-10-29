/**
 * Тесты previewPlacement (DES-4): симуляция постановки без мутации состояния.
 * Основа предиктивных подсветок DESIGN §7/§23.
 */
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine';
import { setCell } from '../grid';
import { BOARD_SIZE } from '../../config/balance';
import type { GameState, Piece } from '../types';

const fire = () => ({ element: 0 as const, multi: false, special: false });

function makeEngine(initial?: (s: GameState) => void, seed = 42): GameEngine {
  const e = new GameEngine();
  e.startGame({ seed });
  e.state.hand[0] = null;
  e.state.hand[1] = null;
  e.state.hand[2] = null;
  if (initial) initial(e.state);
  return e;
}

const normalPiece = (id: string, shape: { x: number; y: number }[], element = 0): Piece => ({
  id,
  kind: 'normal',
  shape,
  element: element as 0 | 1 | 2 | 3,
});

describe('previewPlacement — не мутирует состояние', () => {
  it('сетка, рука, счёт, энергия не изменились после превью замыкания линии', () => {
    const e = makeEngine((s) => {
      for (let x = 1; x < BOARD_SIZE; x++) setCell(s.grid, x, 0, fire());
      s.hand[0] = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    });
    const before = structuredClone(e.state);
    const rngBefore = e.state.rngState;

    const r = e.previewPlacement('t1', { x: 0, y: 0 });

    expect(r.ok).toBe(true);
    expect(r.clearedLines).toHaveLength(1);
    expect(e.state).toEqual(before);
    expect(e.state.rngState).toBe(rngBefore);
  });

  it('боевая постановка после превью даёт тот же результат (превью ничего не съело)', () => {
    const e = makeEngine((s) => {
      for (let x = 1; x < BOARD_SIZE; x++) setCell(s.grid, x, 0, fire());
      s.hand[0] = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    });
    const preview = e.previewPlacement('t1', { x: 0, y: 0 });
    const real = e.placePiece('t1', { x: 0, y: 0 });

    expect(real.ok).toBe(true);
    expect(real.lineScore).toBe(preview.lineScore);
    expect(real.elementalLines).toBe(preview.elementalLines);
    expect(real.scoreGained).toBe(preview.scoreGained);
    // Фигура реально израсходована (превью её не «съело»)
    expect(e.state.hand.find((p) => p?.id === 't1')).toBeUndefined();
  });
});

describe('previewPlacement — совпадение с placePiece', () => {
  it('на двух одинаковых движках preview == placePiece по ключевым полям', () => {
    const setup = (s: GameState): void => {
      for (let x = 1; x < BOARD_SIZE; x++) setCell(s.grid, x, 0, fire());
      setCell(s.grid, 0, 1, fire());
      s.hand[0] = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    };
    const a = makeEngine(setup);
    const b = makeEngine(setup);

    const preview = a.previewPlacement('t1', { x: 0, y: 0 });
    const real = b.placePiece('t1', { x: 0, y: 0 });

    expect(preview.ok).toBe(true);
    expect(preview.clearedLines).toEqual(real.clearedLines);
    expect(preview.elementalLines).toBe(real.elementalLines);
    expect(preview.lineScore).toBe(real.lineScore);
    expect(preview.combo).toEqual(real.combo);
    expect(preview.cleansing?.element).toBe(real.cleansing?.element);
    expect(preview.cleansing?.baseScore).toBe(real.cleansing?.baseScore);
    expect(preview.scoreGained).toBe(real.scoreGained);
    expect(preview.starsGained).toBe(real.starsGained);
  });

  it('превью детонации спецфигуры возвращает detonation и +1⚡', () => {
    const e = makeEngine((s) => {
      s.hand[3] = {
        id: 'sp1',
        kind: 'special',
        shape: [{ x: 0, y: 0 }],
        special: 'fire',
      } as Piece;
    });
    const r = e.previewPlacement('sp1', { x: 4, y: 4 });

    expect(r.ok).toBe(true);
    expect(r.detonation).not.toBeNull();
    expect(r.elementalLines).toBe(0);
  });
});

describe('previewPlacement — невалидные входы', () => {
  it('несуществующая фигура → ok=false, cannot_place', () => {
    const e = makeEngine();
    const r = e.previewPlacement('nope', { x: 0, y: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cannot_place');
  });

  it('занятая клетка → ok=false, состояние не тронуто', () => {
    const e = makeEngine((s) => {
      setCell(s.grid, 0, 0, fire());
      s.hand[0] = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    });
    const before = structuredClone(e.state);
    const r = e.previewPlacement('t1', { x: 0, y: 0 });
    expect(r.ok).toBe(false);
    expect(e.state).toEqual(before);
  });
});
