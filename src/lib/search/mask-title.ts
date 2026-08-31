import type { Token, TokenLevel } from '@/types/record';

/**
 * Maskelenmiş gazete başlığı (spec 3.8 + artboard 1a/1b/1e/1g).
 *
 * Ham RG başlıkları okunamayacak kadar kötü ama atılamıyor: resmî terim orada
 * duruyor ve kullanıcının kopyalayabilmesi gerekiyor (spec 3.8 kural 5). Tasarımın
 * çözümü başlığı atmak yerine ağırlıklandırmak — kalıp kısımlar soluk, ayırt edici
 * kısımlar koyu. Göz "TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN İSİM DEĞİŞTİRME
 * MÜRACAATI" kalıbını atlayıp doğrudan şirket adına gidiyor.
 *
 * Seviyeler:
 *   0  kalıp / boilerplate      soluk, ince
 *   1  ayırt edici              koyu, kalın
 *   2  ara bilgi (yıl, kurum)   orta
 *   3  arama eşleşmesi          sarı zemin (highlight.ts ekler)
 */

interface MaskRule {
  /** Yakalama gruplu desen; gruplar arasında kalan metin `fill` seviyesini alır. */
  pattern: RegExp;
  /** Gruplarla aynı sırada seviyeler. */
  levels: TokenLevel[];
  fill?: TokenLevel;
}

/**
 * Kurallar spec 3.3'teki çapalardan ve 3.8'deki kalıp tablosundan türetildi.
 * Sıra önemli: ilk eşleşen kural kazanır, özelden genele.
 */
