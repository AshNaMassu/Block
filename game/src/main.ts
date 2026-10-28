import Phaser from 'phaser';
import { COLOR_BG } from './config/elements';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/layout';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { MenuScene } from './game/scenes/MenuScene';
import { GameScene } from './game/scenes/GameScene';
import { DebugHubScene } from './game/scenes/DebugHubScene';

/**
 * Точка входа. Создаёт Phaser-инстанс с portrait FIT-масштабированием 1080×1920.
 *
 * Порядок сцен: Boot → Preload (генерация текстур) → Menu → Game.
 * Конфиг расширяется по мере добавления сцен/FX.
 */
function bootstrap(): void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: COLOR_BG ? `#${COLOR_BG.toString(16).padStart(6, '0')}` : '#F7F3EC',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, DebugHubScene],
  });

  // Ссылка для отладки в консоли.
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}

bootstrap();
