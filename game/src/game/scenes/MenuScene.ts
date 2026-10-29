/**
 * MenuScene — главное меню (T-031).
 *
 * Элементы: тайтл, декоративные кристаллы стихий, кнопка Play, кнопка How To,
 * строка с best/stars и текущим множителем из registry.
 *
 * Acceptance: Play → GameScene; How To → модалка с правилами; best/stars/mult
 * отображаются.
 */
import Phaser from 'phaser';
import {
  COLOR_BG,
  COLOR_BUTTON_SECONDARY,
  COLOR_BUTTON_SECONDARY_EDGE,
  COLOR_GOLD,
  COLOR_OVERLAY,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  COLOR_TEXT,
  COLOR_TEXT_DIM,
  ELEMENT_COLORS,
  darken,
  FONT_FAMILY,
} from '../../config/elements';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout';
import { loadMeta, type PlayerMeta } from '../../platform/storage';
import { currentMultiplier } from '../../core/fury';
import { Button } from '../ui/Button';

/** Ключ registry для передачи meta между сценами. */
export const REG_META = 'meta';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    const meta = this.loadMeta();
    // Множитель считаем от нуля (партия начинается с базового ×2.0).
    // meta.stars — lifetime-статистика, не влияет на игровой множитель.
    const mult = currentMultiplier(0, null, Date.now());

    // Тайтл.
    this.add
      .text(DESIGN_WIDTH / 2, 420, 'ELEMENTAL\nBLAST', {
        fontFamily: FONT_FAMILY,
        fontSize: '120px',
        color: this.hex(COLOR_TEXT),
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 6, 'rgba(138, 125, 102, 0.4)', 2, false, true);

    // Декор: четыре кристалла стихий под тайтлом.
    this.addCrystalDecor(DESIGN_WIDTH / 2, 660);

    // Подзаголовок.
    this.add
      .text(DESIGN_WIDTH / 2, 780, 'блок-паззл со стихиями', {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        color: this.hex(COLOR_TEXT_DIM),
        align: 'center',
      })
      .setOrigin(0.5);

    // Строка best/stars/mult.
    this.add
      .text(
        DESIGN_WIDTH / 2,
        880,
        `РЕКОРД ${this.fmt(meta.best)}   ★ ${meta.stars} всего   ×${mult.toFixed(1)} старт`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '40px',
          color: this.hex(COLOR_GOLD),
          align: 'center',
        },
      )
      .setOrigin(0.5);

    // Кнопка Play.
    new Button(this, DESIGN_WIDTH / 2, 1120, 'ИГРАТЬ', () => this.scene.start('Game'), {
      width: 560,
      height: 150,
      fontSize: 56,
    });

    // Кнопка How To (вторичная — тёмная панель).
    new Button(this, DESIGN_WIDTH / 2, 1330, 'КАК ИГРАТЬ', () => this.showHowTo(), {
      width: 560,
      height: 130,
      fontSize: 44,
      fillColor: COLOR_BUTTON_SECONDARY,
      edgeColor: COLOR_BUTTON_SECONDARY_EDGE,
      textColor: COLOR_TEXT,
    });

    // Дебаг-хаб: только в dev-сборке.
    if (import.meta.env.DEV) {
      new Button(this, DESIGN_WIDTH / 2, 1500, '🐞 DEBUG', () => this.scene.start('DebugHub'), {
        width: 400,
        height: 100,
        fontSize: 36,
        fillColor: 0x6c5ce7,
        textColor: 0xffffff,
      });
    }

    // Подпись снизу.
    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 80, 'Элементальный блок-паззл', {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: this.hex(COLOR_TEXT_DIM),
      })
      .setOrigin(0.5);
  }

  /** Ряд из четырёх кристаллов стихий (декор). */
  private addCrystalDecor(cx: number, cy: number): void {
    const size = 84;
    const gap = 28;
    ELEMENT_COLORS.forEach((color, i) => {
      const x = cx + (i - 1.5) * (size + gap);
      const g = this.add.graphics();
      g.fillStyle(darken(color, 0.22), 0.35);
      g.fillRoundedRect(x - size / 2 + 3, cy - size / 2 + 8, size, size, 18);
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - size / 2, cy - size / 2, size, size, 18);
      g.fillStyle(0xffffff, 0.55);
      g.fillRoundedRect(x - size / 2 + 10, cy - size / 2 + 10, size * 0.4, size * 0.16, 6);
    });
  }

  /** Загрузить meta (best/stars) в registry. */
  private loadMeta(): PlayerMeta {
    const meta = loadMeta();
    this.registry.set(REG_META, meta);
    return meta;
  }

  /** How To — модальный текст с правилами (включая детонаторов и мердж). */
  private showHowTo(): void {
    const overlay = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR_OVERLAY, 0.55)
      .setOrigin(0)
      .setDepth(100);
    const panel = this.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2).setDepth(101);

    const bg = this.add.graphics();
    bg.fillStyle(COLOR_PANEL_SHADOW, 0.3);
    bg.fillRoundedRect(-436, -356, 880, 720, 32);
    bg.fillStyle(COLOR_PANEL, 1);
    bg.fillRoundedRect(-440, -360, 880, 720, 32);
    panel.add(bg);

    const lines = [
      'КАК ИГРАТЬ',
      '',
      'Ставьте фигуры на поле 8×8 перетаскиванием.',
      'Замыкайте ряд или столбец — он очистится.',
      '',
      'Ряд из 8 клеток одной стихии = стихийная линия:',
      '2500 очков и +1⚡ в шкалу Энергии.',
      '',
      '2+ стихийные линии за ход = комбо → детонатор:',
      '🔥 Пожар (взрыв 3×3) · 💧 Прилив (смывает линию)',
      '🌀 Вихрь (сметает стихию) · 🌿 Родник (перекраска 4×4)',
      'Детонация даёт ещё +1⚡.',
      '',
      '3 слота Энергии = Очищение → радужные + Fury (×очки).',
      'Две одинаковые спецфигуры: тап по одной, тап по',
      'другой — мердж в следующую ступень.',
      '',
      'Цель: набрать максимум очков, не затыкая поле.',
    ];
    const text = this.add
      .text(0, 0, lines.join('\n'), {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: this.hex(COLOR_TEXT),
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    panel.add(text);

    new Button(this, 0, 290, 'ЗАКРЫТЬ', () => {
      overlay.destroy();
      panel.destroy();
    }).setPosition(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 290);
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private fmt(n: number): string {
    return n.toLocaleString('ru-RU');
  }
}
