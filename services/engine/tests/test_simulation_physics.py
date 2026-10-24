"""Regresi fisika API: NOCT, rugi berurutan, dan jejak yang dapat direproduksi."""

import copy
import json
import math
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.contracts import GalatApi, HasilSimulasi, KodeGalat
from app.cuaca import LAT_BAWAAN, LON_BAWAAN, SUMBER, TAHUN, InfoCuaca
from app.main import app
from app.physics import energi_tahunan
from app.simulation import muat_cuaca_bengkulu

client = TestClient(app)
INFO_BENGKULU = InfoCuaca(LAT_BAWAAN, LON_BAWAAN, TAHUN, SUMBER, bawaan=True)
BERKAS_PARAMETER = (
    Path(__file__).resolve().parents[3] / "data/fixtures/parameter/fisika-contoh.json"
)


@pytest.fixture
def permintaan_fisika(monkeypatch):
    # Satu jam isotropik pada atap datar: POA tepat 1000 W/m².
    cuaca = pd.DataFrame(
        {"ghi": [1000.0], "dni": [0.0], "dhi": [1000.0], "temp_air": [25.0], "wind_speed": [1.0]},
        index=pd.date_range("2024-01-01 12:00", periods=1, tz="Asia/Jakarta"),
    )
    monkeypatch.setattr("app.simulation.muat_cuaca", lambda lat, lon: (cuaca, INFO_BENGKULU))
    return {
        "roof_analysis_id": 9912,
        "usable_area_m2": 100.0,
        "tilt_deg": 0.0,
        "azimuth_deg": 0.0,
        "parameter_fisika": json.loads(BERKAS_PARAMETER.read_text(encoding="utf-8")),
        "asumsi": {
            "golongan_tarif": "R-1/TR",
            "daya_va": 2200,
            "tarif_rp_kwh": 1444.7,
            "scr": 0.42,
            "biaya_per_kwp": 14500000.0,
            "ef_grid_tco2_mwh": 0.76,
        },
    }


def hitung(payload):
    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 200, response.text
    return HasilSimulasi.model_validate(response.json())


def test_noct_dan_semua_faktor_derate_sesuai_rumus(permintaan_fisika):
    hasil = hitung(permintaan_fisika)
    parameter = permintaan_fisika["parameter_fisika"]
    modul = parameter["modul"]
    rugi = parameter["derate"]
    gabungan = math.prod(1 - rugi[k] for k in ["kotoran", "mismatch", "kabel_dc", "ketersediaan"])
    gabungan *= rugi["inverter"]
    suhu_sel = 25 + (modul["t_noct"] - 20) / 0.8
    acuan_kwh = hasil.kwp * (1 + modul["gamma_p"] * (suhu_sel - 25)) * gabungan

    assert hasil.e_ac_kwh_yr1 == pytest.approx(round(acuan_kwh, 1))
    assert hasil.monthly_kwh == [round(acuan_kwh, 1)] + [0.0] * 11
    assert hasil.jejak.derate.gabungan == pytest.approx(gabungan)
    assert hasil.jejak.derate.gabungan != hasil.pr
    assert hasil.parameter_fisika.model_dump() == {
        k: v for k, v in parameter.items() if not k.startswith("_")
    }
    assert "NOCT" in hasil.jejak.suhu_sel.rumus
    assert "45" in hasil.jejak.suhu_sel.rumus
    assert "SAPM" not in hasil.jejak.suhu_sel.sumber
    assert "Hay-Davies" in hasil.jejak.poa.sumber
    assert "Perez" not in hasil.jejak.poa.sumber
    assert "l3.2026.10.09" in hasil.engine_version


def test_noct_lebih_tinggi_menurunkan_energi(permintaan_fisika):
    permintaan_fisika["usable_area_m2"] = 10000.0
    awal = hitung(permintaan_fisika)
    permintaan_fisika["parameter_fisika"]["modul"]["t_noct"] = 55
    panas = hitung(permintaan_fisika)
    assert panas.e_ac_kwh_yr1 < awal.e_ac_kwh_yr1
    assert panas.savings_idr_yr1 < awal.savings_idr_yr1
    assert panas.co2e_ton_yr < awal.co2e_ton_yr


