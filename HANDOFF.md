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
| Özet üretimi | 🔄 Kural + LLM; 24.413 kaydın 14.895'inde özet (%61). 2020–2024'ün %51'i bitti, kalan 7.050 grup günlük kota yenilenince — §6.2 sonu |
| Rehber içerikleri (8 adet) | ✅ Elle yazıldı |
| SEO (sitemap, JSON-LD, robots) | ✅ Üretimde doğrulandı; sitemap indeksi §6.9'da düzeltildi |
| Ingest (2020–2026) | ✅ 1.782 sayı, 24.413 kayıt, 0 hata; günlük ingest üretimde koştu (§6.9) |
| PDF metin çıkarma | ✅ 384 çıkarıldı + 32 OCR; 5 gözden geçirme, 1 kaynakta ölü bağlantı |
| OCR | ✅ Çalışıyor. 33 taranmış sayının 32'si kurtarıldı; kalite 0,887–0,999 — bkz. §6.1 |
| 2020–2024 backfill | ✅ 1.359 sayı, 17.476 kayıt, 0 hata; DB 47,5 → 112 MB (§2.2) |
| Diğer yıllar (2006–2019) | ⬜ Yapılmadı; kapasite ve maliyet ölçüldü (§2.2, §6.2 sonu) |
| Gövde sınırları | ✅ Taşma %5,0 → %0,17 (§3.8) |
| Alarm/e-posta | ✅ Resend ile gerçek digest gönderildi ve alındı (§6.7) |
| Supabase | ✅ Veri taşındı; havuz tavanı 40'a çıkarıldı (§6.9) |
| **Vercel / canlı** | ✅ **`https://mevzuatkibris.com` yayında** — §6.9 |
| Auth (magic link) | ✅ Uçtan uca gerçek e-postayla doğrulandı (§6.6) |

Doğrulama: `tsc` temiz, `eslint` temiz, **117 test** geçiyor,
`next build` **3.399 sayfa** üretiyor (Vercel'de ~7,5 dk; havuz `max: 4`'e geri
alındıktan sonra düşmesi bekleniyor, §6.9), First Load JS 103 kB (spec <120 kB).

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

**YENİDEN ÖLÇÜLDÜ (OCR çalışır hâldeyken).** Bu bölümün eski hâli OCR hiç metin
üretmezken yazılmıştı ve iki yerinden yanlıştı; ikisi de aşağıda.

Canlı Supabase, 423 sayı / 6.924 kayıt:

| | |
| --- | --- |
| Veritabanının tamamı | **47,5 MB** (tabloların toplamı 36,7 MB + 10,8 MB sabit ek yük) |
| Kayıt başına toplam | **5.025 bayt** (`records` 4.652 + `record_entities` 215 + `record_topics` 157) |
| Sayı başına (`issues`) | 2.769 bayt |
| Varlık başına (`entities`) | 1.604 bayt |
| Saklanan gövde | kayıt başına 1.049 bayt ham · medyan 1.284 · p90 2.562 · tavana değen 10 kayıt |
| En büyük indeks | `records_search_idx` (GIN) 8,4 MB · `records_title_trgm_idx` 5,1 MB |

Projeksiyonun ikinci yarısı **tahmin değil, kaynaktan sayıldı**: 2006–2024'ün
19 arşiv sayfası çekilip İÇERİK hücreleri gerçek ayrıştırıcıdan geçirildi
(tek bir PDF indirmeden — liste zaten sayfada):

```
4.338 sayı · 66.429 kayıt · sayı başına 15,3 kayıt · 2.872 yeni varlık
```

Eski tahmindeki "~4.400 sayı" tuttu, ama sayı başına kayıt 16,4 değil 15,3.

```
66.429 × 5.025  +  4.338 × 2.769  +  2.872 × 1.604   ≈  334 MB
mevcut 47,5 MB                                        ≈  382 MB toplam
```

**Ücretsiz katmanın 500 MB'ında ~118 MB (%24) boşluk kalıyor.** Eski hesap
480 MB diyordu; fark, 109 KB/sayı ortalamasının sabit ek yükü her sayıya
dağıtmasından geliyordu.

**OCR bu hesabı BOZMUYOR — ölçüldü, eski uyarı yanlıştı.** "OCR'lanan sayı
2 KB yerine 200 KB+ verir" cümlesi çıkarılan METNİ ölçüyordu; saklanan
`body_text` değil. Gerçekte:

| `text_status` | sayı | gövde/sayı | gövde/kayıt |
| --- | --- | --- | --- |
| `extracted` | 385 | 17.558 B | 1.033 B |
| `ocr` | 32 | **14.350 B** | 1.359 B |

OCR'lanan sayı, metin sayısından **daha az** gövde saklıyor. Sebebi: 104.954
karakterlik OCR çıktısının kaydara bölünen kısmı küçük (`extractBody` referans
etiketiyle eşleştiriyor), üstüne kayıt başına 20 KB tavanı var. Kayıt başına
%32 fark bile 66.429 kayıtta 25 MB eder.

**"Eski yıllarda taranmış oran daha yüksek" varsayımı da doğrulanmadı.**
6 yıla ve yıl içinde farklı konumlara yayılmış 20 gerçek PDF indirilip aynı
eşiklerle ölçüldü: **1/20 taranmış** (2019/100). 2025–26'daki oran %7,8'di.
Örneklem küçük — bunu "oran düşük" diye değil "yüksek olduğuna dair kanıt yok"
diye oku.

**Gövde büyüklüğü de ölçüldü, aynı çıktı.** 8 eski sayıda (2006–2024) gerçek
boru hattı (`pdftotext` → `extractBody` → `truncateBytes`) koşturuldu:
217 kayıtta kayıt başına **1.019 bayt** — bugünkü 1.049 baytla aynı. Yani
projeksiyonun en büyük bilinmeyeni kapandı; gövdenin iki katına çıkması
hâlinde bile (+75 MB) tavan aşılmıyor.

Kalan gerçek risk **alarm/kullanıcı tablolarının büyümesi** ve indeksler:
projeksiyonda `records_search_idx` 87 MB'a, `records_title_trgm_idx` 53 MB'a
çıkıyor.

Boşluk açmanın ölçülmüş yolları, ucuzdan pahalıya:

- **Kademeli git.** 2015–2024 (2.317 sayı, 34.434 kayıt) ≈ 173 MB, toplam
  221 MB — yarı yol, bol boşluk. Eski yıllar sonra.
- `records_title_trgm_idx` projeksiyonda 53 MB. Bulanık başlık eşleştirmesi
  için; vazgeçilebilirse doğrudan kazanç.
- `BODY_TEXT_LIMIT_BYTES` (20 KB) düşürmek — ortalama zaten 1 KB, yalnızca
  uzun kuyruğu keser (tavana değen 10 kayıt).
- Supabase Pro (8 GB) — sorunu tamamen bitirir.

### 2.2.1 Backfill NEDEN uzun sürüyor — ölçüldü, sebep nezaket sınırı DEĞİL

Sık sorulan ikinci soru. 2020'nin backfill'i (238 sayı) 1.544 saniye sürdü ve
süre şuraya gitti:

| kalem | süre | pay |
| --- | --- | --- |
| **PDF indirme (1.375 MB)** | ~1.199 sn | **%77,7** |
| `politeFetch` 1 istek/sn tabanı | 238 sn | %15,4 |
| OCR (17 sayı) | 107 sn | %6,9 |

Yani darboğaz hacim: sayı başına ortalama **5,8 MB**, ölçülen aktarım hızı
**~1,9 MB/sn**. 2020–2024 için ~7,9 GB iniyor ve geriye ~90 MB metin kalıyor
(PDF saklanmıyor, §2.2).

**Nezaket sınırını kaldırmak toplamı ancak %15 kısaltır** — yani spec 3.6'daki
kararı bu gerekçeyle tartışmaya değmez. Ölçülmemiş tek gerçek kaldıraç paralel
indirme; ama 1,9 MB/sn kaynak sunucunun kendi tavanıysa hiçbir şey kazandırmaz
ve §2.1'deki duruş gereği denemeden önce ürün sahibine sorulmalı.

### 2.3 İKİNCİ HOST — 2018–2020 PDF'leri başka sunucuda (backfill'i kırardı)

Depolama ölçülürken çıktı ve **backfill'i üç tam yıl boyunca sessizce boşa
çevirirdi.** 2018, 2019, 2020 arşiv sayfaları PDF'lerini `/Portals/6/` yerine
`/Portals/105/` altında gösteriyor ve o yolu ana hosta karşı çözmek istisnasız
404 veriyor:

```
https://basimevi.gov.ct.tr/Portals/105/2018/194.pdf        404  (1,2 kB HTML)
https://basimevi.gov.ct.tr/Portals/6/2018/194.pdf          404  (yol takası değil)
http://arsiv.basimevi.gov.ct.tr/Portals/105/2018/194.pdf   200  22,9 MB PDF
```

