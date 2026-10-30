/**
 * Пресет-сцены дебага: готовые состояния (поле + рука + энергия) под каждый
 * проверочный кейс детонаторов и наград.
 *
 * Каждый пресет — чистая настройка engine.state БЕЗ боевой логики: применил,
 * поставил фигуру из руки, смотришь результат. GameScene вызывает apply
 * сразу после startGame.
 */
import type { GameEngine } from '../../core/engine';
import { makeSpecialPiece } from '../../core/hand';
import { setCell } from '../../core/grid';
import type { Cell, ElementId, GameState, Piece, SpecialType, Vec2 } from '../../core/types';

export interface DebugPreset {
  id: string;
  title: string;
  /** Что проверяем (подпись в хабе). */
  description: string;
  apply(engine: GameEngine): void;
}

// ─── Хелперы ────────────────────────────────────────────────────────────────

const cell = (element: ElementId): Cell => ({ element, multi: false, special: false });
const multiCell = (): Cell => ({ element: -1, multi: true, special: false });

/** Сбросить сценарий: пустое поле, пустая рука, пустая энергия. */
function reset(engine: GameEngine): GameState {
  engine.debugClearBoard();
  engine.debugResetEnergy();
  engine.state.hand = engine.state.hand.map(() => null);
  engine.state.score = 0;
  engine.state.stars = 0;
  engine.state.runStats = { lines: 0, elemental: 0, cleansings: 0, maxCombo: 0, specialsUsed: 0 };
  return engine.state;
}

/** Заполнить клетки стихией. */
function fill(state: GameState, cells: Vec2[], element: ElementId): void {
  for (const { x, y } of cells) setCell(state.grid, x, y, cell(element));
}

const row = (y: number, xs: number[]): Vec2[] => xs.map((x) => ({ x, y }));
const col = (x: number, ys: number[]): Vec2[] => ys.map((y) => ({ x, y }));
const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Обычная фигура в руку. */
function putNormal(state: GameState, slot: number, shape: Vec2[], element: ElementId): Piece {
  const piece: Piece = { id: `dbg${slot}`, kind: 'normal', shape, element };
  state.hand[slot] = piece;
  return piece;
}

/** Спецфигура в бонусный слот. */
function putSpecial(state: GameState, slot: number, type: SpecialType): Piece {
  const piece = makeSpecialPiece(type);
  state.hand[slot] = piece;
  return piece;
}

const ONE = [{ x: 0, y: 0 }];
const I3V = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
];
const I4V = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 0, y: 3 },
];
const I5V = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 0, y: 3 },
  { x: 0, y: 4 },
];

// ─── Пресеты ────────────────────────────────────────────────────────────────

