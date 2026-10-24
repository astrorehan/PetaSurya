"""L1: cakupan seluruh Indonesia; semua HTTP (OSM, Overpass, Nominatim) ditiru."""

import json
import math
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from app import alamat, osm_daring
from app.buildings import cari_bangunan, temukan_area
from app.contracts import FootprintArea
from app.main import app
from app.osm_daring import (
    dari_overpass,
    dari_xml,
    jendela_pusat,
    kotak_gabungan,
    sel_penutup,
    sel_titik,
)

# Monas, Jakarta Pusat
JKT = {"lon": 106.8272, "lat": -6.1754}
# bbox selebar ±1,6 km (≈ viewport zoom 15,5) berpusat di Monas
BBOX_JKT = {"barat": 106.8130, "selatan": -6.1890, "timur": 106.8410, "utara": -6.1620}
# Kuala Lumpur
BBOX_KL = {"barat": 101.68, "selatan": 3.14, "timur": 101.70, "utara": 3.16}
BBOX_BENGKULU = {"barat": 102.2655, "selatan": -3.7625, "timur": 102.2700, "utara": -3.7585}


@pytest.fixture(autouse=True)
def bersih(monkeypatch):
    monkeypatch.setattr(osm_daring, "JEDA_MIN_S", 0.0)
    monkeypatch.setattr(osm_daring, "_terakhir", 0.0)
    monkeypatch.setattr(osm_daring, "_overpass_sakit_sampai", 0.0)
    monkeypatch.setattr(alamat, "_terakhir", 0.0)
    alamat._cari_nominatim.cache_clear()
    yield
    alamat._cari_nominatim.cache_clear()


def way(identitas, lon, lat, sisi=0.0002, tags=None):
    """Elemen Overpass `out geom`: persegi `sisi` derajat (±22 m), sudut barat daya (lon, lat)."""
    cincin = [
        (lon, lat),
        (lon + sisi, lat),
        (lon + sisi, lat + sisi),
        (lon, lat + sisi),
        (lon, lat),
    ]
    return {
        "type": "way",
        "id": identitas,
        "tags": tags if tags is not None else {"building": "yes"},
        "geometry": [{"lat": y, "lon": x} for x, y in cincin],
    }


def jawaban_overpass(*elemen, remark=None):
    data = {"version": 0.6, "osm3s": {"timestamp_osm_base": "2026-10-24T10:00:00Z"}}
    data["elements"] = list(elemen)
    if remark:
        data["remark"] = remark
    return json.dumps(data).encode()


def xml_osm(*elemen):
    """Padanan XML /map untuk elemen `way` di atas."""
    simpul, jalan = [], []
    for el in elemen:
        ref = []
        for i, g in enumerate(el["geometry"]):
            nid = el["id"] * 10 + i
            simpul.append(f'<node id="{nid}" lat="{g["lat"]}" lon="{g["lon"]}"/>')
            ref.append(f'<nd ref="{nid}"/>')
        tag = "".join(f'<tag k="{k}" v="{v}"/>' for k, v in el["tags"].items())
        jalan.append(f'<way id="{el["id"]}">{"".join(ref)}{tag}</way>')
    return f"<osm>{''.join(simpul)}{''.join(jalan)}</osm>".encode()


class Jaringan:
    """Tiruan `osm_daring._ambil_url`; mencatat setiap panggilan."""

    def __init__(self, monkeypatch, overpass=None, api=None):
        self.panggilan: list[dict] = []
        self.overpass = overpass
        self.api = api
        monkeypatch.setattr(osm_daring, "_ambil_url", self)

    def __call__(self, url, *, data, timeout, batas_byte, accept):
        catatan = {"url": url}
        if data is not None:
            kueri = parse_qs(data.decode())["data"][0]
            kotak = kueri.split('way["building"](')[1].split(")")[0].split(",")
            catatan["kueri"] = kueri
            catatan["bbox"] = tuple(float(v) for v in kotak)  # selatan, barat, utara, timur
        else:
            barat, selatan, timur, utara = (float(v) for v in url.split("bbox=")[1].split(","))
            catatan["bbox"] = (selatan, barat, utara, timur)
        self.panggilan.append(catatan)
        asal = self.overpass if url == osm_daring.URL_OVERPASS else self.api
        if asal is None:
            raise URLError("tiruan: layanan tidak tersedia")
        hasil = asal(catatan) if callable(asal) else asal
        if isinstance(hasil, Exception):
            raise hasil
        return hasil

    @property
    def overpass_dipanggil(self):
        return [p for p in self.panggilan if p["url"] == osm_daring.URL_OVERPASS]

    @property
    def api_dipanggil(self):
        return [p for p in self.panggilan if p["url"] != osm_daring.URL_OVERPASS]


