"""Evaluasi kontur terhadap acuan visual terpisah; semua kegagalan ikut dilaporkan."""

import hashlib
import json
from pathlib import Path
from statistics import mean, median

import numpy as np
from shapely import transform
from shapely.geometry import MultiPolygon, Polygon, mapping, shape

from app.vision import BingkaiCitra, luas_geodesik

ROOT = Path(__file__).resolve().parents[3]
DIR_EVALUASI = ROOT / "data/evaluasi"


def digest(data) -> str:
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    ).hexdigest()


def acuan_piksel(rings, bingkai: BingkaiCitra):
    """Satu polygon per komponen: ring luar diikuti lubang, dalam piksel bingkai."""
    polys = []
    for komponen in rings:
        for ring in komponen:
            a = np.asarray(ring, dtype=float)
            if a.ndim != 2 or a.shape[0] < 3 or a.shape[1] != 2 or not np.isfinite(a).all():
                raise ValueError("Setiap cincin perlu minimal tiga titik finite.")
            if (a < 0).any() or (a[:, 0] > bingkai.lebar).any() or (a[:, 1] > bingkai.tinggi).any():
                raise ValueError("Titik acuan berada di luar citra.")
        poly = Polygon(komponen[0], komponen[1:])
        if not poly.is_valid or poly.area <= 0:
            raise ValueError("Kontur acuan bersilangan atau tidak berluas.")
        polys.append(poly)
    geom = MultiPolygon(polys)
    if geom.is_empty or not geom.is_valid:
        raise ValueError("Acuan kosong atau komponennya bertumpuk.")
    return transform(geom, bingkai.ke_lonlat, interleaved=False)


def metrik_geometri(prediksi, acuan) -> dict:
    if acuan.is_empty or not acuan.is_valid or luas_geodesik(acuan) <= 0:
        raise ValueError("Acuan wajib berupa atap valid dengan luas positif.")
    area = luas_geodesik(acuan)
    if prediksi is None or prediksi.is_empty:
        return {
            "iou": 0.0,
            "dice": 0.0,
            "galat_luas_persen": 100.0,
            "bias_luas_persen": -100.0,
            "luas_acuan_m2": area,
        }
    if not prediksi.is_valid:
        raise ValueError("Geometri prediksi tidak valid.")
    # Proyeksi setempat menghindari perbandingan luas derajat pada lintang berbeda.
    from pyproj import Transformer

    pusat = acuan.centroid
    proyeksi = Transformer.from_crs(
        "EPSG:4326",
        f"+proj=laea +lat_0={pusat.y} +lon_0={pusat.x} +datum=WGS84 +units=m",
        always_xy=True,
    )
    a = transform(acuan, proyeksi.transform, interleaved=False)
    p = transform(prediksi, proyeksi.transform, interleaved=False)
    irisan = a.intersection(p).area
    bias = (luas_geodesik(prediksi) - area) / area * 100
    return {
        "iou": irisan / a.union(p).area,
        "dice": 2 * irisan / (a.area + p.area),
        "galat_luas_persen": abs(bias),
        "bias_luas_persen": bias,
        "luas_acuan_m2": area,
    }


def ringkas(baris: list[dict]) -> dict:
    berlabel = [b for b in baris if b.get("metrik") is not None]
    cv = [b for b in berlabel if b.get("method") == "cv"]

    def statistik(data):
        return {
            "n": len(data),
            "mean_iou": mean(b["metrik"]["iou"] for b in data) if data else None,
            "mean_galat_luas_persen": mean(b["metrik"]["galat_luas_persen"] for b in data)
            if data
            else None,
            "median_galat_luas_persen": median(b["metrik"]["galat_luas_persen"] for b in data)
            if data
            else None,
        }

    durasi = [b["durasi_detik"] for b in baris if b.get("durasi_detik") is not None]
    return {
        "jumlah_sampel": len(baris),
        "berlabel": len(berlabel),
        "ambigu": sum(b.get("status_acuan") == "ambigu" for b in baris),
        "gagal_sumber": sum(b.get("galat") is not None for b in baris),
        "cv_diterima": sum(b.get("method") == "cv" for b in baris),
        "cv_dengan_acuan": len(cv),
        "acuan_tersedia": sum(b.get("status_acuan") == "digambar" for b in baris),
        "belum_dijalankan": sum(b.get("status_inferensi") == "belum" for b in baris),
        "fallback": sum(b.get("method") == "footprint_fallback" for b in baris),
        "semua": statistik(berlabel),
        "cv": statistik(cv),
        "durasi_median_detik": median(durasi) if durasi else None,
        "durasi_p95_detik": float(np.percentile(durasi, 95)) if durasi else None,
    }


