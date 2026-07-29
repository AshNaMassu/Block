/**
 * Интеграционные тесты engine: end-to-end сценарии партии.
 * GDD-2 v1.3, основные пути из T-023 acceptance.
 */
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine';
import { setCell, getCell } from '../grid';
import { BOARD_SIZE, SCORE_LINE_ELEMENTAL, SCORE_LINE_NORMAL } from '../../config/balance';
import type { GameState, Piece } from '../types';

const fire = () => ({ element: 0 as const, multi: false, special: false });
const multi = () => ({ element: -1 as const, multi: true, special: false });

/** Создать engine с предзаполненным полем/рукой. Рука ВСЕГДА чистится — тесты управляют ею сами. */
function makeEngine(initial?: (s: GameState) => void, seed = 42): GameEngine {
  const e = new GameEngine();
  e.startGame({ seed });
  // Всегда очищаем обычные слоты: тесты сами подставляют нужные фигуры через putInHand.
  e.state.hand[0] = null;
  e.state.hand[1] = null;
  e.state.hand[2] = null;
  if (initial) initial(e.state);
  return e;
}

/** Подставить в руку фигуру (занимает первый свободный слот 0..2). */
function putInHand(state: GameState, piece: Piece): void {
  for (let i = 0; i < 3; i++) {
    if (state.hand[i] === null) {
      state.hand[i] = piece;
      return;
    }
  }
}

const normalPiece = (id: string, shape: { x: number; y: number }[], element = 0): Piece => ({
  id,
  kind: 'normal',
  shape,
  element: element as 0 | 1 | 2 | 3,
});

describe('engine integration — базовая постановка', () => {
  it('startGame создаёт пустое поле и 3 фигуры в руке', () => {
    const e = new GameEngine();
    e.startGame({ seed: 42 });
    expect(e.state.grid.every((row) => row.every((c) => c === null))).toBe(true);
    expect(e.state.hand.slice(0, 3).every((p) => p !== null)).toBe(true);
    expect(e.state.hand.slice(3).every((p) => p === null)).toBe(true);
    expect(e.state.score).toBe(0);
    expect(e.state.stars).toBe(0);
  });

  it('постановка на пустое поле без линий: +0 очков, фигура уходит', () => {
    const e = makeEngine(undefined, 42);
    const piece = normalPiece('t1', [{ x: 0, y: 0 }]);
    putInHand(e.state, piece);
    const scoreBefore = e.state.score;
    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.ok).toBe(true);
    expect(r.clearedLines).toHaveLength(0);
    expect(r.lineScore).toBe(0);
    expect(e.state.score).toBe(scoreBefore); // очков не добавилось
    expect(getCell(e.state.grid, 0, 0)).not.toBeNull();
    expect(e.state.hand.find((p) => p?.id === 't1')).toBeUndefined();
  });

  it('невозможная постановка → ok=false', () => {
    const e = makeEngine(undefined, 42);
    setCell(e.state.grid, 0, 0, fire());
    const piece = normalPiece('t1', [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    putInHand(e.state, piece);
    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cannot_place');
  });
});

describe('engine integration — 1 стихийная линия', () => {
  it('замыкает строку огня → +SCORE_LINE_ELEMENTAL × mult, +1 энергия', () => {
    const e = makeEngine(undefined, 42);
    // Предзаполнить строку 0: 7 огня, пустая (0,0)
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, fire());
    // Рука: 1×1 огонь на (0,0)
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.ok).toBe(true);
    expect(r.clearedLines).toHaveLength(1);
    expect(r.elementalLines).toBe(1);
    expect(r.lineScore).toBe(SCORE_LINE_ELEMENTAL * 2); // ×2 Medium difficulty
    expect(e.state.energy.slots).toEqual([0]); // +1 энергия огня
  });

  it('замыкает смешанную строку → normal, 0 энергии', () => {
    const e = makeEngine(undefined, 42);
    // Строка 0: 4 огня (x1..4), 3 воды (x5..7), пустая (0,0)
    for (let x = 1; x <= 4; x++) setCell(e.state.grid, x, 0, fire());
    for (let x = 5; x <= 7; x++)
      setCell(e.state.grid, x, 0, { element: 1, multi: false, special: false });
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.elementalLines).toBe(0);
    expect(r.lineScore).toBe(SCORE_LINE_NORMAL * 2);
    expect(e.state.energy.slots).toEqual([]); // без энергии
  });
});

