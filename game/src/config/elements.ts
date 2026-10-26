/**
 * Палитра стихий и UI-цветов — светлая тема «Кристаллы».
 *
 * Направление: светлый тёплый фон, клетки — фасеточные кристаллы стихий,
 * тёмный тёплый текст, конфетные кнопки. Аудитория Яндекс Игр голосует за
 * светлое, высококонтрастное, «конфетное».
 *
 * Правило (TECH_TASKS.md B.3.4): цвета и хекс-коды — здесь, не в сценах Phaser.
 * Стихии индексируются 0..3 в том же порядке, что ElementId (types.ts):
 * 0 = 🔥 огонь, 1 = 💧 вода, 2 = 🌿 земля, 3 = 💨 воздух.
 */
import type { ElementId } from '../core/types';

/** Цвет фона игры (тёплый светлый пергамент). */
export const COLOR_BG = 0xf7f3ec;

/** Цвет линий сетки поля / рамок панелей. */
export const COLOR_GRID = 0xe5ddce;

/** Цвет пустой клетки поля (вставка-лунка, чуть темнее фона). */
export const COLOR_CELL_EMPTY = 0xece5d8;

/** Цвет белой панели (поле, оверлеи, тосты). */
export const COLOR_PANEL = 0xffffff;

/** Тень панели (полупрозрачный тёплый коричневый). */
export const COLOR_PANEL_SHADOW = 0x8a7d66;

/** Цвет стихийных клеток по индексу ElementId (насыщенные кристальные). */
export const ELEMENT_COLORS: readonly number[] = [
  0xf4503c, // 🔥 огонь — киноварь
  0x2ea3e8, // 💧 вода — лазурь
  0x3fb96b, // 🌿 земля — изумруд
  0x8f6fe8, // 💨 воздух — аметист
];

/** Человекочитаемые имена стихий (для HowTo/дебага). */
export const ELEMENT_NAMES: readonly string[] = ['Огонь', 'Вода', 'Земля', 'Воздух'];

/** Цвет радужной фигуры (база — белый кристалл). */
export const COLOR_RAINBOW = 0xffffff;

/** Золотой/янтарный контур радужной, бонусных слотов, звёзд. */
export const COLOR_GOLD = 0xf5a623;

/** Цвет multi-клетки (радужной): белый кристалл с перламутровыми гранями. */
export const COLOR_MULTI = 0xf2eef8;

/** Основной цвет текста HUD/меню (тёмный тёплый). */
export const COLOR_TEXT = 0x453e33;

/** Приглушённый цвет вторичного текста (best, подписи). */
export const COLOR_TEXT_DIM = 0xa39a89;

/** Цвет валидной постановки (preview). */
export const COLOR_PREVIEW_OK = 0x53c26e;

/** Цвет невалидной постановки (preview). */
export const COLOR_PREVIEW_BAD = 0xe2504a;

/** Цвет основной кнопки (тёплый янтарно-оранжевый, конфетный). */
export const COLOR_BUTTON = 0xff9d5c;

/** Цвет основной кнопки при наведении/нажатии. */
export const COLOR_BUTTON_HOVER = 0xffb37f;

/** Тёмный край кнопки (эффект объёма). */
export const COLOR_BUTTON_EDGE = 0xe07f3f;

/** Цвет вторичной кнопки (тихая светлая). */
export const COLOR_BUTTON_SECONDARY = 0xefe8db;

/** Тёмный край вторичной кнопки. */
export const COLOR_BUTTON_SECONDARY_EDGE = 0xd9cfba;

/** Цвет текста на конфетных кнопках (белый). */
export const COLOR_BUTTON_TEXT = 0xffffff;

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
