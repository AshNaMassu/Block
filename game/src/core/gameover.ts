/**
 * Проверка Game Over (GDD-2 v1.3, секция 2.3).
 *
 * Game Over = ни одна фигура в руке не может быть использована.
 * - Обычная/радужная фигура: можно поставить куда-то (есть подходящая пустая область).
 * - Спецфигура: на поле есть хотя бы одна пустая клетка (wildcard-fill требует пустоты).
 *
 * Радужная рассматривается как 1×1 (форма [{0,0}]).
 */
import { canPlaceAnywhere } from './shapes';
import { hasAnyEmptyCell } from './grid';
import type { GameState, Piece, Vec2 } from './types';

const RAINBOW_SHAPE: Vec2[] = [{ x: 0, y: 0 }];

/** Можно ли поставить конкретную фигуру куда-либо. */
export function canUsePiece(state: GameState, piece: Piece): boolean {
  if (piece.kind === 'special') {
    return hasAnyEmptyCell(state.grid);
  }
  const shape = piece.kind === 'rainbow' ? RAINBOW_SHAPE : piece.shape;
  return canPlaceAnywhere(state.grid, shape);
}

/** Есть ли хоть один доступный ход (false → Game Over). */
export function hasAnyMove(state: GameState): boolean {
  for (const piece of state.hand) {
    if (piece && canUsePiece(state, piece)) return true;
  }
  return false;
}