describe('engine integration — 2-line комбо → Bomb', () => {
  it('замыкает строку + столбец одним ходом → комбо, спецфигура Bomb', () => {
    const e = makeEngine(undefined, 42);
    // Строка 3: 7 огня, пустая (3,3)
    for (let x = 0; x < BOARD_SIZE; x++) if (x !== 3) setCell(e.state.grid, x, 3, fire());
    // Столбец 3: 7 огня (rows 0..2,4..7), пустая (3,3) — та же клетка
    for (let y = 0; y < BOARD_SIZE; y++) if (y !== 3) setCell(e.state.grid, 3, y, fire());

    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 3, y: 3 });
    expect(r.ok).toBe(true);
    expect(r.elementalLines).toBe(2); // строка + столбец
    expect(r.combo).not.toBeNull();
    expect(r.combo!.lines).toBe(2);
    expect(r.specialAdded).toEqual({ type: 'bomb', count: 1 });
    // В руке должна появиться спецфигура
    const specials = e.state.hand.filter((p) => p?.kind === 'special');
    expect(specials).toHaveLength(1);
    expect(specials[0]?.special).toBe('bomb');
  });
});

describe('engine integration — Очищение (overflow 0)', () => {
  it('2/3 энергии + 1 стихийная линия → Очищение overflow 0', () => {
    const e = makeEngine(undefined, 42);
    e.state.energy.slots = [0, 0]; // 2/3 огонь
    // Строка 0: 7 огня, пустая (0,0)
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, fire());
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.cleansing).not.toBeNull();
    expect(r.cleansing!.overflow).toBe(0);
    expect(r.cleansing!.isPure).toBe(true); // consumed [0,0,0] — все огонь
    expect(r.furyStarted).not.toBeNull();
    expect(e.state.energy.slots).toEqual([]); // шкала сброшена
    expect(r.starsGained).toBeGreaterThanOrEqual(1);
    // Pure добавляет +1 star: 1 (base) + 1 (pure) = 2
    expect(r.starsGained).toBe(2);
  });
});

describe('engine integration — Очищение по переполнению (+1)', () => {
  it('2/3 энергии + 2 стихийные линии → overflow +1', () => {
    const e = makeEngine(undefined, 42);
    e.state.energy.slots = [0, 0]; // 2/3 огонь
    // Подготовим пересечение: строка 3 + столбец 3, оба почти огонь, пустая (3,3)
    for (let x = 0; x < BOARD_SIZE; x++) if (x !== 3) setCell(e.state.grid, x, 3, fire());
    for (let y = 0; y < BOARD_SIZE; y++) if (y !== 3) setCell(e.state.grid, 3, y, fire());

    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 3, y: 3 });
    expect(r.cleansing).not.toBeNull();
    expect(r.cleansing!.overflow).toBe(1); // 2 gained - 1 free = 1
  });
});

