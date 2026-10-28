/**
 * Базовые константы игры.
 *
 * Правило (TECH_TASKS.md B.3.4): числа баланса и размеров — здесь, не в сценах.
 */

/** Размер стороны поля (Block Blast канон). */
export const BOARD_SIZE = 8;

/** Число стихий. */
export const ELEMENT_COUNT = 4;

/** Размер обычной руки (фигуры, обновляемые тройками). */
export const HAND_NORMAL_SIZE = 3;

/** Лимит бонусных слотов в руке. */
export const HAND_BONUS_SIZE = 3;

/** Полный лимит руки: обычные + бонусные. */
export const HAND_SIZE = HAND_NORMAL_SIZE + HAND_BONUS_SIZE;

/** Вместимость шкалы Энергии (слотов). */
export const ENERGY_CAPACITY = 3;

/** Кап переполнения (макс +5 сверх капы). */
export const OVERFLOW_CAP = 5;

/** Порог стихийной линии: все BOARD_SIZE клеток одной стихии. */
export const ELEMENTAL_LINE_MIN_SAME = BOARD_SIZE;

/** Очки за обычную линию (GDD 3.1). */
export const SCORE_LINE_NORMAL = 1000;

/** Очки за стихийную линию 8/8 (GDD 3.1). */
export const SCORE_LINE_ELEMENTAL = 2500;

/** Очки за каждую клетку, затронутую детонацией спецфигуры (разрушение/след/перекраска). */
export const SCORE_SPECIAL_DETONATION_PER_CELL = 100;

/** Конвертация радужной в очки при переполнении руки (GDD 3.8). */
export const SCORE_RAINBOW_OVERFLOW = 500;

/** Конвертация спецфигуры в очки при переполнении руки (GDD 3.8). */
export const SCORE_SPECIAL_OVERFLOW = 1000;

/**
 * Таблица Очищения по переполнению (GDD 4.3, Ось В).
 * Индекс = overflow (0..5).
 */
export interface OverflowRow {
  /** Базовые очки Очищения (до множителей pure/fury). */
  score: number;
  /** Звёзды. */
  stars: number;
  /** Доп. радужные поверх базовых 3. */
  extraRainbow: number;
  /** Длительность Fury в секундах. */
  furySec: number;
  /** Множитель Fury. */
  furyMult: number;
}

/** Базовое число радужных за Очищение (Ось А = overflow 0). */
export const CLEANSING_BASE_RAINBOW = 3;

export const OVERFLOW_TABLE: readonly OverflowRow[] = [
  { score: 6000, stars: 1, extraRainbow: 0, furySec: 30, furyMult: 1.5 },
  { score: 9000, stars: 2, extraRainbow: 1, furySec: 40, furyMult: 2.0 },
  { score: 14000, stars: 3, extraRainbow: 1, furySec: 50, furyMult: 2.5 },
  { score: 20000, stars: 3, extraRainbow: 2, furySec: 60, furyMult: 3.0 },
  { score: 30000, stars: 3, extraRainbow: 2, furySec: 75, furyMult: 4.0 },
  { score: 45000, stars: 3, extraRainbow: 3, furySec: 90, furyMult: 5.0 },
];

/**
 * Таблица комбо стихийных линий (Ось Б).
 * Индекс = число стихийных линий (2..6). 0/1 → null (нет награды).
 * Спецфигуры — детонаторы: fire → tide → vortex → spring.
 */
export interface ComboRow {
  bonusScore: number;
  specialType: 'fire' | 'tide' | 'vortex' | 'spring';
  specialCount: number;
}

export const COMBO_TABLE: readonly (ComboRow | null)[] = [
  null,
  null,
  { bonusScore: 2000, specialType: 'fire', specialCount: 1 },
  { bonusScore: 6000, specialType: 'tide', specialCount: 1 },
  { bonusScore: 12000, specialType: 'vortex', specialCount: 1 },
  { bonusScore: 20000, specialType: 'spring', specialCount: 1 },
  { bonusScore: 30000, specialType: 'spring', specialCount: 2 },
];

/** Порядок эскалации детонаторов (апгрейд при Чистом Очищении и мердж в руке). */
export const SPECIAL_ESCALATION: readonly ('fire' | 'tide' | 'vortex' | 'spring')[] = [
  'fire',
  'tide',
  'vortex',
  'spring',
];

// ─── Множитель и Fury (GDD 4.6, 4.7) ────────────────────────────────────────

/** Множитель сложности (MVP: только Medium). */
export const DIFFICULTY_MULT_MEDIUM = 2.0;

/** Кап множителя звёзд (×2.5 при stars≥60). */
export const STAR_CAP = 2.5;

/** Прирост множителя за каждую звезду (0.025). */
export const STAR_BONUS_PER_STAR = 0.025;

/** Кап звёзд для максимального множителя (60). */
export const STAR_CAP_AT = 60;

/** Множитель Fury в неактивном состоянии. */
export const FURY_MULT_IDLE = 1.0;
