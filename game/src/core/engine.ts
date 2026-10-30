/**
 * GameEngine — фасад для view (Phaser).
 *
 * Оркестрирует 4 оси наград в порядке GDD-2 v1.3 секция 4.5:
 * 1. Очки за линии (Ось А).
 * 2. Комбо → спецфигуры (Ось Б). Выдаётся ДО Очищения, отдельно.
 * 3. Энергия + Очищение (Ось В) → очки/звёзды/радужные/Fury.
 * 4. Чистое Очищение (Ось Г) → ×2/апгрейд спецфигуры.
 *
 * Порядок выдачи руки (критично, GDD 3.8): радужные и спецфигуры ДО нового Fury,
 * чтобы конвертация шла по старому множителю.
 *
 * Единый публичный метод placePiece — все виды фигур (normal/rainbow/special).
 * Спецфигуры-детонаторы ставятся как обычные фигуры; после постановки детонируют
 * (специальный pipeline): разрушение + след, +1 ⚡ стихии детонатора, БЕЗ комбо
 * (защита от рекурсии, GDD 3.4). Возвращает PlacementResult для view (анимации/FX).
 */
import { SCORE_SPECIAL_DETONATION_PER_CELL } from '../config/balance';
import { createGrid, setCell } from './grid';
import { canPlaceShape, getShapeCells, spawnNormalBatch } from './shapes';
import { scanSnapshot, applyClear } from './snapshot';
import { addEnergy } from './energy';
import { getComboReward } from './combo';
import { applyPureCleansing } from './pure';
import { detonate, specialShape, SPECIAL_ELEMENT } from './specials';
import {
  addRainbowPieces,
  addSpecialPieces,
  createHand,
  refillNormalIfNeeded,
  removePieceById,
  getPieceById,
} from './hand';
import { hasAnyMove } from './gameover';
import { currentMultiplier, startFury, tickFury } from './fury';
import { createRng, randomSeed } from './rng';
import type {
  CleansingReward,
  ElementId,
  GameState,
  LineOrientation,
  PlacementResult,
  Piece,
  SpecialReward,
  SpecialType,
  Vec2,
} from './types';

/** Опции старта новой игры. */
export interface StartOptions {
  seed?: number;
  tutorial?: boolean;
}

/** Создать новый GameEngine с пустой игрой. */
export class GameEngine {
  state: GameState;
  private rngNext: () => number;
  private rngGetState: () => number;

  constructor() {
    const seed = randomSeed();
    const rng = createRng(seed);
    this.rngNext = rng.next;
    this.rngGetState = rng.getState;
    this.state = this.freshState(seed, false);
  }

  private freshState(seed: number, tutorial: boolean): GameState {
    return {
      grid: createGrid(),
      hand: createHand(),
      score: 0,
      best: 0,
      stars: 0,
      energy: { slots: [] },
      fury: null,
      rngState: seed,
      tutorialCompleted: !tutorial,
      runStats: { lines: 0, elemental: 0, cleansings: 0, maxCombo: 0, specialsUsed: 0 },
    };
  }

  /** Начать новую игру. */
  startGame(options: StartOptions = {}): void {
    const seed = options.seed ?? randomSeed();
    const rng = createRng(seed);
    this.rngNext = rng.next;
    this.rngGetState = rng.getState;
    this.state = this.freshState(seed, options.tutorial ?? false);
    // Заполняем руку
    this.state.hand = createHand();
    this.refillNormal();
  }

  private now(): number {
    return Date.now();
  }

  private currentMult(): number {
    return currentMultiplier(this.state.stars, this.state.fury, this.now());
  }

  private refillNormal(): boolean {
    return refillNormalIfNeeded(this.state.hand, () => this.spawnPiece());
  }

  private spawnPiece(): Piece {
    const batch = spawnNormalBatch(this.rngNext, 1);
    const piece = batch[0]!;
    // Дебаг: фиксированная стихия спавна (только обычная тройка).
    if (this.debugSpawnElement !== null) piece.element = this.debugSpawnElement;
    return piece;
  }

