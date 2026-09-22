"""Pengujian endpoint POST /api/v1/simulate terintegrasi L3-L5."""

from fastapi.testclient import TestClient

from app.contracts import GalatApi, HasilSimulasi, KodeGalat
from app.main import app

client = TestClient(app)


def test_simulate_toko_berhasil():
    """Uji simulasi sukses untuk bangunan toko WR Supratman (id 9912)."""
    payload = {
        "roof_analysis_id": 9912,
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
        "modul": {
            "wp": 550.0,
            "panjang_m": 2.278,
            "lebar_m": 1.134,
            "gamma_p": -0.0035,
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
    assert "IEC 61215" in hasil.jejak.suhu_sel.sumber

    # Versi gabungan mesin
    assert "l3." in hasil.engine_version
    assert "l4." in hasil.engine_version
    assert "l5." in hasil.engine_version


def test_simulate_atap_tidak_ditemukan():
    """Uji penanganan galat jika roof_analysis_id tidak terdaftar."""
    payload = {
        "roof_analysis_id": 999999,
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
