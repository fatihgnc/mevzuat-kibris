# Resmî Gazete PDF erişimi — izin talebi taslağı

**Bu bir taslaktır, göndermeden önce oku ve düzenle.** Aşağıda üç şey var:
kullanım notları, uzun mektup (resmî yazı / e-posta), ve kısa sürüm.

Hukuk danışmanlığı değildir. KKTC mevzuatı ve sitenin kullanım şartları ayrıca
kontrol edilmeli.

---

## Göndermeden önce

**1. Muhatabı doğrula.** Resmî Gazete'yi Devlet Basımevi yayımlıyor ama yazının
kime gideceği (Basımevi Müdürlüğü mü, bağlı olduğu Bakanlık mı, Bilgi İşlem mi)
teyit edilmeli. `basimevi.gov.ct.tr` üzerindeki iletişim sayfasından ya da
telefonla sorulabilir. Yanlış birime giden yazı cevapsız kalır.

**2. Yaptığını söyleme kararı.** Taslak, 2025 yılının çekildiğini açıkça
söylüyor. Gerekçesi:

- Kullandığın `User-Agent` kendini tanıtıyor ve alan adın ile e-postan içinde:
  `MevzuatKibris arsiv botu (+https://mevzuatkibris.com/hakkinda; iletisim@…)`.
  Basımevi'nin erişim kayıtlarında kim olduğun zaten yazılı.
- Söylememek, sonradan fark edilirse asıl eylemden çok daha fazla zarar verir.
- Kendiliğinden söylemek iyi niyetin en ucuz kanıtı.

Bunu çıkarmak istersen ilgili paragrafı sil — ama yukarıdaki üç maddeyi bir
kez daha oku.

**3. Ekleyeceğin somut değer.** Taslakta kırık bağlantı listesi öneriliyor.
Bu blöf değil: 2018 sayı 130'un PDF bağlantısı (`/Portals/105/2018/130.pdf`)
HTTP 404 veriyor ve o yılın yol yapısı diğerlerinden farklı. Göndermeden önce
tüm yılları tarayıp gerçek listeyi çıkarırsan yazı çok daha ciddiye alınır.

**4. Abartma.** Ürün henüz yayında değil. "Hizmet veriyoruz" değil,
"hazırlıyoruz" de. Taslak buna göre yazıldı.

---

## Uzun sürüm (resmî yazı / e-posta)