def footprints(**params):
    return TestClient(app).get("/api/v1/footprints", params=params)


def tanpa_jaringan(monkeypatch):
    def gagal(*a, **k):
        pytest.fail("Tidak boleh memakai jaringan")

    monkeypatch.setattr(osm_daring, "_ambil_url", gagal)
    monkeypatch.setattr("app.buildings.ambil_osm", gagal)


# ---- cakupan ---------------------------------------------------------------


@pytest.mark.parametrize(
    "bbox",
    [BBOX_KL, {"barat": -150.0, "selatan": 10.0, "timur": -149.9, "utara": 10.1}],
)
def test_bbox_di_luar_indonesia_ditolak(monkeypatch, bbox):
    tanpa_jaringan(monkeypatch)
    r = footprints(**bbox)
    assert r.status_code == 422
    galat = r.json()["error"]
    assert galat["code"] == "OUT_OF_COVERAGE" and "Indonesia" in galat["message"]
    assert "Bengkulu" not in galat["message"]


def test_pusat_bbox_di_luar_negeri_ditolak_walau_bbox_menyentuh_indonesia(monkeypatch):
    tanpa_jaringan(monkeypatch)
    # Dari Singapura (di luar) ke Pulau Batam (di dalam): bbox memotong Indonesia.
    r = footprints(barat=103.60, selatan=1.20, timur=104.30, utara=1.45)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "OUT_OF_COVERAGE"


def test_bengkulu_tetap_snapshot_tanpa_jaringan(monkeypatch):
    tanpa_jaringan(monkeypatch)
    r = footprints(**BBOX_BENGKULU, batas=2000)
    assert r.status_code == 200
    j = r.json()
    assert j["jenis_sumber"] == "snapshot"
    assert j["area_dimuat"] == BBOX_BENGKULU
    assert j["perkiraan_rumah"]["min_m2"] < j["perkiraan_rumah"]["max_m2"]
    assert j["sumber"]["timestamp_osm"] == "2026-10-14T16:04:41Z"
    assert j["jumlah"] > 100
    assert {b.get("region_code") for b in j["bangunan"]} <= {"1771", None}
    FootprintArea.model_validate(j)


# ---- jendela dan sel -------------------------------------------------------


def test_jendela_pusat_memuat_titik_dengan_margin_setengah_sel():
    for lon, lat in [(106.8272, -6.1754), (102.2725, -3.7605), (110.0014, -7.0009), (140.7, -2.5)]:
        sel = jendela_pusat(lon, lat)
        assert len(sel) == 4
        barat, selatan, timur, utara = kotak_gabungan(sel)
        margin = osm_daring.UKURAN_SEL / 2 - 1e-9
        assert barat <= lon - margin and timur >= lon + margin
        assert selatan <= lat - margin and utara >= lat + margin
        assert timur - barat == pytest.approx(osm_daring.SEL_PER_SISI * osm_daring.UKURAN_SEL)


def test_sel_penutup_radius_200_m_paling_banyak_3x3():
    d = 200 / 111_320
    sel = sel_penutup(106.8272 - d, -6.1754 - d, 106.8272 + d, -6.1754 + d)
    assert 4 <= len(sel) <= 9
    with pytest.raises(ValueError):
        sel_penutup(100.0, -1.0, 101.0, 0.0)
    assert sel_titik(106.8271, -6.1754) == (35609, -2059)


