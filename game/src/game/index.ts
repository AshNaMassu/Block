/**
 * Game-слой: Phaser view + input.
 *
 * Содержит: сцены (BootScene, PreloadScene, MenuScene, GameScene),
 * объекты-отображения (BoardView, CellView, PieceView, HandView, HudView,
 * EnergyView, FuryView), контроллеры ввода (DragController, SpecialInputController),
 * UI (Button).
 *
 * НЕ считает сам линии/энергию/комбо/очищение — всё через GameEngine из `src/core`.
 *
 * Milestone 2 (greybox) готов.
 */
export * from './layout';
export * from './textures';
export { BoardView } from './objects/BoardView';
export { CellView } from './objects/CellView';
export { PieceView } from './objects/PieceView';
export { HandView } from './objects/HandView';
export { HudView } from './objects/HudView';
export { EnergyView } from './objects/EnergyView';
export { FuryView } from './objects/FuryView';
export { DragController } from './input/DragController';
export { SpecialInputController } from './input/SpecialInputController';
export { Button } from './ui/Button';
export { BootScene } from './scenes/BootScene';
export { PreloadScene } from './scenes/PreloadScene';
export { MenuScene } from './scenes/MenuScene';
export { GameScene } from './scenes/GameScene';
