# DES-2: Шрифт с кириллицей — Manrope, загрузка woff2

## Статус
✅ ЗАВЕРШЁН — 8ebebbd, check зелёный, скриншот снят (подтверждение автором по скрину — по умолчанию ок).

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
- [x] 1. woff2 скачаны (Google Fonts, вариативный 200..800): `game/public/fonts/manrope-cyrillic.woff2` (14 КБ) + `manrope-latin.woff2` (25 КБ).
- [x] 2. @font-face с unicode-range в `game/index.html`; заодно boot-экран перекрашен в тёмную тему (хвост DES-1: background/theme-color #060A13).
- [x] 3. `FONT_FAMILY` в config/elements.ts; заменил инлайновый `'system-ui, Arial, sans-serif'` в 9 файлах (Button, Toast, PieceView, HudView, FuryView, GameScene, MenuScene, DebugPanel, DebugHubScene).
- [x] 4. BootScene: `waitForFonts` — document.fonts.load + fonts.ready, таймаут-фоллбэк 1.5с (флаг done против двойного next).
- [x] 5. `npm run check` зелёный (190/190); скриншот меню с Manrope снят; коммит 8ebebbd; DONE/QUEUE обновлены.

## Чекпоинт (финальный)
Последний шаг: 5
Что сделано: Manrope локально (cyr+latin, вариативный), FONT_FAMILY в конфиге, BootScene ждёт шрифт; коммит 8ebebbd на feature/neon-alchemy
Что дальше: DES-3 (пайплайн ассетов + промпты) или DES-4 (previewPlacement в core)
Изменённые файлы: game/index.html, public/fonts/*, config/elements.ts, scenes/{Boot,Menu,Game,DebugHub}Scene.ts, objects/{PieceView,HudView,FuryView}.ts, ui/{Button,Toast}.ts, debug/DebugPanel.ts
Открытые вопросы: табличные цифры через font-variant-numeric в canvas-тексте Phaser неприменимы — если счёт «прыгает», сделать fixed-width подкладку отдельной мелочью