# ---- jalur daring Jakarta --------------------------------------------------


def test_jakarta_memuat_jendela_di_sekitar_pusat_dan_tanpa_tebakan_rumah(monkeypatch):
    pusat_lon = (BBOX_JKT["barat"] + BBOX_JKT["timur"]) / 2
    pusat_lat = (BBOX_JKT["selatan"] + BBOX_JKT["utara"]) / 2
    dekat = way(11, pusat_lon + 0.0001, pusat_lat + 0.0001, tags={"building": "yes"})
    jauh = way(
        12, pusat_lon + 0.0020, pusat_lat + 0.0020, tags={"building": "house", "name": "Rumah X"}
    )
    kecil = way(13, pusat_lon - 0.0010, pusat_lat, sisi=0.00012, tags={"building": "yes"})
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass(jauh, kecil, dekat))
    r = footprints(**BBOX_JKT)
    assert r.status_code == 200
    j = r.json()
    FootprintArea.model_validate(j)
    assert j["jenis_sumber"] == "osm_daring"
    assert "perkiraan_rumah" not in j
    assert all(
        b.get("perkiraan_jenis") is None and b.get("region_code") is None for b in j["bangunan"]
    )
    assert j["jumlah"] == 3 and j["terpotong"] is False
    # yang terdekat dari pusat lebih dahulu
    assert [b["id"] for b in j["bangunan"]] == [11, 13, 12]
    assert j["sumber"]["timestamp_osm"] == "2026-10-24T10:00:00Z"
    assert "Overpass" in j["sumber"]["penerbit"] and j["sumber"]["url"] == osm_daring.URL_OVERPASS
    # jendela: satu kueri Overpass, ≤ 2 × 0,003°, mengurung pusat bbox
    assert len(jaringan.panggilan) == 1
    selatan, barat, utara, timur = jaringan.panggilan[0]["bbox"]
    assert timur - barat == pytest.approx(0.006) and utara - selatan == pytest.approx(0.006)
    assert barat <= pusat_lon <= timur and selatan <= pusat_lat <= utara
    assert (
        "[timeout:" in jaringan.panggilan[0]["kueri"]
        and "out geom" in jaringan.panggilan[0]["kueri"]
    )
    # area_dimuat = jendela yang diminta, jauh lebih kecil dari bbox 3 km
    a = j["area_dimuat"]
    assert (a["barat"], a["selatan"], a["timur"], a["utara"]) == pytest.approx(
        (barat, selatan, timur, utara)
    )
    assert a["timur"] - a["barat"] < (BBOX_JKT["timur"] - BBOX_JKT["barat"]) / 4


def test_bbox_lebih_kecil_dari_jendela_membatasi_area_dimuat(monkeypatch):
    Jaringan(monkeypatch, overpass=jawaban_overpass())
    bbox = {"barat": 106.8260, "selatan": -6.1760, "timur": 106.8280, "utara": -6.1750}
    j = footprints(**bbox).json()
    assert j["jumlah"] == 0 and j["bangunan"] == []
    assert j["area_dimuat"] == pytest.approx(bbox)


def test_cache_sel_menghindari_pengambilan_ulang_dan_hanya_mengambil_yang_kurang(monkeypatch):
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass(way(21, 106.8271, -6.1755)))
    j1 = footprints(**BBOX_JKT).json()
    assert len(jaringan.panggilan) == 1
    # bbox identik dan bbox yang bergeser sedikit (jendela sel sama): tanpa jaringan
    tanpa_jaringan(monkeypatch)
    assert footprints(**BBOX_JKT).json()["jumlah"] == j1["jumlah"]
    geser = {k: v + 0.0004 for k, v in BBOX_JKT.items()}
    assert footprints(**geser).status_code == 200
    # jendela bergeser satu sel ke timur: hanya dua sel baru yang diambil
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass())
    timur = {k: v + 0.0030 for k, v in BBOX_JKT.items() if k in ("barat", "timur")}
    r = footprints(**{**BBOX_JKT, **timur})
    assert r.status_code == 200 and len(jaringan.panggilan) == 1
    selatan, barat, utara, timur_q = jaringan.panggilan[0]["bbox"]
    assert timur_q - barat == pytest.approx(0.003) and utara - selatan == pytest.approx(0.006)


