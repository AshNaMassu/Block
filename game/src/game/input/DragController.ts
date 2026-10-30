/**
 * DragController — единый drag & drop для всех фигур (T-034/T-035 + детонаторы).
 *
 * Обычные/радужные/спецфигуры: перетаскивание с preview формы
 * (engine.canPlacePiece), применение по drop через engine.placePiece.
 * Спецфигуры-детонаторы ставятся как обычные фигуры; детонация — на движке.
 *
 * Прилив (tide 1×2): ориентация читается из «хвоста» движения над полем —
 * горизонтальный мазок → строка, вертикальный → столбец. Движение переноса
 * (вне поля) на ориентацию не влияет. Кнопки выбора ориентации не нужны.
 *
 * Мердж в руке (гибрид B): тап по спецфигуре выделяет её; тап по второй
 * спецфигуре ТОГО ЖЕ типа мержит их в следующую ступень (Пожар+Пожар = Прилив).
 * Тап по той же фигуре — снять выделение, по другой — перенести выделение.
 *
 * GDD §14: смещение фигуры вверх от пальца, preview, pointercancel.
 */
import type Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import type { LineOrientation, Piece, PlacementResult, SpecialType } from '../../core/types';
import { getShapeCells } from '../../core/shapes';
import { specialShape } from '../../core/specials';
import { mergeSpecialPieces, type MergeResult } from '../../core/hand';
import { ELEMENT_COLORS } from '../../config/elements';
import { BOARD_BOTTOM, BOARD_TOP, BOARD_X, CELL_SIZE, HAND_PIECE_CELL } from '../layout';
import type { BoardView, DragGhostInfo } from '../objects/BoardView';
import type { HandView } from '../objects/HandView';
import { PieceView } from '../objects/PieceView';

/** Смещение drag-копии вверх от пальца (px), чтобы палец не закрывал цель. */
const DRAG_OFFSET_Y = -140;

/** Минимальное смещение (px), после которого жест считается drag, а не тапом. */
const DRAG_THRESHOLD = 8;

/** Длина «хвоста» движения (px) для определения ориентации Прилива. */
const TRAIL_LENGTH = 50;

/** Гистерезис: ось должна доминировать в это число раз, чтобы переключить ориентацию. */
const ORIENTATION_HYSTERESIS = 1.4;

export interface DragControllerDeps {
  scene: Phaser.Scene;
  engine: GameEngine;
  boardView: BoardView;
  handView: HandView;
  /** Колбэк после успешной постановки любой фигуры (включая детонаторы). */
  onPlaced: (result: PlacementResult, piece: Piece) => void;
  /** Колбэк после успешного мерджа двух спецфигур в руке. */
  onMerged: (result: MergeResult) => void;
  /** Подсказка «нужна такая же фигура» при тапе по другой спецфигуре (DES-11). */
  onMergeHint: () => void;
}

export class DragController {
  private readonly deps: DragControllerDeps;
  private dragCopy: PieceView | null = null;
  private draggingPiece: Piece | null = null;
  private originSlotIndex = -1;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private isDragging = false;

  // Прилив: ориентация + «хвост» недавнего движения.
  private orientation: LineOrientation = 'row';
  private trail: { x: number; y: number }[] = [];

