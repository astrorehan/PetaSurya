"""L3 cuaca per lokasi: sel NASA POWER, berkas Bengkulu bawaan, cache, dan kegagalan."""

import copy
import gzip
import json
import os
import threading
import time
from pathlib import Path
from urllib.error import HTTPError, URLError

import numpy as np
import pandas as pd
import pvlib
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from app import cuaca
from app.buildings import muat_katalog
from app.contracts import BangunanRingkas, GalatApi, HasilSimulasi, KodeGalat
from app.cuaca import (
    JAM_TAHUN,
    KUNCI_BAWAAN,
    LAT_BAWAAN,
    LON_BAWAAN,
    kunci_sel,
    muat_cuaca,
    titik_sel,
)
from app.main import app

ROOT = Path(__file__).resolve().parents[3]
client = TestClient(app)
PARAMETER = json.loads((ROOT / "data/fixtures/parameter/fisika-contoh.json").read_text("utf-8"))
MENTAH = json.loads(cuaca.BERKAS_CUACA.read_text(encoding="utf-8"))
JAKARTA = (-6.1754, 106.8272)


@pytest.fixture(autouse=True)
def kosongkan_cache_memori():
    cuaca._muat_sel.cache_clear()
    yield
    cuaca._muat_sel.cache_clear()


@pytest.fixture
def unduhan(monkeypatch):
    """Ganti pemanggilan NASA POWER dengan respons tiruan; catat titik yang diminta."""
    panggilan: list[tuple[float, float]] = []

    def palsu(lat, lon):
        panggilan.append((lat, lon))
        isi = copy.deepcopy(MENTAH)
        isi["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"] = {
            k: v * 0.5 for k, v in isi["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"].items()
        }
        return isi

    monkeypatch.setattr("app.cuaca.ambil_nasa", palsu)
    return panggilan


def tanpa_jaringan(monkeypatch):
    def gagal(lat, lon):
        raise AssertionError("jaringan tidak boleh dipakai")

    monkeypatch.setattr("app.cuaca.ambil_nasa", gagal)


def test_kunci_sel_mengikuti_tepi_sel_asli_power():
    # Tepi hasil sapuan API: surya di bilangan bulat; meteorologi di ±0,25° dan ±0,3125°.
    assert KUNCI_BAWAAN == (-4, 102, -8, 164)
    assert kunci_sel(-3.76, 102.30) == kunci_sel(-3.99, 102.80)
    assert kunci_sel(-3.74, 102.30) != kunci_sel(-3.76, 102.30)  # tepi meteorologi -3,75
    assert kunci_sel(-3.0, 102.3)[0] == -3 and kunci_sel(-3.01, 102.3)[0] == -4  # tepi surya
    assert kunci_sel(-3.76, 102.18) != kunci_sel(-3.76, 102.19)  # tepi meteorologi 102,1875
    assert kunci_sel(-3.76, 101.99)[1] == 101 and kunci_sel(-3.76, 102.0)[1] == 102


@pytest.mark.parametrize("titik", [(float("nan"), 100.0), (0.0, float("inf")), (95.0, 10.0)])
def test_koordinat_tidak_valid_ditolak(titik):
    with pytest.raises(ValueError):
        kunci_sel(*titik)


def test_titik_kanonik_ada_di_sel_yang_sama_dan_jauh_dari_tepi():
    rng = np.random.default_rng(7)
    for lat, lon in zip(rng.uniform(-11, 6, 300), rng.uniform(95, 141, 300), strict=True):
        kunci = kunci_sel(float(lat), float(lon))
        pusat = titik_sel(kunci)
        assert kunci_sel(*pusat) == kunci
        # Bergeser 0,01° ke tiap arah (jauh lebih kecil dari separuh irisan) tetap sel sama.
        for dlat, dlon in [(0.01, 0), (-0.01, 0), (0, 0.01), (0, -0.01)]:
            assert kunci_sel(pusat[0] + dlat, pusat[1] + dlon) == kunci


def test_titik_berdekatan_berbagi_kunci_tetapi_sel_lain_tidak():
    assert kunci_sel(*JAKARTA) == kunci_sel(JAKARTA[0] + 0.05, JAKARTA[1] - 0.05)
    assert kunci_sel(*JAKARTA) != kunci_sel(-3.76, 102.27)


