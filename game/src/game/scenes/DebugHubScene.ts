/**
 * DebugHubScene — хаб дебага (только dev-сборки).
 *
 * Список пресет-сцен (debug/presets.ts) + вход в песочницу.
 * Выбор запускает GameScene с registry-ключом REG_DEBUG_PRESET — пресет
 * применяется сразу после startGame.
 */
import Phaser from 'phaser';
import { COLOR_BG, COLOR_TEXT, COLOR_TEXT_DIM } from '../../config/elements';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout';
import { Button } from '../ui/Button';
import { DEBUG_PRESETS } from '../debug/presets';

/** Registry-ключ: id пресета или 'sandbox' для GameScene. */
export const REG_DEBUG_PRESET = 'debugPreset';

export class DebugHubScene extends Phaser.Scene {
  constructor() {
    super('DebugHub');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    this.add
      .text(DESIGN_WIDTH / 2, 140, 'DEBUG', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '80px',
        fontStyle: 'bold',
        color: `#${COLOR_TEXT.toString(16).padStart(6, '0')}`,
      })
      .setOrigin(0.5);

    new Button(this, DESIGN_WIDTH / 2, 300, '🧪 ПЕСОЧНИЦА', () => this.launch('sandbox'), {
      width: 700,
      height: 120,
      fontSize: 44,
      fillColor: 0x6c5ce7,
      textColor: 0xffffff,
    });

    // Сетка пресетов: 2 колонки.
    const colX = [DESIGN_WIDTH / 2 - 250, DESIGN_WIDTH / 2 + 250];
    const startY = 480;
    const rowH = 120;

    DEBUG_PRESETS.forEach((preset, i) => {
      const x = colX[i % 2]!;
      const y = startY + Math.floor(i / 2) * rowH;
      const btn = new Button(this, x, y, preset.title, () => this.launch(preset.id), {
        width: 470,
        height: 100,
        fontSize: 28,
        fillColor: 0xefe8db,
        edgeColor: 0xd9cfba,
        textColor: COLOR_TEXT,
      });
      btn.setDepth(10);
    });

    this.add
      .text(DESIGN_WIDTH / 2, startY + Math.ceil(DEBUG_PRESETS.length / 2) * rowH + 40, '', {
        fontFamily: 'system-ui, Arial, sans-serif',
        fontSize: '26px',
        color: `#${COLOR_TEXT_DIM.toString(16).padStart(6, '0')}`,
      })
      .setOrigin(0.5);

    new Button(this, DESIGN_WIDTH / 2, DESIGN_HEIGHT - 140, '← МЕНЮ', () =>
      this.scene.start('Menu'),
    );
  }

  private launch(presetId: string): void {
    this.registry.set(REG_DEBUG_PRESET, presetId);
    this.scene.start('Game');
  }
}
