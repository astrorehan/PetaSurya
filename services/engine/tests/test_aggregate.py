"""Invariant L6: jumlah atap, pemilihan prioritas, cakupan, dan sumber."""

import gzip
import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import box

from app.aggregate import (
    BERKAS_WILAYAH,
    PermintaanAgregasiInput,
    hitung_bangunan,
    jalankan_agregasi,
    jumlahkan,
    muat_data_kota,
    pilih_atap,
    sha256_teks,
)
from app.main import app
from scripts.ambil_bangunan_kota import normalkan

ROOT = Path(__file__).resolve().parents[3]
REQUEST = json.loads((ROOT / "data/fixtures/kota/permintaan-bengkulu.json").read_text("utf-8"))


@pytest.fixture
def permintaan():
    return PermintaanAgregasiInput.model_validate(REQUEST)


@pytest.fixture
def bangunan():
    return [
        {"source_ref": "way/1", "nama": None, "wilayah_id": "a", "footprint_m2": 100},
        {"source_ref": "way/2", "nama": None, "wilayah_id": "b", "footprint_m2": 20},
        {"source_ref": "way/3", "nama": None, "wilayah_id": None, "footprint_m2": 60},
        {"source_ref": "way/4", "nama": None, "wilayah_id": "a", "footprint_m2": 1},
    ]


@pytest.fixture(autouse=True)
def fisika_analitik(monkeypatch):
    from app.aggregate import _atap_snapshot

    _atap_snapshot.cache_clear()
    monkeypatch.setattr("app.aggregate.energi_tahunan", lambda *args, **kwargs: 1200.0)


def test_module_count_dibulatkan_per_atap_bukan_setelah_luas_dijumlah(permintaan):
    p = permintaan.model_copy(deep=True)
    p.fraksi_layak = 1
    p.parameter_fisika.modul.panjang_m = 2
    p.parameter_fisika.modul.lebar_m = 1
    p.parameter_fisika.modul.wp = 500
    data = [{"source_ref": f"way/{i}", "wilayah_id": "a", "footprint_m2": 3.9} for i in (1, 2)]
    atap = hitung_bangunan(p, data)
    total = jumlahkan(atap)
    assert total.module_count == 2  # floor(3.9/2) + floor(3.9/2), bukan floor(7.8/2)
    assert total.kwp == 1
    assert total.e_ac_kwh_yr1 == 1200
    assert total.co2_ton_yr1 == pytest.approx(1.008)


def test_adopsi_memilih_atap_prioritas_bukan_mengalikan_energi(permintaan, bangunan):
    atap = hitung_bangunan(permintaan, bangunan)
    assert len(atap) == 3
    terpilih = pilih_atap(atap, 1 / 3, "kwp")
    assert [a.source_ref for a in terpilih] == ["way/1"]
    assert jumlahkan(terpilih).e_ac_kwh_yr1 > jumlahkan(atap).e_ac_kwh_yr1 / 3
    assert pilih_atap(atap, 0, "kwp") == ()
    assert len(pilih_atap(atap, 1, "kwp")) == 3
    assert len(pilih_atap(atap, 0.15, "kwp")) == 0


def test_tie_break_deterministik_dan_payback_null_terakhir(permintaan, bangunan):
    from dataclasses import replace

    atap = hitung_bangunan(permintaan, bangunan)
    seri = [replace(a, payback_years=10, lcoe_idr_kwh=1000) for a in atap]
    seri[0] = replace(seri[0], payback_years=None)
    assert [a.source_ref for a in pilih_atap(seri, 1, "payback")] == ["way/2", "way/3", "way/1"]
    assert [a.source_ref for a in pilih_atap(list(reversed(seri)), 1, "lcoe")] == [
        "way/1",
        "way/2",
        "way/3",
    ]


def test_total_kota_sama_dengan_wilayah_dan_tanpa_batas(permintaan, bangunan, monkeypatch):
    data = {**muat_data_kota(), "bangunan": bangunan}
    monkeypatch.setattr("app.aggregate.muat_data_kota", lambda: data)
    monkeypatch.setattr(
        "app.aggregate.muat_wilayah",
        lambda: [{"id": "a", "nama": "A"}, {"id": "b", "nama": "B"}, {"id": "c", "nama": "C"}],
    )
    permintaan.adopsi = 2 / 3
    hasil = jalankan_agregasi(permintaan)
    assert hasil.cakupan.n_tercatat == 4
    assert hasil.cakupan.n_layak == 3
    assert hasil.cakupan.n_terlalu_kecil == 1
    assert hasil.cakupan.n_tanpa_wilayah == 1
    assert hasil.wilayah[2].n_tercatat == 0
    for bagian in ("potensi", "skenario"):
        total = getattr(hasil, bagian)
        kelompok = [getattr(w, bagian) for w in [*hasil.wilayah, hasil.tanpa_wilayah]]
        for kolom in (
            "n_bangunan",
            "module_count",
            "kwp",
            "footprint_m2",
            "usable_area_m2",
            "e_ac_kwh_yr1",
            "co2_ton_yr1",
            "capex_idr",
            "savings_idr_yr1",
        ):
            assert getattr(total, kolom) == pytest.approx(
                math.fsum(getattr(w, kolom) for w in kelompok)
            ), kolom