def test_sel_kedaluwarsa_diambil_ulang(monkeypatch):
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass())
    footprints(**BBOX_JKT)
    sekarang = time.time()
    monkeypatch.setattr(osm_daring.time, "time", lambda: sekarang + osm_daring.TTL_SEL_S + 10)
    footprints(**BBOX_JKT)
    assert len(jaringan.panggilan) == 2


def test_bangunan_terpotong_batas_mendahulukan_yang_dekat_pusat(monkeypatch):
    lon, lat = (
        (BBOX_JKT["barat"] + BBOX_JKT["timur"]) / 2,
        (BBOX_JKT["selatan"] + BBOX_JKT["utara"]) / 2,
    )
    elemen = [way(100 + i, lon + (i - 5) * 0.0003, lat + 0.0002) for i in range(10)]
    Jaringan(monkeypatch, overpass=jawaban_overpass(*elemen))
    j = footprints(**BBOX_JKT, batas=3).json()
    assert j["jumlah"] == 10 and j["terpotong"] is True and len(j["bangunan"]) == 3
    assert j["bangunan"][0]["id"] == 105  # tepat di bujur pusat


def test_bangunan_yang_melintasi_sel_tidak_ganda(monkeypatch):
    # persegi besar melintasi batas sel x = 106.827 (kelipatan 0,003)
    besar = way(31, 106.8260, -6.1754, sisi=0.0020)
    Jaringan(monkeypatch, overpass=jawaban_overpass(besar))
    j = footprints(**BBOX_JKT).json()
    assert [b["id"] for b in j["bangunan"]] == [31]


def test_overpass_gagal_beralih_ke_api_osm_dan_melewati_overpass_sementara(monkeypatch):
    el = way(41, 106.8271, -6.1755)
    jaringan = Jaringan(monkeypatch, overpass=URLError("putus"), api=xml_osm(el))
    j = footprints(**BBOX_JKT).json()
    assert [b["id"] for b in j["bangunan"]] == [41]
    assert "API OpenStreetMap" in j["sumber"]["penerbit"]
    assert len(jaringan.overpass_dipanggil) == 1 and len(jaringan.api_dipanggil) == 1
    # kegagalan Overpass diingat: area lain langsung ke API /map
    timur = {"barat": BBOX_JKT["barat"] + 0.012, "timur": BBOX_JKT["timur"] + 0.012}
    footprints(**{**BBOX_JKT, **timur})
    assert len(jaringan.overpass_dipanggil) == 1 and len(jaringan.api_dipanggil) == 2


def test_overpass_runtime_error_dianggap_gagal(monkeypatch):
    el = way(51, 106.8271, -6.1755)
    jaringan = Jaringan(
        monkeypatch,
        overpass=jawaban_overpass(remark="runtime error: Query timed out in 'query' at line 1"),
        api=xml_osm(el),
    )
    j = footprints(**BBOX_JKT).json()
    assert [b["id"] for b in j["bangunan"]] == [51]
    assert len(jaringan.api_dipanggil) == 1


def test_api_osm_400_memecah_jendela_per_sel(monkeypatch):
    el = way(61, 106.8271, -6.1755)

    def api(catatan):
        selatan, barat, utara, timur = catatan["bbox"]
        if timur - barat > 0.0035:  # jendela penuh melebihi batas simpul
            return HTTPError(osm_daring.URL_OSM, 400, "Bad Request", {}, None)
        return xml_osm(el)

    jaringan = Jaringan(monkeypatch, overpass=URLError("putus"), api=api)
    j = footprints(**BBOX_JKT).json()
    assert [b["id"] for b in j["bangunan"]] == [61]
    assert len(jaringan.api_dipanggil) == 1 + 4


