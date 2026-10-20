"""Pilih 30 atap dari snapshot OSM sebelum melihat prediksi atau anotasi."""

import gzip
import hashlib
import json
from dataclasses import asdict
from pathlib import Path

from shapely import transform
from shapely.geometry import Polygon, mapping

from app.contracts import BangunanRingkas
from app.imagery import bingkai_bangunan, daftar_tile

ROOT = Path(__file__).resolve().parents[3]
TUJUAN = ROOT / "data/evaluasi/manifest.json"
SEED = "atap-bengkulu-2026-10-19-v1"


def siapkan():
    if TUJUAN.exists():
        raise SystemExit("Manifest sudah dibekukan. Gunakan versi dataset baru untuk menggantinya.")
    sumber = ROOT / "data/fixtures/kota/mentah/bangunan-bengkulu-20261014.overpass.json.gz"
    kota = json.loads(
        gzip.decompress((ROOT / "data/fixtures/kota/bangunan-bengkulu.json.gz").read_bytes())
    )
    indeks = {b["source_ref"]: b for b in kota["bangunan"]}
    demo = {
        d["bangunan"]["id"]
        for d in json.loads((ROOT / "data/fixtures/demo.json").read_text("utf-8"))
    }
    kelompok = {"kecil": [], "sedang": [], "besar": []}
    mentah = json.loads(gzip.decompress(sumber.read_bytes()))
    for e in mentah["elements"]:
        ref = f"way/{e['id']}"
        if e["type"] != "way" or ref not in indeks or e["id"] in demo:
            continue
        area = indeks[ref]["footprint_m2"]
        strata = (
            "kecil"
            if 40 <= area < 150
            else "sedang"
            if 150 <= area < 500
            else "besar"
            if 500 <= area < 2500
            else None
        )
        if strata:
            urutan = hashlib.sha256(f"{SEED}:{ref}".encode()).hexdigest()
            kelompok[strata].append((urutan, e, area))
    sampel = []
    for strata, calon in kelompok.items():
        for _, e, area in sorted(calon, key=lambda x: x[0]):
            geom = Polygon([(p["lon"], p["lat"]) for p in e["geometry"]])
            if not geom.is_valid or geom.is_empty:
                continue
            b = BangunanRingkas.model_validate(
                {
                    "id": e["id"],
                    "source": "osm",
                    "source_ref": f"way/{e['id']}",
                    "geom": mapping(geom),
                    "footprint_m2": area,
                    "nama": e.get("tags", {}).get("name", f"Bangunan {e['id']}"),
                    "building_tag": e.get("tags", {}).get("building", "yes"),
                }
            )
            f = bingkai_bangunan(b)
            pixel = transform(geom, f.ke_piksel, interleaved=False)
            x1, y1, x2, y2 = pixel.bounds
            if x1 < 8 or y1 < 8 or x2 > f.lebar - 8 or y2 > f.tinggi - 8:
                continue
            sisi = min(472, max(96, (x2 - x1) * 1.7, (y2 - y1) * 1.7))
            cx, cy = pixel.centroid.coords[0]
            crop = [
                round(max(0, min(f.lebar - sisi, cx - sisi / 2)), 2),
                round(max(0, min(f.tinggi - sisi, cy - sisi / 2)), 2),
                round(sisi, 2),
                round(sisi, 2),
            ]
            nomor = len([s for s in sampel if s["strata"] == strata])
            sampel.append(
                {
                    "id": b.id,
                    "split": "uji" if nomor < (4 if strata == "besar" else 3) else "pengembangan",
                    "strata": strata,
                    "bangunan": b.model_dump(mode="json", exclude_none=True),
                    "bingkai": asdict(f),
                    "crop": crop,
                    "penanda": list(pixel.representative_point().coords[0]),
                    "tiles": daftar_tile(f),
                }
            )
            if nomor == 9:
                break
    if len(sampel) != 30:
        raise ValueError("Jumlah sampel tidak mencapai 30.")
    hasil = {
        "versi": SEED,
        "tanggal": "2026-10-19",
        "seed": SEED,
        "pemilihan": (
            "Urutan SHA-256 source_ref; 10 atap per strata luas; "
            "20 pengembangan dan 10 uji. Sembilan contoh demo dikecualikan."
        ),
        "sha256_sumber": hashlib.sha256(sumber.read_bytes()).hexdigest(),
        "sampel": sampel,
    }
    TUJUAN.parent.mkdir(parents=True, exist_ok=True)
    TUJUAN.write_text(json.dumps(hasil, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Manifest dibekukan: {len(sampel)} sampel.")


if __name__ == "__main__":
    siapkan()
