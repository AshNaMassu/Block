/**
 * Пул форм Block Blast (GDD-2 v1.3 Appendix A).
 *
 * ⚠️ КАНОН: формы строго соответствуют оригинальному Block Blast.
 * Никаких выдуманных форм (Corner-big/U-shape/Rect2x3/L-long убраны — их нет в оригинале).
 *
 * Маски заданыcells относительно (0,0). Повороты генерируются автоматически в core/shapes.ts.
 * Веса применяются к БАЗОВОЙ маске (baseId), не к каждой ориентации.
 */
import type { Vec2 } from '../core/types';

/** Описание базовой маски формы. */
export interface BaseShape {
  /** Стабильный идентификатор базовой маски. */
  id: string;
  /** Человекочитаемое имя. */
  name: string;
  /** Клетки маски, координаты относительно (0,0). */
  cells: Vec2[];
}

/** Веса спавна по категориям (GDD Appendix A, непересекающиеся). */
export interface ShapeCategory {
  /** Диапазон клеток. */
  cellCount: number;
  /** Суммарный вес форм этой категории. */
  weight: number;
}

/** Каноничный пул базовых масок Block Blast (10 шт). */
export const BASE_SHAPES: readonly BaseShape[] = [
  {
    id: 'Dot',
    name: 'Точка',
    cells: [{ x: 0, y: 0 }],
  },
  {
    id: 'I2',
    name: 'Линия 2',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  },
  {
    id: 'I3',
    name: 'Линия 3',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
  },
  {
    id: 'I4',
    name: 'Линия 4',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
  },
  {
    id: 'I5',
    name: 'Линия 5',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ],
  },
  {
    id: 'Square2',
    name: 'Квадрат 2×2',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  {
    id: 'Square3',
    name: 'Квадрат 3×3 (killer)',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
  },
  {
    id: 'L',
    name: 'L-тетромино',
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  },
  {
    id: 'J',
    name: 'J-тетромино',
    cells: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ],
  },
  {
    id: 'T',
    name: 'T-тетромино',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
  },
  {
    id: 'S',
    name: 'S-тетромино',
    cells: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  {
    id: 'Z',
    name: 'Z-тетромино',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
];

/**
 * Веса категорий по числу клеток (GDD Appendix A).
 * Сумма весов = 100. Внутри категории вес делится поровну между формами.
 */
export const SHAPE_CATEGORIES: readonly ShapeCategory[] = [
  { cellCount: 1, weight: 12 }, // Dot
  { cellCount: 2, weight: 13 }, // I2
  { cellCount: 3, weight: 15 }, // I3
  { cellCount: 4, weight: 35 }, // I4, Square2, L, J, T, S, Z
  { cellCount: 5, weight: 18 }, // I5
  { cellCount: 9, weight: 7 }, // Square3
];
