/**
 * Platform-слой: абстракция над Yandex SDK / рекламой / сейвами / аналитикой.
 *
 * Правило (TECH_TASKS.md B.3.3): игровой код обращается к платформе ТОЛЬКО через
 * интерфейс `IPlatform`, никогда напрямую к `YaGames`.
 *
 * Содержит: IPlatform, YandexPlatform, MockPlatform, WebPlatform,
 * storage, analytics, ads.
 *
 * Наполняется в Milestone 4 (T-050..T-053).
 */
export * from './storage';
