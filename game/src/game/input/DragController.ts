/**
 * DragController — перетаскивание обычной и радужной фигуры (T-034/T-035).
 *
 * GDD §14: кастомный контроллер со смещением фигуры вверх от пальца (чтобы
 * палец не закрывал цель), preview валидности, обработкой pointercancel.
 *
 * Маршрутизация ввода: GameScene решает, кому отдать pointerdown (drag или
 * SpecialInputController). Этот контроллер сам подписывается только на
 * pointermove/up/cancel — они активны лишь во время drag'а. Старт drag'а
 * инициирует GameScene через tryStartDrag().
 *
 * Поток:
 *   tryStartDrag(pointer) → создаём drag-копию, original диммим.
 *   pointermove → двигаем копию (со смещением вверх), считаем target-клетку,
 *     показываем preview через engine.canPlacePiece.
 *   pointerup → если валидно — engine.placePiece, иначе возврат. Очистка.
 *   pointercancel → отмена, возврат.
 *
 * Спецфигуры идут через SpecialInputController, тут только normal/rainbow.
 */
import type Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import type { Piece, PlacementResult } from '../../core/types';
import { getShapeCells } from '../../core/shapes';
import { BOARD_BOTTOM, BOARD_TOP, BOARD_X, CELL_SIZE } from '../layout';
import { HAND_PIECE_CELL } from '../layout';
import type { BoardView } from '../objects/BoardView';
import type { HandView } from '../objects/HandView';
import { PieceView } from '../objects/PieceView';

/** Смещение drag-копии вверх от пальца (px), чтобы палец не закрывал цель. */
const DRAG_OFFSET_Y = -140;

/** Минимальное смещение (px), после которого жест считается drag, а не тапом. */
const DRAG_THRESHOLD = 8;

export interface DragControllerDeps {
  scene: Phaser.Scene;
  engine: GameEngine;
  boardView: BoardView;
  handView: HandView;
  /** Колбэк после успешного хода. Передаёт результат из engine для FX/UI. */
  onPlaced: (result: PlacementResult, piece: Piece) => void;
}

export class DragController {
  private readonly deps: DragControllerDeps;
  private dragCopy: PieceView | null = null;
  private draggingPiece: Piece | null = null;
  private originSlotIndex = -1;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private isDragging = false;

  constructor(deps: DragControllerDeps) {
    this.deps = deps;
    // move/up/cancel — активны только во время drag'а, но подписка глобальная;
    // обработчики сами проверяют состояние.
    const { scene } = deps;
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.handleMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.handleUp(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.handleUp(p));
    scene.input.on('gameout', () => this.cancel());
    scene.input.on('pointercancel', () => this.cancel());
  }

  /**
   * Попробовать стартовать drag обычной/rainbow фигурой под курсором.
   * Возвращает true, если фигура найдена и она не special (drag начат).
   * Вызывается GameScene как обработчик pointerdown.
   */
  tryStartDrag(pointer: Phaser.Input.Pointer): boolean {
    if (this.isDragging) return false;
    const { handView } = this.deps;
    const view = handView.getPieceViews().find((v) => this.hitTest(pointer, v));
    if (!view) return false;
    const piece = this.findPieceInHand(view.pieceId);
    if (!piece || piece.kind === 'special') return false; // спецфигуры — SpecialInputController

    this.draggingPiece = piece;
    this.originSlotIndex = this.findSlotIndex(piece.id);
    this.pointerStartX = pointer.x;
    this.pointerStartY = pointer.y;
    this.isDragging = false;
    this.dragCopy = this.createDragCopy(piece, pointer);
    view.setDimmed(true);
    return true;
  }

  /** Идёт ли сейчас drag. */
  get isDragInProgress(): boolean {
    return this.draggingPiece !== null;
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingPiece || !this.dragCopy) return;

    // Порог — отличить тап от drag.
    if (!this.isDragging) {
      const dx = pointer.x - this.pointerStartX;
      const dy = pointer.y - this.pointerStartY;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
    }

    this.dragCopy.setPosition(pointer.x, pointer.y + DRAG_OFFSET_Y);

