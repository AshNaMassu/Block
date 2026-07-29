/**
 * BootScene — точка входа Phaser.
 *
 * Готовит фон, прячет DOM-заглушку «Загрузка…» и сразу переходит в Preload.
 * Инициализация платформы (Yandex SDK) будет здесь в Milestone 4 (T-050/T-052);
 * сейчас platform-слой — greybox-стаб storage.
 */
import Phaser from 'phaser';
import { COLOR_BG } from '../../config/elements';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);
    this.hideBootDom();
    this.scene.start('Preload');
  }

  /** Скрыть DOM-заглушку из index.html. */
  private hideBootDom(): void {
    const boot = document.getElementById('boot');
    if (boot) boot.style.display = 'none';
  }
}
