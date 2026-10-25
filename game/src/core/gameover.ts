/**
 * Проверка Game Over (GDD-2 v1.3, секция 2.3).
 *
 * Game Over = ни одна фигура в руке не может быть использована.
 * - Обычная фигура: можно поставить куда-то (есть подходящая пустая область).
 * - Радужная: рассматривается как 1×1.
 * - Спецфигура-детонатор: ставится по своей форме, как обычная фигура.
 *   Прилив — если есть место хотя бы в одной ориентации.
 */
import { canPlaceAnywhere } from './shapes';
import { specialShape } from './specials';
import type { GameState, Piece, Vec2 } from './types';

const RAINBOW_SHAPE: Vec2[] = [{ x: 0, y: 0 }];

/** Можно ли поставить конкретную фигуру куда-либо. */
export function canUsePiece(state: GameState, piece: Piece): boolean {
  if (piece.kind === 'special') {
    if (!piece.special) return false;
    if (piece.special === 'tide') {
      // Прилив: горизонтальный или вертикальный вариант.
      return (
        canPlaceAnywhere(state.grid, specialShape('tide', 'row')) ||
        canPlaceAnywhere(state.grid, specialShape('tide', 'column'))
      );
    }
    return canPlaceAnywhere(state.grid, specialShape(piece.special));
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
