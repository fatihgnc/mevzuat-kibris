# Mevzuat Kıbrıs

KKTC Resmî Gazete arama ve takip platformu. Ürün ve teknik karar gerekçeleri
[SPEC.md](SPEC.md) içinde; bu dosya yalnızca çalıştırma talimatı.

Arayüz `Mevzuat Kıbrıs.dc.html` tasarım artboard'larından uygulandı.

---

## Hızlı başlangıç

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run db:migrate           # şema + arama config + RLS
npm run db:seed              # fixtures'tan örnek veri
npm run dev
```

Veritabanı olmadan `npm run build` "collecting page data" aşamasında durur —
liste ve kayıt sayfaları ISR ile build sırasında render ediliyor.

### Yerel Postgres

Supabase yerine yerel Postgres kullanacaksanız `unaccent` ve `pg_trgm`
eklentileri gerekiyor; ikisi de standart `postgres:16` imajında var.

```bash
docker run -d --name mk-pg -p 55432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mevzuat postgres:16
```

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/mevzuat
```

Yerelde `DATABASE_URL_POOLED` gerekmiyor — pooler yok, uygulama da aynı URL'e
düşüyor. Supabase'de ikisi de gerekli; gerekçesi `.env.example` içinde.

Port 55432 seçildi ki makinede zaten çalışan bir Postgres varsa çakışmasın.
Kap `docker stop mk-pg` ile durur, `docker start mk-pg` ile veriyi kaybetmeden
geri gelir.

`db:migrate`, Supabase'de hazır gelen `auth` şemasını ve `auth.uid()`
fonksiyonunu yerelde bulamazsa geçici bir gölge kuruyor; RLS politikaları
(migration 0006) bu sayede yerelde de uygulanabiliyor.

---

## Komutlar

| Komut                    | Ne yapar                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Geliştirme sunucusu                                            |
| `npm run build`          | Üretim derlemesi (veritabanı gerekir)                          |
| `npm run typecheck`      | `tsc --noEmit`                                                 |
| `npm run lint`           | ESLint                                                         |
| `npm test`               | Ayrıştırma fixture testleri — spec 7.3 uyarınca **zorunlu**    |
| `npm run db:migrate`     | `supabase/migrations/*.sql` sırayla çalıştırır                 |
| `npm run db:seed`        | `fixtures/` içeriğinden örnek kayıt üretir                     |
| `npm run db:reset`       | Şemayı sıfırlayıp yeniden kurar ve tohumlar                    |
| `npm run ingest:daily`   | Tam ingest hattı (yıl parametresi opsiyonel)                   |
| `npm run ingest:backfill`| Bir yılın işlenmemiş sayıları (`<yıl> [--skip-crawl]`)         |
| `npm run reclassify`     | Saklanan başlıklardan belge türü ve konuları yeniden hesaplar  |
| `npm run summarize`      | Özetsiz kayıtlar için kademeli özet üretimi (spec 3.8)         |
| `npm run alerts:dispatch`| Alarm eşleştirme ve e-posta gönderimi                          |

Ingest'in `pdftotext`, `ocrmypdf`, `tesseract-ocr-tur` ve `ghostscript`
araçlarına ihtiyacı var (spec 7.2). GitHub Actions workflow'u bunları kendisi
kuruyor; yerelde ingest çalıştıracaksanız elle kurmanız gerekiyor.

Windows'ta (yönetici PowerShell):

```powershell
choco install -y ghostscript tesseract
curl.exe -L -o "C:\Program Files\Tesseract-OCR\tessdata\tur.traineddata" `
  https://github.com/tesseract-ocr/tessdata/raw/main/tur.traineddata
