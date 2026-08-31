import { describe, expect, it } from 'vitest';

import { pageWindow } from './index';

/** Okunması kolay olsun diye: [1, null, 9, 10, 11, null, 30] → "1 … 9 10 11 … 30" */
function render(page: number, total: number): string {
  return pageWindow(page, total)
    .map((item) => (item === null ? '…' : String(item)))
    .join(' ');
}

describe('pageWindow', () => {
  it('az sayfada hepsini gösterir, üç nokta koymaz', () => {
    expect(render(1, 1)).toBe('1');
    expect(render(3, 7)).toBe('1 2 3 4 5 6 7');
  });

  it('ortada: 1 … n-1 n n+1 … son', () => {
    expect(render(10, 30)).toBe('1 … 9 10 11 … 30');
    expect(render(15, 64)).toBe('1 … 14 15 16 … 64');
  });

  it('başa yakınken baştaki üç nokta düşer', () => {
    expect(render(1, 30)).toBe('1 2 … 30');
    expect(render(2, 30)).toBe('1 2 3 … 30');
    expect(render(3, 30)).toBe('1 2 3 4 … 30');
  });

  it('sona yakınken sondaki üç nokta düşer', () => {
    expect(render(30, 30)).toBe('1 … 29 30');
    expect(render(29, 30)).toBe('1 … 28 29 30');
    // 29 ile 30 bitişik; araya üç nokta girmez.
    expect(render(28, 30)).toBe('1 … 27 28 29 30');
    expect(render(27, 30)).toBe('1 … 26 27 28 … 30');
  });

  it('bitişik sayfalar arasına üç nokta koymaz', () => {
    // 4. sayfada 1 ile 3 arasında boşluk YOK; "1 … 3" yanlış olurdu.
    expect(render(4, 30)).toBe('1 … 3 4 5 … 30');
    expect(render(3, 30)).not.toContain('1 … 2');
  });

  it('aralık dışına taşmaz ve sıralı, tekrarsız üretir', () => {
    for (const total of [8, 30, 64, 199]) {
      for (const page of [1, 2, 3, Math.floor(total / 2), total - 1, total]) {
        const numbers = pageWindow(page, total).filter((item): item is number => item !== null);

        expect(Math.min(...numbers), 'page=' + page + ' total=' + total).toBeGreaterThanOrEqual(1);
        expect(Math.max(...numbers), 'page=' + page + ' total=' + total).toBeLessThanOrEqual(total);
        expect(numbers, 'sıralı olmalı').toEqual([...numbers].sort((a, b) => a - b));
        expect(new Set(numbers).size, 'tekrar olmamalı').toBe(numbers.length);
        expect(numbers).toContain(1);
        expect(numbers).toContain(total);
        expect(numbers, 'geçerli sayfa her zaman görünür').toContain(page);
      }
    }
  });
});
