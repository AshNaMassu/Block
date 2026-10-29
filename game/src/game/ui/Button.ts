/**
 * Button — UI-кнопка (конфетный стиль: скругление + тёмный нижний край-объём).
 *
 * Рисуется через Graphics (без ассетов). Основная кнопка — тёплый оранжевый
 * с белым текстом; вторичная — светлая с тёмным текстом (fillColor override).
 * Переиспользуемая — все параметры через конфиг.
 */
import Phaser from 'phaser';
import {
  COLOR_BUTTON,
  COLOR_BUTTON_EDGE,
  COLOR_BUTTON_HOVER,
  COLOR_BUTTON_TEXT,
  COLOR_PANEL_SHADOW,
  darken,
} from '../../config/elements';

export interface ButtonStyle {
  width: number;
  height: number;
  fontSize: number;
  fillColor: number;
  hoverColor: number;
  /** Тёмный нижний край (объём). */
  edgeColor: number;
  textColor: number;
  radius: number;
}

const DEFAULT_STYLE: ButtonStyle = {
  width: 520,
  height: 130,
  fontSize: 48,
  fillColor: COLOR_BUTTON,
  hoverColor: COLOR_BUTTON_HOVER,
  edgeColor: COLOR_BUTTON_EDGE,
  textColor: COLOR_BUTTON_TEXT,
  radius: 28,
};

/** Глубина края-объёма (px). */
const EDGE_DEPTH = 8;

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly style: ButtonStyle;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    style: Partial<ButtonStyle> = {},
  ) {
    super(scene, x, y);
    this.style = {
      ...DEFAULT_STYLE,
      ...style,
      // Если задан fillColor без edgeColor — край считаем от него.
      ...(style.fillColor && !style.edgeColor ? { edgeColor: darken(style.fillColor, 0.25) } : {}),
    };

    this.bg = scene.add.graphics();
    this.drawBg(this.style.fillColor);

    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: `${this.style.fontSize}px`,
        color: `#${this.style.textColor.toString(16).padStart(6, '0')}`,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.label.setY(-EDGE_DEPTH / 2);

    const hitArea = new Phaser.Geom.Rectangle(
      -this.style.width / 2,
      -this.style.height / 2,
      this.style.width,
      this.style.height + EDGE_DEPTH,
    );
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this.on('pointerover', () => {
      if (this.enabled) this.drawBg(this.style.hoverColor);
    });
    this.on('pointerout', () => {
      if (this.enabled) this.drawBg(this.style.fillColor);
    });
    this.on('pointerdown', () => {
      if (this.enabled) onClick();
    });

    scene.add.existing(this);
  }

  /** Включить/выключить кнопку (disabled — приглушён). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.label.setAlpha(enabled ? 1 : 0.4);
    this.drawBg(this.style.fillColor);
  }

  /** Изменить текст. */
  setText(text: string): void {
    this.label.setText(text);
  }

  private drawBg(color: number): void {
    const { width, height, radius, edgeColor } = this.style;
    const alpha = this.enabled ? 1 : 0.5;
    this.bg.clear();

    // Мягкая тень под кнопкой.
    this.bg.fillStyle(COLOR_PANEL_SHADOW, 0.22 * alpha);
    this.bg.fillRoundedRect(-width / 2 + 4, -height / 2 + 10, width, height, radius);

    // Тёмный край-объём (снизу).
    this.bg.fillStyle(edgeColor, alpha);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    // Основная плашка (приподнята на глубину края).
    this.bg.fillStyle(color, alpha);
    this.bg.fillRoundedRect(-width / 2, -height / 2 - EDGE_DEPTH, width, height, radius);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height - EDGE_DEPTH, radius);

    // Светлый верхний блик.
    this.bg.fillStyle(0xffffff, 0.22 * alpha);
    this.bg.fillRoundedRect(-width / 2 + 6, -height / 2 - EDGE_DEPTH + 5, width - 12, 10, 5);
  }
}
