# DES-15: Звук/вибро (v1 — процедурный SFX; BGM — остаток T-055)

## Статус
✅ ЗАВЕРШЁН (v1) — коммит ab71e36. Вибро и адаптивный BGM — остаток T-055, не начат.

## Решение
- platform/sound.ts: WebAudio-синтез без ассетов (lazy AudioContext после жеста): place/invalid/lineClear/combo/cleansing/fury/merge/gameover; флаг muted в localStorage.
- Подключено: GameScene (afterMove: place/lineClear/combo/fury; cleansing; merge; gameover), DragController (invalid).
- Тумблер «ЗВУК ВКЛ/ВЫКЛ» в меню рядом с «ЭФФЕКТЫ».

## Чекпоинт (финальный)
Файлы: platform/sound.ts (новый), GameScene.ts, DragController.ts, MenuScene.ts.
