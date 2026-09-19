import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/db/queries/records', () => ({ recordsBySlugs: vi.fn() }));

import { signAssertion } from './client';
import { slugFromPageUrl } from './top-records';

describe('signAssertion', () => {
  it('produces a JWT whose RS256 signature verifies and whose claims name the account', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const jwt = signAssertion({ client_email: 'gsc@p.iam.gserviceaccount.com', private_key: privateKey }, 1000);
    const [header, claims, signature] = jwt.split('.') as [string, string, string];

    const valid = createVerify('RSA-SHA256')
      .update(header + '.' + claims)
      .verify(publicKey, Buffer.from(signature, 'base64url'));
    expect(valid).toBe(true);

    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toMatchObject({
      iss: 'gsc@p.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1000,
      exp: 4600,
    });
  });
});

describe('slugFromPageUrl', () => {
  it('extracts the slug from a karar URL, with or without a trailing slash', () => {
    expect(slugFromPageUrl('https://mevzuatkibris.com/karar/2025-x-140-7-tapu')).toBe('2025-x-140-7-tapu');
    expect(slugFromPageUrl('https://mevzuatkibris.com/karar/abc/')).toBe('abc');
  });

  it('rejects non-karar pages and garbage', () => {
    expect(slugFromPageUrl('https://mevzuatkibris.com/konu/munhal')).toBeNull();
    expect(slugFromPageUrl('https://mevzuatkibris.com/karar/a/b')).toBeNull();
    expect(slugFromPageUrl('not a url')).toBeNull();
  });
});
