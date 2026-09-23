import { NextResponse, type NextRequest } from 'next/server';

/**
 * IP-based rate limiter for /karar/* — the OCR body text on record pages is the
 * thing we pay to produce, and it's what bulk scraping is after. Cloudflare has
 * its own rate-limiting rule in front of this, but that lives in the Cloudflare
 * dashboard and isn't something this repo can attest to at any point in time; this
 * is the layer we control from the code.
 *
 * In-memory state is safe here ONLY because the app runs as a single Node process
 * on one VPS (Coolify), not distributed serverless — every request lands on the
 * same process, so the Map is a real shared view. If this ever runs across
 * multiple replicas, swap this for Redis or it silently stops working (each
 * replica would count independently, multiplying the effective limit).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
/** Hard cap on tracked IPs so a flood of spoofed source IPs can't grow this Map forever. */
const RATE_LIMIT_MAX_TRACKED_IPS = 5000;

const kararHits = new Map<string, { count: number; resetAt: number }>();

/**
 * Known search-engine crawlers are exempt by User-Agent. This is spoofable — a
 * scraper can claim to be Googlebot — but the alternative (reverse-DNS verifying
 * every request) costs a DNS lookup per hit, and the asymmetry favors leniency:
 * accidentally throttling real Googlebot risks the whole archive's SEO (spec 8.4),
 * while a scraper that bothers to spoof this one header was going to get through
 * some other way regardless.
 *
 * Also covers what Bing Webmaster Tools and an AdSense placement need working:
 * `google-inspectiontool` is Search Console's URL-inspection fetch, and
 * `adsbot-google` / `mediapartners-google` are Google's ad-quality crawlers —
 * neither contains "googlebot" in its own UA string, so they'd otherwise be
 * indistinguishable from scraper traffic to this regex.
 *
 * The second group is link-preview fetchers: WhatsApp and Telegram in particular,
 * since that's how a record here actually spreads for this audience. Each one
 * only fetches once per share, nowhere near the limit on its own, but a link
 * pasted into a busy group chat can draw several near-simultaneous unfurls — no
 * reason to let the card silently fail to render over that.
 */
const KNOWN_SEARCH_BOTS =
  /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|duckduckbot|yandexbot|applebot(?!-extended)/i;

const KNOWN_LINK_PREVIEW_BOTS =
  /whatsapp|telegrambot|slackbot|twitterbot|facebookexternalhit|linkedinbot|discordbot|skypeuripreview/i;

function isRateLimited(ip: string, userAgent: string): boolean {
  if (KNOWN_SEARCH_BOTS.test(userAgent) || KNOWN_LINK_PREVIEW_BOTS.test(userAgent)) return false;

  const now = Date.now();
  const entry = kararHits.get(ip);

  if (!entry || entry.resetAt <= now) {
    if (kararHits.size >= RATE_LIMIT_MAX_TRACKED_IPS) kararHits.clear();
    kararHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/karar/')) {
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    if (isRateLimited(ip, userAgent)) {
      return new NextResponse('Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/karar/:path*'],
};
