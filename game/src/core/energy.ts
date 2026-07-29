/**
 * Энергия и Очищение (GDD-2 v1.3, секция 4.1 + Ось В).
 *
 * Шкала ENERGY_CAPACITY слотов. Стихийная линия = +1 энергии.
 * При достижении капа или переполнении → Очищение.
 *
 * consumed = старые слоты + новые по порядку, пока не наберётся ENERGY_CAPACITY.
 * overflow = max(0, gainedCount - freeSlots), кэп OVERFLOW_CAP.
 * Лишняя энергия не переносится в новый цикл (GDD 3.6).
 * Чистое Очищение = все consumed одной стихии.
 */
import { ENERGY_CAPACITY, OVERFLOW_CAP } from '../config/balance';
import type { CleansingReward, ElementId } from './types';
import { getCleansingReward } from './cleansing';

/** Результат добавления энергии: либо ничего, либо Очищение. */
export interface AddEnergyResult {
  /** Новое состояние слотов (после добавления). Пустое если было Очищение. */
  slots: ElementId[];
  /** Очищение, если сработало. null — иначе. */
  cleansing: CleansingReward | null;
}

/**
 * Добавить gained элементов к шкале и, возможно, триггернуть Очищение.
 * Возвращает новое состояние слотов и (если есть) награду Очищения.
 *
 * Состояние НЕ мутируется — engine применит результат сам.
 */
export function addEnergy(currentSlots: ElementId[], gained: ElementId[]): AddEnergyResult {
  const before = currentSlots.length;
  const free = ENERGY_CAPACITY - before;
  const total = before + gained.length;

  if (total < ENERGY_CAPACITY) {
    // Без Очищения: просто копим
    return { slots: [...currentSlots, ...gained], cleansing: null };
  }

  // Очищение: consumed = старые + новые до заполнения, остальное → overflow
  const combined: ElementId[] = [...currentSlots, ...gained];
  const consumed = combined.slice(0, ENERGY_CAPACITY);
  const isPure = consumed.every((e) => e === consumed[0]);

  let overflow = Math.max(0, gained.length - free);
  overflow = Math.min(overflow, OVERFLOW_CAP);

  const cleansing = getCleansingReward(overflow, isPure, consumed[0]!);

  // Шкала сбрасывается в пустое после Очищения.
  return { slots: [], cleansing };
}

/** Утилита: сколько свободных слотов. */
export function freeSlots(slots: ElementId[]): number {
  return ENERGY_CAPACITY - slots.length;
}

/** Утилита: заполнена ли шкала. */
export function isFull(slots: ElementId[]): boolean {
  return slots.length >= ENERGY_CAPACITY;
}
