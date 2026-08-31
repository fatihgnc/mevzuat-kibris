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
| Veritabanı şeması + RLS | ✅ 8 migration, hepsi geçiyor |
| Arama (FTS, facet, öneri) | ✅ Çalışıyor, spec'ten sapma var (bkz. §3) |
| Konu sınıflandırması | ✅ Gerçek veriyle kalibre; konusuz oran %52 → %17 (§3.7) |
| Özet üretimi | ⚠️ Yalnızca kural katmanı: 5.223 kaydın 565'inde özet (%10,8) — bkz. §6.2 |
| Rehber içerikleri (8 adet) | ✅ Elle yazıldı |
| SEO (sitemap, JSON-LD, robots) | ✅ Build'de 59 sayfa üretiliyor |
| Ingest (2025 + 2026) | ✅ 422 sayı, 6.915 kayıt, 0 hata — gerçek veri |
| PDF metin çıkarma | ✅ 383 sayı; 33 taranmış (OCR kuyruğunda), 6 gözden geçirme |
| OCR | ⚠️ `ocrmypdf`/`tesseract` kurulu değil, 33 sayı gövdesiz — bkz. §6.1 |
| Diğer yıllar (2006–2024) | ⬜ Yapılmadı; kapasite hesabı için §2.2 |
| Gövde sınırları | ✅ Taşma %5,0 → %0,17 (§3.8) |
| Alarm/e-posta | ⚠️ Kod yazıldı, Resend anahtarı yok, gönderim denenmedi |
| Auth (magic link) | ⚠️ Kod yazıldı, gerçek Supabase'e bağlanmadı |

Doğrulama: `tsc` temiz, `eslint` temiz, **83 test** geçiyor,
`next build` 59 sayfa üretiyor, First Load JS 103 kB (spec hedefi <120 kB).

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

Ürün sahibi **OCR** ve **LLM özet katmanını** ayrı bir oturumda yaptırmayı
seçti. İkisinin tam brifingi §6.1 ve §6.2'de: ölçümler, kısıtlar ve tuzaklar
orada, o oturuma başlayan kişi hiçbir şeyi yeniden türetmek zorunda kalmasın.

Kalan işler, öncelik sırasıyla:

1. **OCR** — §6.1. Taranmış sayıların gövdesi yok.
2. **LLM özet katmanı** — §6.2. Kayıtların %89'unda özet yok.
3. **Fixture'ları çoğalt.** `fixtures/real/` altında dört gerçek sayı var
   (dönem başına bir tane, hepsi elle doğrulandı). Spec §7.3 25 istiyor.
   Yeni fixture eklerken beklenen çıktıyı ayrıştırıcıdan üretip ham hücreye
   karşı **gözle doğrula** — üretip doğrulamadan koymak testi kendini
   onaylayan bir aynaya çevirir.
4. **2006–2024 backfill.** Kapasite için önce yakın yıllar (§2.2): 2015–2025
   ≈ 240 MB, ücretsiz katmana rahat sığar. `npm run ingest:backfill <yıl>`.
   Eski yıllara geçerken §3.5'te not düşülen dönemsel önekler (`SİBER(K-I)`,
   `H(K-I)`, `Y(K-I)`, `E-`) `REF_PATTERNS`'e eklenmeli.
5. **Supabase'e bağlan.** Auth akışı (magic link → `/auth/callback` → alarm
   yazımı) hiç uçtan uca denenmedi.
6. **Resend.** `dispatch-alerts` hiç çalışmadı; kota bekçisi ve haftanın gününe
   dağıtım mantığı test edilmedi.
7. **AdSense.** Slot id'leri boş; `NEXT_PUBLIC_ADSENSE_CLIENT` boşken reklam
   basılmıyor, yalnızca ayrılmış kutu görünüyor. Spec §14.5: başvuru Milestone 4
   bitmeden yapılmamalı.

---

### 6.1 OCR — taranmış sayıların gövdesini kurtarmak

**Sorun.** PDF'lerin bir kısmı metin değil, sayfanın taranmış görüntüsü.
`pdftotext` görüntüden harf okuyamıyor, yalnızca varsa metin katmanını alıyor.

**Ölçüm** (422 sayı: 2025 + 2026):

| `text_status` | Sayı | Ortalama kalite |
| --- | --- | --- |
| `extracted` | 383 | 0.98 |
| `failed` (taranmış) | 33 | 0.84 |
| `needs_review` | 6 | 0.34 |

Somut örnek: 2025 sayı 175 → **23,8 MB PDF, çıkan metin 2 KB** (yalnızca kapak
sayfasının metin katmanı). Metin/PDF bayt oranı %0,01; sağlıklı bir metin
PDF'inde %0,27–0,45.

**Kod hazır, araç yok.** `scripts/extract-text/index.ts` zaten şu zinciri
kuruyor:

```
pdftotext → metin çok az mı? → ocrmypdf --language tur --skip-text → pdftotext tekrar
```

`ocrmypdf` ve `tesseract-ocr-tur` bu makinede kurulu değil; `commandExists`
bunu görüp `failed` damgası vuruyor ve yeniden deneme kuyruğuna atıyor
(`issues_retry_idx`). Sessizce boş kaydetmiyor — bu davranış doğru, dokunma.

**Yapılacaklar:**

1. `ocrmypdf` + `tesseract-ocr-tur` kur. GitHub Actions workflow'u zaten
   kuruyor; yerelde elle gerekiyor.
2. **Önce birkaç sayıda dene, toplu çalıştırma.** Kuyruktaki 33 sayıdan 3–5
   tanesiyle başla: OCR sayfa başına saniyeler sürüyor, 40 sayfalık bir gazete
   dakikalar demek.
