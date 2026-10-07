import { afterEach, describe, expect, it, vi } from 'vitest';

import { adsAllowed } from './ads';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

/** A minimal browser: the gate only touches location, navigator and localStorage. */
function browser({
  url = 'https://mevzuatkibris.com/',
  userAgent = CHROME_UA,
  webdriver = false,
  store = new Map<string, string>(),
}: { url?: string; userAgent?: string; webdriver?: boolean; store?: Map<string, string> } = {}) {
  const u = new URL(url);
  vi.stubGlobal('window', { location: { hostname: u.hostname, search: u.search } });
  vi.stubGlobal('navigator', { userAgent, webdriver });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

afterEach(() => vi.unstubAllGlobals());

describe('adsAllowed', () => {
  it('allows an ordinary visit on the production host', () => {
    browser();
    expect(adsAllowed()).toBe(true);
  });

  it('allows the www host too', () => {
    browser({ url: 'https://www.mevzuatkibris.com/yasa' });
    expect(adsAllowed()).toBe(true);
  });

  it('refuses non-production hosts', () => {
    browser({ url: 'http://localhost:3061/' });
    expect(adsAllowed()).toBe(false);
    browser({ url: 'https://preview.example.dev/' });
    expect(adsAllowed()).toBe(false);
  });

  it('refuses driven and crawler browsers', () => {
    browser({ webdriver: true });
    expect(adsAllowed()).toBe(false);
    browser({ userAgent: CHROME_UA.replace('Chrome', 'HeadlessChrome') });
    expect(adsAllowed()).toBe(false);
    browser({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
    expect(adsAllowed()).toBe(false);
  });

  it('remembers the owner opt-out and lifts it again', () => {
    const store = browser({ url: 'https://mevzuatkibris.com/?reklamsiz=1' });
    expect(adsAllowed()).toBe(false);

    browser({ url: 'https://mevzuatkibris.com/karar/x', store });
    expect(adsAllowed()).toBe(false);

    browser({ url: 'https://mevzuatkibris.com/?reklamsiz=0', store });
    expect(adsAllowed()).toBe(true);
  });

  it('stores the opt-out even on a host that is refused anyway', () => {
    const store = browser({ url: 'http://localhost:3061/?reklamsiz=1' });
    adsAllowed();
    expect(store.get('reklamsiz')).toBe('1');
  });
});
