"""L1: pencarian alamat; Nominatim diganti tiruan agar tes tidak memakai jaringan."""

import math
from urllib.error import URLError

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from app import alamat
from app.buildings import bangunan_snapshot
from app.main import app

RUMAH = 992085198  # rumah snapshot di luar katalog awal, sama dengan test_footprint


@pytest.fixture(autouse=True)
def bersih(monkeypatch):
    alamat._cari_nominatim.cache_clear()
    monkeypatch.setattr(alamat, "_terakhir", 0.0)
    yield
    alamat._cari_nominatim.cache_clear()


def tiruan(monkeypatch, hasil):
    url = []

    def ambil(u):
        url.append(u)
        if isinstance(hasil, Exception):
            raise hasil
        return hasil

    monkeypatch.setattr(alamat, "_ambil", ambil)
    return url


def item(lon, lat, **lain):
    nama = "Jalan Contoh, Kota Bengkulu, Indonesia"
    return {"lat": str(lat), "lon": str(lon), "display_name": nama, **lain}


def cari(q):
    return TestClient(app).get("/api/v1/alamat", params={"q": q})


def test_titik_di_dalam_rumah_memilih_footprint_itu(monkeypatch):
    titik = shape(bangunan_snapshot(RUMAH).geom.model_dump()).representative_point()
    url = tiruan(monkeypatch, [item(titik.x, titik.y, name="Rumah Contoh", addresstype="house")])
    r = cari("Jl. Contoh No. 1")
    assert r.status_code == 200
    h = r.json()["hasil"][0]
    assert (h["bangunan"]["id"], h["kecocokan"], h["jarak_m"]) == (RUMAH, "memuat", 0)
    assert h["presisi"] == "house"
    assert h["alamat"] == "Jalan Contoh, Kota Bengkulu"
    assert "OpenStreetMap" in r.json()["atribusi"]
    assert "countrycodes=id" in url[0] and "bounded" not in url[0] and "viewbox" not in url[0]


def test_titik_dekat_memakai_footprint_terdekat_dengan_jaraknya(monkeypatch):
    b = shape(bangunan_snapshot(RUMAH).geom.model_dump())
    x0, _, x1, y1 = b.bounds
    geser = 8 / 111_320  # ±8 m ke utara dari tepi atas
    tiruan(monkeypatch, [item((x0 + x1) / 2, y1 + geser, category="amenity")])
    h = cari("jalan dekat rumah").json()["hasil"][0]
    assert h["kecocokan"] in {"memuat", "terdekat"}
    assert h["jarak_m"] <= alamat.RADIUS_BANGUNAN_M


def test_titik_jauh_dari_bangunan_hanya_memindahkan_peta(monkeypatch):
    monkeypatch.setattr(alamat, "_bangunan_di_titik", lambda lon, lat: None)
    tiruan(monkeypatch, [item(102.2655, -3.7600, name="Lapangan")])
    h = cari("lapangan").json()["hasil"][0]
    assert h["bangunan"] is None and h["kecocokan"] is None and h["jarak_m"] is None


def test_titik_jalan_tidak_dipasangkan_ke_rumah_di_tepinya(monkeypatch):
    titik = shape(bangunan_snapshot(RUMAH).geom.model_dump()).representative_point()
    tiruan(monkeypatch, [item(titik.x, titik.y, category="highway", addresstype="road")])
    h = cari("jalan contoh").json()["hasil"][0]
    assert h["bangunan"] is None and h["presisi"] == "road"


def test_titik_di_luar_indonesia_dibuang(monkeypatch):
    tiruan(monkeypatch, [item(101.69, 3.15), item(103.85, 1.29)])  # Kuala Lumpur, Singapura
    assert cari("kuala lumpur").json()["hasil"] == []


def test_kueri_sama_tidak_dikirim_ulang(monkeypatch):
    url = tiruan(monkeypatch, [])
    cari("Jalan  Kapuas")
    cari("jalan kapuas")
    assert len(url) == 1


def test_permintaan_berjarak_minimal_satu_detik(monkeypatch):
    jeda = []
    monkeypatch.setattr(alamat.time, "sleep", jeda.append)
    monkeypatch.setattr(alamat, "urlopen", lambda *a, **k: (_ for _ in ()).throw(URLError("putus")))
    monkeypatch.setattr(alamat, "_terakhir", alamat.time.monotonic())
    with pytest.raises(OSError):
        alamat._ambil("https://contoh")
    assert jeda and math.isclose(jeda[0], alamat.JEDA_MIN_S, abs_tol=0.05)


def test_jaringan_gagal_menjadi_galat_503(monkeypatch):
    tiruan(monkeypatch, URLError("putus"))
    r = cari("jalan kapuas")
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "GEODATA_UNAVAILABLE"


@pytest.mark.parametrize("q", ["", "ab", "x" * 201])
def test_kueri_tidak_valid_ditolak(q):
    r = cari(q)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
