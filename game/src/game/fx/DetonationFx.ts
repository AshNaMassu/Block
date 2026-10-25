/**
 * DetonationFx — визуал детонации спецфигуры-детонатора.
 *
 * Разрушенные клетки: белая вспышка + схлопывание (уходят в пустоту).
 * Клетки следа (seeded): pop-in цветом стихии детонатора.
 * Перекрашенные (Родник): короткая вспышка цветом стихии.
 * Vortex: волна схлопывания по всем сметённым клеткам (от центра постановки).
 *
 * Greybox-версия под редизайн детонаторов; использует FxPool для вспышек.
 */
import type Phaser from 'phaser';
import type { DetonationResult } from '../../core/types';
import { ELEMENT_COLORS } from '../../config/elements';
import { BOARD_TOP, BOARD_X, CELL_SIZE } from '../layout';
import { TEX_FX_GLOW } from '../textures';
import type { BoardView } from '../objects/BoardView';
import { FxPool } from './FxPool';

export class DetonationFx {
  private readonly scene: Phaser.Scene;
  private readonly boardView: BoardView;
  private readonly glowPool: FxPool;

  constructor(scene: Phaser.Scene, boardView: BoardView) {
    this.scene = scene;
    this.boardView = boardView;
    this.glowPool = new FxPool(scene, TEX_FX_GLOW);
  }

  /**
   * Проиграть детонацию. Вызывает onComplete, когда анимация завершена.
   * Клетки поля НЕ перерисовывает — это делает GameScene.refreshBoard() после.
   */
  play(d: DetonationResult, onComplete: () => void): void {
    // Считаем завершения заранее: разрушенная с видимой заливкой = tween + вспышка,
    // без заливки = вспышка; след/перекраска = вспышка + таймер (клетку рисует refreshBoard).
    let pending = 0;
    for (const c of d.destroyed) {
      const cell = this.boardView.getCell(c.x, c.y);
      pending += cell && cell.getFill().visible ? 2 : 1;
    }
    pending += d.seeded.length * 2;
    pending += d.repainted.length * 2;

    if (pending === 0) {
      onComplete();
      return;
    }

    let done = false;
    const step = () => {
      pending--;
      if (pending === 0 && !done) {
        done = true;
        onComplete();
      }
    };

    const elementColor = ELEMENT_COLORS[d.element]!;

    // Разрушенные: белая вспышка + схлопывание заливки.
    for (const c of d.destroyed) {
      const cell = this.boardView.getCell(c.x, c.y);
      if (!cell) {
        step();
        continue;
      }
      const img = cell.getFill();
      this.playBurst(c.x, c.y, 0xffffff, step);
      if (!img.visible) continue;
      this.scene.tweens.add({
        targets: img,
        alpha: 0,
        scaleX: img.scaleX * 1.3,
        scaleY: img.scaleY * 1.3,
        duration: 220,
        ease: 'Quad.Out',
        onComplete: () => {
          img.setAlpha(1);
          img.setScale(img.scaleX / 1.3, img.scaleY / 1.3);
          img.setVisible(false);
          step();
        },
      });
    }

    // След: pop-in цветом стихии (клетку рисует refreshBoard, тут только вспышка).
    for (const c of d.seeded) {
      this.playBurst(c.x, c.y, elementColor, step);
      this.scene.time.delayedCall(180, step);
    }

    // Перекраска (Родник): мягкая вспышка цветом стихии.
    for (const c of d.repainted) {
      this.playBurst(c.x, c.y, elementColor, step);
      this.scene.time.delayedCall(140, step);
    }
  }

  /** Вспышка-глоу над клеткой. onDone вызывается в конце анимации. */
  private playBurst(x: number, y: number, color: number, onDone?: () => void): void {
    const px = BOARD_X + x * CELL_SIZE + CELL_SIZE / 2;
    const py = BOARD_TOP + y * CELL_SIZE + CELL_SIZE / 2;
    const glow = this.glowPool.acquire();
    glow.setPosition(px, py);
    glow.setDepth(150);
    glow.setTint(color);
    glow.setAlpha(0);
    glow.setScale(0.4);

    this.scene.tweens.add({
      targets: glow,
      alpha: 0.9,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 160,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: glow,
          alpha: 0,
          scaleX: 1.9,
          scaleY: 1.9,
          duration: 220,
          ease: 'Quad.In',
          onComplete: () => {
            this.glowPool.release(glow);
            onDone?.();
          },
        });
      },
    });
  }
}
