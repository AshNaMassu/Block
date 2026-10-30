# DES-13: Game Over — статистика забега + советы

## Статус
✅ ЗАВЕРШЁН — коммит 77030b3.

## Решение
- core: `GameState.runStats` {lines, elemental, cleansings, maxCombo, specialsUsed}; engine place() шаг 10.5 инкрементирует; пресеты сбрасывают; loadGame досыпает нули для старых сейвов.
- Game Over: панель расширена (880×800), блок «Линии/Стихийные/Очищения/Комбо/Детонаторы» + один совет `runAdvice` (что не использовано).

## Чекпоинт (финальный)
Файлы: core/types.ts, core/engine.ts, game/debug/presets.ts, platform/storage.ts, GameScene.ts, core/__tests__/gameover.test.ts. Тесты 203/203.