def buat_laporan(manifest: dict, anotasi: dict, prediksi: dict) -> dict:
    if prediksi["sha256_manifest"] != digest(manifest):
        raise ValueError("Manifest berubah sejak inferensi; bentuk dataset versi baru.")
    if anotasi["sha256_manifest"] != digest(manifest):
        raise ValueError("Acuan berasal dari manifest yang berbeda.")
    hasil = []
    for s in manifest["sampel"]:
        identitas = str(s["id"])
        a = anotasi.get("sampel", {}).get(identitas)
        p = prediksi.get("sampel", {}).get(identitas)
        row = {
            "id": s["id"],
            "split": s["split"],
            "strata": s["strata"],
            "status_acuan": a.get("status") if a else "belum",
            "catatan_acuan": a.get("catatan", "") if a else "",
            "metrik": None,
            "raw_metrik": None,
            "method": p.get("analisis", {}).get("method") if p else None,
            "durasi_detik": p.get("durasi_detik") if p else None,
            "galat": p.get("galat") if p else None,
            "status_inferensi": "belum" if not p else "gagal" if p.get("galat") else "selesai",
        }
        if a and p and a["status"] == "digambar" and not p.get("galat"):
            if a["sha256_citra"] != p["sha256_citra"]:
                raise ValueError(
                    f"Citra berubah untuk bangunan {s['id']}; anotasi ulang diperlukan."
                )
            acuan = acuan_piksel(a["rings"], BingkaiCitra(**s["bingkai"]))
            analisis = p["analisis"]
            if analisis.get("mask_geojson"):
                kontur = shape(analisis["mask_geojson"])
            else:
                kontur = shape(s["bangunan"]["geom"])
            row["metrik"] = metrik_geometri(kontur, acuan)
            # Pada fallback angka luas berbeda dari luas footprint yang ditampilkan.
            bias = (analisis["roof_area_m2"] - luas_geodesik(acuan)) / luas_geodesik(acuan) * 100
            row["metrik"].update(galat_luas_persen=abs(bias), bias_luas_persen=bias)
            row["raw_metrik"] = metrik_geometri(shape(p["raw_mask"]), acuan)
            row["acuan_geojson"] = mapping(acuan)
            row["prediksi_geojson"] = analisis.get("mask_geojson")
            row["review"] = a.get("review", "belum")
        hasil.append(row)
    return {
        "dataset": manifest["versi"],
        "tanggal": "2026-10-19",
        "model_version": prediksi["model_version"],
        "strategi": prediksi.get("strategi", "kotak-centroid"),
        "status": "awal-belum-ditinjau",
        "catatan": (
            "Acuan visual terpisah dari model, belum ditinjau anggota tim. "
            "Pengujian kontur 2D pada citra, bukan survei lapangan "
            "atau validasi kapasitas pemasangan."
        ),
        "sha256_manifest": digest(manifest),
        "sha256_anotasi": digest(anotasi),
        "sha256_implementasi": prediksi["sha256_implementasi"],
        "ringkasan": {
            split: ringkas([b for b in hasil if split == "semua" or b["split"] == split])
            for split in ["semua", "pengembangan", "uji"]
        },
        "sampel": hasil,
    }
