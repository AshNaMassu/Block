# MERGE-1: Мерж цепочки веток в main + пуш

## Статус
⬜ НЕ НАЧАТ

## Контекст (что нужно знать)
- Стек веток (все локальные, не запушены): `main` → `feature/elemental-detonators` → `feature/crystal-visual` → `feature/debug-mode`.
- Голова `feature/debug-mode` (d0a690c) проверена автором: все 15 пресетов, кисть, тесты 190/190, tsc чист.
- Mержить цепочкой от основания к вершине, чтобы каждая ветка получила предыдущие изменения без конфликтов.
- **Push — только по явной просьбе автора** (RULES п.13). Мерж в main локально — в рамках таска можно.

## Шаги
- [ ] 1. Проверить чистоту рабочих деревьев всех веток (`git status` на каждой).
- [ ] 2. `git checkout feature/elemental-detonators && git merge main` (fast-forward ожидается).
- [ ] 3. `git checkout feature/crystal-visual && git merge feature/elemental-detonators`.
- [ ] 4. `git checkout feature/debug-mode && git merge feature/crystal-visual`.
- [ ] 5. `git checkout main && git merge feature/debug-mode` (ветка debug-mode = вершина цепочки).
- [ ] 6. Прогнать `npm run check` в `game/` на main — тесты 190/190, tsc чист.
- [ ] 7. Пуш всех веток в `origin` — ТОЛЬКО после явного «да» автора.
- [ ] 8. Статус ✅, DONE.md, QUEUE.md (продвинуть T-045/T-046).

## Чекпоинт
Последний шаг: 0
Что сделано: таск заведён из docs/NEXT_STEPS.md
Что дальше: шаг 1 — проверка чистоты деревьев
Изменённые файлы: —
Открытые вопросы: пуш — только после явной просьбы автора
