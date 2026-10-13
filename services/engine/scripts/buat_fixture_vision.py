"""Pra-hitung L2 nyata dan paket demo; simpan mask dan hasil, tanpa tile Esri."""

import argparse
import hashlib
import json
import time
from dataclasses import asdict
from pathlib import Path

from shapely import transform
from shapely.geometry import shape

from app.contracts import AnalisisAtap, BangunanRingkas
from app.imagery import ambil_citra, bingkai_bangunan, daftar_tile, muat_citra_lokal
from app.simulation import PermintaanSimulasi, jalankan_simulasi
from app.sumber import modul_demo
from app.vision import IOU_MIN, MODEL_VERSION, SKOR_MIN, analisis_dari_mask, segmentasi_atap

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "data/fixtures"
AWAL = {
    991016391: ("cv-toko-wr-supratman.json", "contoh-3f8c.json", 9912),
    1145010599: ("fallback-rumah-kandang-limun.json", "contoh-limun-1145010599.json", 9913),
    1146141501: ("cv-kampus-fh-unib.json", "contoh-unib-1146141501.json", 9914),
}


def tulis(tujuan: Path, data) -> None:
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    tujuan.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )


def paket_demo(force=False) -> None:
    """ID analisis lama dipertahankan agar hasil, tautan, dan hitung ulang tetap cocok."""
    demo = []
    basis = json.loads((FIXTURE / "simulasi/contoh-unib-1146141501.json").read_text("utf-8"))
    bobot = json.loads((ROOT / "services/engine/models/mobilesam.json").read_text("utf-8"))
    for berkas in sorted((FIXTURE / "bangunan").glob("*.json")):
        b = BangunanRingkas.model_validate_json(berkas.read_text("utf-8"))
        nama_a, nama_s, identitas = AWAL.get(b.id, (f"unib-{b.id}.json", f"unib-{b.id}.json", b.id))
        tujuan_a = FIXTURE / "analisis" / nama_a
        bingkai = bingkai_bangunan(b)
        ada = json.loads(tujuan_a.read_text("utf-8")) if tujuan_a.exists() else {}
        if force or not ada.get("_evaluasi") or ada.get("model_version") != MODEL_VERSION:
            mulai = time.monotonic()
            lokal = muat_citra_lokal(b.id)
            if lokal:
                bingkai, citra, sumber = lokal
            else:
                citra = ambil_citra(bingkai)
                sumber = "esri-world-imagery"
            footprint = transform(shape(b.geom.model_dump()), bingkai.ke_piksel, interleaved=False)
            mask, skor = segmentasi_atap(citra, footprint)
            analisis, metrik = analisis_dari_mask(b, bingkai, mask, skor)
            analisis.roof_analysis_id = identitas
            analisis.imagery.source = sumber
            ada = analisis.model_dump(mode="json", exclude_unset=True)
            ada["_catatan"] = (
                "Inferensi MobileSAM nyata; IoU dibandingkan dengan OSM, bukan anotasi atap."
            )
            ada["_evaluasi"] = {
                **metrik,
                "durasi_detik": round(time.monotonic() - mulai, 3),
                "kalibrasi": "heuristik-belum-terkalibrasi",
                "ambang_iou_footprint": IOU_MIN,
                "ambang_keyakinan": SKOR_MIN,
                "sha256_citra_rgb": hashlib.sha256(citra.tobytes()).hexdigest(),
                "sha256_mask": hashlib.sha256(mask.tobytes()).hexdigest(),
                "bobot": {f["local"]: f["sha256"] for f in bobot["files"]},
            }
            ada["_sumber"] = {
                "model": bobot["repository"],
                "revision": bobot["revision"],
                "diambil": "2026-10-13",
                "bingkai": asdict(bingkai),
                "tiles": daftar_tile(bingkai),
                "citra_disimpan": False,
            }
            tulis(tujuan_a, ada)
        ada = {k: v for k, v in ada.items() if k not in {"catatan", "peringatan"} or v is not None}
        tulis(tujuan_a, ada)
        a = AnalisisAtap.model_validate(ada)
        bingkai = type(bingkai)(**ada["_sumber"]["bingkai"])
        tujuan_s = FIXTURE / "simulasi" / nama_s
        lama = json.loads(tujuan_s.read_text("utf-8")) if tujuan_s.exists() else basis
        fisika = dict(lama["parameter_fisika"])
        fisika["modul"] = modul_demo()
        hasil = jalankan_simulasi(
            PermintaanSimulasi(
                roof_analysis_id=identitas, asumsi=lama["asumsi"], parameter_fisika=fisika
            )
        ).model_dump(mode="json")
        hasil["id"] = lama["id"] if b.id in AWAL else f"demo-unib-{b.id}"
        hasil["_catatan"] = (
            "contoh simulasi dihitung dengan mesin dan analisis MobileSAM nyata atau fallback OSM. "
            "Tilt, orientasi bidang panel, cadangan area, SCR, golongan/daya, biaya dan rugi "
            "tetap asumsi demo. Sumber tarif, modul, emisi dan cuaca mengikuti registri."
        )
        hasil["_sumber_ids"] = lama.get("_sumber_ids", [])
        tulis(tujuan_s, hasil)
        footprint = transform(shape(b.geom.model_dump()), bingkai.ke_piksel, interleaved=False)
        mask_geom = shape(a.mask_geojson.model_dump()) if a.mask_geojson else None
        pixel = transform(mask_geom, bingkai.ke_piksel, interleaved=False) if mask_geom else None
        xmin, ymin, xmax, ymax = footprint.bounds
        pusat = footprint.centroid
        demo.append(
            {
                "bangunan": b.model_dump(mode="json"),
                "analisis": a.model_dump(mode="json", exclude_unset=True),
                "simulasi": hasil,
                "viewer": {
                    "tiles": ada["_sumber"]["tiles"],
                    "footprint": list(footprint.exterior.coords),
                    "mask": [list(p.exterior.coords) for p in pixel.geoms] if pixel else [],
                    "mask_rings": [
                        [list(r.coords) for r in [p.exterior, *p.interiors]] for p in pixel.geoms
                    ]
                    if pixel
                    else [],
                    "bbox": [xmin, ymin, xmax - xmin, ymax - ymin],
                    "centroid": [pusat.x, pusat.y],
                    "meter_per_piksel": bingkai.meter_per_piksel,
                    "evaluasi": ada["_evaluasi"],
                },
            }
        )
        print(
            f"{b.id}: {a.method}, IoU={ada['_evaluasi']['iou_footprint']:.3f}, "
            f"luas={a.roof_area_m2}, kapasitas={hasil['kwp']}",
            flush=True,
        )
    tulis(FIXTURE / "demo.json", demo)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Jalankan ulang inferensi citra.")
    paket_demo(force=parser.parse_args().force)
