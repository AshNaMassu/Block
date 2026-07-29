/**
 * Fury Mode и множитель очков (GDD-2 v1.3, секция 4.6).
 *
 * FinalMultiplier = DifficultyMult × StarBonus × FuryMult
 * - DifficultyMult = 2.0 (только Medium в MVP)
 * - StarBonus = min(1 + stars × 0.025, 2.5) — кап ×2.5 при stars≥60
 * - FuryMult: 1.0 вне Fury, или множитель текущего Fury (×1.5..5.0)
 *
 * Fury активируется после Очищения. Новое Очищение перезаписывает (не стакается).
 * Таймер на timestamp (Unix-millis) — не плывёт при сворачивании.
 */
import {
  DIFFICULTY_MULT_MEDIUM,
  STAR_CAP,
  STAR_BONUS_PER_STAR,
  FURY_MULT_IDLE,
} from '../config/balance';
import type { FuryState } from './types';

/** Проверить, активен ли ещё Fury (не истёк по времени). Вернуть обновлённый Fury или null. */
export function tickFury(fury: FuryState | null, now: number): FuryState | null {
  if (!fury) return null;
  if (now >= fury.until) return null;
  return fury;
}

/** Множитель звёзд: min(1 + stars × 0.025, 2.5). */
export function starBonus(stars: number): number {
  return Math.min(1 + stars * STAR_BONUS_PER_STAR, STAR_CAP);
}

/**
 * Текущий итоговый множитель очков.
 *
 * @param stars количество звёзд
 * @param fury активный Fury (или null)
 * @param now текущий timestamp (для проверки истечения Fury)
 */
export function currentMultiplier(stars: number, fury: FuryState | null, now: number): number {
  const activeFury = tickFury(fury, now);
  const furyMult = activeFury ? activeFury.mult : FURY_MULT_IDLE;
  return DIFFICULTY_MULT_MEDIUM * starBonus(stars) * furyMult;
}

/**
 * Запустить/перезаписать Fury (новое Очищение).
 * Не стакается — полностью заменяет предыдущий.
 */
export function startFury(
  furySec: number,
  furyMult: number,
  element: number,
  now: number,
): FuryState {
  return { until: now + furySec * 1000, mult: furyMult, element: element as 0 | 1 | 2 | 3 };
}
