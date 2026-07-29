/**
 * Ключи процедурных текстур (генерируются в PreloadScene без ассетов).
 *
 * Central registry — PreloadScene создаёт, view-объекты потребляют по ключу.
 * Формат именования: `tex-<имя>-<параметр>` (напр. `tex-cell-0` для огня).
 *
 * Greybox Milestone 2. В Milestone 3 можно заменить на атлас TexturePacker.
 */
import { ELEMENT_COLORS } from '../config/elements';

/** Префикс всех процедурных текстур. */
export const TEX_PREFIX = 'tex';

/** Ключ текстуры стихийной клетки по ElementId (0..3). */
export function cellTextureKey(element: number): string {
  return `${TEX_PREFIX}-cell-${element}`;
}

/** Ключ текстуры multi-клетки (от спецфигуры). */
export const TEX_MULTI = `${TEX_PREFIX}-cell-multi`;

/** Ключ текстуры пустой клетки (фон слота поля). */
export const TEX_CELL_EMPTY = `${TEX_PREFIX}-cell-empty`;

/** Ключ текстуры overlay клетки для preview постановки. */
export const TEX_PREVIEW_OK = `${TEX_PREFIX}-preview-ok`;
export const TEX_PREVIEW_BAD = `${TEX_PREFIX}-preview-bad`;

/** Ключ текстуры радужной фигуры/клетки. */
export const TEX_RAINBOW = `${TEX_PREFIX}-rainbow`;

/** Ключ текстуры спецфигуры по типу (bomb/line/cross/apocalypse). */
export function specialTextureKey(type: string): string {
  return `${TEX_PREFIX}-special-${type}`;
}

/** Размер текстуры клетки в px (квадрат, с запасом под обводку). */
export const TEX_CELL_SIZE = 120;

/** Список всех ключей стихийных клеток (для генерации в Preload). */
export const ALL_CELL_TEXTURE_KEYS: readonly string[] = [
  ...ELEMENT_COLORS.map((_, i) => cellTextureKey(i)),
  TEX_MULTI,
];
