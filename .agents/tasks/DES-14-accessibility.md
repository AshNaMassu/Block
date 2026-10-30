# DES-14: Ошибки (тряска, красная подсветка) + доступность

## Статус
✅ ЗАВЕРШЁН — коммит 0cb942f.

## Решение
- Ошибка постановки: `DragController.indicateInvalid` — красная подложка на целевые клетки (0xff4d6d, fade) + лёгкая тряска камеры (skip при reducedFx) + Sfx.invalid.
- Символы стихий: CellView — эмодзи 🔥💧🌿💨 (multi 🌈) в углу клетки (дальтоникам).
- Тап-режим: тап по обычной/радужной фигуре выбирает её, тап по полю ставит (bbox от тапнутой клетки); DragController.handleBoardTap из GameScene.handlePointerDown. Спецфигуры — тап остался мерджем.
- Снижение эффектов: storage loadReducedFx/saveReducedFx + registry 'reducedFx'; CleansingFx (dim/вспышка/тряска слабее), тумблер «ЭФФЕКТЫ: ПОЛН/МИН» в меню.

## Чекпоинт (финальный)
Файлы: CellView.ts, DragController.ts, GameScene.ts, MenuScene.ts, CleansingFx.ts, storage.ts.
