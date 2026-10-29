# DES-4: core — GameEngine.previewPlacement (симуляция PlacementResult)

## Статус
✅ ЗАВЕРШЁН — 2d3086e, тесты 196/196. Фoundation для DES-5/DES-6.

## Контекст (что нужно знать)
- Первоисточник: [docs/DESIGN-neon-alchemy.md](../../docs/DESIGN-neon-alchemy.md) §7, §23.
- placePiece мутирует всё состояние (сетка, рука, счёт, энергия, Fury, RNG).
  Превью нужно при каждом pointer-move во время drag — мутация боевого состояния
  недопустима.
- Решение: клон `structuredClone(state)` + движок-двойник `forSimulation`
  (Object.create + свои rng-функции от state.rngState). Спавн refill-а в симуляции
  идёт от своего RNG и боевую последовательность не трогает.
- Цена вызова: клон сетки 8×8 + руки — доля миллисекунды, можно звать на каждый move.

## Шаги
- [x] 1. `previewPlacement(pieceId, target, orientation)` — canPlacePiece гейт, затем симуляция на клоне.
- [x] 2. Тесты `__tests__/preview.test.ts` (6): немутация сетки/руки/счёта/энергии/rngState; preview→placePiece даёт тот же результат (превью ничего не съело); совпадение полей с placePiece на двух одинаковых движках; детонация спецфигуры; невалидные входы.
- [x] 3. `npm run check` — 196/196; коммит 2d3086e; DONE/QUEUE.

## Чекпоинт (финальный)
Последний шаг: 3
Что сделано: previewPlacement в core + 6 тестов (2d3086e)
Что дальше: DES-5 — подсветки при drag на базе превью (ghost-награды, бейдж «Комбо ×N», зоны спецфигур)
Изменённые файлы: core/engine.ts, core/__tests__/preview.test.ts
Открытые вопросы: нет
