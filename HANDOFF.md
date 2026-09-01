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
| Veritabanı şeması + RLS | ✅ 9 migration, hepsi geçiyor |
| Arama (FTS, facet, öneri) | ✅ Çalışıyor, spec'ten sapma var (bkz. §3) |
| Konu sınıflandırması | ✅ Gerçek veriyle kalibre; konusuz oran %52 → %17 (§3.7) |
| Özet üretimi | ✅ Kural + LLM; 6.915 kaydın 5.887'sinde özet (%85,1). Kalan %14,9 spec 3.8'in 3. basamağı — bkz. §6.2 |
| Rehber içerikleri (8 adet) | ✅ Elle yazıldı |
| SEO (sitemap, JSON-LD, robots) | ✅ Build'de 59 sayfa üretiliyor |
| Ingest (2025 + 2026) | ✅ 422 sayı, 6.915 kayıt, 0 hata — gerçek veri |
| PDF metin çıkarma | ✅ 384 çıkarıldı + 32 OCR; 5 gözden geçirme, 1 kaynakta ölü bağlantı |
| OCR | ✅ Çalışıyor. 33 taranmış sayının 32'si kurtarıldı; kalite 0,887–0,999 — bkz. §6.1 |
| Diğer yıllar (2006–2024) | ⬜ Yapılmadı; kapasite hesabı için §2.2 |
| Gövde sınırları | ✅ Taşma %5,0 → %0,17 (§3.8) |
| Alarm/e-posta | ⚠️ Kod yazıldı, Resend anahtarı yok, gönderim denenmedi |
| Supabase | ✅ Veri taşındı, uygulama çalışıyor, `next build` geçiyor — bkz. §6.4 |
| Auth (magic link) | ⚠️ Kod yazıldı; Supabase Auth artık gerçek ama akış uçtan uca denenmedi |

Doğrulama: `tsc` temiz, `eslint` temiz, **107 test** geçiyor,
`next build` Supabase'e karşı **3.399 sayfa** üretiyor (**2m49s**, bkz. §6.5),
First Load JS 103 kB (spec hedefi <120 kB).

---

## 2. Veritabanındaki verinin TAMAMI gerçek

Bu dosya bir ara "veritabanındaki veri SAHTE" diye başlıyordu. Artık değil —
tek bir uydurma satır kalmadı, ve bunu bilerek okuman lazım çünkü bu dosyanın
eski hâlini görmüş olabilirsin.

| | |
| --- | --- |
| 2025 | 262 sayı · 3.976 kayıt · 02.01–31.12.2025 |
| 2026 | 160 sayı · 2.939 kayıt · 02.01–31.08.2026 |
| Veritabanı | 46 MB |

- PDF bağlantıları gerçek (`/Portals/6/<yıl>/<sayı>.pdf`), `raw_index_html`
  gerçek İÇERİK dökümü, gövdeler gerçek PDF metninden.
- Elle yazılmış sahte 17 kayıt **silindi** (cascade ile 18 konu ve 40 varlık
  bağı, artı sahte başlıklardan türetilmiş 23 varlık).
- `ingest_runs` artık dolu; `backfill` ve `daily` yazıyor.
- Arşiv sayfaları 2006, 2012, 2018, 2025 için çekilip incelendi — o dönemlerin
  biçim farkları §3.5'te.

**2026 arşiv sayfasında DEĞİL.** Kaynak site `/ARŞİV/<yıl>` sayfasını yalnızca
yıl kapandıktan sonra dolduruyor; yürüyen yılın sayıları ANA SAYFADA, aynı
tabloyla. `crawlYear` arşiv sayfası boş dönerse ana sayfaya düşüyor ve gelen
satırları TARİH sütunundaki yıla göre süzüyor — süzme olmadan boş bir
`/ARŞİV/2019` sorgusu ana sayfadaki 2026 sayılarını 2019 diye kaydederdi.

### 2.1 PDF erişimi: robots.txt aykırı, ürün sahibi bilerek devam ediyor

Kaynak site stok bir DotNetNuke kurulumu ve `robots.txt`'i `User-agent: *`
için **`Disallow: /Portals/`** diyor. PDF'lerin tamamı orada
(`/Portals/6/2025/262.pdf`). Arşiv listesi (`/ARŞİV/2025`) serbest.

O robots.txt'i kimse düzenlememiş: içinde `#Sitemap: http://www.DomainNamehere.com/...`
gibi doldurulmamış şablon satırları ve `/App_Code/`, `/DesktopModules/` gibi saf
DNN iç dizinleri var. `/Portals/` DNN'in dosya deposu ve şablon onu topluca
kapatıyor — yani gazete PDF'leri hakkında verilmiş bir karar değil, platform
varsayılanı. **Ama beyan bu.**

Risk kaydedildi ve **ürün sahibi izin almadan devam etme kararını verdi**
(izin konusuna sonra bakılacak). Gerçekleşirse en olası sonuç IP/UA engeli;
spec §16'nın "kaynak erişimi keser → ürün durur" senaryosu. İstek atarken
`politeFetch`'in saniyede bir istek sınırına dokunma.

**Teknik durum doğrulandı:** PDF'ler indirilebiliyor, engel yok.

### 2.2 PDF saklanmıyor — depolama sorusu zaten çözülmüş

Sık sorulan soru: 4.400 PDF nereye sığacak? **Hiçbir yere — saklanmıyorlar.**
`extractPdfText` geçici dizine indiriyor, metni çıkarıyor, `finally` bloğunda
siliyor (başarıda da hatada da). Saklanan tek şey `body_text`
(kayıt başına en fazla 20 KB, `BODY_TEXT_LIMIT_BYTES`).

**ÖLÇÜLDÜ** — 2025 + 2026 (422 sayı, 6.915 kayıt) işlendikten sonra:

| | |
| --- | --- |
| Veritabanının tamamı | **46 MB** |
| Kayıt başına ortalama gövde | 2,2 KB (tavan 20 KB, tavana değen kayıt var) |
| Gövde uzunluğu | medyan 1.208 · p90 2.308 |
| En büyük indeks | `records_search_idx` (GIN) |
| İkinci | `records_title_trgm_idx` |

Yani **sayı başına ~109 KB** — iki yıl üzerinden ölçüldüğü için tek yıllık
tahminden (110 KB) daha güvenilir. 2006–2025 için ~4.400 sayı:

```
4.400 × 110 KB  ≈  480 MB
```

⚠️ Supabase ücretsiz katmanı 500 MB (güncel limiti doğrula). Yani tam arşiv
**teknik olarak sığıyor ama boşluk kalmıyor** — ve iki şey bu hesabı bozar:

1. **OCR.** 422 sayının 33'ü (%8) taranmış çıktı ve gövdesiz kaldı. OCR
   açılırsa onlar 2 KB yerine 200 KB+ verir; eski yıllarda taranmış oranı
   muhtemelen daha yüksek. Bkz. §6.1.
2. Alarm/kullanıcı tabloları büyüdükçe.

Boşluk açmanın ölçülmüş yolları, ucuzdan pahalıya:

- **Önce yakın yılları doldur.** 2015–2025 ≈ 10 yıl ≈ 240 MB, rahat sığar.
  Eski yıllar kapasite netleşince eklenir.
- `records_title_trgm_idx` yılda 1,9 MB, 20 yılda ~32 MB. Bulanık başlık
  eşleştirmesi için; vazgeçilebilirse doğrudan kazanç.
- `BODY_TEXT_LIMIT_BYTES` (20 KB) düşürmek — ortalama zaten 2,2 KB, yalnızca
  uzun kuyruğu keser.
- Supabase Pro (8 GB) — sorunu tamamen bitirir.

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

## 3.5 Gerçek arşiv çekilince çıkan beş hata

Beşi de **elle yazılmış fixture'ların gizlediği** hatalardı: `tsc`, `eslint` ve
o günkü 48 test hiçbirini görmüyordu, çünkü hepsi fixture'ların *biçimini*
doğru varsayıyordu. Ders: uydurma fixture, ayrıştırıcıyı değil kendini test
eder.

