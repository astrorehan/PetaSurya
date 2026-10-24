"""L1: batas provinsi Indonesia untuk cakupan nasional dan pemetaan sistem grid.

Sumber: geoBoundaries gbOpen IDN ADM1 (simplified, 34 provinsi, turunan
OpenStreetMap, ODbL 1.0), rilis 9469f09. Geometri yang disederhanakan memotong
garis pantai, sehingga titik di luar poligon masih dipasangkan ke provinsi
terdekat bila jaraknya ≤ TOLERANSI_DERAJAT (≈ 11 km di khatulistiwa).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[3]
BERKAS_PROVINSI = (
    ROOT / "data/fixtures/wilayah/mentah-indonesia/geoBoundaries-IDN-ADM1_simplified.geojson"
)
TOLERANSI_DERAJAT = 0.1


@dataclass(frozen=True)
class Provinsi:
    iso: str  # ISO 3166-2, mis. "ID-BE"
    nama: str  # nama geoBoundaries (Inggris), mis. "Bengkulu"


@lru_cache(maxsize=1)
def _indeks() -> tuple[STRtree, list, list[Provinsi]]:
    data = json.loads(BERKAS_PROVINSI.read_text("utf-8"))
    geom = [shape(f["geometry"]) for f in data["features"]]
    prov = [
        Provinsi(iso=f["properties"]["shapeISO"], nama=f["properties"]["shapeName"])
        for f in data["features"]
    ]
    return STRtree(geom), geom, prov


def provinsi_di_titik(lat: float, lon: float) -> Provinsi | None:
    """Provinsi yang memuat titik; bila tidak ada, yang terdekat dalam toleransi."""
    pohon, geom, prov = _indeks()
    titik = Point(lon, lat)
    for i in pohon.query(titik, predicate="covers"):
        return prov[int(i)]
    i = pohon.query_nearest(titik, max_distance=TOLERANSI_DERAJAT)
    return prov[int(i[0])] if len(i) else None


def di_indonesia(lat: float, lon: float) -> bool:
    return provinsi_di_titik(lat, lon) is not None


def semua_provinsi() -> list[Provinsi]:
    return list(_indeks()[2])
