#!/usr/bin/env python3
"""RG PDF teshis: SAYFA bazli metin kalitesi + ariza sinifi.

Kullanim:
    python3 scripts/rg_teshis.py dosya.pdf                 # sayfa sayfa
    python3 scripts/rg_teshis.py dosya.pdf --pages 21-24   # kayit araligi
    python3 scripts/rg_teshis.py klasor/                   # dosya ozetleri
    python3 scripts/rg_teshis.py dosya.pdf --json          # makine okunur

NEDEN SAYFA BAZINDA
    Once dosya bazinda puanliyordu. 2024/208 ve 2025/184 dosya bazinda "OK"
    cikti; oysa 2024/208'in 22-24. sayfalari %0,0 sozluk isabetiyle tamamen
    coptu. 28-49 sayfaya bolununce hasar eriyor. Kayit puani, kapsadigi
    sayfa araliginin KARAKTERLE AGIRLIKLI ortalamasidir; OCR karari sayfa
    bazinda verilir, sayinin tamamina degil.

SIRALAMA -- once skor, sonra font
    1. Sayfayi puanla.
    2. Skor iyiyse -> OK. Font tablosuna HIC bakma.
    3. Skor kotuyse -> font analizi ARIZANIN TURUNU (A/B/C/D) soyler.
    Font analizi tek basina OCR tetiklemez. Metin duzgun cikiyorsa font ne
    derse desin dokunmuyoruz; bu, tek bir eslenemeyen sus fontunun saglam
    bir belgeyi OCR'a gondermesini de engelliyor.

ORTAM -- iki tuzak, ikisi de SESSIZ. Ikisi de bu projede bir kez isirdi.

    1. PATH'teki `pdftotext` poppler DEGIL, Xpdf olabilir (Glyph & Cog).
       Xpdf pdffonts/pdfinfo/pdfimages getirmez. Eski surum bu durumda
       font listesini bos bulup SESSIZCE "B" (= tum arsivi OCR'a gonder)
       uretiyordu. Artik require_tools() hata firlatip duruyor.
           dogrulama : pdftotext -v   ->  "The Poppler Developers" gormelisin
           Windows   : winget install oschwartz10612.Poppler
           Debian    : apt-get install -y poppler-utils
           her ikisi : pip install pymupdf

    2. PYTHONIOENCODING=utf-8 SART.
       Yoksa Windows konsolu ornek satirlarindaki Turkce karakterleri '?'
       yapar; saglam metin A sinifi kodlama hasari gibi gorunur. Bu rapor
       bir kez tam olarak boyle yanlis okundu. Script bunu kendi de
       zorluyor (asagida reconfigure), ama kabuk degiskenini yine de kur.
"""
import argparse
import io
import re
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path

# Ortam tuzagi 2: ornek satirlari Turkce. Konsol ne derse desin UTF-8 yaz.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, io.UnsupportedOperation):
        pass

# ISO-8859-9 metnin Latin-1 sanilmasindan dogan kaymalar
MOJI = {"ð": "ğ", "Ð": "Ğ", "ý": "ı",
        "Ý": "İ", "þ": "ş", "Þ": "Ş"}
MOJI_CHARS = set(MOJI) | {"±", "�"}
# `builtin`: ToUnicode'u olmayan ama standart glif adlari tasiyan Type 1
# fontlar eslenebilir. Listede olmamasi sahte B uretiyordu.
NAMED_ENC = {"winansi", "macroman", "standard", "macexpert", "pdfdoc", "builtin"}
# ABBYY FineReader'in gorunmez OCR katmaninin imzasi. Sayfanin taranmis
# goruntu + gomulu OCR oldugunu soyler; tek basina ariza demek DEGILDIR.
ABBYY_FONT = "HiddenHorzOCR"

LEX_OK = 0.12    # bunun ustu: sayfa saglam, font analizi calistirilmaz
LEX_BAD = 0.06   # bunun alti: cikan metin Turkce degil
MIN_CHARS_PER_PAGE = 150

