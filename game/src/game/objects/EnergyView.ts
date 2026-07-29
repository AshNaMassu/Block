/**
 * EnergyView — шкала Энергии (3 слота стихий, GDD-2 v1.3 секция 4.1).
 *
 * Стихийные линии заполняют слоты стихией линии. При 3/3 (или переполнении) —
 * Очищение (Ось В). View только отображает energy.slots (ElementId[] длиной 0..3);
 * логику добавления/очищения считает core.
 *
 * `update(slots)` перерисовывает слоты. Пустой — тёмный фон, заполненный —
 * текстура стихии. КапACITY = 3 (config/balance ENERGY_CAPACITY).
 */
import Phaser from 'phaser';
import type { EnergyState } from '../../core/types';
import { ENERGY_CAPACITY } from '../../config/balance';
import { COLOR_CELL_EMPTY } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import { ENERGY_GAP, ENERGY_SLOT_SIZE, ENERGY_Y, energySlotX } from '../layout';
import { cellTextureKey } from '../textures';

export class EnergyView extends Phaser.GameObjects.Container {
  private readonly slots: Phaser.GameObjects.Container[] = [];
  private readonly fills: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    for (let i = 0; i < ENERGY_CAPACITY; i++) {
      const x = energySlotX(i, ENERGY_CAPACITY);
      const container = scene.add.container(x, ENERGY_Y);

      // Фон-рамка слота.
      const bg = scene.add.graphics();
      bg.fillStyle(COLOR_CELL_EMPTY, 0.5);
      bg.fillRoundedRect(
        -ENERGY_SLOT_SIZE / 2,
        -ENERGY_SLOT_SIZE / 2,
        ENERGY_SLOT_SIZE,
        ENERGY_SLOT_SIZE,
        CELL_RADIUS,
      );
      bg.lineStyle(2, 0x4a4870, 0.8);
      bg.strokeRoundedRect(
        -ENERGY_SLOT_SIZE / 2 + 1,
        -ENERGY_SLOT_SIZE / 2 + 1,
        ENERGY_SLOT_SIZE - 2,
        ENERGY_SLOT_SIZE - 2,
        CELL_RADIUS,
      );
      container.add(bg);

      // Image стихии поверх (изначально скрыт).
      const fill = scene.add
        .image(0, 0, cellTextureKey(0))
        .setVisible(false)
        .setDisplaySize(ENERGY_SLOT_SIZE - 8, ENERGY_SLOT_SIZE - 8);
      container.add(fill);

      this.slots.push(container);
      this.fills.push(fill);
      this.add(container);
    }

    scene.add.existing(this);
  }

  /** Обновить слоты из состояния Энергии. */
  update(energy: EnergyState): void {
    const slots = energy.slots;
    for (let i = 0; i < ENERGY_CAPACITY; i++) {
      const fill = this.fills[i]!;
      if (i < slots.length && slots[i] !== undefined) {
        fill.setTexture(cellTextureKey(slots[i]!));
        fill.setVisible(true);
      } else {
        fill.setVisible(false);
      }
    }
  }
}

/** Зазор (ре-экспорт для расчётов вне модуля). */
export const ENERGY_SLOT_GAP = ENERGY_GAP;
