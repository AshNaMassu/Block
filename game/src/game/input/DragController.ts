/**
 * DragController — единый drag & drop для всех фигур (T-034/T-035 + спецфигуры).
 *
 * Обычные/радужные: перетаскивание с preview формы (engine.canPlacePiece),
 * применение по drop через engine.placePiece.
 *
 * Спецфигуры (ранее тап-флоу SpecialInputController): теперь тоже drag.
 * Во время перетаскивания регион проецируется на поле (showSpecialRegion) и следует
 * за пальцем; применение по drop через engine.useSpecial, если в регионе ≥1 пустая
 * клетка. Ориентация Line читается из «хвоста» движения над полем (вариант A):
 * горизонтальный мазок → ряд, вертикальный → столбец. Движение переноса (вне поля)
 * на ориентацию не влияет.
 *
 * GDD §14: смещение фигуры вверх от пальца, preview, pointercancel.
 * Отход от GDD §B.9.2 (тап спецфигур → drag) зафиксирован как дизайн-решение.
 */
import type Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import type { LineOrientation, Piece, PlacementResult } from '../../core/types';
import { getShapeCells } from '../../core/shapes';
import { getSpecialRegion, getEmptyCellsInRegion } from '../../core/specials';
import { isInside } from '../../core/grid';
import { BOARD_BOTTOM, BOARD_TOP, BOARD_X, CELL_SIZE, HAND_PIECE_CELL } from '../layout';
import type { BoardView } from '../objects/BoardView';
import type { HandView } from '../objects/HandView';
import { PieceView } from '../objects/PieceView';

/** Смещение drag-копии вверх от пальца (px), чтобы палец не закрывал цель. */
const DRAG_OFFSET_Y = -140;

/** Минимальное смещение (px), после которого жест считается drag, а не тапом. */
const DRAG_THRESHOLD = 8;

/** Длина «хвоста» движения (px) для определения ориентации Line. */
const TRAIL_LENGTH = 50;

/** Гистерезис: ось должна доминировать в это число раз, чтобы переключить ориентацию. */
const ORIENTATION_HYSTERESIS = 1.4;

export interface DragControllerDeps {
  scene: Phaser.Scene;
  engine: GameEngine;
  boardView: BoardView;
  handView: HandView;
  /** Колбэк после успешной постановки обычной/радужной фигуры. */
  onPlaced: (result: PlacementResult, piece: Piece) => void;
  /** Колбэк после успешного использования спецфигуры. */
  onUsed: (result: PlacementResult, piece: Piece) => void;
}

export class DragController {
  private readonly deps: DragControllerDeps;
  private dragCopy: PieceView | null = null;
  private draggingPiece: Piece | null = null;
  private originSlotIndex = -1;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private isDragging = false;

  // Спецфигуры: ориентация Line + «хвост» недавнего движения.
  private orientation: LineOrientation = 'row';
  private trail: { x: number; y: number }[] = [];

  constructor(deps: DragControllerDeps) {
    this.deps = deps;
    const { scene } = deps;
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.handleMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.handleUp(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.handleUp(p));
    scene.input.on('gameout', () => this.cancel());
    scene.input.on('pointercancel', () => this.cancel());
  }

  /**
   * Стартовать drag фигурой под курсором (любой: normal/rainbow/special).
   * Возвращает true, если фигура найдена и drag начат.
   */
  tryStartDrag(pointer: Phaser.Input.Pointer): boolean {
    if (this.isDragInProgress) return false;
    const { handView } = this.deps;
    const view = handView.getPieceViews().find((v) => this.hitTest(pointer, v));
    if (!view) return false;
    const piece = this.findPieceInHand(view.pieceId);
    if (!piece) return false;

    this.draggingPiece = piece;
    this.originSlotIndex = this.findSlotIndex(piece.id);
    this.pointerStartX = pointer.x;
    this.pointerStartY = pointer.y;
    this.isDragging = false;
    this.orientation = piece.orientation ?? 'row';
    this.trail = [];
    this.dragCopy = this.createDragCopy(piece, pointer);
    view.setDimmed(true);
    return true;
  }

  /** Идёт ли сейчас drag. */
  get isDragInProgress(): boolean {
    return this.draggingPiece !== null;
  }

  /** Отмена drag (pointercancel, gameout, внешний сброс). */
  cancel(): void {
    if (this.dragCopy) this.animateReturn();
    this.cleanup();
  }