Etkilenen: 2018 (194 sayı), 2019 (189), 2020 (238), 2021'in 14 sayısı, 2010'un
1 sayısı — **629 sayı, backfill'in %14,5'i.**

**Neden kendiliğinden fark edilmezdi:** `crawlYear`'ın sağlık kontrolü arşiv
sayfasında sayı bulamazsa patlıyor, ama burada SAYFA sorunsuz ayrışıyor;
yalnızca PDF'ler gelmiyor. Üç yıl da "0 hata" raporlayıp her sayıyı gövdesiz
`failed` olarak yazardı.

Düzeltme `absolutize()` içinde (`scripts/shared/http.ts`), yol tabanlı:

- `/Portals/105/` → `http://arsiv.basimevi.gov.ct.tr`
- geri kalan → ana host

Blanket host takası **değil**, çünkü `/Portals/6/` arşiv hostunda 404. Ve şema
`http` kalmak zorunda: arşiv hostu TLS servis etmiyor, `https://` bağlantısı
hiç kurulmuyor. Testi `scripts/shared/http.test.ts`.

2010/14 iki hostta da 404 — o gerçekten ölü bağlantı, tek sayı.

Arşiv hostunun `robots.txt`'i ana sitenin aynısı (aynı DNN şablonu, `/Portals/`
dahil), yani §2.1'deki duruş olduğu gibi geçerli; yeni bir karar gerekmiyor.

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
- **`profiles.digest_hour` KALDIRILDI (migration 0010).** Spec §10.3 "gönderim
  penceresi kullanıcının `digest_hour` tercihine göre, varsayılan 08:00 TRT"
  diyordu. Sütun o varsayılanla kuruldu ve **bir daha hiç okunmadı**: hiçbir
  sorgu seçmiyordu, hiçbir arayüz yazmıyordu, dispatch tamamen yok sayıyordu.
  Gönderim saatini gerçekte `dispatch-alerts.yml`'deki cron belirliyor — günde
  bir kez 05:00 UTC, yani 08:00 TRT. Yani zaten herkes varsayılan saati alıyordu
  ve sütun gerçekle yalnızca tesadüfen örtüşüyordu.
  **Gerçekten uygulamak** işi saatlik koşturmayı (günde 1 yerine 24 zamanlanmış
  koşum), eşleşme anında TRT→UTC çevirisini ve saati seçtiren bir denetimi
  gerektiriyordu; hiçbiri tek bir gönderimi bile değiştirmiyordu çünkü bütün
  satırlar varsayılandaydı (düşürmeden önce ölçüldü: iki profilin ikisi de 8).
  Okunmayan bir sütun, arkasında bir spec cümlesi dururken, bir sonraki kişiyi
  özelliğin yarısını yazıp diğer yarısını hazır sanmaya davet ediyor.
  **Geri getirmek istenirse:** sütunu aynı varsayılanla ekle, cron'u saatliğe
  çevir, `findMatches`'te saate göre süz.

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

## 3.9 Dönemsel Bakanlar Kurulu önekleri — 2020–2022 boşluğu kapatıldı

§3.5'in "eski yıllara geçerken dikkat" notunun 2020–2024'teki karşılığı, ve
**backfill'den ÖNCE düzeltilmesi gereken tek şey buydu.**

Belirti: EK IV BÖLÜM I'in referans oranı 2024'te %100, 2020–2021'de **%1**.
Ham İÇERİK hücresine bakınca sebep göründü — referans var, biçimi farklı:

```
2020/239 EK IV BÖLÜM I:  "E.S(K-I) 27-2020"      <- kalıplarda yok
2024/269 EK IV BÖLÜM I:  "Ü(K-I) 2439-2024"      <- var
```

Tüm 2020–2024 referans hücreleri sayıldı:

| biçim | hücre | yıllar | eklenen tip |
| --- | --- | --- | --- |
| `E.S(K-I) N-N` | 1.584 | 2020–2021 | `eski` |
| `E.T(K-I) N-N` | 1.210 | 2020 | `etki` |
| `F.S.(K-I) N-N` | 316 | 2021–2022 | `fski` |
| `F.S(K-III) N-N` | 9 | 2022 | `fskiii` |

3.119 kayıt — kapsamın %17,8'i. Üretimde yazılan sonuç: `eski` 1.589,
`etki` 1.214, `fski` 317, `fskiii` 9.

**Neden backfill'den ÖNCE:** slug referansı gömüyor (`recordSlug`) ve yazıldıktan
sonra hiç değişmiyor (spec 8.1, `ON CONFLICT` slug'a dokunmuyor). Sonradan
eklemek bu 3.119 kaydı kalıcı olarak `2020-x-239-12-...` biçiminde bırakırdı.

**⚠️ BU BÖLÜM ÖNCE YANLIŞ BİR SONUÇ YAZIYORDU — "gövde kurtarmıyor, 127 kayıtta
1 etiket bulundu". Ölçüm yanlıştı, kalıp PDF'in yazımını hiç aramıyordu.**

Gerçek: aynı referans iki yerde FARKLI SAYIDA NOKTAYLA yazılıyor.

```
içindekiler hücresi   E.S(K-I) 27-2020
PDF gövdesi           E.S.(K-I)27-2020      <- parantezden önce fazladan nokta
```

`findLabel` noktayı literal aradığı için etiket bulunamıyordu; `extractBody`
çapa yoksa null döner, yani kayıt **gövdesiz** kalıyordu. Ölçüm (aynı iki gerçek
sayı, 127 kayıt):

| | bulunan etiket |
| --- | --- |
| eski `findLabel` | 1 (%1) |
| nokta toleranslı | **111 (%87)** |

**2021'in gövde oranının %9,6'da kalmasının sebebi buydu** — kaynağın biçimi
değil, bizim eşleştirmemiz. 2020 %40'ta çünkü orada `E.T(K-I)` hâkim ve o
PDF'te noktasız yazılıyor, yani tesadüfen eşleşiyordu.

`findLabel` düzeltildi: noktalar isteğe bağlı, ve parantez öncesine de isteğe
bağlı nokta ekleniyor. **Metin normalize EDİLMİYOR** — `extractBody` indeksle
dilimliyor, haystack'in offsetleri korunmak zorunda; tolerans kalıba konuyor.
Mevcut biçimler (`A.E. 1071`, `Ü(K-I) 2497-2025`, `Ş.M. 4412`, bitişik yazım)
regresyon testleriyle korundu: `scripts/parse-records/extract-body.test.ts`.

**Kayıtlardaki gövdeler bu düzeltmeyle KENDİLİĞİNDEN gelmez** — yeniden çıkarma
gerekiyor (§6.3): ilgili sayılar `text_status='pending'` yapılıp backfill
yeniden koşturulmalı, yani PDF'ler yeniden iniyor.

**YAPILDI, üretimde.** Kaynak siteye gereksiz yük binmesin diye kümesi daraltıldı
— tüm 2020–2022 (819 sayı) değil, yalnızca gövdesiz `eski`/`fskiii` kaydı OLAN
sayılar: **149 sayı, 33 dakika, 0 hata** (`--skip-crawl` ile, arşiv sayfaları
yeniden çekilmedi). Sonuç:

| | önce | sonra |
| --- | --- | --- |
| `eski` gövdeli | 9 (%0,6) | **1.378 (%86,7)** |
| `eski` kendi sayfası olan | 299 | **1.422** |
| 2021 gövde oranı | %9,6 | **%50,6** |
| 2021 kendi sayfası oranı | %35,8 | **%69,3** |
| DB | 112 MB | 122 MB |

2021 artık diğer yıllarla aynı bantta. `ON CONFLICT` slug'a dokunmadığı için
URL'ler korundu, özetler korundu (`coalesce(records.summary, ...)`).

**Genel ders:** bir ölçüm "kazanç yok" diyorsa, ölçüm kalıbının kaynağın GERÇEK
yazımını aradığını doğrula. Buradaki yanlış sonuç, kalıbın noktalı biçimi hiç
aramamasından geldi ve bir gün boyunca "kaynağın biçimi böyle" diye kayda geçti.
Yakalanması da analizle değil, arama sonuçlarındaki gövde metnine bakarken
oldu — **gerçek çıktıya bakmak, ölçümü tekrar okumaktan daha çok şey yakalıyor.**

Kalıp sırası önemli: `fskiii` `fski`'den önce ("F.S(K-III)" içinde "F.S(K-I"
geçiyor). Testler `scripts/parse-records/parser.test.ts` içinde, satırlar
kaynağın hücrelerinden birebir alındı. Mevcut 6.924 kayıt yeniden ayrıştırılıp
kontrol edildi: yeni kalıplar hiçbirini değiştirmiyor.

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
2. **Backfill — 2020–2024 YAPILDI, 2006–2019 kaldı.** Ürün sahibi kapsamı
   2020–2024 seçti ve o beş yıl üretime alındı: **1.359 sayı · 17.476 kayıt ·
   0 hata · 47,5 → 112 MB.** Yol boyunca çıkan iki engel (§2.3 ikinci host,
   §3.9 dönemsel referanslar) düzeltildi. Özetlemenin **%51'i bitti**; kalan
   7.050 grup günlük istek kotası yenilenince tek koşumda biter
   (`npm run summarize`) — kota için §6.2 sonuna bak.
   **2006–2019 için ölçüm hazır:** 2.979 sayı · ~49.000 kayıt · ~+270 MB
   (toplam ~382/500 MB) · ~39.000 LLM çağrısı · ~5,80 USD · **~4 gün**
   (günlük 10.000 istek kotası yüzünden). Eski yıllara geçerken §3.5'te not
   düşülen dönemsel önekler (`SİBER(K-I)`, `H(K-I)`, `Y(K-I)`, `E-`)
   `REF_PATTERNS`'e eklenmeli — 2020–2022'nin üç öneki §3.9'da eklendi, aynı
   yöntem.