export const DEBUG_PRESETS: readonly DebugPreset[] = [
  {
    id: 'fire-center',
    title: '🔥 Пожар — центр',
    description: 'Выжигает 3×3 вокруг (3,3), вся область становится огнём',
    apply(engine) {
      const s = reset(engine);
      setCell(s.grid, 2, 2, cell(1)); // вода — разрушится
      setCell(s.grid, 4, 4, cell(2)); // земля — разрушится
      putSpecial(s, 3, 'fire');
    },
  },
  {
    id: 'fire-edge',
    title: '🔥 Пожар — угол',
    description: 'Clamp 3×3 у угла: постановка в (0,0), вода в (0,1)',
    apply(engine) {
      const s = reset(engine);
      setCell(s.grid, 0, 1, cell(1)); // вода — разрушится (клетка постановки должна быть пустой)
      putSpecial(s, 3, 'fire'); // поставить в (0,0)
    },
  },
  {
    id: 'fire-cascade',
    title: '🔥 Пожар → каскад',
    description: 'След замыкает строку 2 — стихийная линия и очистка',
    apply(engine) {
      const s = reset(engine);
      fill(s, row(2, range(1, 7)), 0); // строка 2 без (0,2)
      setCell(s.grid, 2, 3, cell(1)); // вода в зоне взрыва
      putSpecial(s, 3, 'fire'); // поставить в (1,3)
    },
  },
  {
    id: 'tide-row',
    title: '💧 Прилив — строка',
    description: 'Горизонтальная постановка смывает строку 4 целиком',
    apply(engine) {
      const s = reset(engine);
      fill(s, row(4, range(0, 5)), 0);
      putSpecial(s, 3, 'tide'); // в (6,4), ориентация row
    },
  },
  {
    id: 'tide-column',
    title: '💧 Прилив — столбец',
    description: 'Вертикальная постановка смывает столбец 2 целиком',
    apply(engine) {
      const s = reset(engine);
      fill(s, col(2, range(0, 5)), 0);
      putSpecial(s, 3, 'tide'); // в (2,6), ориентация column
    },
  },
  {
    id: 'vortex',
    title: '🌀 Вихрь',
    description: 'Сметает самую частую стихию (6 огней против прочих)',
    apply(engine) {
      const s = reset(engine);
      fill(
        s,
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ],
        0,
      );
      fill(
        s,
        [
          { x: 5, y: 0 },
          { x: 6, y: 0 },
          { x: 5, y: 1 },
        ],
        1,
      );
      fill(
        s,
        [
          { x: 7, y: 7 },
          { x: 6, y: 7 },
        ],
        2,
      );
      putSpecial(s, 3, 'vortex');
    },
  },
  {
    id: 'vortex-tie',
    title: '🌀 Вихрь — ничья',
    description: '3 огня vs 3 воды → сметает огонь (меньший ElementId)',
    apply(engine) {
      const s = reset(engine);
      fill(s, row(0, [0, 1, 2]), 0);
      fill(s, row(1, [0, 1, 2]), 1);
      putSpecial(s, 3, 'vortex');
    },
  },
  {
    id: 'spring',
    title: '🌿 Родник',
    description: 'Перекрашивает 4×4 вокруг (3,3) в доминанту области',
    apply(engine) {
      const s = reset(engine);
      setCell(s.grid, 2, 2, cell(0));
      setCell(s.grid, 5, 5, cell(0));
      setCell(s.grid, 2, 5, cell(1));
      setCell(s.grid, 5, 2, multiCell()); // multi тоже перекрасится
      putSpecial(s, 3, 'spring'); // в (3,3)
    },
  },
  {
    id: 'combo2',
    title: '⭐ Комбо 2 линии',
    description: 'Строка 3 + столбец 3 → 🔥 Пожар в руку',
    apply(engine) {
      const s = reset(engine);
      fill(
        s,
        row(
          3,
          range(0, 7).filter((x) => x !== 3),
        ),
        0,
      );
      fill(
        s,
        col(
          3,
          range(0, 7).filter((y) => y !== 3),
        ),
        0,
      );
      putNormal(s, 0, ONE, 0); // в (3,3)
    },
  },
  {
    id: 'combo3',
    title: '⭐ Комбо 3 линии',
    description: 'Строки 3,4,5 + I3 вертикально в (3,3) → 💧 Прилив',
    apply(engine) {
      const s = reset(engine);
      for (const y of [3, 4, 5])
        fill(
          s,
          row(
            y,
            range(0, 7).filter((x) => x !== 3),
          ),
          0,
        );
      putNormal(s, 0, I3V, 0); // в (3,3)
    },
  },
  {
    id: 'combo4',
    title: '⭐ Комбо 4 линии',
    description: 'Строки 2..5 + I4 вертикально в (3,2) → 🌀 Вихрь',
    apply(engine) {
      const s = reset(engine);
      for (const y of [2, 3, 4, 5])
        fill(
          s,
          row(
            y,
            range(0, 7).filter((x) => x !== 3),
          ),
          0,
        );
      putNormal(s, 0, I4V, 0); // в (3,2)
    },
  },
  {
    id: 'combo5',
    title: '⭐ Комбо 5 линий',
    description: 'Строки 2..6 + I5 вертикально в (3,2) → 🌿 Родник',
    apply(engine) {
      const s = reset(engine);
      for (const y of range(2, 6))
        fill(
          s,
          row(
            y,
            range(0, 7).filter((x) => x !== 3),
          ),
          0,
        );
      putNormal(s, 0, I5V, 0); // в (3,2)
    },
  },
  {
    id: 'pure',
    title: '✨ Чистое Очищение',
    description: '2/3⚡ огня + стихийная линия → ×2 очков, апгрейд награды',
    apply(engine) {
      const s = reset(engine);
      s.energy.slots = [0, 0];
      fill(s, row(0, range(1, 7)), 0);
      putNormal(s, 0, ONE, 0); // в (0,0)
    },
  },
  {
    id: 'rainbow',
    title: '🌈 Радужная в линии',
    description: '7 огней + радужная 1×1 → стихийная линия',
    apply(engine) {
      const s = reset(engine);
      fill(s, row(6, range(0, 6)), 0);
      s.hand[3] = { id: 'dbgr', kind: 'rainbow', shape: ONE }; // в (7,6)
    },
  },
  {
    id: 'merge',
    title: '🔀 Мердж в руке',
    description: 'Два Пожара: тап по одному, тап по второму → Прилив',
    apply(engine) {
      const s = reset(engine);
      putSpecial(s, 3, 'fire');
      putSpecial(s, 4, 'fire');
    },
  },
];

/** Применить пресет по id. Возвращает false, если пресет не найден. */
export function applyDebugPreset(engine: GameEngine, id: string): boolean {
  const preset = DEBUG_PRESETS.find((p) => p.id === id);
  if (!preset) return false;
  preset.apply(engine);
  return true;
}
