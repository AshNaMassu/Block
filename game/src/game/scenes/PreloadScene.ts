/**
 * PreloadScene — генерация процедурных текстур (без ассетов).
 *
 * Тема «Неоновая алхимия» (DES-1): клетки стихий — фасеточные кристаллы (светлая
 * верхняя грань, тёмная нижняя, блик), пустая клетка — тёмная «ниша», preview —
 * полупрозрачные оверлеи. Радужная — белый перламутр + золотой контур.
 *
 * Central registry — PreloadScene создаёт, view-объекты потребляют по ключу.
 * Формат именования: `tex-<имя>-<параметр>` (напр. `tex-cell-0` для огня).
 */
import Phaser from 'phaser';
import {
  COLOR_CELL_EMPTY,
  COLOR_GOLD,
  COLOR_MULTI,
  COLOR_PREVIEW_BAD,
  COLOR_PREVIEW_OK,
  ELEMENT_COLORS,
  darken,
  lighten,
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

    // Кристаллы стихий (фасеточный rounded rect, цвет по стихии).
    ELEMENT_COLORS.forEach((color, i) => {
      this.makeCrystalTexture(cellTextureKey(i), color);
    });

    // Multi-клетка (белый перламутр — для радужных).
    this.makeCrystalTexture(TEX_MULTI, COLOR_MULTI, 0.35);

    // Пустая клетка: тёмная ниша с мягкой внутренней тенью сверху.
    this.makeEmptyCellTexture();

    // Preview overlays.
    this.makeCellTexture(TEX_PREVIEW_OK, COLOR_PREVIEW_OK, 0.5);
    this.makeCellTexture(TEX_PREVIEW_BAD, COLOR_PREVIEW_BAD, 0.5);

    // Радужная (4 сектора по стихиям + золотой контур).
    this.makeRainbowTexture();
  }

  /**
   * Фасеточный кристалл: базовый rounded rect + светлая верхне-левая грань,
   * тёмная нижне-правая, блик-искра.
   */
  private makeCrystalTexture(key: string, color: number, facetStrength = 1): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    const S = TEX_CELL_SIZE;
    const R = CELL_RADIUS;

    // Базовый кристалл.
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, S, S, R);

    // Верхне-левая светлая грань (скошенный скруглённый треугольник).
    g.fillStyle(lighten(color, 0.32 * facetStrength), 1);
    g.beginPath();
    g.moveTo(0, R * 2.2);
    g.lineTo(0, S * 0.55);
    g.lineTo(S * 0.55, 0);
    g.lineTo(R * 2.2, 0);
    g.arc(R * 2.2, R * 2.2, R * 2.2, Math.PI, Math.PI * 1.5, false);
    g.closePath();
    g.fillPath();

    // Нижне-правая тёмная грань.
    g.fillStyle(darken(color, 0.16 * facetStrength), 1);
    g.beginPath();
    g.moveTo(S, S * 0.45);
    g.lineTo(S, S - R);
    g.arc(S - R, S - R, R, 0, Math.PI / 2, false);
    g.lineTo(S * 0.45, S);
    g.closePath();
    g.fillPath();

    // Тонкая светлая окантовка (кромка кристалла).
    g.lineStyle(2, lighten(color, 0.55), 0.8);
    g.strokeRoundedRect(1, 1, S - 2, S - 2, R);

    // Блик-искра в верхнем левом углу.
    g.fillStyle(0xffffff, 0.75);
    g.fillRoundedRect(S * 0.16, S * 0.16, S * 0.2, S * 0.09, 4);

    g.generateTexture(key, S, S);
    g.destroy();
  }

  /** Пустая клетка: светлая лунка с мягкой внутренней тенью сверху. */
  private makeEmptyCellTexture(): void {
    if (this.textures.exists(TEX_CELL_EMPTY)) return;
    const g = this.add.graphics();
    const S = TEX_CELL_SIZE;
    const R = CELL_RADIUS;

    g.fillStyle(COLOR_CELL_EMPTY, 1);
    g.fillRoundedRect(0, 0, S, S, R);

    // Внутренняя тень сверху (лунка утоплена).
    g.fillStyle(darken(COLOR_CELL_EMPTY, 0.1), 0.7);
    g.fillRoundedRect(0, 0, S, S * 0.14, { tl: R, tr: R, bl: 0, br: 0 });

    // Светлый нижний край (свет падает сверху).
    g.fillStyle(lighten(COLOR_CELL_EMPTY, 0.6), 0.8);
    g.fillRoundedRect(2, S - 5, S - 4, 3, 2);

    g.generateTexture(TEX_CELL_EMPTY, S, S);
    g.destroy();
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
    // 4 сектора по стихиям (упрощённый «радужный» кристалл).
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
    // Белый перламутровый блик по диагонали.
    g.fillStyle(0xffffff, 0.35);
    g.beginPath();
    g.moveTo(0, half);
    g.lineTo(half, 0);
    g.lineTo(half + half * 0.3, 0);
    g.lineTo(0, half + half * 0.3);
    g.closePath();
    g.fillPath();
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