3. ~~**`next build`'i geçir**~~ — **YAPILDI**, §6.4, ve Vercel'de canlı (§6.9).
4. ~~**Auth akışını dene**~~ — **YAPILDI, uçtan uca çalışıyor** (§6.6). Magic
   link → callback → alarm → onay ekranı, 2,7 sn. Listeleme/silme/oturumlu
   oluşturma da geçti. SMTP olarak Resend kuruldu.
   Akış sırasında çıkan transaction pooler arızası da kapatıldı: çalışma zamanı
   artık session pooler'da (§6.6 karar maddesi).
5. ~~**Resend.**~~ — **YAPILDI**, §6.7. Gönderim, `daily`, kota bekçisi,
   `failed` yolu ve abonelikten çıkma — hepsi denendi. `created_at` tuzağı
   `MAX_AGE_DAYS` guard'ıyla kapatıldı, digest'ler kullanıcı bazında
   birleştirildi ve `MAX_ALERTS_PER_USER` kondu (§6.8).
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

**⚠️ TOKEN ORANI İKİ KEZ DEĞİŞTİ; İKİNCİSİ DOĞRU OLAN. Şu an 2,4.**

Bu paragraf önce şöyle diyordu: `CHARS_PER_TOKEN` 2,2 varsayılmıştı, OpenAI'nin
429 mesajındaki `Requested 590` sayısından **~4,2 karakter/token** "ölçüldü",
sabit 3,5'e çekildi ve hız 157 → 290 grup/dk'ya çıktı.

**O 4,2 ölçüm değildi, çıkarımdı — ve yanlıştı.** Cevap gövdesi gerçek sayıyı
zaten yazıyor (`usage.prompt_tokens`); okumak yerine bir hata mesajından geriye
doğru çözülmüştü. 2006–2024'ün gerçek istemlerinden 12'si gönderilip `usage`
okundu:

```
istem 2.057–2.158 karakter  ->  807–863 jeton   =  2,53 karakter/jeton
çıktı                        ->  ortalama 21 jeton
cached_tokens                ->  hepsinde 0
```

Yani ilk değer (2,2) baştan doğruya yakındı; "düzeltme" onu bozdu. Oranı
`SYSTEM_PROMPT` belirliyor (1.945 karakter ≈ 800 jeton, her çağrıda yeniden
gönderiliyor), başlık uzunluğu neredeyse hiç oynatmıyor.

**Yön önemli: eksik tahmin rezervasyonu küçültür, yani pacer limitin
izin verdiğinden FAZLA çağrı geçirir.** 3,5 ile plan 247 çağrı/dk × gerçek 914
jeton = **226.000 TPM**, tavan 200.000 — tam da bütçenin önlemek için var olduğu
429 fırtınası. 2,4 ile 177 çağrı/dk = 162.000 TPM, sığıyor. Geçen oturumun
koşumu 429 görmedi çünkü eşzamanlılık 4'te gecikme zaten frenliyordu; 53.000
çağrılık bir koşumda o şans kalmaz.

**Önbellek yok, varsayılmadı — bakıldı.** Aynı sistem istemi tekrar tekrar
gönderilmesine rağmen `cached_tokens` hep 0: istem ~824 jeton, OpenAI'nin
otomatik önbelleklemesi 1.024'ten başlıyor. Yani sistem istemini kısaltmak
maliyeti düşürmenin yanı sıra 1.024'ün altında kalmayı da sürdürür — büyütmek
1.024'ü aşarsa girdinin yarı fiyata düşmesi mümkün (denenmedi).

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

### 2006–2024 özet maliyeti — ÖLÇÜLDÜ

Eski tahmin "~67.000 LLM çağrısı" diyordu. Gerçek sayı, kaynaktan sayılan
66.429 kayıt üzerinde gerçek kod (`summarize()` kural katmanı + `loadGroups`
gruplaması + `reuseExistingSummaries`) çalıştırılarak bulundu:

| adım | kayıt/grup | not |
| --- | --- | --- |
| kayıt | 66.429 | 19 arşiv sayfasından sayıldı |
| kural katmanı tuttu | 2.534 (%3,8) | 2025–26'da %11,5'ti — eski başlıklar kalıplara daha az uyuyor |
| tekil grup | 54.800 | tekilleşme %17,5 (2025–26'da %12,8) |
| kural grubu | 1.463 | LLM'e gitmez |
| mevcut özetten kopyalanır | 357 | `reuseExistingSummaries` |
| **gerçek LLM çağrısı** | **52.980** | |

Ölçülen jetonlarla (yukarıdaki 2,53 karakter/jeton, çağrı başına 824 girdi +
21 çıktı) ve gpt-4o-mini'nin listede doğrulanan fiyatıyla (girdi 0,15 USD /
çıktı 0,60 USD, 1M jeton):

```
girdi   43,6 M jeton  ->  6,55 USD
çıktı    1,1 M jeton  ->  0,66 USD
                          ------------
                          7,21 USD
```

**⚠️ SÜREYİ TPM BELİRLEMİYOR — GÜNLÜK İSTEK KOTASI BELİRLİYOR.** Bu satır önce
"TPM tavanı ile 177 çağrı/dk → ~5 saat" diyordu. Yanlıştı, çünkü hesabın ikinci
bir sınırı var ve kod onu hiç bilmiyor. 2020–2024 koşumunda cevap başlıklarından
okundu:

```
x-ratelimit-limit-requests:      10000        <- GÜNDE
x-ratelimit-remaining-requests:   4025
x-ratelimit-reset-requests:      14h20m
x-ratelimit-limit-tokens:       200000
x-ratelimit-remaining-tokens:         0        <- 1 dakikada yenileniyor
```

Yani **hesap Tier 1 ve günde 10.000 istek atabiliyor.** Bir grup = bir istek
olduğuna göre:

| kapsam | grup | gün |
| --- | --- | --- |
| 2020–2024 | 14.083 | 2 |
| 2006–2019 | ~39.000 | **~4** |
| 2006–2024 toplam | 52.980 | **~6** |

Maliyet (7,21 USD) değişmiyor, süre değişiyor. Kota bitince her istek 429
döner ve gruplar 4 denemede kalıcı hataya düşer — ama `summary` null kaldığı ve
hata yolunda `markAttempted` çağrılmadığı için sonraki koşum onları yeniden
alır. Yine de boşa istek yakar: **kota tükenmeden durdur.**

Kalan iki kısıt:

- **TPM'in kendisi zararsız çıktı.** 6.850 grupta 787 adet 429 görüldü, hepsini
  yeniden deneme yuttu, hız 175 grup/dk'da sabit kaldı, 15 kalıcı hata oldu.
- **`Requested` sayısı faturayla aynı şey DEĞİL.** 429 mesajları çağrı başına
  ~580 jeton yazıyor, `usage.prompt_tokens` ise ~824. Biri hız sınırının
  muhasebesi, öbürü faturanın. Bu dosyanın eski hâlindeki 4,2 karakter/jeton
  bu yüzden ortaya çıkmıştı: 590'lık `Requested` sayısından türetilmişti ve
  PACING için kabaca doğru, MALİYET için yanlıştı. `CHARS_PER_TOKEN` pacing
  içindir; 2,4 ölçülen 2,53'ün altında kalarak fazladan rezerve ediyor, bu da
  güvenli yön.

**⚠️ `records` SAYACI EKSİK SAYIYOR — §6.2'nin teşhisi bu yüzden güvenilmez.**
§6.2 "`records` sayısı `llm`'den belirgin düşükse başka bir koşum aynı grupları
dolduruyordur" diyor. 2020–2024 koşumunda tam o tablo görüldü (`llm 5.739`,
`records 5.695`) ve **ikinci koşum yoktu** — süreç listesi tek ağaç gösterdi.
Veritabanı tersini söylüyor: `summary_source='llm'` kayıt sayısı 5.090'dan
12.989'a çıkmış, yani sayacın bildirdiğinden ~1.400 FAZLA satır yazılmış.

