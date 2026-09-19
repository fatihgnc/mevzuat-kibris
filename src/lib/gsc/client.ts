import 'server-only';

import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

/** Domain property, so the identifier is `sc-domain:` + the bare domain. */
const SITE = process.env.GSC_SITE_URL || 'sc-domain:mevzuatkibris.com';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
}

function readServiceAccount(): ServiceAccount {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GSC_SERVICE_ACCOUNT_JSON tanımlı değil');

  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON içinde client_email/private_key yok');
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

const b64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

/** RS256-signed JWT for the service-account OAuth flow — no SDK needed for one grant type. */
export function signAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256').update(header + '.' + claims).sign(account.private_key);
  return header + '.' + claims + '.' + b64url(signature);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signAssertion(readServiceAccount(), now),
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('GSC token isteği reddedildi: ' + response.status + ' ' + (await response.text()));
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: now + body.expires_in };
  return body.access_token;
}

/** Search Console data lags by about two days, so the window ends there. */
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Pages under `pathContains`, most-clicked first, over the last `windowDays` days. */
export async function topPages(pathContains: string, windowDays: number, rowLimit: number): Promise<GscPageRow[]> {
  const response = await fetch(
    'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (await accessToken()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: isoDaysAgo(windowDays + 2),
        endDate: isoDaysAgo(2),
        dimensions: ['page'],
        dimensionFilterGroups: [
          { filters: [{ dimension: 'page', operator: 'contains', expression: pathContains }] },
        ],
        rowLimit,
      }),
      cache: 'no-store',
    },
  );
  if (!response.ok) {
    throw new Error('GSC sorgusu reddedildi: ' + response.status + ' ' + (await response.text()));
  }

  const body = (await response.json()) as {
    rows?: Array<{ keys: string[]; clicks: number; impressions: number }>;
  };
  return (body.rows ?? []).map((row) => ({
    page: row.keys[0] ?? '',
    clicks: row.clicks,
    impressions: row.impressions,
  }));
}