def test_semua_katalog_kota_bengkulu_memakai_berkas_bawaan_tanpa_jaringan(monkeypatch):
    tanpa_jaringan(monkeypatch)
    katalog = muat_katalog()
    assert len(katalog) > 9
    for bangunan in katalog:
        titik = shape(bangunan.geom.model_dump(mode="json")).representative_point()
        tabel, info = muat_cuaca(titik.y, titik.x)
        assert info.bawaan, bangunan.id
        assert (info.lat, info.lon, info.tahun) == (LAT_BAWAAN, LON_BAWAAN, 2024)
        assert tabel is cuaca.muat_cuaca_bengkulu()


def test_sembilan_bangunan_demo_memakai_berkas_bawaan(monkeypatch):
    tanpa_jaringan(monkeypatch)
    demo = json.loads((ROOT / "data/fixtures/demo.json").read_text(encoding="utf-8"))
    assert len(demo) == 9
    for entri in demo:
        bangunan = BangunanRingkas.model_validate(entri["bangunan"])
        titik = shape(bangunan.geom.model_dump(mode="json")).representative_point()
        assert muat_cuaca(titik.y, titik.x)[1].bawaan, bangunan.id


def test_berkas_bawaan_terbaca_sama_dengan_penguraian_lama():
    parameter = MENTAH["properties"]["parameter"]
    index = pd.to_datetime(list(parameter["T2M"]), format="%Y%m%d%H", utc=True).tz_convert(
        "Asia/Jakarta"
    )
    lama = pd.DataFrame(
        {
            "ghi": list(parameter["ALLSKY_SFC_SW_DWN"].values()),
            "dni": list(parameter["ALLSKY_SFC_SW_DNI"].values()),
            "dhi": list(parameter["ALLSKY_SFC_SW_DIFF"].values()),
            "temp_air": list(parameter["T2M"].values()),
            "wind_speed": list(parameter["WS2M"].values()),
        },
        index=index,
    ).clip(lower=0)
    pd.testing.assert_frame_equal(cuaca.muat_cuaca_bengkulu(), lama, check_exact=True)
    assert len(lama) == JAM_TAHUN


def test_unduhan_sekali_per_sel_lalu_dari_cache_disk(unduhan, tmp_path):
    tabel, info = muat_cuaca(*JAKARTA)
    assert not info.bawaan and len(unduhan) == 1
    assert kunci_sel(*unduhan[0]) == kunci_sel(*JAKARTA)
    assert (info.lat, info.lon) == unduhan[0]
    berkas = list((tmp_path / "cuaca").glob("*.json.gz"))
    assert len(berkas) == 1
    assert json.loads(gzip.decompress(berkas[0].read_bytes()))["properties"]

    muat_cuaca(JAKARTA[0] + 0.04, JAKARTA[1] + 0.04)  # sel sama, memori
    cuaca._muat_sel.cache_clear()
    ulang, _ = muat_cuaca(*JAKARTA)  # memori kosong → disk
    assert len(unduhan) == 1
    pd.testing.assert_frame_equal(tabel, ulang)

    muat_cuaca(-6.9175, 107.6191)  # Bandung: sel lain
    assert len(unduhan) == 2


def test_cache_rusak_diambil_ulang(unduhan, tmp_path):
    muat_cuaca(*JAKARTA)
    berkas = next((tmp_path / "cuaca").glob("*.json.gz"))
    berkas.write_bytes(b"bukan gzip")
    cuaca._muat_sel.cache_clear()
    muat_cuaca(*JAKARTA)
    assert len(unduhan) == 2


def test_permintaan_serempak_satu_sel_mengunduh_sekali(monkeypatch):
    jumlah = []

    def lambat(lat, lon):
        jumlah.append(1)
        time.sleep(0.2)
        return MENTAH

    monkeypatch.setattr("app.cuaca.ambil_nasa", lambda lat, lon: lambat(lat, lon))
    hasil = []
    utas = [
        threading.Thread(target=lambda: hasil.append(muat_cuaca(*JAKARTA)[1])) for _ in range(6)
    ]
    for u in utas:
        u.start()
    for u in utas:
        u.join()
    assert len(hasil) == 6 and len(jumlah) == 1