# RG'de surekli tekrar eden terimler. Kelime dagarcigi dar oldugu icin
# isabet orani ariza tespitinde cok ayirt edici.
LEX = set("""kktc kuzey kıbrıs türk cumhuriyeti resmî resmi gazete sayı sayılı
tarih tarihli yasa yasası tüzük tüzüğü emirname emirnamesi kararname kararnamesi
karar kararı bakanlar kurulu meclisi meclis başbakanlık bakanlığı bakanlık daire
dairesi müdürlüğü başkanlığı komisyonu genelge münhal ilan ilanı kadro kadrosu
atama sınav sınavı başvuru müracaat mevki mevkisi derece personel sözleşmeli
istihdam kamu hizmeti görev görevlendirme ihale teklif rekabet itiraz şartname
hizmet alımı şirket şirketin limited yerel tescil tescilli tasfiye mukayyitliği
sicil sicilden isim değiştirme değişiklik taşınmaz mal kamulaştırma istimlak
iktisabı arazi arsa koçan planlama onayı imar belediye belediyesi köyü vergi
katma değer harç fon fonu istikrar akaryakıt prim faiz oranı oranları bütçe
bütçesi ödenek aktarma merkez bankası yabancı uyruklu kişilerin satın alma madde
maddesi uyarınca gereğince kapsamında yürürlüğe girer yayımlanır onaylanmıştır
uygun görülmüştür amacıyla aşağıdaki belirtilen konusu ilgili hakkında üzerine
lefkoşa girne gazimağusa mağusa güzelyurt iskele lefke ocak şubat mart nisan
mayıs haziran temmuz ağustos eylül ekim kasım aralık""".split())
TOKEN = re.compile(r"[a-zçğıöşüâîû]{3,}", re.I)

tr_lower = lambda s: s.replace("İ", "i").replace("I", "ı").lower()
fix_moji = lambda t: "".join(MOJI.get(c, c) for c in t)


class ToolError(RuntimeError):
    """Ortam bozuk. Teshise devam etmek yerine durmak icin."""


def score(text):
    if not text:
        return {"chars": 0, "lex": 0.0, "moji": 0.0}
    toks = [tr_lower(t) for t in TOKEN.findall(text)]
    return {
        "chars": len(text),
        "lex": sum(t in LEX for t in toks) / len(toks) if toks else 0.0,
        "moji": sum(text.count(c) for c in MOJI_CHARS) / len(text),
    }


def sh(cmd, timeout=300, check=False):
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
    except FileNotFoundError as exc:
        if check:
            raise ToolError(f"`{cmd[0]}` bulunamadi. Docstring'deki ORTAM notuna bak.") from exc
        return ""
    except Exception as exc:
        if check:
            raise ToolError(f"`{cmd[0]}` calistirilamadi: {exc}") from exc
        return ""
    if check and proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace").strip()[:300]
        raise ToolError(f"`{cmd[0]}` {proc.returncode} ile dondu: {err}")
    return proc.stdout.decode("utf-8", "replace")


def require_tools():
    """Ortam tuzagi 1. Eksik arac veya Xpdf => DUR, tahmin etme.

    Eskiden `pdffonts` yoksa font listesi bos kaliyor, bos liste "font yok"
    diye okunuyor ve dosya B'ye dusuyordu: bozuk ortam, tum arsivi OCR'a
    gonderirdi. Sessiz yanlis yerine gurultulu hata.
    """
    missing = [t for t in ("pdftotext", "pdffonts", "pdfinfo", "pdfimages")
               if shutil.which(t) is None]
    if missing:
        raise ToolError(
            "Eksik poppler araclari: " + ", ".join(missing) +
            "\n  Windows: winget install oschwartz10612.Poppler"
            "\n  Debian : apt-get install -y poppler-utils")
    # DIKKAT: poppler da Xpdf de surum bannerini STDERR'e yazar. Yalnizca
    # stdout'a bakmak dogru kurulumu reddediyordu; ikisini birlestir.
    banner = ""
    for flag in ("-v", "-h"):
        try:
            proc = subprocess.run(["pdftotext", flag], capture_output=True, timeout=30)
            banner += proc.stdout.decode("utf-8", "replace")
            banner += proc.stderr.decode("utf-8", "replace")
        except Exception:
            pass
    if "poppler" not in banner.lower():
        raise ToolError(
            "PATH'teki `pdftotext` poppler degil (muhtemelen Xpdf).\n"
            "  Xpdf pdffonts/pdfinfo/pdfimages getirmez, bayrak davranisi da farklidir.\n"
            "  Poppler'in bin dizinini PATH'in BASINA koy, `pdftotext -v` ile dogrula.")


def page_count(path):
    match = re.search(r"Pages:\s+(\d+)", sh(["pdfinfo", str(path)], check=True))
    if not match:
        raise ToolError(f"pdfinfo sayfa sayisini vermedi: {path}")
    return int(match.group(1))


def page_texts(path, flag):
    """Tum dosyayi tek cagrida cikarip form-feed'den boler. Sayfa basina
    ayri pdftotext cagrisi 49 sayfada 49 surec demekti."""
    out = sh(["pdftotext", flag, "-enc", "UTF-8", str(path), "-"], check=True)
    pages = out.split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    return pages


