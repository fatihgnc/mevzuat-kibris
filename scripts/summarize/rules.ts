import {
  ablativeFromPossessive,
  dative,
  genitive,
  locative,
  titleCase,
} from '../shared/turkish-suffix';
import { turkishLower } from '../../src/lib/text/turkish-lower';

/**
 * Özet cümle üretimi — spec 3.8.
 *
 * Kesin kurallar, kodda karşılıklarıyla:
 *
 *  1. Özet başlıktan KESİNLİKLE çıkarılabilen şeyi söyler. Kararın sonucunu
 *     bildirmez. Aşağıdaki hiçbir kalıp "reddetti", "kabul etti", "onayladı"
 *     üretmiyor — Rekabet Kurulu kalıbı bilerek "hakkında karar" ile bitiyor.
 *  2. Özet günlük dili kullanır: "kamulaştırma kararı", "zorla mal iktisabı"
 *     değil. Resmî terim zaten ham başlıkta duruyor ve arama ikisini de
 *     yakalıyor (eşanlamlı genişletme, supabase/migrations/0007).
 *  3. Aynı belge tipi hep aynı kalıbı alır.
 *  4. Bir kez üretilir, records.summary'de kalıcı saklanır; liste, detay,
 *     e-posta, RSS ve og:title aynı metni kullanır.
 *
 * Kural tutmazsa null dönüyoruz. Çağıran taraf o zaman LLM'e düşüyor, o da
 * olmazsa özet yok ve maskelenmiş başlık gösteriliyor.
 */

export interface SummaryInput {
  title: string;
  section: string;
  refType: string | null;
}

interface Rule {
  name: string;
  pattern: RegExp;
  build: (match: RegExpMatchArray) => string | null;
}

/** Fazladan boşluk ve sondaki noktalama temizliği. */
function clean(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[.,;:/\-]+$/, '').trim();
}

/**
 * Baştaki referans numarasını atar.
 *
 * Gazetenin içindekiler dökümünde kayıt satırı referansla başlıyor ("A.E. 1064
 * 1962 ZORLA MAL İKTİSABI YASASI-..."). Ham başlıkta bu numara KALIYOR — kaynağa
 * sadık olmak gerekiyor ve maskelenmiş başlıkta kullanıcı onu görüyor. Ama özet
 * cümlede numaranın yeri yok: künye şeridinde zaten ayrı bir alan olarak
 * gösteriliyor.
 *
 * Bu atlanınca özetler "A.e. 1063 Su Kullanım Bedelleri emirnamesinde değişiklik"
 * gibi çıkıyor ve kalıpların çoğu hiç eşleşmiyor.
 */
const LEADING_REF =
  /^(?:A\.E\.\s?\d+|Ü\(K-I{1,2}\)\s?[\d-]+|Ş\.M\.\s?\d+|M\.T\.\s?\d+|GENELGE\s+MİA\.[\d/]+|Y\.[TÖ]\.NO:\s?[\d/]+)\s*/i;

export function stripLeadingRef(title: string): string {
  return title.replace(LEADING_REF, '').trim();
}