Sebebi bulunmadı. §4.9'daki `x += await f()` kalıbı burada doğru kullanılmış
(`const written = await ...` sonra `stats.records += written`), dolayısıyla
başka bir şey. **Bir sonraki koşumdan önce bakılmalı**; o zamana kadar paralel
koşum teşhisi için sayaca değil süreç listesine ve
`select count(*) from records where summary_source='llm'` farkına bak.

Durdurduktan sonra süreç ağacının gerçekten öldüğünü doğrula: bu oturumda
`TaskStop` ağacı öldürmedi, `taskkill /T /F` gerekti.

Not: kural katmanının %11,5'ten %3,8'e düşmesi maliyetin ana kalemi.
Kuralları eski başlık kalıplarına genişletmek doğrudan para kazandırır —
kural katmanı bedava — ama ölçülmedi, önce kalıpların gerçekten tekrar ettiği
gösterilmeli.

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
`cpus: 3` × `max: 3` = 9 bağlantı. **İkisi tek bir karar; birini tek başına
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


### 6.5 Derleme süresi: 13m36s → 2m49s → 4m37s (bağlantı bütçesi için)

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
| `cpus: 3` + `cache()`, havuz `max: 3` | **4m37s** | ŞU ANKİ HÂL — bkz. aşağıdaki not |

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

**Sonradan bilerek yavaşlatıldı: 2m49s → 4m37s.** Derlemenin havuzu `max: 4`'ten
`max: 3`'e indirildi (9 bağlantı). Sebep hız değil, bağlantı bütçesi: §6.4'teki
karar sonrası çalışma zamanı da session pooler'a geçti ve **dağıtım sırasında
derleme ile eski sürümün lambda'ları aynı 15'lik tavanı paylaşıyor.** 12 bağlantı
alan bir derleme geriye 3 lambda bırakıyordu; 9 bırakınca 6 oluyor.

1m48s'lik derleme süresi, dağıtım penceresinde kullanıcıya 500 döndürmemek için
verildi. Trafik arttığında ya da tavan yükseltilirse `max: 4`'e dönmek serbest —
ama önce toplamı yeniden hesapla.

**Daha ileri gitmek isteyen için, ölçülmemiş iki şık:**

- **Vercel build bölgesi.** Veritabanı `eu-central-1`. Vercel'in varsayılanı
  `iad1` (Washington); orada her sorgu Atlantik'i geçer ve buradaki sayılar
  bozulur. `fra1`'e almak bedava. **Vercel'e çıkıldığında İLK ölçülecek şey bu** —
  buradaki süre bu makinenin Frankfurt'a olan gecikmesiyle çıktı.
- **`generateStaticParams`'ı 12 aydan kısaltmak.** Doğrudan çarpan ama spec 11.1
  kararı ve ürün tercihi: prerender edilmeyen sayfa ilk isteğinde yavaş açılır.

### `/kurum`, `/sirket`, `/yer` prerender ETMİYOR — DÜZELTME, ürün sahibi kararı

Sayfa sayısı denetlenirken çıktı: bu üç rotanın `generateStaticParams`'ı var
(`entitySlugs(kind).slice(0, 2000)`) ama **diske tek sayfa yazmıyorlar** —
`.next/server/app/yer` altında yalnızca `[slug]` şablonu var. Sebep: sayfa
`searchParams`'tan `sayfa` parametresini okuyor, bu da Next'i istek anında
render'a zorluyor. Yani `entitySlugs()` build'de çalışıp listeyi üretiyor ve
sonuç çöpe gidiyor.

Maliyeti önemsiz (3 sorgu) ama niyet belli ki prerender etmekmiş.

**KARAR: düzeltilmeyecek.** Ürün sahibi "kurum/şirket/yer path'leri muhtemelen
olmayacak, şimdilik dursun" dedi. Yani bu keşfedilmemiş bir eksik DEĞİL, bilinen
ve bilerek bırakılmış bir durum — rotalar kalkacaksa düzeltmek boşa iş olur.

Fikir değişir de prerender istenirse yol: sayfalamayı `searchParams` yerine rota
segmentine taşımak (`/yer/lefkosa/2`). Bunu yapmadan `generateStaticParams`
eklemenin bir faydası yok.


### 6.6 Auth akışı — UÇTAN UCA ÇALIŞTI, ama bir engel açtı

Gerçek bir adrese (`fathgnc.dev@gmail.com`) magic link gönderilerek, gerçek
Supabase'e karşı, uçtan uca doğrulandı. **Akışın tamamı çalışıyor.**

Son koşumun ölçümü (`/auth/callback` içine geçici zamanlama konarak):

```
exchange bitti     +281ms   error=yok user=var
createAlert bitti  +741ms   id=2
toplam istek       2,7 sn   -> /takip?durum=onay&takip=2&gun=3&siklik=weekly
```