def test_semua_sumber_gagal_menjadi_503(monkeypatch):
    Jaringan(monkeypatch, overpass=URLError("putus"), api=URLError("putus"))
    r = footprints(**BBOX_JKT)
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "GEODATA_UNAVAILABLE"
    assert r.json()["error"]["retriable"] is True


def test_pembaca_menolak_bangunan_tidak_sah_dan_di_luar_negeri():
    kl = way(71, 101.69, 3.15)
    terbuka = way(72, 106.8271, -6.1755)
    terbuka["geometry"] = terbuka["geometry"][:-1]
    tanpa_geom = {"type": "way", "id": 73, "tags": {"building": "yes"}}
    bukan = way(74, 106.8271, -6.1755, tags={"building": "no"})
    jalan = way(75, 106.8271, -6.1755, tags={"highway": "residential"})
    lubang = way(76, 106.8271, -6.1755)
    lubang["geometry"][2] = None
    ok = way(
        77,
        106.8271,
        -6.1755,
        tags={"building": "apartments", "building:levels": "12", "name": "Menara"},
    )
    data = json.loads(jawaban_overpass(kl, terbuka, tanpa_geom, bukan, jalan, lubang, ok))
    hasil = dari_overpass(data)
    assert [b.id for b, _ in hasil] == [77]
    b = hasil[0][0]
    assert (b.building_tag, b.levels.root, b.nama, b.source_ref) == (
        "apartments",
        12,
        "Menara",
        "way/77",
    )
    assert 400 < b.footprint_m2 < 600  # (0,0002° ≈ 22 m)²
    xml = xml_osm(kl, ok)
    assert [b.id for b, _ in dari_xml(xml)] == [77]


# ---- pemindaian bangunan di luar Bengkulu ---------------------------------


def test_bangunan_jakarta_dipindai_dari_cache_tanpa_jaringan(monkeypatch):
    Jaringan(monkeypatch, overpass=jawaban_overpass(way(81, 106.8271, -6.1755, sisi=0.0003)))
    assert footprints(**BBOX_JKT).json()["bangunan"][0]["id"] == 81
    tanpa_jaringan(monkeypatch)
    monkeypatch.setattr(
        "app.geodata.ambil_citra", lambda f: (_ for _ in ()).throw(OSError("offline"))
    )
    c = TestClient(app)
    pratinjau = c.get("/api/v1/scans/81")
    assert pratinjau.status_code == 200
    assert pratinjau.json()["analisis"] is None and pratinjau.json()["bangunan"]["id"] == 81
    assert len(pratinjau.json()["bingkai"]["tiles"]) >= 6
    assert "/19/" in pratinjau.json()["bingkai"]["tiles"][0]["url"]
    r = c.post("/api/v1/scans", json={"building_id": 81})
    assert r.status_code == 200
    assert r.json()["analisis"]["method"] == "footprint_fallback"
    assert "Analisis citra tidak tersedia" in r.json()["analisis"]["peringatan"]
    # setelah dipindai, bangunan masuk katalog dan daftar hasil tersimpan
    assert 81 in {b["id"] for b in c.get("/api/v1/catalog").json()}
    assert 81 in c.get("/api/v1/scans").json()


def test_pemindaian_dengan_model_pada_bangunan_luar_bengkulu(monkeypatch):
    Jaringan(monkeypatch, overpass=jawaban_overpass(way(82, 106.8271, -6.1755, sisi=0.0003)))
    footprints(**BBOX_JKT)
    tanpa_jaringan(monkeypatch)
    monkeypatch.setattr(
        "app.geodata.ambil_citra", lambda f: np.zeros((f.tinggi, f.lebar, 3), np.uint8)
    )

    def inferensi(citra, footprint):
        mask = np.zeros(citra.shape[:2], np.uint8)
        cv2.fillPoly(mask, [np.rint(footprint.exterior.coords).astype(np.int32)], 1)
        return mask, 0.95

    monkeypatch.setattr("app.geodata.segmentasi_atap", inferensi)
    r = TestClient(app).post("/api/v1/scans", json={"building_id": 82, "force": True})
    assert r.status_code == 200 and r.json()["analisis"]["building_id"] == 82
    assert r.json()["analisis"]["roof_area_m2"] > 0


