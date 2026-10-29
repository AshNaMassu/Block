# DES-6: Нити неполных стихийных линий (6/7 клеток) + радуга-подхват

## Статус
✅ ЗАВЕРШЁН — коммиты d35ab86 (core) + 344c526 (view); чек tsc OK, тесты 203/203.

## Контекст
- Первоисточник: [docs/DESIGN-neon-alchemy.md](../../docs/DESIGN-neon-alchemy.md) §6 (подсветка потенциальных линий).
- Радуга-подхват «бесплатно» через DES-4: `previewPlacement` гоняет полный pipeline
  на клоне — радуга, замкнувшая нить, уже считается стихийной линией, ghost «+2 500 · +1⚡»
  появляется сам (multi совместим с любой стихией в `findFullLines`).

## Решение
- Core: `findElementalThreads(grid)` в `lines.ts` — ряд/столбец, где все обычные
  не-multi клетки одной стихии, их 6–7, остальные пусты/multi; +7 юнит-тестов
  (`threads.test.ts`): порог 6, 8-клетка = не нить, чужая стихия, multi-совместимость,
  порядок строк→столбцы.
- View: `BoardView.showThreads(threads, hasRainbow)` / `clearThreads()` — свечение
  цвета стихии вдоль линии (alpha 0.12 для 6, 0.25 для 7 + внешний ореол), у 7 —
  tween-пульс и призрак «+2 500 · +1⚡» над линией (SCORE_LINE_ELEMENTAL); при
  hasRainbow — радужная обводка полосы (по клетке, цвета циклом по 4 стихиям).
- `GameScene.refreshBoard()` — вызов после `update(grid)`, hasRainbow =
  `hand.some(p?.kind === 'rainbow')` (нити перерисовываются на каждый refresh —
  рука меняется только там).

## Чекпоинт (финальный)
Последний шаг: все шаги завершены
Что сделано: core-поиск нитей + отрисовка на поле + радужная обводка при радуге в руке
Что дальше: DES-7 — шкала Энергии: полёт цветных молний в слоты, переполнение с пипсами
Изменённые файлы: game/src/core/lines.ts, game/src/core/__tests__/threads.test.ts, game/src/game/objects/BoardView.ts, game/src/game/scenes/GameScene.ts
Открытые вопросы: нет
