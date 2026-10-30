/**
 * CellView — отображение одной клетки поля.
 *
 * Фон-слот «лунка» (всегда) + Image кристалла стихии/multi поверх (если клетка
 * занята). Управляется BoardView, не знает о GameState напрямую — только про
 * Cell|null.
 */
import Phaser from 'phaser';
import { COLOR_CELL_EMPTY, COLOR_GRID, darken, lighten, FONT_FAMILY } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import { TEX_CELL_SIZE, TEX_MULTI, cellTextureKey } from '../textures';
import type { Cell } from '../../core/types';

/** Символы стихий для доступности (DES-14, DESIGN §26): мелкий эмодзи в углу клетки. */
const ELEMENT_SYMBOLS = ['🔥', '💧', '🌿', '💨'];

export class CellView extends Phaser.GameObjects.Container {
  readonly gx: number;
  readonly gy: number;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly symbol: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, gx: number, gy: number, x: number, y: number) {
    super(scene, x, y);
    this.gx = gx;
    this.gy = gy;

    // Фон-слот — «лунка» в светлой панели: тёмный верх (утоплена), светлый низ.
    const bg = scene.add.graphics();
    bg.fillStyle(COLOR_CELL_EMPTY, 1);
    bg.fillRoundedRect(
      -TEX_CELL_SIZE / 2,
      -TEX_CELL_SIZE / 2,
      TEX_CELL_SIZE,
      TEX_CELL_SIZE,
      CELL_RADIUS,
    );
    bg.fillStyle(darken(COLOR_CELL_EMPTY, 0.08), 0.8);
    bg.fillRoundedRect(
      -TEX_CELL_SIZE / 2,
      -TEX_CELL_SIZE / 2,
      TEX_CELL_SIZE,
      TEX_CELL_SIZE * 0.14,
      { tl: CELL_RADIUS, tr: CELL_RADIUS, bl: 0, br: 0 },
    );
    bg.fillStyle(lighten(COLOR_CELL_EMPTY, 0.55), 0.9);
    bg.fillRoundedRect(-TEX_CELL_SIZE / 2 + 2, TEX_CELL_SIZE / 2 - 5, TEX_CELL_SIZE - 4, 3, 2);
    bg.lineStyle(2, COLOR_GRID, 0.5);
    bg.strokeRoundedRect(
      -TEX_CELL_SIZE / 2 + 1,
      -TEX_CELL_SIZE / 2 + 1,
      TEX_CELL_SIZE - 2,
      TEX_CELL_SIZE - 2,
      CELL_RADIUS,
    );
    this.add(bg);

    // Image кристалла стихии поверх (изначально скрыт).
    this.fill = scene.add
      .image(0, 0, cellTextureKey(0))
      .setVisible(false)
      .setDisplaySize(TEX_CELL_SIZE, TEX_CELL_SIZE);
    this.add(this.fill);

    // Символ стихии в углу (дальтоникам; multi — 🌈).
    this.symbol = scene.add
      .text(TEX_CELL_SIZE / 2 - 10, -TEX_CELL_SIZE / 2 + 8, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
      })
      .setOrigin(1, 0)
      .setAlpha(0.85)
      .setVisible(false);
    this.add(this.symbol);
    scene.add.existing(this);
  }

  /** Обновить содержимое клетки по данным состояния. */
  updateCell(cell: Cell | null): void {
    if (cell === null) {
      this.fill.setVisible(false);
      this.symbol.setVisible(false);
      return;
    }
    // multi-клетка (element = -1) — своя текстура; обычная — по element.
    this.fill.setTexture(cell.multi ? TEX_MULTI : cellTextureKey(cell.element));
    this.fill.setVisible(true);
    this.symbol.setText(cell.multi ? '🌈' : (ELEMENT_SYMBOLS[cell.element] ?? ''));
    this.symbol.setVisible(true);
  }

  /** Доступ к image-заливке (для анимаций в Milestone 3). */
  getFill(): Phaser.GameObjects.Image {
    return this.fill;
  }
}
