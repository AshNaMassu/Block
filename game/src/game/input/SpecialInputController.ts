/**
 * SpecialInputController — использование спецфигур (T-036, GDD-2 v1.3 секция 3.3).
 *
 * Поток (тап-ориентированный, без drag):
 *   1. Игрок тапает спецфигуру в руке → она выбрана.
 *   2. Показываем overlay региона и панель: для Line — кнопка ориентации
 *      (ряд/столбец), для всех — «ПРИМЕНИТЬ» / «ОТМЕНА».
 *   3. Тап по полю → обновляем target-клетку, overlay следует.
 *   4. «ПРИМЕНИТЬ» → engine.useSpecial(id, target, orientation). Если в регионе
 *      нет пустых клеток — кнопка применения выключена.
 *   5. «ОТМЕНА» / повторный тап по выбранной фигуре → сброс.
 *
 * Регионы (core/specials):
 *   bomb        — 2×2 (target = upper-left, clamp)
 *   line        — ряд или столбец (orientation)
 *   cross       — ряд + столбец через target
 *   apocalypse  — 2 ряда + 2 столбца (target = upper-left, clamp)
 *
 * Спецфигуры НЕ дают комбо (защита от рекурсии) — это в engine.
 */
import type Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import type { LineOrientation, Piece, PlacementResult } from '../../core/types';
import { getSpecialRegion, getEmptyCellsInRegion } from '../../core/specials';
import { isInside } from '../../core/grid';
import {
  BOARD_BOTTOM,
  BOARD_TOP,
  BOARD_X,
  CELL_SIZE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
} from '../layout';
import type { BoardView } from '../objects/BoardView';
import type { HandView } from '../objects/HandView';
import { Button } from '../ui/Button';
import { COLOR_TEXT } from '../../config/elements';

export interface SpecialInputDeps {
  scene: Phaser.Scene;
  engine: GameEngine;
  boardView: BoardView;
  handView: HandView;
  /** Колбэк после успешного хода. Передаёт результат из engine для FX/UI. */
  onUsed: (result: PlacementResult) => void;
}

export class SpecialInputController {
  private readonly deps: SpecialInputDeps;
  private selectedPiece: Piece | null = null;
  private target = { x: 3, y: 3 };
  private orientation: LineOrientation = 'row';

  private panel: Phaser.GameObjects.Container | null = null;
  private applyBtn: Button | null = null;
  private orientBtn: Button | null = null;
  private cancelBtn: Button | null = null;
  private hint: Phaser.GameObjects.Text | null = null;

  constructor(deps: SpecialInputDeps) {
    this.deps = deps;
  }

  /** Активен ли режим выбора спецфигуры. */
  isActive(): boolean {
    return this.selectedPiece !== null;
  }

  /**
   * Тап по фигуре в руке. Возвращает true, если это спецфигура и контроллер
   * обработал её (выбрал или снял выбор).
   */
  handlePieceTap(pieceId: string): boolean {
    const piece = this.deps.engine.state.hand.find((p) => p?.id === pieceId) ?? null;
    if (!piece || piece.kind !== 'special') return false;

    // Повторный тап по выбранной → отмена.
    if (this.selectedPiece?.id === pieceId) {
      this.cancel();
      return true;
    }

    this.selectedPiece = piece;
    this.orientation = piece.orientation ?? 'row';
    // Стартовый target — центр поля.
    this.target = { x: 3, y: 3 };
    this.openPanel();
    this.updateOverlay();
    return true;
  }

  /**
   * Тап по полю (экранные координаты). Если спецфигура выбрана — обновляем target.
   * Возвращает true, если событие поглощено.
   */
  handleBoardTap(pointerX: number, pointerY: number): boolean {
    if (!this.selectedPiece) return false;
    const cell = this.pointToCell(pointerX, pointerY);
    if (!cell) return false;
    this.target = cell;
    this.updateOverlay();
    return true;
  }

  /** Отменить выбор. */
  cancel(): void {
    this.selectedPiece = null;
    this.deps.boardView.clearPreview();
    this.closePanel();
  }

  // ─── Внутренние ───────────────────────────────────────────────────────────

  private openPanel(): void {
    this.closePanel();
    const { scene } = this.deps;
    const panel = scene.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 120).setDepth(500);
    this.panel = panel;

    const isLine = this.selectedPiece?.special === 'line';

    // Подсказка.
    this.hint = scene.add
      .text(0, -120, isLine ? 'Выберите ряд/столбец' : 'Выберите цель', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '32px',
        color: this.hex(COLOR_TEXT),
      })
      .setOrigin(0.5);
    panel.add(this.hint);

    if (isLine) {
      this.orientBtn = new Button(
        scene,
        -260,
        -40,
        this.orientationLabel(),
        () => this.cycleOrientation(),
        { width: 360, height: 90, fontSize: 34 },
      );
      panel.add(this.orientBtn);
    }

    this.applyBtn = new Button(scene, 80, -40, 'ПРИМЕНИТЬ', () => this.apply(), {
      width: 320,
      height: 90,
      fontSize: 34,
    });
    panel.add(this.applyBtn);

    this.cancelBtn = new Button(scene, 380, -40, 'ОТМЕНА', () => this.cancel(), {
      width: 220,
      height: 90,
      fontSize: 32,
      fillColor: 0x4a2a2a,
    });
    panel.add(this.cancelBtn);
  }

  private closePanel(): void {
    // panel.destroy() убивает всех детей (кнопки/текст), т.к. они добавлены в контейнер.
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    this.applyBtn = null;
    this.orientBtn = null;
    this.cancelBtn = null;
    this.hint = null;
  }

  private updateOverlay(): void {
    if (!this.selectedPiece) return;
    const region = getSpecialRegion(this.selectedPiece.special!, this.target, this.orientation);
    const empty = getEmptyCellsInRegion(this.deps.engine.state.grid, region);
    this.deps.boardView.showSpecialRegion(region, empty);
    this.applyBtn?.setEnabled(empty.length > 0);
  }

  private apply(): void {
    if (!this.selectedPiece) return;
    const piece = this.selectedPiece;
    const region = getSpecialRegion(piece.special!, this.target, this.orientation);
    const empty = getEmptyCellsInRegion(this.deps.engine.state.grid, region);
    if (empty.length === 0) return;

    const result = this.deps.engine.useSpecial(piece.id, this.target, this.orientation);
    this.cancel();
    if (result.ok) this.deps.onUsed(result);
  }

  private cycleOrientation(): void {
    this.orientation = this.orientation === 'row' ? 'column' : 'row';
    this.orientBtn?.setText(this.orientationLabel());
    this.updateOverlay();
  }

  private orientationLabel(): string {
    return this.orientation === 'row' ? '↔ РЯД' : '↕ СТОЛБЕЦ';
  }

  private pointToCell(px: number, py: number): { x: number; y: number } | null {
    if (py < BOARD_TOP || py > BOARD_BOTTOM) return null;
    const x = Math.floor((px - BOARD_X) / CELL_SIZE);
    const y = Math.floor((py - BOARD_TOP) / CELL_SIZE);
    if (!isInside(x, y)) return null;
    return { x, y };
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
