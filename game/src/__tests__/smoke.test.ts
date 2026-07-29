import { describe, it, expect } from 'vitest';

/**
 * Smoke-тест: проверяет, что Vitest вообще запускается.
 * Будет удалён/заменён реальными тестами в T-023 (core integration tests).
 */
describe('vitest smoke', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('handles arrays and objects', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
