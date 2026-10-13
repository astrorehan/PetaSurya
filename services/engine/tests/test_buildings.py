import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from app.buildings import baca_osm, bangunan_di_kota, cari_bangunan, muat_katalog, temukan_area
from app.main import app

RAW = Path(__file__).resolve().parents[3] / "data/fixtures/bangunan/mentah/osm-unib-20261013.osm"


@pytest.fixture(autouse=True)
def cache_terpisah(tmp_path, monkeypatch):
    monkeypatch.setenv("PETASURYA_CACHE_DIR", str(tmp_path))


def test_katalog_memuat_bangunan_di_luar_sembilan_contoh():
    katalog = baca_osm(RAW.read_bytes())
    assert len(katalog) > 100
    assert len({b.id for b in katalog}) == len(katalog)
    assert all(shape(b.geom.model_dump()).is_valid for b in katalog)
    assert all(b.footprint_m2 > 0 for b in katalog)


def test_osm_bukan_bangunan_atau_poligon_terbuka_dilewati():
    xml = (
        b'<osm><node id="1" lon="102.268" lat="-3.761"/>'
        b'<node id="2" lon="102.269" lat="-3.761"/>'
        b'<way id="9"><nd ref="1"/><nd ref="2"/>'
        b'<tag k="building" v="yes"/></way></osm>'
    )
    assert baca_osm(xml) == []


def test_coverage_cuaca_tetap_kota_bengkulu():
    assert bangunan_di_kota(cari_bangunan(1146141501))
    from app.buildings import DiLuarCakupan

    with pytest.raises(DiLuarCakupan):
        temukan_area(-6.2, 106.8, 200)


def test_area_memakai_katalog_lokal_dan_radius(monkeypatch):
    monkeypatch.setattr(
        "app.buildings.ambil_osm", lambda _: pytest.fail("Katalog lokal tidak perlu jaringan")
    )
    hasil = temukan_area(-3.7606, 102.2683, 200, daring=False)
    assert len(hasil) > 9


def test_preview_bangunan_baru_belum_mengarang_hasil():
    baru = next(
        b
        for b in muat_katalog()
        if b.id
        not in {
            1146141501,
            1145010599,
            991016391,
            1146140956,
            1257322079,
            304512057,
            983558971,
            983558973,
            983558974,
        }
    )
    r = TestClient(app).get(f"/api/v1/scans/{baru.id}")
    assert r.status_code == 200
    assert r.json()["analisis"] is None
    assert r.json()["tersimpan"] is False
    assert r.json()["bangunan"]["id"] == baru.id
    assert len(r.json()["bingkai"]["tiles"]) >= 6


def test_gagal_sumber_daring_menghasilkan_galat_api(monkeypatch):
    def gagal(_):
        raise OSError("Jaringan terputus")

    monkeypatch.setattr("app.buildings.ambil_osm", gagal)
    r = TestClient(app).get(
        "/api/v1/buildings", params={"lat": -3.7606, "lon": 102.2683, "r": 200, "live": True}
    )
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "GEODATA_UNAVAILABLE"


def test_hasil_baru_bertahan_saat_proses_berganti(monkeypatch):
    from collections import OrderedDict

    from app.analyses import analisis_bangunan_terbaru, analisis_terbaru, simpan_analisis
    from app.contracts import AnalisisAtap

    data = json.loads((RAW.parents[2] / "analisis/cv-kampus-fh-unib.json").read_text("utf-8"))
    data.update(building_id=100000001, roof_analysis_id=1000000000001)
    simpan_analisis(AnalisisAtap.model_validate(data))
    monkeypatch.setattr("app.analyses._hasil", OrderedDict())
    assert analisis_bangunan_terbaru(data["building_id"]).roof_area_m2 == data["roof_area_m2"]
    assert analisis_terbaru(data["roof_analysis_id"]).building_id == data["building_id"]


def test_analisis_bangunan_baru_memakai_model_dan_muncul_pada_indeks(monkeypatch):
    from collections import OrderedDict

    import cv2
    import numpy as np

    baru = next(b for b in muat_katalog() if b.id == 304512048)
    panggilan = []
    monkeypatch.setattr(
        "app.geodata.ambil_citra", lambda f: np.zeros((f.tinggi, f.lebar, 3), np.uint8)
    )

    def inferensi(citra, footprint):
        panggilan.append(citra.shape)
        mask = np.zeros(citra.shape[:2], np.uint8)
        cv2.fillPoly(mask, [np.rint(footprint.exterior.coords).astype(np.int32)], 1)
        return mask, 0.95

    monkeypatch.setattr("app.geodata.segmentasi_atap", inferensi)
    client = TestClient(app)
    hasil = client.post("/api/v1/scans", json={"building_id": baru.id})
    assert hasil.status_code == 200
    assert hasil.json()["analisis"]["method"] == "cv"
    assert hasil.json()["tersimpan"] is False
    assert panggilan == [(480, 640, 3)]
    monkeypatch.setattr("app.analyses._hasil", OrderedDict())
    assert baru.id in client.get("/api/v1/scans").json()
    assert client.get(f"/api/v1/scans/{baru.id}").json()["tersimpan"] is True