    const target = this.computeTarget(this.draggingPiece, pointer.x, pointer.y + DRAG_OFFSET_Y);
    if (target) {
      const cells = getShapeCells(this.draggingPiece.shape, target);
      const ok = this.deps.engine.canPlacePiece(this.draggingPiece.id, target);
      this.deps.boardView.showPreview(cells, ok);
    } else {
      this.deps.boardView.clearPreview();
    }
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingPiece || !this.dragCopy) {
      this.cleanup();
      return;
    }

    // Если не перешли порог — считаем тапом, отменяем.
    if (!this.isDragging) {
      this.cancel();
      return;
    }

    const piece = this.draggingPiece;
    const target = this.computeTarget(piece, pointer.x, pointer.y + DRAG_OFFSET_Y);
    let placed = false;
    if (target && this.deps.engine.canPlacePiece(piece.id, target)) {
      const result = this.deps.engine.placePiece(piece.id, target);
      placed = result.ok;
      if (placed) {
        this.deps.onPlaced(result, piece);
      }
    }

    if (!placed) {
      this.animateReturn();
    }
    this.cleanup();
  }

  /** Отмена drag (pointercancel, gameout, внешний сброс). */
  cancel(): void {
    if (this.dragCopy) this.animateReturn();
    this.cleanup();
  }

  // ─── Внутренние ───────────────────────────────────────────────────────────

  private cleanup(): void {
    this.deps.boardView.clearPreview();
    if (this.dragCopy) {
      this.dragCopy.destroy();
      this.dragCopy = null;
    }
    for (const v of this.deps.handView.getPieceViews()) v.setDimmed(false);
    this.draggingPiece = null;
    this.originSlotIndex = -1;
    this.isDragging = false;
  }

  private animateReturn(): void {
    if (!this.dragCopy || this.originSlotIndex < 0) return;
    const pos = this.deps.handView.getSlotPosition(this.originSlotIndex);
    this.deps.scene.tweens.add({
      targets: this.dragCopy,
      x: pos.x,
      y: pos.y,
      duration: 180,
      ease: 'Quad.Out',
    });
  }

  private createDragCopy(piece: Piece, pointer: Phaser.Input.Pointer): PieceView {
    const { scene } = this.deps;
    const copy = new PieceView(scene, piece, HAND_PIECE_CELL * (piece.shape.length > 0 ? 5 : 1));
    copy.setPosition(pointer.x, pointer.y + DRAG_OFFSET_Y);
    copy.setScale(1.1); // чуть крупнее при drag
    copy.setDepth(1000);
    return copy;
  }

  /**
   * Опорная клетка поля (target для engine) из позиции центра фигуры.
   * target = верхний-левый угол bounding box фигуры на сетке.
   */
  private computeTarget(
    piece: Piece,
    centerX: number,
    centerY: number,
  ): { x: number; y: number } | null {
    const cells = piece.shape;
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    const maxX = Math.max(...cells.map((c) => c.x));
    const maxY = Math.max(...cells.map((c) => c.y));

    const widthPx = (maxX - minX + 1) * HAND_PIECE_CELL * 1.1;
    const heightPx = (maxY - minY + 1) * HAND_PIECE_CELL * 1.1;

    const leftX = centerX - widthPx / 2;
    const topY = centerY - heightPx / 2;

    const gx = Math.round((leftX - BOARD_X - CELL_SIZE / 2) / CELL_SIZE);
    const gy = Math.round((topY - BOARD_TOP - CELL_SIZE / 2) / CELL_SIZE);

    if (centerY < BOARD_TOP - CELL_SIZE || centerY > BOARD_BOTTOM + CELL_SIZE) return null;
    return { x: gx, y: gy };
  }

  private hitTest(pointer: Phaser.Input.Pointer, view: PieceView): boolean {
    const half = view.slotSize / 2;
    return (
      pointer.x >= view.x - half &&
      pointer.x <= view.x + half &&
      pointer.y >= view.y - half &&
      pointer.y <= view.y + half
    );
  }

  private findPieceInHand(pieceId: string): Piece | null {
    const hand = this.deps.engine.state.hand;
    return hand.find((p) => p?.id === pieceId) ?? null;
  }

  private findSlotIndex(pieceId: string): number {
    return this.deps.engine.state.hand.findIndex((p) => p?.id === pieceId);
  }
}