  // ─── Debug API (используется только дебаг-панелью, не боевой логикой) ────

  /** Фильтр стихии спавна обычной тройки. null — обычный случайный спавн. */
  debugSpawnElement: ElementId | null = null;

  /** Дебаг: перезаполнить обычную тройку (если все 3 слота пусты). */
  debugRefillHand(): boolean {
    return this.refillNormal();
  }

  /** Дебаг: очистить поле. */
  debugClearBoard(): void {
    this.state.grid = createGrid();
  }

  /** Дебаг: опустошить шкалу энергии и сбросить Fury. */
  debugResetEnergy(): void {
    this.state.energy.slots = [];
    this.state.fury = null;
  }

  /** Дебаг: выдать спецфигуру-детонатор в бонусный слот. */
  debugGiveSpecial(type: SpecialType): void {
    addSpecialPieces(this.state.hand, type, 1, 1);
  }

  /** Дебаг: выдать радужную в бонусный слот. */
  debugGiveRainbow(): void {
    addRainbowPieces(this.state.hand, 1, 1);
  }

  /** Дебаг: выдать +1⚡ заданной стихии (без триггера Очищения). */
  debugGiveEnergy(element: ElementId): void {
    if (this.state.energy.slots.length < 3) this.state.energy.slots.push(element);
  }

  private syncRngState(): void {
    this.state.rngState = this.rngGetState();
  }

  /**
   * Проверить валидность постановки фигуры (для view preview).
   * Спецфигуры ставятся по своей форме; ориентация важна для Прилива.
   */
  canPlacePiece(pieceId: string, target: Vec2, orientation: LineOrientation = 'row'): boolean {
    const piece = getPieceById(this.state.hand, pieceId);
    if (!piece) return false;
    const shape = this.effectiveShape(piece, orientation);
    if (!shape) return false;
    return canPlaceShape(this.state.grid, shape, target);
  }

