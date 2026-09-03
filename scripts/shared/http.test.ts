import { describe, expect, it } from 'vitest';

import { SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { absolutize, archiveUrl, isTransientNetworkError } from './http';

describe('absolutize', () => {
  it('resolves ordinary links against the main host', () => {
    expect(absolutize('/Portals/6/2025/262.pdf')).toBe(SOURCE_BASE_URL + '/Portals/6/2025/262.pdf');
  });

  /*
   * Measured, not assumed: /Portals/105/ is 404 on the main host for every issue
   * of 2018-2020 and 200 on the archive host. See the note in http.ts.
   */
  it('sends /Portals/105/ links to the archive host', () => {
    expect(absolutize('/Portals/105/2018/194.pdf')).toBe(
      'http://arsiv.basimevi.gov.ct.tr/Portals/105/2018/194.pdf',
    );
  });

  /* The archive host serves no TLS, so the scheme must stay http. */
  it('keeps the archive host on http', () => {
    expect(absolutize('/Portals/105/2019/1.pdf').startsWith('http://')).toBe(true);
  });

  /* The query string carries DNN's ?ver= cache buster; it must survive. */
  it('preserves the query string', () => {
    expect(absolutize('/Portals/105/2018/110.pdf?ver=2018-07-19-110119-923')).toBe(
      'http://arsiv.basimevi.gov.ct.tr/Portals/105/2018/110.pdf?ver=2018-07-19-110119-923',
    );
  });

  /* Spaces appear in real hrefs ("195 1.pdf", twice in 2018). */
  it('encodes spaces in file names', () => {
    expect(absolutize('/Portals/105/2018/195 1.pdf')).toBe(
      'http://arsiv.basimevi.gov.ct.tr/Portals/105/2018/195%201.pdf',
    );
  });

  it('leaves already-absolute links alone', () => {
    expect(absolutize('https://example.test/a.pdf')).toBe('https://example.test/a.pdf');
  });
});

describe('archiveUrl', () => {
  it('URL-encodes the Turkish path segment', () => {
    expect(archiveUrl(2018)).toBe(SOURCE_BASE_URL + '/AR%C5%9E%C4%B0V/2018');
  });
});

/**
 * Node reports a DNS failure and a malformed header the same way -- both are
 * `TypeError: fetch failed`. politeFetch must retry the first and give up on the
 * second, so the only thing separating them is `cause.code`. DNS for the source
 * host went away four times in one session; without this the job died each time.
 */
describe('isTransientNetworkError', () => {
  function fetchFailed(code?: string): TypeError {
    const error = new TypeError('fetch failed');
    (error as { cause?: unknown }).cause = code ? Object.assign(new Error(code), { code }) : undefined;
    return error;
  }

  it('DNS hatasını geçici sayar', () => {
    expect(isTransientNetworkError(fetchFailed('ENOTFOUND'))).toBe(true);
    expect(isTransientNetworkError(fetchFailed('EAI_AGAIN'))).toBe(true);
  });

  it('bağlantı hatalarını geçici sayar', () => {
    expect(isTransientNetworkError(fetchFailed('ECONNRESET'))).toBe(true);
    expect(isTransientNetworkError(fetchFailed('UND_ERR_CONNECT_TIMEOUT'))).toBe(true);
  });

  /* The Turkish-character-in-a-header case: no cause, must NOT be retried. */
  it('istek kurulamadığında geçici SAYMAZ', () => {
    expect(isTransientNetworkError(fetchFailed())).toBe(false);
    expect(isTransientNetworkError(new TypeError('Failed to parse URL from ///'))).toBe(false);
  });

  it('alakasız değerlerde patlamaz', () => {
    expect(isTransientNetworkError(null)).toBe(false);
    expect(isTransientNetworkError('ENOTFOUND')).toBe(false);
  });
});
