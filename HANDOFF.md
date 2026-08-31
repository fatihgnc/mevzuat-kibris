# Handoff — Mevzuat Kıbrıs

Bu dosya, projeyi devralan bir sonraki oturum için yazıldı. Amaç: nerede
kalındığını, hangi kararların neden alındığını ve hangi tuzaklara tekrar
düşülmemesi gerektiğini tek yerde vermek.

**Önce oku:** [SPEC.md](SPEC.md) ürünün otoritesi, [README.md](README.md)
çalıştırma talimatı. Bu dosya ikisinin yerine geçmez, aralarındaki boşluğu
doldurur.

---

## 1. Durum özeti

Tasarım (`Mevzuat Kıbrıs.dc.html`, sekiz artboard) uygulandı. Uygulama uçtan
uca çalışıyor ve gerçek Postgres 16'ya karşı doğrulandı.

| Alan | Durum |
| --- | --- |
| Arayüz (8 artboard) | ✅ Tamam |
| Veritabanı şeması + RLS | ✅ 7 migration, hepsi geçiyor |
| Arama (FTS, facet, öneri) | ✅ Çalışıyor, spec'ten sapma var (bkz. §3) |
| Özet üretimi (kural tabanlı) | ✅ 17 kaydın 15'inde özet üretiyor |
| Rehber içerikleri (8 adet) | ✅ Elle yazıldı |
| SEO (sitemap, JSON-LD, robots) | ✅ Build'de 59 sayfa üretiliyor |
| Ingest boru hattı | ⚠️ Kod yazıldı, **hiç çalıştırılmadı** |
| Alarm/e-posta | ⚠️ Kod yazıldı, Resend anahtarı yok, gönderim denenmedi |
| Auth (magic link) | ⚠️ Kod yazıldı, gerçek Supabase'e bağlanmadı |

Doğrulama: `tsc` temiz, `eslint` temiz, **48 test** geçiyor,
`next build` 59 sayfa üretiyor, First Load JS 103 kB (spec hedefi <120 kB).

---

## 2. EN ÖNEMLİ: Veritabanındaki veri SAHTE

Bu, yeni oturumun yanlış anlamaya en müsait olduğu nokta.

- `ingest_runs` tablosunda **0 kayıt** var. Boru hattı hiç çalışmadı.
- `basimevi.gov.ct.tr` adresine **tek bir istek bile gitmedi**.
- Veritabanındaki 2 sayı ve 17 kayıt, `fixtures/issues/*.txt` dosyalarından
  geliyor. O dosyaları SPEC.md §3.2/§3.3'teki biçim tarifine ve tasarımdaki
  örnek verilere bakarak **elle yazdım**; gerçek gazete çıktısı değiller.
- Gövde metinleri `scripts/seed/index.ts` içindeki sabit bir paragraf.
- PDF bağlantıları sahte (`basimevi.gov.ct.tr/ornek/...`), tıklanınca 404.

Kullanıcı siteye istek atılmasını **açıkça istemedi** ("hayır, siteye
dokunma"). Gerçek veri çekmeden önce yeniden izin al.

### Doğrulanmamış en kritik varsayım

`scripts/crawl-archive/index.ts` içindeki `parseArchiveHtml`, arşiv sayfasının
`SAYI | TARİH | İÇERİK` sütunlu bir `<table>` olduğunu varsayıyor. Bu varsayım
**yalnızca SPEC.md §3.1'deki bir cümleye** dayanıyor; gerçek HTML hiç
görülmedi. Spec §16 zaten "kaynak site yapısını değiştirir → ingest kırılır"
riskini listeliyor.

Gerçek veriye geçiş iki adım:

1. `npm run ingest:crawl 2025` — sadece HTTP + cheerio, ek araç istemiyor.
   Gerçek sayı numaraları, tarihler, PDF linkleri ve İÇERİK dökümü gelir.
2. `npm run ingest:daily` — PDF gövdeleri için `pdftotext`, `ocrmypdf`,
   `tesseract-ocr-tur` gerekiyor. Bu makinede **yok**; GitHub Actions
   workflow'u kendisi kuruyor.

---

## 3. SPEC'ten bilinçli sapmalar

Bunlar hata değil, ölçüme dayanan kararlar. Değiştirmeden önce gerekçeyi oku.

### 3.1 Arama yapılandırması (en önemlisi)

Spec §5.1 "PostgreSQL Türkçe stemmer'ı hazır getiriyor" diyor, §5.2 zinciri
`unaccent + turkish_stem` veriyor. **Ölçüldü, tutmadı.** `turkish_stem`
ünlüyle biten gövdeleri bozuyor:

```
yasa -> 'yas'   yasanın -> 'yasa'   yasası -> 'yasas'   (üçü ayrı)
ihale -> 'ihal' ihaleye -> 'ihale'
arsa -> 'ar'    fonu -> 'fo'        tasfiye -> 'tasfi'
```

Ayrıca `unaccent`'i stemmer'dan önce koymak stemmer'ı ayrıca bozuyor (ünlü
uyumu siliniyor): `münhaller -> munhaller`, `tüzüğü -> tuzugu`.

