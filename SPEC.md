# KKTC Resmî Gazete Arama & Alarm Platformu — Ürün ve Teknik Spec

**Versiyon:** 1.0
**Durum:** Uygulamaya hazır
**Marka:** Mevzuat Kıbrıs
**Domain:** `mevzuatkibris.com` (geçici karar, bkz. bölüm 17)

---

## 1. Ürün özeti

KKTC Resmî Gazete'nin 2006–bugün arasındaki tüm sayıları `basimevi.gov.ct.tr` üzerinde yıl bazlı tek bir HTML sayfasında listeleniyor ve yalnızca PDF olarak indirilebiliyor. Sitenin kendi önerisi sayfa içinde CTRL+F yapmak. Yani:

- Full-text arama yok
- Kategori, kurum, şirket, yer bazlı filtreleme yok
- Bildirim yok
- Tekil karara link verilemiyor (yalnızca PDF'in tamamına)
- Mobilde kullanılamaz

**Bu ürün ne yapıyor:** Aynı veriyi indirip metne çeviriyor, kayıt seviyesinde parçalıyor, sınıflandırıyor, aranabilir hale getiriyor ve kişilerin kaydettiği kelime/şirket/yer/kategori için e-posta bildirimi gönderiyor.

**Tek cümlelik değer önerisi:** _KKTC Resmî Gazete'de seni ilgilendiren şey yayımlandığında haberin olur._

### 1.1 Hedef kitle ve öncelik

Ürün tamamen ücretsiz olduğu için önceliklendirme **ödeme gücüne değil, trafik hacmine** göre yapılır. Reklam geliri sayfa görüntülemeyle doğru orantılı; dolayısıyla "az kişi ama çok öder" segmentleri geride kalır.

| Segment                   | İhtiyaç                                                            | Tahmini kitle                  | v1 önceliği |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------ | ----------- |
| Kamu işi arayan           | Münhal ilanları, sınav sonuçları, KHK genelgeleri                  | On binler, tekrar eden ziyaret | **P0**      |
| Emlakçı / arazi sahibi    | Kamulaştırma, yabancıya taşınmaz izni, imar, hali arazi, koçan     | Binler, yüksek arama niyeti    | **P0**      |
| Müteahhit / taşeron       | İhale, Rekabet Kurulu itiraz kararları, planlama onayı             | Yüzler, çok sık ziyaret        | P1          |
| Muhasebeci / mali müşavir | KDV, harç, sosyal sigorta primleri, faiz oranları                  | Yüzler, aylık ritim            | P1          |
| İthalatçı / ticaret       | Gümrük, kur uygulaması, dış ticaret tüzükleri, marka ilanları      | Yüzler                         | P2          |
| Gazeteci / araştırmacı    | Her şey                                                            | Onlar, ama backlink getirir    | P2          |
| Avukat                    | Tüzük değişiklikleri, yasa tasarıları, Anayasa Mahkemesi kararları | ~1.200 kişi (tavan)            | P2          |

**Not:** Avukat segmentini büyüme motoru sanma. `mahkemeler.net` üzerindeki avukat portalının toplam 1.164 kullanıcısı var; bu, tüm mesleğin üst sınırına yakın. Ürünün hacmi münhal + gayrimenkul ikilisinden gelir.

### 1.2 Başarı metrikleri (ilk 6 ay)

| Metrik                                          | Hedef                                           |
| ----------------------------------------------- | ----------------------------------------------- |
| İndekslenen kayıt                               | 60.000+                                         |
| Google'da indekslenen sayfa                     | 25.000+                                         |
| Aylık organik oturum                            | 15.000                                          |
| **Aylık sayfa görüntüleme**                     | **35.000+** (reklam gelirinin doğrudan girdisi) |
| Oturum başına sayfa                             | 2.3+                                            |
| Alarm abonesi                                   | 800                                             |
| Alarm → tıklama oranı                           | %25+                                            |
| Metin çıkarma başarısı (kayıt bazlı)            | %95+                                            |
| Sayı yayımlandıktan sonra sitede görünme süresi | < 12 saat                                       |
| **Aylık altyapı maliyeti**                      | **< 70 USD** (bkz. bölüm 14)                    |

---

## 2. Kapsam

### v1'e dahil

- 2006–bugün tüm RG sayılarının indirilmesi, metne çevrilmesi, kayıt seviyesinde ayrıştırılması
- Türkçe full-text arama (filtreler: tarih aralığı, konu, belge tipi, kurum)
- Kayıt, sayı, konu, kurum, şirket, yerleşim yeri sayfaları
- E-posta alarmı (kayıtlı arama, konu aboneliği)
- Tüm listeler için RSS
- Rehber içerikleri (SEO + kullanıcı eğitimi)
- Supabase Auth (magic link)
- AdSense

### v1'e dahil değil

- Konsolide mevzuat metni (bir yasanın tüm değişiklikleriyle birleştirilmiş güncel hali) — v2
- **Ücretli abonelik, paywall, kullanıcı limiti — kalıcı olarak kapsam dışı.** Tüm özellikler herkese ücretsiz. Tek gelir kaynağı reklam. Bu bir "v1 sadeliği" değil, ürün kararı; mimari buna göre kuruldu (bölüm 14).
- Mahkeme kararları — kapsam dışı, `mahkemeler.net` var
- İngilizce sürüm — RG içeriği Türkçe; makine çevirisi hukuki metinde hem kalitesiz hem duplicate content riski
- Mobil uygulama
- Yapay zeka özetleme / soru-cevap — v2

---

## 3. Kaynak veri yapısı

### 3.1 Arşiv sayfaları

```
https://basimevi.gov.ct.tr/ARŞİV/{yıl}      # 2006–2026, URL-encoded: AR%C5%9E%C4%B0V
```

Her yıl tek HTML sayfa. Tablo kolonları: `SAYI | TARİH | İÇERİK`. Sayı numarası PDF'e link. 2025'te 262 sayı var; ortalama yıl 200–270 sayı.

`İÇERİK` hücresi, sayının içindeki kayıtların düz metin dökümü. Bölüm başlıklarıyla ayrılmış ve **bu başlıklar tutarlı** — ayrıştırmanın omurgası bu.

### 3.2 Bölüm taksonomisi

| Bölüm            | İçerik                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `MAIN`           | Atama/görevden alma kararnameleri, Kamu Hizmeti Komisyonu münhal ilanları ve sınav sonuçları, mahkeme duyuruları                 |
| `EK I BÖLÜM I`   | Yasalar, bütçe yasaları                                                                                                          |
| `EK I BÖLÜM II`  | Yasa gücünde kararnameler                                                                                                        |
| `EK II BÖLÜM I`  | Anayasa Mahkemesi kararları                                                                                                      |
| `EK III`         | Tüzükler, emirnameler, kurul kararları (Rekabet, Eski Eserler), Merkez Bankası vaziyetleri, Şirketler Mukayyitliği ön duyuruları |
| `EK IV BÖLÜM I`  | Bakanlar Kurulu kararları — `Ü(K-I) ####-YYYY`                                                                                   |
| `EK IV BÖLÜM II` | Meclis kararları                                                                                                                 |
| `EK V BÖLÜM I`   | Şirket sicil silme işlemleri                                                                                                     |
| `EK V BÖLÜM II`  | Ticaret markaları resmî ilanları                                                                                                 |
| `EK VI`          | Yasa tasarıları (`Y.T.NO`) ve yasa önerileri (`Y.Ö.NO`)                                                                          |

### 3.3 Kayıt tanımlayıcıları (parse için regex çapaları)

| Desen                             | Örnek                   | Tip                                                   |
| --------------------------------- | ----------------------- | ----------------------------------------------------- |
| `A\.E\.\s?(\d+)`                  | `A.E.1071`              | İdari emir / tüzük / kurul kararı                     |
| `Ü\(K-I\)\s?(\d+)-(\d{4})`        | `Ü(K-I) 2497-2025`      | Bakanlar Kurulu kararı                                |
| `Ü\(K-II\)\s?(\d+)-(\d{4})`       | `Ü(K-II) 618-2025`      | Bakanlar Kurulu kararı, ikinci seri                   |
| `Ş\.M\.\s?(\d+)`                  | `Ş.M. 4412`             | Şirketler Mukayyitliği işlemi                         |
| `Y\.T\.NO:\s?(\d+)/(\d+)/(\d{4})` | `Y.T.NO:332/5/2025`     | Yasa tasarısı                                         |
| `Y\.Ö\.NO:\s?(\d+)/(\d+)/(\d{4})` | `Y.Ö.NO:96/5/2025`      | Yasa önerisi                                          |
| `GENELGE\s+MİA\.(\d+)/(\d{4})`    | `GENELGE MİA.32/2025`   | Münhal ilanı                                          |
| `KARAR\s+SAYISI:\s?(\d+)/(\d{4})` | `KARAR SAYISI:318/2025` | Rekabet Kurulu kararı                                 |
| `KARAR\s+NO:\s?(\d+)/(\d+)`       | `KARAR NO:25/96`        | Eski Eserler Kurulu kararı                            |
| `DÜZELTME:`                       | —                       | Önceki bir kaydın düzeltmesi; kaynak kayda bağlanmalı |

**Kritik ayrıştırma kuralı:** Tek bir `İÇERİK` hücresinde onlarca kayıt olabilir ve bunlar sırasız/tekrarlı olabilir. Ayrıştırıcı "bu metinde kaç ayrı kayıt var" sorusunu sormalı, ilk eşleşmeyi alıp durmamalı. Ayrıca aynı konu hem `EK III`'te `A.E.` numarasıyla hem `EK IV BÖLÜM I`'de `Ü(K-I)` numarasıyla görünür (kararname ve onu yayımlayan BKK). Bunlar **ayrı kayıt** olarak saklanır, `related_record_id` ile bağlanır.

### 3.4 Belge tipleri (`doc_type` enum)

```
yasa | yasa_gucunde_kararname | yasa_tasarisi | yasa_onerisi | tuzuk | emirname
bakanlar_kurulu_karari | meclis_karari | atama_kararnamesi | gorevden_alma
munhal_ilani | sinav_sonucu | rekabet_kurulu_karari | eski_eserler_karari
anayasa_mahkemesi_karari | sirket_duyurusu | marka_ilani | kamulastirma
merkez_bankasi_duyurusu | mahkeme_duyurusu | duzeltme | diger
```

### 3.5 Konular (`topic` — kullanıcıya gösterilen, URL'de kullanılan)

| Slug          | Kapsam                   | Kaynak doc_type / anahtar kelime                                                                                                 |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `munhal`      | Kamu işe alım            | `munhal_ilani`, `sinav_sonucu`, "MÜNHAL", "SINAV SONUÇLARI", "İLK ATAMA KADROSU"                                                 |
| `ihale`       | İhale ve itirazlar       | `rekabet_kurulu_karari`, "İHALE", "HİZMET ALIMI", "YAPIM İŞİ"                                                                    |
| `sirket`      | Şirket sicil hareketleri | `sirket_duyurusu`, "İSİM DEĞİŞTİRME", "TASFİYE", "SİCİLDEN KAYIT SİLİNMESİ", "DENİZAŞIRI YABANCI ŞİRKET TESCİLİ"                 |
| `gayrimenkul` | Arazi ve imar            | `kamulastirma`, "TAŞINMAZ MAL SATIN ALMA", "PLANLAMA ONAYI", "HALİ ARAZİ", "KIRSAL KESİM ARSASI", "YOL AYRILMASI", "GEÇİT HAKKI" |
| `marka`       | Ticaret markaları        | `marka_ilani`                                                                                                                    |
| `vergi-mali`  | Vergi, harç, fiyat, prim | "KATMA DEĞER VERGİSİ", "HARÇ", "FİYAT İSTİKRAR FONU", "AZAMİ SATIŞ FİYATLARI", "PRİM", "FAİZ ORANLARI"                           |
| `mevzuat`     | Yasama                   | `yasa`, `yasa_gucunde_kararname`, `tuzuk`, `yasa_tasarisi`, `yasa_onerisi`                                                       |
| `atama`       | Kamu üst düzey atama     | `atama_kararnamesi`, `gorevden_alma`                                                                                             |

Bir kayıt **birden fazla konuya** ait olabilir (`record_topics` çoka-çok tablo).

### 3.6 Kaynak kullanımı ve etik

- Resmî Gazete içeriği kamu belgesidir, telif kısıtı yoktur. Yine de her kayıt sayfasında **orijinal PDF'e link** verilir ve "resmî metin bağlayıcıdır" ibaresi bulunur.
- `basimevi.gov.ct.tr`'ye saniyede 1 istekten fazla gönderilmez. `User-Agent` kendini tanıtır ve iletişim adresi içerir.
- **PDF'ler saklanmaz.** Ingest sırasında GitHub Actions runner'ına indirilir, metni çıkarılır, iş bitince silinir. Kullanıcıya gösterilen indirme linki her zaman orijinal kaynağa gider. Gerekçe: 20 yıl × ~250 sayı × ~2 MB ≈ 10 GB; bu, ücretsiz altyapıda taşınamaz ve zaten kamuya açık bir kaynağın kopyasını tutmanın ürüne kattığı bir şey yok. Saklanan tek şey çıkarılmış metin.

### 3.7 Kişisel veri

RG; atama kararnameleri, sınav sonuç listeleri ve "yasaklı göçmen ilan edilmesi" kararları gibi **kişi adı içeren** kayıtlar barındırıyor. Bunlar kamuya açık resmî belgeler olsa da bir arama motoru haline getirmek farklı bir sorumluluk doğurur.

Kurallar:

1. **Kişi adına özel sayfa üretilmez.** `/sirket/[slug]` ve `/yer/[slug]` var, `/kisi/[slug]` **yok**.
2. Kişi adı geçen kayıt sayfaları indekslenir, ancak `sinav_sonucu` ve "yasaklı göçmen" içeren kayıtlarda kişi adları render edilmez; "tam liste için orijinal PDF'e bakınız" denir.
3. Arama, kişi adıyla sonuç döndürebilir (kayıt başlığında geçiyorsa) ama sonuç sayfası `noindex`.
4. Kaldırma talebi için `/iletisim` üzerinde açık bir kanal bulunur ve 7 gün içinde yanıtlanır.

### 3.8 Özet cümle üretimi

Kaynak başlıklar okunamayacak kadar kötü (3.3'teki örnekler). Her kayıt için okunabilir bir özet cümle üretilir ve `records.summary` alanında **kalıcı olarak** saklanır.

**Kesin kurallar:**

1. **Özet, başlıktan kesinlikle çıkarılabilen şeyi söyler.** Kararın sonucunu bildirmez. "İtirazı karara bağladı" doğru; "itirazı reddetti" yanlış — o bilgi gövdede ve tahmin yürütmek hukuki metinde kabul edilemez.
2. **Özet günlük dili kullanır, maskeli başlık resmî terimi taşır.** "Kamulaştırma kararı" yazılır, "zorla mal iktisabı" değil. Kullanıcı günlük terimle arıyor; resmî terim zaten orijinal başlıkta olduğu için arama ikisini de yakalar.
3. **Aynı belge tipi hep aynı kalıbı alır.** "Kamulaştırma" / "istimlak" / "zorla mal iktisabı" karışık kullanılmaz.
4. **Bir kez üretilir, her yerde aynı görünür.** Liste, detay, e-posta, RSS ve `og:title` aynı metni kullanır. Sayfaya özel yeniden üretim yasak.
5. **Orijinal başlık her zaman sayfada ve kopyalanabilir.** Açılır kutuda saklanmaz.

**Üretim sırası — kademeli:**

```
1. Kural tabanlı  → kayıtların çoğunluğu tanınabilir kalıpta
2. Kalıp yoksa    → LLM (tek seferlik)
3. LLM de başarısızsa → özet yok, maskelenmiş başlık gösterilir
```

Kural örnekleri:

| Kaynak kalıbı                                                                        | Üretilen özet                                              |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `1962 ZORLA MAL İKTİSABI YASASI-{yer}`                                               | `{yer}'de kamulaştırma kararı`                             |
| `TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN İSİM DEĞİŞTİRME MÜRACAATI/{X} İN {Y} OLARAK...` | `{X}, {Y} adını aldı`                                      |
| `SÖZLEŞMELİ PERSONEL/{ad}`                                                           | `{ad} sözleşmeli personel olarak istihdam edildi`          |
| `ÖDENEK AKTARMA/{kurum}`                                                             | `{kurum} bütçesinde ödenek aktarma`                        |
| `...İLK ATAMA KADROSU MÜNHAL İLANI VE SINAVI DUYURUSU`                               | `{kurum} ilk atama kadrosu münhal ilanı ve sınav duyurusu` |

**Maliyet notu:** RG kaydı yayımlandıktan sonra asla değişmediği için LLM maliyeti tek seferliktir; aynı kayıt ikinci kez işlenmez. Bu, ücretsiz ürün modelinde LLM kullanımını mümkün kılan tek şey.

`summary_source` alanı `rule` mi `llm` mi olduğunu tutar; kalite denetimi ve LLM oranının izlenmesi için gerekli.

### 3.9 Başvuru bitiş tarihi

Münhal ilanları ve ihale duyuruları son başvuru tarihi içeriyor. Bu tarih gövde metninden çıkarılıp `deadline_at` kolonuna yazılır. İki yerde kullanılıyor ve ikisi de önemli:

1. **Ürün.** `/konu/munhal` akışında "Başvurusu açık" filtresi ve her kayıtta vurgulanmış bitiş tarihi. Segmentin gerçek sorusu bu.
2. **SEO.** `JobPosting` yapılandırılmış verisinin zorunlu `validThrough` alanı (8.3).

Çıkarım kural tabanlı: `son başvuru`, `başvuru süresi`, `müracaatlar ... tarihine kadar` gibi kalıpların yakınındaki tarih ifadesi. Belirsizse **alan boş bırakılır**; tahmin edilmez.

Bitiş tarihi geçmiş kayıtlar akıştan silinmez, "Başvuru süresi doldu" olarak işaretlenir — kullanıcılar sonuç listesini beklediği için arşiv değeri var.

---

## 4. Teknoloji yığını

| Katman            | Seçim                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Framework         | Next.js (App Router, son sürüm) + TypeScript                              |
| Stil              | Tailwind CSS + shadcn/ui                                                  |
| Veritabanı        | Supabase Postgres                                                         |
| Auth              | Supabase Auth (magic link)                                                |
| Dosya             | Yok — PDF saklanmıyor (bölüm 3.6)                                         |
| ORM               | Drizzle ORM                                                               |
| Doğrulama         | Zod                                                                       |
| Arama             | Postgres FTS (`turkish` config türevi) + `unaccent` + `pg_trgm`           |
| PDF → metin       | `pdftotext` (poppler-utils) + `tesseract-ocr` (`tur` dil paketi) fallback |
| Zamanlanmış işler | GitHub Actions cron                                                       |
| E-posta           | Resend                                                                    |
| Hosting           | Vercel                                                                    |
| Analytics         | Vercel Analytics + Google Search Console                                  |
| Gelir             | Google AdSense — **tek gelir kaynağı**, ücretli plan yok                  |

---

## 5. Arama mimarisi

### 5.1 Karar: Supabase Postgres, harici arama servisi yok

Meilisearch veya Typesense yerine Postgres seçildi. Gerekçeler:

1. **PostgreSQL Türkçe stemmer'ı hazır getiriyor.** `turkish_stem` snowball sözlüğü ve `turkish` text search configuration çekirdekte mevcut (PG 9.4'ten beri). "Türkçe desteği yok" varsayımı yanlış; harici servisin ana gerekçesi ortadan kalkıyor.
2. **Senkronizasyon işi yok.** Ayrı bir arama servisi, ingest sonrası indeks güncelleme, tutarsızlık kontrolü ve yeniden indeksleme işi getirir. Bu, ekstra bir kırılma noktası ve ekstra bir cron.
3. **Korpus küçük.** ~100.000 kayıt, kayıt başına ortalama 1–3 KB metin. Bu, GIN indeksiyle Postgres'in rahat taşıdığı bir ölçek. Milyonlarca doküman olsaydı karar farklı olurdu.
4. **Tek fatura, tek RLS, tek yedek.** Alarm eşleştirme sorguları (aşağıda) zaten SQL; arama da aynı yerdeyse alarm mantığı tek bir sorguya iner.

**Sınır:** Typo toleransı ve "did you mean" Postgres'te Meilisearch kadar iyi olmaz. Bunu `pg_trgm` ile telafi ediyoruz (5.4). Arama kalitesi ölçülüp yetersiz kalırsa v2'de Meilisearch eklenir; şema buna hazır tasarlanıyor.

### 5.2 Özel text search configuration

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Alan terimleri için eşanlamlı sözlüğü
-- dosya: $SHAREDIR/tsearch_data/rg_tr.syn
-- kamulastirma istimlak
-- munhal kadro
-- tuzuk yonetmelik
-- kocan tapu
-- emirname karar
CREATE TEXT SEARCH DICTIONARY rg_syn (
  TEMPLATE = synonym,
  SYNONYMS = rg_tr
);

CREATE TEXT SEARCH CONFIGURATION tr_rg (COPY = turkish);

ALTER TEXT SEARCH CONFIGURATION tr_rg
  ALTER MAPPING FOR asciiword, asciihword, hword_asciipart,
                    word, hword, hword_part
  WITH unaccent, rg_syn, turkish_stem;
```

Zincir sırası önemli: `unaccent` (filtreleyici) aksanı düşürür, `rg_syn` alan terimlerini eşitler, `turkish_stem` gövdeler.

> **Supabase notu:** Supabase yönetilen Postgres'te `$SHAREDIR/tsearch_data` altına dosya yazılamaz. Eşanlamlı sözlüğü dosya gerektirdiği için, ilk sürümde `rg_syn` adımı atlanır ve eşanlamlılar **sorgu genişletmesi** olarak uygulama katmanında yapılır (5.3, adım 3). Config yine de `unaccent + turkish_stem` olarak kurulur. Bu, alınan tek gerçek taviz.

### 5.3 İndeksleme

```sql
ALTER TABLE records ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('tr_rg', coalesce(subject, '')), 'B') ||
    setweight(to_tsvector('tr_rg', coalesce(body_text, '')), 'C')
  ) STORED;

