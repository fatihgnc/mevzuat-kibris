import { afterEach, describe, expect, it } from 'vitest';

import { unsubscribeToken, userUnsubscribeToken } from './template';

/**
 * The unsubscribe token is an HMAC, and the two sides that use it live in
 * different environments: GitHub Actions signs it (dispatch-alerts) and Vercel
 * verifies it (/api/abonelik-iptal). If they resolve the key differently, every
 * unsubscribe link reads as invalid — silently, and only once a user clicks one.
 *
 * These tests pin the two properties that keep the sides in agreement.
 */
const KEYS = ['ALERT_UNSUBSCRIBE_SECRET', 'REVALIDATE_SECRET'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('unsubscribe token key resolution', () => {
  it('falls back to REVALIDATE_SECRET when the dedicated name is EMPTY, not just unset', () => {
    /*
     * The regression this exists for: `??` treats '' as a real value, so an
     * empty ALERT_UNSUBSCRIBE_SECRET handed HMAC an empty key instead of falling
     * back. `.env.example` ships the name with an empty value, so copying it is
     * enough to land there — and the failure is invisible until someone clicks
     * unsubscribe.
     */
    process.env.REVALIDATE_SECRET = 'shared-secret';

    process.env.ALERT_UNSUBSCRIBE_SECRET = '';
    const withEmpty = unsubscribeToken(42);

    delete process.env.ALERT_UNSUBSCRIBE_SECRET;
    const withUnset = unsubscribeToken(42);

    expect(withEmpty).toBe(withUnset);
  });

  it('prefers the dedicated secret when it is actually set', () => {
    process.env.REVALIDATE_SECRET = 'shared-secret';
    process.env.ALERT_UNSUBSCRIBE_SECRET = 'dedicated-secret';
    const dedicated = unsubscribeToken(42);

    delete process.env.ALERT_UNSUBSCRIBE_SECRET;
    expect(dedicated).not.toBe(unsubscribeToken(42));
  });

  it('signs alerts and users into different subjects', () => {
    /*
     * The prefix is part of what is signed so the two token shapes cannot be
     * swapped: an alert id must never unsubscribe a whole account. Both take the
     * id as a string here only to prove the subjects differ.
     */
    process.env.REVALIDATE_SECRET = 'shared-secret';
    expect(unsubscribeToken(7)).not.toBe(userUnsubscribeToken('7'));
  });
});