  // ─── Обработчики ────────────────────────────────────────────────────────

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingPiece || !this.dragCopy) return;

    // Порог — отличить тап от drag.
    if (!this.isDragging) {
      const dx = pointer.x - this.pointerStartX;
      const dy = pointer.y - this.pointerStartY;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
    }

    const copyX = pointer.x;
    const copyY = pointer.y + DRAG_OFFSET_Y;
    this.dragCopy.setPosition(copyX, copyY);

    if (this.draggingPiece.kind === 'special') {
      this.updateSpecialPreview(pointer, copyX, copyY);
    } else {
      this.updateNormalPreview(copyX, copyY);
    }
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingPiece || !this.dragCopy) {
      this.cleanup();
      return;
    }

    // Не перешли порог — считаем тапом, отменяем.
    if (!this.isDragging) {
      this.cancel();
      return;
    }

    const piece = this.draggingPiece;
    const copyX = pointer.x;
    const copyY = pointer.y + DRAG_OFFSET_Y;
    const placed =
      piece.kind === 'special'
        ? this.tryUseSpecial(piece, copyX, copyY)
        : this.tryPlaceNormal(piece, copyX, copyY);

    if (!placed) this.animateReturn();
    this.cleanup();
  }

  // ─── Обычные/радужные фигуры ────────────────────────────────────────────

  private updateNormalPreview(copyX: number, copyY: number): void {
    const piece = this.draggingPiece!;
    const target = this.computeShapeTarget(piece, copyX, copyY);
    if (target) {
      const cells = getShapeCells(piece.shape, target);
      const ok = this.deps.engine.canPlacePiece(piece.id, target);
      this.deps.boardView.showPreview(cells, ok);
    } else {
      this.deps.boardView.clearPreview();
    }
  }

  private tryPlaceNormal(piece: Piece, copyX: number, copyY: number): boolean {
    const target = this.computeShapeTarget(piece, copyX, copyY);
    if (!target || !this.deps.engine.canPlacePiece(piece.id, target)) return false;
    const result = this.deps.engine.placePiece(piece.id, target);
    if (result.ok) this.deps.onPlaced(result, piece);
    return result.ok;
  }

  // ─── Спецфигуры ─────────────────────────────────────────────────────────

  private updateSpecialPreview(pointer: Phaser.Input.Pointer, copyX: number, copyY: number): void {
    const piece = this.draggingPiece!;

    // Ориентация Line — по «хвосту» движения, только пока копия над полем.
    // Вне поля (перенос) хвост сбрасывается, чтобы жест переноса не влиял.
    if (piece.special === 'line') {
      if (this.isOverBoard(copyY)) {
        this.updateTrail(pointer.x, pointer.y);
        this.updateOrientationFromTrail();
      } else {
        this.trail = [];
      }
    }

    const target = this.pointToCell(copyX, copyY);
    if (!target) {
      this.deps.boardView.clearPreview();
      return;
    }
    const region = getSpecialRegion(piece.special!, target, this.orientation);
    const empty = getEmptyCellsInRegion(this.deps.engine.state.grid, region);
    this.deps.boardView.showSpecialRegion(region, empty);
  }

  private tryUseSpecial(piece: Piece, copyX: number, copyY: number): boolean {
    const target = this.pointToCell(copyX, copyY);
    if (!target) return false;
    const region = getSpecialRegion(piece.special!, target, this.orientation);
    const empty = getEmptyCellsInRegion(this.deps.engine.state.grid, region);
    if (empty.length === 0) return false;

    const result = this.deps.engine.useSpecial(piece.id, target, this.orientation);
    if (result.ok) this.deps.onUsed(result, piece);
    return result.ok;
  }

  /** Ориентация Line по направлению «хвоста»: горизонталь → ряд, вертикаль → столбец. */
  private updateOrientationFromTrail(): void {
    if (this.trail.length < 2) return;
    const first = this.trail[0]!;
    const last = this.trail[this.trail.length - 1]!;
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);
    if (dx > dy * ORIENTATION_HYSTERESIS) this.orientation = 'row';
    else if (dy > dx * ORIENTATION_HYSTERESIS) this.orientation = 'column';
  }

  /** Добавить точку в «хвост» и обрезать его до TRAIL_LENGTH px пути. */
  private updateTrail(x: number, y: number): void {
    this.trail.push({ x, y });
    let total = 0;
    let cut = 0;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i]!;
      const b = this.trail[i - 1]!;
      total += Math.hypot(a.x - b.x, a.y - b.y);
      if (total > TRAIL_LENGTH) {
        cut = i;
        break;
      }
    }
    if (cut > 0) this.trail = this.trail.slice(cut);
  }

  private isOverBoard(copyY: number): boolean {
    return copyY >= BOARD_TOP && copyY <= BOARD_BOTTOM;
  }

  // ─── Вспомогательные ────────────────────────────────────────────────────

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
    this.trail = [];
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
    const slot = piece.kind === 'special' ? HAND_PIECE_CELL * 2 : HAND_PIECE_CELL * 5;
    const copy = new PieceView(scene, piece, slot);
    copy.setPosition(pointer.x, pointer.y + DRAG_OFFSET_Y);
    copy.setScale(1.1);
    copy.setDepth(1000);
    return copy;
  }

  /** Опорная клетка обычной фигуры: верхний-левый угол bounding box на сетке. */
  private computeShapeTarget(
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

  /** Клетка-якорь спецфигуры: клетка под центром копии. */
  private pointToCell(px: number, py: number): { x: number; y: number } | null {
    if (py < BOARD_TOP || py > BOARD_BOTTOM) return null;
    const x = Math.floor((px - BOARD_X) / CELL_SIZE);
    const y = Math.floor((py - BOARD_TOP) / CELL_SIZE);
    if (!isInside(x, y)) return null;
    return { x, y };
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
    return this.deps.engine.state.hand.find((p) => p?.id === pieceId) ?? null;
  }

  private findSlotIndex(pieceId: string): number {
    return this.deps.engine.state.hand.findIndex((p) => p?.id === pieceId);
  }
}
