"""Pengujian endpoint POST /api/v1/simulate terintegrasi L3-L5."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.contracts import GalatApi, HasilSimulasi, KodeGalat
from app.main import app

client = TestClient(app)
PARAMETER_CONTOH = json.loads(
    (Path(__file__).resolve().parents[3] / "data/fixtures/parameter/fisika-contoh.json").read_text(
        encoding="utf-8"
    )
)


@pytest.fixture
def payload_simulasi():
    """Asumsi contoh pengujian, bukan nilai produksi terverifikasi."""
    return {
        "roof_analysis_id": 9912,
        "parameter_fisika": json.loads(json.dumps(PARAMETER_CONTOH)),
        "asumsi": {
            "golongan_tarif": "R-1/TR",
            "daya_va": 2200,
            "tarif_rp_kwh": 1444.70,
            "scr": 0.40,
            "biaya_per_kwp": 15_000_000.0,
            "ef_grid_tco2_mwh": 0.76,
        },
    }


@pytest.mark.parametrize(
    ("jalur", "nilai"),
    [
        (("roof_analysis_id",), 0),
        (("roof_analysis_id",), -1),
        (("usable_area_m2",), -1),
        (("usable_area_m2",), "Infinity"),
        (("usable_area_m2",), "NaN"),
        (("tilt_deg",), -1),
        (("tilt_deg",), 91),
        (("tilt_deg",), "NaN"),
        (("azimuth_deg",), -1),
        (("azimuth_deg",), 361),
        (("azimuth_deg",), "Infinity"),
        (("parameter_fisika", "modul", "wp"), "Infinity"),
        (("parameter_fisika", "modul", "panjang_m"), "Infinity"),
        (("parameter_fisika", "modul", "lebar_m"), "NaN"),
        (("parameter_fisika", "modul", "gamma_p"), "-Infinity"),
        (("parameter_fisika", "modul", "t_noct"), "Infinity"),
        (("parameter_fisika", "albedo"), "Infinity"),
        (("parameter_fisika", "derate", "kotoran"), -1),
        (("parameter_fisika", "derate", "inverter"), 1.1),
        (("asumsi", "tarif_rp_kwh"), "Infinity"),
        (("asumsi", "biaya_per_kwp"), "Infinity"),
        (("asumsi", "ef_grid_tco2_mwh"), "Infinity"),
        (("asumsi", "umur_tahun"), 0),
        (("asumsi", "umur_tahun"), -1),
    ],
)
def test_simulate_menolak_masukan_tidak_valid_sebelum_menghitung(
    payload_simulasi, monkeypatch, jalur, nilai
):
    def tidak_boleh_menghitung(permintaan):
        pytest.fail("Masukan tidak valid masuk ke mesin hitung")

    monkeypatch.setattr("app.main.jalankan_simulasi", tidak_boleh_menghitung)
    target = payload_simulasi
    for kunci in jalur[:-1]:
        target = target.setdefault(kunci, {})
    target[jalur[-1]] = nilai

    response = client.post("/api/v1/simulate", json=payload_simulasi)

    assert response.status_code == 422, response.text
    galat = GalatApi.model_validate(response.json())
    assert galat.error.code == KodeGalat.VALIDATION_ERROR
    assert not galat.error.retriable
    assert ".".join(jalur) in galat.error.hint


@pytest.mark.parametrize("nilai", [float("nan"), float("inf"), float("-inf")])
def test_simulate_menolak_non_finite_json_tanpa_galat_serialisasi(payload_simulasi, nilai):
    payload_simulasi["usable_area_m2"] = nilai
    response = client.post(
        "/api/v1/simulate",
        content=json.dumps(payload_simulasi),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert GalatApi.model_validate(response.json()).error.code == KodeGalat.VALIDATION_ERROR


@pytest.mark.parametrize("isi", ["", "{}", '{"asumsi":'])
def test_simulate_badan_tidak_lengkap_memakai_amplop_galat(isi):
    response = client.post(
        "/api/v1/simulate", content=isi, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    assert GalatApi.model_validate(response.json()).error.code == KodeGalat.VALIDATION_ERROR


@pytest.mark.parametrize(("tilt", "azimuth"), [(0, 0), (90, 360)])
def test_simulate_menerima_batas_sudut_atap(payload_simulasi, tilt, azimuth):
    payload_simulasi.update(tilt_deg=tilt, azimuth_deg=azimuth)
    response = client.post("/api/v1/simulate", json=payload_simulasi)
    assert response.status_code == 200, response.text
    assert HasilSimulasi.model_validate(response.json()).e_ac_kwh_yr1 > 0


def test_simulate_luas_nol_tetap_menghasilkan_roof_too_small(payload_simulasi):
    payload_simulasi["usable_area_m2"] = 0
    response = client.post("/api/v1/simulate", json=payload_simulasi)
    assert response.status_code == 400
    assert GalatApi.model_validate(response.json()).error.code == KodeGalat.ROOF_TOO_SMALL


def test_simulate_toko_berhasil():
    """Uji simulasi sukses untuk bangunan toko WR Supratman (id 9912)."""
    payload = {
        "roof_analysis_id": 9912,
        "parameter_fisika": PARAMETER_CONTOH,
        "asumsi": {
            "golongan_tarif": "B-1/TR",
            "daya_va": 5500,
            "tarif_rp_kwh": 1444.70,
            "scr": 0.75,
            "biaya_per_kwp": 14_000_000.0,
            "diskonto": 0.09,
            "eskalasi_tarif": 0.0,
            "degradasi_thn": 0.006,
            "umur_tahun": 25,
            "ef_grid_tco2_mwh": 0.76,
            "faktor_ekspor": 0.0,
        },
    }

    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    # Pastikan struktur respon valid 100% terhadap schema kontrak pydantic HasilSimulasi
    hasil = HasilSimulasi.model_validate(data)

    assert hasil.kwp > 0.0
    assert hasil.module_count > 0
    assert hasil.e_ac_kwh_yr1 > 0.0
    assert len(hasil.monthly_kwh) == 12
    assert abs(sum(hasil.monthly_kwh) - hasil.e_ac_kwh_yr1) < 1.0

    # Indikator ekonomi
    assert hasil.capex_idr == hasil.kwp * 14_000_000.0
    assert hasil.savings_idr_yr1 > 0.0
    assert hasil.payback_years is not None
    assert hasil.lcoe_idr_kwh > 0.0

    # Indikator emisi
    assert hasil.co2e_ton_yr > 0.0
    assert hasil.co2e_ton_25yr > hasil.co2e_ton_yr

    # Jejak rumus wajib ada
    assert hasil.jejak is not None
    assert "Perez" in hasil.jejak.poa.sumber or "Hay-Davies" in hasil.jejak.poa.sumber
    assert "NOCT" in hasil.jejak.suhu_sel.sumber

    # Versi gabungan mesin
    assert "l3." in hasil.engine_version
    assert "l4." in hasil.engine_version
    assert "l5." in hasil.engine_version


def test_simulate_atap_tidak_ditemukan():
    """Uji penanganan galat jika roof_analysis_id tidak terdaftar."""
    payload = {
        "roof_analysis_id": 999999,
        "parameter_fisika": PARAMETER_CONTOH,
        "asumsi": {
            "golongan_tarif": "R-1/TR",
            "daya_va": 2200,
            "tarif_rp_kwh": 1444.70,
            "scr": 0.40,
            "biaya_per_kwp": 15_000_000.0,
            "ef_grid_tco2_mwh": 0.76,
        },
    }
    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 404

    galat = GalatApi.model_validate(response.json())
    assert galat.error.code == KodeGalat.BUILDING_NOT_FOUND


def test_simulate_atap_terlalu_sempit():
    """Uji penanganan galat jika luas atap tidak muat untuk satu modul pun."""
    payload = {
        "roof_analysis_id": 9912,
        "usable_area_m2": 0.5,  # Terlalu kecil untuk panel 2.58 m²
        "parameter_fisika": PARAMETER_CONTOH,
        "asumsi": {
            "golongan_tarif": "R-1/TR",
            "daya_va": 2200,
            "tarif_rp_kwh": 1444.70,
            "scr": 0.40,
            "biaya_per_kwp": 15_000_000.0,
            "ef_grid_tco2_mwh": 0.76,
        },
    }
    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 400

    galat = GalatApi.model_validate(response.json())
    assert galat.error.code == KodeGalat.ROOF_TOO_SMALL