  /**
   * Поставить фигуру (normal/rainbow/special — единый pipeline).
   * Спецфигура после постановки детонирует: разрушение + след, +1 ⚡ стихии.
   * Запускает полный pipeline: постановка → детонация → snapshot → 4 оси наград
   * → очистка → рука → game over.
   */
  placePiece(pieceId: string, target: Vec2, orientation: LineOrientation = 'row'): PlacementResult {
    const now = this.now();
    const piece = getPieceById(this.state.hand, pieceId);
    if (!piece) return this.failResult('piece_not_found');

    const shape = this.effectiveShape(piece, orientation);
    if (!shape || !canPlaceShape(this.state.grid, shape, target)) {
      return this.failResult('cannot_place');
    }

    // Сохраним множитель ДО любых изменений (для конвертации руки и линий хода)
    const multBefore = this.currentMult();
    const isSpecial = piece.kind === 'special';

    // Шаг 1. Применить постановку к полю
    const placedCells = this.applyPiece(piece, target, orientation);
    removePieceById(this.state.hand, pieceId);

    // Шаг 1.5. Детонация спецфигуры (мутирует поле ДО скана линий —
    // след может замкнуть линии, которые засчитаются в этом же ходе).
    const detonation = isSpecial
      ? detonate(this.state.grid, piece.special!, target, orientation)
      : null;

    // Энергия детонации: +1 ⚡ стихии детонатора (спецфигуры кормят Очищение).
    const detonationEnergy: ElementId[] = detonation ? [detonation.element] : [];

    // Шаг 2. Снимок: найти все линии
    const scan = scanSnapshot(this.state.grid);
    const elementalLines = scan.elementalLines.length;

    // Шаг 3. Очки за линии (множитель ДО нового Fury — линии текущего хода)
    const lineScore = Math.round(scan.lineScore * multBefore);
    this.state.score += lineScore;

    // Шаг 3.5. Очки за детонацию (по затронутым клеткам)
    let detonationScore = 0;
    if (detonation) {
      detonationScore = Math.round(
        (detonation.destroyed.length + detonation.seeded.length + detonation.repainted.length) *
          SCORE_SPECIAL_DETONATION_PER_CELL *
          multBefore,
      );
      this.state.score += detonationScore;
    }

    // Шаг 4. Ось Б — Комбо. За спецфигуру не выдаётся (защита от рекурсии, GDD 3.4):
    // ни спецфигуры, ни бонусных очков.
    const combo = isSpecial ? null : getComboReward(elementalLines, true);
    if (combo) {
      this.state.score += Math.round(combo.bonusScore * multBefore);
    }

    // Шаг 5. Ось В — Энергия + Очищение (детонация даёт энергию первой)
    let cleansing: CleansingReward | null = null;
    const gainedElements = [...detonationEnergy, ...scan.gainedElements];
    if (gainedElements.length > 0) {
      const energyResult = addEnergy(this.state.energy.slots, gainedElements);
      this.state.energy.slots = energyResult.slots;
      cleansing = energyResult.cleansing;
    }

    // Шаг 6. Ось Г — Чистое Очищение + апгрейд спецфигуры.
    // За постановку спецфигуры новая спецфигура не выдаётся даже при чистом
    // Очищении (мы только что использовали спецфигуру) — применяются только
    // множители.
    let comboSpecial: SpecialReward | null = combo?.special ?? null;
    let pure = false;
    if (cleansing) {
      const pureResult = applyPureCleansing(cleansing, comboSpecial);
      if (pureResult.applied) {
        cleansing = pureResult.cleansing;
        comboSpecial = isSpecial ? null : pureResult.special;
        pure = true;
      }
    }

    // Шаг 7. Применить Очищение: очки/звёзды (множитель ДО нового Fury)
    let starsGained = 0;
    let rainbowAdded = 0;
    let furyStarted = null;
    let overflowConversionScore = 0;

    if (cleansing) {
      const cleansingScore = Math.round(cleansing.baseScore * multBefore);
      this.state.score += cleansingScore;
      starsGained += cleansing.stars;
      this.state.stars += cleansing.stars;
    }

    // Шаг 8. Выдать комбо-спецфигуру ПЕРЕД радужными (до Fury).
    // Спецфигура — редкая тактическая награда за комбо: она должна занять
    // бонусный слот раньше радужных. Иначе при комбо+Очищении радужные
    // забивают все 3 бонусных слота, и спецфигура молча конвертируется в очки.
    let specialAdded: SpecialReward | null = null;
    if (comboSpecial && comboSpecial.count > 0) {
      overflowConversionScore += addSpecialPieces(
        this.state.hand,
        comboSpecial.type,
        comboSpecial.count,
        multBefore,
      );
      specialAdded = comboSpecial;
    }

    // Шаг 9. Выдать радужные (после спецфигуры, до Fury — конвертация по multBefore).
    if (cleansing) {
      overflowConversionScore += addRainbowPieces(
        this.state.hand,
        cleansing.rainbowCount,
        multBefore,
      );
      rainbowAdded = cleansing.rainbowCount;
    }

    this.state.score += overflowConversionScore;

    // Шаг 9. Запустить Fury (после всех конвертаций руки)
    if (cleansing) {
      furyStarted = startFury(cleansing.furySec, cleansing.furyMult, cleansing.element, now);
      this.state.fury = furyStarted;
    }

    // Обновим best
    if (this.state.score > this.state.best) this.state.best = this.state.score;

    // Шаг 10. Очистка снимка
    applyClear(this.state.grid, scan.cellsToClear);

    // Шаг 10.5. Статистика забега (DES-13)
    const st = this.state.runStats;
    st.lines += scan.lines.length;
    st.elemental += elementalLines;
    st.cleansings += cleansing ? 1 : 0;
    if (combo) st.maxCombo = Math.max(st.maxCombo, combo.lines);
    if (isSpecial) st.specialsUsed += 1;

    // Шаг 11. Refill обычных
    const refilled = this.refillNormal();
    this.syncRngState();

    // Шаг 12. Game Over
    const gameOver = !hasAnyMove(this.state);

    return {
      ok: true,
      placedCells,
      clearedLines: scan.lines,
      elementalLines,
      lineScore,
      combo,
      cleansing,
      pure,
      detonation,
      scoreGained:
        lineScore +
        detonationScore +
        (combo && !isSpecial ? Math.round(combo.bonusScore * multBefore) : 0) +
        (cleansing ? Math.round(cleansing.baseScore * multBefore) : 0) +
        overflowConversionScore,
      starsGained,
      rainbowAdded,
      specialAdded,
      furyStarted,
      handRefilled: refilled,
      gameOver,
    };
  }

