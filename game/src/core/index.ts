/**
 * Core-слой: чистая игровая логика без зависимости от Phaser.
 *
 * Архитектурное правило (TECH_TASKS.md B.3.1): ЗАПРЕЩЁН `import ... from 'phaser'`
 * внутри этого модуля. Весь рендер, ввод, звук — в `src/game`.
 *
 * Содержит: типы, RNG, grid, shapes, lines, energy, combo, cleansing, pure,
 * specials, hand, gameover, engine-фасад.
 *
 * Модули добавляются в Milestone 1 (T-010..T-023).
 */
export {};
