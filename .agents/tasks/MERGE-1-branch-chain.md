# MERGE-1: Мерж цепочки веток в main + пуш

## Статус
🔧 В РАБОТЕ — мерж выполнен, проверка зелёная; остался пуш (только по явной просьбе автора).

## Контекст (что нужно знать)
- Стек веток (все локальные, не запушены): `main` → `feature/elemental-detonators` → `feature/crystal-visual` → `feature/debug-mode`.
- Голова `feature/debug-mode` (d0a690c) проверена автором: все 15 пресетов, кисть, тесты 190/190, tsc чист.
- Mержить цепочкой от основания к вершине, чтобы каждая ветка получила предыдущие изменения без конфликтов.
- **Push — только по явной просьбе автора** (RULES п.13). Мерж в main локально — в рамках таска можно.

## Шаги
- [x] 1. Проверить чистоту рабочих деревьев всех веток (`git status` на каждой).
- [x] 2. `git checkout feature/elemental-detonators && git merge main` (fast-forward ожидается).
- [x] 3. `git checkout feature/crystal-visual && git merge feature/elemental-detonators`.
- [x] 4. `git checkout feature/debug-mode && git merge feature/crystal-visual`.
- [x] 5. `git checkout main && git merge feature/debug-mode` (ветка debug-mode = вершина цепочки) — без конфликтов, main на 1130e47.
- [x] 6. `npm run check` в `game/` на main — тесты 190/190, tsc чист; попутно фикс линта DebugPanel import type (4cce3a1).
- [ ] 7. Пуш всех веток в `origin` — ТОЛЬКО после явного «да» автора.
- [ ] 8. Статус ✅, DONE.md, QUEUE.md (продвинуть T-045/T-046).

## Чекпоинт
Последний шаг: 6
Что сделано: цепочка слита без конфликтов (main = 1130e47 + 4cce3a1), npm run check зелёный (190/190, tsc чист); линт-фикс DebugPanel
Что дальше: пуш (шаг 7) — ждёт явного «да» автора; затем шаг 8 — закрытие
Изменённые файлы: game/src/game/debug/DebugPanel.ts (линт-фикс)
Открытые вопросы: пуш — только по явной просьбе автора. Замечена среда-особенность: prettier endOfLine lf vs autocrlf=true — `npm run check` в свежей рабочей копии падает на format:check, лечится разовым `prettier --write` (контент не меняет); рассмотреть .gitattributes eol=lf отдельной мелочью