  // Мердж в руке: выделенная спецфигура (по id).
  private selectedPieceId: string | null = null;

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
      this.clearSelection();
    }

    const copyX = pointer.x;
    const copyY = pointer.y + DRAG_OFFSET_Y;

    // Прилив: ориентация по «хвосту» движения, только пока копия над полем.
    if (this.draggingPiece.special === 'tide') {
      if (this.isOverBoard(copyY)) {
        this.updateTrail(pointer.x, pointer.y);
        this.updateOrientationFromTrail();
      } else {
        this.trail = [];
      }
      // Копия должна показывать текущую ориентацию.
      this.dragCopy.renderPiece({ ...this.draggingPiece, shape: this.effectiveShape() });
    }

    this.dragCopy.setPosition(copyX, copyY);

    const target = this.computeShapeTarget(this.effectiveShape(), copyX, copyY);
    if (target) {
      const cells = getShapeCells(this.effectiveShape(), target);
      const ok = this.deps.engine.canPlacePiece(this.draggingPiece.id, target, this.orientation);
      // Предиктивный ghost (DES-5): симуляция считает награды заранее.
      const ghost = ok ? this.buildGhostInfo(target) : null;
      this.deps.boardView.showPreview(cells, ok, ghost ?? undefined);
    } else {
      this.deps.boardView.clearPreview();
    }
  }

  /**
   * Ghost-инфо из симуляции постановки (DES-5, DESIGN §7/§23):
   * строка награды «+2 500 · КОМБО ×2 · +1⚡» и зона детонации спецфигуры.
   * target валиден (вызывающий уже проверил canPlacePiece).
   */
  private buildGhostInfo(target: { x: number; y: number }): DragGhostInfo {
    const result = this.deps.engine.previewPlacement(
      this.draggingPiece!.id,
      target,
      this.orientation,
    );

    const parts: string[] = [];
    if (result.scoreGained > 0) {
      parts.push(`+${result.scoreGained.toLocaleString('ru-RU')}`);
    }
    if (result.combo) parts.push(`КОМБО ×${result.combo.lines}`);
    const bolts = result.elementalLines + (result.detonation ? 1 : 0);
    if (bolts > 0) parts.push(`+${bolts}⚡`);
    if (result.cleansing) parts.push('ОЧИЩЕНИЕ!');

    let zoneCells: { x: number; y: number }[] = [];
    let zoneColor = ELEMENT_COLORS[0]!;
    if (result.detonation) {
      zoneCells = result.detonation.region;
      zoneColor = ELEMENT_COLORS[result.detonation.element] ?? zoneColor;
    }

    return { zoneCells, zoneColor, ghostText: parts.length > 0 ? parts.join('  ·  ') : null };
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingPiece || !this.dragCopy) {
      this.cleanup();
      return;
    }

    // Не перешли порог — тап: у спецфигур это мердж-выделение.
    if (!this.isDragging) {
      const piece = this.draggingPiece;
      this.cleanup();
      if (piece.kind === 'special') this.handleSpecialTap(piece);
      return;
    }

    const piece = this.draggingPiece;
    const copyX = pointer.x;
    const copyY = pointer.y + DRAG_OFFSET_Y;
    const target = this.computeShapeTarget(this.effectiveShape(), copyX, copyY);
    let placed = false;
    if (target && this.deps.engine.canPlacePiece(piece.id, target, this.orientation)) {
      const result = this.deps.engine.placePiece(piece.id, target, this.orientation);
      placed = result.ok;
      if (placed) this.deps.onPlaced(result, piece);
    }

    if (!placed) this.animateReturn();
    this.cleanup();
  }

  // ─── Мердж в руке (гибрид B) ────────────────────────────────────────────

  /**
   * Тап по спецфигуре: выделение или мердж.
   * Тап по выделенной — снять выделение. Тап по второй того же типа — мердж.
   * Тап по другой спецфигуре — перенести выделение.
   */
  private handleSpecialTap(piece: Piece): void {
    if (this.selectedPieceId === null) {
      this.selectPiece(piece.id);
      return;
    }
    if (this.selectedPieceId === piece.id) {
      this.clearSelection();
      return;
    }

    const selected = this.findPieceInHand(this.selectedPieceId);
    if (!selected || selected.kind !== 'special' || selected.special !== piece.special) {
      // Другой тип — лёгкая тряска + подсказка (DES-11, DESIGN §14), выделение остаётся.
      this.deps.handView.getPieceView(piece.id)?.shake();
      this.deps.onMergeHint();
      return;
    }

    const idA = this.selectedPieceId;
    this.clearSelection();
    const result = mergeSpecialPieces(this.deps.engine.state.hand, idA, piece.id);
    if (result.ok) this.deps.onMerged(result);
  }

  private selectPiece(pieceId: string): void {
    this.selectedPieceId = pieceId;
    this.deps.handView.getPieceView(pieceId)?.setSelected(true);

    // Пара того же типа: пульс + дуга связи (DES-11).
    const selected = this.findPieceInHand(pieceId);
    if (!selected || selected.kind !== 'special') return;
    const partner = this.findMergePartner(pieceId, selected.special!);
    if (!partner) return;
    this.deps.handView.getPieceView(partner.id)?.setPulsing(true);
    this.deps.handView.showMergeArc(pieceId, partner.id);
  }

  /** Найти в руке вторую спецфигуру того же типа (для связи/мерджа). */
  private findMergePartner(pieceId: string, special: SpecialType): Piece | null {
    let partner: Piece | null = null;
    this.deps.engine.state.hand.forEach((p) => {
      if (p && p.id !== pieceId && p.kind === 'special' && p.special === special) partner = p;
    });
    return partner;
  }

  private clearSelection(): void {
    if (this.selectedPieceId === null) return;
    this.deps.handView.getPieceView(this.selectedPieceId)?.setSelected(false);
    this.selectedPieceId = null;
    // Снять пульс пары и дугу (DES-11).
    this.deps.handView.clearMergeArc();
    for (const view of this.deps.handView.getPieceViews()) view.setPulsing(false);
  }

  // ─── Вспомогательные ────────────────────────────────────────────────────

  /** Форма перетаскиваемой фигуры с учётом ориентации Прилива. */
  private effectiveShape(): { x: number; y: number }[] {
    const piece = this.draggingPiece!;
    if (piece.kind === 'special') return specialShape(piece.special!, this.orientation);
    return piece.shape;
  }

  /** Ориентация Прилива по направлению «хвоста»: горизонталь → ряд, вертикаль → столбец. */
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
    const sized = piece.shape.length > 1 ? HAND_PIECE_CELL * 2 : HAND_PIECE_CELL * 5;
    const copy = new PieceView(scene, piece, sized);
    copy.setPosition(pointer.x, pointer.y + DRAG_OFFSET_Y);
    copy.setScale(1.1);
    copy.setDepth(1000);
    return copy;
  }

  /** Опорная клетка фигуры: верхний-левый угол bounding box на сетке. */
  private computeShapeTarget(
    shape: { x: number; y: number }[],
    centerX: number,
    centerY: number,
  ): { x: number; y: number } | null {
    const minX = Math.min(...shape.map((c) => c.x));
    const minY = Math.min(...shape.map((c) => c.y));
    const maxX = Math.max(...shape.map((c) => c.x));
    const maxY = Math.max(...shape.map((c) => c.y));

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
    return this.deps.engine.state.hand.find((p) => p?.id === pieceId) ?? null;
  }

  private findSlotIndex(pieceId: string): number {
    return this.deps.engine.state.hand.findIndex((p) => p?.id === pieceId);
  }
}