| adım | durum |
| --- | --- |
| `signInWithOtp`, e-posta gönderimi | ✅ |
| `auth.users` satırı | ✅ |
| `on_auth_user_created` → `profiles` | ✅ trigger gerçekten çalışıyor |
| Redirect izin listesi, parametreler | ✅ |
| Türkçe karakter round-trip | ✅ `Münhal ilanları` bozulmadan DB'ye yazıldı |
| PKCE `exchangeCodeForSession` | ✅ 281 ms |
| `createAlert` + `assign_weekday` | ✅ 460 ms, `preferred_weekday = 3` |
| Onay ekranı | ✅ **"Çarşamba"** yazıyor — spec 10.3 kural 2 tutuyor |
| `GET /api/alerts` (listeleme) | ✅ |
| `DELETE /api/alerts?id=` | ✅ |
| `POST` oturum açıkken (magic link'siz dal) | ✅ `verified:true` döndü |
| Kota aşımında hata yolu | ✅ 502 + Türkçe mesaj |

### ⚠️ ASIL BULGU: transaction pooler ÇALIŞMA ZAMANINDA da cevap kaybediyor

§6.4'te "çalışma zamanında da mümkün, ölçülen sıklık düşük" diye not düşülmüştü.
**Ölçüm bunu çürüttü — sıklık düşük değil.**

Dev sunucusu `DATABASE_URL_POOLED` (transaction pooler, 6543) ile koşarken
`createAlert` **iki ayrı koşumda da sonsuza asıldı** (120 sn ve 300 sn, curl'ün
zaman aşımıyla kesildi). Asılıyken bakıldı:

- `pg_locks` boş, `idle in transaction` yok, `pg_blocking_pids` boş → **kilit değil**
- O sorguyu çalıştıran backend yok → **Postgres'e varmamış ya da cevabı kaybolmuş**
- Hiç red (exception) gelmiyor → soket açık, sonsuz bekleme
- Aynı anda `HEAD /` istekleri 2 sn'de dönmeye devam ediyor → havuz komple ölü değil

`.env.local`'de yalnızca portu 5432'ye (session pooler) çevirip aynı akış
tekrarlandı: **createAlert 460 ms, istek 2,7 sn.** Tek değişken pooler'dı.

Ayrıca bağımsız bir yük testi (dev sunucusu kapalıyken, 12 eşzamanlı sorgu,
`max: 4`):

| sorgu şekli | transaction 6543 | session 5432 |
| --- | --- | --- |
| tagged template, parametresiz | **9/12 tamam, 3 sonsuz asılı** (3 turda da aynı) | 12/12, ~450 ms |
| `unsafe(text, params)` — drizzle'ın yolu | 12/12, ~670 ms | 12/12, ~630 ms |

Yani arıza sorgu şekline göre değişiyor ve tam karakterize EDİLMEDİ. Ama
uygulamanın kendi yolu (`unsafe`) yük testinde temiz çıkarken dev sunucusunda
asıldığına göre, "drizzle yolu güvenli" demek YANLIŞ olur.

**KARAR VERİLDİ — çalışma zamanı da SESSION pooler'a alındı.** Ürün sahibi
"nasıl ücretsizse öyle olsun" dedi; seçilen yol hiçbir ücretli ayar gerektirmiyor,
tamamı kodda.

`poolUrl()` yerine `poolConfig()` var (`src/lib/db/client.ts`): hem URL'i hem
havuz boyutu veriyor. Bağlantı bütçesi, session pooler'ın **15 istemci** tavanına
karşı:

| | hesap | bağlantı |
| --- | --- | --- |
| derleme | 3 işçi × `max: 3` | 9 |
| çalışma zamanı | lambda başına `max: 1` | kalan 6 |

**İkisi TOPLANARAK hesaplanmalı, ayrı ayrı değil** — dağıtım sırasında derleme
koşarken eski sürüm hâlâ trafiği karşılıyor. Bunu kaçırırsak dağıtım penceresinde
lambda'lar bağlanamaz ve kullanıcı 500 görür.

Neden lambda'da `max: 1`: Vercel'de bir lambda aynı anda tek istek işliyor, daha
büyük havuz boşta duracaktı. Bedeli açıkça söylenmeli — `getRecordBySlug`'ın
`Promise.all`'daki dört sorgusu sıraya giriyor, yani cache'e düşmeyen bir render
bir yerine yaklaşık dört gidiş-dönüş ödüyor. Takas bilinçli: gecikme nazikçe
bozulur, `EMAXCONNSESSION` bozulmaz.

Ölçüldü (dev sunucusu, `max: 1`):

```
/                      1,00 sn        /konu/munhal      1,79 sn
/ara?q=münhal          2,27 sn        /sayilar          0,52 sn
/karar/<slug>          0,76 sn        /api/alerts       401 (oturumsuz, doğru)
```

Kıyas: aynı sayfa transaction pooler'dayken `/konu/munhal` **335 saniye**
sürüyordu. Derleme de yeniden koşturuldu: 3.035 sayfa, exit 0, `EMAXCONNSESSION`
yok, 4m37s (§6.5).

**Değerlendirilip seçilmeyen iki şık:**

- *Transaction pooler'da kalıp istemci tarafı zaman aşımı sarmalayıcısı yazmak.*
  postgres-js'te hazır seçenek yok, elle yazmak gerekirdi — ve asıl arızayı
  düzeltmiyor, sadece maskeliyor.
- *Session pooler'ın havuz boyutunu yükseltmek.* Panelden yapılabilir
  (`max_connections` 60, tavan 15) ama gerekmedi; bütçe zaten sığdı.

Transaction pooler geri istenirse: `poolConfig()`'te URL'i `DATABASE_URL_POOLED`'a
çevirmek yeter, `prepare: false` bu yüzden duruyor. Ama önce §6.6'daki ölçümü
tekrarla — sorun Supavisor tarafındaydı ve düzeldiğine dair bir kanıt yok.

### Diğer notlar

**SMTP kuruldu.** Supabase Auth → Custom SMTP → Resend (`smtp.resend.com:587`,
kullanıcı `resend`, şifre API anahtarı), gönderen `bildirim@mevzuatkibris.com`.
Rate limit ayrı alandan yükseltildi — custom SMTP açmak onu kendiliğinden
yükseltmiyor.

**Aynı adrese 60 saniyelik yeniden gönderim beklemesi var.** Saatlik kotadan
ayrı; arka arkaya iki istek atılırsa ikincisi `429 over_email_send_rate_limit`
alır. Test ederken araya bekleme koy.

**Mail artık GELEN KUTUSUNA düşüyor.** Sandbox döneminde spam'e düşüyordu;
`mevzuatkibris.com` Resend'de doğrulandıktan (DKIM + SPF) sonra düzeldi.

**ALAN ADI ALINDI: `mevzuatkibris.com`.** Cloudflare Registrar'dan, DNS de
orada. Koddaki varsayılanlar zaten bu adı taşıdığı için (`SITE_URL` ve
`CONTACT_EMAIL`, `src/lib/seo/config.ts`) kodda değişiklik gerekmedi.

Geriye env değerleri kaldı — **Vercel'e çıkarken yapılacaklar:**

- `NEXT_PUBLIC_SITE_URL` → `https://mevzuatkibris.com` (yerelde dev portu)
- GitHub Actions → **Variables**: `RESEND_FROM`, `SITE_URL`
- Supabase → Auth → URL Configuration → Site URL + redirect izin listesi
- Cloudflare → **Email Routing** (ücretsiz) → `iletisim@` ve `bildirim@`'i gerçek
  bir kutuya yönlendir. **Bu opsiyonel değil:** `iletisim@mevzuatkibris.com`
  `/iletisim` ve `/gizlilik` sayfalarında yayımlanıyor ve site "kaldırma
  talepleri **yedi gün içinde** yanıtlanır" diyor; ayrıca arşivi tarayan botun
  User-Agent'ında da bu adres var. Yönlendirme kurulmazsa hepsi geri döner.
- DMARC eklendi: `_dmarc` TXT = `v=DMARC1; p=none;`, yetkili sunucudan
  doğrulandı ve **tek kayıt**. `_dmarc`'ta birden fazla TXT olursa RFC 7489
  gereği DMARC tamamen geçersiz sayılır — mükerrer kayıt hiç olmamasından kötü.
  Birkaç hafta sonra `p=quarantine`'e sıkılaştırılabilir.
- **Resend'de "Enable Receiving" KAPALI kalmalı.** Açılırsa Resend kök alan
  adına kendi MX kayıtlarını yazmak ister ve posta ALMAYI kuran Cloudflare Email
  Routing'in MX'leriyle çakışır. İş bölümü: gönderme Resend (`send.` alt alanı),
  alma Cloudflare (kök MX).

**PKCE akışı TEK TARAYICIYA bağlı — kısıt duruyor, ekran DÜZELTİLDİ.**
`code_challenge_method: s256` ölçüldü. `code_verifier` çerezini
`POST /api/alerts` yanıtı yazıyor, `exchangeCodeForSession` onu geri istiyor.
Formu bilgisayarda doldurup e-postayı telefonda açan kullanıcı `durum=hata`
alıyor — ki insanların e-posta okuma biçimi tam olarak budur.

Kısıtın kendisi kaldırılmadı (implicit/`token_hash` akışına geçmek gerekirdi,
ayrı bir iş). Ama kullanıcı artık körlemesine kalmıyor: `/takip`'teki hata
kutusuna en olası sebebi ve ne yapması gerektiğini söyleyen iki cümle eklendi
(`src/app/takip/page.tsx`). Öncesinde ekran yalnızca "bağlantı geçersiz"
diyordu; kullanıcı aynı bölünmüş biçimde tekrar deniyor ve yine başarısız
oluyordu.

**`docTypes` magic link yolunda sessizce düşüyor.** `createSchema` kabul ediyor,
oturumlu dal `createAlert`'e geçiriyor, ama `emailRedirectTo`'nun query string'ine
konmuyor ve callback okumuyor. Şu an latent: hiçbir sayfa `docTypes` göndermiyor.
Belge türü filtreli bir takip kartı eklenirse sessizce kaybolur.

**Test yöntemi tuzakları — üçüne de düşüldü:**

1. **Çerez kavanozu şart.** `curl -c jar.txt -b jar.txt`. `code_verifier` çerezi
   atılırsa `exchangeCodeForSession` başarısız olur ve uygulamada hata yokken
   `durum=hata` gelir. Link'i formu gönderen İSTEMCİ takip etmeli.
2. **Komut satırına Türkçe yazma.** Git Bash altında argümanlar `curl.exe`'ye
   geçerken Win32 ANSI kod sayfasına (CP1254) çevriliyor: `ü` → `0xFC`. Node
   bunları UTF-8 sanınca U+FFFD çıkıyor ve olmayan bir kodlama hatası varmış gibi
   görünüyor. Gövdeyi UTF-8 dosyaya yaz, `--data-binary @dosya` ile gönder.
   `echo ... | xxd` bunu GÖSTERMEZ — `echo` builtin, argüman Win32 sınırını
   geçmez.
3. **Preview aracı dev sunucusunu 2 saniyede bir yokluyor** (`HEAD /`) ve bu
   sekmeyi kapatınca DURMUYOR, sunucu çalıştığı sürece sürüyor. Havuzu meşgul
   ediyor (§6.4).

### 6.7 Resend / alarm gönderimi — ÇALIŞTI, bir tuzak açığa çıktı

Gerçek bir digest üretilip gerçek adrese gönderildi ve alındı.

```
gönderim kuyruğu {"daily":0,"weekly":1,"queue":1}
batch gönderildi {"size":1}
alarm gönderimi bitti {"sent":1}
```

`alert_deliveries`: `status='sent'`, Resend `provider_id` döndü, `last_sent_at`
güncellendi — yani aynı kayıtlar ertesi koşumda tekrar gönderilmiyor.

**Kurulum.** Aynı Resend anahtarı İKİ ayrı yerde kullanılıyor, karıştırması kolay:

| kullanım | nereye |
| --- | --- |
| magic link (auth) | Supabase Auth → Custom SMTP (`smtp.resend.com:587`, kullanıcı `resend`, şifre anahtar) |
| alarm digest'i | `RESEND_API_KEY` env — `.env.local` ve GitHub Actions **Secrets** |

`RESEND_FROM` GitHub'da **Variables** sekmesine gidiyor, Secrets'a değil
(workflow `vars.RESEND_FROM` diyor). **Vercel'e hiçbiri gerekmiyor** —
`dispatch-alerts` GitHub Actions'ta koşuyor, çalışma zamanı Resend'e hiç
dokunmuyor.

### ALAN ADI ALINDI — sandbox kısıtı kalktı, akış yabancı kullanıcı için çalışıyor

`mevzuatkibris.com` Cloudflare'dan alındı ve Resend'de doğrulandı (DKIM TXT +
SPF TXT + bounce MX; bağımsız `nslookup` ile de teyit edildi, nameserver'lar
Cloudflare'da). Gönderen artık `Mevzuat Kıbrıs <bildirim@mevzuatkibris.com>`,
hem alarm digest'lerinde (`RESEND_FROM`) hem Supabase Auth'un SMTP ayarında.

**Kısıtın kalktığı ölçüldü.** Sandbox döneminde hesap sahibinden başkasına
gönderim denemesi `502` veriyordu (`over_email_send_rate_limit` değil, Resend
alıcıyı reddediyordu). Aynı istek doğrulamadan sonra `200` döndü.

Sonra uçtan uca, **yepyeni bir kullanıcıyla** koşuldu
(`fathgnc.dev+yeniuser@gmail.com` — Supabase açısından tamamen yeni bir kimlik):

```
POST /api/alerts            -> 200
magic link                  -> GELEN KUTUSUNA düştü (spam'e değil)
/auth/callback              -> /takip?durum=onay&takip=7&gun=5&siklik=weekly
```

Doğrulananlar: yeni `auth.users` satırı, trigger'ın kurduğu `profiles` satırı,
alarm, ve Türkçe etiketin bozulmadan yazılması (`İhale ilanları`, baş harfi
Türkçe İ). **`assign_weekday` gerçekten dağıtıyor:** iki kullanıcı 3 ve 5.
günlere düştü — spec 10.3 kural 2'nin amacı buydu.

**TUZAK — `NEXT_PUBLIC_SITE_URL` ile dev sunucusunun portu ayrı düşerse magic
link ölü porta gider.** Dev sunucusu 3061'deyken `.env.local` hâlâ 3000
diyordu; Supabase `redirect_to`'yu oradan aldığı için bağlantı hiçbir şeyin
dinlemediği porta çıkıyordu. Elle düzeltilip takip edildi, sonra `.env.local`
3061'e alındı. Portu değiştiren bu değişkeni de değiştirsin.

### ✅ ÇÖZÜLDÜ: `created_at` toplu göçte tüm arşivi "yeni" gösteriyordu

`findMatches` eşleşmeyi şuna bağlıyordu:

```sql
r.created_at > coalesce(a.last_sent_at, now() - interval '7 days')
```

`created_at` yayın tarihi DEĞİL, satırın veritabanına yazılma anı. Supabase'e
taşıma 6.915 kaydın tamamını tek seferde insert ettiği için **bütün arşiv "son 7
günde eklendi" görünüyordu.** Test alarmı 613 kayıt eşleştirdi.

**Çözüm: kürsör `created_at` olarak KALDI, üstüne yayın yaşı guard'ı eklendi.**

```sql
and r.published_at > current_date - ${MAX_AGE_DAYS}::int   -- MAX_AGE_DAYS = 30
```

Ölçüldü, gerçek arşivde:

| ölçüt | eşleşen münhal kaydı |
| --- | --- |
| guard yokken | 613 |
| **guard varken** | **23** |
| guard'ın elediği | 590 |

Sonra gerçek betikle uçtan uca doğrulandı: `alert_deliveries`'te iki kayıt yan
yana duruyor — `id 1` 613 kayıtla (guard öncesi), `id 2` 23 kayıtla (sonrası).

**Neden `created_at` tamamen `published_at` ile değiştirilmedi.** Kürsörün işi
"bunu sana zaten söyledim mi" sorusunu cevaplamak. Yalnızca `published_at`'e
bakılsaydı, 1'inde yayımlanıp 5'inde işlenen bir kayıt (3'ünde digest gitmişse)
kimseye HİÇ bildirilmezdi — kaynak site geç yayımladığında gerçekten oluyor.
İki ölçüt birlikte: kürsör "yeni işlendi" der, guard "gerçekten yeni haber" der.

**Bedeli açıkça:** yayımından 30 günden fazla sonra işlenen bir kayıt HİÇ KİMSEYE
bildirilmez. Bilinçli — o noktada haber değil. 30 gün haftalık ritmin ~4 katı,
sıradan geç yayımlama kapsam içinde kalıyor.

**Asıl kazanç, backfill'in artık kendiliğinden güvenli olması.** 2006–2024
backfill'i eklenen kayıtların `published_at`'i yıllar öncesi olduğu için hiçbiri
eşleşmez. Elle "önce `last_sent_at`'i ileri al" adımı gerekmiyor — unutulacak bir
şey kalmadı.

### TUZAK — `::int` cast'i zorunlu, ve bunu ancak ÇALIŞTIRARAK görürsün

İlk yazılışta cast yoktu. `tsc` temiz geçti, `eslint` temiz geçti, sorgu
çalıştırılınca patladı:

```
operator does not exist: date > integer
```

Parametre tipsiz gidince Postgres `current_date - $1`'i `date - date` diye
çözüyor (o da integer veriyor) ve karşılaştırma ölüyor. **Bu sorgunun testi yok
ve derleme zamanında yakalanmıyor** — gece çalışan `dispatch-alerts` job'ında
patlardı. Bu dosyada SQL değiştiren herkes sorguyu gerçekten koştursun.

**Test için değiştirilenler geri alındı:****Test için değiştirilenler geri alındı:** alarmın `preferred_weekday`'i
`assign_weekday`'in verdiği gerçek değere (3) döndürüldü. Test sırasında UTC
gününe hizalanmıştı — haftalık alarmlar yalnızca `preferred_weekday` UTC gününe
eşitken kuyruğa giriyor, bu yüzden elle denerken hizalamak gerekiyor.

### Kota bekçisi ve `daily` yolu — İKİSİ DE DENENDİ

**`daily` yolu.** Alarm `frequency='daily'` yapılıp koşuldu:
`{"daily":1,"weekly":0,"queue":1}` → gönderildi. Haftalık dalın
`preferred_weekday` süzgeci bu yolda uygulanmıyor, doğrusu da bu.

**Kota bekçisi — 90 e-posta göndermeden denendi.** `sentToday()` yalnızca
`alert_deliveries`'te `status='sent'` ve `sent_at::date = current_date` olan
satırları sayıyor, yani sayaç sentetik satırla doyurulabiliyor. 88 sahte satır
eklendi (`provider_id = 'SENTETIK-TEST-*'`), sayaç 90 oldu,
`budget = 100 - 10 - 90 = 0`.

Sonuç, spec 10.3 kural 4'ün dediği gibi:

```
WARN  günlük kota doldu, gönderim ertelendi {"alertId":3}
INFO  alarm gönderimi bitti {"sent":0}
```

- `alert_deliveries`'e `status='deferred'` kaydı yazıldı ve **23 kayıt id'sini
  sakladı** — sessizce düşürülmedi.
- `last_sent_at` **null bırakıldı**, yani aynı kayıtlar yarınki koşumda tekrar
  eşleşecek.
- Sıfır e-posta gitti.

`budget` döngü içinde her gönderimde bir azalıyor (`budget -= 1`), yani bekçi
yalnızca koşum başındaki sayıya bakmıyor.

**Temizlendi:** 88 sentetik satır ve `deferred` kaydı silindi, alarm
`weekly` + `preferred_weekday = 3` hâline döndürüldü. Veritabanında yalnızca 3
gerçek gönderim kaydı kaldı (613, 23, 23).

### Abonelikten çıkma — DENENDİ, üç yol da doğru; ama bir SÖZ TUTULMUYOR

Gerçek jetonla, çalışan sunucuya karşı denendi:

| deneme | sonuç |
| --- | --- |
| yanlış jeton, POST | `400 {"ok":false}` — alarm silinmedi |
| doğru jeton, POST (RFC 8058 tek tık) | `200 {"ok":true}` — alarm silindi |
| doğru jeton, GET (maildeki bağlantı) | `307` → `/takip?durum=iptal` |

Silme zinciri de doğru: son alarm gidince `profiles` satırı siliniyor,
`alert_deliveries` de alarma bağlı FK ile birlikte gidiyor.

### ⚠️ Ama `auth.users` KALIYOR — gizlilik sayfası yanlış söylüyor

Ölçüldü. İptalden sonra:

```
alerts             0
profiles           0
alert_deliveries   0
auth.users         1   <- e-posta adresi HÂLÂ BURADA
auth.sessions      4   <- kullanıcı hâlâ giriş yapmış durumda
```

Gizlilik sayfası (`src/app/gizlilik/page.tsx`) şunu diyor:

> "Çıktığınızda adresiniz kaydımızdan silinir."

`/takip` iptal ekranı da "adresinizi kaydımızdan sildik" diyor. **İkisi de doğru
değil.** Adres `auth.users`'da duruyor ve oturumlar açık kalıyor; kullanıcı
teknik olarak hâlâ giriş yapmış sayılıyor.

Sebep yapısal: `profiles` bizim tablomuz, `auth.users` Supabase Auth'un. Handler
yalnızca kendi tablosunu siliyor. `auth.users` satırını silmek Admin API
(`supabase.auth.admin.deleteUser`) gerektiriyor, o da **çalışma zamanında
`SUPABASE_SERVICE_ROLE_KEY`** demek — şu an uygulama o anahtarı çalışma zamanında
hiç kullanmıyor ve servis rolü RLS'i baypas ediyor.

**KARAR: söz düzeltildi, silme genişletilmedi.** Ürün sahibinin tercihi. Servis
rolü anahtarını çalışma zamanına taşımak (Admin API şıkkı) RLS'i baypas eden bir
anahtarı lambda'lara sokmak demekti; bunun yerine metin gerçeğe uyduruldu.

Değişen iki yer — **birlikte değişmeliler, biri diğerini yalanlamasın:**

- `src/app/gizlilik/page.tsx` — "Çıktığınızda adresiniz kaydımızdan silinir"
  cümlesi kaldırıldı. Yerine ne silindiği ("takipleriniz ve onlara bağlı e-posta
  kaydınız"), neyin kaldığı ("giriş kaydınız kimlik doğrulama sağlayıcımızda")
  ve çaresi (iletişim adresine yazmak) yazıldı.
- `src/app/takip/page.tsx` — `durum=iptal` kutusu aynı şekilde düzeltildi.

İkisinin de yanına, kodun gerçekte ne yaptığını ve silme tamamlanırsa metnin de
aynı commit'te geri alınması gerektiğini söyleyen yorum konuldu.

**Silme tamamlanmak istenirse yol açık:** iptal handler'ında son alarm gidince
`supabase.auth.admin.deleteUser(userId)` çağırmak. Bedeli çalışma zamanında
`SUPABASE_SERVICE_ROLE_KEY`.

**Test verisi kalmadı.** Deneme sırasında iki alarm da silindi; veritabanında
alarm, profil ve teslimat kaydı yok. Yeni test için `/takip`'ten yeniden takip
kurmak gerekiyor.

### `failed` yolu — DENENDİ, ve bir raporlama hatası ortaya çıkardı

Sahte bir `RESEND_API_KEY` ile koşuldu (böylece e-posta gitmiyor):

```
ERROR batch gönderilemedi {"message":"Error: API key is invalid"}
```

Veritabanı tarafı doğru: `status='failed'` kaydı **23 kayıt id'sini saklayarak**
yazıldı, `provider_id` null, ve **`last_sent_at` GÜNCELLENMEDİ**. Hemen ardından
gerçek anahtarla tekrar koşuldu: aynı kayıtlar tekrar eşleşti ve gönderildi.
Yani başarısızlık kurtarılabilir, hiçbir şey kaybolmuyor — `alert_deliveries`'te
ikisi yan yana duruyor (`failed` sonra `sent`, ikisi de 23 kayıt).

**DÜZELTİLEN HATA — kapanış satırı başarısızlığı başarı gibi gösteriyordu.**
Son satır `sent: payloads.length` yazıyordu, yani ÜRETİLEN digest sayısını;
gönderilen değil. Her gönderim başarısız olduğu koşumda bile
`alarm gönderimi bitti {"sent":1}` diyordu.

Bunun önemi şurada: bu iş gecelik GitHub Actions'ta koşuyor, hatasını kendi
yakalıyor ve **0 ile çıkıyor** — yani iş yeşil kalıyor ve insanın okuduğu tek
özet o satır. Tam bir gönderim kesintisi başarılı koşum gibi görünüyordu.

Artık üç sayaç ayrı ayrı sayılıyor ve ölçüldü:

```
sahte anahtar  -> alarm gönderimi bitti {"sent":0,"failed":1,"deferred":0}
gerçek anahtar -> alarm gönderimi bitti {"sent":1,"failed":0,"deferred":0}
```

**AÇIK KALAN, kasıtlı:** iş hâlâ 0 ile çıkıyor, yani gönderim tamamen çökse de
Actions yeşil kalır. Bunu kırmızıya çevirmek bir POLİTİKA kararı ve §6.2'de
`OPENAI_API_KEY` için bilinçli olarak tersi seçilmişti (kurulmamış bir anahtar
yüzünden asıl işi kırmızıya boyamamak). Alarm gönderiminde ise sessiz kesinti
kullanıcıya doğrudan zarar veriyor. Ürün sahibi karar versin; şu an en azından
log satırı doğruyu söylüyor.

**Ayrıca dikkat:** `ALERT_UNSUBSCRIBE_SECRET` hiçbir yerde tanımlı değil, hem
jetonu üreten (`scripts/dispatch-alerts/template.ts`) hem doğrulayan
(`src/app/api/abonelik-iptal/route.ts`) taraf `REVALIDATE_SECRET`'e düşüyor. Şu
an tutarlı olduğu için çalışıyor; biri iki taraftan YALNIZCA BİRİNDE
`ALERT_UNSUBSCRIBE_SECRET`'i tanımlarsa bütün çıkış bağlantıları sessizce bozulur
ve kullanıcı yalnızca "bağlantı geçersiz" görür.


### 6.8 Digest birleştirme ve kötüye kullanım sınırı

**Bir kullanıcıya bir e-posta, takip başına bir tane değil.** `assign_weekday`
kullanıcıyı hashlediği için bir kullanıcının bütün haftalık takipleri zaten aynı
gün gidiyordu; üç takibi olan kişi aynı sabah **üç ayrı mail** alıyordu.

Gruplama **(kullanıcı + sıklık)** bazında. Günlük ve haftalık bilerek ayrı: tek
bir günlük takip haftalıkları her gün sürüklerdi ve kullanıcının seçtiği ritim
bozulurdu.

Ölçüldü — aynı kullanıcıya üç günlük takip:

```
gonderim kuyrugu {"daily":3,"weekly":0,"takip":3,"eposta":1}
```

Defter tutma takip bazında kaldı: üç `alert_deliveries` satırı **aynı
`provider_id`** ile yazıldı, üçünün de `last_sent_at`'i güncellendi. Yani sitede
takipler ayrı görünmeye devam ediyor, yalnızca posta tek.

**Beklenmedik kazanç: kapasite.** Kota E-POSTA başına sayılıyor. Birleştirmeden
önce tavan takip başınaydı (~270 takip); sonra kullanıcı başına oldu. Kaç takip
kurulursa kurulsun kullanıcı kotadan bir düşürüyor.

**15 kayıt bütçesi artık e-postanın**, round-robin dolduruluyor — 600 eşleşmesi
olan bir takip diğerlerini tamamen dışarı itemesin diye. Aynı kayıt iki takibe
birden uyuyorsa **slug'a göre tekilleştiriliyor**; iki kez basmak okuyana hata
gibi görünürdü.

### Abonelikten çıkma iki jetonlu oldu

RFC 8058 başlığa tek URL veriyor ve tıklandığında soru sormadan iş yapmasını
şart koşuyor. Üç takip taşıyan bir mailde tek tıkın tek dürüst anlamı "bu akışı
durdur" — hepsi. Seçmek isteyen gövdedeki takip başına bağlantılardan seçiyor.

| jeton | konu | nerede |
| --- | --- | --- |
| `alert:<id>` | tek takip | gövdedeki "durdur" bağlantıları |
| `user:<uuid>` | hepsi | `List-Unsubscribe` başlığı |

**Önek imzanın parçası, kasıtlı.** Aksi hâlde bir alarm id'si kullanıcıyı iptal
edebilirdi. Ölçüldü: yanlış jeton 400, **alarm jetonunu kullanıcı yerine
kullanmak 400**, doğru jeton 200 ve kullanıcının üç takibi de silindi (diğer
kullanıcıya dokunulmadı, boşta kalan profil de temizlendi).

### `MAX_ALERTS_PER_USER = 20`

Ürün sahibinin sorusu buydu: bir kullanıcı 5-10 takip açarsa ne olur.

**Cevabın çoğunu birleştirme veriyor** — asıl kıt kaynak e-posta ve artık 20
takip de 1 e-posta. Sınır bu yüzden bir kota savunması DEĞİL, öyle ayarlanmamalı.
Savunduğu şey geri kalanı: satırlar, eşleştirme sorgusunun büyüklüğü ve kimsenin
okumayacağı uzunlukta bir digest.

20 gerçek kullanımın çok üstünde. Her takip zaten saldırgana **çalışan bir
e-posta adresi ve tıklanmış bir magic link** maliyeti yüklüyor; bu sınır o
kapının örtmediği tek durum için: tek doğrulanmış hesabın binlerce takip
açması.

Sınıra çarpınca kullanıcı ne görüyor: oturum açıkken `409` ve kaç takip
tutabileceğini söyleyen mesaj; magic link yolunda `/takip?durum=limit` ve ayrı
bir kutu. **`durum=hata`'dan ayrıldı** — ikisi aynı olsaydı "bağlantı geçersiz"
derdi, ki doğru değil, ve kullanıcıyı aynı sonuçla biten magic link turuna
tekrar sokardı.


### 6.9 Vercel'e çıkış — ve bağlantı bütçesinin gerçekle çarpışması

Site canlı: `https://mevzuatkibris.com`. Build 3.399 sayfa, `EMAXCONNSESSION` yok,
sitemap zinciri çalışıyor, auth ve e-posta üretimde uçtan uca doğrulandı.

Ölçülen build: 1m38s'te üretim başladı, 6m38s'te 2.999 sayfa ≈ **10 sayfa/sn**
(yerelde 14). Yani Vercel ~1,6× yavaş — Atlantik ötesi bir build için beklenenden
iyi. **Build bölgesi Hobby planında değiştirilemiyor**; "Functions → Region" ayarı
çalışma zamanını düzeltir, build'i değil. (Bu dosyanın eski hâli `fra1` yapmayı
söylüyordu, o eksik bir tavsiyeydi.)

### ⚠️ ASIL DERS: çalışma zamanı bağlantı bütçesi ARİTMETİKLE KURULAMAZ

`poolConfig` "derleme 9 + çalışma zamanı 6 = 15" diye kurulmuştu. **Bu bütçe,
siteyi kimse kullanmadığı sürece tuttu.** Canlıya çıkıp gerçek istek gelmeye
başlayınca session pooler doydu ve **arama üretimde 500 vermeye başladı**:

```
/                     200   (statik sayfalar etkilenmedi)
/ara?q=ihale          500   ← EMAXCONNSESSION
/api/status           500
/sayilar/2026         200   ← doygunluk, tam tükenme değil
```

60 saniye sessizlikten sonra da düzelmedi, yani geçici yük değildi.

**Sebep — bunu bir daha unutmayalım:** derlemenin işçi sayısı bizim elimizde,
dolayısıyla kullanımı hesaplanabilir. **Lambda sayısı bizim elimizde değil** —
Vercel trafiğe göre ölçekliyor. Üstelik lambda çağrılar arasında **donduruluyor**,
o yüzden `idle_timeout` hiç tetiklenmiyor ve tuttuğu istemci slotu, örnek geri
dönüştürülene kadar serbest kalmıyor. "6 lambda" varsayımının dayanağı yoktu.

Bu, transaction pooler'ın serverless için önerilmesinin sebebidir. §6.6'da onu
"cevap kaybediyor" diye elemiştik — ölçüme dayalı doğru bir karardı — ama yerine
konan çözümün bu maliyeti vardı ve **yalnızca gerçek trafikte görünüyordu.**

**ÇÖZÜM: pooler'ın havuzu panelden büyütüldü, 15 → 40.**
Supabase → Database → Connection Pooling → Pool Size. Ücretsiz planda
düzenlenebiliyor. Güvenli olduğu ölçüldü: Postgres `max_connections` **60** ve o
sırada **30** kullanımdaydı. Değişiklikten hemen sonra arama 200'e döndü.

Tavan yükseldiği için derleme havuzu da `max: 3` → `max: 4`'e geri alındı
(3 × 4 = 12). Derlemeyi 4m37s'den ~2m49s'ye indirmesi bekleniyor.

**⚠️ HÂLÂ ÖLÇÜLMEDİ — ve bu oturumda da ölçülemedi.** Vercel'in derleme süresi
yalnızca panelde ya da CLI'de görünüyor; bu makinede `vercel` CLI'nin token'ı
geçersiz (`vercel whoami` → "The specified token is not valid") ve panele
tarayıcıdan girmek için oturum yok. Süreyi okumanın iki yolu:

```bash
npx vercel login && npx vercel ls mevzuat-kibris
```

ya da panelden: Deployments → `max: 4` sonrası ilk dağıtım (commit `3c52aea`
ya da onun ardındaki `35915e4`) → Building adımının süresi.

Beklenen ~2m49s'nin yerel ölçümden geldiğini unutma; Vercel'de üretim
yereldekinin ~1,6 katı sürüyordu (bu bölümün başındaki 10 sayfa/sn ölçümü),
yani oradaki karşılığı ~4-5 dakika olabilir. Rakam okununca bu paragrafı
gerçek değerle değiştir.

**Bir daha `EMAXCONNSESSION` görülürse:** önce Pool Size'a bak, koda dokunma. Ama
`max_connections`'ı da kontrol et — pooler onu aşamaz.

### Üretimde bulunan hata: robots.txt 404'e işaret ediyordu

Sağlık kontrolünde çıktı ve **yalnızca üretimde çıkabilirdi**:

```
robots.txt   →  Sitemap: /sitemap.xml
/sitemap.xml →  404
/sitemap/0..10.xml  →  hepsi 200
```

Google hiçbir sitemap bulamıyordu; 3.000+ URL kimseye duyurulmuyordu.
`app/sitemap.ts`'teki yorum "Next kökü indeks yapar" diyordu — **yapmıyor.**
Hiçbir sayfa `/sitemap.xml`'e link vermediği için yerelde hiç istenmemişti; o
yolu yalnızca tarayıcılar ister.

İndeks `/sitemap.xml`'e de konulamıyor: orası metadata kuralınca `app/sitemap.ts`'e
ayrılmış ve oraya route handler koyunca **derleniyor ama istekte 500 dönüyor**
(ölçüldü). `/sitemap-index.xml`'den servis ediliyor, robots.txt oraya bakıyor.
Parça sayısı `SITEMAP_CHUNK_COUNT` ile tek yerden geliyor.

**Ders:** yalnızca makinelerin istediği yollar (robots, sitemap, RSS, OG) yerel
gezinmede hiç denenmez. Dağıtımdan sonra tek tek `curl`'lenmeli.

### Günlük ingest üretimde koştu — halka kapandı

`workflow_dispatch` ile elle tetiklendi, **0 hata, 2m35s**:

```
/ARŞİV/2026 boş döndü -> ana sayfaya düşüldü        (§3.5'teki yürüyen-yıl düzeltmesi)
ana sayfada 161 sayı, 1 YENİ eklendi
sayı 161: metin çıkarıldı, kalite 0,974, 9 sayfa, OCR gerekmedi
9 yeni kayıt
özetleme: 8 grup -> 5 LLM, 3 model reddi
revalidation: 10 hedef -> https://mevzuatkibris.com
```

Sonra canlı sitede doğrulandı: yeni kaydın sayfası 200, `/sayilar/2026/161` 200,
ana sayfada ve RSS'te görünüyor. **Hiçbir deploy yapılmadan.**

**Bu, prerender penceresi tartışmasının dayanağıdır:** içerik akışı deploy
gerektirmiyor, dolayısıyla build süresi yalnızca KOD değişikliklerinde ödeniyor.
Ölçülen fark (§6.5'in devamı): prerender edilmiş sayfa ilk istekte 0,49 sn,
edilmemiş 3,29 sn. Yani pencereyi kısaltmak maliyeti senden alıp kullanıcıya ve
Googlebot'a yıkıyor. **Öneri: spec 11.1'deki 12 aylık pencere korunsun.**

Zamanlanmış işler artık kendiliğinden çalışıyor: `daily-ingest` 07:00 ve 18:00
TRT, `dispatch-alerts` 08:00 TRT ve her ingest sonrası.

### Test verisi temizlendi

Oturum boyunca üretilen alarm, teslimat ve profil kayıtları silindi (0/0/0).
`records` ve `issues` bozulmadı. **`auth.users`'ta üç test adresi kaldı** —
bilerek: iptal akışı `auth.users`'a dokunmuyor (§6.7) ve gizlilik metni de bunu
söylüyor. Silinmesi istenirse Supabase panelinden.

### Alan adı ve DNS

`mevzuatkibris.com` Cloudflare'da, apex Vercel'e **CNAME flattening** ile bağlı
(`774e28ece5314738.vercel-dns-017.com`), **proxy KAPALI** (gri bulut). Doğrulandı:
flattening apex'e adres koyuyor ama **MX ve TXT kayıtlarına dokunmuyor** — Email
Routing, SPF, DKIM ve DMARC olduğu gibi duruyor.

`www` ayrı bir kayıt olarak **308 kalıcı yönlendirme** ile apex'e gidiyor. Tek
kanonik host olması şart: `NEXT_PUBLIC_SITE_URL` apex ve PKCE `code_verifier`
çerezi host'a bağlı, iki host olsaydı magic link kırılırdı.

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
