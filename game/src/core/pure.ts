/**
 * Чистое Очищение (Ось Г, GDD-2 v1.3 секция 4.4).
 *
 * Условие: все 3 consumed-слота одной стихии.
 * Эффекты:
 * - очки Очищения ×2 (применяется в cleansing.applyPureToCleansing)
 * - Fury длительность ×1.5 (там же)
 * - +1 звезда (там же)
 * - апгрейд комбо-спецфигуры на ступень (combo.upgradeSpecial)
 * - если спецфигуры не было → Bomb ×1
 */
import type { CleansingReward, SpecialReward } from './types';
import { applyPureToCleansing } from './cleansing';
import { upgradeSpecial } from './combo';

/** Результат применения Чистого Очищения. */
export interface PureResult {
  /** Модифицированная награда Очищения (×2 очков, ×1.5 fury, +1 star). */
  cleansing: CleansingReward;
  /** Апгрейднутая спецфигура (от комбо или Bomb×1 если не было). */
  special: SpecialReward;
  /** Сработало ли Чистое Очищение. */
  applied: boolean;
}

/**
 * Применить Чистое Очищение, если оно сработало.
 *
 * @param cleansing награда Очищения из addEnergy
 * @param comboSpecial спецфигура от комбо (если была) или null
 */
export function applyPureCleansing(
  cleansing: CleansingReward,
  comboSpecial: SpecialReward | null,
): PureResult {
  if (!cleansing.isPure) {
    return { cleansing, special: comboSpecial ?? { type: 'fire', count: 0 }, applied: false };
  }
  const modified = applyPureToCleansing(cleansing);
  const special = upgradeSpecial(comboSpecial);
  return { cleansing: modified, special, applied: true };
}
