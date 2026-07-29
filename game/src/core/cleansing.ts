/**
 * Очищение (Ось В — переполнение, GDD-2 v1.3 секция 4.3).
 *
 * Награда Очищения определяется величиной переполнения.
 * Переполнение НЕ даёт спецфигур (они только за комбо, Ось Б).
 */
import { OVERFLOW_TABLE, OVERFLOW_CAP, CLEANSING_BASE_RAINBOW } from '../config/balance';
import type { CleansingReward, ElementId } from './types';

/**
 * Получить награду Очищения по величине переполнения.
 *
 * @param overflow 0..OVERFLOW_CAP
 * @param isPure чистое ли (3 consumed одной стихии)
 * @param element стихия consumed-слотов
 */
export function getCleansingReward(
  overflow: number,
  isPure: boolean,
  element: ElementId,
): CleansingReward {
  const clamped = Math.max(0, Math.min(overflow, OVERFLOW_CAP));
  const row = OVERFLOW_TABLE[clamped]!;
  return {
    overflow: clamped,
    baseScore: row.score,
    stars: row.stars,
    rainbowCount: CLEANSING_BASE_RAINBOW + row.extraRainbow,
    furySec: row.furySec,
    furyMult: row.furyMult,
    isPure,
    element,
  };
}

/**
 * Применить Чистое Очищение (Ось Г, GDD 4.4) к награде:
 * - очки ×2
 * - Fury длительность ×1.5
 * - +1 звезда
 *
 * Апгрейд спецфигуры обрабатывается отдельно в pure.ts (applyPureUpgrade),
 * т.к. зависит от наличия комбо-спецфигуры.
 *
 * Возвращает НОВЫЙ объект, не мутирует исходный.
 */
export function applyPureToCleansing(c: CleansingReward): CleansingReward {
  if (!c.isPure) return c;
  return {
    ...c,
    baseScore: c.baseScore * 2,
    furySec: Math.round(c.furySec * 1.5),
    stars: c.stars + 1,
  };
}
