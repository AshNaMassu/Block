/**
 * HandView — отрисовка руки (6 слотов: 3 обычных + 3 бонусных).
 *
 * Размещает PieceView в позициях слотов (layout.HAND_SLOTS). Бонусные слоты
 * помечены золотой рамкой. `update(hand)` пересоздаёт только изменившиеся слоты
 * по id. Даёт DragController'у доступ к PieceView по id.
 *
 * Greybox: без tween-анимаций выдачи (Milestone 3, T-043).
 */
import Phaser from 'phaser';
import type { Hand, Piece } from '../../core/types';
import { COLOR_GOLD, COLOR_GRID, COLOR_PANEL } from '../../config/elements';
import { CELL_RADIUS } from '../layout';
import { HAND_SLOTS } from '../layout';
import { PieceView } from './PieceView';

export class HandView extends Phaser.GameObjects.Container {
  private readonly slots: Phaser.GameObjects.Container[] = [];
  private readonly pieceViews = new Map<string, PieceView>();

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    for (const slot of HAND_SLOTS) {
      const container = scene.add.container(slot.x, slot.y);
      this.drawSlotFrame(scene, container, slot.size, slot.bonus);
      this.slots[slot.index] = container;
      this.add(container);
    }

    scene.add.existing(this);
  }

  /** Полный перерисов руки: сравниваем по id, пересоздаём только изменившееся. */
  update(hand: Hand): void {
    // Соберём текущие id → slot.
    const wanted = new Map<string, { piece: Piece; slotIndex: number }>();
    hand.forEach((piece, i) => {
      if (piece) wanted.set(piece.id, { piece, slotIndex: i });
    });

    // Удаляем исчезнувшие.
    for (const [id, view] of [...this.pieceViews.entries()]) {
      if (!wanted.has(id)) {
        view.destroy();
        this.pieceViews.delete(id);
      }
    }

    // Добавляем/обновляем оставшиеся.
    for (const { piece, slotIndex } of wanted.values()) {
      const existing = this.pieceViews.get(piece.id);
      const slot = this.slots[slotIndex];
      if (existing) {
        // Переместить в нужный слот, если сместился.
        existing.setPosition(slot.x, slot.y);
      } else {
        const view = new PieceView(this.scene, piece, HAND_SLOTS[slotIndex].size);
        view.setPosition(slot.x, slot.y);
        this.add(view);
        this.pieceViews.set(piece.id, view);

        // Pop-in новой фигуры (особенно наградных — радужных/спецфигур).
        view.setScale(0);
        this.scene.tweens.add({
          targets: view,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.Out',
        });
      }
    }
  }

  /** Получить PieceView по id фигуры (для DragController). */
  getPieceView(pieceId: string): PieceView | null {
    return this.pieceViews.get(pieceId) ?? null;
  }

  /** Получить все PieceView (для ввода). */
  getPieceViews(): PieceView[] {
    return [...this.pieceViews.values()];
  }

  /** Позиция слота по индексу (для возврата при отмене drag). */
  getSlotPosition(slotIndex: number): { x: number; y: number } {
    const slot = this.slots[slotIndex];
    return { x: slot.x, y: slot.y };
  }

  /** Нарисовать рамку слота (светлая тема: белая плашка, бонусные — золотые). */
  private drawSlotFrame(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    size: number,
    bonus: boolean,
  ): void {
    const g = scene.add.graphics();
    if (bonus) {
      g.fillStyle(COLOR_GOLD, 0.1);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, CELL_RADIUS);
      g.lineStyle(3, COLOR_GOLD, 0.9);
      g.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, CELL_RADIUS);
    } else {
      g.fillStyle(COLOR_PANEL, 0.55);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, CELL_RADIUS);
      g.lineStyle(2, COLOR_GRID, 0.9);
      g.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, CELL_RADIUS);
    }
    container.add(g);
  }
}
