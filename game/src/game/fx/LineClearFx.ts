/**
 * LineClearFx — визуал очистки линий (T-041).
 *
 * Обычная линия: светлый beam + белые вспышки клеток.
 * Стихийная линия: цветной beam + более выраженные вспышки цветом стихии.
 *
 * Эффекты используют FxPool (object pool), чтобы не плодить Image-объекты.
 * Это greybox-версия под Milestone 3; позже можно улучшить в T-056.
 */
import type Phaser from 'phaser';
import type { LineInfo } from '../../core/types';
import { BOARD_PIXEL_SIZE, BOARD_TOP, BOARD_X, CELL_SIZE } from '../layout';
import { COLOR_MULTI, ELEMENT_COLORS } from '../../config/elements';
import { TEX_FX_BEAM, TEX_FX_GLOW } from '../textures';
import type { BoardView } from '../objects/BoardView';
import { FxPool } from './FxPool';

export class LineClearFx {
  private readonly scene: Phaser.Scene;
  private readonly boardView: BoardView;
  private readonly glowPool: FxPool;
  private readonly beamPool: FxPool;

  constructor(scene: Phaser.Scene, boardView: BoardView) {
    this.scene = scene;
    this.boardView = boardView;

    this.ensureTextures();

    this.glowPool = new FxPool(scene, TEX_FX_GLOW);
    this.beamPool = new FxPool(scene, TEX_FX_BEAM);
  }

  /**
   * Проиграть очистку всех линий из PlacementResult.
   * Вызывает onComplete, когда анимация завершена.
   */
  play(lines: LineInfo[], onComplete: () => void): void {
    if (lines.length === 0) {
      onComplete();
      return;
    }

    // Очередь очистки (DESIGN §13): линии уходят не одновременно, а с шагом
    // ~110 мс — каждая линия читается, комбо набирает темп.
    const LINE_STEP_MS = 110;

    // Тушим сами клетки поля (fill внутри CellView), с задержкой по линии.
    const fills: { img: Phaser.GameObjects.Image; sx: number; sy: number }[] = [];

    for (const line of lines) {
      const lineIndex = lines.indexOf(line);
      for (const c of line.cells) {
        const cell = this.boardView.getCell(c.x, c.y);
        if (!cell) continue;

        const img = cell.getFill();
        if (!img.visible) continue;

        fills.push({ img, sx: img.scaleX, sy: img.scaleY });

        this.scene.tweens.add({
          targets: img,
          alpha: 0,
          scaleX: img.scaleX * 1.25,
          scaleY: img.scaleY * 1.25,
          duration: 240,
          delay: lineIndex * LINE_STEP_MS,
          ease: 'Quad.Out',
        });
      }
    }

    // Beam и вспышки по каждой линии (в той же очереди).
    lines.forEach((line, index) => {
      const delay = index * LINE_STEP_MS;
      this.playBeam(line, delay);
      this.playBursts(line, delay);
    });

    // Общий таймер завершения: последняя линия + её анимация.
    const total = 750 + lines.length * LINE_STEP_MS;

    this.scene.time.delayedCall(total, () => {
      // Возвращаем fill-клеткам исходный вид перед BoardView.update().
      for (const f of fills) {
        f.img.setAlpha(1);
        f.img.setScale(f.sx, f.sy);
      }

      onComplete();
    });
  }

  /** Горизонтальный/вертикальный луч очистки. */
  private playBeam(line: LineInfo, delay: number): void {
    const color = this.lineColor(line);
    const beam = this.beamPool.acquire();

    beam.setDepth(160);
    beam.setTint(color);
    beam.setAlpha(0);

    if (line.type === 'row') {
      const y = BOARD_TOP + line.index * CELL_SIZE + CELL_SIZE / 2;
      beam.setPosition(BOARD_X + BOARD_PIXEL_SIZE / 2, y);
      beam.setDisplaySize(BOARD_PIXEL_SIZE + 80, 12);
    } else {
      const x = BOARD_X + line.index * CELL_SIZE + CELL_SIZE / 2;
      beam.setPosition(x, BOARD_TOP + BOARD_PIXEL_SIZE / 2);
      beam.setDisplaySize(12, BOARD_PIXEL_SIZE + 80);
    }

    this.scene.tweens.add({
      targets: beam,
      alpha: 0.85,
      duration: 90,
      delay,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          duration: 240,
          ease: 'Quad.In',
          onComplete: () => {
            this.beamPool.release(beam);
          },
        });
      },
    });
  }

  /** Вспышки по клеткам линии. */
  private playBursts(line: LineInfo, lineDelay: number): void {
    const color = this.lineColor(line);
    const isElemental = line.isElemental;

    line.cells.forEach((c, i) => {
      const x = BOARD_X + c.x * CELL_SIZE + CELL_SIZE / 2;
      const y = BOARD_TOP + c.y * CELL_SIZE + CELL_SIZE / 2;
      const delay = lineDelay + i * 25;

      const glow = this.glowPool.acquire();

      glow.setPosition(x, y);
      glow.setDepth(150);
      glow.setTint(color);
      glow.setAlpha(0);
      glow.setScale(isElemental ? 0.5 : 0.35);

      this.scene.tweens.add({
        targets: glow,
        alpha: isElemental ? 0.95 : 0.7,
        scaleX: isElemental ? 1.5 : 1.1,
        scaleY: isElemental ? 1.5 : 1.1,
        duration: 200,
        delay,
        ease: 'Quad.Out',
        onComplete: () => {
          this.scene.tweens.add({
            targets: glow,
            alpha: 0,
            scaleX: isElemental ? 2.0 : 1.4,
            scaleY: isElemental ? 2.0 : 1.4,
            duration: 260,
            ease: 'Quad.In',
            onComplete: () => {
              this.glowPool.release(glow);
            },
          });
        },
      });
    });
  }

  /** Цвет линии: стихия, если стихийная, иначе multi-светлый. */
  private lineColor(line: LineInfo): number {
    if (line.isElemental && line.element !== null) {
      return ELEMENT_COLORS[line.element]!;
    }

    return COLOR_MULTI;
  }

  /**
   * Временно генерируем FX-текстуры здесь.
   * Позже можно перенести в PreloadScene (T-056/polish).
   */
  private ensureTextures(): void {
    if (!this.scene.textures.exists(TEX_FX_GLOW)) {
      const g = this.scene.add.graphics();

      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(32, 32, 32);

      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(32, 32, 22);

      g.fillStyle(0xffffff, 1);
      g.fillCircle(32, 32, 12);

      g.generateTexture(TEX_FX_GLOW, 64, 64);
      g.destroy();
    }

    if (!this.scene.textures.exists(TEX_FX_BEAM)) {
      const g = this.scene.add.graphics();

      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 8, 8);

      g.generateTexture(TEX_FX_BEAM, 8, 8);
      g.destroy();
    }
  }
}