def test_cari_bangunan_luar_bengkulu_lewat_way_full(monkeypatch):
    xml = xml_osm(way(83, 106.8271, -6.1755))
    monkeypatch.setattr(
        "app.buildings.ambil_osm", lambda url: xml if "/way/83/full" in url else b"<osm/>"
    )
    b = cari_bangunan(83)
    assert b is not None and b.region_code is None
    assert cari_bangunan(84) is None


# ---- pencarian radius (/buildings) ----------------------------------------


def test_buildings_radius_di_jakarta_daring_dan_luring(monkeypatch):
    params = {"lat": JKT["lat"], "lon": JKT["lon"], "r": 150}
    tanpa_jaringan(monkeypatch)
    r = TestClient(app).get("/api/v1/buildings", params=params)
    assert r.status_code == 200 and r.json() == []
    jaringan = Jaringan(
        monkeypatch,
        overpass=jawaban_overpass(
            way(91, JKT["lon"] + 0.0003, JKT["lat"]), way(92, JKT["lon"] + 0.0020, JKT["lat"])
        ),
    )
    r = TestClient(app).get("/api/v1/buildings", params={**params, "live": True})
    assert r.status_code == 200
    assert [b["id"] for b in r.json()] == [91]  # 92 berjarak ±220 m > 150 m
    assert len(jaringan.panggilan) == 1
    # sel sudah tersimpan: pencarian tanpa `live` ikut membacanya
    tanpa_jaringan(monkeypatch)
    r = TestClient(app).get("/api/v1/buildings", params=params)
    assert [b["id"] for b in r.json()] == [91]


def test_buildings_luar_negeri_ditolak():
    r = TestClient(app).get("/api/v1/buildings", params={"lat": 3.15, "lon": 101.69, "r": 100})
    assert r.status_code == 422 and r.json()["error"]["code"] == "OUT_OF_COVERAGE"
    with pytest.raises(Exception, match="Indonesia"):
        temukan_area(3.15, 101.69, 100)


# ---- alamat ---------------------------------------------------------------


def item(lon, lat, **lain):
    return {
        "lat": str(lat),
        "lon": str(lon),
        "display_name": "Monumen Nasional, Gambir, Jakarta, Indonesia",
        **lain,
    }


def tiruan_nominatim(monkeypatch, hasil):
    url = []

    def ambil(u):
        url.append(u)
        if isinstance(hasil, Exception):
            raise hasil
        return hasil

    monkeypatch.setattr(alamat, "_ambil", ambil)
    return url


def cari(**params):
    return TestClient(app).get("/api/v1/alamat", params=params)


def test_alamat_jakarta_memasangkan_footprint_osm_daring(monkeypatch):
    rumah = way(101, 106.8271, -6.1755, sisi=0.0004)
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass(rumah))
    url = tiruan_nominatim(
        monkeypatch,
        [
            item(106.82725, -6.17535, name="Monumen Nasional", addresstype="building"),
            item(106.8250, -6.1700, category="highway", addresstype="road"),
            item(106.8272, -6.1754, category="place", addresstype="suburb"),
            item(101.69, 3.15, name="Kuala Lumpur"),
        ],
    )
    r = cari(q="Monas Jakarta")
    assert r.status_code == 200
    h = r.json()["hasil"]
    assert "countrycodes=id" in url[0] and "bounded" not in url[0]
    assert len(h) == 3  # titik Kuala Lumpur dibuang
    assert (h[0]["bangunan"]["id"], h[0]["kecocokan"], h[0]["jarak_m"]) == (101, "memuat", 0)
    assert h[1]["bangunan"] is None and h[1]["presisi"] == "road"
    assert h[2]["bangunan"] is None  # nama tempat luas tidak dipasangkan
    assert len(jaringan.panggilan) == 1
    # pencarian ulang memakai cache Nominatim dan sel OSM
    tanpa_jaringan(monkeypatch)
    assert cari(q="monas jakarta").json()["hasil"][0]["bangunan"]["id"] == 101
    assert len(url) == 1


