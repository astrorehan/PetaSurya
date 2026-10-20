"""Inferensi dan laporan evaluasi; citra tidak disimpan dan hash input diperiksa."""

import argparse
import hashlib
import json
import platform
import time

from shapely import transform
from shapely.geometry import mapping, shape

from app.contracts import BangunanRingkas
from app.evaluation import DIR_EVALUASI, ROOT, buat_laporan, digest
from app.imagery import ambil_citra
from app.vision import (
    MODEL_VERSION,
    BingkaiCitra,
    analisis_dari_mask,
    mask_ke_geometri,
    segmentasi_atap,
)


def tulis(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", "utf-8")


def inferensi(manifest, tujuan, split, perkuat=False):
    if tujuan.exists():
        hasil = json.loads(tujuan.read_text("utf-8"))
        if hasil["sha256_manifest"] != digest(manifest):
            raise ValueError("Manifest berubah.")
        strategi = "titik-tersebar" if perkuat else "kotak-centroid"
        if hasil.get("strategi", "kotak-centroid") != strategi:
            raise ValueError("Strategi berubah; gunakan nama keluaran baru.")
    else:
        hasil = {
            "model_version": MODEL_VERSION,
            "strategi": "titik-tersebar" if perkuat else "kotak-centroid",
            "sha256_manifest": digest(manifest),
            "sha256_implementasi": hashlib.sha256(
                (ROOT / "services/engine/app/vision.py").read_bytes()
            ).hexdigest(),
            "mesin": {
                "platform": platform.system(),
                "cpu": platform.processor(),
                "threads_model": 2,
            },
            "sampel": {},
        }
    sekarang = hashlib.sha256((ROOT / "services/engine/app/vision.py").read_bytes()).hexdigest()
    if hasil["sha256_implementasi"] != sekarang:
        raise ValueError("Implementasi berubah; gunakan nama keluaran baru.")
    for s in manifest["sampel"]:
        if split != "semua" and s["split"] != split:
            continue
        identitas = str(s["id"])
        if identitas in hasil["sampel"] and not hasil["sampel"][identitas].get("galat"):
            continue
        mulai = time.monotonic()
        try:
            f = BingkaiCitra(**s["bingkai"])
            b = BangunanRingkas.model_validate(s["bangunan"])
            rgb = ambil_citra(f)
            fp = transform(shape(b.geom.model_dump()), f.ke_piksel, interleaved=False)
            mask, skor = segmentasi_atap(rgb, fp, perkuat=perkuat)
            a, metrik = analisis_dari_mask(b, f, mask, skor)
            geo = transform(mask_ke_geometri(mask), f.ke_lonlat, interleaved=False)
            hasil["sampel"][identitas] = {
                "analisis": a.model_dump(mode="json", exclude_none=True),
                "raw_mask": mapping(geo),
                "skor_osm": metrik,
                "sha256_citra": hashlib.sha256(rgb.tobytes()).hexdigest(),
                "durasi_detik": round(time.monotonic() - mulai, 3),
            }
            print(f"{identitas}: {a.method} ({time.monotonic() - mulai:.2f}s)", flush=True)
        except (OSError, ValueError) as error:
            hasil["sampel"][identitas] = {
                "galat": str(error),
                "durasi_detik": round(time.monotonic() - mulai, 3),
            }
            print(f"{identitas}: gagal sumber: {error}", flush=True)
        tulis(tujuan, hasil)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inferensi", "laporan"])
    parser.add_argument("--nama", default="v4")
    parser.add_argument("--perkuat", action="store_true")
    parser.add_argument("--split", choices=["semua", "pengembangan", "uji"], default="pengembangan")
    args = parser.parse_args()
    m = json.loads((DIR_EVALUASI / "manifest.json").read_text("utf-8"))
    p = DIR_EVALUASI / f"prediksi-{args.nama}.json"
    if args.mode == "inferensi":
        inferensi(m, p, args.split, args.perkuat)
    else:
        a = json.loads((DIR_EVALUASI / "acuan.json").read_text("utf-8"))
        hasil = buat_laporan(m, a, json.loads(p.read_text("utf-8")))
        tulis(DIR_EVALUASI / f"laporan-{args.nama}.json", hasil)
        print(json.dumps(hasil["ringkasan"], ensure_ascii=False, indent=2))