  /** Есть ли хоть один ход (false → Game Over). */
  hasAnyMove(): boolean {
    return hasAnyMove(this.state);
  }

  /**
   * Симуляция постановки БЕЗ изменения боевого состояния (DES-4, DESIGN §7/§23).
   *
   * Прогоняет полный pipeline placePiece на клоне состояния и возвращает тот же
   * PlacementResult. View строит по нему предиктивные подсветки: ghost-награды
   * (+очки, +1⚡), бейдж «Комбо ×N» до хода, зоны спецфигур.
   *
   * RNG-последовательность боя не затрагивается: спавн refill-а происходит
   * в клоне и на боевую руку не влияет. Недостаточно данных (нет фигуры/
   * некуда ставить) — failResult, как у placePiece.
   */
  previewPlacement(
    pieceId: string,
    target: Vec2,
    orientation: LineOrientation = 'row',
  ): PlacementResult {
    if (!this.canPlacePiece(pieceId, target, orientation)) {
      return this.failResult('cannot_place');
    }
    const sim = GameEngine.forSimulation(structuredClone(this.state));
    return sim.placePiece(pieceId, target, orientation);
  }

  /** Движок-двойник над готовым состоянием (только для симуляций, вне боевого цикла). */
  private static forSimulation(state: GameState): GameEngine {
    const sim = Object.create(GameEngine.prototype) as GameEngine;
    const rng = createRng(state.rngState);
    sim.rngNext = rng.next;
    sim.rngGetState = rng.getState;
    sim.state = state;
    sim.debugSpawnElement = null;
    return sim;
  }

  /** Тик Fury (вызывать периодически view'ом, напр. раз в 200мс). */
  tickFury(): void {
    this.state.fury = tickFury(this.state.fury, this.now());
  }

  // ─── Внутренние ────────────────────────────────────────────────────────

  /** Форма фигуры с учётом ориентации Прилива. null для неизвестной фигуры. */
  private effectiveShape(piece: Piece, orientation: LineOrientation): Vec2[] | null {
    if (piece.kind === 'special') {
      if (!piece.special) return null;
      return specialShape(piece.special, orientation);
    }
    return piece.kind === 'rainbow' ? [{ x: 0, y: 0 }] : piece.shape;
  }

  private applyPiece(piece: Piece, target: Vec2, orientation: LineOrientation): Vec2[] {
    const cells =
      piece.kind === 'special'
        ? getShapeCells(specialShape(piece.special!, orientation), target)
        : getShapeCells(piece.shape, target);
    for (const c of cells) {
      const element: ElementId | -1 =
        piece.kind === 'special'
          ? SPECIAL_ELEMENT[piece.special!]
          : piece.kind === 'rainbow'
            ? -1
            : (piece.element ?? 0);
      const multi = piece.kind === 'rainbow';
      setCell(this.state.grid, c.x, c.y, { element, multi, special: false });
    }
    return cells;
  }

  private failResult(reason: string): PlacementResult {
    return {
      ok: false,
      reason,
      placedCells: [],
      clearedLines: [],
      elementalLines: 0,
      lineScore: 0,
      combo: null,
      cleansing: null,
      pure: false,
      detonation: null,
      scoreGained: 0,
      starsGained: 0,
      rainbowAdded: 0,
      specialAdded: null,
      furyStarted: null,
      handRefilled: false,
      gameOver: false,
    };
  }
}
