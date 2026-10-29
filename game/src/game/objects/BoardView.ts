/**
 * BoardView — отрисовка поля 8×8 + preview постановки.
 *
 * Содержит сетку CellView и overlay-слой для preview (зелёный/красный).
 * `update(grid)` перерисовывает клетки из состояния.
 * `showPreview(cells, ok, ghost?)` / `clearPreview()` — подсветка цели при drag,
 * включая предиктивный ghost (DES-5): зона детонации спецфигуры и строка награды
 * («+2 500 · КОМБО ×2 · +1⚡»), посчитанная engine.previewPlacement.
 * `showThreads(threads, hasRainbow)` / `clearThreads()` — нити неполных стихийных
 * линий (DES-6, DESIGN §6): свечение цвета стихии, пульс + призрак награды у 7,
 * радужная обводка при радуге в руке.
 */
import Phaser from 'phaser';
import type { Grid, Vec2 } from '../../core/types';
import { BOARD_SIZE, SCORE_LINE_ELEMENTAL } from '../../config/balance';
import {
  COLOR_GOLD,
  COLOR_GRID,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  ELEMENT_COLORS,
  FONT_FAMILY,
} from '../../config/elements';
import type { ElementalThread } from '../../core/lines';
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
  /** Нити неполных стихийных линий (DES-6): графика + призраки награды. */
  private threadObjects: Phaser.GameObjects.GameObject[] = [];
  private threadTweens: Phaser.Tweens.Tween[] = [];

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

  /**
   * Отрисовать нити неполных стихийных линий (DES-6, DESIGN §6).
   * 6 клеток — еле заметная нить цвета стихии; 7 — ярче + пульс края + призрак
   * награды; при радуге в руке — радужная обводка («радуга сюда подходит»).
   */
  showThreads(threads: ElementalThread[], hasRainbow: boolean): void {
    this.clearThreads();
    for (const t of threads) {
      const bright = t.natural >= 7;
      const color = ELEMENT_COLORS[t.element] ?? COLOR_GOLD;
      const alpha = bright ? 0.25 : 0.12;

      const g = this.scene.add.graphics();
      const line = (thickness: number, a: number) => {
        g.lineStyle(thickness, color, a);
        if (t.type === 'row') {
          const y = BOARD_TOP + t.index * CELL_SIZE + CELL_SIZE / 2;
          g.lineBetween(BOARD_X + CELL_SIZE * 0.15, y, BOARD_X + 7.85 * CELL_SIZE, y);
        } else {
          const x = BOARD_X + t.index * CELL_SIZE + CELL_SIZE / 2;
          g.lineBetween(x, BOARD_TOP + CELL_SIZE * 0.15, x, BOARD_TOP + 7.85 * CELL_SIZE);
        }
      };
      line(7, alpha * 0.35); // внешнее свечение
      line(2, alpha);
      this.overlayLayer.addAt(g, 0);
      this.threadObjects.push(g);

      if (hasRainbow) {
        // Радужная обводка полосы линии: по клетке, цвета циклом по 4 стихиям.
        const outline = this.scene.add.graphics();
        for (let i = 0; i < BOARD_SIZE; i++) {
          const c = ELEMENT_COLORS[i % ELEMENT_COLORS.length]!;
          outline.lineStyle(2, c, 0.55);
          if (t.type === 'row') {
            outline.strokeRect(
              BOARD_X + i * CELL_SIZE + 3,
              BOARD_TOP + t.index * CELL_SIZE + 3,
              CELL_SIZE - 6,
              CELL_SIZE - 6,
            );
          } else {
            outline.strokeRect(
              BOARD_X + t.index * CELL_SIZE + 3,
              BOARD_TOP + i * CELL_SIZE + 3,
              CELL_SIZE - 6,
              CELL_SIZE - 6,
            );
          }
        }
        this.overlayLayer.add(outline);
        this.threadObjects.push(outline);
      }

      // 7 клеток: пульс нити + призрак награды «+2 500 · +1⚡».
      if (bright) {
        this.threadTweens.push(
          this.scene.tweens.add({
            targets: g,
            alpha: { from: 1, to: 0.45 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
          }),
        );
        const cx =
          t.type === 'row'
            ? BOARD_X + 3.5 * CELL_SIZE
            : BOARD_X + t.index * CELL_SIZE + CELL_SIZE / 2;
        const cy =
          t.type === 'row'
            ? BOARD_TOP + t.index * CELL_SIZE - 4
            : BOARD_TOP + 3.5 * CELL_SIZE;
        const label = this.scene.add
          .text(cx, cy, `+${SCORE_LINE_ELEMENTAL.toLocaleString('ru-RU')} · +1⚡`, {
            fontFamily: FONT_FAMILY,
            fontSize: '20px',
            color: `#${COLOR_GOLD.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setAlpha(0.85);
        this.overlayLayer.add(label);
        this.threadObjects.push(label);
      }
    }
  }

  /** Убрать нити и их анимации. */
  clearThreads(): void {
    for (const t of this.threadTweens) t.stop();
    this.threadTweens = [];
    for (const o of this.threadObjects) o.destroy();
    this.threadObjects = [];
  }

  /** CellView по координатам поля (для FX-анимаций в Milestone 3). */
  getCell(x: number, y: number): CellView | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.cells[y][x] ?? null;
  }
}
