# DES-5: Подсветки при drag — ghost-награды, бейдж «Комбо ×N», зоны спецфигур

## Статус
✅ ЗАВЕРШЁН — см. коммит ниже; чек 196/196.

## Контекст
- Первоисточник: [docs/DESIGN-neon-alchemy.md](../../docs/DESIGN-neon-alchemy.md) §6–7, §10, §23.
- Фундамент — DES-4 `GameEngine.previewPlacement` (2d3086e): полный pipeline на клоне,
  немутация боевого состояния, доли миллисекунды на вызов.
- Все спецфигуры — детонаторы (Огонь 3×3, Прилив ряд-столбец, Вихрь — доминирующая
  стихия, Родник 4×4), поэтому зона любой спецфигуры = `detonation.region` симуляции.
- Цвет «успеха» уже голубой с DES-1: `COLOR_PREVIEW_OK = 0x9ed4ff`.

## Решение
- `DragController.buildGhostInfo(target)`: `previewPlacement` на каждый pointer-move
  при валидной цели → строка «+2 500 · КОМБО ×2 · +1⚡ · ОЧИЩЕНИЕ!» + зона/цвет стихии.
- `BoardView.showPreview(cells, ok, ghost?)`: зона — полупрозрачный tint `TEX_MULTI`
  цветом стихии; ghost-label — переиспользуемый Text (Manrope bold 30, золото) над целью.
  Всё живёт в overlay-слое и снимается в `clearPreview()`.
- Молнии в строке: `elementalLines + (detonation ? 1 : 0)`.

## Чекпоинт (финальный)
Последний шаг: все шаги завершены
Что сделано: ghost-награды + бейдж комбо в тексте + зоны всех спецфигур при drag
Что дальше: DES-6 — нити неполных стихийных линий (6/7 клеток), радуга — подхват стихии
Изменённые файлы: game/src/game/input/DragController.ts, game/src/game/objects/BoardView.ts
Открытые вопросы: нет (видео-проверка автора: drag-des5.webm)
