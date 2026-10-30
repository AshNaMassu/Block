/**
 * CleansingFx — церемония Очищения (T-042, GDD-2 §13; DESIGN-neon-alchemy §11).
 *
 * Фазы (DES-8, «Момент Очищения»):
 * 1. Экран слегка темнеет + вспышка цветом стихии (чистое — золото).
 * 2. Концентрические круги от центра поля (число = 1 + overflow).
 * 3. В пик вспышки — onPeak: вызывающий схлопывает слоты шкалы (EnergyView).
 * 4. Крупная надпись «ОЧИЩЕНИЕ» в центре поля.
 * 5. Звезда летит в счётчик HUD, радужные чипы — в бонусные слоты руки.
 *
 * Длительность ~1.6–1.9 с. Кольца через FxPool (object pool).
 */
import type Phaser from 'phaser';
import type { ElementId } from '../../core/types';
import {
  BOARD_PIXEL_SIZE,
  BOARD_TOP,
  BOARD_X,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  HAND_SLOTS,
  HUD_STARS_X,
  HUD_STARS_Y,
  ENERGY_Y,
} from '../layout';
import { COLOR_GOLD, COLOR_OVERLAY, ELEMENT_COLORS, FONT_FAMILY } from '../../config/elements';
import { TEX_FX_RING, TEX_RAINBOW } from '../textures';
import { FxPool } from './FxPool';

/** Опции церемонии: схлопывание слотов и полёты наград. */
export interface CleansingCeremonyOptions {
  /** Пик вспышки (схлопывание слотов шкалы на вызывающей стороне). */
  onPeak?: () => void;
  /** Сколько звёзд летит в счётчик HUD (0 — не летит). */
  stars?: number;
  /** Сколько радужных чипов летит в бонусные слоты (кап 3). */
  rainbows?: number;
}

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
   * @param onComplete финал церемонии (~1.6–1.9 с)
   * @param opts схлопывание слотов + полёты наград (DES-8)
   */
  play(
    element: ElementId,
    overflow: number,
    isPure: boolean,
    onComplete: () => void,
    opts: CleansingCeremonyOptions = {},
  ): void {
    const baseColor = ELEMENT_COLORS[element]!;
    const color = isPure ? COLOR_GOLD : baseColor;
    const cx = BOARD_X + BOARD_PIXEL_SIZE / 2;
    const cy = BOARD_TOP + BOARD_PIXEL_SIZE / 2;

    // Фаза 1a. Лёгкое затемнение экрана (держится до финала церемонии).
    const dim = this.scene.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR_OVERLAY, 1)
      .setOrigin(0)
      .setDepth(240)
      .setAlpha(0);
    this.scene.tweens.add({ targets: dim, alpha: 0.45, duration: 250, ease: 'Quad.Out' });

    // Фаза 1b. Полноэкранная вспышка.
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
    this.scene.time.delayedCall(130, () => opts.onPeak?.());

    // Лёгкая тряска экрана.
    this.scene.cameras.main.shake(260, 0.006);

    // Фаза 2. Концентрические круги: число = 1 + overflow (GDD-2 §13).
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

    // Фаза 4. Крупная надпись «ОЧИЩЕНИЕ» (DESIGN §11 п.4).
    const label = this.scene.add
      .text(DESIGN_WIDTH / 2, cy - 60, 'ОЧИЩЕНИЕ', {
        fontFamily: FONT_FAMILY,
        fontSize: '92px',
        color: this.hex(COLOR_GOLD),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(255)
      .setScale(0.3)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: label,
      scale: 1,
      alpha: 1,
      duration: 420,
      delay: 480,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      scale: 1.15,
      duration: 320,
      delay: 1350,
      ease: 'Quad.In',
      onComplete: () => label.destroy(),
    });

    // Фаза 5a. Звезда летит в счётчик HUD (DESIGN §11: «звёздочка летит в верхний счётчик»).
    const stars = Math.max(0, Math.min(opts.stars ?? 0, 3));
    for (let i = 0; i < stars; i++) {
      const star = this.scene.add
        .text(DESIGN_WIDTH / 2, ENERGY_Y, '★', {
          fontFamily: FONT_FAMILY,
          fontSize: '64px',
          color: this.hex(COLOR_GOLD),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(255);
      this.scene.tweens.add({
        targets: star,
        x: HUD_STARS_X,
        y: HUD_STARS_Y,
        scale: 0.7,
        alpha: { from: 1, to: 0.15 },
        duration: 620,
        delay: 900 + i * 140,
        ease: 'Cubic.EaseIn',
        onComplete: () => star.destroy(),
      });
    }

    // Фаза 5b. Радужные чипы падают в бонусные слоты руки (кап 3 слота).
    const rainbows = Math.max(0, Math.min(opts.rainbows ?? 0, 3));
    for (let i = 0; i < rainbows; i++) {
      const slot = HAND_SLOTS[3 + i]!;
      const chip = this.scene.add
        .image(DESIGN_WIDTH / 2, ENERGY_Y, TEX_RAINBOW)
        .setDepth(255)
        .setScale(0.4);
      this.scene.tweens.add({
        targets: chip,
        x: slot.x,
        y: slot.y,
        scale: 0.9,
        duration: 560,
        delay: 1000 + i * 120,
        ease: 'Cubic.EaseIn',
        onComplete: () => {
          // Мягкий «пшик» на прилёте в слот.
          this.scene.tweens.add({
            targets: chip,
            alpha: 0,
            duration: 200,
            onComplete: () => chip.destroy(),
          });
        },
      });
    }

    // Финал: затемнение уходит, вызывающий обновляет шкалу/ввод.
    const total = 1750 + Math.max(stars - 1, 0) * 140 + Math.max(rainbows - 1, 0) * 120;
    this.scene.time.delayedCall(total, () => {
      this.scene.tweens.add({
        targets: dim,
        alpha: 0,
        duration: 280,
        ease: 'Quad.In',
        onComplete: () => {
          dim.destroy();
          onComplete();
        },
      });
    });
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

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
