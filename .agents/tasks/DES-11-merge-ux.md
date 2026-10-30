# DES-11: UX слияния спецфигур — значок связи, дуга, тряска при ошибке

## Статус
✅ ЗАВЕРШЁН — коммит 9eaa523; просмотр автором — в общем финале волны.

## Контекст
- [docs/DESIGN-neon-alchemy.md](../../docs/DESIGN-neon-alchemy.md) §14. Механика мерджа
  уже была (mergeSpecialPieces, тап → тап); добавлен только визуал/фидбек.

## Решение
- PieceView.setLinked: золотой кружок «⇄» в углу — «есть пара» (HandView.updateMergeBadges
  после refreshHand, пары по типу спецфигуры).
- Выбор первой: парная мягко пульсирует (setPulsing) + золотая дуга между слотами
  (HandView.showMergeArc, пульс альфы); снимается clearSelection.
- Тап по спецфигуре другого типа: тряска (PieceView.shake) + тост «Нужна такая же фигура»
  (новый deps.onMergeHint), выделение остаётся на первой (по DESIGN §14).

## Чекпоинт (финальный)
Последний шаг: все
Что сделано: значки связи, пульс пары, дуга, тряска + подсказка
Что дальше: DES-12 (волна 4) — first-time подсказки и микроподписи
Изменённые файлы: game/src/game/objects/PieceView.ts, game/src/game/objects/HandView.ts, game/src/game/input/DragController.ts, game/src/game/scenes/GameScene.ts
Открытые вопросы: нет
