/**
 * FxPool — простой object pool для Phaser.Image-эффектов.
 *
 * Используется в LineClearFx и CleansingFx (T-041, T-042), чтобы не создавать
 * и не уничтожать спрайты каждый раз. Это важно для стабильных 60 FPS.
 */
import type Phaser from 'phaser';

export class FxPool {
  private readonly pool: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly textureKey: string,
  ) {}

  /** Достать Image из пула (или создать новый, если пул пуст). */
  acquire(): Phaser.GameObjects.Image {
    const img = this.pool.pop();

    if (img) {
      img.setActive(true);
      img.setVisible(true);
      return img;
    }

    return this.scene.add.image(0, 0, this.textureKey);
  }

  /** Вернуть Image в пул. */
  release(img: Phaser.GameObjects.Image): void {
    img.setActive(false);
    img.setVisible(false);
    img.clearTint();
    img.setAlpha(1);
    img.setScale(1);
    img.setDepth(0);

    this.pool.push(img);
  }
}
