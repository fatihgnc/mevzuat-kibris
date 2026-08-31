import { entitySlug } from '../../src/lib/text/slugify';
import { normalizeForSearch, turkishUpper } from '../../src/lib/text/turkish-lower';
import { titleCase } from '../shared/turkish-suffix';
import type { EntityKind } from '../../src/types/record';

/**
 * Varlık çıkarımı — spec 7.1 adım 6.
 *
 * Üç tür: kurum, şirket, yerleşim yeri. Kişi BİLEREK yok (spec 3.7 madde 1):
 * /kisi/[slug] üretmiyoruz, dolayısıyla kişi adı çıkarmıyoruz da. Kişi adları
 * için bir dizin oluşturmamak ürünün açık bir kararı.
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
 * Bilinen kurumlar. Sabit liste kullanıyoruz çünkü kurum adları gazetede
 * tutarlı yazılıyor ve serbest çıkarım "Dairesi", "Bakanlığı" ile biten her
 * şeyi kuruma çevirip gürültü üretiyor.
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
 * Yerleşim yerleri, ilçeleriyle. Kısa ve sabit bir liste: KKTC'de altı ilçe
 * ve yaklaşık iki yüz köy var, hepsi bilinen. Serbest çıkarımdan çok daha
 * güvenilir ve /yer/[slug] sayfalarının hepsi anlamlı kalıyor.
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
 * Şirket adı deseni. Gazete şirket adlarını her zaman bir şirket türü
 * kısaltmasıyla bitiriyor; bu, serbest metinde şirket adını güvenilir biçimde
 * yakalamanın tek yolu.
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
 * Bir kaydın başlığı ve gövdesinden varlıkları çıkarır.
 *
 * Güven puanı: başlıkta geçen varlık 1.0, yalnızca gövdede geçen 0.7.
 * Kayıt sayfasındaki "kayıtta geçenler" listesi bu puana göre sıralanıyor,
 * yani başlıktaki asıl özne öne çıkıyor.
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
     * Sözcük sınırı kontrolü: "Lefke" araması "Lefkoşa" içinde eşleşmemeli.
     * Türkçe ekler nedeniyle sağ sınırda harf olabilir ("Lefke'de", "Girne'nin"),
     * o yüzden yalnızca sol sınır ve hemen sağında ek göstergesi arıyoruz.
     */
    const pattern = new RegExp('(^|[^A-ZÇĞİÖŞÜ])' + upper + "(?=$|[^A-ZÇĞİÖŞÜ]|'|\\s)", 'u');
    if (!pattern.test(upperAll)) continue;
    add(toEntity('place', place.name, place.district, pattern.test(upperTitle) ? 1 : 0.7));
  }

  COMPANY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COMPANY_PATTERN.exec(haystack)) !== null) {
    const raw = match[1]!.replace(/\s+/g, ' ').trim();
    // Çok kısa eşleşmeler ("BİR LTD") gürültü.
    if (raw.length < 8) continue;
    const inTitle = turkishUpper(title).includes(turkishUpper(raw));
    add(toEntity('company', raw, null, inTitle ? 1 : 0.7));
  }

  return [...found.values()];
}
