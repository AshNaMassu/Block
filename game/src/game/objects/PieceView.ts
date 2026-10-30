/**
 * PieceView — отображение одной фигуры из руки.
 *
 * Рисует клетки фигуры (по piece.shape) с центрированием в bounding box.
 * normal (по element), rainbow (1×1 multi), special — детонатор: клетки цвета
 * своей стихии + золотой контур + символ-эмодзи. Силуэт читается до постановки:
 * Пожар 1×1 с огненным ядром, Прилив 1×2 каплей, Вихрь — спираль, Родник 2×2 — крона.
 *
 * Используется HandView'ом и DragController'ом. Origin (0,0) контейнера —
 * центр bounding box'а фигуры.
 */
import Phaser from 'phaser';
import type { Piece } from '../../core/types';
import { FONT_FAMILY, ELEMENT_COLORS, COLOR_GOLD, COLOR_MULTI } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import { TEX_CELL_SIZE, TEX_MULTI, TEX_RAINBOW, cellTextureKey } from '../textures';
import { SPECIAL_ELEMENT } from '../../core/specials';

/** Размер одной клетки фигуры внутри слота руки. */
export const PIECE_VIEW_CELL = 70;

/** Масштаб: текстура клетки 120px → отображаем PIECE_VIEW_CELL. */
const CELL_SCALE = PIECE_VIEW_CELL / TEX_CELL_SIZE;

/** Символы детонаторов (поверх клеток цвета стихии). */
const SPECIAL_SYMBOLS: Record<string, string> = {
  fire: '🔥',
  tide: '💧',
  vortex: '🌀',
  spring: '🌿',
};

export class PieceView extends Phaser.GameObjects.Container {
  readonly pieceId: string;
  readonly slotSize: number;
  private selectedMarker: Phaser.GameObjects.Graphics | null = null;
  private linkedMarker: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, piece: Piece, slotSize: number) {
    super(scene, 0, 0);
    this.pieceId = piece.id;
    this.slotSize = slotSize;
    this.renderPiece(piece);
    this.setSize(slotSize, slotSize);
    scene.add.existing(this);
  }

  /** Перерисовать фигуру (при смене содержимого слота или ориентации Прилива). */
  renderPiece(piece: Piece): void {
    this.removeAll(true);
    this.selectedMarker = null;
    this.linkedMarker = null;

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
    const isSpecial = piece.kind === 'special';
    // Детонатор: клетки цвета своей стихии (Пожар — огненное ядро, Прилив — капля,
    // Вихрь — воздух, Родник — земля). Стихийная клетка 1×1 без special выглядит так же.
    const texKey = isRainbow
      ? TEX_RAINBOW
      : isSpecial
        ? cellTextureKey(SPECIAL_ELEMENT[piece.special ?? 'fire'])
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

    // Символ детонатора в центре (иллюзия «ядра»: 🌀 спираль, 🌿 крона и т.д.).
    if (isSpecial) {
      const label = this.scene.add
        .text(0, 0, SPECIAL_SYMBOLS[piece.special ?? 'fire'], {
          fontFamily: FONT_FAMILY,
          fontSize: '44px',
        })
        .setOrigin(0.5);
      this.add(label);
    }

    // Золотой контур для rainbow и спецфигур (бонусные фигуры).
    if (isRainbow || isSpecial) {
      const outline = this.scene.add.graphics();
      outline.lineStyle(4, COLOR_GOLD, 1);
      outline.strokeRoundedRect(
        offsetX - PIECE_VIEW_CELL / 2 + 2,
        offsetY - PIECE_VIEW_CELL / 2 + 2,
        width - 4,
        height - 4,
        CELL_RADIUS * CELL_SCALE,
      );
      this.add(outline);
    }
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

  /**
   * Подсветка выбранной спецфигуры (мердж в руке): пульсирующий белый контур.
   * Снимается повторным вызовом setSelected(false) или renderPiece.
   */
  setSelected(selected: boolean): void {
    if (this.selectedMarker) {
      this.selectedMarker.destroy();
      this.selectedMarker = null;
      this.scene.tweens.killTweensOf(this);
      this.setScale(1);
    }
    if (!selected) return;

    const cells = this.list.filter(
      (o) => o instanceof Phaser.GameObjects.Image,
    ) as Phaser.GameObjects.Image[];
    if (cells.length === 0) return;
    const minX = Math.min(...cells.map((c) => c.x - PIECE_VIEW_CELL / 2));
    const maxX = Math.max(...cells.map((c) => c.x + PIECE_VIEW_CELL / 2));
    const minY = Math.min(...cells.map((c) => c.y - PIECE_VIEW_CELL / 2));
    const maxY = Math.max(...cells.map((c) => c.y + PIECE_VIEW_CELL / 2));

    const g = this.scene.add.graphics();
    g.lineStyle(5, 0xffffff, 1);
    g.strokeRoundedRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8, CELL_RADIUS);
    this.add(g);
    this.selectedMarker = g;

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /**
   * Значок связи (DES-11, DESIGN §14): маленький золотой кружок «⇄» в углу —
   * «есть парная спецфигура, тап → тап = мердж».
   */
  setLinked(linked: boolean): void {
    if (this.linkedMarker) {
      this.linkedMarker.destroy();
      this.linkedMarker = null;
    }
    if (!linked) return;

    const g = this.scene.add.graphics();
    g.fillStyle(0x060a13, 0.9);
    g.fillCircle(this.slotSize / 2 - 18, -this.slotSize / 2 + 18, 22);
    g.lineStyle(3, COLOR_GOLD, 1);
    g.strokeCircle(this.slotSize / 2 - 18, -this.slotSize / 2 + 18, 22);
    const badge = this.scene.add
      .text(this.slotSize / 2 - 18, -this.slotSize / 2 + 18, '⇄', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: `#${COLOR_GOLD.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const marker = this.scene.add.container(0, 0, [g, badge]);
    this.add(marker);
    this.linkedMarker = marker;
  }

  /** Пульс парной фигуры при выборе (DES-11: «вторая фигура мягко пульсирует»). */
  setPulsing(pulsing: boolean): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    if (!pulsing) return;
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Лёгкая тряска при неверном тапе (DES-11: «нужна такая же фигура»). */
  shake(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 9, to: this.x },
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
      onComplete: () => this.setScale(1),
    });
  }
}

/** Получить цвет стихии для дебага/ауры (экспорт для HandView). */
export function pieceElementColor(piece: Piece): number {
  if (piece.kind === 'rainbow') return COLOR_MULTI;
  if (piece.kind === 'special') return COLOR_GOLD;
  if (piece.element !== undefined) return ELEMENT_COLORS[piece.element]!;
  return COLOR_MULTI;
}
