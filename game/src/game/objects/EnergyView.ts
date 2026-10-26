/**
 * EnergyView — шкала Энергии (3 слота стихий, GDD-2 v1.3 секция 4.1).
 *
 * Стихийные линии заполняют слоты стихией линии. При 3/3 (или переполнении) —
 * Очищение (Ось В). View только отображает energy.slots (ElementId[] длиной 0..3);
 * логику добавления/очищения считает core.
 *
 * Анимации (T-042): новый слот появляется с pop-эффектом, при очищении
 * слоты «стекают» (уменьшение + fade).
 */
import Phaser from 'phaser';
import type { EnergyState } from '../../core/types';
import { ENERGY_CAPACITY } from '../../config/balance';
import { COLOR_CELL_EMPTY, COLOR_GRID } from '../../config/elements';
import { CELL_RADIUS, ENERGY_GAP, ENERGY_SLOT_SIZE, ENERGY_Y, energySlotX } from '../layout';
import { TEX_CELL_SIZE, cellTextureKey } from '../textures';

export class EnergyView extends Phaser.GameObjects.Container {
  private readonly fills: Phaser.GameObjects.Image[] = [];
  private readonly fillScale: number;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.fillScale = (ENERGY_SLOT_SIZE - 8) / TEX_CELL_SIZE;

    for (let i = 0; i < ENERGY_CAPACITY; i++) {
      const x = energySlotX(i, ENERGY_CAPACITY);
      const container = scene.add.container(x, ENERGY_Y);

      // Фон-рамка слота.
      const bg = scene.add.graphics();
      bg.fillStyle(COLOR_CELL_EMPTY, 0.9);
      bg.fillRoundedRect(
        -ENERGY_SLOT_SIZE / 2,
        -ENERGY_SLOT_SIZE / 2,
        ENERGY_SLOT_SIZE,
        ENERGY_SLOT_SIZE,
        CELL_RADIUS,
      );
      bg.lineStyle(2, COLOR_GRID, 0.9);
      bg.strokeRoundedRect(
        -ENERGY_SLOT_SIZE / 2 + 1,
        -ENERGY_SLOT_SIZE / 2 + 1,
        ENERGY_SLOT_SIZE - 2,
        ENERGY_SLOT_SIZE - 2,
        CELL_RADIUS,
      );
      container.add(bg);

      // Image стихии поверх (изначально скрыт).
      const fill = scene.add.image(0, 0, cellTextureKey(0)).setVisible(false);
      fill.setScale(this.fillScale);
      container.add(fill);

      this.fills.push(fill);
      this.add(container);
    }

    scene.add.existing(this);
  }

  /** Обновить слоты из состояния Энергии (с анимациями появления/потребления). */
  update(energy: EnergyState): void {
    const slots = energy.slots;

    for (let i = 0; i < ENERGY_CAPACITY; i++) {
      const fill = this.fills[i]!;
      const wasVisible = fill.visible;
      const nowFilled = i < slots.length && slots[i] !== undefined;

      if (nowFilled) {
        fill.setTexture(cellTextureKey(slots[i]!));
        fill.setVisible(true);

        if (!wasVisible) {
          // Pop-in нового слота.
          fill.setScale(0);
          fill.setAlpha(1);
          this.scene.tweens.add({
            targets: fill,
            scaleX: this.fillScale,
            scaleY: this.fillScale,
            duration: 280,
            ease: 'Back.Out',
          });
        }
      } else if (wasVisible) {
        // Потребление (очищение): слот «стекает».
        this.scene.tweens.add({
          targets: fill,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 340,
          ease: 'Quad.In',
          onComplete: () => {
            fill.setVisible(false);
            fill.setAlpha(1);
            fill.setScale(this.fillScale);
          },
        });
      }
    }
  }
}

/** Зазор (ре-экспорт для расчётов вне модуля). */
export const ENERGY_SLOT_GAP = ENERGY_GAP;
