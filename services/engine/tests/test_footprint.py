"""L1: footprint snapshot kota per area peta dan pemindaian bangunan snapshot."""

import gzip
import json
import math

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, box, mapping, shape

from app.aggregate import muat_data_kota
from app.buildings import _awal, cari_bangunan, indeks_footprint
from app.contracts import FootprintArea
from app.main import app
from scripts.ambil_bangunan_kota import indeks_peta

# Rumah di luar katalog awal UNIB; luasnya di rentang perkiraan rumah.
RUMAH_SNAPSHOT = 992085198
AREA_PADAT = {"barat": 102.2900, "selatan": -3.8200, "timur": 102.3050, "utara": -3.8100}
AREA_UNIB = {"barat": 102.2655, "selatan": -3.7625, "timur": 102.2700, "utara": -3.7585}


def area(**params):
    return TestClient(app).get("/api/v1/footprints", params=params)


def jarak_pusat(b: dict, q: dict) -> float:
    x0, y0, x1, y1 = shape(b["geom"]).bounds
    cos_lintang = math.cos(math.radians((q["selatan"] + q["utara"]) / 2))
    dx = ((x0 + x1) - (q["barat"] + q["timur"])) / 2 * cos_lintang
    dy = ((y0 + y1) - (q["selatan"] + q["utara"])) / 2
    return dx * dx + dy * dy


def test_indeks_memuat_semua_way_snapshot_mode_kota():
    indeks = indeks_footprint()
    snapshot = {b["source_ref"]: b["footprint_m2"] for b in muat_data_kota()["bangunan"]}
    way = {ref: luas for ref, luas in snapshot.items() if ref.startswith("way/")}
    assert len(indeks.id) == len(way) == len(snapshot) - 41
    assert {f"way/{i}" for i in indeks.id} == set(way)
    pasangan = zip(indeks.id, indeks.luas, strict=True)
    assert all(abs(way[f"way/{i}"] - luas) <= 0.05 for i, luas in pasangan)


def test_koordinat_pulih_tepat_dari_selisih_bilangan_bulat(tmp_path, monkeypatch):
    cincin = [
        [(102.2990904, -3.7561536), (102.2991602, -3.7561624), (102.2991515, -3.7562314)],
        [(102.3101, -3.8202), (102.3104, -3.8202), (102.3104, -3.8205), (102.3101, -3.8205)],
        [(102.2501, -3.9001), (102.2505, -3.9001), (102.2505, -3.9005)],
    ]
    bangunan = [
        {
            "source_ref": f"way/{30 - i}",
            "nama": None,
            "tag": tag,
            "lantai": None,
            "geom": mapping(Polygon(c)),
            "footprint_m2": 100.0 + i,
        }
        for i, (c, tag) in enumerate(zip(cincin, ["house", "house", "yes"], strict=True))
    ]
    bangunan.append(
        {
            "source_ref": "relation/5",
            "nama": None,
            "tag": "yes",
            "lantai": None,
            "geom": None,
            "footprint_m2": 80.0,
        }
    )
    peta = indeks_peta(bangunan)
    assert peta["id"] == [28, 29, 30] and peta["n_relasi_dilewati"] == 1
    assert peta["n_titik"] == [3, 4, 3]
    berkas = tmp_path / "footprint.json.gz"
    berkas.write_bytes(gzip.compress(json.dumps({"sumber": {}, **peta}).encode()))
    monkeypatch.setattr("app.buildings.BERKAS_FOOTPRINT", berkas)
    indeks_footprint.cache_clear()
    try:
        for i, asli in enumerate(reversed(cincin)):
            geom = indeks_footprint().bangunan(i)["geom"]["coordinates"][0]
            assert geom == [list(t) for t in [*asli, asli[0]]]
    finally:
        indeks_footprint.cache_clear()


def test_area_mengembalikan_footprint_yang_memotong_bbox():
    q = {"barat": 102.2985, "selatan": -3.7570, "timur": 102.2995, "utara": -3.7555}
    r = area(**q)
    assert r.status_code == 200
    hasil = FootprintArea.model_validate(r.json())
    assert hasil.terpotong is False and hasil.jumlah == len(hasil.bangunan) > 0
    assert RUMAH_SNAPSHOT in {b.id for b in hasil.bangunan}
    kotak = box(q["barat"], q["selatan"], q["timur"], q["utara"])
    for b in hasil.bangunan:
        geojson = b.geom.model_dump()
        geom = shape(geojson)
        assert geom.is_valid and box(*geom.bounds).intersects(kotak)
        assert geojson["coordinates"][0][0] == geojson["coordinates"][0][-1]
        assert b.source_ref == f"way/{b.id}" and b.region_code == "1771"