@pytest.mark.parametrize("kunci", ["kotoran", "mismatch", "kabel_dc", "inverter", "ketersediaan"])
def test_setiap_faktor_mempengaruhi_energi(permintaan_fisika, kunci):
    awal = hitung(permintaan_fisika)
    permintaan_fisika["parameter_fisika"]["derate"][kunci] = 0.5
    berkurang = hitung(permintaan_fisika)
    assert berkurang.e_ac_kwh_yr1 < awal.e_ac_kwh_yr1
    assert getattr(berkurang.jejak.derate, kunci) == 0.5


def test_inverter_tidak_dihitung_dua_kali(permintaan_fisika):
    parameter = permintaan_fisika["parameter_fisika"]
    parameter["modul"]["gamma_p"] = 0
    parameter["derate"].update(kotoran=0, mismatch=0, kabel_dc=0, inverter=0.5, ketersediaan=0)
    hasil = hitung(permintaan_fisika)
    assert hasil.e_ac_kwh_yr1 == pytest.approx(round(hasil.kwp * 0.5, 1))
    assert hasil.jejak.derate.gabungan == 0.5


def test_tanpa_matahari_pr_nol(permintaan_fisika, monkeypatch):
    cuaca = pd.DataFrame(
        {"ghi": [0.0], "dni": [0.0], "dhi": [0.0], "temp_air": [25.0], "wind_speed": [1.0]},
        index=pd.date_range("2024-01-01 00:00", periods=1, tz="Asia/Jakarta"),
    )
    monkeypatch.setattr("app.simulation.muat_cuaca", lambda lat, lon: (cuaca, INFO_BENGKULU))
    hasil = hitung(permintaan_fisika)
    assert hasil.e_ac_kwh_yr1 == 0
    assert hasil.pr == 0


@pytest.mark.parametrize("kunci", ["modul", "derate", "albedo"])
def test_parameter_fisika_tidak_memakai_default_tersembunyi(permintaan_fisika, kunci):
    del permintaan_fisika["parameter_fisika"][kunci]
    response = client.post("/api/v1/simulate", json=permintaan_fisika)
    assert response.status_code == 422
    assert GalatApi.model_validate(response.json()).error.code == KodeGalat.VALIDATION_ERROR


def test_parameter_fisika_wajib_dikirim(permintaan_fisika):
    del permintaan_fisika["parameter_fisika"]
    response = client.post("/api/v1/simulate", json=permintaan_fisika)
    assert response.status_code == 422


def test_parameter_tidak_berubah_setelah_perhitungan(permintaan_fisika):
    awal = copy.deepcopy(permintaan_fisika)
    hitung(permintaan_fisika)
    assert permintaan_fisika == awal


def test_rugi_penuh_tidak_menghasilkan_energi(permintaan_fisika):
    permintaan_fisika["parameter_fisika"]["derate"]["ketersediaan"] = 1.0
    hasil = hitung(permintaan_fisika)
    assert hasil.e_ac_kwh_yr1 == 0
    assert hasil.monthly_kwh == [0.0] * 12
    assert hasil.jejak.derate.gabungan == 0
    assert hasil.pr == 0


def test_api_sejalan_dengan_integrasi_tahunan_cuaca_nyata(permintaan_fisika, monkeypatch):
    cuaca = muat_cuaca_bengkulu()
    monkeypatch.setattr("app.simulation.muat_cuaca", lambda lat, lon: (cuaca, INFO_BENGKULU))
    hasil = hitung(permintaan_fisika)
    parameter = permintaan_fisika["parameter_fisika"]
    rugi = parameter["derate"]
    acuan = energi_tahunan(
        -3.76268,
        102.27168,
        0.0,
        0.0,
        cuaca,
        kwp=hasil.kwp,
        albedo=parameter["albedo"],
        gamma_pdc=parameter["modul"]["gamma_p"],
        t_noct_c=parameter["modul"]["t_noct"],
        kotoran=1 - rugi["kotoran"],
        mismatch=1 - rugi["mismatch"],
        kabel_dc=1 - rugi["kabel_dc"],
        efisiensi_inverter=rugi["inverter"],
        ketersediaan=1 - rugi["ketersediaan"],
    )
    # Pembulatan bulanan 0,1 kWh memberi selisih maksimal 12 × 0,05 kWh.
    assert hasil.e_ac_kwh_yr1 == pytest.approx(acuan, abs=0.6)
    assert sum(hasil.monthly_kwh) == pytest.approx(hasil.e_ac_kwh_yr1)
    ulang = hitung({**permintaan_fisika, "parameter_fisika": hasil.parameter_fisika.model_dump()})
    assert ulang.model_dump(exclude={"id"}) == hasil.model_dump(exclude={"id"})