CREATE INDEX records_search_idx ON records USING GIN (search_vector);
CREATE INDEX records_title_trgm_idx ON records USING GIN (title_normalized gin_trgm_ops);
```

`to_tsvector` sabit config ile çağrıldığında IMMUTABLE'dır, generated column'da kullanılabilir.

**Türkçe küçük harf tuzağı:** `İ` karakteri Postgres'in collation'ına göre `i` + birleşen nokta üretebilir. Ingest sırasında JavaScript tarafında `.toLocaleLowerCase('tr')` ile normalize edilmiş bir `title_normalized` kolonu tutulur ve trigram indeksi bunun üzerine kurulur.

**Zorunlu kabul testi:** Aşağıdakiler aynı sonucu döndürmeli.

```
to_tsvector('tr_rg','İHALE') = to_tsvector('tr_rg','ihale') = to_tsvector('tr_rg','ihaleye')
to_tsvector('tr_rg','kamulaştırma') = to_tsvector('tr_rg','kamulastirma') = to_tsvector('tr_rg','kamulaştırmanın')
```

### 5.4 Sorgu hattı

```
1. Girdi normalize      → trim, toLocaleLowerCase('tr'), fazla boşluk temizle
2. Tırnak tespiti       → "hizmet alımı" varsa phraseto_tsquery
3. Eşanlamlı genişletme → uygulama katmanında OR ile ekle (kamulaştırma → | istimlak)
4. Sorgu üret           → websearch_to_tsquery('tr_rg', q)
5. Sırala               → ts_rank_cd(search_vector, query) * recency_boost
6. Vurgula              → ts_headline('tr_rg', body_text, query, 'MaxWords=40, MinWords=20')
7. 0 sonuçta            → title_normalized % q (trigram, similarity > 0.3) → "bunu mu demek istediniz"
```

`recency_boost`: son 90 gün ×1.5, son 1 yıl ×1.2, gerisi ×1.0. Kullanıcı "en yeni" sıralamasını seçebilir.

### 5.5 Filtreler

Tarih aralığı, konu (çoklu), belge tipi (çoklu), kurum, yıl. Hepsi URL query param olarak, paylaşılabilir. Arama sonuç sayfası `noindex, follow`.

---

## 6. Veritabanı şeması

```sql
-- Gazete sayıları
CREATE TABLE issues (
  id            bigserial PRIMARY KEY,
  year          smallint NOT NULL,
  number        integer  NOT NULL,
  published_at  date     NOT NULL,
  pdf_url       text     NOT NULL,          -- orijinal kaynak (saklamıyoruz, linkliyoruz)
  page_count    smallint,
  text_status   text NOT NULL DEFAULT 'pending',
                -- pending | extracted | ocr | failed | needs_review
  text_quality  real,                       -- 0..1, Türkçe sözlük oranı
  raw_index_html text,                      -- arşiv sayfasındaki ham İÇERİK hücresi
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (year, number)
);