def pymupdf_pages(path):
    try:
        import pymupdf
    except ImportError:
        return None
    try:
        with pymupdf.open(str(path)) as doc:
            return [p.get_text("text") for p in doc]
    except Exception:
        return None


def page_fonts(path, page):
    """pdffonts -> [{enc, sub, uni, mappable}]. Yalnizca skoru kotu olan
    sayfalar icin cagrilir (bkz. docstring: once skor, sonra font)."""
    raw = sh(["pdffonts", "-f", str(page), "-l", str(page), str(path)], check=True)
    out = []
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) < 6 or parts[0] == "name" or set(parts[0]) == {"-"}:
            continue
        tail = parts[-5:] if parts[-1].isdigit() and parts[-2].isdigit() else parts[-4:]
        emb, sub, uni = tail[0], tail[1], tail[2]
        if emb not in ("yes", "no"):
            continue
        idx = parts.index(tail[0])
        enc = parts[idx - 1] if idx > 0 else "?"
        out.append({"name": parts[0], "enc": enc, "sub": sub.startswith("y"),
                    "uni": uni.startswith("y"),
                    "mappable": uni.startswith("y") or enc.lower() in NAMED_ENC})
    return out


def page_images(path, page):
    lines = sh(["pdfimages", "-list", "-f", str(page), "-l", str(page), str(path)],
               check=True).splitlines()
    return max(0, len(lines) - 2)


def classify_page(path, page, best, mojifix_won):
    """Yalnizca skor kotu oldugunda cagrilir. Ariza TURUNU dondurur."""
    fonts = page_fonts(path, page)
    has_img = page_images(path, page) > 0
    mappable = sum(f["mappable"] for f in fonts) / len(fonts) if fonts else 0.0
    abbyy = any(ABBYY_FONT in f["name"] for f in fonts)
    ev = {"fonts": len(fonts), "mappable": mappable, "img": has_img, "abbyy": abbyy}

    if mojifix_won:
        return "A", "Kodlama kaymasi; duzeltme tablosu skoru yukseltti.", ev
    if not fonts:
        # Araclar require_tools ile dogrulandi; bu gercekten fontsuz bir sayfa.
        return "B", "Sayfada font yok - saf tarama, metin katmani yok.", ev
    if best["chars"] < MIN_CHARS_PER_PAGE:
        return "B", f"Metin katmani bos ({best['chars']} karakter).", ev
    if mappable < 0.8:
        bad = sum(not f["mappable"] for f in fonts)
        return "B", f"{len(fonts)} font'un {bad} tanesi eslenemiyor (Custom enc + ToUnicode yok).", ev
    if best["lex"] < LEX_BAD and has_img:
        why = ("Esleme var ama metin Turkce degil; taranmis goruntu + ABBYY OCR katmani bozuk."
               if abbyy else
               "Esleme var ama metin Turkce degil; sayfada goruntu var - gomulu kotu OCR.")
        return "C", why, ev
    if best["lex"] < LEX_BAD:
        return "B", "Esleme var gorunuyor ama cikan metin Turkce degil.", ev
    return "D", "Harfler dogru, skor dusuk - duzen/okuma sirasi.", ev


def diagnose(path, pages=None):
    total = page_count(path)
    variants = {"pdftotext -raw": page_texts(path, "-raw"),
                "pdftotext -layout": page_texts(path, "-layout")}
    mupdf = pymupdf_pages(path)
    if mupdf is not None:
        variants["pymupdf"] = mupdf

    wanted = pages or range(1, total + 1)
    report = []
    for pg in wanted:
        if pg < 1 or pg > total:
            continue
        cands = {}
        for name, plist in variants.items():
            txt = plist[pg - 1] if pg - 1 < len(plist) else ""
            stat = score(txt); stat["text"] = txt; cands[name] = stat
            if stat["moji"] > 0.002:
                fixed = fix_moji(txt)
                stat2 = score(fixed); stat2["text"] = fixed
                cands[name + " +mojifix"] = stat2
        best_name = max(cands, key=lambda k: cands[k]["lex"])
        best = cands[best_name]

        # ADIM 2: skor iyiyse font tablosuna hic bakilmiyor.
        if best["lex"] >= LEX_OK and best["chars"] >= MIN_CHARS_PER_PAGE:
            cls, why, ev = "OK", "Metin temiz.", None
        else:
            cls, why, ev = classify_page(path, pg, best, "mojifix" in best_name)

        report.append({"page": pg, "cls": cls, "why": why, "best": best_name,
                       "chars": best["chars"], "lex": best["lex"], "moji": best["moji"],
                       "ev": ev, "text": best["text"]})
    return {"file": path.name, "pages": total, "report": report}