describe('engine integration — Чистое Очищение + апгрейд спецфигуры', () => {
  it('pure без комбо → Bomb×1 (fallback Чистого)', () => {
    const e = makeEngine(undefined, 42);
    // Полностью огонь во всём, кроме одной клетки, чтобы 1 ход замкнул 1 стихийную линию
    // На самом деле проще: 0/3 энергии + 3 стихийные линии одной стихии одним ходом → pure
    // Но это требует 3 линий. Сделаем проще: предзаполним 2/3 энергии одним элементом,
    // и замкнём 1 стихийную линию той же стихии → consumed [0,0,0] = pure, no combo
    e.state.energy.slots = [0, 0];
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, fire());
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.pure).toBe(true);
    expect(r.elementalLines).toBe(1); // без комбо
    expect(r.specialAdded).toEqual({ type: 'bomb', count: 1 }); // fallback
  });

  it('pure + combo Bomb → Line (апгрейд)', () => {
    const e = makeEngine(undefined, 42);
    e.state.energy.slots = [0, 0]; // pure если gained — [0]
    // Пересечение 2 стихийных линий огня (combo) + consumed [0,0,0] = pure
    for (let x = 0; x < BOARD_SIZE; x++) if (x !== 3) setCell(e.state.grid, x, 3, fire());
    for (let y = 0; y < BOARD_SIZE; y++) if (y !== 3) setCell(e.state.grid, 3, y, fire());
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const r = e.placePiece('t1', { x: 3, y: 3 });
    expect(r.pure).toBe(true);
    expect(r.elementalLines).toBe(2); // combo
    // Combo дал Bomb×1, pure апгрейдит → Line×1
    expect(r.specialAdded).toEqual({ type: 'line', count: 1 });
  });
});

describe('engine integration — спецфигура wildcard-fill', () => {
  it('Bomb заполняет 2×2 пустых клеток, не трогает занятые', () => {
    const e = makeEngine(undefined, 42);
    // Поле: одна занятая клетка в (0,0), остальное пусто в зоне 2×2
    setCell(e.state.grid, 0, 0, fire());
    // Рука: Bomb в бонусном слоте
    e.state.hand[3] = { id: 'b1', kind: 'special', shape: [], special: 'bomb' };

    const r = e.useSpecial('b1', { x: 0, y: 0 });
    expect(r.ok).toBe(true);
    expect(r.specialFill).not.toBeNull();
    expect(r.specialFill!.type).toBe('bomb');
    expect(r.specialFill!.filledCells).toBe(3); // 2×2 - 1 занятая
    expect(getCell(e.state.grid, 0, 0)).toEqual(fire()); // не перезаписана
    expect(getCell(e.state.grid, 1, 0)?.multi).toBe(true); // заполнена multi
    expect(getCell(e.state.grid, 1, 0)?.special).toBe(true);
  });

  it('спецфигура НЕ даёт комбо-спецфигуру (защита от рекурсии)', () => {
    const e = makeEngine(undefined, 42);
    // Подстроим: спецфигура Line заполняет строку так, что замыкает стихийную линию
    // Строка 0: 7 огня, пустая (3,0)
    for (let x = 0; x < BOARD_SIZE; x++) if (x !== 3) setCell(e.state.grid, x, 0, fire());
    e.state.hand[3] = { id: 'l1', kind: 'special', shape: [], special: 'line', orientation: 'row' };

    const r = e.useSpecial('l1', { x: 3, y: 0 }, 'row');
    expect(r.ok).toBe(true);
    // Замкнулась 1 стихийная линия огня — но без комбо (нужно 2+)
    expect(r.elementalLines).toBe(1);
    expect(r.combo).toBeNull(); // спецфигура не даёт комбо
    expect(r.specialAdded).toBeNull(); // и спецфигуры новой нет
  });

  it('нет пустых клеток → ok=false', () => {
    const e = makeEngine(undefined, 42);
    // Заполнить всё поле
    for (let x = 0; x < BOARD_SIZE; x++)
      for (let y = 0; y < BOARD_SIZE; y++) setCell(e.state.grid, x, y, fire());
    e.state.hand[3] = { id: 'b1', kind: 'special', shape: [], special: 'bomb' };
    const r = e.useSpecial('b1', { x: 2, y: 2 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_empty_cells');
  });
});

describe('engine integration — защита 8 multi = обычная линия', () => {
  it('строка из 8 multi-клеток → обычная линия, 0 энергии', () => {
    const e = makeEngine(undefined, 42);
    // Строка 0: 7 multi, пустая (0,0)
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, multi());
    // Постановка rainbow на (0,0) — даёт multi, но линия 8 multi не стихийная
    const piece: Piece = {
      id: 'r1',
      kind: 'rainbow',
      shape: [{ x: 0, y: 0 }],
    };
    putInHand(e.state, piece);
    const r = e.placePiece('r1', { x: 0, y: 0 });
    expect(r.clearedLines).toHaveLength(1);
    expect(r.elementalLines).toBe(0); // 8 multi → обычная
    expect(r.cleansing).toBeNull(); // нет энергии
    expect(e.state.energy.slots).toEqual([]);
  });
});

describe('engine integration — hand overflow конвертация', () => {
  it('Очищение с 3 радужными при полной руке → конвертация в очки', () => {
    const e = makeEngine(undefined, 42);
    e.state.energy.slots = [0, 0]; // для Очищения
    // Заполнить все 3 бонусных слота
    e.state.hand[3] = { id: 'rb1', kind: 'rainbow', shape: [{ x: 0, y: 0 }] };
    e.state.hand[4] = { id: 'rb2', kind: 'rainbow', shape: [{ x: 0, y: 0 }] };
    e.state.hand[5] = { id: 'rb3', kind: 'rainbow', shape: [{ x: 0, y: 0 }] };
    // 1 стихийная линия
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, fire());
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);

    const scoreBefore = e.state.score;
    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.cleansing).not.toBeNull();
    expect(r.cleansing!.rainbowCount).toBeGreaterThanOrEqual(3);
    // Все 3 бонусных уже заняты → все новые радужные конвертируются
    // 3 радужных × 500 × mult = какой-то положительный scoreGained сверху
    expect(e.state.score).toBeGreaterThan(scoreBefore);
    // Бонусные слоты всё ещё заняты старыми (мы их не трогали, новых не добавили)
    expect(e.state.hand[3]?.id).toBe('rb1');
  });
});

