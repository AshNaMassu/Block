/**
 * FuryView — индикатор активного Fury Mode (GDD-2 v1.3 секция 4.6).
 *
 * Показывает таймер (сколько секунд осталось) и множитель (×1.5..5.0).
 * Подсветка цветом стихии Очищения, запустившего Fury. Когда Fury не активен —
 * скрыт.
 *
 * `update(fury, now)` пересчитывает по timestamp (fury.until — Unix-millis).
 * Анимация пульсации — признак активного Fury (полировка ауры поля — T-045/M3).
 */
import Phaser from 'phaser';
import type { FuryState } from '../../core/types';
import { tickFury } from '../../core/fury';
import { COLOR_GOLD, ELEMENT_COLORS } from '../../config/elements';
import { FURY_X, FURY_Y } from '../layout';

export class FuryView extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly aura: Phaser.GameObjects.Graphics;
  private readonly auraColor: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    super(scene, FURY_X, FURY_Y);

    // Аура-кольцо (видна только в Fury).
    this.aura = scene.add.graphics();
    this.auraColor = scene.add.graphics();
    this.add([this.auraColor, this.aura]);

    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '40px',
        color: this.hex(COLOR_GOLD),
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
      return;
    }
    this.setVisible(true);

    const remainSec = Math.max(0, Math.ceil((active.until - now) / 1000));
    this.label.setText(`FURY  ×${active.mult.toFixed(1)}  ${remainSec}s`);
    this.label.setColor(this.hex(ELEMENT_COLORS[active.element]!));

    // Перерисовать ауру-кольцо цветом стихии.
    this.aura.clear();
    this.aura.lineStyle(4, COLOR_GOLD, 0.9);
    this.aura.strokeCircle(0, 0, 70);
    this.auraColor.clear();
    this.auraColor.lineStyle(10, ELEMENT_COLORS[active.element]!, 0.35);
    this.auraColor.strokeCircle(0, 0, 70);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
