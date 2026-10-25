/**
 * Рука: 6 слотов (3 обычных + 3 бонусных), refill, конвертация при переполнении,
 * мердж спецфигур в руке (гибрид B).
 *
 * Правила (GDD-2 v1.3, секции 2.2, 3.8 + редизайн детонаторов):
 * - 3 обычных слота (0..2) обновляются тройкой, когда все три пусты.
 * - 3 бонусных слота (3..5) под радужные/спецфигуры от Очищения/комбо.
 * - При переполнении бонусных: радужная → +SCORE_RAINBOW_OVERFLOW × mult,
 *   спецфигура → +SCORE_SPECIAL_OVERFLOW × mult.
 * - mult = CurrentMult ДО применения нового Fury (защита от самоусиления, GDD 3.8).
 * - Мердж: две одинаковые спецфигуры в руке тапаются друг в друга → следующая
 *   ступень эскалации; Родник+Родник (максимум) → радужная.
 */
import {
  HAND_NORMAL_SIZE,
  HAND_SIZE,
  SCORE_RAINBOW_OVERFLOW,
  SCORE_SPECIAL_OVERFLOW,
  SPECIAL_ESCALATION,
} from '../config/balance';
import { specialShape } from './specials';
import type { Hand, Piece, SpecialType, Vec2 } from './types';

let pieceIdCounter = 0;

function nextPieceId(prefix: string): string {
  return `${prefix}${pieceIdCounter++}`;
}

/** Сбросить счётчик id (для тестов). */
export function resetHandPieceIdCounter(): void {
  pieceIdCounter = 0;
}

/** Создать пустую руку (6 null слотов). */
export function createHand(): Hand {
  return new Array<Piece | null>(HAND_SIZE).fill(null);
}

/** Создать радужную 1×1 фигуру. */
export function makeRainbowPiece(): Piece {
  return { id: nextPieceId('r'), kind: 'rainbow', shape: [{ x: 0, y: 0 }] };
}

/** Создать спецфигуру-детонатор (с реальной формой — ставится как обычная фигура). */
export function makeSpecialPiece(type: SpecialType, orientation?: 'row' | 'column'): Piece {
  const orient = orientation ?? 'row';
  return {
    id: nextPieceId('s'),
    kind: 'special',
    shape: specialShape(type, orient),
    special: type,
    orientation: orient,
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

/** Результат мерджа двух спецфигур в руке. */
export interface MergeResult {
  ok: boolean;
  /** Причина отказа: 'not_special' | 'different_types' | 'not_found'. */
  reason?: string;
  /** Фигура, заменённая на новую (её слот). */
  consumedIds: string[];
  /** Новая фигура (следующая ступень или радужная). */
  piece: Piece | null;
}

/**
 * Мердж двух спецфигур одного типа в руке (гибрид B «Мердж в руке»).
 * Пожар+Пожар = Прилив, Прилив+Прилив = Вихрь, Вихрь+Вихрь = Родник,
 * Родник+Родник (максимум эскалации) → радужная 1×1.
 *
 * Новая фигура занимает слот ВТОРОЙ фигуры (idB), слот первой очищается.
 * Мутирует hand.
 */
export function mergeSpecialPieces(hand: Hand, idA: string, idB: string): MergeResult {
  if (idA === idB) return { ok: false, reason: 'not_found', consumedIds: [], piece: null };
  const a = getPieceById(hand, idA);
  const b = getPieceById(hand, idB);
  if (!a || !b) return { ok: false, reason: 'not_found', consumedIds: [], piece: null };
  if (a.kind !== 'special' || b.kind !== 'special' || !a.special || !b.special) {
    return { ok: false, reason: 'not_special', consumedIds: [], piece: null };
  }
  if (a.special !== b.special) {
    return { ok: false, reason: 'different_types', consumedIds: [], piece: null };
  }

  const type = a.special;
  const idx = SPECIAL_ESCALATION.indexOf(type);
  let piece: Piece;
  if (idx === SPECIAL_ESCALATION.length - 1) {
    // Максимум эскалации: Родник+Родник → радужная.
    piece = makeRainbowPiece();
  } else {
    piece = makeSpecialPiece(SPECIAL_ESCALATION[idx + 1]!);
  }

  const slotB = hand.findIndex((p) => p?.id === idB);
  const slotA = hand.findIndex((p) => p?.id === idA);
  hand[slotB] = piece;
  hand[slotA] = null;

  return { ok: true, consumedIds: [idA, idB], piece };
}

// Ре-экспорт Vec2 для удобства (часть API)
export type { Vec2 };
