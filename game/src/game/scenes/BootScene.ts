/**
 * BootScene — точка входа Phaser.
 *
 * Готовит фон, прячет DOM-заглушку «Загрузка…» и сразу переходит в Preload.
 * Инициализация платформы (Yandex SDK) будет здесь в Milestone 4 (T-050/T-052);
 * сейчас platform-слой — greybox-стаб storage.
 */
import Phaser from 'phaser';
import { COLOR_BG, FONT_FAMILY } from '../../config/elements';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);
    this.hideBootDom();
    this.waitForFonts(() => this.scene.start('Preload'));
  }

  /**
   * Ждать загрузку Manrope (document.fonts.ready), чтобы Phaser не отрисовал
   * первые тексты системным шрифтом. Таймаут-фоллбэк 1.5с — игра не ждёт вечно.
   */
  private waitForFonts(next: () => void): void {
    let done = false;
    const finish = (): void => {
      if (!done) {
        done = true;
        next();
      }
    };
    this.time.delayedCall(1500, finish);
    void document.fonts
      .load(`700 32px ${FONT_FAMILY}`, 'ЯЯЯ 000')
      .then(() => document.fonts.ready)
      .then(finish)
      .catch(() => {
        /* фоллбэк — таймаут стартует Preload */
      });
  }

  /** Скрыть DOM-заглушку из index.html. */
  private hideBootDom(): void {
    const boot = document.getElementById('boot');
    if (boot) boot.style.display = 'none';
  }
}