pip install --user ocrmypdf
```

`pip`'in kurduğu `ocrmypdf.exe` PATH'te olmalı — `commandExists` onu PATH'ten
arıyor ve bulamazsa OCR'ı sessizce atlayıp sayıyı `failed` damgalıyor.

### `npm run summarize`

Özeti olmayan kayıtları kademeli üretimle dolduruyor (spec 3.8): önce kural
katmanı, tutmazsa LLM, o da olmazsa özet yok. `OPENAI_API_KEY` gerekiyor;
anahtar yokken betik çalışmıyor ama ingest ve kural katmanı etkilenmiyor.

| Bayrak | Ne yapar |
| --- | --- |
| `--dry`   | Hiç çağrı yapmaz, kaç grup ve kaç kayıt olduğunu sayar |
| `--limit` | İlk N grup — gerçek anahtarla ilk denemede kullanın |
| `--year`  | Tek yıl |
| `--retry` | Daha önce reddedilenleri de yeniden dener (istem/denetim değiştiyse) |

Çalıştırma sonunda `declinedBy` kırılımı basılıyor: hangi denetimin kaç kez
tuttuğu. **Tek bir sebep baskınsa bu neredeyse her zaman denetimdeki bir hatadır,
modelin davranışı değil** — iki hata tam olarak böyle bulundu (`baslikla-ayni` ve
`cok-cumle` ikisi birlikte gerçek bir çalıştırmanın dörtte birini çöpe atıyordu).
`model-declined` beklenen sonuçtur: model o başlıktan güvenli özet çıkmadığını
söylüyor ve kayıt 3. basamağa düşüyor.

Hız, `OPENAI_TPM` ile sınırlanıyor. İstek başına ~1.000 token gidiyor (sistem
istemi her çağrıda yeniden gönderiliyor), yani 200.000 TPM'de tavan dakikada
~165 istek. Betik bu bütçeyi kendisi gözetiyor; sınırı aşıp 429 yemiyor.

Aynı başlık bir kez soruluyor — hem koşum içinde hem **koşumlar arasında**: her
koşum, mevcut bir özeti aynı istemi üretecek yeni kayıtlara hiç çağrı yapmadan
kopyalayarak başlıyor (`mevcut özetten dolduruldu` satırı). Kesilirse kaldığı
yerden devam ediyor; ödenmiş çağrı ikinci kez ödenmiyor.

**Aynı anda iki koşum çalıştırma.** İkisi de aynı sırayla ilerlediği için aynı
grupları sorar, öndeki yazar, arkadaki ürettiğini çöpe atar — fatura iki katına
çıkar. Belirtisi: ilerleme satırında `records` sayısı `llm` sayısından belirgin
düşükse başka bir koşum aynı grupları dolduruyordur.

---

## Mimarinin okunması gereken yerleri

Aşağıdakiler spec'te gerekçesi uzun uzun anlatılmış, kodda tek bir yerde duran
kararlar. Değiştirmeden önce ilgili bölümü okuyun.

| Dosya                                    | Neyi tutuyor                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/seo/config.ts`                  | Marka, domain ve **arşiv başlangıç yılı** — tek kaynak (spec 8.4)            |
| `supabase/migrations/0002-search-config.sql` | `tr_rg` arama config'i, ölçüm ve zorunlu kabul testleri (aşağıya bakın)  |
| `supabase/migrations/0007-search-functions.sql` | `mk_tsquery()` — önek + eşanlamlı; arama ve alarm aynı fonksiyonu kullanır |
| `src/lib/search/mask-title.ts`           | Ham gazete başlığının maskelenmesi (spec 3.8, artboard 1a)                   |
| `src/lib/db/queries/shared.ts`           | `inList` / `arrayParam` — dizi parametrelerinin tek güvenli yolu             |
| `scripts/summarize/rules.ts`             | Özet cümle üretimi — sonuç bildirmez (spec 3.8 kural 1)                      |
| `scripts/shared/deadline.ts`             | Son başvuru tarihi; belirsizse boş bırakır (spec 3.9)                        |
| `src/app/api/revalidate/route.ts`        | Etkilenen **tüm** tag'lerin tazelenmesi (spec 11.2)                          |
| `scripts/dispatch-alerts/index.ts`       | E-posta kota bekçisi ve haftanın gününe dağıtım (spec 10.3)                  |

---

## Spec'ten sapma: arama yapılandırması