const RULES: Rule[] = [
  {
    name: 'kamulastirma',
    // 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ
    pattern: /^\d{4}\s+ZORLA MAL İKTİSABI YASASI\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const place = clean(match[1]!);
      if (!place) return null;
      // "GAZİMAĞUSA/VADİLİ" -> ilçe + köy; köy adı daha ayırt edici.
      const parts = place.split('/').map((part) => titleCase(clean(part)));
      const village = parts[parts.length - 1]!;
      const district = parts.length > 1 ? parts[0]! : null;
      const where = district ? district + ' ' + village : village;
      return locative(where) + ' kamulaştırma kararı';
    },
  },
  {
    name: 'sirket-isim-degisikligi',
    pattern:
      /İSİM DEĞİŞTİRME MÜRACAATI\s*\/\s*(.+?)\s+İ[Nn]\s+(.+?)\s+OLARAK İSMİNİN DEĞİŞMESİ/i,
    build: (match) => {
      const from = titleCase(clean(match[1]!));
      const to = titleCase(clean(match[2]!));
      if (!from || !to) return null;
      return genitive(from) + ' isminin ' + to + ' olarak değişmesi';
    },
  },
  {
    name: 'sirket-tasfiye',
    pattern: /TASFİYE İŞLEMLERİNE BAŞLANMASI\s*\/\s*(.+)$/i,
    build: (match) => {
      const company = titleCase(clean(match[1]!));
      return company ? genitive(company) + ' tasfiye işlemlerine başlanması' : null;
    },
  },
  {
    name: 'sirket-silme',
    pattern: /SİCİLDEN KAYIT SİLİNMESİ\s*\/\s*(.+)$/i,
    build: (match) => {
      const company = titleCase(clean(match[1]!));
      return company ? genitive(company) + ' sicilden kaydının silinmesi' : null;
    },
  },
  {
    name: 'sozlesmeli-personel',
    pattern: /^SÖZLEŞMELİ PERSONEL\s*\/\s*(.+)$/i,
    build: (match) => {
      const who = titleCase(clean(match[1]!));
      if (!who) return null;
      /*
       * Kaynakta ya kişi adı ya kurum adı geliyor. Kurum adıysa cümle
       * "istihdam edildi" değil "istihdamı" olmalı; kişi adına benzeyip
       * benzemediğine bakmak yerine iki durumda da nötr kalan bir kalıp
       * kullanıyoruz. Tahmin yürütmüyoruz.
       */
      return genitive(who) + ' sözleşmeli personel olarak istihdamı';
    },
  },
  {
    name: 'odenek-aktarma',
    pattern: /^ÖDENEK AKTARMA\s*\/\s*(.+?)(?:\s+(\d{4})\s+MALİ YILI BÜTÇESİ)?$/i,
    build: (match) => {
      const institution = titleCase(clean(match[1]!));
      if (!institution) return null;
      const year = match[2];
      return year
        ? institution + ' ' + year + ' mali yılı bütçesinde ödenek aktarma'
        : institution + ' bütçesinde ödenek aktarma';
    },
  },
  {
    name: 'munhal-ilk-atama',
    pattern:
      /^KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*(.+?)\s+İLK ATAMA KADROSU MÜNHAL İLANI(?:\s+VE\s+SINAVI?\s+DUYURUSU)?/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      if (!unit) return null;
      return unit + ' ilk atama kadrosu münhal ilanı ve sınav duyurusu';
    },
  },
  {
    name: 'munhal-kadro',
    pattern: /^(?:KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*)?(.+?)\s+KADROSU MÜNHAL İLANI/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      return unit ? unit + ' kadrosu münhal ilanı' : null;
    },
  },
  {
    name: 'munhal-genel',
    pattern: /^(.+?)\s+MÜNHAL İLANI(?:-(.+))?$/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      return unit ? unit + ' münhal ilanı' : null;
    },
  },
  {
    name: 'rekabet-itiraz',
    // KARAR SAYISI:318/2025 KONU:X TARAFINDAN Y BİNASINA ... İHALESİNE YAPILAN İTİRAZ
    pattern: /KONU:\s*(.+?)\s+TARAFINDAN\s+(.+?)\s+İHALESİNE YAPILAN İTİRAZ/i,
    build: (match) => {
      const objector = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      if (!objector || !subject) return null;
      /*
       * Sonuç YOK. "İtiraz hakkında karar" diyoruz; reddedildi mi kabul mü
       * edildi, o bilgi gövdede ve hukuki metinde tahmin kabul edilemez
       * (spec 3.8 kural 1).
       */
      return genitive(objector) + ' ' + subject + ' ihalesine yaptığı itiraz hakkında Rekabet Kurulu kararı';
    },
  },
  {
    name: 'rekabet-genel',
    pattern: /^REKABET KURULU KARARI.*?KONU:\s*(.+)$/i,
    build: (match) => {
      const subject = titleCase(clean(match[1]!));
      return subject ? subject + ' hakkında Rekabet Kurulu kararı' : null;
    },
  },
  {
    name: 'marka',
    pattern: /^MARKA TESCİL MÜRACAATI İLANI\s*\/\s*(.+)$/i,
    build: (match) => {
      const owner = titleCase(clean(match[1]!));
      return owner ? genitive(owner) + ' marka tescil müracaatı ilanı' : null;
    },
  },
  {
    name: 'genelge',
    pattern: /^(.+?GENELGESİ)\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const issuer = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      if (!issuer || !subject) return null;
      return subject + ' hakkında ' + issuer.replace(/\s+Genelgesi$/i, '') + ' genelgesi';
    },
  },
  {
    name: 'degisiklik-yerli',
    // SU KULLANIM BEDELLERİ (DEĞİŞİKLİK) EMİRNAMESİ-LEFKOŞA/ALAYKÖY
    pattern: /^(.+?)\s*\(DEĞİŞİKLİK\)\s*(EMİRNAMESİ|TÜZÜĞÜ|TEBLİĞİ)\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const subject = titleCase(clean(match[1]!));
      const kind = clean(match[2]!).toLocaleLowerCase('tr');
      const place = titleCase(clean(match[3]!).split('/').pop() ?? '');
      if (!subject) return null;
      const prefix = place ? locative(place) + ' ' : '';
      return prefix + subject + ' ' + kind.replace(/si$/, 'sinde') + ' değişiklik';
    },
  },
  {
    name: 'fon-degisiklik',
    // 2025 FİYAT İSTİKRAR FONU,(AKARYAKIT,TARIMSAL ÜRÜN VE TÜKETİM MADDELERİ)
    //   (FONA YATIRILACAK MİKTARLAR)(DEĞİŞİKLİK)EMİRNAMESİ
    // Genel (DEĞİŞİKLİK) kuralından ÖNCE denenmeli, yoksa o kural başlığın
    // tamamını tek bir ada indirip özeti okunmaz hâle getiriyor.
    pattern:
      /^\d{4}\s+(FİYAT İSTİKRAR FONU)\s*,?\s*\(([^)]+)\)\s*\(([^)]*YATIRILACAK[^)]*)\)\s*\(DEĞİŞİKLİK\)/i,
    build: (match) => {
      const fund = titleCase(clean(match[1]!));
      const scope = turkishLower(clean(match[2]!)).replace(/\s*,\s*/g, ', ');
      if (!fund || !scope) return null;
      return (
        dative(fund) +
        ' ' +
        ablativeFromPossessive(scope) +
        ' yatırılacak miktarlarda değişiklik'
      );
    },
  },
  {
    name: 'degisiklik',
    // KIBRIS TÜRK ELEKTRİK KURUMU (ELEKTRİK TARİFELERİ)(DEĞİŞİKLİK) TÜZÜĞÜ
    pattern: /^(.+?)\s*\(([^)]+)\)\s*\(DEĞİŞİKLİK\)\s*(TÜZÜĞÜ|EMİRNAMESİ|TEBLİĞİ|YASASI)/i,
    build: (match) => {
      const owner = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      const kind = clean(match[3]!).toLocaleLowerCase('tr');
      if (!owner || !subject) return null;
      return owner + ' ' + subject + ' ' + kindLocative(kind) + ' değişiklik';
    },
  },
  {
    name: 'yasa-degisiklik',
    pattern: /^(\d{4}\s+.+?YASASI)\s*\(DEĞİŞİKLİK\)\s*YASASI/i,
    build: (match) => {
      const law = titleCase(clean(match[1]!));
      return law ? genitive(law) + 'nda değişiklik' : null;
    },
  },
];

