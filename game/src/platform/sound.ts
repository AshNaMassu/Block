/**
 * Процедурный звук (DES-15 / T-055 v1): WebAudio-синтез SFX без ассетов.
 *
 * Все эффекты — короткие тона с огибающей (осциллятор + gain). BGM и
 * адаптивные слои — позже (T-055 продолжение). Тумблер — в меню, флаг в
 * localStorage (`elemental_blast_muted`).
 *
 * AudioContext создаётся лениво при первом вызове (после жеста игрока —
 * политики автоплея это позволяют, т.к. все вызовы из обработчиков ввода).
 */

const KEY_MUTED = 'elemental_blast_muted';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (isMuted()) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY_MUTED) === '1';
  } catch {
    return false;
  }
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  try {
    localStorage.setItem(KEY_MUTED, next ? '1' : '0');
  } catch {
    // ignore — best-effort
  }
  return next;
}

/** Один тон: частота, длительность, тип волны, громкость, скольжение. */
function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Игровые события (DES-15, DESIGN §26: мягкие, не раздражающие). */
export const Sfx = {
  /** Фигура поставлена: мягкий «клик». */
  place(): void {
    tone(300, 0.09, { slideTo: 420, gain: 0.1 });
  },

  /** Ошибка постановки: глухой низкий бип. */
  invalid(): void {
    tone(120, 0.14, { type: 'sawtooth', gain: 0.07 });
  },

  /** Линия(и) очищаются: восходящие блипы по числу линий. */
  lineClear(lines: number): void {
    for (let i = 0; i < Math.min(lines, 6); i++) {
      tone(440 + i * 110, 0.12, { delay: i * 0.11, gain: 0.11 });
    }
  },

  /** Комбо: аккорд-арпеджио выше, зависит от размера. */
  combo(lines: number): void {
    const base = 520 + Math.min(lines, 6) * 40;
    [0, 4, 7].forEach((semi, i) => {
      tone(base * Math.pow(2, semi / 12), 0.16, { delay: i * 0.07, gain: 0.1, type: 'square' });
    });
  },

  /** Очищение: тёплое «сияние» — мажорное трезвучие с блеском. */
  cleansing(): void {
    [523, 659, 784].forEach((f, i) => {
      tone(f, 0.5, { delay: i * 0.06, gain: 0.1 });
    });
    tone(1568, 0.4, { delay: 0.25, gain: 0.05, type: 'sine' });
  },

  /** Fury: восходящий свип. */
  fury(): void {
    tone(180, 0.45, { slideTo: 720, gain: 0.1, type: 'sawtooth' });
  },

  /** Мердж: два тона вверх. */
  merge(): void {
    tone(392, 0.12);
    tone(587, 0.16, { delay: 0.1 });
  },

  /** Game Over: нисходящая грусть. */
  gameover(): void {
    [392, 330, 262, 196].forEach((f, i) => {
      tone(f, 0.28, { delay: i * 0.16, gain: 0.1, type: 'sine' });
    });
  },
};
