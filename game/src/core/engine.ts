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
 * Два публичных метода: placePiece (обычная/rainbow), useSpecial (спецфигура).
 * Возвращает PlacementResult для view (анимации/FX).
 */
import { SCORE_SPECIAL_FILL_PER_CELL } from '../config/balance';
import { createGrid, setCell } from './grid';
import { canPlaceShape, getShapeCells, spawnNormalBatch } from './shapes';
import { scanSnapshot, applyClear } from './snapshot';
import { addEnergy } from './energy';
import { getComboReward } from './combo';
import { applyPureCleansing } from './pure';
import { getSpecialRegion, fillSpecialCells, canUseSpecial } from './specials';
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
    return batch[0]!;
  }

  private syncRngState(): void {
    this.state.rngState = this.rngGetState();
  }

  /**
   * Проверить валидность постановки фигуры (для view preview).
   */
  canPlacePiece(pieceId: string, target: Vec2): boolean {
    const piece = getPieceById(this.state.hand, pieceId);
    if (!piece) return false;
    if (piece.kind === 'special') return false; // спецфигуры через useSpecial
    return canPlaceShape(this.state.grid, piece.shape, target);
  }

  /**
   * Поставить обычную или радужную фигуру.
   * Запускает полный pipeline: постановка → snapshot → 4 оси наград → очистка → рука → game over.
   */
  placePiece(pieceId: string, target: Vec2): PlacementResult {
    const now = this.now();
    const piece = getPieceById(this.state.hand, pieceId);
    if (!piece || piece.kind === 'special') {
      return this.failResult('piece_not_found_or_special');
    }
    if (!canPlaceShape(this.state.grid, piece.shape, target)) {
      return this.failResult('cannot_place');
    }

    // Сохраним множитель ДО любых изменений (для конвертации руки и линий хода)
    const multBefore = this.currentMult();

    // Шаг 1. Применить постановку к полю
    const placedCells = this.applyPiece(piece, target);
    removePieceById(this.state.hand, pieceId);

    // Шаг 2. Снимок: найти все линии
    const scan = scanSnapshot(this.state.grid);
    const elementalLines = scan.elementalLines.length;

    // Шаг 3. Очки за линии (множитель ДО нового Fury — линии текущего хода)
    const lineScore = Math.round(scan.lineScore * multBefore);
    this.state.score += lineScore;

    // Шаг 4. Ось Б — Комбо (только для normal/rainbow; source тут всегда не special)
    const combo = getComboReward(elementalLines, true);
    if (combo) {
      this.state.score += Math.round(combo.bonusScore * multBefore);
    }

    // Шаг 5. Ось В — Энергия + Очищение
    let cleansing: CleansingReward | null = null;
    if (scan.gainedElements.length > 0) {
      const energyResult = addEnergy(this.state.energy.slots, scan.gainedElements);
      this.state.energy.slots = energyResult.slots;
      cleansing = energyResult.cleansing;
    }

    // Шаг 6. Ось Г — Чистое Очищение + апгрейд спецфигуры
    let comboSpecial: SpecialReward | null = combo?.special ?? null;
    let pure = false;
    if (cleansing) {
      const pureResult = applyPureCleansing(cleansing, comboSpecial);
      if (pureResult.applied) {
        cleansing = pureResult.cleansing;
        comboSpecial = pureResult.special;
        pure = true;
      }
    }

    // Шаг 7. Применить Очищение: очки/звёзды/радужные (множитель ДО нового Fury)
    let starsGained = 0;
    let rainbowAdded = 0;
    let furyStarted = null;
    let overflowConversionScore = 0;

    if (cleansing) {
      const cleansingScore = Math.round(cleansing.baseScore * multBefore);
      this.state.score += cleansingScore;
      starsGained += cleansing.stars;
      this.state.stars += cleansing.stars;

      // Радужные ДО Fury (конвертация по multBefore)
      overflowConversionScore += addRainbowPieces(
        this.state.hand,
        cleansing.rainbowCount,
        multBefore,
      );
      rainbowAdded = cleansing.rainbowCount;
    }

    // Шаг 8. Выдать комбо-спецфигуру (после возможного апгрейда Чистым, ДО Fury)
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
      specialFill: null,
      scoreGained:
        lineScore +
        (combo ? Math.round(combo.bonusScore * multBefore) : 0) +
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

  /**
   * Использовать спецфигуру (wildcard-fill).
   * НЕ даёт комбо-спецфигур (защита от рекурсии, GDD 3.4).
   * После заливки проверяет линии как обычная постановка.
   */
  useSpecial(pieceId: string, target: Vec2, orientation: LineOrientation = 'row'): PlacementResult {
    const now = this.now();
    const piece = getPieceById(this.state.hand, pieceId);
    if (!piece || piece.kind !== 'special' || !piece.special) {
      return this.failResult('piece_not_special');
    }

    const region = getSpecialRegion(piece.special, target, orientation);
    if (!canUseSpecial(this.state.grid, region)) {
      return this.failResult('no_empty_cells');
    }

    const multBefore = this.currentMult();

    // Шаг 1. Wildcard-fill
    const fillResult = fillSpecialCells(this.state.grid, region);
    const fillScore = Math.round(fillResult.filled * SCORE_SPECIAL_FILL_PER_CELL * multBefore);
    this.state.score += fillScore;
    removePieceById(this.state.hand, pieceId);

    // Шаг 2. Снимок линий после заливки
    const scan = scanSnapshot(this.state.grid);
    const elementalLines = scan.elementalLines.length;
    const lineScore = Math.round(scan.lineScore * multBefore);
    this.state.score += lineScore;

    // Шаг 3. Комбо НЕ выдаётся (защита от рекурсии). Но bonusScore тоже не начисляем
    // (комбо — это отдельная ось, источник спецфигур; тут источник — спецфигура).
    // Однако энергия и Очищение срабатывают.
    let cleansing: CleansingReward | null = null;
    if (scan.gainedElements.length > 0) {
      const energyResult = addEnergy(this.state.energy.slots, scan.gainedElements);
      this.state.energy.slots = energyResult.slots;
      cleansing = energyResult.cleansing;
    }

    // Чистое Очищение — но БЕЗ апгрейда спецфигуры (мы только что спецфигуру использовали,
    // новая не выдаётся). Применяем только множители к cleansing.
    let pure = false;
    if (cleansing && cleansing.isPure) {
      // Применяем ×2/×1.5/+1star через applyPureToCleansing логику (без апгрейда special)
      const pureResult = applyPureCleansing(cleansing, null);
      if (pureResult.applied) {
        cleansing = pureResult.cleansing;
        pure = true;
      }
    }

    let starsGained = 0;
    let rainbowAdded = 0;
    let furyStarted = null;
    let overflowConversionScore = 0;

    if (cleansing) {
      const cleansingScore = Math.round(cleansing.baseScore * multBefore);
      this.state.score += cleansingScore;
      starsGained += cleansing.stars;
      this.state.stars += cleansing.stars;
      overflowConversionScore += addRainbowPieces(
        this.state.hand,
        cleansing.rainbowCount,
        multBefore,
      );
      rainbowAdded = cleansing.rainbowCount;
    }

    if (this.state.score > this.state.best) this.state.best = this.state.score;

    // Fury (после конвертаций)
    if (cleansing) {
      furyStarted = startFury(cleansing.furySec, cleansing.furyMult, cleansing.element, now);
      this.state.fury = furyStarted;
    }

    // Очистка
    applyClear(this.state.grid, scan.cellsToClear);

    // Refill
    const refilled = this.refillNormal();
    this.syncRngState();

    const gameOver = !hasAnyMove(this.state);

    return {
      ok: true,
      placedCells: fillResult.cells,
      clearedLines: scan.lines,
      elementalLines,
      lineScore,
      combo: null, // спецфигура не даёт комбо
      cleansing,
      pure,
      specialFill: {
        type: piece.special,
        filledCells: fillResult.filled,
        cells: fillResult.cells,
      },
      scoreGained:
        fillScore +
        lineScore +
        (cleansing ? Math.round(cleansing.baseScore * multBefore) : 0) +
        overflowConversionScore,
      starsGained,
      rainbowAdded,
      specialAdded: null, // рекурсия запрещена
      furyStarted,
      handRefilled: refilled,
      gameOver,
    };
  }

  /** Есть ли хоть один ход (false → Game Over). */
  hasAnyMove(): boolean {
    return hasAnyMove(this.state);
  }

  /** Тик Fury (вызывать периодически view'ом, напр. раз в 200мс). */
  tickFury(): void {
    this.state.fury = tickFury(this.state.fury, this.now());
  }

  // ─── Внутренние ────────────────────────────────────────────────────────

  private applyPiece(piece: Piece, target: Vec2): Vec2[] {
    const cells = getShapeCells(piece.shape, target);
    for (const c of cells) {
      const element: ElementId | -1 = piece.kind === 'rainbow' ? -1 : (piece.element ?? 0);
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
      specialFill: null,
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
