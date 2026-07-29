/**
 * Комбо стихийных линий (Ось Б, GDD-2 v1.3 секция 3.2).
 *
 * 2+ стихийные линии одним ходом → бонусные очки + спецфигура.
 * Выдаётся ДО Очищения, независимо от него (может сработать и без Очищения).
 *
 * Защита от рекурсии (GDD 3.4): комбо-спецфигура выдаётся только за
 * постановку обычной/радужной фигуры, НЕ за спецфигуру. Engine передаёт
 * флаг canAwardSpecial = (source !== 'special').
 */
import { COMBO_TABLE, SPECIAL_ESCALATION } from '../config/balance';
import type { ComboReward, SpecialType } from './types';

/**
 * Награда за комбо. null если elementalLines < 2.
 *
 * @param elementalLines сколько стихийных линий замкнулось (0..6)
 * @param canAwardSpecial true если постановка НЕ спецфигура (защита от рекурсии)
 */
export function getComboReward(
  elementalLines: number,
  canAwardSpecial: boolean,
): ComboReward | null {
  if (elementalLines < 2 || elementalLines >= COMBO_TABLE.length) return null;
  const row = COMBO_TABLE[elementalLines];
  if (!row) return null;

  return {
    lines: elementalLines,
    bonusScore: row.bonusScore,
    special: canAwardSpecial ? { type: row.specialType, count: row.specialCount } : null,
  };
}

/**
 * Апгрейд спецфигуры на ступень выше (для Чистого Очищения, GDD 4.4).
 * Порядок: bomb → line → cross → apocalypse.
 *
 * Особый кейс: apocalypse ×2 считается максимумом, апгрейд игнорируется
 * (в рамках текущего типа).
 *
 * @param current текущая спецфигура или null
 * @returns апгрейднутая спецфигура. Если current null → {bomb, 1}
 */
export function upgradeSpecial(
  current: {
    type: SpecialType;
    count: number;
  } | null,
): { type: SpecialType; count: number } {
  // Если спецфигуры не было → Чистое даёт Bomb ×1 (GDD 4.4)
  if (!current) return { type: 'bomb', count: 1 };

  // На максимальном Apocalypse ×2 апгрейд игнорируется
  if (current.type === 'apocalypse' && current.count >= 2) {
    return current;
  }

  const idx = SPECIAL_ESCALATION.indexOf(current.type);
  // На apocalypse ×1 → apocalypse ×2 (растёт count, а не ступень)
  if (current.type === 'apocalypse' && current.count === 1) {
    return { type: 'apocalypse', count: 2 };
  }
  // Иначе — следующая ступень, count = 1
  const nextType = SPECIAL_ESCALATION[Math.min(idx + 1, SPECIAL_ESCALATION.length - 1)]!;
  return { type: nextType, count: 1 };
}
