import { ARCHIVE_START_YEAR, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/config';
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/seo/og-card';
import { TOOLS } from '@/lib/tools/registry';

export const alt = SITE_NAME + ' — ' + SITE_TAGLINE;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/*
 * What the site does that the gazette's own PDFs do not, in the order most visits
 * come for: vacancies first, then search, the consolidated laws and the
 * calculators. Every line is something a page on the site actually delivers.
 */
const FEATURES = [
  { title: 'Münhal ilanları', detail: 'başvurusu açık olanlar ayrı listede' },
  { title: 'Tam metin arama', detail: 'her sayı, her karar, her ilan' },
  { title: 'Yasalar ve tüzükler', detail: 'birleştirilmiş güncel metinler' },
  { title: TOOLS.length + ' ücretsiz hesaplayıcı', detail: 'maaş, izin, harç, tazminat' },
];

/**
 * The site-wide share card — spec 8.4.
 *
 * `buildMetadata` promises `twitter:card = summary_large_image` on every page, so the
 * app root hands this card to every route that does not define its own. The layout
 * is shared with the record and calculator cards via `ogCard`; this one fills the
 * summary slot with the four things the site is used for instead of a sentence.
 */
export default function Image() {
  return ogCard({
    heading: "Resmî Gazete'de aradığını hemen bul",
    headingSize: 60,
    summary: (
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 1000, rowGap: 22, marginTop: 6 }}>
        {FEATURES.map((feature) => (
          <div key={feature.title} style={{ display: 'flex', width: 500, alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', width: 6, height: 62, borderRadius: 3, background: '#F2C14E' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 31, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>{feature.title}</span>
              <span style={{ fontSize: 23, lineHeight: 1.3 }}>{feature.detail}</span>
            </div>
          </div>
        ))}
      </div>
    ),
    footer: 'Ücretsiz  ·  kayıt gerektirmez  ·  ' + ARCHIVE_START_YEAR + ' — bugün',
  });
}
