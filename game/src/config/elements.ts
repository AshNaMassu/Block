/**
 * Палитра стихий и UI-цветов — тёмная тема «Неоновая алхимия».
 *
 * Направление (docs/DESIGN-neon-alchemy.md, §4/§28): глубокий тёмно-синий фон,
 * стеклянные стихийные элементы, золото — ТОЛЬКО для бонусов/наград (§22),
 * белый/светло-голубой — подтверждение, красный — ошибка.
 *
 * Правило (TECH_TASKS.md B.3.4): цвета и хекс-коды — здесь, не в сценах Phaser.
 * Стихии индексируются 0..3 в том же порядке, что ElementId (types.ts):
 * 0 = 🔥 огонь, 1 = 💧 вода, 2 = 🌿 земля, 3 = 💨 воздух.
 */
import type { ElementId } from '../core/types';

/** Цвет фона игры (глубокий тёмно-синий, почти чёрный). */
export const COLOR_BG = 0x060a13;

/** Цвет рамок поля / панелей (лёгкая синяя обводка, без агрессии). */
export const COLOR_GRID = 0x223252;

/** Цвет пустой клетки поля (тёмная ниша, чуть светлее фона). */
export const COLOR_CELL_EMPTY = 0x111c31;

/** Цвет панелей (поле, оверлеи, тосты, подсказки). */
export const COLOR_PANEL = 0x101a2e;

/** Тень панели (полупрозрачный чёрный — на тёмном теме тёмная тень). */
export const COLOR_PANEL_SHADOW = 0x000000;

/** Цвет затемняющего оверлея поверх сцены (диалоги, сцена смерти). */
export const COLOR_OVERLAY = 0x060a13;

/** Цвет стихийных клеток по индексу ElementId (стеклянные неоновые). */
export const ELEMENT_COLORS: readonly number[] = [
  0xff6a3d, // 🔥 огонь — тёплый оранжевый
  0x38b6ff, // 💧 вода — голубой стеклянный
  0x57d06c, // 🌿 земля — природный зелёный
  0xbfa7ff, // 💨 воздух — лавандово-воздушный (не голубой!)
];

/** Человекочитаемые имена стихий (для HowTo/дебага). */
export const ELEMENT_NAMES: readonly string[] = ['Огонь', 'Вода', 'Земля', 'Воздух'];

/** Цвет радужной фигуры (база — белый призматический кристалл). */
export const COLOR_RAINBOW = 0xffffff;

/** Золотой/янтарный: бонусные слоты, радужная, награды, звёзды (ТОЛЬКО бонусы — DESIGN §22). */
export const COLOR_GOLD = 0xffc24d;

/** Цвет multi-клетки (радужной): белый кристалл с перламутровыми гранями. */
export const COLOR_MULTI = 0xf2eef8;

/** Основной цвет текста HUD/меню (почти белый, холодный). */
export const COLOR_TEXT = 0xf4f7ff;

/** Приглушённый цвет вторичного текста (подписи, подсказки). */
export const COLOR_TEXT_DIM = 0x9fb0d0;

/** Цвет валидной постановки (preview) — светло-голубой «подтверждение», не зелёный (земля зелёная). */
export const COLOR_PREVIEW_OK = 0x9ed4ff;

/** Цвет невалидной постановки (preview) / ошибки. */
export const COLOR_PREVIEW_BAD = 0xff4d6d;

/** Цвет основной кнопки (светло-голубой — «подтверждение действия»). */
export const COLOR_BUTTON = 0x56d2ff;

/** Цвет основной кнопки при наведении/нажатии. */
export const COLOR_BUTTON_HOVER = 0x7fdcff;

/** Тёмный край кнопки (эффект объёма). */
export const COLOR_BUTTON_EDGE = 0x1687d8;

/** Цвет вторичной кнопки (тёмная панель). */
export const COLOR_BUTTON_SECONDARY = 0x1a2440;

/** Край вторичной кнопки. */
export const COLOR_BUTTON_SECONDARY_EDGE = 0x26385a;

/** Цвет текста на основной кнопке (тёмный — на светло-голубом фоне). */
export const COLOR_BUTTON_TEXT = 0x060a13;

/** Семейство шрифта игры — Manrope, локальный woff2 (DES-2, DESIGN §19). */
export const FONT_FAMILY = "'Manrope', system-ui, Arial, sans-serif";

/** Получить цвет стихии по ElementId. */
export function elementColor(element: ElementId | -1): number {
  return element < 0 ? COLOR_MULTI : ELEMENT_COLORS[element]!;
}

/** Осветлить цвет к белому (factor 0..1) — верхние грани кристаллов. */
export function lighten(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * factor);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** Затемнить цвет к чёрному (factor 0..1) — нижние грани/края. */
export function darken(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c * (1 - factor));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}
