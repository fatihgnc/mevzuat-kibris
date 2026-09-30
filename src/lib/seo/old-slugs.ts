/**
 * Record slugs Search Console still reports that no longer exist.
 *
 * A slug is derived from the record's title, and titles are corrected when an issue
 * is parsed again (a company name spelled another way, a title clipped at a
 * different word). The record kept its year, reference type and number but got a
 * new slug, and the old address became a "Kayıt bulunamadı" page.
 *
 * Found by comparing the pages Search Console lists (Jun-Sep 2026) against the
 * database and matching the leading year-type-number tokens, which are unique per
 * record. Each pair was compared and is the same decision. They live in
 * `redirects()` because the /karar page cannot answer with a real HTTP status: its
 * skeleton is flushed before the database is asked (see karar/loading.tsx).
 */
export const OLD_RECORD_SLUGS: Record<string, string> = {
  '2023-ae-978-gumruk-ve-istihsal-harclar-ev-ucretler':
    '2023-ae-978-gumruk-ve-istihsal-yasasi-2023-gumruk-ve-istihsal-harclar-ev-ucretler',
  '2025-x-140-7-tapu-ve-kadastro-kurulus-gorev-ve-calisma-esaslari-yasasi':
    '2025-x-140-7-tapu-ve-kadastro-dairesi-kurulus-gorev-ve-calisma-esaslari-yasasi',
  '2021-eski-235-2021-kibris-turk-muhendis-ve-mimar-odalari-birligi-yetkisiz-olusumu':
    '2021-eski-235-2021-kibris-turk-muhendis-ve-mimar-odalari-birligi-yetki-kurulunun-olusumu',
  '2024-uki-2322-2024-fiyat-istikrar-fonu-yasasi-2024-fiyat-istikrar-akaryakit':
    '2024-uki-2322-2024-fiyat-istikrar-fonu-yasasi-2024-fiyat-istikrar-fonu-akaryakit',
  '2025-uki-2103-2025-kktc-istanbul-baskonslugunda-idari-atasesi-olarak-gorev-yapan':
    '2025-uki-2103-2025-kktc-istanbul-baskonsoloslugunda-idari-atasesi-olarak-gorev-yapan',
  '2026-ae-42-yollar-ve-binalar-duzenleme-yasasi-yollar-degisiklik-tuzugu':
    '2026-ae-42-yollar-ve-binalar-duzenleme-yasasi-yollar-ve-binalar-degisiklik-tuzugu',
  '2026-ae-554-fiyat-istikrar-fonu-yasasi-2026-fiyat-istikrar-akaryakit':
    '2026-ae-554-fiyat-istikrar-fonu-yasasi-2026-fiyat-istikrar-fonu-akaryakit',
  '2026-ae-719-dogru-tarim-ticaret-ltd-hakkinda-rekabet-kurulu-karari':
    '2026-ae-719-dogru-tasarim-ticaret-ltd-hakkinda-rekabet-kurulu-karari',
};
