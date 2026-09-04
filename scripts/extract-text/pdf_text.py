"""
PDF metin katmanini pdfminer ile cikarir ve OLDUGU GIBI basar.

Neden pdftotext degil: kaynak PDF'lerin bir kisminda gomulu fontun ToUnicode
esleme tablosu kullanilamiyor. pdftotext boyle bir karakteri ham koduyla
basiyor ve sonuc -29 kaymis metin oluyor ("<$6$" = "YASA") -- ustelik kaymis
karakterler siradan noktalama ve rakamlardan AYIRT EDILEMIYOR.

pdfminer ayni karakteri "(cid:60)" olarak isaretliyor. Isaret belirsizligi
ortadan kaldiriyor: cozumu TypeScript tarafi yapiyor (cid.ts), boylece kural
birim testiyle sabitlenebiliyor.

Cozum BURADA YAPILMAZ. Bu betik ham ciktiyi verir, yorumlamaz.
"""

import sys

from pdfminer.high_level import extract_text


def main() -> int:
    if len(sys.argv) != 2:
        print("kullanim: pdf_text.py <dosya.pdf>", file=sys.stderr)
        return 2

    text = extract_text(sys.argv[1])

    # Windows'ta stdout varsayilan olarak UTF-8 degil; ciktinin bozulmamasi icin
    # ikili akisa yaziyoruz.
    sys.stdout.buffer.write(text.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