/** "tüzüğü" -> "tüzüğünde", "emirnamesi" -> "emirnamesinde" */
function kindLocative(kind: string): string {
  if (kind.endsWith('ğü')) return kind + 'nde';
  if (kind.endsWith('si')) return kind + 'nde';
  return kind + 'nde';
}

export interface SummaryResult {
  summary: string;
  source: 'rule';
  ruleName: string;
}

/**
 * Kural tabanlı özet. Kalıp yoksa null döner ve çağıran taraf LLM'e düşer
 * (spec 3.8 kademeli üretim). LLM de başarısızsa özet yok; maskelenmiş
 * başlık gösteriliyor.
 */
export function summarize(input: SummaryInput): SummaryResult | null {
  const title = stripLeadingRef(input.title.replace(/\s+/g, ' ').trim());
  if (!title) return null;

  for (const rule of RULES) {
    const match = title.match(rule.pattern);
    if (!match) continue;

    try {
      const summary = rule.build(match);
      // Kalıp eşleşti ama anlamlı bir cümle çıkmadıysa bir sonrakine geç.
      if (summary && summary.length > 8) {
        return { summary: summary.charAt(0).toLocaleUpperCase('tr') + summary.slice(1), source: 'rule', ruleName: rule.name };
      }
    } catch {
      // Tek bir kuralın patlaması bütün ingest'i durdurmasın.
    }
  }

  return null;
}
