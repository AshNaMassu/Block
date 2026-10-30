/**
 * EnergyBoltFx — полёт цветных молний из поля в шкалу Энергии (DES-7, DESIGN §11).
 *
 * При +1⚡ из места источника (центр стихийной линии / детонации) вылетает
 * молния цвета стихии и попадает в слот шкалы. Переполненные заряды летят
 * в зону пипсов над шкалой.
 *
 * Текстура-зигзаг генерируется один раз (белая, красится tint'ом стихии).
 * Порядок и координаты источников считает GameScene (порядок core:
 * detonation → стихийные линии, строки затем столбцы).
 */
import Phaser from 'phaser';
import type { ElementId, Vec2 } from '../../core/types';
import { ELEMENT_COLORS } from '../../config/elements';
import { TEX_FX_BOLT } from '../textures';

/** Одна молния: стихия, точка вылета и цель (абсолютные px). */
export interface BoltSpec {
  element: ElementId;
  from: Vec2;
  to: Vec2;
}

export interface BoltPlayOptions {
  /** Задержка между молниями, мс. */
  stagger?: number;
  /** Длительность полёта одной молнии, мс. */
  duration?: number;
  /** Вызывается по прилёту каждой молнии (индекс по порядку). */
  onArrive?: (index: number) => void;
  /** Вызывается после прилёта последней молнии (+хвост вспышки). */
  onAll?: () => void;
}

/** Ключ текстуры молнии объявлен в textures.ts (переиспользуется в EnergyView). */

export class EnergyBoltFx {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureBoltTexture(scene);
  }

  /**
   * Запустить полёт молний. Возвращает общую длительность серии, мс.
   * Слоты заполняет вызывающий (EnergyView.update по прибытии серии).
   */
  play(bolts: BoltSpec[], opts: BoltPlayOptions = {}): number {
    const stagger = opts.stagger ?? 120;
    const duration = opts.duration ?? 420;

    bolts.forEach((bolt, i) => {
      this.scene.time.delayedCall(i * stagger, () => {
        this.flyOne(bolt, duration, () => opts.onArrive?.(i));
      });
    });

    const total = bolts.length > 0 ? (bolts.length - 1) * stagger + duration + 140 : 0;
    if (bolts.length > 0 && opts.onAll) {
      this.scene.time.delayedCall(total, () => opts.onAll!());
    }
    return total;
  }

  /** Полёт одной молнии: из from в to, вспышка на прилёте. */
  private flyOne(bolt: BoltSpec, duration: number, onArrive: () => void): void {
    const img = this.scene.add
      .image(bolt.from.x, bolt.from.y, TEX_FX_BOLT)
      .setDepth(240)
      .setTint(ELEMENT_COLORS[bolt.element]!)
      .setAlpha(0);

    // Развернуть молнию хвостом назад по направлению полёта
    // (текстура нарисована сверху вниз; -90°, чтобы «голова» смотрела в цель).
    const angle = Phaser.Math.Angle.Between(bolt.from.x, bolt.from.y, bolt.to.x, bolt.to.y);
    img.setRotation(angle + Math.PI / 2);

    this.scene.tweens.add({
      targets: img,
      alpha: { from: 0, to: 1 },
      duration: 80,
    });

    this.scene.tweens.add({
      targets: img,
      x: bolt.to.x,
      y: bolt.to.y,
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration,
      delay: 80,
      ease: 'Quad.easeIn',
      onComplete: () => {
        onArrive();
        // Вспышка на прилёте: короткий блик и растворение.
        this.scene.tweens.add({
          targets: img,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 140,
          ease: 'Quad.Out',
          onComplete: () => img.destroy(),
        });
      },
    });
  }
}

/** Сгенерировать текстуру-зигзаг молнии (белую, один раз на сцену). */
export function ensureBoltTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_FX_BOLT)) return;

  const g = scene.add.graphics();
  // Классический силуэт молнии: округлый ореол + белый залив.
  g.fillStyle(0xffffff, 0.25);
  g.fillCircle(32, 66, 56);
  // Залив-зигзаг: пары (x, y) — «голова» сверху, остриё снизу.
  const points = [34, 0, 10, 62, 26, 62, 12, 140, 52, 58, 33, 58, 56, 0];
  g.fillStyle(0xffffff, 1);
  g.fillPoints(
    points.reduce<Vec2[]>((acc, v, i) => {
      if (i % 2 === 0) acc.push({ x: v, y: points[i + 1]! });
      return acc;
    }, []),
    true,
  );
  g.generateTexture(TEX_FX_BOLT, 72, 144);
  g.destroy();
}
