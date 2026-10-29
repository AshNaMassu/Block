# STRUCTURE.md — карта кода (game/src)

## Слои

```
game/
├── index.html            # точка входа, канвас
├── package.json          # все npm-скрипты (cd game)
├── vite.config.ts / vitest.config.ts / tsconfig.json
└── src/
    ├── main.ts           # bootstrap: createGame, сцены, платформа
    ├── config/           # константы и баланс
    │   ├── balance.ts    # Energy capacity, очки, тайминги Fury — ГЕЙМПЛЕЙ/БАЛАНС, менять только с автором
    │   ├── elements.ts   # стихии, ELEMENT_COUNT=4 (осознанная правка автора!)
    │   ├── shapes.ts     # каталог фигур руки
    │   └── index.ts      # barrel
    ├── core/             # ИГРОВОЙ РАСЧЁТ — без Phaser (ESLint guard)
    │   ├── types.ts      # Grid, Cell, Piece, Hand, GameState, LineInfo, PlacementResult…
    │   ├── engine.ts     # applyPlacement — главная точка входа расчёта
    │   ├── grid.ts / lines.ts        # сетка 8×8, поиск линий (обычные + стихийные)
    │   ├── shapes.ts / hand.ts       # генерация фигур, рука (слоты, bonus-слоты)
    │   ├── specials.ts   # детонаторы fire/tide/vortex/spring + мердж
    │   ├── combo.ts / cleansing.ts / pure.ts   # комбо-награды, Очищение 3/3, Pure ×2/×1.5
    │   ├── energy.ts / fury.ts       # слоты Energy, Fury-режим (таймер, множитель)
    │   ├── gameover.ts   # условия конца
    │   ├── snapshot.ts   # сериализация состояния (сейвы)
    │   ├── rng.ts        # mulberry32, детерминизм
    │   └── __tests__/    # юнит-тесты core (~190, Vitest)
    ├── game/             # PHASER — view, ввод, FX, сцены
    │   ├── scenes/       # Boot → Preload → Menu → Game; DebugHubScene (?debug=1)
    │   ├── objects/      # BoardView, CellView, HandView, PieceView, HudView, EnergyView, FuryView
    │   ├── input/        # DragController (drag&drop, rainbow, детонаторы)
    │   ├── fx/           # LineClearFx, DetonationFx, CleansingFx, FxPool (пул объектов)
    │   ├── debug/        # DebugPanel, presets.ts — 15 пресет-сцен (только DEV)
    │   ├── ui/           # Button, Toast
    │   ├── layout.ts     # координаты UI (viewport 540 design-px)
    │   └── textures.ts   # процедурные текстуры
    ├── platform/         # IPlatform-абстракция; storage.ts — стаб, Yandex SDK — T-052
    ├── i18n/             # локализация (RU)
    └── utils/
```

## Поток данных

Ввод (DragController) → `core/engine.applyPlacement` → PlacementResult (очищенные линии, награды, Energy/Fury) → GameScene.refresh + FX + HUD. Core ничего не знает о Phaser; view только рисует результат.

## Ключевые инварианты

- `core/` не импортирует Phaser (ESLint `no-restricted-imports`).
- RNG детерминированный — вся логика через `rng()`, никакого `Math.random` в core.
- FX и view-объекты переиспользуются через FxPool.
- Дебаг (`game/debug/`, DebugHubScene) собирается только в DEV (`import.meta.env.DEV` гейтит кнопку).