def test_tanpa_luas_atau_scr_nol_tidak_menghasilkan_payback_palsu(permintaan, bangunan):
    permintaan.fraksi_layak = 0
    assert jumlahkan(hitung_bangunan(permintaan, bangunan)).payback_median_years is None
    permintaan.fraksi_layak = 0.7
    permintaan.asumsi.scr = 0
    permintaan.asumsi.faktor_ekspor = 0
    hasil = jumlahkan(hitung_bangunan(permintaan, bangunan))
    assert hasil.savings_idr_yr1 == 0
    assert hasil.payback_median_years is None


def test_normalisasi_multipolygon_mempertahankan_lubang_tanpa_duplikasi(monkeypatch):
    monkeypatch.setattr("scripts.ambil_bangunan_kota.batas_kota", lambda: box(0, 0, 10, 10))
    outer = [{"lon": x, "lat": y} for x, y in [(1, 1), (5, 1), (5, 5), (1, 5), (1, 1)]]
    inner = [{"lon": x, "lat": y} for x, y in [(2, 2), (3, 2), (3, 3), (2, 3), (2, 2)]]
    data, ditolak = normalkan(
        {
            "elements": [
                {
                    "type": "relation",
                    "id": 1,
                    "tags": {"building": "yes"},
                    "members": [
                        {"type": "way", "ref": 2, "role": "outer", "geometry": outer},
                        {"type": "way", "ref": 3, "role": "inner", "geometry": inner},
                    ],
                },
                {"type": "way", "id": 2, "tags": {"building": "yes"}, "geometry": outer},
                {"type": "way", "id": 4, "tags": {"building": "yes"}, "geometry": outer[:-1]},
            ]
        }
    )
    assert len(data) == 1
    assert data[0]["source_ref"] == "relation/1"
    assert len(data[0]["geom"]["coordinates"][0]) == 2
    assert ditolak["anggota_relasi"] == 1
    assert ditolak["geometri"] == 1


@pytest.mark.parametrize(
    ("kolom", "nilai"),
    [("adopsi", 1.1), ("fraksi_layak", -0.1), ("tilt_deg", 91), ("kode_wilayah", "9999")],
)
def test_api_menolak_masukan_dengan_amplop_galat(kolom, nilai):
    response = TestClient(app).post("/api/v1/aggregate", json={**REQUEST, kolom: nilai})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_api_menolak_nonfinite_pada_parameter_bersarang():
    masukan = json.loads(json.dumps(REQUEST))
    masukan["parameter_fisika"]["modul"]["gamma_p"] = float("-inf")
    response = TestClient(app).post(
        "/api/v1/aggregate",
        content=json.dumps(masukan),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_snapshot_dimuat_sama_pada_checkout_lf_dan_crlf(tmp_path, monkeypatch):
    """CI Linux menulis LF, Windows dengan autocrlf menulis CRLF; isi batasnya sama."""
    teks = BERKAS_WILAYAH.read_bytes().replace(b"\r\n", b"\n")
    berkas = tmp_path / "kecamatan.geojson"
    monkeypatch.setattr("app.aggregate.BERKAS_WILAYAH", berkas)
    try:
        jumlah = []
        for isi in (teks, teks.replace(b"\n", b"\r\n")):
            berkas.write_bytes(isi)
            muat_data_kota.cache_clear()
            jumlah.append(len(muat_data_kota()["bangunan"]))
        assert jumlah[0] == jumlah[1] > 1000
        assert muat_data_kota()["sha256_batas_kecamatan"] == sha256_teks(berkas)
        berkas.write_bytes(teks.replace(b"Sungai Serut", b"Sungai Serut Baru", 1))
        muat_data_kota.cache_clear()
        with pytest.raises(OSError, match="Batas kecamatan berubah"):
            muat_data_kota()
    finally:
        muat_data_kota.cache_clear()


def test_snapshot_memiliki_sumber_dan_objek_unik():
    data = json.loads(
        gzip.decompress((ROOT / "data/fixtures/kota/bangunan-bengkulu.json.gz").read_bytes())
    )
    assert len(data["bangunan"]) > 1000
    assert len({b["source_ref"] for b in data["bangunan"]}) == len(data["bangunan"])
    assert all(math.isfinite(b["footprint_m2"]) and b["footprint_m2"] > 0 for b in data["bangunan"])
    assert data["sumber"]["url"].startswith("https://")
    assert data["sumber"]["diambil"] == "2026-10-14"
