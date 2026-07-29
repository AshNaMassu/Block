/**
 * Геометрия экрана для portrait 1080×1920 (GDD-2 v1.3, FIT-масштаб).
 *
 * Все пиксельные константы UI собраны здесь, не в сценах (правило B.3.4).
 * Поле 8×8 занимает центральную зону, HUD сверху, рука снизу.
 * Бонусные слоты руки (3..5) визуально отделены от обычных (0..2).
 *
 * Раскладка (сверху вниз):
 *   0..280   HUD (score/best, stars+multiplier)
 *   300..1260  Поле 8×8 (клетка 120px, поле 960px, левый отступ 60px)
 *   1280..1400 Energy (3 слота стихий) + Fury-индикатор сверху
 *   1430..1550 Бонусные слоты руки (3 × ~180px, золотая рамка)
 *   1600..1900 Обычные слоты руки (3 × ~300px)
 */
import { BOARD_SIZE, HAND_NORMAL_SIZE, HAND_SIZE } from '../config/balance';

/** Базовая ширина дизайна (portrait). */
export const DESIGN_WIDTH = 1080;

/** Базовая высота дизайна (portrait). */
export const DESIGN_HEIGHT = 1920;

/** Размер одной клетки поля в px. */
export const CELL_SIZE = 120;

/** Полярная сетка: зазор между клетками для визуального разделения. */
export const CELL_GAP = 6;

/** Толщина скругления клеток/фигур. */
export const CELL_RADIUS = 16;

/** Левый отступ поля. */
export const BOARD_X = 60;

/** Верхний отступ поля (под HUD). */
export const BOARD_TOP = 300;

/** Размер поля в px (8 × 120). */
export const BOARD_PIXEL_SIZE = BOARD_SIZE * CELL_SIZE;

/** Полная ширина поля с отступами. */
export const BOARD_BOTTOM = BOARD_TOP + BOARD_PIXEL_SIZE;

/**
 * Местоположение слота руки на экране.
 * `kind` — 'normal' | 'bonus' для визуального разделения.
 */
export interface HandSlotPos {
  /** Индекс слота в Hand (0..5). */
  index: number;
  x: number;
  y: number;
  /** Размер ячейки-слота в px. */
  size: number;
  /** Бонусный ли слот (от Очищения/комбо). */
  bonus: boolean;
}

/** Параметры обычных слотов руки (нижний ряд). */
const HAND_NORMAL_SLOT_SIZE = 300;
const HAND_BONUS_SLOT_SIZE = 180;

// Обычный ряд: 3 слота по ~300px, центрированы по ширине 1080.
const NORMAL_SPACING = 20;
const NORMAL_TOTAL =
  HAND_NORMAL_SIZE * HAND_NORMAL_SLOT_SIZE + (HAND_NORMAL_SIZE - 1) * NORMAL_SPACING;
const NORMAL_START_X = (DESIGN_WIDTH - NORMAL_TOTAL) / 2 + HAND_NORMAL_SLOT_SIZE / 2;
const NORMAL_Y = 1750;

// Бонусный ряд: 3 слота по ~180px, центрированы.
const BONUS_SPACING = 20;
const BONUS_TOTAL =
  (HAND_SIZE - HAND_NORMAL_SIZE) * HAND_BONUS_SLOT_SIZE +
  (HAND_SIZE - HAND_NORMAL_SIZE - 1) * BONUS_SPACING;
const BONUS_START_X = (DESIGN_WIDTH - BONUS_TOTAL) / 2 + HAND_BONUS_SLOT_SIZE / 2;
const BONUS_Y = 1490;

/**
 * Координаты центра каждого слота руки (0..5).
 * 0..2 — обычные (большой нижний ряд), 3..5 — бонусные (верхний малый ряд).
 */
export const HAND_SLOTS: readonly HandSlotPos[] = buildHandSlots();

function buildHandSlots(): HandSlotPos[] {
  const slots: HandSlotPos[] = [];
  for (let i = 0; i < HAND_NORMAL_SIZE; i++) {
    slots.push({
      index: i,
      x: NORMAL_START_X + i * (HAND_NORMAL_SLOT_SIZE + NORMAL_SPACING),
      y: NORMAL_Y,
      size: HAND_NORMAL_SLOT_SIZE,
      bonus: false,
    });
  }
  for (let i = HAND_NORMAL_SIZE; i < HAND_SIZE; i++) {
    const bi = i - HAND_NORMAL_SIZE;
    slots.push({
      index: i,
      x: BONUS_START_X + bi * (HAND_BONUS_SLOT_SIZE + BONUS_SPACING),
      y: BONUS_Y,
      size: HAND_BONUS_SLOT_SIZE,
      bonus: true,
    });
  }
  return slots;
}

/** Масштаб отрисовки фигуры внутри слота (клетки меньше полевых). */
export const HAND_PIECE_CELL = 70;

// ─── HUD ─────────────────────────────────────────────────────────────────────

/** Зона HUD: top. */
export const HUD_TOP = 0;
export const HUD_BOTTOM = BOARD_TOP - 20;

export const HUD_SCORE_X = 80;
export const HUD_SCORE_Y = 90;
export const HUD_BEST_X = DESIGN_WIDTH - 80;
export const HUD_BEST_Y = 90;
export const HUD_STARS_X = DESIGN_WIDTH / 2;
export const HUD_STARS_Y = 90;
export const HUD_MULTIPLIER_Y = 200;

/** Позиция кнопки «назад в меню» (левый верх поля). */
export const BACK_BUTTON_X = 80;
export const BACK_BUTTON_Y = 220;

// ─── Energy (шкала 3 слотов стихий) ──────────────────────────────────────────

/** Размер слота Энергии (квадрат). */
export const ENERGY_SLOT_SIZE = 100;

/** Зазор между слотами Энергии. */
export const ENERGY_GAP = 24;

/** Центр ряда Энергии по Y (под полем). */
export const ENERGY_Y = 1340;

/** Ширина ряда из N слотов с зазорами. */
export function energyRowWidth(count: number): number {
  return count * ENERGY_SLOT_SIZE + (count - 1) * ENERGY_GAP;
}

/** X-координата центра i-го слота Энергии (ряд центрирован). */
export function energySlotX(i: number, total: number): number {
  const width = energyRowWidth(total);
  const startX = (DESIGN_WIDTH - width) / 2 + ENERGY_SLOT_SIZE / 2;
  return startX + i * (ENERGY_SLOT_SIZE + ENERGY_GAP);
}

// ─── Fury ────────────────────────────────────────────────────────────────────

/** Позиция индикатора Fury (по центру, над рядом Энергии). */
export const FURY_X = DESIGN_WIDTH / 2;
export const FURY_Y = 1230;