def test_kegagalan_jaringan_menjadi_oserror(monkeypatch):
    monkeypatch.setattr("app.cuaca.time.sleep", lambda s: None)

    def putus(*args, **kwargs):
        raise URLError("tidak ada koneksi")

    monkeypatch.setattr("app.cuaca.urlopen", putus)
    with pytest.raises(OSError, match="NASA POWER"):
        muat_cuaca(*JAKARTA)


def test_http_klien_tidak_diulang_dan_server_diulang(monkeypatch):
    monkeypatch.setattr("app.cuaca.time.sleep", lambda s: None)
    kode = {"nilai": 422, "jumlah": 0}

    def gagal(*args, **kwargs):
        kode["jumlah"] += 1
        raise HTTPError("u", kode["nilai"], "x", {}, None)

    monkeypatch.setattr("app.cuaca.urlopen", gagal)
    with pytest.raises(OSError):
        cuaca.ambil_nasa(*JAKARTA)
    assert kode["jumlah"] == 1
    kode.update(nilai=503, jumlah=0)
    with pytest.raises(OSError):
        cuaca.ambil_nasa(*JAKARTA)
    assert kode["jumlah"] == cuaca.PERCOBAAN


def test_respons_bukan_json_menjadi_oserror(monkeypatch):
    monkeypatch.setattr("app.cuaca._unduh", lambda url: b"<html>maintenance</html>")
    with pytest.raises(OSError, match="JSON"):
        muat_cuaca(*JAKARTA)


def test_url_unduhan_memakai_utc_dan_parameter_yang_sama_dengan_berkas_bawaan(monkeypatch):
    url = []
    monkeypatch.setattr("app.cuaca._unduh", lambda u: url.append(u) or b"{}")
    cuaca.ambil_nasa(-6.1, 106.9)
    (u,) = url
    for bagian in (
        "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF,T2M,WS2M",
        "community=RE",
        "start=20240101",
        "end=20241231",
        "time-standard=UTC",
        "latitude=-6.1",
    ):
        assert bagian in u


@pytest.mark.parametrize("hapus", ["T2M", "ALLSKY_SFC_SW_DNI"])
def test_respons_tidak_lengkap_ditolak(hapus):
    isi = copy.deepcopy(MENTAH)
    del isi["properties"]["parameter"][hapus]
    with pytest.raises(OSError, match="tidak lengkap"):
        cuaca._ke_dataframe(isi)
    isi = copy.deepcopy(MENTAH)
    isi["properties"]["parameter"]["T2M"].popitem()
    with pytest.raises(OSError, match="8.784"):
        cuaca._ke_dataframe(isi)


def test_nilai_hilang_pendek_diinterpolasi_dan_panjang_ditolak():
    isi = copy.deepcopy(MENTAH)
    t2m = isi["properties"]["parameter"]["T2M"]
    jam = list(t2m)
    for j in jam[100:102]:
        t2m[j] = -999.0
    tabel = cuaca._ke_dataframe(isi)
    asli = cuaca.muat_cuaca_bengkulu()["temp_air"]
    lo, hi = sorted([asli.iloc[99], asli.iloc[102]])
    assert (tabel["temp_air"].iloc[100:102].between(lo, hi)).all()
    for j in jam[200:210]:
        t2m[j] = -999.0
    with pytest.raises(OSError, match="celah"):
        cuaca._ke_dataframe(isi)


def test_label_zona_tidak_menggeser_posisi_matahari():
    # Indeks berlabel Asia/Jakarta dan UTC menunjuk instan yang sama → posisi sama,
    # juga untuk titik di WIT (Jayapura) yang jauh dari meridian WIB.
    wib = cuaca.muat_cuaca_bengkulu().index
    lokasi = pvlib.location.Location(-2.53, 140.72)
    a = lokasi.get_solarposition(wib)
    b = lokasi.get_solarposition(wib.tz_convert("UTC"))
    pd.testing.assert_frame_equal(a, b.set_axis(a.index), check_exact=False, rtol=1e-12)


def _simulasi():
    payload = {
        "roof_analysis_id": 9912,
        "parameter_fisika": json.loads(json.dumps(PARAMETER)),
        "asumsi": {
            "golongan_tarif": "R-1/TR",
            "daya_va": 2200,
            "tarif_rp_kwh": 1444.70,
            "scr": 0.40,
            "biaya_per_kwp": 15_000_000.0,
            "ef_grid_tco2_mwh": 0.76,
        },
    }
    return client.post("/api/v1/simulate", json=payload)


