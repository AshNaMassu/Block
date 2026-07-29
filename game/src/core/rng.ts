/**
 * Детерминированный RNG на mulberry32.
 *
 * Свойства:
 * - Состояние = одно число (RngState), легко сериализуется в сейв.
 * - Одинаковый seed → одинаковая последовательность чисел.
 * - Достаточно быстр и хорошо распределён для игр.
 *
 * Не использует Math.random — всё детерминированно.
 * Используется спавнером фигур, онбордингом и тестами.
 */
import type { RngState } from './types';

/** Создать функцию RNG с заданным состоянием. Возвращает [next, state]. */
export function createRng(seed: RngState): {
  next: () => number;
  getState: () => RngState;
} {
  let state = seed >>> 0;

  function next(): number {
    // mulberry32
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    getState: () => state,
  };
}

/** Случайный seed из системного источника (для новой игры). */
export function randomSeed(): RngState {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Случайное целое в диапазоне [0, n). */
export function randInt(rngNext: () => number, n: number): number {
  if (n <= 0) throw new Error(`randInt: n must be positive, got ${n}`);
  return Math.floor(rngNext() * n);
}

/** Случайный элемент массива. */
export function pick<T>(rngNext: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[randInt(rngNext, arr.length)]!;
}