18 gerçek sorgu/belge çiftinde isabet: spec'in zinciri **11/18**, seçilen
`unaccent + simple` + **önek eşleşmesi 17/18**.

Gerekçe ve kabul testleri `supabase/migrations/0002-search-config.sql`
başında yazılı. Önek üretimi + eşanlamlı genişletme `mk_tsquery()` içinde
(`0007-search-functions.sql`).

Eşanlamlılar spec §5.2'nin dediği gibi uygulama katmanında **değil**, SQL
tablosunda (`search_synonyms`). Sebep: alarm eşleştirmesi de aynı fonksiyondan
geçmek zorunda, yoksa spec §10.2'nin "aramada gördüğün ile alarmda aldığın
aynıdır" vaadi bozulur.

### 3.2 Arşiv başlangıç yılı

Tasarım artboard'ı **1975** gösteriyor ("Kıbrıs Türk Federe Devleti dönemi
dahil"). Spec §3.1 kaynağın **2006**'dan başladığını söylüyor.

`ARCHIVE_START_YEAR = 2006` (`src/lib/seo/config.ts`). Tasarımın *mekanizması*
korundu: hiçbir sayfa yılı sabit metin yazmıyor.

**Ek olarak:** sayfadaki kapsam *iddiası* artık sabitten değil **veriden**
türetiliyor (`src/lib/db/queries/coverage.ts`). Sabit hedefi tanımlıyor, cümle
gerçeği söylüyor:

- veri yok → "Arşiv henüz hazırlanıyor"
- backfill sürüyor → "Şu an yalnızca 2025 yılından 17 kayıt; arşiv 2006'ya
  doğru geriye genişletiliyor"
- tamam → "2006'dan bugüne N kayıt"

Yıl ekleri okunuşa göre hesaplanıyor (`src/lib/text/turkish-number.ts`):
2006'dan / 1975'ten / 2006'ya / 1975'e. 19 testle sabit.

### 3.3 Küçük sapmalar

- `Ü(K-II)` spec §3.3'e göre Bakanlar Kurulu ikinci serisi, yani `EK IV BÖLÜM I`.
  Fixture'ı önce yanlış yazmıştım, düzeltildi.
- `mt` (marka tescil) referans tipi eklendi — spec §3.3 listesinde yoktu ama
  tasarımda `M.T. 8842` geçiyor.
- `genelge` doc_type eklendi.
- `instant` alarm frekansı enum'a hiç girmedi (spec §10.3 madde 6 kapalı diyor;
  arayüzden yanlışlıkla seçilemesin diye şemada da yok).

---

## 4. Tekrar düşülmemesi gereken tuzaklar

Bunların hepsi **gerçekten yaşandı** ve statik analiz hiçbirini yakalamadı.
Benzer kod yazarken dikkat et.

### 4.1 Dizi parametreleri (SESSİZ, ÖLÜMCÜL)

drizzle'ın `sql` şablonu parametreleri postgres-js'e konumsal veriyor;
postgres-js'in dizi serileştirmesi **devreye girmiyor**. `= any(${dizi})`
"malformed array literal" ile patlıyor, `::text[]` cast'i de kurtarmıyor.