Spec 5.1 "PostgreSQL Türkçe stemmer'ı hazır getiriyor" diyor ve 5.2 zinciri
`unaccent + turkish_stem` olarak veriyor. Bu varsayım gerçek Postgres 16
üzerinde ölçüldü ve **tutmadı**; `turkish_stem` bu korpusta ünlüyle biten
gövdeleri bozuyor:

```
yasa -> 'yas'     yasanın -> 'yasa'     yasası -> 'yasas'    (üçü ayrı)
ihale -> 'ihal'   ihaleye -> 'ihale'                          (ayrı)
arsa -> 'ar'      fonu -> 'fo'          tasfiye -> 'tasfi'
```

Ayrıca `unaccent`'i stemmer'dan önce koymak stemmer'ı ayrıca bozuyor: snowball
Türkçe eki tanımak için ünlü uyumuna bakıyor, ı/i ve ü/u ayrımı silinince ek
tanınmıyor (`münhaller -> munhaller`, `tüzüğü -> tuzugu`).

18 gerçek sorgu/belge çiftinde ölçülen isabet:

| Yapılandırma                        | İsabet    |
| ----------------------------------- | --------- |
| `unaccent + turkish_stem` (spec)    | 11/18     |
| `unaccent + simple`, tam eşleşme    | 8/18      |
| **`unaccent + simple`, önek eşleşmesi** | **17/18** |

Seçilen: `unaccent + simple` + önek eşleşmesi. Türkçe eklemeli bir dil ve ekler
sona geldiği için `terim:*` gövdelemenin işini daha isabetli ve yan etkisiz
yapıyor. Önek üretimi, eşanlamlı genişletme ve ünsüz yumuşaması köprüleri
(`tüzük -> tüzüğünde`) `mk_tsquery()` fonksiyonunda toplandı
(`supabase/migrations/0007-search-functions.sql`).

Eşanlamlılar spec 5.2'nin önerdiği gibi uygulama katmanında değil, bir SQL
tablosunda (`search_synonyms`): alarm eşleştirmesi de aynı fonksiyondan geçmek
zorunda, yoksa spec 10.2'nin "aramada gördüğün ile alarmda aldığın aynıdır"
vaadi bozulurdu.

Kalan bilinen boşluk migration'ın başında yazılı. Spec 5.1'in çıkış kapısı
geçerliliğini koruyor: kalite `search_logs` ile ölçülüyor, boş-sonuç oranı
%15'i geçerse Meilisearch'e geçilir (spec 16).

---

## Bilinen fark: arşiv başlangıç yılı

Tasarım artboard'ı arşiv kapsamını **1975** olarak gösteriyor ("Kıbrıs Türk
Federe Devleti dönemi dahil"). Spec 3.1 ise kaynak arşivin `basimevi.gov.ct.tr`
üzerinde **2006**'dan itibaren yayımlandığını söylüyor.

Kodda `ARCHIVE_START_YEAR = 2006` (`src/lib/seo/config.ts`). Gerekçe: spec 8.4
kapsam iddiasının gerçeğe uygun olmasını açıkça şart koşuyor — kullanıcı kapsam
dışı bir yılı aratıp boş sonuç aldığında güven tek seferde bitiyor.

Tasarımın *mekanizması* aynen uygulandı: kapsam yılı hiçbir sayfada sabit metin
değil, hepsi bu tek sabitten besleniyor. 2006 öncesi veri bulunursa değişecek
tek şey o satır.

---

## Ortam değişkenleri

`.env.example` tam listeyi içeriyor. Üretimde zorunlu olanlar:

- `DATABASE_URL` — Supabase bağlantı dizesi (ingest ve sorgular)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — auth
- `SUPABASE_SERVICE_ROLE_KEY` — ingest yazımı
- `RESEND_API_KEY` — alarm e-postaları
- `REVALIDATE_SECRET` — ingest sonrası on-demand revalidation
- `NEXT_PUBLIC_SITE_URL` — canonical'ın tek kaynağı

`NEXT_PUBLIC_ADSENSE_CLIENT` boşsa reklam basılmaz, yalnızca ayrılmış kutu
görünür. AdSense başvurusu Milestone 4 tamamlanmadan yapılmamalı (spec 14.5).