def test_alamat_titik_terdekat_dalam_30_m_dan_lebih_jauh_tidak_dipasangkan(monkeypatch):
    rumah = way(102, 106.8271, -6.1755, sisi=0.0002)
    Jaringan(monkeypatch, overpass=jawaban_overpass(rumah))
    tepi_utara = -6.1755 + 0.0002
    dekat = 20 / 111_320
    jauh = 50 / 111_320
    tiruan_nominatim(
        monkeypatch,
        [
            item(106.8272, tepi_utara + dekat, name="A", category="amenity"),
            item(106.8272, tepi_utara + jauh, name="B", category="amenity"),
        ],
    )
    h = cari(q="dua titik").json()["hasil"]
    assert h[0]["kecocokan"] == "terdekat" and h[0]["jarak_m"] == pytest.approx(20, abs=1)
    assert h[1]["bangunan"] is None


def test_alamat_jaringan_osm_gagal_tetap_mengembalikan_alamat(monkeypatch):
    Jaringan(monkeypatch, overpass=URLError("putus"), api=URLError("putus"))
    tiruan_nominatim(monkeypatch, [item(106.8272, -6.1754, name="Monas", category="tourism")])
    r = cari(q="monas")
    assert r.status_code == 200
    h = r.json()["hasil"][0]
    assert h["nama"] == "Monas" and h["bangunan"] is None


def test_alamat_pemasangan_daring_dibatasi_jumlahnya(monkeypatch):
    jaringan = Jaringan(monkeypatch, overpass=jawaban_overpass())
    titik = [item(106.8272 + 0.05 * i, -6.1754, name=f"T{i}", category="amenity") for i in range(5)]
    tiruan_nominatim(monkeypatch, titik)
    h = cari(q="banyak titik").json()["hasil"]
    assert len(h) == 5
    assert len(jaringan.panggilan) == alamat.MAKS_PASANGAN_DARING


def test_alamat_bias_pusat_peta_tidak_mengikat(monkeypatch):
    Jaringan(monkeypatch, overpass=jawaban_overpass())
    url = tiruan_nominatim(monkeypatch, [])
    assert cari(q="jalan merdeka", lat=-6.9, lon=107.6).status_code == 200
    assert "viewbox=" in url[0] and "bounded" not in url[0] and "countrycodes=id" in url[0]
    kotak = parse_qs(url[0].split("?")[1])["viewbox"][0].split(",")
    assert float(kotak[0]) < 107.6 < float(kotak[2]) and float(kotak[3]) < -6.9 < float(kotak[1])
    cari(q="jalan merdeka", lat=-6.91, lon=107.61)  # bias dibulatkan 0,1°: cache sama
    assert len(url) == 1


@pytest.mark.parametrize("params", [{"lat": -6.9}, {"lon": 107.6}, {"lat": 95, "lon": 107.6}])
def test_alamat_bias_harus_berpasangan_dan_sah(params):
    r = cari(q="jalan merdeka", **params)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_alamat_bengkulu_tetap_memakai_snapshot_tanpa_jaringan_osm(monkeypatch):
    from app.buildings import bangunan_snapshot

    tanpa_jaringan(monkeypatch)
    titik = shape(bangunan_snapshot(992085198).geom.model_dump()).representative_point()
    tiruan_nominatim(monkeypatch, [item(titik.x, titik.y, name="Rumah", addresstype="house")])
    h = cari(q="rumah bengkulu").json()["hasil"][0]
    assert (h["bangunan"]["id"], h["kecocokan"]) == (992085198, "memuat")
    assert h["bangunan"]["region_code"] == "1771"
    assert math.isclose(h["lat"], titik.y, abs_tol=1e-6)
