/**
 * PieceView — отображение одной фигуры из руки.
 *
 * Рисует клетки фигуры (по piece.shape) с центрированием в bounding box.
 * Фаза А: normal (по element), rainbow (1×1 multi), special (иконка).
 *
 * Используется HandView'ом и DragController'ом. Origin (0,0) контейнера —
 * центр bounding box'а фигуры.
 */
import Phaser from 'phaser';
import type { Piece } from '../../core/types';
import { ELEMENT_COLORS, COLOR_GOLD, COLOR_MULTI } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import {
  TEX_CELL_SIZE,
  TEX_MULTI,
  TEX_RAINBOW,
  cellTextureKey,
  specialTextureKey,
} from '../textures';

/** Размер одной клетки фигуры внутри слота руки. */
export const PIECE_VIEW_CELL = 70;

/** Масштаб: текстура клетки 120px → отображаем PIECE_VIEW_CELL. */
const CELL_SCALE = PIECE_VIEW_CELL / TEX_CELL_SIZE;

/** Символы спецфигур (GDD §13). */
const SPECIAL_SYMBOLS: Record<string, string> = {
  bomb: '💣',
  line: '⚡',
  cross: '✚',
  apocalypse: '☄',
};

export class PieceView extends Phaser.GameObjects.Container {
  readonly pieceId: string;
  readonly slotSize: number;

  constructor(scene: Phaser.Scene, piece: Piece, slotSize: number) {
    super(scene, 0, 0);
    this.pieceId = piece.id;
    this.slotSize = slotSize;
    this.renderPiece(piece);
    this.setSize(slotSize, slotSize);
    scene.add.existing(this);
  }

  /** Перерисовать фигуру (при смене содержимого слота). */
  renderPiece(piece: Piece): void {
    this.removeAll(true);

    if (piece.kind === 'special') {
      this.renderSpecial(piece);
      return;
    }

    // normal/rainbow: клетки по shape, центрированные.
    const cells = piece.shape;
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    const maxX = Math.max(...cells.map((c) => c.x));
    const maxY = Math.max(...cells.map((c) => c.y));
    const width = (maxX - minX + 1) * PIECE_VIEW_CELL;
    const height = (maxY - minY + 1) * PIECE_VIEW_CELL;
    const offsetX = -width / 2 + PIECE_VIEW_CELL / 2;
    const offsetY = -height / 2 + PIECE_VIEW_CELL / 2;

    const isRainbow = piece.kind === 'rainbow';
    const texKey = isRainbow
      ? TEX_RAINBOW
      : piece.element !== undefined
        ? cellTextureKey(piece.element)
        : TEX_MULTI;

    for (const c of cells) {
      const img = this.scene.add
        .image(
          offsetX + (c.x - minX) * PIECE_VIEW_CELL,
          offsetY + (c.y - minY) * PIECE_VIEW_CELL,
          texKey,
        )
        .setScale(CELL_SCALE);
      this.add(img);
    }

    // Золотой контур для rainbow.
    if (isRainbow) {
      const outline = this.scene.add.graphics();
      outline.lineStyle(4, COLOR_GOLD, 1);
      outline.strokeRoundedRect(
        offsetX - PIECE_VIEW_CELL / 2 + 2,
        offsetY - PIECE_VIEW_CELL / 2 + 2,
        PIECE_VIEW_CELL - 4,
        PIECE_VIEW_CELL - 4,
        CELL_RADIUS * CELL_SCALE,
      );
      this.add(outline);
    }
  }

  /** Отрисовать спецфигуру (фон-текстура + символ поверх). GDD §13: 💣⚡✚☄. */
  private renderSpecial(piece: Piece): void {
    const tex = specialTextureKey(piece.special ?? 'bomb');
    const img = this.scene.add.image(0, 0, tex).setScale(CELL_SCALE);
    this.add(img);

    // Символ спецфигуры поверх.
    const symbol = SPECIAL_SYMBOLS[piece.special ?? 'bomb'];
    const label = this.scene.add
      .text(0, 0, symbol, {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '40px',
      })
      .setOrigin(0.5);
    this.add(label);
  }

  /**
   * Получить абсолютные экранные координаты клеток фигуры при заданном центре.
   * Для preview постановки на поле.
   */
  getShapeCellsAt(centerX: number, centerY: number): Phaser.Math.Vector2[] {
    // Используем последнюю отрисованную фигуру — читаем из children-images.
    const images = this.list.filter(
      (o) => o instanceof Phaser.GameObjects.Image,
    ) as Phaser.GameObjects.Image[];
    return images.map((img) => {
      const localX = img.x * this.scaleX;
      const localY = img.y * this.scaleY;
      return new Phaser.Math.Vector2(centerX + localX, centerY + localY);
    });
  }

  /** Временно скрыть фигуру (под drag-копией). */
  setDimmed(dim: boolean): void {
    this.setAlpha(dim ? 0.3 : 1);
  }

  /** Подсветка выбранной спецфигуры (Фаза Б). */
  setSelected(_selected: boolean): void {
    // TODO Фаза Б: подсветка для SpecialInputController.
  }
}

/** Получить цвет стихии для дебага/ауры (экспорт для HandView). */
export function pieceElementColor(piece: Piece): number {
  if (piece.kind === 'rainbow') return COLOR_MULTI;
  if (piece.kind === 'special') return COLOR_GOLD;
  if (piece.element !== undefined) return ELEMENT_COLORS[piece.element]!;
  return COLOR_MULTI;
}
