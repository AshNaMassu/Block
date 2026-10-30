/**
 * EnergyView — шкала Энергии (3 слота стихий, GDD-2 v1.3 секция 4.1; DESIGN §11).
 *
 * Стихийные линии заполняют слоты стихией линии. При 3/3 (или переполнении) —
 * Очищение (Ось В). View только отображает energy.slots (ElementId[] длиной 0..3);
 * логику добавления/очищения считает core.
 *
 * Анимации: слот заполняется по прилёту молнии (EnergyBoltFx, DES-7) — pop-эффект,
 * при очищении слоты «стекают» (уменьшение + fade). Пустой слот хранит бледную
 * молнию-иконку (DESIGN §11: «внутри бледная молния»).
 *
 * Переполнение (DES-7): showOverflow показывает золотые пипсы «+N» и будущий
 * множитель «Fury ×M» над шкалой на время церемонии Очищения.
 */
import Phaser from 'phaser';
import type { EnergyState } from '../../core/types';
import {
  COLOR_CELL_EMPTY,
  COLOR_GRID,
  COLOR_GOLD,
  COLOR_TEXT_DIM,
  FONT_FAMILY,
} from '../../config/elements';
import { ENERGY_CAPACITY } from '../../config/balance';
import {
  CELL_RADIUS,
  DESIGN_WIDTH,
  ENERGY_GAP,
  ENERGY_OVERFLOW_Y,
  ENERGY_SLOT_SIZE,
  ENERGY_Y,
  energySlotX,
} from '../layout';
import { TEX_CELL_SIZE, TEX_FX_BOLT, cellTextureKey } from '../textures';
import { ensureBoltTexture } from '../fx/EnergyBoltFx';

export class EnergyView extends Phaser.GameObjects.Container {
  private readonly fills: Phaser.GameObjects.Image[] = [];
  private readonly emptyBolts: Phaser.GameObjects.Image[] = [];
  private readonly fillScale: number;
  private overflowGroup: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    ensureBoltTexture(scene);
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

      // Бледная молния в пустом слоте (DESIGN §11).
      const emptyBolt = scene.add
        .image(0, 0, TEX_FX_BOLT)
        .setScale(0.5)
        .setTint(COLOR_GRID)
        .setAlpha(0.45)
        .setVisible(true);
      container.add(emptyBolt);
      this.emptyBolts.push(emptyBolt);

      // Image стихии поверх (изначально скрыт).
      const fill = scene.add.image(0, 0, cellTextureKey(0)).setVisible(false);
      fill.setScale(this.fillScale);
      container.add(fill);

      this.fills.push(fill);
      this.add(container);
    }

    scene.add.existing(this);
  }

  /** Центр слота i в абсолютных координатах (цель для молний). */
  slotCenter(i: number): { x: number; y: number } {
    return { x: energySlotX(i, ENERGY_CAPACITY), y: ENERGY_Y };
  }

  /** Зона пипсов переполнения над шкалой (цель для лишних молний). */
  overflowTarget(): { x: number; y: number } {
    return { x: DESIGN_WIDTH / 2, y: ENERGY_OVERFLOW_Y };
  }

  /** Обновить слоты из состояния Энергии (с анимациями появления/потребления). */
  update(energy: EnergyState): void {
    const slots = energy.slots;

    for (let i = 0; i < ENERGY_CAPACITY; i++) {
      const fill = this.fills[i]!;
      const emptyBolt = this.emptyBolts[i]!;
      const wasVisible = fill.visible;
      const nowFilled = i < slots.length && slots[i] !== undefined;

      if (nowFilled) {
        emptyBolt.setVisible(false);
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
            emptyBolt.setVisible(true);
          },
        });
      } else {
        emptyBolt.setVisible(true);
      }
    }
  }

  /**
   * Показать переполнение (DESIGN §11): золотые пипсы «+N» над шкалой и
   * будущий множитель «Fury ×M». Живёт до hideOverflow (конец церемонии).
   */
  showOverflow(overflow: number, furyMult: number): void {
    this.hideOverflow(true);

    const group = this.scene.add.container(DESIGN_WIDTH / 2, ENERGY_OVERFLOW_Y);

    // Пипсы «+1», «+2» — маленькие золотые искры.
    const pips: string[] = [];
    for (let i = 0; i < overflow; i++) pips.push(`+${i + 1}`);
    const pipText = this.scene.add
      .text(0, 0, pips.length > 0 ? pips.join('  ') : '', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        color: this.hex(COLOR_GOLD),
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setPosition(-12, 0);

    // Будущий множитель рядом (DESIGN §11: «Переполнение +2 → Fury ×3.0»).
    const multText = this.scene.add
      .text(0, 0, `→ Fury ×${furyMult.toFixed(1)}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        color: this.hex(COLOR_TEXT_DIM),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setPosition(12, 0);

    group.add([pipText, multText]);
    group.setAlpha(0);
    group.setScale(0.7);
    this.add(group);
    this.overflowGroup = group;

    this.scene.tweens.add({
      targets: group,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.Out',
    });
  }

  /** Скрыть пипсы переполнения (после церемонии Очищения). */
  hideOverflow(immediate = false): void {
    const group = this.overflowGroup;
    if (!group) return;
    this.overflowGroup = null;

    if (immediate) {
      group.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: group,
      alpha: 0,
      scaleY: 0.7,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => group.destroy(),
    });
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}

/** Зазор (ре-экспорт для расчётов вне модуля). */
export const ENERGY_SLOT_GAP = ENERGY_GAP;
