/**
 * PreloadScene — генерация процедурных текстур (без ассетов, greybox).
 *
 * Создаёт все текстуры из `game/textures.ts`: клетки стихий, multi, preview,
 * rainbow, спецфигуры. После генерации переходит в MenuScene.
 *
 * В Milestone 3 (polish) можно заменить на атлас TexturePacker — точки
 * потребления (ключи текстур) не изменятся.
 */
import Phaser from 'phaser';
import {
  COLOR_GOLD,
  COLOR_MULTI,
  COLOR_PREVIEW_BAD,
  COLOR_PREVIEW_OK,
  ELEMENT_COLORS,
} from '../../config/elements';
import {
  ALL_CELL_TEXTURE_KEYS,
  TEX_CELL_EMPTY,
  TEX_CELL_SIZE,
  TEX_MULTI,
  TEX_PREVIEW_BAD,
  TEX_PREVIEW_OK,
  TEX_RAINBOW,
  cellTextureKey,
} from '../textures';
import { CELL_RADIUS } from '../layout';
import { COLOR_BG } from '../../config/elements';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.generateTextures();
  }

  create(): void {
    this.scene.start('Menu');
  }

  /** Сгенерировать все процедурные текстуры в TextureManager. */
  private generateTextures(): void {
    // Используем неиспользуемые ключи — избегаем дублирования.
    void ALL_CELL_TEXTURE_KEYS;

    // Клетки стихий (rounded rect, цвет по стихии).
    ELEMENT_COLORS.forEach((color, i) => {
      this.makeCellTexture(cellTextureKey(i), color);
    });

    // Multi-клетка (светлая «дикая»).
    this.makeCellTexture(TEX_MULTI, COLOR_MULTI);

    // Пустая клетка (фон слота).
    this.makeCellTexture(TEX_CELL_EMPTY, 0x1c1a2b, 0.6);

    // Preview overlays.
    this.makeCellTexture(TEX_PREVIEW_OK, COLOR_PREVIEW_OK, 0.5);
    this.makeCellTexture(TEX_PREVIEW_BAD, COLOR_PREVIEW_BAD, 0.5);

    // Радужная (белая база + золотой контур, 4-секторный упрощён).
    this.makeRainbowTexture();

    // Спецфигуры-детонаторы рисуются из клеток стихий + символ (PieceView) —
    // отдельных текстур не требуется.
  }

  private makeCellTexture(key: string, color: number, alpha = 1): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color, alpha);
    g.fillRoundedRect(0, 0, TEX_CELL_SIZE, TEX_CELL_SIZE, CELL_RADIUS);
    g.generateTexture(key, TEX_CELL_SIZE, TEX_CELL_SIZE);
    g.destroy();
  }

  private makeRainbowTexture(): void {
    if (this.textures.exists(TEX_RAINBOW)) return;
    const g = this.add.graphics();
    // 4 сектора по стихиям (упрощённый «радужный» градиент Block Blast).
    const half = TEX_CELL_SIZE / 2;
    const q = CELL_RADIUS / 2;
    g.fillStyle(ELEMENT_COLORS[0], 1);
    g.fillRoundedRect(0, 0, half, half, q);
    g.fillStyle(ELEMENT_COLORS[1], 1);
    g.fillRoundedRect(half, 0, half, half, q);
    g.fillStyle(ELEMENT_COLORS[2], 1);
    g.fillRoundedRect(0, half, half, half, q);
    g.fillStyle(ELEMENT_COLORS[3], 1);
    g.fillRoundedRect(half, half, half, half, q);
    // Золотой контур.
    g.lineStyle(4, COLOR_GOLD, 1);
    g.strokeRoundedRect(2, 2, TEX_CELL_SIZE - 4, TEX_CELL_SIZE - 4, CELL_RADIUS);
    g.generateTexture(TEX_RAINBOW, TEX_CELL_SIZE, TEX_CELL_SIZE);
    g.destroy();
  }

  /** Фон сцены. */
  protected setBackground(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);
  }
}
