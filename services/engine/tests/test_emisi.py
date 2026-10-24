"""L5: faktor emisi grid per lokasi (Gatrik 2019, CM ex-ante OM 0,75/BM 0,25)."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.carbon import FaktorEmisiGrid
from app.emisi import (
    BERKAS,
    VERSION,
    faktor_emisi_provinsi,
    faktor_emisi_wilayah,
    info_wilayah,
)
from app.main import app
from app.sumber import faktor_emisi, registri
from app.wilayah_id import semua_provinsi

ROOT = Path(__file__).resolve().parents[3]
klien = TestClient(app)
data = json.loads(BERKAS.read_text(encoding="utf-8"))
sistem = {s["no"]: s for s in data["sistem"]}

# Titik acuan: pusat kota provinsi.
BENGKULU = (-3.7605, 102.2725)
JAKARTA = (-6.1754, 106.8272)
MAKASSAR = (-5.1477, 119.4327)
MANADO = (1.4748, 124.8421)
PONTIANAK = (-0.0263, 109.3425)
SAMARINDA = (-0.5022, 117.1536)
MATARAM = (-8.5833, 116.1167)
TERNATE = (0.7833, 127.3667)
KUPANG = (-10.1772, 123.607)
DENPASAR = (-8.6705, 115.2126)
BANJARMASIN = (-3.3194, 114.5908)
JAYAPURA = (-2.5337, 140.7181)


def test_versi_l5():
    assert VERSION.startswith("l5.")


# --- Integritas data ------------------------------------------------------


def test_tabel_memuat_154_sistem_berurutan():
    assert [s["no"] for s in data["sistem"]] == list(range(1, 155))
    assert all(s["halaman"] in range(1, 8) for s in data["sistem"])


def test_nilai_sumatera_dan_jamali_sama_dengan_registri_dan_dokumen():
    reg = registri()["ef_grid_sumatera_2019"]["nilai"]
    s = sistem[125]
    assert s["nama"] == "Sumatera"
    assert s["om"] == reg["om"]
    assert s["bm"] == reg["bm"]
    assert s["cm_ex_post_075"] == reg["cm_ex_post_om_075_bm_025"]
    assert s["cm_ex_ante_050"] == reg["cm_ex_ante_om_050_bm_050"]
    assert s["cm_ex_ante_075"] == reg["cm_ex_ante_om_075_bm_025"] == 0.84
    assert sistem[38]["nama"] == "Jamali"
    assert sistem[38]["cm_ex_ante_075"] == 0.83


def test_entri_registri_lengkap_dan_cocok_dengan_berkas():
    e = registri()["ef_grid_gatrik_2019"]
    assert e["penerbit"] and e["url"].startswith("https://") and e["diambil"]
    assert e["status"] == "terverifikasi"
    assert e["url"] == data["_sumber"]["url"] == registri()["ef_grid_sumatera_2019"]["url"]
    n = e["nilai"]
    assert n["jumlah_sistem"] == len(data["sistem"])
    for kunci, no in {
        "sumatera": 125,
        "jamali": 38,
        "sulselbar": 123,
        "sulutgo": 124,
        "khatulistiwa": 48,
        "barito": 10,
        "mahakam": 73,
        "tarakan": 135,
    }.items():
        assert n[kunci] == sistem[no]["cm_ex_ante_075"]


def test_pemetaan_mencakup_34_provinsi_wilayah_id():
    iso = {p["iso"] for p in data["pemetaan_provinsi"]}
    assert iso == {p.iso for p in semua_provinsi()}
    assert len(data["pemetaan_provinsi"]) == 34


def test_status_konsisten_dengan_sistem_dan_nilai():
    for p in data["pemetaan_provinsi"]:
        assert p["status"] in {"terverifikasi", "perkiraan", "belum_diverifikasi"}
        assert p["dasar"]
        if p["status"] == "belum_diverifikasi":
            assert p["sistem_no"] is None
        else:
            assert sistem[p["sistem_no"]]["cm_ex_ante_075"] is not None
        if p["status"] != "terverifikasi" and p["rentang"]:
            terendah, tertinggi = p["rentang"]
            assert 0 < terendah <= tertinggi


def test_sistem_terverifikasi_tercantum_pada_kolom_provinsi_dokumen():
    for p in data["pemetaan_provinsi"]:
        if p["status"] != "terverifikasi":
            continue
        grid = sistem[p["sistem_no"]]
        # Nama pada dokumen: "Dki Jakarta", "Di Yogyakarta"; bandingkan tanpa huruf besar.
        nama = {n.lower() for n in grid["provinsi"]}
        assert p["nama"].lower() in nama


def test_provinsi_perkiraan_memilih_grid_dengan_lebih_dari_separuh_pembangkit():
    nama_dok = {  # provinsi perkiraan -> nama pada kolom Provinsi dokumen
        "ID-BB": "Bangka Belitung",
        "ID-NB": "Nusa Tenggara Barat",
        "ID-MU": "Maluku Utara",
        "ID-PB": "Papua Barat",
    }
    perkiraan = [p for p in data["pemetaan_provinsi"] if p["status"] == "perkiraan"]
    # Bali dan Kalimantan Selatan dipasangkan menurut nama/wilayah sistem, diuji terpisah.
    assert {p["iso"] for p in perkiraan} == set(nama_dok) | {"ID-BA", "ID-KS"}
    perkiraan = [p for p in perkiraan if p["iso"] in nama_dok]
    for p in perkiraan:
        grid = [s for s in data["sistem"] if nama_dok[p["iso"]] in s["provinsi"]]
        total = sum(s["total_pembangkit"] for s in grid)
        dipilih = sistem[p["sistem_no"]]
        assert dipilih["total_pembangkit"] * 2 > total
        assert dipilih["total_pembangkit"] == max(s["total_pembangkit"] for s in grid)


# --- Pemetaan titik -------------------------------------------------------


@pytest.mark.parametrize(
    ("titik", "iso", "nama_sistem", "nilai", "status"),
    [
        (BENGKULU, "ID-BE", "Sumatera", 0.84, "terverifikasi"),
        (JAKARTA, "ID-JK", "Jamali", 0.83, "terverifikasi"),
        (MAKASSAR, "ID-SN", "Sulselbar", 0.84, "terverifikasi"),
        (MANADO, "ID-SA", "Sulutgo", 0.72, "terverifikasi"),
        (PONTIANAK, "ID-KB", "Khatulistiwa", 1.31, "terverifikasi"),
        (SAMARINDA, "ID-KI", "Mahakam", 1.13, "terverifikasi"),
        (MATARAM, "ID-NB", "Lombok", 1.11, "perkiraan"),
        (TERNATE, "ID-MU", "Ternate - Tidore", 0.66, "perkiraan"),
    ],
)
def test_faktor_per_lokasi(titik, iso, nama_sistem, nilai, status):
    f = faktor_emisi_wilayah(*titik)
    assert f.provinsi_iso == iso
    assert f.sistem == nama_sistem
    assert f.ef_tco2_mwh == nilai
    assert f.status == status
    assert f.pendekatan == (status == "perkiraan")
    assert f.tahun_data == 2019
    assert f.sumber_id == "ef_grid_gatrik_2019"
    assert "96d7c-nilai-fe-grk" in f.sumber_url


@pytest.mark.parametrize(
    ("titik", "iso", "rentang"),
    [
        (KUPANG, "ID-NT", (0.58, 1.2)),
        (JAYAPURA, "ID-PA", (0.58, 0.66)),
    ],
)
def test_provinsi_tanpa_faktor_tidak_ditebak(titik, iso, rentang):
    f = faktor_emisi_wilayah(*titik)
    assert f.provinsi_iso == iso
    assert f.status == "belum_diverifikasi"
    assert f.sistem is None and f.sistem_no is None and f.ef_tco2_mwh is None
    assert f.rentang_tco2_mwh == rentang


def test_faktor_provinsi_menurut_kode_iso():
    assert faktor_emisi_provinsi("ID-BE").ef_tco2_mwh == 0.84
    assert faktor_emisi_provinsi("ID-JB").ef_tco2_mwh == 0.83


def test_luar_indonesia_tidak_ada_faktor():
    assert faktor_emisi_wilayah(3.139, 101.6869) is None  # Kuala Lumpur
    assert faktor_emisi_wilayah(0.0, 90.0) is None  # Samudra Hindia
    assert info_wilayah(51.5, -0.12) is None  # London


# --- Endpoint -------------------------------------------------------------


def test_endpoint_wilayah_bengkulu():
    r = klien.get("/api/v1/wilayah", params={"lat": BENGKULU[0], "lon": BENGKULU[1]})
    assert r.status_code == 200
    j = r.json()
    assert j["provinsi_iso"] == "ID-BE"
    assert j["provinsi_nama"] == "Bengkulu"
    assert j["sistem_grid"] == "Sumatera"
    assert j["ef_grid_tco2_mwh"] == 0.84
    assert j["rentang_tco2_mwh"] is None
    assert j["tahun_data"] == 2019
    assert j["status"] == "terverifikasi"
    assert j["sumber_id"] == "ef_grid_gatrik_2019"
    assert "CO2" in j["metode"]


def test_endpoint_wilayah_tanpa_faktor_membawa_rentang():
    r = klien.get("/api/v1/wilayah", params={"lat": KUPANG[0], "lon": KUPANG[1]})
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "belum_diverifikasi"
    assert j["ef_grid_tco2_mwh"] is None and j["sistem_grid"] is None
    assert j["rentang_tco2_mwh"] == [0.58, 1.2]


def test_endpoint_di_luar_indonesia_out_of_coverage():
    r = klien.get("/api/v1/wilayah", params={"lat": 3.139, "lon": 101.6869})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "OUT_OF_COVERAGE"
    assert r.json()["error"]["retriable"] is False


@pytest.mark.parametrize(
    "params",
    [{"lat": 1.0}, {"lon": 100.0}, {"lat": "abc", "lon": 100.0}, {"lat": 91, "lon": 100.0}, {}],
)
def test_endpoint_masukan_tidak_valid_422(params):
    r = klien.get("/api/v1/wilayah", params=params)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# --- sumber.faktor_emisi: kompatibel mundur dan sadar lokasi ----------------


def test_faktor_emisi_tanpa_lokasi_tetap_seperti_semula():
    ef, rujukan = faktor_emisi(0.84)
    assert ef == FaktorEmisiGrid(
        sistem="Sumatera",
        nilai_tco2_per_mwh=0.84,
        tahun=2019,
        sumber_url=registri()["ef_grid_sumatera_2019"]["url"],
    )
    assert rujukan == "Gatrik, Sumatera 2019, CM ex-ante OM/BM 0,75/0,25; komponen CO2 saja"
    ef, rujukan = faktor_emisi(0.76)
    assert (ef.sistem, ef.tahun, ef.sumber_url) == (
        "Sumatera",
        0,
        "https://petasurya.id/metodologi",
    )
    assert rujukan == "Faktor emisi masukan pengguna; tahun dan metode belum diverifikasi"


def test_faktor_emisi_bengkulu_identik_dengan_tanpa_lokasi():
    assert faktor_emisi(0.84, *BENGKULU) == faktor_emisi(0.84)


def test_faktor_emisi_klaim_sumber_hanya_bila_cocok_dengan_sistem_titik():
    ef, rujukan = faktor_emisi(0.83, *JAKARTA)
    assert (ef.sistem, ef.tahun) == ("Jamali", 2019)
    assert rujukan == "Gatrik, Jamali 2019, CM ex-ante OM/BM 0,75/0,25; komponen CO2 saja"
    # 0,84 resmi untuk Sumatera, bukan untuk Jakarta.
    ef, rujukan = faktor_emisi(0.84, *JAKARTA)
    assert ef.tahun == 0 and ef.sumber_url == "https://petasurya.id/metodologi"
    assert "masukan pengguna" in rujukan
    # Nilai Jamali tidak resmi bila titiknya di Sumatera.
    assert faktor_emisi(0.83, *BENGKULU)[0].tahun == 0


def test_faktor_emisi_perkiraan_ditandai_pada_label():
    ef, rujukan = faktor_emisi(1.11, *MATARAM)
    assert ef.sistem == "Lombok" and ef.tahun == 2019
    assert "perkiraan" in rujukan and "Nusa Tenggara Barat" in rujukan
    assert "perkiraan" not in faktor_emisi(0.84, *BENGKULU)[1]


@pytest.mark.parametrize(
    ("titik", "iso", "nama_sistem", "nilai"),
    [(DENPASAR, "ID-BA", "Jamali", 0.83), (BANJARMASIN, "ID-KS", "Barito", 1.21)],
)
def test_bali_dan_kalsel_perkiraan_menurut_sistem_interkoneksi(titik, iso, nama_sistem, nilai):
    f = faktor_emisi_wilayah(*titik)
    assert (f.provinsi_iso, f.sistem, f.ef_tco2_mwh, f.status) == (
        iso,
        nama_sistem,
        nilai,
        "perkiraan",
    )


def test_faktor_emisi_tanpa_faktor_atau_luar_indonesia_adalah_masukan_pengguna():
    for titik in (KUPANG, JAYAPURA, (3.139, 101.6869)):
        ef, rujukan = faktor_emisi(0.84, *titik)
        assert ef.tahun == 0 and ef.sistem == "Masukan pengguna"
        assert "masukan pengguna" in rujukan


def test_faktor_emisi_lokasi_wajib_lengkap():
    with pytest.raises(ValueError):
        faktor_emisi(0.84, lat=-3.76)
    with pytest.raises(ValueError):
        faktor_emisi(0.84, lon=102.27)
