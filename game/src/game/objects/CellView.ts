/**
 * CellView — отображение одной клетки поля.
 *
 * Greybox: фон-слот (всегда) + Image стихии/multi поверх (если клетка занята).
 * Управляется BoardView, не знает о GameState напрямую — только про Cell|null.
 */
import Phaser from 'phaser';
import { COLOR_CELL_EMPTY } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import { TEX_CELL_SIZE, TEX_MULTI, cellTextureKey } from '../textures';
import type { Cell } from '../../core/types';

export class CellView extends Phaser.GameObjects.Container {
  readonly gx: number;
  readonly gy: number;
  private readonly fill: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, gx: number, gy: number, x: number, y: number) {
    super(scene, x, y);
    this.gx = gx;
    this.gy = gy;

    // Фон слота — рисуем Graphics (статичный), без отдельной текстуры.
    const bg = scene.add.graphics();
    bg.fillStyle(COLOR_CELL_EMPTY, 1);
    bg.fillRoundedRect(
      -TEX_CELL_SIZE / 2,
      -TEX_CELL_SIZE / 2,
      TEX_CELL_SIZE,
      TEX_CELL_SIZE,
      CELL_RADIUS,
    );
    this.add(bg);

    // Image стихии поверх (изначально скрыт).
    this.fill = scene.add
      .image(0, 0, cellTextureKey(0))
      .setVisible(false)
      .setDisplaySize(TEX_CELL_SIZE, TEX_CELL_SIZE);
    this.add(this.fill);

    scene.add.existing(this);
  }

  /** Обновить содержимое клетки по данным состояния. */
  updateCell(cell: Cell | null): void {
    if (cell === null) {
      this.fill.setVisible(false);
      return;
    }
    // multi-клетка (element = -1) — своя текстура; обычная — по element.
    this.fill.setTexture(cell.multi ? TEX_MULTI : cellTextureKey(cell.element));
    this.fill.setVisible(true);
  }

  /** Доступ к image-заливке (для анимаций в Milestone 3). */
  getFill(): Phaser.GameObjects.Image {
    return this.fill;
  }
}
