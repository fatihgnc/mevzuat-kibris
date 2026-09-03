import { describe, expect, it } from 'vitest';

import { SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { absolutize, archiveUrl } from './http';

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
