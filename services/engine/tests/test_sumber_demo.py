"""Sumber angka demo tetap cocok dengan masukan dan hasil yang disimpan."""

import json
from pathlib import Path

import pytest

from app.simulation import PermintaanSimulasi, jalankan_simulasi
from app.sumber import faktor_emisi, modul_demo, rujukan_biaya, rujukan_tarif

ROOT = Path(__file__).resolve().parents[3]


def test_biaya_tengah_rentang_iesr_dan_tahun_rujukan():
    assert "14–15 juta" in rujukan_biaya(14_500_000)
    assert "2020" in rujukan_biaya(14_500_000)
    assert "titik tengah" in rujukan_biaya(14_500_000)


def test_angka_biaya_ubah_tidak_mewarisi_klaim_sumber():
    assert "IESR" not in rujukan_biaya(12_000_000)
    assert "pengguna" in rujukan_biaya(12_000_000)


def test_tarif_b1_tidak_memakai_tarif_b2():
    assert "Permen" in rujukan_tarif("B-1/TR", 5500, 1100)
    assert "Permen" not in rujukan_tarif("B-1/TR", 5500, 1444.7)


def test_emisi_memakai_kolom_cm_surya_dan_tahun_data():
    ef, rujukan = faktor_emisi(0.84)
    assert ef.tahun == 2019
    assert "96d7c-nilai-fe-grk" in ef.sumber_url
    assert "ex-ante" in rujukan
    assert "0,75/0,25" in rujukan
    assert faktor_emisi(0.76)[0].tahun == 0


@pytest.mark.parametrize(
    "nama",
    [
        "contoh-3f8c.json",
        "contoh-limun-1145010599.json",
        "contoh-unib-1146141501.json",
    ],
)
def test_demo_menyimpan_sumber_dan_metrik_yang_konsisten(nama):
    hasil = json.loads((ROOT / "data/fixtures/simulasi" / nama).read_text(encoding="utf-8"))
    asumsi = hasil["asumsi"]
    assert hasil["parameter_fisika"]["modul"] == modul_demo()
    assert asumsi["biaya_per_kwp"] == 14_500_000
    assert asumsi["ef_grid_tco2_mwh"] == 0.84
    assert asumsi["faktor_ekspor"] == 0
    assert hasil["e_ac_kwh_yr1"] == pytest.approx(sum(hasil["monthly_kwh"]))
    assert hasil["capex_idr"] == pytest.approx(hasil["kwp"] * asumsi["biaya_per_kwp"])
    assert hasil["savings_idr_yr1"] == pytest.approx(
        hasil["e_ac_kwh_yr1"] * asumsi["scr"] * asumsi["tarif_rp_kwh"]
    )
    assert hasil["co2e_ton_yr"] == pytest.approx(hasil["e_ac_kwh_yr1"] / 1000 * 0.84, abs=0.005)
    assert "IESR" in hasil["jejak"]["ekonomi"]["sumber"]
    assert "2019" in hasil["jejak"]["karbon"]["sumber"]
    assert "dihitung" in hasil["_catatan"]


@pytest.mark.parametrize(
    ("nama", "analisis_id"),
    [
        ("contoh-3f8c.json", 9912),
        ("contoh-limun-1145010599.json", 9913),
        ("contoh-unib-1146141501.json", 9914),
    ],
)
def test_demo_dapat_diulang_dengan_mesin_termasuk_payback(nama, analisis_id):
    hasil = json.loads((ROOT / "data/fixtures/simulasi" / nama).read_text(encoding="utf-8"))
    ulang = jalankan_simulasi(
        PermintaanSimulasi(
            roof_analysis_id=analisis_id,
            asumsi=hasil["asumsi"],
            parameter_fisika=hasil["parameter_fisika"],
        )
    ).model_dump(mode="json")
    for kunci in ("capex_idr", "savings_idr_yr1", "payback_years", "npv_idr", "irr"):
        assert ulang[kunci] == hasil[kunci]
