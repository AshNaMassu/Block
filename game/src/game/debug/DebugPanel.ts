/**
 * DebugPanel — панель дебага (только dev-сборки).
 *
 * Кнопка-чип в углу открывает модалку с инструментами:
 * - Спавн тройки: фиксированная стихия или все (engine.debugSpawnElement).
 * - Кисть по полю: тап по клетке кладёт стихию / ластик (brushElement).
 * - Выдать в руку: радужная / любой детонатор.
 * - Энергия: +1⚡ выбранной стихии.
 * - Прочее: очистить поле, перезаполнить тройку.
 *
 * showResult(result) рисует сводку последнего хода под HUD — чтобы видеть,
 * что именно начислил движок, не читая тосты.
 *
 * Изменения поля/руки сообщаются колбэками — GameScene делает refresh.
 */
import type Phaser from 'phaser';
import type { GameEngine } from '../../core/engine';
import type { ElementId, PlacementResult, SpecialType } from '../../core/types';
import {
  COLOR_BUTTON_SECONDARY,
  COLOR_BUTTON_SECONDARY_EDGE,
  COLOR_OVERLAY,
  COLOR_PANEL,
  COLOR_PANEL_SHADOW,
  COLOR_TEXT,
  COLOR_TEXT_DIM,
  ELEMENT_COLORS,
  FONT_FAMILY,
} from '../../config/elements';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout';
import { Button } from '../ui/Button';

/** Стихия кисти: ElementId, -1 (ластик) или null (кисть выключена). */
export type BrushElement = ElementId | -1 | null;

export interface DebugPanelDeps {
  scene: Phaser.Scene;
  engine: GameEngine;
  onBoardChanged: () => void;
  onHandChanged: () => void;
  onEnergyChanged: () => void;
}

const EL_ICONS = ['🔥', '💧', '🌿', '💨'];
const ALL_ELEMENTS: ElementId[] = [0, 1, 2, 3];

/** Пара «кнопка + её базовый лейбл» для пометки выбора. */
interface LabeledButton {
  button: Button;
  baseLabel: string;
}

export class DebugPanel {
  private readonly deps: DebugPanelDeps;
  private readonly chip: Button;
  private readonly summary: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private brush: BrushElement = null;
  private spawnRow: LabeledButton[] = [];
  private brushRow: LabeledButton[] = [];

  constructor(deps: DebugPanelDeps) {
    this.deps = deps;

    this.chip = new Button(deps.scene, DESIGN_WIDTH - 120, 220, '🐞', () => this.toggle(), {
      width: 130,
      height: 90,
      fontSize: 44,
      fillColor: 0x6c5ce7,
      textColor: 0xffffff,
    });
    this.chip.setDepth(240);

    this.summary = deps.scene.add
      .text(DESIGN_WIDTH / 2, 262, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: hex(COLOR_TEXT_DIM),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(240);
  }

  /** Текущая кисть (читается GameScene при тапе по полю). */
  get brushElement(): BrushElement {
    return this.brush;
  }

  /** Сводка последнего хода (под HUD). */
  showResult(result: PlacementResult): void {
    const parts: string[] = [];
    if (result.detonation) {
      const d = result.detonation;
      parts.push(
        `${d.type}: −${d.destroyed.length} +${d.seeded.length}` +
          (d.repainted.length ? ` ~${d.repainted.length}` : ''),
      );
    }
    if (result.clearedLines.length > 0) {
      parts.push(`линий ${result.clearedLines.length} (стих. ${result.elementalLines})`);
    }
    if (result.combo) parts.push(`комбо×${result.combo.lines}`);
    if (result.cleansing) parts.push(`очищение ovr${result.cleansing.overflow}`);
    if (result.specialAdded) {
      parts.push(`награда ${result.specialAdded.type}×${result.specialAdded.count}`);
    }
    this.summary.setText(parts.length > 0 ? `DEBUG: ${parts.join(' · ')}` : '');
  }

  // ─── Модалка ────────────────────────────────────────────────────────────

  private toggle(): void {
    if (this.panel) this.close();
    else this.open();
  }

  private close(): void {
    this.overlay?.destroy();
    this.panel?.destroy();
    this.overlay = null;
    this.panel = null;
  }

  private open(): void {
    const { scene } = this.deps;
    this.overlay = scene.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLOR_OVERLAY, 0.55)
      .setOrigin(0)
      .setDepth(250)
      .setInteractive(); // гасит клики под панелью

    const panel = scene.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2).setDepth(251);
    this.panel = panel;

    const bg = scene.add.graphics();
    bg.fillStyle(COLOR_PANEL_SHADOW, 0.3);
    bg.fillRoundedRect(-436, -636, 880, 1280, 32);
    bg.fillStyle(COLOR_PANEL, 1);
    bg.fillRoundedRect(-440, -640, 880, 1280, 32);
    panel.add(bg);

    panel.add(this.makeTitle(-580, 'DEBUG'));