-- Tekil kayıtlar
CREATE TABLE records (
  id                bigserial PRIMARY KEY,
  issue_id          bigint NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  slug              text NOT NULL UNIQUE,
  section           text NOT NULL,           -- MAIN | EK_I_B_I | EK_III | ...
  doc_type          text NOT NULL,
  ref_type          text,                    -- ae | uki | ukii | sm | yt | yo | mia | rekabet | eskieser
  ref_number        text,                    -- "1071", "2497-2025", "4412"
  title             text NOT NULL,           -- ham başlık
  title_normalized  text NOT NULL,           -- tr-lowercase + unaccent
  subject           text,                    -- "KONU:" sonrası
  body_text         text,                    -- PDF'ten çıkarılan ilgili gövde, 20 KB'de kesilir
  summary           text,                    -- üretilen özet cümle (bkz. 3.8), kalıcı saklanır
  summary_source    text,                    -- rule | llm
  deadline_at       date,                    -- münhal/ihale son başvuru tarihi (bkz. 3.9)
  deadline_note     text,                    -- "Yazılı sınav 14 Şubat 2026, altı kadro"
  page_from         smallint,
  page_to           smallint,
  published_at      date NOT NULL,           -- issues.published_at denormalize
  related_record_id bigint REFERENCES records(id),
  corrects_id       bigint REFERENCES records(id),  -- DÜZELTME kayıtları için
  has_personal_data boolean NOT NULL DEFAULT false,
  search_vector     tsvector GENERATED ALWAYS AS (...) STORED,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX ON records (published_at DESC);
CREATE INDEX ON records (doc_type, published_at DESC);
CREATE INDEX ON records (issue_id);

-- Konular
CREATE TABLE topics (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  sort_order  smallint NOT NULL
);

CREATE TABLE record_topics (
  record_id bigint REFERENCES records(id) ON DELETE CASCADE,
  topic     text   REFERENCES topics(slug),
  PRIMARY KEY (record_id, topic)
);

-- Varlıklar (kurum, şirket, yerleşim yeri)
CREATE TABLE entities (
  id         bigserial PRIMARY KEY,
  kind       text NOT NULL,          -- institution | company | place
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  name_normalized text NOT NULL,
  aliases    text[] DEFAULT '{}',
  district   text,                   -- place için ilçe
  meta       jsonb DEFAULT '{}',
  record_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON entities USING GIN (name_normalized gin_trgm_ops);
CREATE INDEX ON entities (kind, record_count DESC);

CREATE TABLE record_entities (
  record_id bigint REFERENCES records(id) ON DELETE CASCADE,
  entity_id bigint REFERENCES entities(id) ON DELETE CASCADE,
  confidence real NOT NULL DEFAULT 1.0,
  PRIMARY KEY (record_id, entity_id)
);

-- Kullanıcı ve alarmlar
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  digest_hour smallint NOT NULL DEFAULT 8,   -- TRT
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE alerts (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       text NOT NULL,
  query       text,                          -- serbest metin
  topics      text[]  DEFAULT '{}',
  doc_types   text[]  DEFAULT '{}',
  entity_ids  bigint[] DEFAULT '{}',
  frequency   text NOT NULL DEFAULT 'daily', -- instant | daily | weekly
  is_active   boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE alert_deliveries (
  id         bigserial PRIMARY KEY,
  alert_id   bigint REFERENCES alerts(id) ON DELETE CASCADE,
  record_ids bigint[] NOT NULL,
  sent_at    timestamptz DEFAULT now(),
  status     text NOT NULL,                 -- sent | failed | skipped
  provider_id text                          -- Resend message id
);

-- Ingest durumu
CREATE TABLE ingest_runs (
  id           bigserial PRIMARY KEY,
  kind         text NOT NULL,               -- daily | backfill
  target_year  smallint,
  started_at   timestamptz DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running',
  issues_seen  integer DEFAULT 0,
  issues_new   integer DEFAULT 0,
  records_new  integer DEFAULT 0,
  errors       jsonb DEFAULT '[]'
);

-- Arama logu (öneri ve boş-sonuç analizi için)
CREATE TABLE search_logs (
  id           bigserial PRIMARY KEY,
  query        text NOT NULL,
  result_count integer NOT NULL,
  created_at   timestamptz DEFAULT now()
);
```

**RLS:** `profiles`, `alerts`, `alert_deliveries` yalnızca sahibine açık. `issues`, `records`, `topics`, `entities` ve ilişki tabloları herkese `SELECT`. Ingest, service role key ile yazar.

---

## 7. Veri boru hattı

### 7.1 Aşamalar

```
1. crawl-archive     Yıl arşiv sayfasını çek, sayı listesini çıkar, yeni olanları issues'a yaz
2. fetch-pdf         PDF'i runner'a geçici indir, sayfa sayısını al (iş sonunda silinir)
3. extract-text      pdftotext → yetersizse OCR → text_quality hesapla
4. parse-records     Arşiv İÇERİK hücresi + PDF metnini birleştirip kayıtlara böl
5. classify          doc_type ve topic ata (kural tabanlı)
6. extract-entities  Şirket / kurum / yerleşim yeri çıkar, entities ile eşle
7. index             search_vector otomatik; entity sayaçlarını güncelle
8. revalidate        Next.js on-demand revalidation tetikle
9. dispatch-alerts   Eşleşen alarmları bul, Resend ile gönder
```

Her aşama ayrı, idempotent bir script. Yeniden çalıştırmak zarar vermez.

### 7.2 Metin çıkarma

```bash
sudo apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-tur ocrmypdf ghostscript
```

```
pdftotext -layout -enc UTF-8 input.pdf -
  ↓
karakter_sayısı / sayfa_sayısı < 150  →  taranmış kabul et
  ↓
ocrmypdf --language tur --skip-text --optimize 1 --output-type pdf input.pdf out.pdf
pdftotext -layout out.pdf -
  ↓
text_quality = (Türkçe sözlükte bulunan kelime) / (toplam kelime)
  ↓
text_quality < 0.55  →  text_status = 'needs_review', kayıt yine de saklanır
```

Beklenti: 2018 sonrası sayılar text-layer'lı, `pdftotext` yeterli. 2006–2015 arası büyük ihtimalle taranmış, OCR şart. Backfill'e **en yeniden başla**, en eskiye doğru git — böylece kullanıcı değeri erken çıkar.

**Ölçüm:** Her yıl için OCR oranı ve ortalama `text_quality` `ingest_runs.errors` içinde raporlanır. Bir yılın ortalama kalitesi 0.6'nın altındaysa o yıl "arşiv kalitesi düşük" etiketiyle işaretlenir ve kullanıcıya sayfada bildirilir.

**Yeniden deneme kuyruğu.** Metni çıkarılamamış kayıt sayfası kullanıcıya "metin okuma denemesini yeniden kuyruğa aldık, çıkarılabilirse bu sayfaya eklenir" diyor. Bunun kodda karşılığı olmalı, yoksa verilmiş bir söz boşa çıkar:

- `text_status IN ('failed','needs_review')` kayıtları ayda bir yeniden denenir
- Deneme sayısı `issues.retry_count` ile tutulur, 3 denemeden sonra durur
- Başarılı olursa kayıt güncellenir ve sayfa revalidate edilir
- **Takipçilere bildirim gitmez** — bu yeni bir kayıt değil, mevcut kaydın tamamlanması. Arayüzde de böyle söylüyoruz.

### 7.3 Ayrıştırma testi (zorunlu)

`fixtures/` altında 25 gerçek RG sayısı ve elle hazırlanmış beklenen kayıt listesi tutulur. Her parse değişikliğinde CI'da çalışır. Ölçülen: kayıt sayısı doğruluğu, `ref_number` doğruluğu, `doc_type` doğruluğu.

Bilinen zor vakalar test setine mutlaka girer:

- Aynı konunun hem `A.E.` hem `Ü(K-I)` olarak iki kez görünmesi
- `DÜZELTME:` kayıtlarının hangi kayda ait olduğu
- Tek satırda birden çok şirket adı (`GLOBAL INVESTMENT ... , NICOSIA LANGUAGE CENTRE LIMITED, ...`)
- Kesme işaretli ve parantezli başlıklar
- Yazım hatalı kaynak metin (`METEROLOJİ`, `PORJESİ`, `KARLIŞANMASI` gerçek örneklerdir) — normalize edilirken orijinal korunur

### 7.4 GitHub Actions

```yaml
# .github/workflows/daily-ingest.yml
on:
  schedule:
    - cron: '0 4 * * *' # 07:00 TRT
    - cron: '0 15 * * *' # 18:00 TRT
  workflow_dispatch:
concurrency:
  group: ingest
  cancel-in-progress: false
```

```yaml
# .github/workflows/backfill.yml
on:
  workflow_dispatch:
    inputs:
      year: { required: true }
# matrix ile yıl bazlı paralel, her job 1 yıl
```

```yaml
# .github/workflows/dispatch-alerts.yml
on:
  workflow_run:
    workflows: [daily-ingest]
    types: [completed]
  schedule:
    - cron: '0 5 * * *' # 08:00 TRT, günlük digest
```

**Uyarılar:**

- GitHub cron **garantili değil**; yoğun saatlerde 30+ dakika gecikebilir. 12 saatlik SLA hedefi bunu tolere ediyor.
- Private repo'da 2.000 dakika/ay sınırı var. OCR'lı backfill bunu aşabilir. Repo'yu public yap veya backfill'i lokalde çalıştırıp Supabase'e yaz.
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `REVALIDATE_SECRET` repo secrets'ta.

---

## 8. URL yapısı ve SEO

SEO bu projenin birincil büyüme kanalı. Yapı buna göre kuruldu.

### 8.1 URL şeması

| URL                                                          | İçerik                                          | Index                |
| ------------------------------------------------------------ | ----------------------------------------------- | -------------------- |
| `/`                                                          | Son yayımlananlar, konu girişleri, arama kutusu | ✅                   |
| `/ara`                                                       | Arama sonuçları                                 | ❌ `noindex, follow` |
| `/karar/[slug]`                                              | Tek kayıt                                       | ✅ **ana hacim**     |
| `/sayilar`                                                   | Yıl listesi                                     | ✅                   |
| `/sayilar/[yil]`                                             | O yılın sayıları                                | ✅                   |
| `/sayilar/[yil]/[sayi]`                                      | Tek sayı içindekiler                            | ✅                   |
| `/konu/[konu]`                                               | Konu akışı (son 50)                             | ✅                   |
| `/konu/[konu]/[yil]`                                         | Konu × yıl arşivi                               | ✅                   |
| `/kurum/[slug]`                                              | Kuruma ait kayıtlar                             | ✅                   |
| `/sirket/[slug]`                                             | Şirkete ait kayıtlar                            | ✅                   |
| `/yer/[slug]`                                                | Yerleşim yerine ait kayıtlar                    | ✅                   |
| `/rehber` + `/rehber/[slug]`                                 | Açıklayıcı içerik                               | ✅                   |
| `/takip`, `/hesap`                                           | Alarm ve hesap yönetimi                         | ❌ `noindex`         |
| `/hakkinda`, `/iletisim`, `/gizlilik`, `/kullanim-kosullari` | Statik                                          | ✅                   |

**Karar slug formatı:**

```
/karar/2025-ae-1071-fiyat-istikrar-fonu-degisiklik-emirnamesi
/karar/2025-uki-2497-fiyat-istikrar-fonu-degisiklik-emirnamesi
/karar/2025-mia-32-hazine-ve-muhasebe-dairesi-ilk-atama-kadrosu-munhal-ilani
```

Format: `{yıl}-{ref_type}-{ref_number}-{başlık-slug}`. Yıl ve referans numarası benzersizliği garanti eder; başlık slug'ı okunabilirlik ve anahtar kelime içindir. Slug **asla değişmez**; başlık düzeltilirse slug korunur.

### 8.2 Sayfa hacmi ve crawl budget

| Sayfa tipi   | Tahmini adet   |
| ------------ | -------------- |
| `/karar/*`   | 70.000–120.000 |
| `/sirket/*`  | 5.000–15.000   |
| `/sayilar/*` | ~5.000         |
| `/yer/*`     | ~200           |
| `/kurum/*`   | ~200           |
| `/konu/*`    | ~170           |

100.000+ sayfa, crawl budget yönetimi gerektirir. Kurallar:

1. **Sitemap önceliklendirmesi.** `sitemap-index.xml` altında parçalı sitemap'ler. Son 24 ay `priority 0.8`, `changefreq monthly`. Eski arşiv `priority 0.3`, `changefreq yearly`. Yeni kayıtlar ayrı bir `sitemap-recent.xml` içinde tutulur, Google en sık onu çeker.
2. **İnce içerik konsolidasyonu.** Bazı kayıtlar tek satırlık ("SÖZLEŞMELİ PERSONEL / ALİ ÖZCANLI"). Bunlar tek başına sayfa açmayı hak etmez. Kural: `body_text` 200 karakterden kısa ve entity bağlantısı yoksa kayıt kendi sayfasını almaz, yalnızca sayı sayfasında listelenir ve `/sayilar/[yil]/[sayi]#karar-{ref}` anchor'ı alır.
3. **Boş varlık sayfası yok.** `entities.record_count < 2` olan şirket/yer sayfası üretilmez.
4. **Sayfalama.** Liste sayfalarında `?sayfa=2` kullanılır, 2. sayfadan itibaren `noindex, follow`.

### 8.3 Structured data (JSON-LD)

| Sayfa                | Şema                       | Not                                                                                          |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Tüm sayfalar         | `BreadcrumbList`           |                                                                                              |
| `/`                  | `WebSite` + `SearchAction` | Sitelinks search box                                                                         |
| `/karar/*` (mevzuat) | `Legislation`              | `legislationIdentifier`, `legislationDate`, `legislationType`, `jurisdiction`                |
| `/karar/*` (münhal)  | `JobPosting`               | `title`, `hiringOrganization`, `jobLocation`, `datePosted`, `validThrough`, `employmentType` |
| `/karar/*` (diğer)   | `Article`                  | `datePublished`, `publisher`, `isBasedOn` (PDF URL)                                          |
| `/rehber/*`          | `FAQPage` veya `HowTo`     |                                                                                              |
| `/kurum/*`           | `GovernmentOrganization`   |                                                                                              |

**`JobPosting` özellikle önemli.** Münhal ilanlarına doğru markup uygularsan Google for Jobs kutusuna girme ihtimalin olur — bu, KKTC'de kimsenin yapmadığı bir şey ve en yüksek hacimli segmentin. Zorunlu `validThrough` alanı `records.deadline_at` kolonundan gelir (3.9). **`deadline_at` boşsa `JobPosting` markup'ı hiç basılmaz**; eksik zorunlu alan Search Console'da hata üretir ve tüm sayfa tipini riske atar. O kayıtlar `Article` şemasına düşer.

### 8.4 Metadata kuralları

```
<title>          {başlık, 60 karakterde kırp} — RG {sayı}/{yıl} | Mevzuat Kıbrıs
<meta desc>      {konu veya gövdenin ilk 155 karakteri, cümle sonunda kes}
canonical        her zaman mutlak, production domain, tek kaynak sabitten
og:image         dinamik (opengraph-image.tsx) — başlık + tarih + sayı numarası
```

**Canonical için kesin kural:** Tek bir `SITE_URL` sabiti (`src/lib/seo/config.ts`), `metadataBase` root layout'ta bir kez set edilir, hiçbir sayfa kendi canonical'ını elle kurmaz. Preview deployment'larda `robots: noindex` zorunlu.

Aynı dosyada marka bilgisi de tek kaynaktan gelir; hiçbir bileşen marka adını sabit metin olarak yazmaz:

```ts
// src/lib/seo/config.ts
export const SITE_URL = 'https://mevzuatkibris.com';
export const SITE_NAME = 'Mevzuat Kıbrıs';
export const SITE_TAGLINE = 'KKTC Resmî Gazete arama ve takip';

// Arşiv kapsamı — tek kaynak. Backfill ilerledikçe güncellenir.
// Hiçbir sayfa bu yılı sabit metin olarak yazmaz.
export const ARCHIVE_START_YEAR = 2006;
```

**Kapsam yılı kuralı:** "1974'ten bugüne" gibi bir ifade sayfaya elle yazılmaz, her zaman `ARCHIVE_START_YEAR`'dan gelir. Yanlış veya sayfadan sayfaya değişen bir kapsam iddiası, kullanıcı kapsam dışı bir yılı aratıp boş sonuç aldığında güveni tek seferde bitirir. Aynı sabit, arama sonucu boşken gösterilen "arşivimiz {yıl}'dan başlıyor" mesajını da besler.

> Bu, kesintimivar.com'da bölge sayfalarının canonical'ının `*.vercel.app`'e kaçmasıyla ortaya çıkan hatanın tekrarını engellemek için var.

### 8.5 İç linkleme

- Her kayıt sayfasında: aynı sayıdaki diğer kayıtlar, bağlı kayıt (`related_record_id`), düzeltmeler, aynı konudan son 5 kayıt, geçen varlıklar
- Her varlık sayfasında: en çok birlikte geçtiği diğer varlıklar
- Konu sayfalarında yıl navigasyonu
- Footer'da tüm konular + en aktif 20 kurum

### 8.6 Anahtar kelime hedefleri

| Sayfa tipi       | Hedef sorgu kalıbı                                                           |
| ---------------- | ---------------------------------------------------------------------------- |
| `/konu/munhal`   | "kktc münhal", "kktc kamu iş ilanları", "kamu hizmeti komisyonu münhal"      |
| `/konu/ihale`    | "kktc ihale ilanları", "merkezi ihale komisyonu"                             |
| `/sirket/[slug]` | "{şirket adı} kktc", "{şirket adı} tasfiye"                                  |
| `/yer/[slug]`    | "{köy} kamulaştırma", "{köy} imar"                                           |
| `/karar/*`       | "A.E. 1071", "{tüzük tam adı}", uzun kuyruk                                  |
| `/rehber/*`      | "resmi gazete nasıl okunur", "a.e. ne demek", "yasa gücünde kararname nedir" |

---

## 9. Sayfa tanımları

### 9.1 `/` Ana sayfa

- Üst: arama kutusu (odaklı, büyük), "bugün {N} yeni kayıt" satırı
- Son yayımlanan sayı kartı (tarih, sayı no, kayıt sayısı, PDF linki)
- Konu şeritleri: her konudan son 4 kayıt, "tümü" linki
- "En çok aranan" — `search_logs`'tan türetilmiş
- Alt: alarm CTA ("takip et, e-posta ile haberdar ol")

### 9.2 `/karar/[slug]` Kayıt sayfası

Sitenin en önemli sayfası. Yapı:

1. **Breadcrumb:** Ana sayfa › {Konu} › {Yıl} › Kayıt
2. **Başlık** (h1) — ham başlık
3. **Künye şeridi:** yayım tarihi · RG sayı {no}/{yıl} · {bölüm} · {referans no} · {belge tipi}
4. **Eylemler:** Orijinal PDF'i aç · Bu kaydı takip et · Bağlantıyı kopyala
5. **Metin** — çıkarılan gövde. Yoksa "Bu kaydın metni çıkarılamadı, orijinal PDF'e bakınız" + `text_status` rozeti
6. **Varlıklar:** geçen şirketler, kurumlar, yerleşim yerleri (linkli çipler)
7. **İlgili kayıtlar:** bağlı karar, düzeltmeler, aynı sayıdaki diğerleri
8. **Uyarı kutusu:** "Bu sayfa Resmî Gazete'den otomatik derlenmiştir. Bağlayıcı olan orijinal metindir."

### 9.3 `/ara` Arama

- Sol: filtreler (konu, belge tipi, tarih aralığı, kurum)
- Sağ: sonuç listesi, her sonuçta başlık + vurgulanmış snippet + künye
- Üst: sonuç sayısı, sıralama (alaka / en yeni / en eski)
- Boş sonuç: trigram önerisi + "bu aramayı alarma çevir" CTA
- Sonsuz kaydırma **yok**, klasik sayfalama (SEO ve paylaşılabilirlik)

### 9.4 `/konu/[konu]` Konu akışı

- Konu açıklaması (2–3 cümle, özgün metin — ince içerik olmaması için)
- Kronolojik kayıt listesi
- RSS linki
- "Bu konuyu takip et" CTA (tek tık, sadece e-posta ister)
- Yıl navigasyonu
- Konuya özel istatistik: "2026'da bu konuda {N} kayıt yayımlandı"

### 9.5 `/sayilar/[yil]/[sayi]` Sayı sayfası

Orijinal RG'nin içindekiler tablosunun okunabilir hali. Bölüm başlıklarına göre gruplanmış kayıt listesi. Sayfa başında PDF indirme linki ve `text_status` bilgisi. Önceki/sonraki sayı navigasyonu.

### 9.6 `/kurum`, `/sirket`, `/yer` Varlık sayfaları

Aynı şablon: varlık adı (h1), kısa tanım, ilgili kayıt sayısı, kronolojik liste, birlikte geçen varlıklar, "takip et" CTA.

### 9.7 `/rehber` Rehberler

v1 için yazılacak içerikler:

1. Resmî Gazete nasıl okunur — bölümler ne anlama gelir
2. A.E., Ü(K-I), Y.T. numaraları ne demek
3. Yasa, tüzük, emirname, kararname farkı
4. KKTC'de kamu işine nasıl başvurulur — münhal ilanından atamaya
5. Bir ihale ilanı nasıl okunur, Rekabet Kurulu itirazı nedir
6. Kamulaştırma ihbarı ile kamulaştırma emri farkı
7. Şirket sicilden silinmesi ne anlama gelir
8. Bu site veriyi nasıl topluyor ve doğruluyor

---

## 10. Alarm sistemi

### 10.1 Akış

```
ingest tamamlandı
  → yeni record id'leri toplandı
  → her aktif alert için eşleşme sorgusu
  → kullanıcı bazında grupla (bir kişi 5 alarma sahipse tek mail)
  → Resend batch API ile gönder
  → alert_deliveries'e yaz
```

### 10.2 Eşleştirme sorgusu

```sql
SELECT a.id, a.user_id, array_agg(r.id) AS matched
FROM alerts a
JOIN records r ON r.id = ANY($1::bigint[])       -- yeni kayıtlar
LEFT JOIN record_topics rt   ON rt.record_id = r.id
LEFT JOIN record_entities re ON re.record_id = r.id
WHERE a.is_active
  AND (
        (a.query IS NOT NULL AND r.search_vector @@ websearch_to_tsquery('tr_rg', a.query))
     OR (cardinality(a.topics)     > 0 AND rt.topic     = ANY(a.topics))
     OR (cardinality(a.doc_types)  > 0 AND r.doc_type   = ANY(a.doc_types))
     OR (cardinality(a.entity_ids) > 0 AND re.entity_id = ANY(a.entity_ids))
  )
GROUP BY a.id, a.user_id;
```

Arama ve alarm aynı `tsvector`/`tsquery` altyapısını kullanıyor. Kullanıcının arama sonucunda gördüğü ile alarmda alacağı şey **birebir aynı** — bu, ürünün güven kazandığı yer.

### 10.3 E-posta

Sağlayıcı Resend. Ücretsiz katman: **aylık 3.000, günlük 100, tek domain.** Bağlayıcı olan günlük tavan — aylık kotayı doldurmadan ona takılırsın. İlk ücretli basamak $20/ay ve 50.000 e-posta.

Ürün ücretsiz olduğu için e-posta hacmi bir maliyet kalemi, dolayısıyla tasarımın bir kısıtı. Kurallar:

1. **Varsayılan frekans haftalık, günlük değil.** Günlük digest 100 abonede tavana çarpar. Haftalık ise gün bazında dağıtılabilir.
2. **Haftanın gününe göre dağıtım.** Kullanıcı `hash(user_id) % 7` ile bir güne atanır. Böylece 7 × 100 = haftada ~700 gönderim mümkün olur ve hiçbir gün tavan aşılmaz. Kullanıcı isterse gününü değiştirebilir.
   **Arayüz kuralı:** Onay ekranında ve takip yönetiminde **kullanıcıya atanan gerçek gün** gösterilir ("İlk özet 7 Ocak çarşamba sabahı gelecek"). Herkese sabit "pazartesi" yazılamaz; dağıtımın anlamı kalmaz ve verilen söz tutulmaz.
3. **Eşleşme yoksa mail yok.** "Bu hafta yeni kayıt bulunamadı" maili asla gönderilmez. Hem daha iyi deneyim hem gerçek gönderim sayısını belirgin biçimde düşürür.
4. **Kota bekçisi.** Gönderim öncesi o günün `alert_deliveries` sayısı kontrol edilir. Tavana yaklaşıldıysa kalan gönderimler ertesi güne ertelenir ve `status = 'deferred'` olarak loglanır. Sessizce düşürülmez.
5. **Günlük frekans opsiyonel ama sınırlı.** Kullanıcı seçebilir; ancak günlük abone sayısı 60'ı geçince yeni günlük talepleri kapatılır ve haftalığa yönlendirilir. Neden 60: kota bekçisine pay bırakmak için.
6. `instant` frekans kapalı. Her ingest sonrası mail hem spam riski hem kota israfı.

Diğer teknik kurallar:

- Batch API ile istek başına 100 alıcı.
- **Zorunlu:** her mailde tek tıkla abonelikten çıkma linki ve `List-Unsubscribe` header'ı.
- Şablon: sade HTML, kayıt başına başlık + künye + link. Maksimum 15 kayıt, fazlası "ve {N} kayıt daha" linkiyle.
- Gönderim penceresi kullanıcının `digest_hour` tercihine göre, varsayılan 08:00 TRT.

**Ne zaman ücretli plana geçilir:** AdSense aylık geliri $20'yi düzenli olarak geçtiğinde. O ana kadar yukarıdaki kısıtlar ürünü ücretsiz katmanda tutar. `alerts` tablosuna `preferred_weekday smallint` kolonu eklenir.

> **ToS notu:** Resend'in transactional ve marketing ürünleri ayrı. Kampanya/bülten tipi toplu gönderimi transactional plandan yapmak kullanım şartlarına aykırı. Bizim digest'lerimiz kullanıcıya özel (herkesin eşleşen kaydı farklı), yani teknik olarak transactional tarafa düşüyor. Yine de ileride herkese aynı içeriği gönderen bir bülten yapılacaksa **marketing ürününe** geçilmeli — orada ücretsiz katman 1.000 kişiye kadar sınırsız gönderim veriyor.

### 10.4 RSS

Her liste sayfası için RSS: `/konu/[konu]/rss.xml`, `/kurum/[slug]/rss.xml`, `/sirket/[slug]/rss.xml`, `/yer/[slug]/rss.xml`, `/rss.xml`. `<link rel="alternate" type="application/rss+xml">` head'de.

RSS, e-posta kotasından bağımsız **sınırsız ve sıfır maliyetli** bildirim kanalı. Ücretsiz ürün modelinde bu onu ikincil bir özellik olmaktan çıkarıp birinci sınıf bir kanal yapıyor:

- Her konu ve varlık sayfasında RSS linki görünür şekilde durur, dipnotta gizlenmez
- `/rehber/rss-nasil-kullanilir` sayfası yazılır (aynı zamanda SEO içeriği)
- Alarm kurma akışında "e-posta yerine RSS ile takip et" seçeneği eşit ağırlıkta sunulur
- Haber siteleri ve Telegram kanalları için besleme kaynağı olur; bu backlink ve marka bilinirliği getirir

---

## 11. Rendering ve cache stratejisi

### 11.1 Sayfa bazında

| Sayfa                       | Strateji                   | revalidate                              |
| --------------------------- | -------------------------- | --------------------------------------- |
| `/`                         | ISR + tag                  | 1 saat, `revalidateTag('latest')`       |
| `/karar/[slug]`             | ISR, `dynamicParams: true` | 30 gün                                  |
| `/sayilar/[yil]/[sayi]`     | ISR, `dynamicParams: true` | 30 gün                                  |
| `/konu/[konu]`              | ISR + tag                  | 1 saat, `revalidateTag('topic:{slug}')` |
| `/kurum`, `/sirket`, `/yer` | ISR, `dynamicParams: true` | 7 gün                                   |
| `/ara`                      | Dinamik (`force-dynamic`)  | —                                       |
| `/takip`, `/hesap`          | Dinamik, auth              | —                                       |

`generateStaticParams` **sadece son 12 ayın** kayıtlarını döndürür. 100.000 sayfayı build time'da üretmek Vercel build süresini kabul edilemez hale getirir; gerisi ilk istekte on-demand üretilir ve cache'lenir.

### 11.2 Global durum bandı — donma yasağı

Ana sayfada ve tüm sayfaların üstünde "son güncelleme / bugün N yeni kayıt" gibi bir bant olacaksa, bu **statik render'ın parçası olamaz**. İki kabul edilebilir yol:

1. Client component olarak `/api/status`'tan çek (küçük payload, LCP'yi etkilemez)
2. Ingest sonrası **etkilenen tüm tag'leri** revalidate et — sadece ana sayfayı değil

Ingest bittiğinde çağrılacak revalidation listesi açıkça tanımlıdır:

```
revalidateTag('latest')
revalidateTag('topic:{her etkilenen konu}')
revalidateTag('entity:{her etkilenen varlık}')
revalidatePath('/sayilar/{yıl}')
revalidatePath('/sayilar/{yıl}/{sayı}')
revalidatePath('/')
```

> Bu bölüm, kesintimivar.com'da ana sayfa "3 bölgede kesinti var" derken bölge sayfasının "kesinti yok" demesine yol açan ISR tutarsızlığının tekrarını engellemek için var. Aynı veriden iki farklı cevap veren iki sayfa, ürünün güvenilirliğini tek seferde bitirir.

### 11.3 Kabul testi

CI'da bir smoke test: ingest simüle edildikten sonra `/`, `/konu/munhal` ve `/sayilar/{yıl}` sayfalarının hepsi aynı "son sayı numarası"nı raporlamalı.

---

## 12. Klasör yapısı

Tüm dosya ve klasör adları kebab-case. Her component kendi klasöründe `index.tsx` olarak.

```
.
├── .github/
│   └── workflows/
│       ├── daily-ingest.yml
│       ├── backfill.yml
│       ├── dispatch-alerts.yml
│       └── ci.yml
├── supabase/
│   └── migrations/
│       ├── 0001-extensions.sql
│       ├── 0002-search-config.sql
│       ├── 0003-core-tables.sql
│       ├── 0004-entities.sql
│       ├── 0005-alerts.sql
│       └── 0006-rls-policies.sql
├── scripts/
│   ├── crawl-archive/index.ts
│   ├── fetch-pdf/index.ts
│   ├── extract-text/index.ts
│   ├── parse-records/index.ts
│   ├── classify/index.ts
│   ├── extract-entities/index.ts
│   ├── dispatch-alerts/index.ts
│   ├── revalidate/index.ts
│   └── shared/
│       ├── supabase-admin.ts
│       ├── turkish-text.ts
│       ├── slugify.ts
│       └── logger.ts
├── fixtures/
│   ├── issues/                     # 25 gerçek RG sayısı
│   └── expected/                   # elle hazırlanmış beklenen çıktılar
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── opengraph-image.tsx
│   │   ├── ara/page.tsx
│   │   ├── karar/[slug]/page.tsx
│   │   ├── sayilar/page.tsx
│   │   ├── sayilar/[yil]/page.tsx
│   │   ├── sayilar/[yil]/[sayi]/page.tsx
│   │   ├── konu/[konu]/page.tsx
│   │   ├── konu/[konu]/[yil]/page.tsx
│   │   ├── konu/[konu]/rss.xml/route.ts
│   │   ├── kurum/[slug]/page.tsx
│   │   ├── sirket/[slug]/page.tsx
│   │   ├── yer/[slug]/page.tsx
│   │   ├── rehber/page.tsx
│   │   ├── rehber/[slug]/page.tsx
│   │   ├── takip/page.tsx
│   │   ├── hesap/page.tsx
│   │   ├── hakkinda/page.tsx
│   │   ├── iletisim/page.tsx
│   │   ├── gizlilik/page.tsx
│   │   ├── kullanim-kosullari/page.tsx
│   │   ├── rss.xml/route.ts
│   │   └── api/
│   │       ├── status/route.ts
│   │       ├── search-suggest/route.ts
│   │       ├── alerts/route.ts
│   │       └── revalidate/route.ts
│   ├── components/
│   │   ├── site-header/index.tsx
│   │   ├── site-footer/index.tsx
│   │   ├── search-box/index.tsx
│   │   ├── search-filters/index.tsx
│   │   ├── search-results/index.tsx
│   │   ├── record-card/index.tsx
│   │   ├── record-detail/index.tsx
│   │   ├── record-meta-bar/index.tsx
│   │   ├── record-list/index.tsx
│   │   ├── issue-card/index.tsx
│   │   ├── issue-contents/index.tsx
│   │   ├── topic-strip/index.tsx
│   │   ├── topic-badge/index.tsx
│   │   ├── entity-chip/index.tsx
│   │   ├── entity-header/index.tsx
│   │   ├── follow-button/index.tsx
│   │   ├── alert-form/index.tsx
│   │   ├── alert-list/index.tsx
│   │   ├── breadcrumbs/index.tsx
│   │   ├── pagination/index.tsx
│   │   ├── year-nav/index.tsx
│   │   ├── source-notice/index.tsx
│   │   ├── text-quality-badge/index.tsx
│   │   ├── empty-state/index.tsx
│   │   ├── status-bar/index.tsx
│   │   └── ui/                     # shadcn/ui
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle
│   │   │   └── queries/
│   │   │       ├── records.ts
│   │   │       ├── issues.ts
│   │   │       ├── entities.ts
│   │   │       ├── topics.ts
│   │   │       └── alerts.ts
│   │   ├── search/
│   │   │   ├── build-query.ts
│   │   │   ├── synonyms.ts
│   │   │   └── highlight.ts
│   │   ├── seo/
│   │   │   ├── config.ts           # SITE_URL tek kaynak
│   │   │   ├── metadata.ts
│   │   │   ├── json-ld.ts
│   │   │   └── sitemap-chunks.ts
│   │   ├── text/
│   │   │   ├── turkish-lower.ts
│   │   │   ├── slugify.ts
│   │   │   └── truncate.ts
│   │   └── constants/
│   │       ├── topics.ts
│   │       ├── doc-types.ts
│   │       └── sections.ts
│   ├── types/
│   │   ├── record.ts
│   │   ├── issue.ts
│   │   ├── entity.ts
│   │   └── alert.ts
│   └── styles/
│       └── globals.css
├── public/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 13. Performans hedefleri

| Metrik                  | Hedef         |
| ----------------------- | ------------- |
| LCP (kayıt sayfası, 4G) | < 1.8 s       |
| INP                     | < 200 ms      |
| CLS                     | < 0.05        |
| Arama yanıtı (p95)      | < 400 ms      |
| Sayfa ağırlığı (JS)     | < 120 KB gzip |

Kurallar: kayıt ve liste sayfaları tamamen server component. Client component yalnızca arama kutusu, filtreler, takip butonu ve durum bandı. Font `next/font` ile self-host, tek aile. Görsel neredeyse yok (metin ürünü) — bu doğal bir performans avantajı, korunmalı. AdSense **lazy**, ilk ekranın altında.

---

## 14. Gelir modeli ve maliyet tavanı

Ürünün tek geliri Google AdSense. Ücretli plan, paywall veya kullanım limiti yok ve olmayacak. Bu, iki şeyi doğrudan belirliyor: **maliyetin sabit ve düşük kalması gerekiyor**, ve **sayfa görüntüleme tek büyüme metriği**.

### 14.1 Aylık maliyet

| Kalem              | Ücretsiz katman          | Ne zaman ücretliye geçilir                                                                             | Ücretli maliyet |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------ | --------------- |
| Vercel             | Hobby                    | **Baştan Pro.** Hobby planı ticari olmayan kişisel projeler için; reklam gösteren site ticari sayılır. | $20/ay          |
| Supabase           | Free (500 MB DB)         | ~60–80 bin kayıttan sonra                                                                              | $25/ay          |
| Resend             | Free (3.000/ay, 100/gün) | AdSense geliri $20'yi geçince                                                                          | $20/ay          |
| GitHub Actions     | Public repo'da ücretsiz  | —                                                                                                      | $0              |
| Domain             | —                        | —                                                                                                      | ~$12/yıl        |
| **Toplam (tavan)** |                          |                                                                                                        | **~$66/ay**     |

**Vercel Hobby uyarısı ciddi.** AdSense kodunu Hobby planındaki bir siteye koymak kullanım şartlarını ihlal eder ve proje askıya alınabilir. Reklam eklendiği gün Pro'ya geçilmiş olmalı. Bu, listedeki tek gerçekten kaçınılmaz kalem.

### 14.2 Başabaş noktası

Türkçe içerik ve KKTC ağırlıklı trafikte gerçekçi RPM aralığı $1–3. $2 RPM varsayımıyla $66'lık maliyeti karşılamak için **aylık ~33.000 sayfa görüntüleme** gerekiyor. Bölüm 1.2'deki 35.000 hedefi bu hesaptan geliyor, rastgele seçilmedi.

İlk 6 ayda başabaşa ulaşılamayabilir. Bu durumda maliyet kalemleri sırayla ertelenir: önce Supabase Free'de kalınır (backfill yavaşlatılır), Resend Free'de kalınır (haftalık digest + RSS yeterli). Ertelenemeyen tek kalem Vercel Pro.

### 14.3 Maliyeti düşük tutan mimari kararlar

Bunlar spec'in başka yerlerinde de geçiyor, burada gerekçesiyle toplanıyor:

- **PDF saklanmıyor** (3.6). Saklansaydı ~10 GB olurdu; Supabase Storage'da bu tek başına ücretli plan demekti.
- **`body_text` 20 KB'de kesiliyor.** Çok uzun kayıtlarda ilk 20 KB saklanır, devamı için PDF'e yönlendirilir. 100 bin kayıtta bu, veritabanını 500 MB sınırının altında tutmanın ana kaldıracı.
- **Neredeyse tamamen statik render** (11.1). Kayıt ve liste sayfaları ISR ile cache'lenir; Vercel function çağrısı sadece arama, alarm ve API rotalarında olur.
- **Görsel yok.** Metin ürünü olduğu için bant genişliği doğal olarak düşük. `opengraph-image` dışında raster görsel kullanılmaz.
- **Ingest GitHub Actions'ta**, Vercel'de değil. Ağır iş (indirme, OCR) faturasız runner'da çalışır.

### 14.4 AdSense yerleşimi

| Konum                              | Format             | Kural                         |
| ---------------------------------- | ------------------ | ----------------------------- |
| Kayıt sayfası, metnin altı         | Responsive display | İçerik bitmeden reklam gelmez |
| Liste sayfaları, 5. sonuçtan sonra | In-feed            | Sayfa başına tek adet         |
| Yan sütun (masaüstü)               | Sticky değil       | Mobilde gösterilmez           |

Kesin kurallar:

- **İlk ekranda reklam yok.** LCP hedefi 1.8 s; üstte reklam bunu bitirir.
- **Yer ayrılmış container.** Reklam alanı sabit yükseklikte bir kutuya yerleşir, CLS 0.05 hedefi korunur.
- **Lazy load.** Reklam scripti viewport'a yaklaşınca yüklenir.
- **Arama sonuç sayfasında en fazla bir reklam.** Sonuçları reklamla karıştırmak hem kullanıcıyı hem AdSense politikasını ihlal eder.
- `public/ads.txt` yayına alınır.

### 14.5 AdSense onay riski

Bu, ürünün en gerçek ticari riski. Site 100 bin civarı **otomatik üretilmiş** sayfadan oluşacak ve Google'ın "ölçekli içerik kötüye kullanımı" politikası tam olarak bunu hedefliyor. Kamu belgelerini yeniden yayımlamak meşru bir kullanım (hukuki veritabanları yıllardır bunu yapıyor), ancak başvuru sırasında sitenin _sadece_ bir PDF dökümü gibi görünmemesi gerekiyor.

Azaltıcı önlemler:

1. **Başvuruyu erken yapma.** Milestone 4 tamamlanmadan, yani rehber içerikleri yazılmadan ve varlık sayfaları çalışmadan başvurma.
2. **Rehber içerikleri başvurudan önce hazır olsun.** 8 özgün, elle yazılmış rehber (bölüm 9.7) sitenin "sadece kazınmış içerik" olmadığının kanıtı.
3. **İnce içerik kuralı uygulanmış olsun** (8.2). 200 karakterden kısa kayıtlar kendi sayfasını almaz.
4. **Konu açıklamaları özgün olsun.** Her konu sayfasında 2–3 cümle elle yazılmış açıklama.
5. **Aracın kendisi görünür olsun.** Arama, filtreler, alarm, RSS — bunlar sitenin bir yayın değil bir araç olduğunu gösterir.
6. **Kaynak şeffaflığı.** Her sayfada orijinal PDF linki ve "bağlayıcı olan orijinal metindir" ibaresi.

**Onay gelmezse ne olur:** Alternatif olarak Ezoic veya doğrudan yerel sponsorluk (KKTC'de muhasebe yazılımı, hukuk bürosu, emlak firması) değerlendirilir. Bu senaryo için sitede statik bir sponsor alanı bileşeni hazır tutulur.

---

## 15. Yol haritası

### Milestone 1 — Boru hattı (1–2 hafta)

Supabase şeması, arşiv crawler, PDF indirme, `pdftotext` + OCR, ayrıştırıcı + fixture testleri. Çıktı: 2026 verisi veritabanında, arayüz yok.

### Milestone 2 — Münhal MVP (1–2 hafta)

`/`, `/konu/munhal`, `/karar/[slug]`, `/ara`. Sitemap, robots, JSON-LD. Search Console'a gönder. **Kamuya açılış burası** — tek konuyla çık, geri bildirim al.

### Milestone 3 — Alarmlar (1 hafta)

Auth, `/takip`, alarm eşleştirme, Resend, RSS.

### Milestone 4 — Tam kapsam (2 hafta)

Kalan konular, varlık sayfaları (kurum/şirket/yer), `/sayilar/*`, rehber içerikleri. **AdSense başvurusu bu milestone'un sonunda yapılır**, öncesinde değil (14.5).

### Milestone 5 — Backfill (arka planda sürekli)

2025'ten geriye 2006'ya. Her yıl tamamlandığında sitemap'e ekle. OCR kalite raporu.

---

## 16. Riskler

| Risk                                     | Etki                | Önlem                                                                                                   |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| Eski PDF'ler OCR ile de okunamıyor       | Arşiv değeri düşer  | Başlık zaten arşiv HTML'inde var; metin olmasa da kayıt sayfası üretilebilir. En yeniden eskiye ilerle. |
| `basimevi.gov.ct.tr` yapısını değiştirir | Ingest kırılır      | Ayrıştırıcı için sağlık kontrolü: günlük çalışmada 0 sayı bulunursa alarm maili at                      |
| Kaynak site erişimi engeller             | Ürün durur          | Nazik rate limit, kendini tanıtan User-Agent, kurumla önden iletişim kur                                |
| Kayıt sayfaları ince içerik sayılır      | Google indekslemez  | 200 karakter kuralı (8.2), özgün konu açıklamaları, güçlü iç linkleme                                   |
| Kişisel veri şikayeti                    | Hukuki              | Bölüm 3.7 kuralları, açık kaldırma kanalı                                                               |
| GitHub Actions dakika limiti             | Backfill durur      | Public repo veya lokal backfill                                                                         |
| Postgres arama kalitesi yetersiz         | Ana özellik zayıf   | `search_logs` ile boş-sonuç oranını ölç; %15'i geçerse Meilisearch'e geç (şema hazır)                   |
| Yasal metin yanlış anlaşılır             | İtibar              | Her sayfada "bağlayıcı olan orijinal metindir" + PDF linki                                              |
| **AdSense başvurusu reddedilir**         | Gelir sıfır         | Bölüm 14.5 önlemleri; yedek olarak Ezoic veya yerel sponsorluk                                          |
| **Trafik başabaşa ulaşmaz**              | Cepten finansman    | Maliyet kalemleri sırayla ertelenir; ertelenemeyen tek kalem Vercel Pro ($20/ay)                        |
| **E-posta kotası dolar**                 | Alarm gecikir       | Kota bekçisi ertelenen gönderimleri loglar (10.3); RSS sınırsız yedek kanal                             |
| Vercel Hobby'de reklamla yakalanmak      | Proje askıya alınır | Reklam eklendiği gün Pro'ya geçilmiş olmalı, istisnasız                                                 |
| Supabase 500 MB sınırı aşılır            | Yazma durur         | `body_text` 20 KB kesme kuralı; sınıra %80'de uyarı alarmı kur                                          |

---

## 17. Açık kararlar

1. **Domain ve marka — geçici olarak karara bağlandı: `mevzuatkibris.com`, marka "Mevzuat Kıbrıs".** Tasarım ve geliştirme bunun üzerinden ilerler. Gözden geçirilecek noktalar: (a) "mevzuat" kelimesi ürünü olduğundan dar gösteriyor — sitenin içeriğinin büyük kısmı münhal, ihale ve şirket duyurusu, yani dar anlamda mevzuat değil; (b) buna karşılık `resmigazete` içeren bir alan adı arama eşleşmesinde daha güçlü olurdu ama resmî kurum sanılma riski taşır. Marka adı kod içinde tek bir sabitte tutulur (`src/lib/seo/config.ts`), değişim maliyeti düşük kalsın.
2. **Backfill'in ne kadar geriye gideceği.** 2006 hedef, ama 2015 öncesi OCR maliyeti ölçüldükten sonra karar verilir.
3. **`instant` alarm frekansı** v2'ye bırakıldı; talep gelirse ve e-posta kotası izin verirse öne alınır.
4. **Bağış / destek butonu.** Ücretsiz kalma sözü verilirken altyapı maliyetini şeffaf paylaşıp gönüllü destek kabul etmek (Buy Me a Coffee, IBAN) düşünülebilir. Paywall değil, ürünü değiştirmiyor. Karar ertelendi.
