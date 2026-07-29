/**
 * Button — простая UI-кнопка (rounded rect + текст).
 *
 * Greybox: рисуется через Graphics (без ассетов). Используется в MenuScene
 * и в game-over оверлете GameScene. Переиспользуемый — все параметры через
 * конфиг.
 *
 * В Milestone 3 (polish) можно заменить на текстуру/атлас.
 */
import Phaser from 'phaser';
import { COLOR_BUTTON, COLOR_BUTTON_HOVER, COLOR_TEXT } from '../../config/elements';

export interface ButtonStyle {
  width: number;
  height: number;
  fontSize: number;
  fillColor: number;
  hoverColor: number;
  textColor: number;
  radius: number;
}

const DEFAULT_STYLE: ButtonStyle = {
  width: 520,
  height: 130,
  fontSize: 48,
  fillColor: COLOR_BUTTON,
  hoverColor: COLOR_BUTTON_HOVER,
  textColor: COLOR_TEXT,
  radius: 24,
};

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
    this.style = { ...DEFAULT_STYLE, ...style };

    this.bg = scene.add.graphics();
    this.drawBg(this.style.fillColor);

    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: `${this.style.fontSize}px`,
        color: this.colorToHex(this.style.textColor),
        align: 'center',
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);

    const hitArea = new Phaser.Geom.Rectangle(
      -this.style.width / 2,
      -this.style.height / 2,
      this.style.width,
      this.style.height,
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
    const { width, height, radius } = this.style;
    this.bg.clear();
    this.bg.fillStyle(color, this.enabled ? 1 : 0.5);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  }

  private colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
