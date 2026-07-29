/**
 * Greybox-стаб персистентности: best/stars в localStorage.
 *
 * Это ВРЕМЕННАЯ тонкая прослойка для Milestone 2. В Milestone 4 (T-050/T-051)
 * заменится на полноценную `IPlatform` (YandexPlatform / WebPlatform) с валидацией
 * сейвов (zod) и версионированием схемы. Сейчас даёт чистую точку для рефактора,
 * чтобы игровой код не трогал `localStorage` напрямую.
 *
 * Ключи — канон из GDD-2 v1.3, секция 7.1.
 */
import type { GameState } from '../core/types';

const KEY_BEST = 'elemental_blast_best';
const KEY_STARS = 'elemental_blast_stars';
const KEY_SAVE = 'elemental_blast_save';

/** Мета-данные прогресса игрока (персистентные между партиями). */
export interface PlayerMeta {
  best: number;
  stars: number;
}

const DEFAULT_META: PlayerMeta = { best: 0, stars: 0 };

/** Безопасно прочитать число из localStorage. */
function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    // localStorage может быть недоступен (private mode, SSR) — fallback на null
    return null;
  }
}

/** Безопасно записать число в localStorage. */
function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore — best-effort
  }
}

/** Загрузить best/stars. Битые/отсутствующие → дефолт. */
export function loadMeta(): PlayerMeta {
  const best = readNumber(KEY_BEST);
  const stars = readNumber(KEY_STARS);
  return {
    best: best !== null && best > 0 ? best : DEFAULT_META.best,
    stars: stars !== null && stars > 0 ? stars : DEFAULT_META.stars,
  };
}

/** Сохранить best/stars. */
export function saveMeta(meta: PlayerMeta): void {
  writeNumber(KEY_BEST, meta.best);
  writeNumber(KEY_STARS, meta.stars);
}

/** Обновить best/stars по итогам партии (берёт максимум). Возвращает новую мету. */
export function updateMetaAfterGame(
  score: number,
  starsGained: number,
  prev: PlayerMeta,
): PlayerMeta {
  const next: PlayerMeta = {
    best: Math.max(prev.best, score),
    stars: prev.stars + starsGained,
  };
  saveMeta(next);
  return next;
}

/** Сохранить текущую партию для resume (Milestone 4 даст полноценную схему). */
export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY_SAVE, JSON.stringify(state));
  } catch {
    // ignore — best-effort
  }
}

/** Загрузить сохранённую партию. null = нет/битый сейв. */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY_SAVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Минимальная sanity-проверка; полная валидация — в T-051.
    if (!parsed || !Array.isArray(parsed.grid) || !Array.isArray(parsed.hand)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Удалить сейв текущей партии (после Game Over без continue). */
export function clearSave(): void {
  try {
    localStorage.removeItem(KEY_SAVE);
  } catch {
    // ignore
  }
}
