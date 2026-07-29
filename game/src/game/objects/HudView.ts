/**
 * HudView — верхняя панель: score, best, stars, multiplier.
 *
 * `update(state, currentMult)` обновляет значения. Текст через Text
 * (без ассетов). Fury-таймер — в Фазе Б (FuryView).
 */
import Phaser from 'phaser';
import type { GameState } from '../../core/types';
import { COLOR_TEXT, COLOR_TEXT_DIM, COLOR_GOLD } from '../../config/elements';
import {
  HUD_BEST_X,
  HUD_BEST_Y,
  HUD_MULTIPLIER_Y,
  HUD_SCORE_X,
  HUD_SCORE_Y,
  HUD_STARS_X,
  HUD_STARS_Y,
} from '../layout';

export class HudView extends Phaser.GameObjects.Container {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly bestText: Phaser.GameObjects.Text;
  private readonly starsText: Phaser.GameObjects.Text;
  private readonly multText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.scoreText = this.makeText(HUD_SCORE_X, HUD_SCORE_Y, '0', '72px', COLOR_TEXT).setOrigin(
      0,
      0.5,
    );
    this.bestText = this.makeText(
      HUD_BEST_X,
      HUD_BEST_Y,
      'РЕКОРД 0',
      '32px',
      COLOR_TEXT_DIM,
    ).setOrigin(1, 0.5);
    this.starsText = this.makeText(HUD_STARS_X, HUD_STARS_Y, '★ 0', '48px', COLOR_GOLD).setOrigin(
      0.5,
      0.5,
    );
    this.multText = this.makeText(
      HUD_STARS_X,
      HUD_MULTIPLIER_Y,
      '×2.0',
      '40px',
      COLOR_TEXT_DIM,
    ).setOrigin(0.5, 0.5);

    this.add([this.scoreText, this.bestText, this.starsText, this.multText]);
    scene.add.existing(this);
  }

  /** Обновить значения из состояния и текущего множителя. */
  update(state: GameState, currentMult: number): void {
    this.scoreText.setText(this.formatNumber(state.score));
    this.bestText.setText(`РЕКОРД ${this.formatNumber(state.best)}`);
    this.starsText.setText(`★ ${state.stars}`);
    this.multText.setText(`×${currentMult.toFixed(1)}`);
    // Подсветка множителя в Fury (когда > базового).
    this.multText.setColor(currentMult > 2.0 ? this.hex(COLOR_GOLD) : this.hex(COLOR_TEXT_DIM));
  }

  private makeText(
    x: number,
    y: number,
    text: string,
    fontSize: string,
    color: number,
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontFamily: 'system-ui, Arial, sans-serif',
      fontSize,
      color: this.hex(color),
    });
  }

  private formatNumber(n: number): string {
    return n.toLocaleString('ru-RU');
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
