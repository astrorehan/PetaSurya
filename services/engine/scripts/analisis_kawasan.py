"""Analisis L2 satu kawasan kecil dari snapshot kota; hasil masuk cache SQLite.

Dari direktori engine:

    uv run python -m scripts.analisis_kawasan --barat 102.2940 --selatan -3.8120 \\
        --timur 102.2985 --utara -3.8075 --batas 500

Bangunan dipilih dari footprint snapshot yang memotong bbox, yang terdekat dari
pusat lebih dahulu; awalnya hanya perkiraan rumah (`--semua-jenis` untuk semua).
Hasil versi model kini dilewati sehingga jalan ulang melanjutkan, kecuali hasil
yang citranya gagal: bangunan itu dianalisis ulang. Citra Esri hanya diproses di
memori karena ketentuan World Imagery membatasi pengunduhan, penyimpanan dan
distribusi ulang tile. Laju dibatasi `--jeda` detik antarbangunan, paling banyak
1.000 bangunan per jalan; bukan untuk seluruh kota. Jalan berhenti setelah tiga
kegagalan beruntun agar hasil fallback tidak menumpuk saat jaringan putus.
Ringkasan durasi dan kegagalan ditulis ke `<cache>/kawasan/`.
"""

import argparse
import json
import time
from collections.abc import Callable
from datetime import UTC, datetime
from statistics import median

from pydantic import ValidationError

from app.buildings import DiLuarCakupan, PermintaanFootprintInput, footprint_di_area
from app.contracts import AnalisisAtap, BangunanRingkas
from app.geodata import analisis_tersimpan, proses_analisis_atap
from app.storage import _path
from app.vision import MODEL_VERSION

BATAS_KERAS = 1000
GAGAL_BERUNTUN = 3
CITRA_GAGAL = "tidak-tersedia"


def pilih_bangunan(
    area: PermintaanFootprintInput, batas: int, semua_jenis: bool
) -> list[BangunanRingkas]:
    bangunan = footprint_di_area(area.model_copy(update={"batas": 2000})).bangunan
    if not semua_jenis:
        bangunan = [b for b in bangunan if b.perkiraan_jenis == "rumah"]
    return bangunan[:batas]


def jalankan(
    daftar: list[BangunanRingkas],
    jeda: float,
    analisis: Callable[..., AnalisisAtap] = proses_analisis_atap,
    tersimpan: Callable[[int], AnalisisAtap | None] = analisis_tersimpan,
    tidur: Callable[[float], None] = time.sleep,
) -> dict:
    hitung = {"cv": 0, "footprint_fallback": 0, "dilewati": 0, "citra_gagal": 0, "galat": 0}
    durasi: list[float] = []
    kegagalan: list[dict] = []
    beruntun = 0
    berhenti = None
    mulai = time.monotonic()
    try:
        for urutan, b in enumerate(daftar, 1):
            lama = tersimpan(b.id)
            if lama and lama.imagery.source != CITRA_GAGAL:
                hitung["dilewati"] += 1
                continue
            awal = time.monotonic()
            try:
                hasil = analisis(b.id, force=lama is not None)
            except Exception as galat:  # satu bangunan gagal tidak menghentikan kawasan
                hitung["galat"] += 1
                kegagalan.append({"id": b.id, "galat": f"{type(galat).__name__}: {galat}"})
                gagal = True
            else:
                durasi.append(time.monotonic() - awal)
                gagal = hasil.imagery.source == CITRA_GAGAL
                if gagal:
                    hitung["citra_gagal"] += 1
                    kegagalan.append({"id": b.id, "galat": hasil.peringatan})
                else:
                    hitung[hasil.method.value] = hitung.get(hasil.method.value, 0) + 1
                metode = CITRA_GAGAL if gagal else hasil.method.value
                print(f"{urutan}/{len(daftar)} {b.id} {metode} {durasi[-1]:.1f} s", flush=True)
            beruntun = beruntun + 1 if gagal else 0
            if beruntun >= GAGAL_BERUNTUN:
                berhenti = f"gagal {GAGAL_BERUNTUN}× beruntun"
                break
            tidur(jeda)
    except KeyboardInterrupt:
        berhenti = "dihentikan pengguna"
    return {
        "dipilih": len(daftar),
        **hitung,
        "berhenti": berhenti,
        "detik_total": round(time.monotonic() - mulai, 1),
        "detik_per_bangunan_median": round(median(durasi), 2) if durasi else None,
        "kegagalan": kegagalan,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    for tepi in ("barat", "selatan", "timur", "utara"):
        parser.add_argument(f"--{tepi}", type=float, required=True)
    parser.add_argument("--batas", type=int, default=500)
    parser.add_argument("--jeda", type=float, default=1.0, help="detik antarbangunan")
    parser.add_argument("--semua-jenis", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.batas <= BATAS_KERAS:
        parser.error(f"--batas harus 1–{BATAS_KERAS}")
    if args.jeda < 0.5:
        parser.error("--jeda minimal 0,5 detik")
    try:
        area = PermintaanFootprintInput(
            barat=args.barat, selatan=args.selatan, timur=args.timur, utara=args.utara
        )
        daftar = pilih_bangunan(area, args.batas, args.semua_jenis)
    except (ValidationError, DiLuarCakupan) as galat:
        parser.error(str(galat))
    ringkasan = {
        "waktu": datetime.now(UTC).isoformat(timespec="seconds"),
        "model_version": MODEL_VERSION,
        "bbox": area.model_dump(exclude={"batas"}),
        "jeda_detik": args.jeda,
        **jalankan(daftar, args.jeda),
    }
    target = _path().parent / "kawasan" / f"{ringkasan['waktu'].replace(':', '')}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(ringkasan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in ringkasan.items() if k != "kegagalan"}, ensure_ascii=False))
    print(target)


if __name__ == "__main__":
    main()