def weighted(rows):
    """Kayit puani = kapsadigi sayfalarin KARAKTERLE agirlikli ortalamasi."""
    total = sum(r["chars"] for r in rows)
    if not total:
        return 0.0
    return sum(r["lex"] * r["chars"] for r in rows) / total


ACTION = {
    "A": "Karakter tablosu uygula. OCR GEREKMIYOR.",
    "B": "ocrmypdf --force-ocr --language tur --image-dpi 400",
    "C": "ocrmypdf --force-ocr --language tur --image-dpi 400",
    "D": "Cikarici bayragini degistir (-layout / -raw / pymupdf). OCR GEREKMIYOR.",
    "OK": "Sorun yok.",
}


def print_one(diag, rng):
    header = f"\n{diag['file']} ({diag['pages']} sayfa)"
    if rng:
        header += f" -- sayfa {rng}"
    print(header)
    print("=" * 96)
    print(f"{'syf':>4} {'sinif':<5}{'kar':>7}{'sozluk':>8}{'moji':>7}  {'en iyisi':<20} ornek")
    print("-" * 96)
    for r in diag["report"]:
        sample = " ".join(r["text"].split())[:34]
        print(f"{r['page']:>4} {r['cls']:<5}{r['chars']:>7}{r['lex']:>7.1%}"
              f"{r['moji']:>7.2%}  {r['best']:<20} {sample}")
    bad = [r for r in diag["report"] if r["cls"] != "OK"]
    print("-" * 96)
    if rng:
        print(f"KAYIT PUANI (agirlikli): {weighted(diag['report']):.1%}"
              f"   sayfa {len(diag['report'])}, sorunlu {len(bad)}")
    for cls, n in Counter(r["cls"] for r in diag["report"]).most_common():
        print(f"  {cls:<4}{n:>4} sayfa   {ACTION[cls]}")
    for r in bad:
        ev = r["ev"] or {}
        print(f"\n  syf {r['page']} [{r['cls']}] {r['why']}")
        print(f"    kanit: font={ev.get('fonts')} esleme={ev.get('mappable', 0):.0%} "
              f"goruntu={'var' if ev.get('img') else 'yok'} "
              f"ABBYY={'var' if ev.get('abbyy') else 'yok'}")
        print(f"    ornek: {' '.join(r['text'].split())[:150]}")


def print_many(results):
    print(f"{'sinif':<6}{'sorunlu/toplam':>16}{'agirlikli':>11}  dosya")
    print("-" * 72)
    worst = Counter()
    for diag in results:
        bad = [r for r in diag["report"] if r["cls"] != "OK"]
        cls = Counter(r["cls"] for r in bad).most_common(1)[0][0] if bad else "OK"
        worst[cls] += 1
        ratio = f"{len(bad)}/{len(diag['report'])}"
        avg = f"{weighted(diag['report']):.1%}"
        print(f"{cls:<6}{ratio:>16}{avg:>11}  {diag['file']}")
    print(f"\nOZET ({len(results)} dosya)")
    for cls, n in worst.most_common():
        print(f"  {cls:<4}{n:>5}  {n / len(results):>5.0%}  {ACTION[cls]}")


def main():
    ap = argparse.ArgumentParser(description="RG PDF teshis (sayfa bazli)")
    ap.add_argument("target", help="pdf dosyasi veya klasor")
    ap.add_argument("--pages", default=None, help="orn: 21-24 veya 22")
    ap.add_argument("--json", action="store_true", help="makine okunur cikti")
    args = ap.parse_args()

    require_tools()

    rng = None
    if args.pages:
        lo, _, hi = args.pages.partition("-")
        rng = range(int(lo), int(hi or lo) + 1)

    target = Path(args.target)
    files = sorted(target.glob("*.pdf")) if target.is_dir() else [target]
    results = [diagnose(f, rng) for f in files]

    if args.json:
        import json
        slim = [{**d, "report": [{k: v for k, v in r.items() if k != "text"}
                                 for r in d["report"]]} for d in results]
        print(json.dumps(slim, ensure_ascii=False, indent=2))
    elif len(files) == 1:
        print_one(results[0], args.pages)
    else:
        print_many(results)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ToolError as exc:
        print(f"\nORTAM HATASI: {exc}\n", file=sys.stderr)
        sys.exit(2)
