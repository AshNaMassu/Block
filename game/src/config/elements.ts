/**
 * Палитра стихий и UI-цветов (GDD-2 v1.3, секция 13 — Арт-направление).
 *
 * Правило (TECH_TASKS.md B.3.4): цвета и хекс-коды — здесь, не в сценах Phaser.
 * Стихии индексируются 0..3 в том же порядке, что ElementId (types.ts):
 * 0 = 🔥 огонь, 1 = 💧 вода, 2 = 🌿 земля, 3 = 💨 воздух.
 */
import type { ElementId } from '../core/types';

/** Цвет фона игры (тёмный, modern minimal + неоновая магия). */
export const COLOR_BG = 0x0f0e17;

/** Цвет линий сетки поля. */
export const COLOR_GRID = 0x2d2b40;

/** Цвет пустой клетки поля (слегка светлее сетки). */
export const COLOR_CELL_EMPTY = 0x1c1a2b;

/** Цвет стихийных клеток по индексу ElementId. */
export const ELEMENT_COLORS: readonly number[] = [
  0xff6b47, // 🔥 огонь
  0x4cc9f0, // 💧 вода
  0x52b788, // 🌿 земля
  0xb58dff, // 💨 воздух
];

/** Человекочитаемые имена стихий (для HowTo/дебага). */
export const ELEMENT_NAMES: readonly string[] = ['Огонь', 'Вода', 'Земля', 'Воздух'];

/** Цвет радужной фигуры (4-секторный градиент упрощаем до одного цвета + контур). */
export const COLOR_RAINBOW = 0xffffff;

/** Золотой контур радужной/бонусных слотов. */
export const COLOR_GOLD = 0xffd700;

/** Цвет multi-клетки (от спецфигуры): светлый «дикий» оттенок. */
export const COLOR_MULTI = 0xe8e8f0;

/** Угловая метка спец-клетки (⚡). */
export const COLOR_SPECIAL_MARK = 0xffd700;

/** Основной цвет текста HUD/меню. */
export const COLOR_TEXT = 0xffffff;

/** Приглушённый цвет вторичного текста (best, подписи). */
export const COLOR_TEXT_DIM = 0xa7a9be;

/** Цвет валидной постановки (preview). */
export const COLOR_PREVIEW_OK = 0x52b788;

/** Цвет невалидной постановки (preview). */
export const COLOR_PREVIEW_BAD = 0xff6b47;

/** Цвет фона кнопки. */
export const COLOR_BUTTON = 0x3a3852;

/** Цвет фона кнопки при наведении/нажатии. */
export const COLOR_BUTTON_HOVER = 0x4a4870;

/** Получить цвет стихии по ElementId. */
export function elementColor(element: ElementId | -1): number {
  return element < 0 ? COLOR_MULTI : ELEMENT_COLORS[element]!;
}