**1. İÇERİK hücresi metin dökümü değil, sütunlu iç tablo.** En büyüğü.
`BÖLÜM | REFERANS | BAŞLIK | (artık sütun)`. Metne düzleştirilince her hücre
kendi satırına düşüyor ve her kayıt ikiye bölünüyordu: biri referansı taşıyıp
başlığı `"A.E.1071"` olan, diğeri başlığı taşıyıp referansı olmayan. 2025 için
3.977 gerçek satırdan **7.170 sahte kayıt**, %48'i referanssız.

Çözüm `parseIndexTable` (`scripts/parse-records/parser.ts`) — cheerio ile
yapıdan okuyor. Metin yolu (`parseIndexCell`) **silinmedi**, yedek: sayıların
küçük bir azınlığında İÇERİK tablosuz geliyor (2025'te 262'nin 2'si).

Yan fayda: referans kendi HÜCRESİNDEN geldiği için başlık içindeki atıflar
artık hayalet kayıt üretemiyor. Gerçek vaka, 2012 sayı 190: başlık
`K(II) 2476-2012 SAYI VE ... KARARIN TADİLİ`, kaydın kendi numarası
`2487-2012`. Metin yolu burada yanlış numarayı alırdı.

**2. Bakanlar Kurulu referansının öneki dönemlere göre değişiyor.**
`REF_PATTERNS`'te yalnızca `Ü(K-I)` vardı; dört yılın taramasında 6.400+
satırın referans tipi kayboluyordu:

```
S-1642-2006 / S(K-II) 566-2006  →  K(II)-2839-2012  →  TE(K-I) 1555-2018
→  Ü(K-I) 2497-2025
```

Dördü de ezici çoğunlukla EK IV BÖLÜM I'de, yani aynı seri. Ayrı `RefType`
olarak eklendiler (`s`, `skii`, `kii`, `teki`) çünkü künyedeki atıf kaynağa
sadık kalmalı — bir hukukçu 2006 kararını `S-1642-2006` diye arar.

⚠️ Parantez içindeki seri harfi **güvenilir değil**: `K(II)` ikinci seri gibi
okunuyor ama 2012'de EK IV BÖLÜM I'de. Bölümü referans önekinden türetme.

`ref_type` sütunu kısıtsız `text` (`0003-core-tables.sql`), enum değil —
yeni tip eklemek migration istemiyor.

**3. Birleşik sayı numarası `Number.isInteger`'ı deliyor.** SAYI hücresi
`195/1 195/2 195/3 195/4` olabiliyor (2018'de iki kez). Eski kod bütün
rakamları yapıştırıp `1.95e+23` üretiyordu ve bu değer `Number.isInteger`
denetiminden **geçiyor** — kesirsiz her kayan nokta sayısı gibi. Koruma
devreye girmeden bigint sütununa çöp yazılacaktı. Artık `parseIssueNumber`
ilk numarayı alıyor ve makul aralık dışını reddediyor.

**4. User-Agent'taki Türkçe karakter ingest'in tamamını kilitliyordu.**
HTTP başlık değerleri ByteString, karakter başına en fazla 255.
`CRAWLER_USER_AGENT` marka adını (`Mevzuat Kıbrıs`) içeriyordu; `ı` = 305.
`fetch` daha isteği kurmadan `TypeError` atıyor:

```
Cannot convert argument to a ByteString because the character
at index 9 has a value of 305 which is greater than 255
```

Yani boru hattı **tek bir istek bile atamazdı**. Beteri: hata `politeFetch`'in
yeniden deneme döngüsüne yakalanıp sıradan bir ağ hatası gibi görünüyordu, 4
kez denenip "site erişilemiyor" diye raporlanıyordu. `politeFetch` artık
`TypeError`'ı yeniden denemiyor (denemek düzeltmez, yalnızca kaynak siteyi
yorar). `CRAWLER_USER_AGENT` artık ASCII; bekçi testi var.

> Bunu curl ile yapılan keşif **göremez** — curl'e ASCII bir UA verilir ve
> istek çalışır. Ancak `npm run ingest:crawl` çalıştırılınca çıktı.

**5. Sınıflandırıcı kaynağın gerçek kelimelerini bilmiyordu.** Kurallar
tahmini kalıplara göre yazılmıştı:

| Kural aradı | Kaynak yazıyor | Sonuç |
| --- | --- | --- |
| `GÖREVDEN ALMA` | `GÖREVDEN ALINMA` | `diger` |
| `SINAV SONUÇLARI` | `SINAV NETİCELERİ` | `yasa` (!) |
| `REKABET KURULU KARARI` | `... KARAR FORMU` | `diger` |

`SINAV NETİCELERİ` vakası özellikle sinsi: EK III kayıtları
`<DAYANAK YASA> - <asıl belge>` diye adlandığı için baştaki yasa adı en
sondaki `YASASI` kuralına düşürüp belgeyi *yasa* sanıyordu. Yeni kural yazarken
başlığın dayanak yasa adıyla başlayabileceğini varsay.

Ayrıca EK V BÖLÜM I / II için bölüm tabanlı yedek eklendi: kelime kalıbı
tutmadığında bölümün kendisi belgenin ne olduğunu zaten söylüyor.

---

## 3.6 PDF'ler ilk kez indirildiğinde çıkanlar

Dört sayı örneklendi (2006-193, 2012-190, 2018-130, 2025-175) + üç 2025 sayısı.

**1. `pdftotext` bu makinede KURULU** (sürüm 4.00, `/mingw64/bin`). Bu dosya
önceden yok diyordu, yanlıştı. Kurulu olmayanlar: `pdfinfo`, `ocrmypdf`,
`tesseract`.

**2. Metin kalitesi beklenenden çok iyi.** 2006 dahil sayılar gerçek metin
PDF'i, taranmış görüntü değil; `estimateQuality` 0.98–0.99 veriyor. "2015
öncesi OCR ister" varsayımı yanlış — OCR yıla değil **tekil sayıya** bağlı.

**3. ⚠️ Taranmış PDF tespiti bozuktu — sessiz veri kaybı.** En önemlisi.
`pdfinfo` kurulu olmadığı için `pdfPageCount` null dönüyor, eski kod da
`perPage`'i tüm metin uzunluğuna düşürüyordu; 150 karakter eşiği hiçbir zaman
tetiklenmiyordu. Sonuç: 23,8 MB'lık taranmış bir sayı (2025-175), yalnızca
kapak sayfasından gelen 2 KB metinle `status='extracted'` damgası alıyordu.

`estimateQuality` bunu **yakalayamaz**: çıkan az miktarda metin tertemiz
Türkçe olduğu için kalite 0.99. Kalite metnin *doğruluğunu* ölçüyor,
*eksikliğini* değil. Yeni kural yazarken bu ayrımı unutma.

Çözüm `SCANNED_TEXT_RATIO` (`scripts/extract-text/index.ts`): sayfa sayısı
yoksa metin baytı / PDF baytı oranına bakılıyor. Ölçülen ayrım 27 kat:

| 2025 sayı | PDF | metin | oran | |
| --- | --- | --- | --- | --- |
| 100 | 2,7 MB | 12 KB | %0,45 | metin |
| 262 | 3,2 MB | 9 KB | %0,27 | metin |
| 175 | 23,8 MB | 2 KB | %0,01 | **taranmış** |

**4. Arşivdeki PDF bağlantıları ölü olabilir.** 2018-130 → HTTP 404. O yılın
yolu da farklı (`/Portals/105/`, diğerleri `/Portals/6/`). Ingest 404'ü
ölümcül saymamalı; sayı kaydı durur, gövde boş kalır.

**5. `scripts/fetch-pdf/` dizini YOK** ama `package.json` `ingest:fetch`
betiğiyle ona işaret ediyor. Çalıştırılırsa patlar. İndirme zaten
`extract-text` içinde; ya betik girdisi silinmeli ya dizin yazılmalı.

---

## 3.7 Konu sınıflandırması gerçek veriyle kalibre edildi

2025 işlendikten sonra ölçüldü: kendi sayfası olan 3.059 kaydın **1.595'i
(%52) konusuzdu** ve %91'i Bakanlar Kurulu kararıydı. Yani `doc_type` doğru
atanıyordu, kaçan şey **konu**. Üç ayrı sebep vardı, üçü ayrı ayrı çözüldü.

**1. Kurallar fazla dardı.** Tahminle yazılmışlardı, kaynağın gerçek
sözcüklerini bilmiyorlardı:

| Kural arıyordu | Kaynak yazıyor | Kaçan |
| --- | --- | --- |
| `TAŞINMAZ MAL SATIN ALMA` | yalın `TAŞINMAZ` | 126 |
| `YOL AYRILMASI` | `KAMU YOLU İLAN EDİLMESİ` | 28 |
| `ÖDENEK AKTARMA` | `MASRAF`, `GİDERLER` | 188 |
| `GÖREVLENDİRME` | `GÖREVLENDİRİLECEK` | 19 |

`GİDERLER` bilerek çoğul: yalın `GİDER` öneki `GİDERİLMESİ` gibi ilgisiz
sözcükleri de yakalardı. `İŞLETME İZNİ` gayrimenkule değil **şirkete** verildi:
serbest bölgede faaliyet izni, mülk işlemi değil.

**2. Bir konu tamamen eksikti.** 537 kayıt (konusuzların üçte biri)
`X'in KKTC YURTTAŞLIĞINA ALINMASI` biçimindeydi ve sekiz konunun hiçbirine
girmiyordu. Dokuzuncu konu eklendi: `yurttaslik`.

⚠️ Anahtar kelime `YURTTAŞL` öneki — tam biçim aranırsa 30 kayıt kaçıyor:

```
YURTTAŞLIĞINA ALINMASI   525
YURTTAŞLAĞINA ALINMASI    29   <- kaynaktaki yazım hatası
YURTTAŞLIĞNA ALINMASI      1
```

Konu eklemek migration İSTİYOR: `record_topics.topic` sütunu `topics(slug)`'a
foreign key. `scripts/seed` o tabloyu dolduruyor ama yalnızca `db:reset`'te
çalışıyor ve gerçek veri yüklüyken reset yapılamaz. Bu yüzden
`0008-topic-yurttaslik.sql`.

**3. Tadil kararlarının kendi başlığında konu sinyali yok.**
`Ü(K-I) 1880-2024 SAYI VE ... KARARIN TADİL EDİLMESİ` — konusu, tadil ettiği
kararın konusu. Kelime kuralıyla çözülemez. `scripts/reclassify/inherit.ts`
başlıktaki referansı çözüp kaynak kaydın konularını devralıyor.

Devralma kural katmanından SONRA çalışmak zorunda; sıra tersse kaynakların
çoğu hâlâ konusuz olur. İlk ölçümde yalnızca 7 kayıt devralabiliyordu, kurallar
düzeldikten sonra 36 oldu.

### Sonuç

```
konusuz kayıt   1.595 / 3.059  (%52,1)   ->   515 / 3.059  (%16,8)
```

Kalan 515'in 473'ü çeşitli Bakanlar Kurulu kararı (protokol, heyet, muhtelif);
ortak bir kalıpları yok.

### `npm run reclassify`

Sınıflandırma kuralları değiştiğinde mevcut kayıtlara uygulamanın yolu.
Yalnızca `title`, `section`, `ref_type` sütunlarına bakıyor — **ağa hiç
çıkmıyor**, PDF indirmiyor. Öncesinde tek yol bütün arşivi yeniden çekmekti.
Dokunmadıkları: `body_text`, `summary`, `has_own_page`, `slug` (spec 8.1).

`--dry` ile yalnızca sayar, yazmaz.

### Bilinen kabul

`TAŞINMAZ` anahtarı, "KKTC TAŞINMAZ ESKİ ESERLER VE ANITLAR YÜKSEK KURULU"
kararlarını da (102 kayıt) gayrimenkule alıyor. Taşınmaz eski eser gerçekten
bir mülk konusu, o yüzden yanlış sayılmadı; ama bunlar bir gün kendi konusunu
hak edebilir.

### Eski yıllara geçerken dikkat

Tadil başlıklarındaki atıflarda `REF_PATTERNS`'te OLMAYAN dönemsel önekler
görüldü: `SİBER(K-I)297-2013`, `H(K-I)1795-2016`, `Y(K-I)2412-2014`,
`E-1584-2000`. 2025 verisinde bunlar yalnızca metin içi atıf olduğu için
zararsız; ama o yıllar backfill edilirse kayıtların KENDİ referansı olacaklar
ve §3.5'teki `s`/`skii`/`kii`/`teki` gibi eklenmeleri gerekecek.

---

## 3.8 Gövde sınırları — kayıt, komşusunun metnini yutuyordu

`extractBody` gövdeyi kaydın referansından başlatıp bitişi ararken YALNIZCA
içindekiler sırasındaki **bir sonraki** kaydın etiketine bakıyordu. O etiket
başlangıçtan sonra bulunamazsa gövde PDF'in sonuna kadar uzuyor, 20 KB
tavanında kesiliyordu.

Bulunamaması sık: gazetenin fiziksel sırası içindekiler sırasıyla aynı olmak
zorunda değil, yani "bir sonraki" etiket başlangıçtan ÖNCE kalabiliyor.

Ölçüm (2025 + 2026): **3.646 gövdeli kaydın 184'ü (%5,0)** başka kayıtların
referansını içeriyordu, taşan kayıt başına ortalama 7,9 yabancı referans,
13–18 KB gövdeler (medyan 1.219 karakter).

Bu yalnızca görüntü sorunu değildi: gövde metni `search_vector`'a giriyor,
yani kayıt **kendisiyle ilgisi olmayan kelimelerle bulunabiliyordu.** Gövdeden
aramanın var oluş amacını kirletiyordu.

Bitiş artık **başlangıçtan sonraki en yakın BAŞKA referans** — sıradan
bağımsız. Hiçbiri bulunamazsa sona kadar gidiyor; PDF'teki son kayıt için
doğru davranış.

Sonuç: 184 (%5,0) → **6 (%0,17)**, gövde p90 3.080 → 2.308. Kalan altısı,
referansı PDF metninde hiç geçmeyen kayıtlar.

> Düzeltme yalnızca kodu değiştirmekle bitmiyor: mevcut kayıtlar için
> etkilenen 52 sayı `pending` yapılıp yeniden işlendi (yöntem §6.3).

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
- Prerender işçilerinde `process.env.NEXT_PHASE === 'phase-production-build'`
  ayarlı. Derleme ile çalışma zamanını ayırmanın güvenilir yolu bu; `NODE_ENV`
  ikisinde de `production` olduğu için ayırt etmiyor (§6.4 pooler seçimi).

### 4.6 Bu ortama özgü

- Bash heredoc'larında **ters bölü ve backtick yenip gidiyor**. Regex veya
  template literal içeren dosyaları `Write`/`Edit` aracıyla yaz, heredoc'la
  değil. (Regex'i `\d` yerine `d` olarak yazıp sessizce bozdum, sonra fark ettim.)
- `dotenv/config` `.env.local` okumuyor; yükleme `scripts/shared/env.ts`
  içinde ve ikisini de açıkça yüklüyor (`.env.local` > `.env`).

### 4.7 Env sabitleri modül yüklenirken donuyor (SESSİZ)

`src/lib/seo/config.ts` env'i **değerlendirildiği anda** okuyup sabite
donduruyor:

```ts
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mevzuatkibris.com')
```

Next.js'te sorun yok, env build'de hazır. **Betiklerde sorun var:** import
zinciri `crawl-archive` → `shared/http` → `seo/config` şeklinde ilerliyor ve
`seo/config`'i, dotenv'i yükleyen modülden ÖNCE değerlendiriyor. Sonuç:
`.env.local`'de `http://localhost:3000` yazılı olmasına rağmen `SITE_URL`
üretim domainine donuyor.

Bu yalnızca yerel bir tuhaflık değil: **domain yayına girdiğinde yerelde
çalıştırılan her ingest ÜRETİMİN revalidate endpoint'ini vurur.** Sırlar
aynıysa yerel bir deneme üretimin önbelleğini temizler.

Kural: betiklerde env'e bağlı değeri sabitten okuma, **kullanım anında**
`process.env`'den oku. Örnek `scripts/revalidate/index.ts` →
`revalidateBaseUrl()`. Import sırasına güvenme — linter import'ları yeniden
sıralayabilir ve sıra sessizce bozulur.

İlgili: env yüklemesi eskiden `shared/db.ts` içindeydi, yani env'in gelmesi o
modülü import etmeye bağlıydı. Veritabanına dokunmayan betikler env'siz
kalıyordu — `npm run revalidate` bu yüzden **hiç çalışmamıştı**, her
çalıştırmada "REVALIDATE_SECRET yok" deyip sessizce çıkıyordu. Yükleme
`scripts/shared/env.ts`'e alındı.

---

### 4.8 JS sözcük sınırı Türkçede çalışmıyor (SESSİZ)

JavaScript'in düzenli ifade sözcük sınırı ASCII tanımlı: sözcük karakteri
`a-z`, `A-Z`, `0-9` ve `_`. Türkçe harfler bu tanımın dışında, yani "ç", "ğ",
"ı", "ö", "ş", "ü" ile başlayan ya da biten bir kalıba sınır koyduğunda kalıp
**hiç eşleşmiyor** — hata vermiyor, sadece sessizce hiçbir şey yakalamıyor:

```ts
/\bgeçersiz sayıldı\b/.test('teklif geçersiz sayıldı')  // false
/\bözet yok\b/.test('bu başlıkta özet yok')             // false
```

Bu, LLM özet denetiminde (§6.2) gerçekten oldu: yasak ifade listesinin yarısı
yazıldığı günden beri ölüydü ve "Teklif geçersiz sayıldı" gibi tam olarak
engellemesi gereken cümleler denetimden geçiyordu. Testte yakalandı.

Çözüm `scripts/summarize/guard.ts` içindeki `trWord()`: sınırı Türkçe harfleri
de içeren bir karakter sınıfıyla ileriye/geriye bakışla kuruyor. Türkçe metin
üzerinde sözcük sınırlı kalıp yazarken bunu kullan.

Aynı sınıftan bir uyarı: `\w`, `\d` ve `\b` bu projede Türkçe metne
uygulanamaz. Karakter sınıflarını açıkça yaz.

### 4.9 `x += await f()` eşzamanlı çalışırken sayaç kaybediyor (SESSİZ)

```ts
stats.records += await writeSummary(...);   // YANLIŞ
```

JavaScript birleşik atamada sol tarafın değerini `await`'ten **önce** okuyor,
sonra bekliyor, sonra `okunanDeğer + sonuç` yazıyor. Tek işçide sorun yok. Ama
`Promise.all` ile dört işçi aynı nesneyi güncellerken arada tamamlanan
artışların üzerine yazılıyor.

§6.2'nin doğrulamasında görüldü: betik "37 kayıt yazdım" derken veritabanında
120 satır vardı. Sayaç yanlış olduğu için iş bitmiş görünüyordu.

```ts
const written = await writeSummary(...);    // DOĞRU
stats.records += written;
```

Bu kalıbı eşzamanlı çalışan her yerde ara — `+=`, `-=`, `push` değil ama
`x = x + await ...` biçimleri de aynı hatayı taşıyor.

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
npm test              # 67 test
```

⚠️ **`npm run db:reset` artık veri yok ediyor.** Şemayı sıfırlayıp
`fixtures/issues/*.txt` içindeki UYDURMA sayılarla tohumluyor — yani gerçek
taramayla gelen 262 sayıyı siler ve yerine 2 sahte sayı koyar. Sahte kayıtlar
zaten temizlendi (§2); geri getirme. Şema değişikliği gerekiyorsa `db:reset`
sonrası `npm run ingest:crawl 2025` ile gerçek veriyi geri çek.

`db:migrate`, Supabase'de hazır gelen `auth` şemasını ve `auth.uid()`
fonksiyonunu yerelde bulamazsa geçici gölge kuruyor (yalnızca yerel; Supabase'de
etkisi yok).

Dev server bu oturumda **açık bırakıldı** (port 3000).

---

## 6. Sıradaki işler

**OCR (§6.1) ve LLM özet katmanı (§6.2) yapıldı; ikisi de gerçek veriyle
çalıştırıldı.** Taranmış 33 sayının 32'si kurtarıldı, kayıtların %85,1'inde özet
var (oturum başında %11,5'ti). İkisinin tam raporu — ölçümler, alınan kararlar ve
yol boyunca bulunan altı hata — aşağıda.

Kalan işler, öncelik sırasıyla:

1. **Fixture'ları çoğalt.** `fixtures/real/` altında dört gerçek sayı var
   (dönem başına bir tane, hepsi elle doğrulandı). Spec §7.3 25 istiyor.
   Yeni fixture eklerken beklenen çıktıyı ayrıştırıcıdan üretip ham hücreye
   karşı **gözle doğrula** — üretip doğrulamadan koymak testi kendini
   onaylayan bir aynaya çevirir.
2. **2006–2024 backfill.** Kapasite için önce yakın yıllar (§2.2): 2015–2025
   ≈ 240 MB, ücretsiz katmana rahat sığar. `npm run ingest:backfill <yıl>`.
   Eski yıllara geçerken §3.5'te not düşülen dönemsel önekler (`SİBER(K-I)`,
   `H(K-I)`, `Y(K-I)`, `E-`) `REF_PATTERNS`'e eklenmeli.
   **Başlamadan önce §2.2'yi yeniden ölç** — o tahmin OCR hiç metin üretmezken
   yapılmıştı, artık üretiyor (§6.1). **Özet maliyetini de hesaba kat:** yılda
   ~4.000 kayıt × 19 yıl ≈ 76.000 kayıt, kural katmanı düştükten sonra ~67.000
   LLM çağrısı — bu oturumdaki doldurmanın ~11 katı.
3. ~~**`next build`'i geçir**~~ — **YAPILDI**, §6.4. Sebep: transaction pooler
   cevap kaybediyordu. Derleme artık session pooler'a bağlanıyor
   (`poolUrl()`, `NEXT_PHASE`) ve `experimental.cpus` ile işçi sayısı pinli.
   3.399 sayfa, **2m49s**, exit 0 — süre ölçümü §6.5. **Vercel'e çıkmadan önce
   build bölgesini `fra1` yap (§6.5) ve oradaki ortam
   değişkenlerini denetle:** derlemenin `DATABASE_URL`'i (session pooler, 5432)
   de tanımlı olmalı; yalnızca `DATABASE_URL_POOLED` konursa derleme sessizce
   transaction pooler'a düşer ve eski arıza geri gelir.
4. **Auth akışını uçtan uca dene.** Magic link → `/auth/callback` → alarm yazımı
   hiç denenmedi. Supabase Auth artık gerçek (`auth.uid()` çalışıyor).
5. **Resend.** `dispatch-alerts` hiç çalışmadı; kota bekçisi ve haftanın gününe
   dağıtım mantığı test edilmedi.
6. **AdSense.** Slot id'leri boş; `NEXT_PUBLIC_ADSENSE_CLIENT` boşken reklam
   basılmıyor, yalnızca ayrılmış kutu görünüyor. Spec §14.5: başvuru Milestone 4
   bitmeden yapılmamalı.
7. **Kalan 5 `needs_review` sayısı.** §6.1 sonundaki not; acil değil.

---

### 6.1 OCR — YAPILDI

**Durum: çalışıyor.** 33 taranmış sayının 32'si kurtarıldı. Kalan 1 sayı
(2025/170) OCR sorunu değil: kaynaktaki PDF bağlantısı **HTTP 404**, dosya
sitede yok.

| `text_status` | Önce | Sonra | Kalite (sonra) |
| --- | --- | --- | --- |
| `extracted` | 383 | 384 | 0,596 – 1,000 |
| `ocr` | 0 | **32** | 0,887 – 0,999 (ort. 0,985) |
| `needs_review` | 6 | 5 | 0,246 – 0,545 |
| `failed` | 33 | 1 | — (kaynak 404) |

Kurtarılan gövde: OCR'lanan 32 sayıdaki 338 kaydın 147'sinde gövde var,
ortalama 2.936 karakter. Tüm arşivde gövdeli kayıt oranı **%54,8** (3.792/6.915).

**ASIL BULGU — bayrak yanlıştı, araç eksikliği ikincil sorundu.**

Kod `ocrmypdf --skip-text` çağırıyordu. `--skip-text`, üzerinde metin OLAN bir
sayfayı **komple atlıyor**. Taranmış gazete sayfalarında tek bir gerçek metin
nesnesi var: sayfa numarası. ocrmypdf onu görüp her sayfa için
`skipping all processing on this page` deyip geçiyordu — yani araçlar kurulmuş
olsa bile OCR hiçbir şey üretmeyecekti.

2025 sayı 12'nin üç sayfalık dilimiyle ölçüldü:

```
--skip-text  →      18 karakter   ("18 149 150 151" — yalnızca sayfa numaraları)
--redo-ocr   →   7.873 karakter   (temiz Türkçe, kalite 0,999)
--force-ocr  →   7.898 karakter   (aynı sonuç, ~2,6 sn/sayfa)
```

Artık `--redo-ocr` kullanılıyor, `--force-ocr` yedeğiyle (`runOcr`,
`scripts/extract-text/index.ts`). `--redo-ocr` tercih edildi çünkü GERÇEK metin
katmanını koruyor; kuyrukta kısmen metin kısmen taranmış sayılar da var ve
onlarda rasterleştirmek elimizdeki iyi metni çöpe atmak olurdu.

Tam sayı üzerinde ölçülen sonuç:

```
2025/12   3.883 → 104.954 karakter   (27,5 MB PDF, 45 sn)
2025/67   4.354 → 119.418 karakter   (23,4 MB PDF, 48 sn)
```

**Eşik kalibrasyonu (eski 3. madde) — YAPILDI, eşik DEĞİŞMEDİ.**

`QUALITY_THRESHOLD = 0.55` "hiç gerçek OCR çıktısı görülmeden" konmuştu. Artık
görüldü; ölçülen dağılım:

```
metin PDF'leri (384 sayı)   0,596 – 1,000   ortalama 0,979
OCR çıktısı     (32 sayı)   0,887 – 0,999   ortalama 0,985
bilinen bozuk    (5 sayı)   0,246 – 0,545
```

0,55 tam olarak bilinen-bozuk tavanı (0,545) ile sağlam-metin tabanı (0,596)
arasında duruyor. Tahminle konmuştu ama **ölçüm onu doğruladı**; değiştirmek
için sebep yok.

Buna karşılık şunu bilerek oku: bu eşik OCR'ın başarısızlığını **yakalamıyor**
ve yakalayamaz. OCR çıktısının tabanı 0,887, eşiğin 0,33 üstünde. Kalite metnin
*doğruluğunu* ölçüyor, *eksikliğini* değil — taranmış bir sayının kapak
sayfasından çıkan üç satırlık tertemiz Türkçe de 0,99 veriyor. Taranmışlığı
yakalayan tek şey `SCANNED_TEXT_RATIO` (§3.6) ve o hâlâ yük taşıyan denetim.

**Yan yolda çıkan hata — kalite 0 ile "ölçülemedi" karışıyordu.**

`estimateQuality` 20 sözcükten az metinde `0` döndürüyordu. Tek kararlık kısa
bir sayı (2025/59, 671 karakter) bu yüzden `needs_review` damgası yiyip yeniden
deneme kuyruğuna giriyordu: 30 günde bir PDF yeniden iniyor, aynı sonuç
çıkıyor, süresiz. Artık ölçülemeyen kalite `null` dönüyor ("bilmiyorum" ile
"kötü" farklı şeyler) ve `needs_review` yalnızca ÖLÇÜLMÜŞ düşük kalitede
veriliyor. 2025/59 yeniden işlendi, artık `extracted` + `quality null`.
Testi: `scripts/extract-text/quality.test.ts`.

**Kurulum.** Araçlar bu makinede kuruldu ve çalışıyor: tesseract 5.5.3 (`tur`
dil verisiyle), ghostscript 10.07.1, ocrmypdf 17.11. Komutlar README'de.
Dikkat: `pip`'in kurduğu `ocrmypdf.exe` PATH'te olmalı — `commandExists` onu
PATH'ten arıyor, bulamazsa OCR'ı sessizce atlayıp sayıyı `failed` damgalıyor.

**Depolama uyarısı hâlâ geçerli.** 32 sayı için sorun yok ama §2.2'deki
~480 MB'lık 20 yıllık tahmin taranmış oranın düşük kalmasına dayanıyor ve eski
yıllarda o oran muhtemelen daha yüksek. OCR artık gerçekten metin ürettiğine
göre (sayı başına ~100 KB), backfill'e geçmeden §2.2'yi yeniden ölç.

**Kalan 5 `needs_review` — bakılabilir, acil değil.** Bunlar taranmış değil,
metin katmanı bozuk. Somut örnek 2026/17: kaynak PDF'in metin katmanından
noktasız "ı" hiç çıkmıyor ("yayımlamak" → "yaymlamak", "halkın" → "halkn").
İki not:

1. Bu bozulmayı `estimateQuality` **tesadüfen** yakalamıyor — o ölçüt dört
   ünsüzün yan yana gelmesine bakıyor, düşen "ı" onu üretmiyor. O metin tek
   başına 0,93 alıyor. Yani düşük kalite bozulmanın kanıtı, yüksek kalite
   sağlamlığın kanıtı DEĞİL.
2. `--force-ocr` bunları düzeltebilir (sayfayı görüntüye çevirip baştan okur)
   ama şu an denenmedi ve `looksScanned` false olduğu için OCR'a hiç
   girmiyorlar. Denemeden önce şunu ölç: 2025/195 180.785 karakterle 0,283
   alıyor; bu kadar metnin gerçekten bozuk olması yerine ölçütün tablo/isim
   listesi ağırlıklı sayılarda yanılıyor olması da mümkün.

---

### 6.2 LLM özet katmanı — YAPILDI

Sağlayıcı **OpenAI**, model `gpt-4o-mini` (ürün sahibinin kararı).

**DOLDURMA TAMAMLANDI.** Sonuç: **6.915 kaydın 5.887'sinde özet (%85,1)**.
Oturum başında %11,5'ti.

| kaynak | kayıt | oran |
| --- | --- | --- |
| `llm` | 5.090 | %73,6 |
| `rule` | 797 | %11,5 |
| özet yok (3. basamak) | 1.028 | %14,9 |

Son koşum: 4.015 grup, **0 adet 429**, 0 hata, ~12 dakika. Kırılım:

```
declinedBy: model-declined 879 · cok-uzun 62 · sonuc-bildiriyor 1 · baslikla-ayni 1
```

Denetim yanlış pozitifleri fiilen bitti (4.015 grupta 2 tane). Kalan redlerin
%93'ü modelin kendi kararı.

**TOKEN TAHMİNİ ÖLÇÜMLE DÜZELTİLDİ.** `CHARS_PER_TOKEN` 2,2 varsayılmıştı
("Türkçe kötü tokenize olur"). OpenAI'nin 429 mesajları isteğin gerçek maliyetini
yazıyor (`Requested 590`); 2.078 karakterlik istem + 90 çıktı jetonuna karşılık
bu **~4,2 karakter/token** demek — gpt-4o'nun tokenizer'ı Türkçeyi sanıldığından
çok daha iyi işliyor. Yanlış tahmin her rezervasyonu iki katına çıkarıp koşumu
limitin izin verdiğinin yarısına kısıyordu: düzeltme sonrası hız
**157 → 290 grup/dk**. Sabit 3,5'e çekildi (ölçülenin altında, kasıtlı pay).

**AYNI BAŞLIK KOŞUMLAR ARASINDA DA BİR KEZ SORULUYOR.** Koşum içinde grup sorgusu
zaten tekilleştiriyordu, ama koşumlar arasında değil: 2025'te özetlenmiş bir
başlık 2026'da yeni satır olarak geldiğinde `summary is null` olduğu için ikinci
kez soruluyor ve ikinci kez ödeniyordu. Ölçüldü: kayıtların **%12,8'i** başka bir
kayıtla aynı başlığı taşıyor, yani bu neredeyse günlük ingest'in tüm maliyeti.

`reuseExistingSummaries()` her koşumun başında, hiçbir çağrı yapmadan, mevcut
özeti aynı istemi üretecek kayıtlara kopyalıyor. Yan faydası: aynı başlık artık
yapı gereği birebir aynı özeti alıyor — spec 3.8 kural 3'ü modelden bağımsız
garantiliyor.

**TUZAK — iki koşum paralel çalışırsa sessizce iki kat fatura.** Bir koşum
durdurulup yenisi başlatıldığında eski süreç ağacı hayatta kalabiliyor. İkisi de
aynı sırayla ilerlediği için AYNI grupları soruyor; öndeki yazıyor, arkadaki
`summary is null` koşuluna takılıp ürettiğini çöpe atıyor. Ölçülen örnek:
`llm: 593` ama `records: 16`.

**Belirtisi budur: `records` sayısı `llm` sayısından belirgin düşükse başka bir
koşum aynı grupları dolduruyordur.** Sağlıklı koşumda ikisi birbirine yakın.
Durdurduktan sonra süreç ağacının gerçekten öldüğünü doğrula.

**Kalan 1.028 kayıt — ÖLÇÜLDÜ: çoğu özetlenebilir, istem engelliyor. Ürün
sahibi düzeltmemeye karar verdi.**

Bunlarda model "güvenli özet çıkmıyor" dedi ve 3. basamak (maskelenmiş başlık)
doğru davranış. Ama sebebi modelin yetersizliği değil, istemin 4. maddesi:

> `4. Tek cümle, nokta koyma, 12-160 karakter. Başlığı olduğu gibi kopyalama.`

7. madde de "güvenli özet çıkmıyorsa YOK yaz" diyor. Başlık zaten temiz ve kısa
bir ifadeyse doğru özet, onun okunabilir yazıma çevrilmiş hâlidir; model bunun
4. madde tarafından yasaklandığını düşünüp YOK diyor.

Bu, `baslikla-ayni` hatasının aynısı ve aynı kökten: denetimden büyük/küçük harf
katlaması kaldırıldı (asıl değer o çeviride) ama İSTEMDE modele hâlâ "kopyalama"
deniyor. **Denetim izin veriyor, istem yasaklıyor.**

8 gerçek başlıkla ölçüldü — 4. madde şuna gevşetildiğinde:

> Başlık zaten tek ve anlaşılır bir ifadeyse onu OLDUĞU GİBİ BIRAKMA ama günlük
> yazıma çevir: BÜYÜK HARFİ normal yazıma al, özel adların büyük harfini koru.
> Bu geçerli bir özettir, YOK yazma.

sonuç **şimdiki istemle 0/8, gevşetilmişle 8/8**. Sekizi de denetimden geçti,
hiçbiri sonuç bildirmedi. Örnek:

```
SEÇİM VE HALKOYLAMASI YASASI-YÜKSEK SEÇİM KURULU KARAR SAYISI:76/2025
  şimdiki    -> YOK
  gevşetilmiş-> Seçim ve halkoylaması yasası hakkında Yüksek Seçim Kurulu kararı
```

Özetsiz 1.028 kaydın yapısal dağılımı:

| kategori | kayıt | not |
| --- | --- | --- |
| Diğer (yasa tasarısı, kurul kararı…) | 377 | istem engelliyor |
| Sınav sonuç listesi | 237 | kurtarılabilir, değeri düşük (kişisel veri) |
| Başka karara atıf (tadil/iptal) | 160 | kısmen |
| Çok kısa başlık | 111 | istem engelliyor |
| Çok uzun başlık | 105 | model 160 karakteri aşıyor, ayrı sorun |
| Periyodik vaziyet/tarife | 38 | kurtarılabilir |

**KARAR: uygulanmadı.** Ürün sahibi "maskelenmiş başlık okunabiliyor, boşuna
kaynak harcamayalım" dedi. Bu bilinçli bir tercih, keşfedilmemiş bir eksik değil.

Sonucu bilerek taşı: **günlük ingest'te de aynı biçimdeki yeni kayıtlar özetsiz
kalmaya devam edecek** (~%15). Fikir değişirse iş küçük: 4. maddeyi yukarıdaki
gibi değiştir ve `npm run summarize -- --retry` çalıştır — mevcut 5.090 özet
`summary is null` koşuluna takılmadığı için hiç dokunulmaz, üslup tutarlılığı
riski yok. Maliyet ~900 çağrı.

**Neden `processIssue` içinde değil, ayrı betik.** Bu dosyanın eski hâli
"`processIssue` içinde çağır" diyordu; ayrı betik seçildi çünkü (a) mevcut
6.118 kayıt o yolla asla özet almaz — onlar zaten işlendi ve `ON CONFLICT`
mevcut özeti koruyor; (b) tek bir OpenAI kesintisi PDF indirmeyi de durdurur.
`reclassify` ile aynı gerekçe: girdi zaten veritabanında, kaynak siteye hiç
dokunulmuyor. Kademe sırası korunuyor — betik önce `summarize()` (kural),
tutmazsa LLM.

**Reddedilen kayıt bir daha sorulmuyor (migration 0009).** Kademeli üretimin
üçüncü basamağı "özet yok"tur ve `summary` null KALIR. Ama betik işini
"summary is null" diye seçerse aynı başarısız başlıklar her çalıştırmada
yeniden sorulur — günde iki kez çalışan ingest'te süresiz ödeme demek.
`summary_attempted_at` dolu + `summary` null = "denendi, güvenli özet çıkmadı".
İstem ya da denetim değişince `--retry` ile eski redler yeniden denenir.

**Günlük ingest'e bağlandı.** `daily-ingest.yml`'ye ayrı bir adım eklendi.
`OPENAI_API_KEY` secret'ı yoksa adım atlanıyor ve iş yeşil kalıyor: ürün özetsiz
de çalışıyor, ama kurulmamış bir anahtar yüzünden günlük ingest'i kırmızıya
boyamak asıl işin (yeni sayıların yakalanması) sessizce durmasına yol açardı.

**Gövde metni modele VERİLMİYOR, bilerek.** Özet yalnızca başlıktan
türetilebilecek şeyi söyleyebilir. Modele gövdeyi verirsek, kararın sonucunu
özetlememesini istemek önüne koyduğumuz bilgiyi görmezden gelmesini istemek
olur. Vermezsek yazamaz. `buildUserPrompt` yalnızca başlık, belge türü ve
bölüm gönderiyor; testi bunu doğruluyor.

---

### 6.3 Kayıtları yeniden işlemek (ikisinde de gerekecek)

Kural ya da çıkarma mantığı değiştiğinde mevcut kayıtlara uygulamanın yolu:

- **Yalnızca sınıflandırma değiştiyse:** `npm run reclassify` — ağa çıkmıyor,
  PDF indirmiyor, saklanan başlıklardan `doc_type` ve konuları yeniden
  hesaplıyor. `--dry` ile yalnızca sayar.
- **Gövde/metin çıkarma değiştiyse:** ilgili sayıları
  `update issues set text_status='pending'` yapıp
  `npm run ingest:backfill <yıl>` çalıştır. Backfill yalnızca `pending`
  olanları işliyor, yani hedefli çalışıyor ve kesilirse kaldığı yerden devam
  ediyor. PDF'ler yeniden iniyor — kaynak siteye yük olduğunu unutma.

---

### 6.4 Supabase — veri taşındı, uygulama çalışıyor, derleme geçiyor

Veri **yeniden üretilmedi, taşındı**. Özet bir hesaplama değil, `records.summary`
sütununda metin. Aktarım sıfır LLM çağrısı ve sıfır kaynak-site isteğiyle yapıldı.

**Taşınan (7 tablo, yerelle birebir):** `records` 6.915, `record_entities`
10.333, `record_topics` 6.800, `entities` 1.287, `issues` 422,
`search_synonyms` 21, `topics` 9. Özet dağılımı korundu (`llm` 5.090, `rule` 797,
boş 1.028), gövde 3.792 kayıt / 6.697 kB.

**Taşınmayanlar, bilerek:** `profiles` / `alerts` / `alert_deliveries` (boş, ve
`auth.users`'a bağlı — Supabase Auth yönetiyor), `ingest_runs` / `search_logs`.

**Yöntem.** Hostta `pg_dump` yok; Docker kabında var (PG 16.15) ve kap internete
çıkıyor, dolayısıyla dump doğrudan kaptan Supabase'e akıtıldı. Sıra bağımlılığa
göre. Önce `truncate` gerekti: migration 0007 `search_synonyms`'e 21, 0008
`topics`'e 1 satır tohumluyor ve aktarımla çakışıyorlardı.

`search_vector` taşınmadı, hedefte yeniden üretildi (generated column) — ön
koşulu şemanın ÖNCE kurulmuş olması. Diziler elle hizalandı; `--data-only` dump
`-t` filtresiyle `setval` getirmiyor ve hizalanmasaydı ilk yeni kayıt çakışırdı.

### Çalıştığı doğrulananlar

- Migration 0002/0007'nin **zorunlu kabul testleri gerçek Supabase'de geçti** —
  `tr_rg` config'i orada kuruluyor. En riskli görülen adım buydu.
- Arama gerçek veriyle: `tüzük` 751, `kamulastirma` 257, `ihale` 135, `münhal` 196.
- Sayfalar Supabase'e karşı doğru render oluyor (dev sunucusu, 5 sayfa 200):
  kayıt sayfasının h1'inde LLM özeti, altında ham başlık kutusu; arama 20 sonuç.

### İKİ AYRI BAĞLANTI — `DATABASE_URL` + `DATABASE_URL_POOLED`

Tek URL ile `next build` patlıyordu:

```
(EMAXCONNSESSION) max clients reached in session mode
                  max clients are limited to pool_size: 15
```

Session pooler 15 istemciyle sınırlı; derleme 3.399 sayfayı ~8 işçiyle üretiyor
ve her işçi kendi havuzunu açıyor (`max: 4`) → 32 bağlantı.

Ölçüldü (6 işçi × 25 tur × 4 paralel = 600 sorgu):

| pooler | süre | hata |
| --- | --- | --- |
| session 5432 | 5.284 ms | **5** × EMAXCONNSESSION |
| transaction 6543 | 3.038 ms | **0** |

Ayrıca sonuç DOĞRULUĞU da denetlendi (her sorgu kendi kimliğini geri getiriyor):
transaction pooler'da **0 bozulma**. Yani pooler bu yük altında sağlam.

`src/lib/db/client.ts` artık `DATABASE_URL_POOLED`'ı tercih ediyor, yoksa
`DATABASE_URL`'e düşüyor — yerelde pooler olmadığı için doğrusu da bu.

### ✅ ÇÖZÜLDÜ: `next build` prerender'da düşüyordu

**Kök sebep: transaction pooler CEVABI KAYBEDİYOR.** Sorgu gidiyor, Postgres
çalıştırıyor ve `idle`'a düşüyor, ama cevap postgres-js'e hiç ulaşmıyor. Soket
açık kaldığı için postgres-js reddetmiyor da — sorgu sonsuza kadar asılı kalıyor
ve havuzun dört yuvasından birini KALICI olarak yakıyor.

Belirtilerin hepsi bundan çıkıyor: Next sayfayı 60 saniyede öldürüp hayatta kalan
bir yuvada yeniden deniyor (aynı sayfanın bir kez düşüp sonra geçmesi bu),
patlayan sayfa rastgele görünüyor (yuva biten kim olursa o) ve yeterince yuva
gidince derleme ölüyor.

**Ölçüm zinciri — sırayla:**

1. **Tek işçiyle derleme SONUNA KADAR koşturuldu** (geçen oturumda yarıda
   kalmıştı). 22 dakika, 3.399 sayfanın 3.039'u üretildi, sonra düştü. Ama
   ARIZA BİÇİMİ DEĞİŞTİ: çökme yok, istisna yok — sayfalar **60 saniyeyi aşıyor**
   ve Next 3 denemeden sonra pes ediyor. Yani asıl olay bir ÇÖKME değil, ASILMA;
   çok işçili koşumlardaki rastgele istisnalar bunun ikincil belirtisiydi.
   `cpus: 1` tek başına ÇÖZMÜYOR — ama teşhisi mümkün kıldı.
2. **`2026-x-158-4-...` sayfası 1. denemede asıldı, 2. denemede GEÇTİ.** Aynı
   sayfa, aynı veri. Verinin suçsuzluğu bir kez daha, bu sefer aynı koşum içinde.
3. **Uygulamanın havuzuna geçici bir prob takıldı** (`sql.unsafe` sarmalandı,
   5 sn'yi aşan sorgular ve 15 sn'yi aşan asılmalar loglanıyor). Derlemenin
   **15. sorgusu** asıldı ve bir daha asla dönmedi — 7+ dakika sonra hâlâ açıktı,
   bu sırada başka sorgular normal tamamlanıyordu. Yani yavaşlık ya da havuz
   tıkanması değil: TEK bir sorgu ölü.
4. **Asılıyken `pg_stat_activity`'ye bağımsız bir bağlantıdan bakıldı.** O sorguyu
   çalıştıran hiçbir backend YOK; ilgili backend `idle` ve `Client/ClientRead`'de
   bekliyor, boşta kalma yaşı asılma yaşıyla birebir örtüşüyor (2m40s / 154s).
   **Postgres cevabı üretmiş.** Kaybolan yer istemci tarafı.
5. **Soket kopması elendi.** postgres-js kapanan bir bağlantıda bekleyen
   sorguları `CONNECTION_CLOSED` ile REDDEDER (`connection.js`, `closed()`).
   Prob hiç red görmedi → soket açık, sadece cevap gelmiyor.
6. **A/B: tek değişken pooler portu.** Aynı kod, aynı `cpus: 1`, aynı prob:

| pooler | sonuç |
| --- | --- |
| transaction 6543 | ~25. sayfada ilk asılma, derleme düşüyor (2 koşum, 2 başarısız) |
| session 5432 | **3.399/3.399, exit 0, 13 dk, 5 sn'yi aşan tek sorgu bile yok** |

**Çözüm: derleme SESSION pooler'a, çalışma zamanı TRANSACTION pooler'a bağlanıyor.**

İkisi zıt şeyler istiyor: Vercel'de çalışma zamanı çok sayıda kısa ömürlü lambda
demek (session pooler'ın 15 istemci tavanı buna yetmez), derleme ise tek makinede
sınırlı sayıda işçi demek (transaction pooler cevap kaybediyor).

`src/lib/db/client.ts` içindeki `poolUrl()` ayrımı `NEXT_PHASE` ile yapıyor —
prerender işçilerinde `phase-production-build` olduğu ölçülerek doğrulandı:

```
NEXT_PHASE="phase-production-build" NODE_ENV=production port=5432
  argv1=...next/dist/compiled/jest-worker/processChild.js
```

`next.config.ts`'teki **`experimental.cpus` KALICI ve zorunlu** — hız için değil,
bağlantı tavanı için: session pooler 15 istemcilik. Ayar olmadığında Next çekirdek
sayısı kadar işçi açıyor (bu makinede 16 çekirdek → **15+ işçi ölçüldü**), her işçi
kendi havuzunu açtığı için 60+ bağlantı isteniyor ve EMAXCONNSESSION geliyor.
`cpus: 3` × `max: 4` = 12 bağlantı. **İkisi tek bir karar; birini tek başına
değiştirmek derlemeyi kırar.** Değeri yükseltmek isteyen önce hesabı yapsın:
işçi × 4 < 15.

### ⚠️ Bu hata çalışma zamanında da vardır — sadece derlemede ölümcül değil

Kaybolan cevap transaction pooler'ın davranışı; derleme onu 60 saniyelik
zaman aşımıyla yakalayıp yeniden denediği için görünür oldu. Çalışma zamanında
(dinamik `/ara`, `/takip`, ISR yenilemesi) aynı şey olursa lambda, Vercel
zaman aşımına kadar asılı kalır — postgres-js'te istemci tarafı sorgu zaman
aşımı YOK ve `client.ts`'te `statement_timeout` de ayarlı değil (kıyas:
`scripts/shared/db.ts` 120 sn koyuyor, ama o da sunucu tarafı — sunucu zaten
cevabı üretmiş olduğu için bu vakayı yakalamaz).

Ölçülen sıklık düşük: bağımsız bir betikle 4.500 sorgu (8 paralel × 3 render,
uygulamanın sorgularının birebir aynısı) transaction pooler'da **0 asılma**
verdi. Yani günlük trafikte nadir. Yine de kayıtlı bir risk:
gerçek kullanıcı yükü altında izlenmeli. Çözüm istenirse yön, postgres-js'in
üstüne istemci tarafı bir zaman aşımı + o bağlantıyı atma sarmalayıcısıdır.

### ⚠️ RLS uygulamanın sorgularında devreye girmiyor

Ölçüldü: uygulama `postgres` rolüne bağlanıyor ve o rolde `rolbypassrls = true`.
Migration 0006'daki politikalar uygulamanın kendi sorguları için hiçbir şey
yapmıyor.

**Şu an açık YOK**, çünkü kod sahipliği kendisi süzüyor — `listAlerts`,
`deleteAlert`, `setAlertActive` hepsinde `and user_id = ${userId}`,
`/api/abonelik-iptal` ise HMAC imzalı jetonla yetkilendiriyor.

Ama spec 6 korumayı RLS'e dayandırıyor; gerçekte **tek savunma hattı sorgu
kodu**. `user_id` filtresini unutan yeni bir sorguyu arkada yakalayacak bir şey
yok. Çözüm istenirse okuma bağlantısını RLS'e tabi ayrı bir role çevirmek gerekir
— tasarım değişikliği, taşımanın parçası olarak yapılmadı.

### Gerçek Supabase'de çıkan hata: auth şeması gölgesi

`scripts/migrate/index.ts` koşulsuz `create table if not exists auth.users`
çalıştırıyor ve yorumu "Supabase'de etkisi yok" diyordu. İlk denemede patladı:
`permission denied for schema auth`. `create ... if not exists`, tablo ZATEN
VARKEN bile şema üzerinde CREATE yetkisi istiyor; Supabase'de `auth` şeması
`supabase_auth_admin`'e ait. Artık `auth.users` var mı diye bakıp yalnızca
gerçekten yokken kuruluyor.


### 6.5 Derleme süresi: 13m36s → 2m49s

Derleme yeşile döndükten sonra ölçüldü, çünkü `cpus: 1` ile 13 dakika sürüyordu ve
bu her Vercel dağıtımında ödenecek bir bedeldi.

**Önce nereye gittiği ölçüldü.** Prerender edilen 3.035 sayfanın **3.016'sı
`/karar`**. OG görselleri build'de üretilmiyor (`.next`'te 0 png), yani satori CPU
maliyeti yok. Her `/karar` sayfası `getRecordBySlug`'ı **iki kez** çağırıyordu
(`generateMetadata` + sayfanın kendisi), her çağrı 5 sorgu → sayfa başına ~10.
Toplam ~30.000 sorgu / 800 sn ≈ **37 sorgu/sn**, 4 bağlantılık havuz üzerinden
**sorgu başına ~107 ms**.

**Sonuç: derleme CPU'ya değil AĞA bağlı.** Veritabanı Frankfurt'ta, her sorgu bir
gidiş-dönüş. Bu, iki kaldıracın da neden işe yaradığını açıklıyor.

| yapılandırma | süre | not |
| --- | --- | --- |
| `cpus: 1`, cache yok | 13m36s | taban |
| `cpus: 1` + `cache()` | 6m59s | sorgular yarıya indi |
| **`cpus: 3` + `cache()`** | **2m49s / 2m47s / 2m50s** | üç ardışık koşum, 3.035 sayfa, 0 hata |

**Kaldıraç 1 — `getRecordBySlug` React `cache()` ile sarıldı.**
`generateMetadata` ile sayfa AYNI render pass'te çalışıyor, yani ikinci çağrı
ilkinin sonucuyla karşılanıyor. Süre neredeyse tam yarıya indi — sorgu sayısının
yarıya inmesiyle birebir tutarlı. **Çalışma zamanına da yarıyor:** her `/karar`
isteği artık yarısı kadar sorgu yapıyor.

`opengraph-image` AYRI bir render'dır ve kapsamın dışında kalır — kalmalı da;
kapsam paylaşsalardı istekler arası sızıntı olurdu.

**Kaldıraç 2 — `cpus: 1` → `cpus: 3`.** İş ağa bağlı olduğu için paralel
gidiş-dönüş sayısı doğrudan süreye yansıyor.

**ELENEN ŞIK: `cpus`'u tamamen serbest bırakmak.** Cazip görünüyordu, ölçüldü,
olmuyor: bu makinede 16 çekirdek var ve Next **15+ işçi** açıyor. `max: 1` yapılsa
bile 16 bağlantı eder, session pooler'ın tavanı 15. Yani işçi sayısı PİNLENMEK
zorunda. `cpus: 3` seçildi çünkü 3 × 4 = 12, tavanın 3 altında, ve sayı bir ÜST
SINIR olduğu için daha az çekirdekli makinelerde (Vercel) kendiliğinden daha
güvenli tarafa düşüyor.

**Daha ileri gitmek isteyen için, ölçülmemiş iki şık:**

- **Vercel build bölgesi.** Veritabanı `eu-central-1`. Vercel'in varsayılanı
  `iad1` (Washington); orada her sorgu Atlantik'i geçer ve buradaki sayılar
  bozulur. `fra1`'e almak bedava. **Vercel'e çıkıldığında İLK ölçülecek şey bu** —
  buradaki 2m49s bu makinenin Frankfurt'a olan gecikmesiyle çıktı.
- **`generateStaticParams`'ı 12 aydan kısaltmak.** Doğrudan çarpan ama spec 11.1
  kararı ve ürün tercihi: prerender edilmeyen sayfa ilk isteğinde yavaş açılır.

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
| `scripts/summarize/guard.ts` | LLM çıktı denetimi; Türkçe sözcük sınırı (§6.2) |
| `scripts/summarize/llm.ts` | İstem + OpenAI istemcisi; gövde metni GÖNDERMİYOR |
| `scripts/summarize/index.ts` | `npm run summarize` — kesilebilir doldurma (§6.2) |
| `scripts/shared/turkish-suffix.ts` | Türkçe ek uyumu, I harfi kararı |
| `scripts/parse-records/parser.ts` | `parseIndexTable` (birincil yol) + metin yedeği |
| `fixtures/real/` | Gerçek arşiv hücreleri + elle doğrulanmış beklenen çıktı |
| `scripts/extract-text/index.ts` | PDF metni + OCR zinciri + taranmış tespiti (§6.1) |
| `scripts/reclassify/` | Ağa çıkmadan yeniden sınıflandırma (§6.3) |
| `scripts/backfill/` | Bir yılın tamamını işler; kesilirse devam eder |
| `src/styles/globals.css` | Renk jetonları, `--header-h` / `--sticky-top` |

### Yapışan sütunlar

Filtre rayı ve ana sayfanın sağ sütunu `--sticky-top` ile konumlanıyor; o da
`--header-h`'den türüyor ve ikisi de `globals.css`'te tanımlı. Başlığın
yüksekliği **sabitlenmiş** (`h-[var(--header-h)]`), çünkü varyanta göre
değişince (arama kutulu 70px, kutusuz 62px) sütunların altındaki boşluk
sayfadan sayfaya kayıyordu.

⚠️ Yapışan öğenin ızgara hücresine `self-start` **verme**. Sezgi tersini
söylüyor ama sticky için hücre GERİLMİŞ olmak zorunda: yapışan öğe yalnızca
kapsayıcısının kutusu içinde hareket edebiliyor ve `self-start` hücreyi öğenin
kendi yüksekliğine indirince kayacak alan kalmıyor. Bu tam olarak yaşandı;
`position: sticky` uygulanıyordu ama hiçbir etkisi yoktu.

Aynı sebeple ızgara hücresinin KENDİSİ yapışan öğe olamıyor (ana sayfadaki
`aside` böyle); yapışkanlık içteki bir sarmalayıcıya konuyor.

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
