# Очередь

## АКТИВНЫЙ ТАСК
MERGE-1: [Мерж цепочки веток в main + пуш](tasks/MERGE-1-branch-chain.md) — ⬜ не начат.
Дебаг-режим готов и проверен (все 15 пресетов, кисть, тесты 190/190, tsc чист).
Осталось: main → elemental-detonators → crystal-visual → debug-mode, затем пуш (только по явной просьбе автора).

## СЛЕДУЮЩИЕ (не читать, пока не дойдут)
Остаток Milestone 3 (игровой поток) — детали в docs/TECH_TASKS.md:
- [ ] T-045: [Fury mode — таймер, множитель, перезапись] (частично есть: EnergyView/FuryView отображают; проверить объём остатка по коду)
- [ ] T-046: [Game over flow — rewarded continue ×1, interstitial если не continue]

Milestone 4 (платформа, онбординг, полировка) — детали в docs/TECH_TASKS.md:
- [ ] T-050: Platform abstraction (IPlatform, MockPlatform, YandexPlatform)
- [ ] T-051: LocalStorage save/resume
- [ ] T-052: Yandex SDK integration (rewarded, interstitial, player data)
- [ ] T-053: Analytics (все события GDD)
- [ ] T-054: Onboarding controller (controlled-спавн, skip)
- [ ] T-055: Sound (BGM adaptive, SFX, toggle)
- [ ] T-056: Polish FX (pop, laser, radial wave, cascade, flash, aura)
- [ ] T-057: Debug panel доработка (?debug=1 — хаб уже есть, см. DONE DEBUG-1)
- [ ] T-058: Performance pass (60 FPS, mobile)
- [ ] T-059: Build and ZIP для Яндекс Игр
- [ ] T-060: QA checklist

Мелочи из NEXT_STEPS (опционально, брать по одной):
- [ ] OPT-1: юнит-тесты debug-API движка (пресеты → ожидаемые результаты)
- [ ] OPT-2: перерисовка drag-копии Прилива только при смене ориентации (сейчас renderPiece на каждый move)

## ОЖИДАЮТ ОБСУЖДЕНИЯ АВТОРА (геймплей/баланс)
- Идеи из docs/POST-MVP.md (порча — POST-MVP, TRIGLADS и пр.) — не начинать без решения автора.

## БЛОКИРОВАННЫЕ (ждут решения автора)
(нет)

## Открытые вопросы
- Порядок Milestone 4: T-050/T-051 (сохранения) до T-055/T-056 (полировка)? Предположение — да, сейвы раньше полировки.
- Синхронизировать ли docs/PROGRESS.md с фактическим состоянием кода (T-040..T-044 отмечены как готовые) — отдельная мелкая задача по согласованию.
