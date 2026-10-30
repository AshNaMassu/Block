/**
 * FuryView — визуал Fury Mode (GDD-2 §4.6; DESIGN-neon-alchemy §12, DES-9).
 *
 * - Компактный таймер-чип у шкалы Энергии: «FURY ×3.2 41s» в градиентных
 *   цветах Fury (золото → розовый, чип с двойной обводкой).
 * - Мягкая золотисто-розовая рамка вокруг поля (пульс, не полноэкранная вспышка).
 * - Последние 5 секунд: таймер пульсирует, рамка гаснет.
 *
 * `update(fury, now)` пересчитывает по timestamp (fury.until — Unix-millis).
 */
import Phaser from 'phaser';
import type { FuryState } from '../../core/types';
import { tickFury } from '../../core/fury';
import {
  FONT_FAMILY,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  ELEMENT_COLORS,
} from '../../config/elements';
import { BOARD_PIXEL_SIZE, BOARD_TOP, BOARD_X, FURY_X, FURY_Y } from '../layout';

/** Градиент Fury (DESIGN §12): золото → оранж → розовый. */
const FURY_GOLD = 0xffc24d;
const FURY_PINK = 0xff4da6;

/** Отступ рамки поля наружу от панели (панель = BOARD ± 24). */
const FRAME_PAD = 14;

/** Когда начинается затухание (DESIGN §12: последние 5 секунд). */
const WIND_DOWN_SEC = 5;

export class FuryView extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly chip: Phaser.GameObjects.Graphics;
  private readonly chipEdge: Phaser.GameObjects.Graphics;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly frameInner: Phaser.GameObjects.Graphics;
  private wasActive = false;

  constructor(scene: Phaser.Scene) {
    super(scene, FURY_X, FURY_Y);

    // Рамка поля: две обводки (золото + розовый) — читается как мягкий градиент.
    this.frame = scene.add.graphics();
    this.frameInner = scene.add.graphics();
    const x0 = BOARD_X - 24 - FRAME_PAD;
    const y0 = BOARD_TOP - 24 - FRAME_PAD;
    const w = BOARD_PIXEL_SIZE + 24 * 2 + FRAME_PAD * 2;
    this.frame.lineStyle(8, FURY_GOLD, 1);
    this.frame.strokeRoundedRect(x0, y0, w, w, 40);
    this.frameInner.lineStyle(4, FURY_PINK, 1);
    this.frameInner.strokeRoundedRect(x0 + 8, y0 + 8, w - 16, w - 16, 34);
    this.frame.setVisible(false);
    this.frameInner.setVisible(false);
    scene.add.existing(this.frame);
    scene.add.existing(this.frameInner);

    // Подложка-чип под текст: тёмный с двойной кромкой Fury.
    this.chip = scene.add.graphics();
    this.chipEdge = scene.add.graphics();
    this.drawChip();
    this.add([this.chip, this.chipEdge]);

    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '38px',
        color: this.hex(FURY_GOLD),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.add(this.label);

    scene.add.existing(this);
  }

  /** Обновить по Fury-состоянию и текущему timestamp. */
  update(fury: FuryState | null, now: number): void {
    const active = tickFury(fury, now);
    if (!active) {
      this.setVisible(false);
      this.frame.setVisible(false);
      this.frameInner.setVisible(false);
      this.wasActive = false;
      return;
    }
    this.setVisible(true);
    this.frame.setVisible(true);
    this.frameInner.setVisible(true);

    // Pop-in при старте Fury.
    if (!this.wasActive) {
      this.wasActive = true;
      this.setScale(0.5);
      this.setAlpha(0);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 380,
        ease: 'Back.Out',
      });
    }

    const remainSec = Math.max(0, Math.ceil((active.until - now) / 1000));
    const windDown = remainSec <= WIND_DOWN_SEC;

    this.label.setText(`FURY ×${active.mult.toFixed(1)}  ${remainSec}s`);
    // Цвет таймера: стихия Очищения, в затухании — розовый (тревога).
    this.label.setColor(this.hex(windDown ? FURY_PINK : ELEMENT_COLORS[active.element]!));

    // Пульс: постоянный мягкий у рамки; в затухании сильный у таймера, рамка гаснет.
    const t = now / 1000;
    const softPulse = 0.55 + 0.2 * Math.sin(t * 4);
    this.frame.setAlpha(windDown ? 0.18 : softPulse);
    this.frameInner.setAlpha(windDown ? 0.12 : softPulse * 0.8);

    if (windDown) {
      const beat = 1 + 0.08 * Math.sin(t * 8);
      this.label.setScale(beat);
    } else {
      this.label.setScale(1);
    }
  }

  /** Двойная кромка чипа: золото снаружи, розовый внутри (градиент Fury). */
  private drawChip(): void {
    this.chip.clear();
    this.chip.fillStyle(COLOR_PANEL_SHADOW, 0.2);
    this.chip.fillRoundedRect(-158, -34, 316, 68, 34);
    this.chip.fillStyle(COLOR_PANEL, 0.96);
    this.chip.fillRoundedRect(-160, -36, 316, 68, 34);
    this.chipEdge.clear();
    this.chipEdge.lineStyle(3, FURY_GOLD, 0.9);
    this.chipEdge.strokeRoundedRect(-160, -36, 316, 68, 34);
    this.chipEdge.lineStyle(2, FURY_PINK, 0.7);
    this.chipEdge.strokeRoundedRect(-154, -30, 304, 56, 28);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
