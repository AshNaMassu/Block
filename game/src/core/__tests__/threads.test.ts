import { describe, it, expect } from 'vitest';
import { findElementalThreads } from '../lines';
import { createGrid, setCell } from '../grid';
import type { Cell } from '../types';

const fire = (): Cell => ({ element: 0, multi: false, special: false });
const water = (): Cell => ({ element: 1, multi: false, special: false });
const multi = (): Cell => ({ element: -1, multi: true, special: false });

describe('findElementalThreads (DES-6)', () => {
  it('6 клеток одной стихии в строке -> нить natural=6', () => {
    const grid = createGrid();
    for (let x = 0; x < 6; x++) setCell(grid, x, 2, fire());
    expect(findElementalThreads(grid)).toEqual([
      { type: 'row', index: 2, element: 0, natural: 6 },
    ]);
  });

  it('7 клеток -> нить natural=7; 8 (полная) -> нити нет', () => {
    const grid = createGrid();
    for (let x = 0; x < 7; x++) setCell(grid, x, 0, water());
    expect(findElementalThreads(grid)).toEqual([
      { type: 'row', index: 0, element: 1, natural: 7 },
    ]);
    setCell(grid, 7, 0, water());
    expect(findElementalThreads(grid)).toEqual([]);
  });

  it('multi-клетки совместимы: 6 стихии + 1 multi + 1 пустая -> нить', () => {
    const grid = createGrid();
    for (let x = 0; x < 6; x++) setCell(grid, x, 4, fire());
    setCell(grid, 6, 4, multi());
    expect(findElementalThreads(grid)).toEqual([
      { type: 'row', index: 4, element: 0, natural: 6 },
    ]);
  });

  it('чужая стихия в линии -> нити нет', () => {
    const grid = createGrid();
    for (let x = 0; x < 6; x++) setCell(grid, x, 1, fire());
    setCell(grid, 6, 1, water());
    expect(findElementalThreads(grid)).toEqual([]);
  });

  it('нить в столбце', () => {
    const grid = createGrid();
    for (let y = 0; y < 7; y++) setCell(grid, 3, y, water());
    expect(findElementalThreads(grid)).toEqual([
      { type: 'column', index: 3, element: 1, natural: 7 },
    ]);
  });

  it('5 клеток -> нити нет (порог 6)', () => {
    const grid = createGrid();
    for (let x = 0; x < 5; x++) setCell(grid, x, 5, fire());
    expect(findElementalThreads(grid)).toEqual([]);
  });

  it('порядок: строки сверху вниз, затем столбцы слева направо', () => {
    const grid = createGrid();
    for (let x = 0; x < 6; x++) setCell(grid, x, 6, fire());
    for (let y = 0; y < 6; y++) setCell(grid, 7, y, water());
    const threads = findElementalThreads(grid);
    expect(threads.map((t) => `${t.type}${t.index}`)).toEqual(['row6', 'column7']);
  });
});
