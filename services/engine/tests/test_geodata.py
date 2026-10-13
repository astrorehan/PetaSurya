"""Pengujian endpoint L1 geodata: /buildings, /geocode, dan /analyze."""

import pytest
from fastapi.testclient import TestClient

from app.contracts import AnalisisAtap, BangunanRingkas, GalatApi, KodeGalat
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolasi_hasil_l2(monkeypatch):
    from collections import OrderedDict

    monkeypatch.setattr("app.analyses._hasil", OrderedDict())


def test_get_buildings_dalam_radius():
    """Uji pencarian bangunan di sekitar titik toko WR Supratman (-3.76268, 102.27168)."""
    response = client.get(
        "/api/v1/buildings",
        params={"lat": -3.76268, "lon": 102.27168, "r": 100.0},
    )
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    assert len(items) >= 1

    # Validasi terhadap kontrak BangunanRingkas
    bangunan = [BangunanRingkas.model_validate(b) for b in items]
    ids = [b.id for b in bangunan]
    assert 991016391 in ids  # Toko Indomaret WR Supratman


def test_get_buildings_radius_melebihi_batas():
    """Uji penolakan radius r > 200 meter sesuai spesifikasi §04."""
    response = client.get(
        "/api/v1/buildings",
        params={"lat": -3.76268, "lon": 102.27168, "r": 250.0},
    )
    assert response.status_code == 422 or response.status_code == 400


def test_geocode_pencarian_nama():
    """Uji geocoding lokal dengan kata kunci nama tempat."""
    response = client.get("/api/v1/geocode", params={"q": "indomaret"})
    assert response.status_code == 200
    hasil = response.json()
    assert len(hasil) >= 1
    pertama = hasil[0]
    assert "lat" in pertama and "lon" in pertama
    assert pertama["building_id"] == 991016391


def test_geocode_tidak_ada_hasil():
    """Uji pencarian string acak menghasilkan daftar kosong tanpa galat."""
    response = client.get("/api/v1/geocode", params={"q": "kata_kunci_acak_tidak_dikenal_12345"})
    assert response.status_code == 200
    assert response.json() == []


def test_analyze_building_cv():
    """Uji hasil MobileSAM tersimpan untuk FH UNIB."""
    response = client.post("/api/v1/analyze", json={"building_id": 1146141501, "force": False})
    assert response.status_code == 200
    data = response.json()
    analisis = AnalisisAtap.model_validate(data)
    assert analisis.building_id == 1146141501
    assert analisis.method == "cv"
    assert analisis.confidence > 0.70


def test_analyze_force_melewati_hasil_tersimpan(monkeypatch):
    """Flag force benar-benar memanggil jalur inferensi, bukan fixture."""
    import numpy as np

    calls = []
    monkeypatch.setattr(
        "app.geodata.ambil_citra", lambda bingkai: np.zeros((480, 640, 3), np.uint8)
    )

    def inferensi(citra, footprint):
        calls.append(citra.shape)
        return np.zeros((480, 640), np.uint8), 0.0

    monkeypatch.setattr("app.geodata.segmentasi_atap", inferensi)
    response = client.post("/api/v1/analyze", json={"building_id": 1146141501, "force": True})
    assert response.status_code == 200
    assert response.json()["method"] == "footprint_fallback"
    assert response.json()["roof_analysis_id"] == 9914
    from app.simulation import cari_analisis_atap

    assert cari_analisis_atap(9914).roof_area_m2 == response.json()["roof_area_m2"]
    assert calls == [(480, 640, 3)]


def test_analyze_citra_tidak_tersedia_menjadi_fallback(monkeypatch):
    def tidak_tersedia(bingkai):
        raise OSError("Koneksi citra terputus")

    monkeypatch.setattr("app.geodata.ambil_citra", tidak_tersedia)
    response = client.post("/api/v1/analyze", json={"building_id": 1146141501, "force": True})
    assert response.status_code == 200
    assert response.json()["method"] == "footprint_fallback"
    assert response.json()["imagery"]["source"] == "tidak-tersedia"
    assert "terputus" in response.json()["peringatan"]


def test_analyze_menolak_id_tidak_positif():
    assert client.post("/api/v1/analyze", json={"building_id": 0}).status_code == 422


def test_analyze_building_fallback():
    """Uji analisis atap metode fallback untuk rumah kandang limun."""
    response = client.post("/api/v1/analyze", json={"building_id": 1145010599, "force": False})
    assert response.status_code == 200
    data = response.json()
    analisis = AnalisisAtap.model_validate(data)
    assert analisis.building_id == 1145010599
    assert analisis.method == "footprint_fallback"
    assert analisis.peringatan is not None


def test_analyze_building_tidak_ada(monkeypatch):
    """Uji analisis bangunan yang tidak terdaftar menghasilkan 404 BUILDING_NOT_FOUND."""
    monkeypatch.setattr("app.buildings.ambil_osm", lambda _: b"<osm/>")
    response = client.post("/api/v1/analyze", json={"building_id": 99999999, "force": False})
    assert response.status_code == 404
    galat = GalatApi.model_validate(response.json())
    assert galat.error.code == KodeGalat.BUILDING_NOT_FOUND
