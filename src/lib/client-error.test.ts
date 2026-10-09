import { describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, reloadOnce } from './client-error';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('isChunkLoadError', () => {
  it('recognises webpack chunk failures', () => {
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'x' })).toBe(true);
    expect(isChunkLoadError({ name: 'Error', message: 'Loading chunk 7219 failed.' })).toBe(true);
    expect(isChunkLoadError({ name: 'Error', message: 'Loading CSS chunk app-layout failed' })).toBe(true);
  });

  it('recognises browser module-load failures', () => {
    expect(isChunkLoadError({ message: 'Failed to fetch dynamically imported module: /x.js' })).toBe(true);
    expect(isChunkLoadError({ message: 'Importing a module script failed.' })).toBe(true);
  });

  it('leaves ordinary errors alone', () => {
    expect(isChunkLoadError({ name: 'TypeError', message: "Cannot read properties of undefined (reading 'x')" })).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadOnce', () => {
  it('reloads on the first failure', () => {
    const reload = vi.fn();
    expect(reloadOnce(memoryStorage(), 1_000_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload again within 30 seconds', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadOnce(storage, 1_000_000, reload);
    expect(reloadOnce(storage, 1_010_000, reload)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads again once the window has passed', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadOnce(storage, 1_000_000, reload);
    expect(reloadOnce(storage, 1_031_000, reload)).toBe(true);
  });

  it('never reloads without storage, so it cannot loop', () => {
    const reload = vi.fn();
    expect(reloadOnce(null, 1_000_000, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