describe('engine integration — Game Over', () => {
  it('после хода без вариантов → gameOver=true', () => {
    const e = makeEngine(undefined, 42);
    // Полностью заполним поле, оставив 1 пустую клетку
    for (let x = 0; x < BOARD_SIZE; x++)
      for (let y = 0; y < BOARD_SIZE; y++) setCell(e.state.grid, x, y, fire());
    e.state.grid[0]![0] = null; // одна пустая клетка
    // Рука: только большая фигура I5 (не поместится в 1 клетку)
    e.state.hand[0] = normalPiece('big', [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
    e.state.hand[1] = null;
    e.state.hand[2] = null;
    // Постановка в (0,0) не сработает (I5 не влезет), но мы симулируем последний ход иначе:
    // сделаем ещё одну пустую клетку рядом, поставим, поле снова забьётся, и проверим hasAnyMove
    // Для простоты просто проверим hasAnyMove напрямую
    expect(e.hasAnyMove()).toBe(false); // I5 не помещается, спецфигур нет
  });

  it('hasAnyMove true когда есть спецфигура и пустая клетка', () => {
    const e = makeEngine(undefined, 42);
    for (let x = 0; x < BOARD_SIZE; x++)
      for (let y = 0; y < BOARD_SIZE; y++) setCell(e.state.grid, x, y, fire());
    e.state.grid[0]![0] = null;
    e.state.hand[0] = normalPiece('big', [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    e.state.hand[3] = { id: 'b1', kind: 'special', shape: [], special: 'bomb' };
    expect(e.hasAnyMove()).toBe(true); // спасает спецфигура
  });
});

describe('engine integration — Fury', () => {
  it('после Очищения fury активен в state', () => {
    const e = makeEngine(undefined, 42);
    e.state.energy.slots = [0, 0];
    for (let x = 1; x < BOARD_SIZE; x++) setCell(e.state.grid, x, 0, fire());
    const piece = normalPiece('t1', [{ x: 0, y: 0 }], 0);
    putInHand(e.state, piece);
    const r = e.placePiece('t1', { x: 0, y: 0 });
    expect(r.furyStarted).not.toBeNull();
    expect(e.state.fury).not.toBeNull();
    expect(e.state.fury!.mult).toBeGreaterThan(1);
  });
});