def test_area_padat_terpotong_mendahulukan_yang_dekat_pusat():
    r = area(**AREA_PADAT, batas=50).json()
    assert r["jumlah"] > 50 and r["terpotong"] is True and len(r["bangunan"]) == 50
    jarak = [jarak_pusat(b, AREA_PADAT) for b in r["bangunan"]]
    assert jarak == sorted(jarak)
    semua = area(**AREA_PADAT, batas=2000).json()
    assert semua["jumlah"] == r["jumlah"]
    assert [b["id"] for b in semua["bangunan"][:50]] == [b["id"] for b in r["bangunan"]]


def test_perkiraan_rumah_hanya_building_yes_tanpa_nama_dalam_rentang():
    r = area(**AREA_PADAT, batas=2000).json()
    rentang = r["perkiraan_rumah"]
    assert 0 < rentang["min_m2"] < rentang["max_m2"]
    assert "building=house" in rentang["dasar"]
    for b in r["bangunan"]:
        tebakan = (
            b["building_tag"] == "yes"
            and b["nama"] is None
            and rentang["min_m2"] <= b["footprint_m2"] <= rentang["max_m2"]
        )
        assert (b.get("perkiraan_jenis") == "rumah") is tebakan
    assert any(b.get("perkiraan_jenis") == "rumah" for b in r["bangunan"])
    assert any(b.get("perkiraan_jenis") is None for b in r["bangunan"])


def test_katalog_awal_tidak_mendapat_perkiraan_rumah():
    awal = {b.id for b in _awal()}
    bangunan = area(**AREA_UNIB, batas=2000).json()["bangunan"]
    dari_katalog = [b for b in bangunan if b["id"] in awal]
    assert len(dari_katalog) > 100
    assert all(b.get("perkiraan_jenis") is None for b in dari_katalog)
    kampus = next(b for b in dari_katalog if b["id"] == 1146141501)
    assert kampus == cari_bangunan(1146141501).model_dump(mode="json", exclude_unset=True)


@pytest.mark.parametrize(
    ("params", "kode"),
    [
        ({"barat": 106.8, "selatan": -6.3, "timur": 106.9, "utara": -6.2}, "OUT_OF_COVERAGE"),
        ({**AREA_UNIB, "barat": 102.28}, "VALIDATION_ERROR"),
        ({**AREA_UNIB, "utara": -3.77}, "VALIDATION_ERROR"),
        ({**AREA_UNIB, "batas": 0}, "VALIDATION_ERROR"),
        ({**AREA_UNIB, "batas": 2001}, "VALIDATION_ERROR"),
        ({**AREA_UNIB, "barat": "nan"}, "VALIDATION_ERROR"),
        ({k: v for k, v in AREA_UNIB.items() if k != "utara"}, "VALIDATION_ERROR"),
    ],
)
def test_bbox_di_luar_kota_atau_tidak_sah_ditolak(params, kode):
    r = area(**params)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == kode


def test_bangunan_snapshot_dipindai_tanpa_jaringan_lalu_masuk_katalog(monkeypatch):
    import cv2
    import numpy as np

    from app.storage import baca

    assert RUMAH_SNAPSHOT not in {b.id for b in _awal()}
    monkeypatch.setattr(
        "app.buildings.ambil_osm", lambda _: pytest.fail("Snapshot tidak perlu OSM daring")
    )
    monkeypatch.setattr(
        "app.geodata.ambil_citra", lambda f: np.zeros((f.tinggi, f.lebar, 3), np.uint8)
    )

    def inferensi(citra, footprint):
        mask = np.zeros(citra.shape[:2], np.uint8)
        cv2.fillPoly(mask, [np.rint(footprint.exterior.coords).astype(np.int32)], 1)
        return mask, 0.95

    monkeypatch.setattr("app.geodata.segmentasi_atap", inferensi)
    client = TestClient(app)
    pratinjau = client.get(f"/api/v1/scans/{RUMAH_SNAPSHOT}").json()
    assert pratinjau["analisis"] is None
    assert pratinjau["bangunan"]["perkiraan_jenis"] == "rumah"
    assert RUMAH_SNAPSHOT not in {b["id"] for b in client.get("/api/v1/catalog").json()}

    hasil = client.post("/api/v1/scans", json={"building_id": RUMAH_SNAPSHOT})
    assert hasil.status_code == 200
    assert hasil.json()["analisis"]["building_id"] == RUMAH_SNAPSHOT
    assert RUMAH_SNAPSHOT in client.get("/api/v1/scans").json()
    katalog = {b["id"]: b for b in client.get("/api/v1/catalog").json()}
    assert katalog[RUMAH_SNAPSHOT]["perkiraan_jenis"] == "rumah"
    assert baca("bangunan", RUMAH_SNAPSHOT)[0]["_timestamp_osm"] == "2026-10-14T16:04:41Z"