Her zaman `queries/shared.ts` içindeki yardımcıları kullan:
`inList(values)` karşılaştırma için, `arrayParam(values, 'bigint[]')` saklama
için. Bu yüzden konu/belge türü filtreleri bir süre tamamen çalışmıyordu.

> Not: `scripts/dispatch-alerts/index.ts` postgres-js'i **doğrudan** kullanıyor,
> orada JS dizileri sorunsuz. Kural yalnızca drizzle üzerinden gidenler için.

### 4.2 Tailwind dinamik sınıf adı

`'tok-' + level` gibi birleştirilen sınıf adlarını Tailwind içerik taraması
**göremiyor** ve kuralları eleyip atıyor. Tasarımın en ayırt edici parçası olan
başlık maskeleme bu yüzden sayfada hiç görünmüyordu — her jeton aynı ağırlıkta
basılıyordu ve sayfa "çalışıyor" gibi duruyordu.

Sınıf adları `highlight.ts` içinde **tam metin** olarak yazılı. Yeni seviye
eklerken aynı kalıba uy. Regresyon testi: `mask-title.test.ts` → `tokenClass`.

### 4.3 Başlıklar referansla başlıyor

Ham gazete başlığı `A.E. 1064 1962 ZORLA MAL...` diye başlıyor. `^` ile
başlayan bütün kurallar bu yüzden ıskalıyordu. Hem `maskTitle` hem `summarize`
başta referansı ayırıyor (`LEADING_REF`). Yeni kural yazarken referansın
ayrılmış olduğunu varsay.

### 4.4 Türkçe I harfi

`turkishLower('NICOSIA')` → `nıcosıa`. Karar **sözcük bazında değil ifade
bazında** veriliyor: ifadede Türkçeye özgü harf (ç ğ İ ö ş ü) varsa Türkçe,
yoksa yabancı sayılıyor (`turkish-suffix.ts` → `looksTurkish`).

Kabul edilen sınır: "ASLIHAN" → "Aslihan" (Türkçe ama işaret yok).
"NICOSIA" → "Nicosia" doğru. Tersi denenirse "Nıcosıa" çıkıyor ki daha kötü.

### 4.5 Next.js ayrıntıları

- `generateSitemaps` id'yi **string** veriyor. `switch (id)` strict eşitlik
  kullandığı için `case 0` tutmuyor, default'a düşüp negatif OFFSET ile build'i
  kırıyordu. `Number(id)` şart.
- `searchParams` aynı anahtar tekrarlanınca **dizi** veriyor. Şema tek dizge
  bekleyince paylaşılmış bozuk bir link arama sayfasını 500'e düşürüyordu.
  `parseSearchParams()` düzleştiriyor.
- Dev server çalışırken `next build` çalıştırma — `.next` dizinini ezip dev
  sunucusunu bozuyor. Önce dev'i durdur.

### 4.6 Bu ortama özgü

