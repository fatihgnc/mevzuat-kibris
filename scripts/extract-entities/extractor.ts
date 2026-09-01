import { entitySlug } from '../../src/lib/text/slugify';
import { normalizeForSearch, turkishUpper } from '../../src/lib/text/turkish-lower';
import { titleCase } from '../shared/turkish-suffix';
import type { EntityKind } from '../../src/types/record';

/**
 * Entity extraction — spec 7.1 step 6.
 *
 * Three kinds: institution, company, place. People are DELIBERATELY absent (spec
 * 3.7 rule 1): we do not generate /kisi/[slug] pages, so we do not extract
 * personal names either. Not building an index of people's names is an explicit
 * product decision.
 */

export interface ExtractedEntity {
  kind: EntityKind;
  name: string;
  slug: string;
  nameNormalized: string;
  district: string | null;
  confidence: number;
}

/**
 * Known institutions. We use a fixed list because institution names are written
 * consistently in the gazette, and free extraction turns everything ending in
 * "Dairesi" or "Bakanlığı" into an institution and produces noise.
 */
const INSTITUTIONS = [
  'Kamu Hizmeti Komisyonu',
  'Bakanlar Kurulu',
  'Cumhuriyet Meclisi',
  'Anayasa Mahkemesi',
  'Rekabet Kurulu',
  'Eski Eserler Yüksek Kurulu',
  'Şirketler Mukayyitliği',
  'Resmî Kabz Memurluğu',
  'KKTC Merkez Bankası',
  'Kıbrıs Türk Elektrik Kurumu',
  'Maliye Bakanlığı',
  'Sağlık Bakanlığı',
  'Milli Eğitim Bakanlığı',
  'İçişleri Bakanlığı',
  'Dışişleri Bakanlığı',
  'Turizm ve Çevre Bakanlığı',
  'Bayındırlık ve Ulaştırma Bakanlığı',
  'Tarım ve Doğal Kaynaklar Bakanlığı',
  'Çalışma ve Sosyal Güvenlik Bakanlığı',
  'Ekonomi ve Enerji Bakanlığı',
  'Başbakanlık',
  'Gelir ve Vergi Dairesi',
  'Hazine ve Muhasebe Dairesi',
  'Sosyal Sigortalar Dairesi',
  'Yataklı Tedavi Kurumları Dairesi',
  'Gümrük ve Rüsumat Dairesi',
  'Tapu ve Kadastro Dairesi',
  'Şehir Planlama Dairesi',
  'Meteoroloji Dairesi',
];

/**
 * Places, with their districts. A short fixed list: Northern Cyprus has six
 * districts and roughly two hundred villages, all of them known. Far more
 * reliable than free extraction, and it keeps every /yer/[slug] page meaningful.
 */
const PLACES: Array<{ name: string; district: string }> = [
  { name: 'Lefkoşa', district: 'Lefkoşa' },
  { name: 'Gönyeli', district: 'Lefkoşa' },
  { name: 'Alayköy', district: 'Lefkoşa' },
  { name: 'Haspolat', district: 'Lefkoşa' },
  { name: 'Hamitköy', district: 'Lefkoşa' },
  { name: 'Değirmenlik', district: 'Lefkoşa' },
  { name: 'Girne', district: 'Girne' },
  { name: 'Çatalköy', district: 'Girne' },
  { name: 'Lapta', district: 'Girne' },
  { name: 'Alsancak', district: 'Girne' },
  { name: 'Esentepe', district: 'Girne' },
  { name: 'Karaoğlanoğlu', district: 'Girne' },
  { name: 'Gazimağusa', district: 'Gazimağusa' },
  { name: 'Vadili', district: 'Gazimağusa' },
  { name: 'Geçitkale', district: 'Gazimağusa' },
  { name: 'Akdoğan', district: 'Gazimağusa' },
  { name: 'Serdarlı', district: 'Gazimağusa' },
  { name: 'Güzelyurt', district: 'Güzelyurt' },
  { name: 'Bostancı', district: 'Güzelyurt' },
  { name: 'Zümrütköy', district: 'Güzelyurt' },
  { name: 'İskele', district: 'İskele' },
  { name: 'Bafra', district: 'İskele' },
  { name: 'Yeniboğaziçi', district: 'İskele' },
  { name: 'Büyükkonuk', district: 'İskele' },
  { name: 'Dipkarpaz', district: 'İskele' },
  { name: 'Lefke', district: 'Lefke' },
  { name: 'Gemikonağı', district: 'Lefke' },
  { name: 'Yeşilyurt', district: 'Lefke' },
];

/**
 * Company name pattern. The gazette always ends a company name with a company
 * type abbreviation; that is the only reliable way to catch a company name in
 * free text.
 */
const COMPANY_PATTERN =
  /\b([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü0-9&.'’\-]*(?:\s+[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜa-zçğıöşü0-9&.'’\-]*){0,6}\s+(?:LTD|LİMİTED|LIMITED|A\.Ş\.|ANONİM ŞİRKETİ|CO\.|INC\.)\.?)/g;

function toEntity(
  kind: EntityKind,
  rawName: string,
  district: string | null,
  confidence: number,
): ExtractedEntity {
  const name = titleCase(rawName.trim());
  return {
    kind,
    name,
    slug: entitySlug(name),
    nameNormalized: normalizeForSearch(name),
    district,
    confidence,
  };
}

/**
 * Extracts entities from a record's title and body.
 *
 * Confidence score: an entity in the title scores 1.0, one that appears only in
 * the body scores 0.7. The "mentioned in this record" list on the record page is
 * ordered by that score, so the real subject from the title comes first.
 */
export function extractEntities(input: {
  title: string;
  bodyText: string | null;
}): ExtractedEntity[] {
  const found = new Map<string, ExtractedEntity>();
  const title = input.title;
  const body = input.bodyText ?? '';
  const haystack = title + '\n' + body;
  const upperTitle = turkishUpper(title);
  const upperAll = turkishUpper(haystack);

  const add = (entity: ExtractedEntity) => {
    const existing = found.get(entity.slug);
    if (!existing || existing.confidence < entity.confidence) found.set(entity.slug, entity);
  };

  for (const institution of INSTITUTIONS) {
    const upper = turkishUpper(institution);
    if (!upperAll.includes(upper)) continue;
    add(toEntity('institution', institution, null, upperTitle.includes(upper) ? 1 : 0.7));
  }

  for (const place of PLACES) {
    const upper = turkishUpper(place.name);
    /*
     * Word boundary check: searching for "Lefke" must not match inside
     * "Lefkoşa". Turkish suffixes mean the right-hand boundary may be a letter
     * ("Lefke'de", "Girne'nin"), so we require only a left boundary plus a suffix
     * marker immediately to the right.
     */
    const pattern = new RegExp('(^|[^A-ZÇĞİÖŞÜ])' + upper + "(?=$|[^A-ZÇĞİÖŞÜ]|'|\\s)", 'u');
    if (!pattern.test(upperAll)) continue;
    add(toEntity('place', place.name, place.district, pattern.test(upperTitle) ? 1 : 0.7));
  }

  COMPANY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COMPANY_PATTERN.exec(haystack)) !== null) {
    const raw = match[1]!.replace(/\s+/g, ' ').trim();
    // Very short matches ("BİR LTD") are noise.
    if (raw.length < 8) continue;
    const inTitle = turkishUpper(title).includes(turkishUpper(raw));
    add(toEntity('company', raw, null, inTitle ? 1 : 0.7));
  }

  return [...found.values()];
}
