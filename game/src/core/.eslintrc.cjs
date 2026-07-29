// Локальный overrides для src/core: ЖЁСТКИЙ запрет на импорт Phaser.
// Правило из TECH_TASKS.md B.3.1: core-логика не зависит от движка.
// Это ловит нарушение ещё на этапе линта, до ревью.
module.exports = {
  root: false,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'phaser',
            message:
              'ЗАПРЕЩЕНО: core-логика не должна зависеть от Phaser. ' +
              'Рендер/ввод/звук — в src/game. См. TECH_TASKS.md B.3.1.',
          },
        ],
      },
    ],
  },
};