    // Ряд 1: спавн тройки.
    panel.add(this.makeSectionTitle(-500, 'СПАВН ТРОЙКИ (после «рука заново»)'));
    this.spawnRow = [];
    this.spawnRow.push(
      this.labeled(
        this.addSmallButton(panel, -320, -430, 'ВСЕ', COLOR_TEXT_DIM, () => {
          this.deps.engine.debugSpawnElement = null;
          this.markSelected(this.spawnRow, 'ВСЕ');
        }),
        'ВСЕ',
      ),
    );
    ALL_ELEMENTS.forEach((el, i) => {
      this.spawnRow.push(
        this.labeled(
          this.addSmallButton(panel, -160 + i * 160, -430, EL_ICONS[i], ELEMENT_COLORS[el]!, () => {
            this.deps.engine.debugSpawnElement = el;
            this.markSelected(this.spawnRow, EL_ICONS[i]);
          }),
          EL_ICONS[i],
        ),
      );
    });

    // Ряд 2: кисть по полю.
    panel.add(this.makeSectionTitle(-320, 'КИСТЬ ПО ПОЛЮ (тап по клетке)'));
    this.brushRow = [];
    this.brushRow.push(
      this.labeled(
        this.addSmallButton(panel, -400, -250, 'ВЫКЛ', COLOR_TEXT_DIM, () => {
          this.brush = null;
          this.markSelected(this.brushRow, 'ВЫКЛ');
        }),
        'ВЫКЛ',
      ),
    );
    ALL_ELEMENTS.forEach((el, i) => {
      this.brushRow.push(
        this.labeled(
          this.addSmallButton(panel, -240 + i * 160, -250, EL_ICONS[i], ELEMENT_COLORS[el]!, () => {
            this.brush = el;
            this.markSelected(this.brushRow, EL_ICONS[i]);
          }),
          EL_ICONS[i],
        ),
      );
    });
    this.brushRow.push(
      this.labeled(
        this.addSmallButton(panel, 400, -250, '🧽', COLOR_TEXT_DIM, () => {
          this.brush = -1;
          this.markSelected(this.brushRow, '🧽');
        }),
        '🧽',
      ),
    );

    // Ряд 3: выдать в руку.
    panel.add(this.makeSectionTitle(-140, 'ВЫДАТЬ В РУКУ'));
    this.addSmallButton(panel, -360, -70, '🌈', 0xf5a623, () => {
      this.deps.engine.debugGiveRainbow();
      this.deps.onHandChanged();
    });
    const specials: SpecialType[] = ['fire', 'tide', 'vortex', 'spring'];
    specials.forEach((type, i) => {
      this.addSmallButton(panel, -180 + i * 160, -70, EL_ICONS[i], ELEMENT_COLORS[i]!, () => {
        this.deps.engine.debugGiveSpecial(type);
        this.deps.onHandChanged();
      });
    });

    // Ряд 4: энергия.
    panel.add(this.makeSectionTitle(40, 'ЭНЕРГИЯ (+1⚡)'));
    ALL_ELEMENTS.forEach((el, i) => {
      this.addSmallButton(
        panel,
        -320 + i * 160,
        110,
        `+${EL_ICONS[i]}`,
        ELEMENT_COLORS[el]!,
        () => {
          this.deps.engine.debugGiveEnergy(el);
          this.deps.onEnergyChanged();
        },
      );
    });

    // Ряд 5: прочее.
    panel.add(this.makeSectionTitle(220, 'ПОЛЕ И РУКА'));
    this.addSmallButton(
      panel,
      -200,
      290,
      'ОЧИСТИТЬ ПОЛЕ',
      COLOR_TEXT_DIM,
      () => {
        this.deps.engine.debugClearBoard();
        this.deps.onBoardChanged();
      },
      300,
    );
    this.addSmallButton(
      panel,
      140,
      290,
      'РУКА ЗАНОВО',
      COLOR_TEXT_DIM,
      () => {
        this.deps.engine.debugRefillHand();
        this.deps.onHandChanged();
      },
      300,
    );

    // Закрыть.
    const closeBtn = new Button(scene, 0, 430, 'ЗАКРЫТЬ', () => this.close(), {
      width: 400,
      height: 100,
      fontSize: 40,
      fillColor: COLOR_BUTTON_SECONDARY,
      edgeColor: COLOR_BUTTON_SECONDARY_EDGE,
      textColor: COLOR_TEXT,
    });
    panel.add(closeBtn);
  }

  // ─── Внутреннее ─────────────────────────────────────────────────────────

  private labeled(button: Button, baseLabel: string): LabeledButton {
    return { button, baseLabel };
  }

  /** Пометить выбранную кнопку ряда символом ▸, с остальных снять. */
  private markSelected(row: LabeledButton[], label: string): void {
    for (const { button, baseLabel } of row) {
      button.setText(baseLabel === label ? `▸ ${baseLabel}` : baseLabel);
    }
  }

  private makeTitle(y: number, text: string): Phaser.GameObjects.Text {
    return this.deps.scene.add
      .text(0, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        fontStyle: 'bold',
        color: hex(COLOR_TEXT),
      })
      .setOrigin(0.5);
  }

  private makeSectionTitle(y: number, text: string): Phaser.GameObjects.Text {
    return this.deps.scene.add
      .text(0, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: hex(COLOR_TEXT_DIM),
      })
      .setOrigin(0.5);
  }

  private addSmallButton(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
    width = 130,
  ): Button {
    const btn = new Button(this.deps.scene, x, y, label, onClick, {
      width,
      height: 100,
      fontSize: 34,
      fillColor: color,
      textColor: 0xffffff,
    });
    panel.add(btn);
    return btn;
  }
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
