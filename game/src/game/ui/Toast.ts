/**
 * Toast — очередь всплывающих сообщений (T-042/T-043/T-044).
 *
 * Используется GameScene для наград: комбо (Ось Б), очищение (Ось В),
 * чистое очищение (Ось Г), мелкие тосты за линии. Один переиспользуемый
 * контейнер (без создания объектов на каждый тост), очередь с последовательным
 * показом.
 */
import Phaser from 'phaser';
import { COLOR_BG, COLOR_TEXT_DIM } from '../../config/elements';
import { DESIGN_WIDTH } from '../layout';

/** Данные одного тоста. */
export interface ToastData {
  /** Главный текст (крупно, цветом accent). */
  title: string;
  /** Вторичный текст (мелко, приглушённо). */
  subtitle?: string;
  /** Акцентный цвет (рамка + заголовок). */
  accent: number;
  /** Крупный тост (комбо/очищение) — дольше висит. */
  big?: boolean;
}

/** Центр тоста по Y (над верхней частью поля). */
const TOAST_Y = 640;

export class ToastManager {
  private readonly scene: Phaser.Scene;
  private readonly queue: ToastData[] = [];
  private playing = false;

  private readonly panel: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.panel = scene.add.container(DESIGN_WIDTH / 2, TOAST_Y).setDepth(300).setVisible(false);

    this.bg = scene.add.graphics();

    this.titleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.subtitleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '36px',
        color: this.hex(COLOR_TEXT_DIM),
      })
      .setOrigin(0.5);

    this.panel.add([this.bg, this.titleText, this.subtitleText]);
  }

  /** Поставить тосты в очередь (показываются последовательно). */
  showAll(toasts: ToastData[]): void {
    this.queue.push(...toasts);
    this.playNext();
  }

  private playNext(): void {
    if (this.playing) return;

    const toast = this.queue.shift();
    if (!toast) return;

    this.playing = true;
    this.render(toast);

    const hold = toast.big ? 1100 : 700;

    this.panel.setAlpha(0);
    this.panel.setY(TOAST_Y - 40);
    this.panel.setVisible(true);

    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      y: TOAST_Y,
      duration: 180,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.scene.time.delayedCall(hold, () => {
          this.scene.tweens.add({
            targets: this.panel,
            alpha: 0,
            y: TOAST_Y - 30,
            duration: 260,
            ease: 'Cubic.In',
            onComplete: () => {
              this.panel.setVisible(false);
              this.playing = false;
              this.playNext();
            },
          });
        });
      },
    });
  }

  private render(toast: ToastData): void {
    this.titleText.setText(toast.title);
    this.titleText.setColor(this.hex(toast.accent));
    this.titleText.setFontSize(toast.big ? 60 : 48);

    const hasSubtitle = toast.subtitle !== undefined && toast.subtitle.length > 0;
    this.subtitleText.setVisible(hasSubtitle);
    if (hasSubtitle) {
      this.subtitleText.setText(toast.subtitle!);
    }

    this.titleText.setY(hasSubtitle ? -34 : 0);
    this.subtitleText.setY(42);

    const padX = 48;
    const width =
      Math.max(this.titleText.width, hasSubtitle ? this.subtitleText.width : 0) + padX * 2;
    const height = hasSubtitle ? 156 : 104;

    this.bg.clear();
    this.bg.fillStyle(COLOR_BG, 0.85);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
    this.bg.lineStyle(3, toast.accent, 0.9);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