> **Konu:** KKTC Resmî Gazete arşivine erişim izni talebi
>
> Sayın Yetkili,
>
> Kuzey Kıbrıs Türk Cumhuriyeti Resmî Gazetesi'ni yurttaşlar ve meslek
> mensupları için aranabilir hâle getirmeyi amaçlayan bağımsız bir arşiv
> çalışması yürütüyorum: **Mevzuat Kıbrıs** (mevzuatkibris.com). Çalışma
> ticari bir kuruluşa ait değil, resmî bir sıfat taşımıyor ve Basımevi ile
> herhangi bir bağlantısı olduğu iddiasında bulunmuyor.
>
> **Talebim:** basimevi.gov.ct.tr üzerinde yayımlanan Resmî Gazete PDF
> dosyalarına, metinlerinin aranabilir dizine dönüştürülmesi amacıyla düzenli
> ve sınırlı erişim izni.
>
> **Neden yazıyorum.** Sitenizin `robots.txt` dosyası `/Portals/` dizinini
> otomatik erişime kapatıyor; PDF dosyaları bu dizinde bulunuyor. Söz konusu
> kuralın, sitenizin kurulu olduğu içerik yönetim sisteminin (DotNetNuke)
> varsayılan ayarlarından geldiğini ve Resmî Gazete dosyaları düşünülerek
> konulmamış olabileceğini değerlendiriyorum. Yine de bu bir beyandır ve
> aksini varsaymak yerine size sormayı doğru buldum.
>
> **Şeffaflık.** Çalışmanın teknik olarak yürüyüp yürümediğini görmek için
> 2025 yılına ait 262 sayıyı indirip işledim. İsteklerim, kendini tanıtan ve
> iletişim adresimi içeren bir `User-Agent` başlığıyla ve saniyede bir istekle
> sınırlı olarak yapıldı. Bunu izniniz olmadan yaptığımı biliyorum ve bu
> yazıyla hem durumu bildiriyor hem de bundan sonrası için izin talep
> ediyorum. İzin verilmemesi hâlinde indirmeyi derhâl durdurup elimdeki
> metinleri sileceğimi taahhüt ederim.
>
> **Teknik taahhütlerim.**
>
> - PDF dosyaları **saklanmıyor**. Geçici olarak indiriliyor, metni
>   çıkarılıyor ve dosya siliniyor. Sitede PDF kopyası yayımlanmıyor.
> - Her istek kendini tanıtan bir `User-Agent` ve iletişim adresi taşıyor.
> - İstek hızı saniyede bir ile sınırlı; talebiniz hâlinde daha da düşürebilir
>   ya da tümüyle mesai dışı saatlere alabilirim.
> - Her kayıt sayfasında kaynak olarak Resmî Gazete belirtiliyor ve ilgili
>   sayının sitenizdeki orijinal PDF bağlantısı veriliyor.
> - Erişimin durdurulmasını istediğiniz anda, gerekçe belirtmeksizin
>   durduracağım.
>
> **Karşılığında sunabileceklerim.**
>
> - Arşivinizde tespit ettiğim **kırık bağlantı ve tutarsızlıkların listesi.**
>   Örneğin 2018 yılına ait 130 sayılı Gazete'nin PDF bağlantısı hata veriyor
>   ve o yılın dosya yolu diğer yıllardan farklı. Bu tür bulguları düzenli
>   olarak paylaşabilirim.
> - Ürettiğim yapısal dizini (sayı, tarih, bölüm, referans numarası, başlık)
>   Basımevi ile ücretsiz paylaşabilirim.
> - Uygun görürseniz, Basımevi'nin kendi sitesinde arama işlevi kurmasına
>   teknik destek verebilirim.
>
> **Tercih ettiğim çözüm.** İzin yerine, varsa bir veri paylaşımı yöntemi
> (dosya aktarımı, API, toplu arşiv) benim için daha uygundur; bu hem
> sitenize gelen yükü tümüyle ortadan kaldırır hem de veriyi daha güvenilir
> kılar. Böyle bir imkân yoksa mevcut yöntemle devam etmek için izninizi rica
> ediyorum.
>
> Konuyu görüşmek üzere uygun gördüğünüz bir zamanda telefonla ya da yüz yüze
> görüşmeye hazırım.
>
> Saygılarımla,
>
> [Ad Soyad]
> Mevzuat Kıbrıs
> mevzuatkibris.com · iletisim@mevzuatkibris.com · [telefon]

---

## Kısa sürüm (ilk temas e-postası)

Uzun yazı ağır geliyorsa ya da önce doğru kişiyi bulmak gerekiyorsa:

> **Konu:** Resmî Gazete arşivine erişim hakkında kısa bir soru
>
> Sayın Yetkili,
>
> KKTC Resmî Gazetesi'ni aranabilir hâle getirmeyi amaçlayan bağımsız bir
> arşiv çalışması yürütüyorum (mevzuatkibris.com — henüz yayında değil).
>
> Sitenizdeki `robots.txt` dosyası PDF'lerin bulunduğu `/Portals/` dizinini
> otomatik erişime kapatıyor. Bu kuralın içerik yönetim sisteminizin
> varsayılanından gelmiş olabileceğini düşünüyorum, ancak varsaymak yerine
> sormak istedim:
>
> **Resmî Gazete PDF dosyalarını, metinlerini aranabilir hâle getirmek amacıyla
> düzenli olarak indirmem sizin açınızdan bir sakınca doğurur mu?**
>
> PDF dosyalarını saklamıyorum; metni çıkarıp dosyayı siliyorum ve her kayıtta
> kaynak olarak sitenizin bağlantısını veriyorum. İstek hızım saniyede bir ile
> sınırlı ve isteklerim kendini tanıtan bir `User-Agent` taşıyor.
>
> Bu konuda yetkili birime yönlendirebilirseniz de çok memnun olurum.
>
> Saygılarımla,
> [Ad Soyad] · iletisim@mevzuatkibris.com · [telefon]

---

## Cevap gelmezse

Resmî yazışmada sessizlik yaygın. Öneri:

1. **10–14 gün bekle**, sonra kısa bir hatırlatma gönder.
2. Yanıt yine yoksa **telefonla ara** — KKTC ölçeğinde telefon çoğu zaman
   e-postadan hızlı sonuç verir.
3. Yazılı izin çıkmazsa bu, "hayır" demek değildir ama "evet" de değildir.
   O noktada karar yeniden senin: mevcut hızla devam etmek, ya da PDF'siz
   sürüme geçmek (kapsam analizi için `HANDOFF.md` §2.2).

**Sessizliği izin sayma.** Yazının bir kopyasını ve gönderim tarihini sakla;
ileride bir sorun çıkarsa iyi niyetin belgesi bu olur.