def _bangunan_di(lat, lon, identitas=991016391):
    d = 0.0001
    return BangunanRingkas(
        id=identitas,
        source="osm",
        source_ref=f"way/{identitas}",
        geom={
            "type": "Polygon",
            "coordinates": [
                [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]
            ],
        },
        footprint_m2=120.0,
        building_tag="yes",
    )


def test_simulasi_bengkulu_memakai_berkas_bawaan_dan_versi_tidak_berubah(monkeypatch):
    tanpa_jaringan(monkeypatch)
    respons = _simulasi()
    assert respons.status_code == 200, respons.text
    hasil = HasilSimulasi.model_validate(respons.json())
    assert (hasil.cuaca.lat, hasil.cuaca.lon, hasil.cuaca.tahun) == (LAT_BAWAAN, LON_BAWAAN, 2024)
    assert "NASA POWER" in hasil.cuaca.sumber
    assert hasil.jejak.poa.sumber.endswith("cuaca NASA POWER 2024, titik -3,76; 102,27")
    assert "l3cuaca" not in hasil.engine_version


def test_simulasi_di_luar_bengkulu_memakai_cuaca_unduhan(monkeypatch, unduhan):
    bengkulu = HasilSimulasi.model_validate(_simulasi().json())
    assert unduhan == []  # Bengkulu tidak memanggil jaringan
    monkeypatch.setattr("app.buildings.cari_bangunan", lambda i: _bangunan_di(*JAKARTA, i))
    HasilSimulasi.model_validate(_simulasi().json())
    assert len(unduhan) == 1
    hasil = HasilSimulasi.model_validate(_simulasi().json())
    assert len(unduhan) == 1  # sel yang sama tidak diunduh ulang
    assert kunci_sel(hasil.cuaca.lat, hasil.cuaca.lon) == kunci_sel(*JAKARTA)
    assert (hasil.cuaca.lat, hasil.cuaca.lon) == unduhan[0]
    assert hasil.engine_version.endswith("+" + cuaca.VERSION)
    assert f"titik {hasil.cuaca.lat:.2f}".replace(".", ",") in hasil.jejak.poa.sumber
    # Respons tiruan memuat GHI separuh dari Bengkulu → energi lebih kecil.
    assert 0 < hasil.e_ac_kwh_yr1 < bengkulu.e_ac_kwh_yr1
    assert sum(hasil.monthly_kwh) == pytest.approx(hasil.e_ac_kwh_yr1, abs=0.2)


def test_simulasi_gagal_503_bila_cuaca_tidak_bisa_diambil(monkeypatch):
    monkeypatch.setattr("app.buildings.cari_bangunan", lambda i: _bangunan_di(*JAKARTA, i))

    def putus(lat, lon):
        raise OSError("Data cuaca NASA POWER tidak dapat diambil.")

    monkeypatch.setattr("app.cuaca.ambil_nasa", putus)
    respons = _simulasi()
    assert respons.status_code == 503
    assert GalatApi.model_validate(respons.json()).error.code == KodeGalat.GEODATA_UNAVAILABLE


def test_lokasi_tidak_ditemukan_tidak_jatuh_ke_bengkulu(monkeypatch):
    tanpa_jaringan(monkeypatch)
    monkeypatch.setattr("app.buildings.cari_bangunan", lambda i: None)
    respons = _simulasi()
    assert respons.status_code == 404
    assert GalatApi.model_validate(respons.json()).error.code == KodeGalat.BUILDING_NOT_FOUND


@pytest.mark.skipif(
    not os.environ.get("PETASURYA_UJI_NASA"), reason="memanggil jaringan NASA POWER"
)
def test_nasa_power_nyata_jakarta():
    tabel, info = muat_cuaca(*JAKARTA)
    assert len(tabel) == JAM_TAHUN and not info.bawaan
    ghi_tahun = tabel["ghi"].sum() / 1000
    assert 1400 < ghi_tahun < 2100  # kWh/m²/tahun, rentang wajar khatulistiwa
    assert tabel["temp_air"].between(15, 40).all()