const RULES: MaskRule[] = [
  // 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ
  {
    pattern: /^(\d{4}\s+ZORLA MAL İKTİSABI YASASI)\s*[-/]\s*(.+)$/i,
    levels: [0, 1],
  },
  // TESCİLLİ ... İSİM DEĞİŞTİRME MÜRACAATI/X İN Y OLARAK İSMİNİN DEĞİŞMESİ
  {
    pattern:
      /^(.*?İSİM DEĞİŞTİRME MÜRACAATI\s*\/\s*)(.+?)(\s+İ[NnȘ]\s+)(.+?)(\s+OLARAK İSMİNİN DEĞİŞMESİ.*)$/i,
    levels: [0, 1, 0, 1, 0],
  },
  // TESCİLLİ ... TASFİYE İŞLEMLERİNE BAŞLANMASI/HASPOLAT GIDA SANAYİ LTD
  {
    pattern: /^(.*?(?:TASFİYE İŞLEMLERİNE BAŞLANMASI|SİCİLDEN KAYIT SİLİNMESİ)\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // SÖZLEŞMELİ PERSONEL / ALİ ÖZCANLI
  {
    pattern: /^(SÖZLEŞMELİ PERSONEL\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // ÖDENEK AKTARMA/BAŞBAKANLIK 2025 MALİ YILI BÜTÇESİ
  {
    pattern: /^(ÖDENEK AKTARMA\s*\/\s*)(.+?)(\s+\d{4} MALİ YILI BÜTÇESİ)?$/i,
    levels: [0, 1, 2],
  },
  // KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI, X KADROSU MÜNHAL İLANI...
  {
    pattern:
      /^(KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*)(.+?)(\s*(?:İLK ATAMA )?KADROSU MÜNHAL İLANI.*|\s*İLK ATAMA KADROSU MÜNHAL İLANI.*)$/i,
    levels: [0, 1, 0],
  },
  // REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:X TARAFINDAN Y İHALESİNE...
  {
    pattern:
      /^(REKABET KURULU KARARI\s*-\s*KARAR SAYISI:\s*)(\S+)(\s*KONU:\s*)(.+?)(\s+TARAFINDAN\s+)(.+?)(\s+(?:BİNASINA|BİNASI).*)$/i,
    levels: [0, 1, 0, 1, 0, 1, 0],
  },
  {
    pattern: /^(REKABET KURULU KARARI\s*-\s*KARAR SAYISI:\s*)(\S+)(\s*KONU:\s*)(.+)$/i,
    levels: [0, 1, 0, 1],
  },
  // MARKA TESCİL MÜRACAATI İLANI/ALTINKUM BAFRA TURİZM LTD
  {
    pattern: /^(MARKA TESCİL MÜRACAATI İLANI\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // MALİYE BAKANLIĞI GENELGESİ-YIL SONU HARCAMA İŞLEMLERİNİN KAPATILMASI
  {
    pattern: /^(.+?GENELGESİ)\s*-\s*(.+)$/i,
    levels: [2, 1],
  },
  // SU KULLANIM BEDELLERİ (DEĞİŞİKLİK) EMİRNAMESİ-LEFKOŞA/ALAYKÖY
  {
    pattern:
      /^(.+?)(\s*\(DEĞİŞİKLİK\)\s*(?:EMİRNAMESİ|TÜZÜĞÜ|TEBLİĞİ))\s*-\s*(.+)$/i,
    levels: [1, 0, 1],
  },
  // KIBRIS TÜRK ELEKTRİK KURUMU (ELEKTRİK TARİFELERİ)(DEĞİŞİKLİK) TÜZÜĞÜ
  {
    pattern:
      /^(.+?)(\s*\([^)]+\)\s*\(DEĞİŞİKLİK\)\s*(?:TÜZÜĞÜ|EMİRNAMESİ|TEBLİĞİ|YASASI).*)$/i,
    levels: [2, 1],
  },
  // 1992 KATMA DEĞER VERGİSİ YASASI (DEĞİŞİKLİK) YASASI
  {
    pattern: /^(\d{4}\s+.+?YASASI)(\s*\(DEĞİŞİKLİK\)\s*YASASI.*)$/i,
    levels: [2, 1],
  },
  // 2025 FİYAT İSTİKRAR FONU,(AKARYAKIT...)(FONA YATIRILACAK...)(DEĞİŞİKLİK)EMİRNAMESİ
  {
    pattern:
      /^(\d{4}\s+)([^,(]+)(,?\s*\(\s*)([^)]+)(\)\s*\([^)]*\)\s*\(\s*)(DEĞİŞİKLİK)(\s*\).*)$/i,
    levels: [2, 1, 0, 1, 0, 1, 0],
  },
  // MİLLİ EĞİTİM BAKANLIĞI, X MÜNHAL İLANI-2025/2026 ÖĞRETİM YILI
  {
    pattern: /^(.+?BAKANLIĞI,\s*)(.+?)(\s*MÜNHAL İLANI.*)$/i,
    levels: [0, 1, 0],
  },
];

/**
 * Baştaki gazete referansı ("A.E. 1070 ", "Ü(K-I) 2497-2025 ").
 *
 * Kurallar ^ ile başlıyor, dolayısıyla referans önekle hiçbiri eşleşmiyordu ve
 * her başlık genel fallback'e düşüyordu — sonuç: neredeyse tüm jetonlar
 * "ayırt edici" işaretleniyor ve maske hiçbir işe yaramıyordu.
 *
 * Referans metinde KALIYOR (kullanıcı ham başlığı kopyalayabilmeli) ama kalıp
 * seviyesinde: künye şeridinde zaten ayrı bir alan olarak gösteriliyor.
 */
const LEADING_REF =
  /^(?:A\.E\.\s?\d+|Ü\(K-I{1,2}\)\s?[\d-]+|Ş\.M\.\s?\d+|M\.T\.\s?\d+|GENELGE\s+MİA\.[\d/]+|Y\.[TÖ]\.NO:\s?[\d/]+)\s*/i;

/** Kalıp sözlüğü — fallback ayrıştırmada soluk bırakılacak stok ifadeler. */
const BOILERPLATE = [
  'REKABET KURULU KARARI',
  'KARAR SAYISI',
  'KARAR NO',
  'ESKİ ESERLER YÜKSEK KURULU',
  'MARKA TESCİL MÜRACAATI İLANI',
  'İSİM DEĞİŞTİRME MÜRACAATI',
  'TASFİYE İŞLEMLERİNE BAŞLANMASI',
  'SİCİLDEN KAYIT SİLİNMESİ',
  'TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN',
  'DENİZAŞIRI YABANCI ŞİRKET TESCİLİ',
  'KADROSU MÜNHAL İLANI VE SINAVI DUYURUSU',
  'İLK ATAMA KADROSU MÜNHAL İLANI',
  'KADROSU MÜNHAL İLANI',
  'MÜNHAL İLANI VE SINAV DUYURUSU',
  'MÜNHAL İLANI',
  'SINAV SONUÇLARI',
  'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI',
  'MARKA TESCİL MÜRACAATI İLANI',
  'ŞİRKETLER MUKAYYİTLİĞİ',
  'ZORLA MAL İKTİSABI YASASI',
  'İHALESİNE YAPILAN İTİRAZ',
  'SÖZLEŞMELİ PERSONEL',
  'ÖDENEK AKTARMA',
  'KONU:',
  'DÜZELTME:',
];

const SEPARATORS = /([/\-–—,:()]+)/;

/**
 * Kural eşleşmediğinde: ayraçlardan böl, kalıp sözlüğündekileri soluk bırak,
 * yılları ara bilgi say, gerisini ayırt edici kabul et.
 *
 * Kasıtlı olarak cömert: bir parçayı yanlışlıkla koyu göstermek, ayırt edici
 * bilgiyi soluk gösterip kullanıcının gözden kaçırmasından daha az zararlı.
 */
function fallbackMask(title: string): Token[] {
  const parts = title.split(SEPARATORS).filter((part) => part.length > 0);
  const tokens: Token[] = [];

  for (const part of parts) {
    if (/^[/\-–—,:()\s]+$/.test(part)) {
      tokens.push({ t: part, lvl: 0 });
      continue;
    }

    const upper = part.toLocaleUpperCase('tr');
    const isBoilerplate = BOILERPLATE.some((phrase) => upper.includes(phrase));
    const isYearish = /^\s*\d{4}\s*$/.test(part) || /MALİ YILI|ÖĞRETİM YILI/i.test(part);

    tokens.push({ t: part, lvl: isBoilerplate ? 0 : isYearish ? 2 : 1 });
  }

  /*
   * Başlığın TAMAMI kalıpsa maskeleme anlamını yitiriyor: geri plana atılacak
   * bir arka plan yok, çünkü her şey arka plan. "SÖZLEŞMELİ PERSONEL" gibi
   * başlıklarda satırın tümü sönük tona düşüyor ve okunmaz hâle geliyordu.
   *
   * Böyle bir durumda kalıp jetonları öne çıkarıyoruz — o başlık için taşıdığı
   * bilgi zaten o. Maskeleme ayırt etmek için var; ayıracak bir şey yoksa
   * hiçbir şeyi silikleştirmemeli.
   */
  if (!tokens.some((token) => token.lvl === 1)) {
    for (const token of tokens) {
      if (token.lvl === 0 && !/^[/\-–—,:()\s]+$/.test(token.t)) token.lvl = 1;
    }
  }

  return mergeAdjacent(tokens);
}

/** Aynı seviyedeki komşu jetonları birleştirir — gereksiz span üretmeyelim. */
function mergeAdjacent(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    if (!token.t) continue;
    const last = out[out.length - 1];
    if (last && last.lvl === token.lvl) {
      last.t += token.t;
    } else {
      out.push({ ...token });
    }
  }
  return out;
}

/**
 * Ham başlığı jetonlara ayırır. Sonuç deterministik: aynı başlık her yerde
 * (liste, detay, e-posta) aynı maskeyi alır.
 */
export function maskTitle(title: string): Token[] {
  const full = title.replace(/\s+/g, ' ').trim();
  if (!full) return [];

  // Referans öneki ayrılıyor; kurallar kalan gövdeye uygulanıyor.
  const refMatch = LEADING_REF.exec(full);
  const prefix: Token[] = refMatch ? [{ t: refMatch[0], lvl: 0 }] : [];
  const text = refMatch ? full.slice(refMatch[0].length) : full;

  if (!text) return prefix;

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;

    const tokens: Token[] = [];
    let cursor = 0;
    const fill = rule.fill ?? 0;

    for (let i = 1; i < match.length; i += 1) {
      const value = match[i];
      if (value === undefined) continue;

      const start = text.indexOf(value, cursor);
      if (start === -1) continue;

      if (start > cursor) tokens.push({ t: text.slice(cursor, start), lvl: fill });
      tokens.push({ t: value, lvl: rule.levels[i - 1] ?? fill });
      cursor = start + value.length;
    }

    if (cursor < text.length) tokens.push({ t: text.slice(cursor), lvl: fill });

    const merged = mergeAdjacent(tokens);
    // Kural her şeyi tek seviyeye düşürdüyse maske bir işe yaramıyor demektir.
    if (merged.some((token) => token.lvl === 1)) return mergeAdjacent([...prefix, ...merged]);
  }

  return mergeAdjacent([...prefix, ...fallbackMask(text)]);
}

/** Maskeyi düz metne geri çevirir — kopyala düğmesi ve e-posta için. */
export function tokensToText(tokens: Token[]): string {
  return tokens.map((token) => token.t).join('');
}
