# DES-12: First-time подсказки + микроподписи шкалы/фигур

## Статус
✅ ЗАВЕРШЁН — коммит 9d67173. Полный i18n-слой не делался (только ru-строки) — по мере необходимости.

## Решение
- storage: `loadShownHints/markHintShown` (localStorage, once per profile).
- Подсказки (Toast big): hint-drag при первом входе в игру; hint-special при первом детонаторе в руке; hint-merge при первой паре (GameScene.checkHandHints из refreshHand).
- Микроподписи: у шкалы «3 ⚡ → Очищение» (EnergyView), «НАГРАДЫ» у бонусного ряда (HandView).

## Чекпоинт (финальный)
Что сделано: всё выше. Что дальше: DES-13. Файлы: storage.ts, GameScene.ts, EnergyView.ts, HandView.ts.
