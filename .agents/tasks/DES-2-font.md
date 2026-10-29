# DES-2: Шрифт с кириллицей — Manrope, загрузка woff2

## Статус
🔧 В РАБОТЕ

## Контекст (что нужно знать)
- Первоисточник: [docs/DESIGN-neon-alchemy.md](../../docs/DESIGN-neon-alchemy.md) §19 (типографика).
- Варианты концепта: Manrope, Golos Text, Rubik, Onest, Montserrat. Выбор — **Manrope**:
  первый в списке концепта, вариативный шрифт (один woff2 = все веса), кириллица есть,
  геометричный, свободная лицензия (OFL). Golos Text — запасной вариант.
- Все тексты Phaser сейчас инлайнят `fontFamily: 'system-ui, Arial, sans-serif'` — уводим
  в константу `FONT_FAMILY` в `config/elements.ts` (правило B.3.4: всё centrale в конфиге).
- Табличные цифры (DESIGN §19): Phaser рисует текст через canvas — CSS
  `font-variant-numeric: tabular-nums` не применяется. Manrope по умолчанию близок к
  моноширинным цифрам; точную табличность отложить (можно fixed-width подкладкой позже,
  если счёт будет «прыгать»).
- Шрифт кладём локально (грабли Hook R1: CDN jsdelivr в РФ flaky; Яндексе — свой аудит).
- Загрузка: @font-face в index.html + ожидание `document.fonts.ready` в BootScene до
  старта Menu, иначе Phaser отрисует первые тексты системным шрифтом.

## Шаги
- [ ] 1. Скачать woff2 (cyrillic + latin сабсеты, weights 400–800) в `game/public/fonts/`.
- [ ] 2. @font-face в `game/index.html`.
- [ ] 3. `FONT_FAMILY` в config; заменить инлайновые 'system-ui, Arial' на константу.
- [ ] 4. BootScene: ждать document.fonts.ready (с таймаутом-фоллбэком ~1.5с).
- [ ] 5. `npm run check`, скриншоты меню/поля, коммит, DONE/QUEUE.

## Чекпоинт
Последний шаг: 0
Что сделано: таск заведён, шрифт выбран (Manrope), план зафиксирован
Что дальше: шаг 1 — скачать woff2
Изменённые файлы: —
Открытые вопросы: нет
