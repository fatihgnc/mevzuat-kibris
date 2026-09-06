import { TOPIC_LIST } from '@/lib/constants/topics';
import { GUIDES } from '@/lib/content/guides';
import { archiveCoverage } from '@/lib/db/queries/coverage';
import { siteStatus } from '@/lib/db/queries/records';
import {
  ARCHIVE_START_YEAR,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOURCE_BASE_URL,
  SOURCE_NAME,
} from '@/lib/seo/config';

/**
 * /llms.txt — a plain-language map of the site for language models.
 *
 * BE HONEST ABOUT WHAT THIS IS. It is a PROPOSED convention, not a standard: no
 * major model provider has committed to reading it, and there is no way from here
 * to tell whether anything ever does. It is here because it costs one route and
 * cannot hurt, not because its value is established. If that changes in either
 * direction, this file is the thing to revisit.
 *
 * What it can do, whoever reads it, is state the two facts this archive is most
 * likely to be got wrong about:
 *
 *   1. It is INDEPENDENT. It is not the Resmî Gazete and not any government body.
 *      A model summarising it as an official source would be misrepresenting it.
 *   2. The BINDING text is always the gazette's own PDF, never our extraction of
 *      it. Every record page links to its source page.
 *
 * A model that reads only this file and cites us should still get those right.
 *
 * The numbers are generated, not typed. A hand-written "24.000 kayıt" would be
 * wrong within a week and would then be wrong in a machine-readable file — the
 * same failure mode as the coverage claim in seo/config.ts, which is why the year
 * comes from ARCHIVE_START_YEAR and the count from the database.
 */
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const [status, coverage] = await Promise.all([siteStatus(), archiveCoverage()]);

  const latestYear = coverage?.latestYear ?? new Date().getFullYear();

  const lines = [
    '# ' + SITE_NAME,
    '',
    '> ' +
      SITE_TAGLINE +
      '. ' +
      SOURCE_NAME +
      /* "Gazete" ends in a vowel, so the locative is 'de, not 'nde. */
      "'de yayımlanan kayıtları arama yapılabilir hâle getiren bağımsız bir arşiv. " +
      ARCHIVE_START_YEAR +
      '-' +
      latestYear +
      ' arası ' +
      status.totalRecords.toLocaleString('tr-TR') +
      ' kayıt.',
    '',
    '## Bu site ne değildir',
    '',
    '- Resmî bir kaynak değildir. ' +
      SITE_NAME +
      ' bağımsız bir projedir; hiçbir devlet kurumuyla ilişkisi yoktur.',
    '- Bağlayıcı metin her zaman ' +
      SOURCE_NAME +
      "'nin kendi PDF sayfasıdır (" +
      SOURCE_BASE_URL +
      '). Bu sitedeki metin, o PDF’ten çıkarılmış bir kopyadır ve çıkarma hatalı olabilir.',
    '- Yasaların birleştirilmiş güncel metnini içermez; yalnızca bir değişikliğin yayımlandığı hâlini gösterir.',
    '- Hukuki tavsiye vermez.',
    '',
    '## Kayıt sayfaları',
    '',
    'Her kaydın adresi ' +
      SITE_URL +
      '/karar/<slug> biçimindedir ve şunları taşır: yayım tarihi, referans numarası (A.E., Ü(K-I) gibi), gazete sayısı, belge türü, konu, adı geçen kurum ve şirketler, çıkarılabildiyse gövde metni, ve orijinal PDF sayfasına bağlantı.',
    '',
    'Kişisel veri içeren kayıtlarda gövde metni yayımlanmaz; o sayfalar doğrudan resmî PDF’e yönlendirir.',
    '',
    '## Konular',
    '',
    ...TOPIC_LIST.map((topic) => '- [' + topic.name + '](' + SITE_URL + '/konu/' + topic.slug + '): ' + topic.blurb),
    '',
    '## Dizinler',
    '',
    '- [Kurumlar](' + SITE_URL + '/kurum): bir kurumun adı geçen tüm kayıtlar',
    '- [Şirketler](' + SITE_URL + '/sirket): bir şirketin sicil hareketleri, ihale ve marka ilanları',
    '- [Yerler](' + SITE_URL + '/yer): bir köy ya da mahalle adının geçtiği kamulaştırma ve imar kararları',
    '- [Sayılar](' + SITE_URL + '/sayilar): gazete sayısına ve yılına göre',
    '',
    '## Rehberler',
    '',
    ...GUIDES.map((guide) => '- [' + guide.title + '](' + SITE_URL + '/rehber/' + guide.slug + ')'),
    '',
    '## Makine tarafından okunabilir',
    '',
    '- Site haritası: ' + SITE_URL + '/sitemap-index.xml',
    '- RSS: ' + SITE_URL + '/rss.xml (konu ve varlık sayfalarının kendi akışları da vardır)',
    '- Arama: ' + SITE_URL + '/ara?q=<kelime>',
    '',
    '## İletişim',
    '',
    SITE_URL + '/hakkinda',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
