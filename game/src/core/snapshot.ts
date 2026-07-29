/**
 * Snapshot-оркестрация очистки линий (GDD-2 v1.3, секция 3.5).
 *
 * Жёсткий порядок (ЗАПРЕЩЕНА lazy-очистка во время итерации):
 * 1. Сделать снимок поля (фактически — прочитать текущее состояние).
 * 2. Найти ВСЕ полные линии на снимке.
 * 3. Посчитать очки за линии, стихийные линии, gainedElements.
 * 4. Вернуть результат подсчёта — НЕ мутировать grid здесь.
 *
 * Очистка выполняется отдельным вызовом applyClear, чтобы engine мог сначала
 * насчитать 4 оси наград (линии/комбо/переполнение/чистое) по одному снимку,
 * а потом удалить клетки объединения.
 *
 * Это закрывает баг «строка удалилась раньше столбца → столбец уже не полный».
 */
import { SCORE_LINE_ELEMENTAL, SCORE_LINE_NORMAL } from '../config/balance';
import { clearCells } from './grid';
import { classifyLine, findFullLines, unionLineCells } from './lines';
import type { ElementId, Grid, LineInfo } from './types';

/** Результат подсчёта по снимку (до очистки). */
export interface SnapshotScan {
  /** Найденные линии (в детерминированном порядке). */
  lines: LineInfo[];
  /** Стихийные линии (подмножество lines). */
  elementalLines: LineInfo[];
  /** Очки за все линии. */
  lineScore: number;
  /** Элементы от стихийных линий, в порядке строк-затем-столбцов. */
  gainedElements: ElementId[];
  /** Клетки для очистки (объединение, дедуплицировано). */
  cellsToClear: { x: number; y: number }[];
}

/**
 * Просканировать поле и посчитать всё по снимку, БЕЗ мутации.
 * Engine вызывает это после постановки фигуры/спецфигуры.
 */
export function scanSnapshot(grid: Grid): SnapshotScan {
  const lines = findFullLines(grid);
  const elementalLines = lines.filter((l) => l.isElemental);

  let lineScore = 0;
  const gainedElements: ElementId[] = [];
  for (const line of lines) {
    if (line.isElemental) {
      lineScore += SCORE_LINE_ELEMENTAL;
      gainedElements.push(line.element as ElementId);
    } else {
      lineScore += SCORE_LINE_NORMAL;
    }
  }

  const cellsToClear = unionLineCells(lines);

  return { lines, elementalLines, lineScore, gainedElements, cellsToClear };
}

/**
 * Применить очистку: удалить cellsToClear из grid.
 * Мутирует grid. Вызывается ПОСЛЕ того, как engine насчитал все награды.
 */
export function applyClear(grid: Grid, cellsToClear: { x: number; y: number }[]): void {
  clearCells(grid, cellsToClear);
}

/** Утилита: подсчитать очки за одну линию без скана (для отладки/FX). */
export function scoreForLine(isElemental: boolean): number {
  return isElemental ? SCORE_LINE_ELEMENTAL : SCORE_LINE_NORMAL;
}

/** Ре-экспорт classifyLine для удобства тестов/engine. */
export { classifyLine };