- Bash heredoc'larında **ters bölü ve backtick yenip gidiyor**. Regex veya
  template literal içeren dosyaları `Write`/`Edit` aracıyla yaz, heredoc'la
  değil. (Regex'i `\d` yerine `d` olarak yazıp sessizce bozdum, sonra fark ettim.)
- `dotenv/config` `.env.local` okumuyor; `scripts/shared/db.ts` ikisini de
  açıkça yüklüyor.

---

## 5. Yerel ortam

Postgres 16 kabı ayakta (veri dolu):

```bash
docker start mk-pg    # durmuşsa
```

`.env.local` (git'e girmiyor) `127.0.0.1:55432` işaret ediyor. Port 55432
seçildi ki makinedeki başka bir Postgres'le çakışmasın.

```bash
npm run dev
npm run db:reset      # şemayı sıfırla + fixture'lardan tohumla
npm test              # 48 test
```

`db:migrate`, Supabase'de hazır gelen `auth` şemasını ve `auth.uid()`
fonksiyonunu yerelde bulamazsa geçici gölge kuruyor (yalnızca yerel; Supabase'de
etkisi yok).

Dev server bu oturumda **açık bırakıldı** (port 3000).

---

## 6. Sıradaki işler

Öncelik sırasıyla, spec §15 yol haritasına göre:

1. **Gerçek arşiv HTML'ini doğrula.** `parseArchiveHtml`'in tek gerçek
   sınavı. İzin alındıktan sonra `npm run ingest:crawl 2025`. Yapı farklıysa
   ayrıştırıcı ve fixture'lar buna göre güncellenmeli.
2. **Gerçek fixture'lar.** Spec §7.3 "25 gerçek RG sayısı" istiyor; şu an 2
   uydurma sayı var. Gerçek veri gelince fixture'ları onlarla değiştir.
3. **PDF metin çıkarma denemesi.** `pdftotext` yolu 2018+ sayılarda, OCR yolu
   2015 öncesinde. `estimateQuality` eşiği (0.55) gerçek OCR çıktısına göre
   kalibre edilmeli — şu an tahmin.
4. **Supabase'e bağlan.** Auth akışı (magic link → `/auth/callback` → alarm
   yazımı) hiç uçtan uca denenmedi.
5. **Resend.** `dispatch-alerts` hiç çalışmadı; kota bekçisi ve haftanın gününe
   dağıtım mantığı test edilmedi.
6. **LLM özet yedeği.** Spec §3.8 kademeli üretim diyor: kural → LLM → yok.
   Kural katmanı var, **LLM katmanı yazılmadı**. Şu an kural tutmazsa özet yok
   ve maskelenmiş başlık gösteriliyor (bu davranış doğru, sadece orta basamak
   eksik).
7. **AdSense.** Slot id'leri boş; `NEXT_PUBLIC_ADSENSE_CLIENT` boşken reklam
   basılmıyor, yalnızca ayrılmış kutu görünüyor. Spec §14.5: başvuru Milestone 4
   bitmeden yapılmamalı.

---

## 7. Yön bulma

Değiştirmeden önce okunması gereken dosyalar:

| Dosya | Ne tutuyor |
| --- | --- |
| `src/lib/seo/config.ts` | Marka, domain, `ARCHIVE_START_YEAR` — tek kaynak |
| `src/lib/db/queries/coverage.ts` | Kapsam iddiasının veriden türetilmesi |
| `supabase/migrations/0002-search-config.sql` | Arama config'i + ölçüm + kabul testleri |
| `supabase/migrations/0007-search-functions.sql` | `mk_tsquery` — arama ve alarm ortak yolu |
| `src/lib/search/mask-title.ts` | Başlık maskeleme (tasarımın imzası) |
| `src/lib/db/queries/shared.ts` | `inList` / `arrayParam` — dizi tuzağı |
| `scripts/summarize/rules.ts` | Özet kalıpları; sonuç bildirmeme kuralı |
| `scripts/shared/turkish-suffix.ts` | Türkçe ek uyumu, I harfi kararı |
| `scripts/parse-records/parser.ts` | Birincil/ikincil referans ayrımı |

### Genişlik kuralı

**Her sayfanın kapsayıcısı `max-w-6xl` + `px-4 sm:px-8 lg:px-10`** — header ve
footer ile birebir aynı. İçerik header'ın markasıyla aynı sol kenarda hizalanır.
Yeni sayfa eklerken bu kalıptan sapma; daha önce dört ayrı genişlik vardı
(6xl / 4xl / 3xl / reading) ve sayfalar arası geçişte içerik kayıyordu.

İçerideki `max-width`'ler yalnızca **artboard'da açıkça yazılı** ölçüler için
var, keyfi değil:

| Yer | Ölçü | Kaynak |
| --- | --- | --- |
| Kayıt h1 | `max-w-title` 24em | artboard 1a |
| Kayıt gövdesi | `max-w-prose` 38em | artboard 1a |
| "Metni yok" kutusu | 36em | artboard 1g |
| Ana sayfa h1 / spot | 22em / 40em | artboard 1d |
| Ana sayfa arama kutusu | 44em | artboard 1d |
| Konu açıklaması | `max-w-prose` 38em | artboard 1e |

Tek sütunlu sayfalarda (hakkında, gizlilik, rehber, sayılar, takip, 404)
içeride ek `max-width` **yok** — içerik kapsayıcıyla aynı genişlikte.