3. **`estimateQuality` eşiğini kalibre et.** `QUALITY_THRESHOLD = 0.55` ve
   **hiç gerçek OCR çıktısı görülmeden tahminle kondu.** Metin PDF'lerinde
   ölçülen kalite 0.98–0.99, yani eşik oralarda değil. OCR çıktısı görülmeden
   ayarlanamaz.
4. Kurtarılan sayıları `text_status='pending'` yapıp yeniden işle (§6.3).

**Depolama uyarısı — bu hesabı bozabilir.** Taranmış bir sayı şu an 2 KB
veriyor; OCR'lanınca 200 KB+ verir. 33 sayı için sorun değil ama §2.2'deki
~480 MB'lık 20 yıllık tahmin **taranmış oranın düşük kalmasına dayanıyor** ve
eski yıllarda o oran muhtemelen çok daha yüksek. OCR açıldıktan sonra §2.2'yi
yeniden ölç.

**Tuzak.** `estimateQuality` bu hata sınıfını **yakalayamıyor**: taranmış bir
sayıdan çıkan az miktarda metin (kapak sayfası) tertemiz Türkçe olduğu için
kalite 0.99 geliyor. Kalite metnin *doğruluğunu* ölçüyor, *eksikliğini* değil.
Taranmışlığı yakalayan şey `SCANNED_TEXT_RATIO` (§3.6) ve OCR sonrası da o
denetim geçerli kalmalı.

---

### 6.2 LLM özet katmanı — kademeli üretimin eksik orta basamağı

**Sorun.** Ham gazete başlıkları okunmuyor. Gerçek bir örnek:

```
REKABET KURULU KARARI-KARAR SAYISI:319/2025 KONU:ÇELEBİOĞLU ÖZEL GÜVENLİK
LTD. TARAFINDAN SOSYAL SİGORTALAR DAİRESİ MERKEZ MÜDÜRLÜK BİNASINA GÜVENLİK
HİZMETİ ALIMI İHALESİNE YAPILAN İTİRAZ.
```

Spec §3.8 kademeli üretim istiyor:

```
1. Kural tabanlı  → tanınabilir kalıptaki kayıtlar
2. Kalıp yoksa    → LLM (tek seferlik)
3. O da olmazsa   → özet yok, maskelenmiş başlık gösterilir
```

**Birinci ve üçüncü basamak var, ortadaki yok.**

**Ölçüm:** 5.223 kayıttan **565'inde özet var (%10,8)**, hepsi
`summary_source='rule'`, `llm` **0**. Yani kayıtların **%89'unda** kullanıcı
ham başlığı görüyor.

> Kural katmanının neden bu kadar düşük kaldığı öğretici: bu dosya bir ara
> "17 kaydın 15'inde özet üretiyor" (%88) diyordu. O 17 kayıt elle yazılmış
> fixture'lardı, yani özetleyicinin kendi kalıplarına göre yazılmışlardı.
> Gerçek veride oran %10,8'e düştü. Kural setini genişletmek de bir seçenek
> ama kalıp çeşitliliği çok yüksek.

**Şema hazır.** `records.summary` ve
`records.summary_source text check (summary_source in ('rule','llm'))` zaten
var, migration gerekmiyor. Özet **bir kez üretilip kalıcı saklanıyor** (spec
§3.8 madde 4): liste, detay, e-posta, RSS ve `og:title` aynı metni kullanıyor,
sayfaya özel yeniden üretim yasak.

**PAZARLIK KONUSU OLMAYAN KISIT — spec §3.8 madde 1:**

> Özet, başlıktan **kesinlikle çıkarılabilen** şeyi söyler. Kararın sonucunu
> bildirmez.

Yukarıdaki örnekte "itirazı karara bağladı" **doğru**, "itirazı reddetti"
**yanlış** — o bilgi gövdede ve hukuki metinde tahmin yürütmek kabul edilemez.
Modele serbest özet yazdırılamaz; çıktı bu kurala göre kısıtlanmalı ve
denetlenmeli. Diğer maddeler de bağlayıcı: günlük dil (madde 2), aynı belge
tipi hep aynı kalıp (madde 3), orijinal başlık her zaman sayfada (madde 5).

**Yapılacaklar:**

1. `scripts/summarize/` altına LLM basamağı ekle. Giriş: `title`, `section`,
   `refType`, `docType`. **Gövde metnini verme** — özet başlıktan türetilmeli,
   yoksa madde 1 ihlal edilir.
2. Yalnızca `summarize()` (kural) null döndüğünde çağır.
3. Sonucu `summary` + `summary_source='llm'` olarak yaz. `processIssue`
   içindeki `ON CONFLICT` mevcut özeti koruyor
   (`summary = coalesce(records.summary, excluded.summary)`), yani yeniden
   işleme özeti ezmiyor — kasıtlı.
4. **Çıktıyı denetle.** Sonuç bildiren cümleleri yakalayan bir kontrol yaz
   (reddetti / kabul etti / onayladı gibi); tutarsa özeti at ve üçüncü
   basamağa düş.
5. Maliyet tek seferlik: kural tutmayan ~4.650 kayıt × bir kısa çağrı.

**Model seçimi.** Bu depoda LLM çağrısı yapan hiçbir kod yok; sağlayıcı seçimi
ve anahtar yönetimi de bu işin parçası. Anthropic API kullanılacaksa
`claude-api` becerisini yükleyip model kimliklerini ve fiyatlandırmayı oradan
al, hafızadan yazma.

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
