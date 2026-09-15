"""Ubah respons mentah Overpass (data/fixtures/bangunan/mentah/*.overpass.json)
menjadi fixture `BangunanRingkas` (data/fixtures/bangunan/<nama>.json).

Jalankan dari akar repo:
    python services/engine/scripts/buat_fixture_bangunan.py

Luas jejak dihitung dengan rumus shoelace pada proyeksi ekuirektangular lokal
di sekitar centroid (R = 6 371 008,8 m, jari-jari rata-rata WGS84). Untuk
poligon < 1 km galatnya di bawah 0,1 % terhadap luas geodesik — cukup untuk
fixture; di basis data luas dihitung PostGIS `ST_Area(geom::geography)`.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

R_BUMI_M = 6_371_008.8

AKAR = Path(__file__).resolve().parents[3]
DIR_FIXTURE = AKAR / "data" / "fixtures" / "bangunan"
DIR_MENTAH = DIR_FIXTURE / "mentah"

# way OSM → nama berkas fixture. Ketiganya di Kandang Limun, Kota Bengkulu,
# di sekitar Universitas Bengkulu.
PILIHAN = {
    1145010599: "rumah-kandang-limun",
    991016391: "toko-wr-supratman",
    1146141501: "kampus-fh-unib",
}


def luas_m2(cincin: list[tuple[float, float]]) -> float:
    """Luas poligon [lon, lat] derajat, m²; cincin boleh tertutup atau tidak."""
    lat0 = sum(lat for _, lat in cincin) / len(cincin)
    k = math.pi / 180 * R_BUMI_M
    xy = [(lon * k * math.cos(math.radians(lat0)), lat * k) for lon, lat in cincin]
    if xy[0] != xy[-1]:
        xy.append(xy[0])
    dua_luas = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(xy[:-1], xy[1:], strict=True))
    return abs(dua_luas) / 2


def ubah(berkas: Path) -> Path:
    mentah = json.loads(berkas.read_text(encoding="utf-8"))
    (elemen,) = mentah["elements"]
    tags = elemen.get("tags", {})
    cincin = [(p["lon"], p["lat"]) for p in elemen["geometry"]]
    if cincin[0] != cincin[-1]:
        cincin.append(cincin[0])
    levels = tags.get("building:levels")
    fixture = {
        "_catatan": (
            "Bangunan nyata dari OpenStreetMap via Overpass API; respons mentah di "
            f"mentah/{berkas.name}. Luas dari shoelace ekuirektangular lokal."
        ),
        "_sumber": {
            "penerbit": "OpenStreetMap contributors (ODbL)",
            "url_kueri": "https://overpass-api.de/api/interpreter",
            "kueri": f"[out:json][timeout:60];way({elemen['id']});out meta geom;",
            "diambil": "2026-09-15",
            "osm_timestamp": elemen.get("timestamp"),
            "osm_version": elemen.get("version"),
        },
        "id": elemen["id"],
        "source": "osm",
        "source_ref": f"way/{elemen['id']}",
        "geom": {"type": "Polygon", "coordinates": [[list(p) for p in cincin]]},
        "footprint_m2": round(luas_m2(cincin), 1),
        "building_tag": tags.get("building"),
        "levels": int(levels) if levels else None,
        "nama": tags.get("name"),
        "region_code": None,
    }
    keluar = DIR_FIXTURE / f"{PILIHAN[elemen['id']]}.json"
    keluar.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return keluar


if __name__ == "__main__":
    for berkas in sorted(DIR_MENTAH.glob("way-*.overpass.json")):
        print(ubah(berkas).relative_to(AKAR))
