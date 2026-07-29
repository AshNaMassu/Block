/**
 * BoardView — отрисовка поля 8×8 + preview постановки.
 *
 * Содержит сетку CellView и overlay-слой для preview (зелёный/красный).
 * `update(grid)` перерисовывает клетки из состояния.
 * `showPreview(cells, ok)` / `clearPreview()` — подсветка цели при drag.
 *
 * Greybox: без анимаций очистки (они в Milestone 3, T-041) — просто перерисов.
 */
import Phaser from 'phaser';
import type { Grid, Vec2 } from '../../core/types';
import { BOARD_SIZE } from '../../config/balance';
import { BOARD_TOP, BOARD_X, CELL_SIZE } from '../layout';
import { TEX_PREVIEW_BAD, TEX_PREVIEW_OK } from '../textures';
import { CellView } from './CellView';

export class BoardView extends Phaser.GameObjects.Container {
  private readonly cells: CellView[][] = [];
  private readonly overlayLayer: Phaser.GameObjects.Container;
  private previewImages: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    for (let y = 0; y < BOARD_SIZE; y++) {
      this.cells[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const px = BOARD_X + x * CELL_SIZE + CELL_SIZE / 2;
        const py = BOARD_TOP + y * CELL_SIZE + CELL_SIZE / 2;
        this.cells[y][x] = new CellView(scene, x, y, px, py);
      }
      this.add(this.cells[y]);
    }

    // Overlay-слой поверх клеток для preview.
    this.overlayLayer = scene.add.container(0, 0);
    this.add(this.overlayLayer);

    scene.add.existing(this);
  }

  /** Полный перерисов поля из состояния. */
  update(grid: Grid): void {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        this.cells[y][x].updateCell(grid[y][x]);
      }
    }
  }

  /** Подсветить клетки цели при перетаскивании. */
  showPreview(cells: Vec2[], ok: boolean): void {
    this.clearPreview();
    const key = ok ? TEX_PREVIEW_OK : TEX_PREVIEW_BAD;
    for (const c of cells) {
      if (c.x < 0 || c.x >= BOARD_SIZE || c.y < 0 || c.y >= BOARD_SIZE) continue;
      const px = BOARD_X + c.x * CELL_SIZE + CELL_SIZE / 2;
      const py = BOARD_TOP + c.y * CELL_SIZE + CELL_SIZE / 2;
      const img = this.scene.add.image(px, py, key).setAlpha(0.5);
      this.overlayLayer.add(img);
      this.previewImages.push(img);
    }
  }

  /**
   * Подсветить регион спецфигуры (T-036).
   * `emptyCells` — клетки, которые будут заполнены (зелёным), остальные — затемнённые.
   */
  showSpecialRegion(region: Vec2[], emptyCells: Vec2[]): void {
    this.clearPreview();
    const emptySet = new Set(emptyCells.map((c) => c.y * BOARD_SIZE + c.x));
    for (const c of region) {
      if (c.x < 0 || c.x >= BOARD_SIZE || c.y < 0 || c.y >= BOARD_SIZE) continue;
      const px = BOARD_X + c.x * CELL_SIZE + CELL_SIZE / 2;
      const py = BOARD_TOP + c.y * CELL_SIZE + CELL_SIZE / 2;
      const isEmpty = emptySet.has(c.y * BOARD_SIZE + c.x);
      const img = this.scene.add
        .image(px, py, isEmpty ? TEX_PREVIEW_OK : TEX_PREVIEW_BAD)
        .setAlpha(isEmpty ? 0.55 : 0.25);
      this.overlayLayer.add(img);
      this.previewImages.push(img);
    }
  }

  /** Снять подсветку preview. */
  clearPreview(): void {
    for (const img of this.previewImages) img.destroy();
    this.previewImages = [];
  }

  /** CellView по координатам поля (для FX-анимаций в Milestone 3). */
  getCell(x: number, y: number): CellView | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.cells[y][x] ?? null;
  }
}
