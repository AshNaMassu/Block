/**
 * CleansingFx — полноэкранная анимация Очищения (T-042, GDD-2 §13).
 *
 * Вспышка цветом стихии + концентрические круги от центра поля.
 * Число кругов = 1 + overflow (тир-зависимая интенсивность).
 * Чистое Очищение — золотые круги и вспышка.
 *
 * Кольца через FxPool (object pool).
 */
import type Phaser from 'phaser';
import type { ElementId } from '../../core/types';
import { BOARD_PIXEL_SIZE, BOARD_TOP, BOARD_X, DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout';
import { COLOR_GOLD, ELEMENT_COLORS } from '../../config/elements';
import { TEX_FX_RING } from '../textures';
import { FxPool } from './FxPool';

export class CleansingFx {
  private readonly scene: Phaser.Scene;
  private readonly ringPool: FxPool;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureRingTexture();
    this.ringPool = new FxPool(scene, TEX_FX_RING);
  }

  /**
   * Проиграть Очищение.
   * @param element стихия consumed-слотов
   * @param overflow величина переполнения (0..5) — число доп. кругов
   * @param isPure чистое очищение (золотой визуал)
   */
  play(element: ElementId, overflow: number, isPure: boolean, onComplete: () => void): void {
    const baseColor = ELEMENT_COLORS[element]!;
    const color = isPure ? COLOR_GOLD : baseColor;
    const cx = BOARD_X + BOARD_PIXEL_SIZE / 2;
    const cy = BOARD_TOP + BOARD_PIXEL_SIZE / 2;

    // Полноэкранная вспышка.
    const flash = this.scene.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, color, 1)
      .setOrigin(0)
      .setDepth(250)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0.4,
      duration: 130,
      yoyo: true,
      hold: 90,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    });

    // Лёгкая тряска экрана.
    this.scene.cameras.main.shake(260, 0.006);

    // Концентрические круги: число = 1 + overflow (GDD-2 §13).
    const ringCount = 1 + Math.max(0, Math.min(overflow, 5));

    for (let i = 0; i < ringCount; i++) {
      const ring = this.ringPool.acquire();
      ring.setPosition(cx, cy);
      ring.setDepth(170);
      ring.setTint(i % 2 === 0 ? color : baseColor);
      ring.setAlpha(0);
      ring.setScale(0.15);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 2.4 + i * 0.4,
        scaleY: 2.4 + i * 0.4,
        alpha: { from: 0.8, to: 0 },
        duration: 680,
        delay: i * 130,
        ease: 'Cubic.Out',
        onComplete: () => this.ringPool.release(ring),
      });
    }

    const total = (ringCount - 1) * 130 + 680 + 120;
    this.scene.time.delayedCall(total, onComplete);
  }

  /** Текстура кольца (белая, красится через tint). */
  private ensureRingTexture(): void {
    if (this.scene.textures.exists(TEX_FX_RING)) return;

    const g = this.scene.add.graphics();
    g.lineStyle(14, 0xffffff, 1);
    g.strokeCircle(128, 128, 108);
    g.lineStyle(6, 0xffffff, 0.5);
    g.strokeCircle(128, 128, 88);
    g.generateTexture(TEX_FX_RING, 256, 256);
    g.destroy();
  }
}
