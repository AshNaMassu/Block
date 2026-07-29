/**
 * Рука: 6 слотов (3 обычных + 3 бонусных), refill, конвертация при переполнении.
 *
 * Правила (GDD-2 v1.3, секции 2.2, 3.8):
 * - 3 обычных слота (0..2) обновляются тройкой, когда все три пусты.
 * - 3 бонусных слота (3..5) под радужные/спецфигуры от Очищения/комбо.
 * - При переполнении бонусных: радужная → +SCORE_RAINBOW_OVERFLOW × mult,
 *   спецфигура → +SCORE_SPECIAL_OVERFLOW × mult.
 * - mult = CurrentMult ДО применения нового Fury (защита от самоусиления, GDD 3.8).
 */
import {
  HAND_NORMAL_SIZE,
  HAND_SIZE,
  SCORE_RAINBOW_OVERFLOW,
  SCORE_SPECIAL_OVERFLOW,
} from '../config/balance';
import type { Hand, Piece, SpecialType, Vec2 } from './types';

let pieceIdCounter = 0;

function nextPieceId(prefix: string): string {
  return `${prefix}${pieceIdCounter++}`;
}

/** Сбросить счётчик id (для тестов). */
export function resetHandPieceIdCounter(): void {
  pieceIdCounter = 0;
}

/** Создать радужную 1×1 фигуру. */
export function makeRainbowPiece(): Piece {
  return { id: nextPieceId('r'), kind: 'rainbow', shape: [{ x: 0, y: 0 }] };
}

/** Создать спецфигуру. */
export function makeSpecialPiece(type: SpecialType, orientation?: 'row' | 'column'): Piece {
  return {
    id: nextPieceId('s'),
    kind: 'special',
    shape: [],
    special: type,
    orientation: orientation ?? 'row',
  };
}

/**
 * Добавить N радужных в бонусные слоты. При переполнении — конвертация в очки.
 *
 * @param hand рука
 * @param count сколько добавить
 * @param conversionMultiplier множитель для конвертации (CurrentMult до нового Fury)
 * @returns очки от конвертации (0 если всё поместилось)
 */
export function addRainbowPieces(hand: Hand, count: number, conversionMultiplier: number): number {
  let converted = 0;
  for (let i = 0; i < count; i++) {
    const slot = findEmptyBonusSlot(hand);
    if (slot !== -1) {
      hand[slot] = makeRainbowPiece();
    } else {
      converted++;
    }
  }
  return Math.round(converted * SCORE_RAINBOW_OVERFLOW * conversionMultiplier);
}

/**
 * Добавить N спецфигур в бонусные слоты. При переполнении — конвертация в очки.
 */
export function addSpecialPieces(
  hand: Hand,
  type: SpecialType,
  count: number,
  conversionMultiplier: number,
): number {
  let converted = 0;
  for (let i = 0; i < count; i++) {
    const slot = findEmptyBonusSlot(hand);
    if (slot !== -1) {
      hand[slot] = makeSpecialPiece(type);
    } else {
      converted++;
    }
  }
  return Math.round(converted * SCORE_SPECIAL_OVERFLOW * conversionMultiplier);
}

/** Найти индекс первого пустого бонусного слота (3..5). -1 если все заняты. */
export function findEmptyBonusSlot(hand: Hand): number {
  for (let i = HAND_NORMAL_SIZE; i < HAND_SIZE; i++) {
    if (hand[i] === null) return i;
  }
  return -1;
}

/** Заполнить обычные слоты новыми фигурами, если все три пусты. */
export function refillNormalIfNeeded(hand: Hand, spawn: () => Piece): boolean {
  const allEmpty = hand.slice(0, HAND_NORMAL_SIZE).every((p) => p === null);
  if (!allEmpty) return false;
  for (let i = 0; i < HAND_NORMAL_SIZE; i++) {
    hand[i] = spawn();
  }
  return true;
}

/** Убрать фигуру из руки по id (после постановки). */
export function removePieceById(hand: Hand, id: string): boolean {
  const idx = hand.findIndex((p) => p?.id === id);
  if (idx === -1) return false;
  hand[idx] = null;
  return true;
}

/** Получить фигуру по id. */
export function getPieceById(hand: Hand, id: string): Piece | null {
  return hand.find((p) => p?.id === id) ?? null;
}

// Ре-экспорт Vec2 для удобства (часть API)
export type { Vec2 };
