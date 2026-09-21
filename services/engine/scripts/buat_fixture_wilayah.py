"""Ubah respons Overpass menjadi fixture batas Kota Bengkulu.

Jalankan dari akar repo:
    python services/engine/scripts/buat_fixture_wilayah.py

Relasi administratif OSM menyimpan batas sebagai beberapa way anggota. Skrip
ini menyambung way `outer` berdasarkan titik ujungnya dan menulis subset
GeoJSON yang dipakai UI Mode Kota. Berkas mentah tetap disimpan untuk audit.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

AKAR = Path(__file__).resolve().parents[3]
DIR_FIXTURE = AKAR / "data" / "fixtures" / "wilayah"

ID_KOTA = 16196019
KECAMATAN = {
    16196021: "kecamatan-16196021.overpass.json",
    16196022: "sungai-serut-relation.overpass.json",
    16196023: "kecamatan-16196023.overpass.json",
}


def baca(nama: str) -> dict[str, Any]:
    return json.loads((DIR_FIXTURE / nama).read_text(encoding="utf-8-sig"))


def titik(poin: dict[str, float]) -> tuple[float, float]:
    return (poin["lon"], poin["lat"])


def sama(a: tuple[float, float], b: tuple[float, float]) -> bool:
    return abs(a[0] - b[0]) < 1e-9 and abs(a[1] - b[1]) < 1e-9


def sambung_way(ways: list[dict[str, Any]]) -> list[list[list[float]]]:
    """Sambung outer way menjadi cincin tertutup, tanpa mengubah koordinat OSM."""

    tersisa = [
        [titik(poin) for poin in way["geometry"]]
        for way in ways
        if way.get("geometry") and len(way["geometry"]) >= 2
    ]
    cincin: list[list[list[float]]] = []

    while tersisa:
        jalur = tersisa.pop(0)
        while not sama(jalur[0], jalur[-1]):
            ujung = jalur[-1]
            ditemukan = None
            for index, kandidat in enumerate(tersisa):
                if sama(kandidat[0], ujung):
                    ditemukan = (index, kandidat)
                    break
                if sama(kandidat[-1], ujung):
                    ditemukan = (index, list(reversed(kandidat)))
                    break
            if ditemukan is None:
                raise ValueError("outer way OSM tidak membentuk cincin tertutup")
            index, kandidat = ditemukan
            tersisa.pop(index)
            jalur.extend(kandidat[1:])

        if len(jalur) < 4:
            raise ValueError("cincin batas OSM terlalu pendek")
        cincin.append([[lon, lat] for lon, lat in jalur])

    return cincin


def anggota_dengan_geometri(relasi: dict[str, Any], tambahan: dict[int, dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    tambahan = tambahan or {}
    return [
        {**anggota, "geometry": tambahan[anggota["ref"]]["geometry"]}
        if "geometry" not in anggota and anggota.get("ref") in tambahan
        else anggota
        for anggota in relasi.get("members", [])
        if anggota.get("role") == "outer"
    ]


def feature(relasi: dict[str, Any], ways: list[dict[str, Any]]) -> dict[str, Any]:
    tags = relasi.get("tags", {})
    rings = sambung_way(ways)
    if len(rings) == 1:
        geometry: dict[str, Any] = {"type": "Polygon", "coordinates": [rings[0]]}
    else:
        geometry = {"type": "MultiPolygon", "coordinates": [[[point for point in ring]] for ring in rings]}
    return {
        "type": "Feature",
        "properties": {
            "id": str(relasi["id"]),
            "osm_id": relasi["id"],
            "nama": tags.get("name", f"Wilayah {relasi['id']}"),
            "admin_level": tags.get("admin_level"),
            "ref": tags.get("ref"),
        },
        "geometry": geometry,
    }


def koleksi(features: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    kota_raw = baca("kota-bengkulu.overpass.json")
    kota_relasi = next(item for item in kota_raw["elements"] if item.get("id") == ID_KOTA)
    (DIR_FIXTURE / "kota-bengkulu.geojson").write_text(
        json.dumps(koleksi([feature(kota_relasi, anggota_dengan_geometri(kota_relasi))]), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    fitur_kecamatan: list[dict[str, Any]] = []
    for osm_id, nama_raw in KECAMATAN.items():
        raw = baca(nama_raw)
        relasi = next(item for item in raw["elements"] if item.get("type") == "relation")
        tambahan: dict[int, dict[str, Any]] = {}
        if osm_id == 16196022:
            ways_raw = baca("sungai-serut-ways.overpass.json")
            tambahan = {item["id"]: item for item in ways_raw["elements"]}
        fitur_kecamatan.append(feature(relasi, anggota_dengan_geometri(relasi, tambahan)))

    (DIR_FIXTURE / "kecamatan-kota-bengkulu.geojson").write_text(
        json.dumps(koleksi(sorted(fitur_kecamatan, key=lambda item: item["properties"]["nama"])), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("data/fixtures/wilayah/kota-bengkulu.geojson")
    print("data/fixtures/wilayah/kecamatan-kota-bengkulu.geojson")


if __name__ == "__main__":
    main()
