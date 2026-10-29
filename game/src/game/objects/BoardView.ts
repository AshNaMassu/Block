/**
 * BoardView — отрисовка поля 8×8 + preview постановки.
 *
 * Содержит сетку CellView и overlay-слой для preview (зелёный/красный).
 * `update(grid)` перерисовывает клетки из состояния.
 * `showPreview(cells, ok, ghost?)` / `clearPreview()` — подсветка цели при drag,
 * включая предиктивный ghost (DES-5): зона детонации спецфигуры и строка награды
 * («+2 500 · КОМБО ×2 · +1⚡»), посчитанная engine.previewPlacement.
 */
import Phaser from 'phaser';
import type { Grid, Vec2 } from '../../core/types';
import { BOARD_SIZE } from '../../config/balance';
import {
  COLOR_GOLD,
  COLOR_GRID,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  FONT_FAMILY,
} from '../../config/elements';
import { BOARD_PIXEL_SIZE, BOARD_TOP, BOARD_X, CELL_SIZE } from '../layout';
import { TEX_MULTI, TEX_PREVIEW_BAD, TEX_PREVIEW_OK } from '../textures';
import { CellView } from './CellView';

/** Предиктивная подсветка при drag (строится DragController из previewPlacement). */
export interface DragGhostInfo {
  /** Зона эффекта спецфигуры (detonation.region), подсвечивается цветом стихии. */
  zoneCells: Vec2[];
  /** Цвет зоны (стихия детонатора). */
  zoneColor: number;
  /** Строка ghost-награды рядом с целью, null — не показывать. */
  ghostText: string | null;
}

export class BoardView extends Phaser.GameObjects.Container {
  private readonly cells: CellView[][] = [];
  private readonly overlayLayer: Phaser.GameObjects.Container;
  private previewImages: Phaser.GameObjects.Image[] = [];
  private zoneImages: Phaser.GameObjects.Image[] = [];
  private ghostLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // Панель-подложка с мягкой тенью (поле как физический объект).
    const PAD = 24;
    const panel = scene.add.graphics();
    panel.fillStyle(COLOR_PANEL_SHADOW, 0.18);
    panel.fillRoundedRect(
      BOARD_X - PAD + 6,
      BOARD_TOP - PAD + 14,
      BOARD_PIXEL_SIZE + PAD * 2,
      BOARD_PIXEL_SIZE + PAD * 2,
      32,
    );
    panel.fillStyle(COLOR_PANEL, 1);
    panel.fillRoundedRect(
      BOARD_X - PAD,
      BOARD_TOP - PAD,
      BOARD_PIXEL_SIZE + PAD * 2,
      BOARD_PIXEL_SIZE + PAD * 2,
      32,
    );
    panel.lineStyle(2, COLOR_GRID, 0.8);
    panel.strokeRoundedRect(
      BOARD_X - PAD,
      BOARD_TOP - PAD,
      BOARD_PIXEL_SIZE + PAD * 2,
      BOARD_PIXEL_SIZE + PAD * 2,
      32,
    );
    this.addAt(panel, 0);

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

    // Ghost-награда при drag (переиспользуемый текст, DES-5).
    this.ghostLabel = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: `#${COLOR_GOLD.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(60);
    this.overlayLayer.add(this.ghostLabel);

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

  /** Подсветить клетки цели при перетаскивании (+ ghost-награда/зона детонации). */
  showPreview(cells: Vec2[], ok: boolean, ghost?: DragGhostInfo): void {
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
    if (!ok || !ghost) return;

    // Зона детонации спецфигуры: полупрозрачная заливка цветом стихии.
    for (const c of ghost.zoneCells) {
      if (c.x < 0 || c.x >= BOARD_SIZE || c.y < 0 || c.y >= BOARD_SIZE) continue;
      const px = BOARD_X + c.x * CELL_SIZE + CELL_SIZE / 2;
      const py = BOARD_TOP + c.y * CELL_SIZE + CELL_SIZE / 2;
      const img = this.scene.add.image(px, py, TEX_MULTI).setTint(ghost.zoneColor).setAlpha(0.35);
      this.overlayLayer.add(img);
      this.zoneImages.push(img);
    }

    // Ghost-награда: над верхней строкой цели.
    if (ghost.ghostText) {
      const minY = Math.min(...cells.map((c) => c.y));
      const cx =
        cells.reduce((acc, c) => acc + BOARD_X + c.x * CELL_SIZE + CELL_SIZE / 2, 0) / cells.length;
      const py = BOARD_TOP + minY * CELL_SIZE - 6;
      this.ghostLabel.setText(ghost.ghostText).setPosition(cx, py).setVisible(true);
    }
  }

  /** Снять подсветку preview. */
  clearPreview(): void {
    for (const img of this.previewImages) img.destroy();
    this.previewImages = [];
    for (const img of this.zoneImages) img.destroy();
    this.zoneImages = [];
    this.ghostLabel.setVisible(false);
  }

  /** CellView по координатам поля (для FX-анимаций в Milestone 3). */
  getCell(x: number, y: number): CellView | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.cells[y][x] ?? null;
  }
}
