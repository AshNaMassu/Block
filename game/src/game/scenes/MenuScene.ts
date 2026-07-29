/**
 * MenuScene — главное меню (T-031).
 *
 * Элементы: тайтл, кнопка Play, кнопка How To (заглушка), строка с best/stars
 * и текущим множителем из registry (синхронизируется storage.loadMeta).
 *
 * Acceptance: Play → GameScene; How To → заглушка (toast/алерт); best/stars/mult
 * отображаются.
 */
import Phaser from 'phaser';
import { COLOR_BG, COLOR_GOLD, COLOR_TEXT, COLOR_TEXT_DIM } from '../../config/elements';
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
    // Множитель считаем по звёздам (Fury вне игры = null).
    const mult = currentMultiplier(meta.stars, null, Date.now());

    // Тайтл.
    this.add
      .text(DESIGN_WIDTH / 2, 440, 'ELEMENTAL\nBLAST', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '120px',
        color: this.hex(COLOR_TEXT),
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Подзаголовок.
    this.add
      .text(DESIGN_WIDTH / 2, 640, 'блок-паззл со стихиями', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '40px',
        color: this.hex(COLOR_TEXT_DIM),
        align: 'center',
      })
      .setOrigin(0.5);

    // Строка best/stars/mult.
    this.add
      .text(
        DESIGN_WIDTH / 2,
        780,
        `РЕКОРД ${this.fmt(meta.best)}    ★ ${meta.stars}    ×${mult.toFixed(1)}`,
        {
          fontFamily: 'system-ui, Arial, sans-serif',
          fontSize: '44px',
          color: this.hex(COLOR_GOLD),
          align: 'center',
        },
      )
      .setOrigin(0.5);

    // Кнопка Play.
    new Button(this, DESIGN_WIDTH / 2, 1080, 'ИГРАТЬ', () => this.scene.start('Game'), {
      width: 560,
      height: 150,
      fontSize: 56,
    });

    // Кнопка How To (заглушка — простой текст-оверлей).
    new Button(this, DESIGN_WIDTH / 2, 1290, 'КАК ИГРАТЬ', () => this.showHowTo(), {
      width: 560,
      height: 130,
      fontSize: 44,
      fillColor: 0x2a2840,
    });

    // Подпись снизу.
    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 80, 'Milestone 2 · greybox', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '28px',
        color: this.hex(COLOR_TEXT_DIM),
      })
      .setOrigin(0.5);
  }

  /** Загрузить meta (best/stars) в registry. */
  private loadMeta(): PlayerMeta {
    const meta = loadMeta();
    this.registry.set(REG_META, meta);
    return meta;
  }

  /** Заглушка How To — модальный текст. */
  private showHowTo(): void {
    const overlay = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(100);
    const panel = this.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2).setDepth(101);

    const bg = this.add.graphics();
    bg.fillStyle(0x2d2b40, 1);
    bg.fillRoundedRect(-440, -360, 880, 720, 32);
    panel.add(bg);

    const lines = [
      'КАК ИГРАТЬ',
      '',
      'Ставьте фигуры на поле 8×8.',
      'Замыкайте ряд или столбец — он очистится.',
      '',
      'Ряд из 8 клеток одной стихии = стихийная',
      'линия → заполняет шкалу Энергии.',
      '',
      '2+ стихийных линии за ход = комбо → спецфигура.',
      '3 заполненных слота Энергии = Очищение → Fury.',
      '',
      'Цель: набрать максимум очков, не затыкая поле.',
    ];
    const text = this.add
      .text(0, 0, lines.join('\n'), {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '32px',
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
