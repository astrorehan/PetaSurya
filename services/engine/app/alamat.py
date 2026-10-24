"""L1: pencarian alamat di seluruh Indonesia lewat geocoder Nominatim, lalu footprint bangunan.

Kebijakan pemakaian Nominatim (https://operations.osmfoundation.org/policies/nominatim/)
meminta paling banyak satu permintaan per detik, User-Agent yang mengenali aplikasi,
tanpa pelengkapan otomatis saat mengetik, dan hasil di-cache. Engine hanya mencari
saat pengguna mengirim kueri, menjeda antarpermintaan, dan menyimpan hasil di memori.

Pencarian dibatasi `countrycodes=id` tanpa viewbox terikat; titik pusat peta dari
klien (opsional) hanya memengaruhi peringkat. Hasil yang titiknya di luar wilayah
Indonesia (geoBoundaries ADM1, wilayah_id) dibuang. Titik dipasangkan ke footprint:
di Kota Bengkulu memakai snapshot, di tempat lain memakai bangunan OSM daring dari
sel cache `osm_daring` (jendela pencocokan ≤ 60 m; sel yang belum ada diambil satu
kali dan dipakai lagi oleh peta). Kegagalan jaringan pada pemasangan footprint tidak
menggagalkan pencarian: hasil tetap dikembalikan tanpa footprint.
"""

import json
import math
import re
import time
from functools import lru_cache
from threading import Lock
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
import shapely
from pydantic import model_validator
from shapely.geometry import Point, shape

from app.buildings import DiLuarCakupan, PermintaanFootprintInput, batas_kota, footprint_di_area
from app.contracts import BangunanRingkas, PencarianAlamat, PermintaanAlamat
from app.wilayah_id import di_indonesia

VERSION = "l1-alamat.2026.10.25"
URL_NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "PetaSurya/0.1 (+https://github.com/astrorehan/PetaSurya)"
ATRIBUSI = "Alamat © kontributor OpenStreetMap (ODbL), dicari dengan Nominatim"
JEDA_MIN_S = 1.0  # kebijakan Nominatim: ≤ 1 permintaan/detik
JUMLAH_HASIL = 5
# Titik alamat yang jatuh di jalan atau halaman dipasangkan ke footprint terdekat
# bila cukup dekat; lebih jauh dari ini, hasil hanya memindahkan peta.
RADIUS_BANGUNAN_M = 30.0
METER_PER_DERAJAT = 111_320.0  # keliling ekuator WGS84 / 360, cukup untuk jarak puluhan meter
# Pemasangan ke footprint di luar Kota Bengkulu dapat memuat sel OSM baru (satu
# permintaan jaringan bagi tiap sel); hanya beberapa hasil teratas yang dipasangkan.
MAKS_PASANGAN_DARING = 2
KATEGORI_BUKAN_ALAMAT = {"highway", "boundary", "place"}  # jalan, wilayah, nama tempat luas
BIAS_DERAJAT = 0.25  # setengah sisi viewbox peringkat di sekitar pusat peta (≈ 28 km)

_kunci = Lock()
_terakhir = 0.0


def _ambil(url: str) -> list[dict]:
    global _terakhir
    with _kunci:
        tunggu = JEDA_MIN_S - (time.monotonic() - _terakhir)
        if tunggu > 0:
            time.sleep(tunggu)
        try:
            with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=10) as r:
                data = json.loads(r.read(1_000_001))
            if not isinstance(data, list):
                raise ValueError("bukan daftar")
            return data
        except ValueError as error:
            raise OSError("Jawaban pencarian alamat tidak dapat dibaca.") from error
        finally:
            _terakhir = time.monotonic()


class PermintaanAlamatInput(PermintaanAlamat):
    @model_validator(mode="after")
    def lat_lon_berpasangan(self):
        if (self.lat is None) != (self.lon is None):
            raise ValueError("lat dan lon harus diisi bersama.")
        return self


@lru_cache(maxsize=256)
def _cari_nominatim(kueri: str, bias: tuple[float, float] | None = None) -> tuple[dict, ...]:
    params = {
        "q": kueri,
        "format": "jsonv2",
        "limit": JUMLAH_HASIL * 2,
        "countrycodes": "id",
        "accept-language": "id",
    }
    if bias:
        lat, lon = bias
        # viewbox tanpa bounded=1: hanya mengutamakan hasil di sekitar pusat peta.
        params["viewbox"] = (
            f"{lon - BIAS_DERAJAT},{lat + BIAS_DERAJAT},{lon + BIAS_DERAJAT},{lat - BIAS_DERAJAT}"
        )
    return tuple(_ambil(f"{URL_NOMINATIM}?{urlencode(params)}"))


def _bangunan_di_titik(lon: float, lat: float) -> tuple[BangunanRingkas, str, float] | None:
    """Footprint yang memuat titik, atau yang tepinya terdekat dalam RADIUS_BANGUNAN_M."""
    d_lat = 2 * RADIUS_BANGUNAN_M / METER_PER_DERAJAT
    d_lon = d_lat / math.cos(math.radians(lat))
    try:
        area = footprint_di_area(
            PermintaanFootprintInput(
                barat=lon - d_lon,
                selatan=lat - d_lat,
                timur=lon + d_lon,
                utara=lat + d_lat,
                batas=60,
            )
        )
    except (OSError, DiLuarCakupan):
        return None  # sumber bangunan tidak terjangkau: alamat tetap dikembalikan tanpa footprint
    # Bidang ekuirektangular berpusat di titik alamat, satuan meter.
    asal = np.array([lon, lat])
    skala = np.array([math.cos(math.radians(lat)) * METER_PER_DERAJAT, METER_PER_DERAJAT])
    titik = Point(0, 0)
    terbaik = None
    for b in area.bangunan:
        poligon = shapely.transform(shape(b.geom.model_dump()), lambda xy: (xy - asal) * skala)
        jarak = poligon.distance(titik)
        if terbaik is None or jarak < terbaik[1]:
            terbaik = (b, jarak)
    if terbaik is None or terbaik[1] > RADIUS_BANGUNAN_M:
        return None
    b, jarak = terbaik
    return (b, "memuat", 0.0) if jarak == 0 else (b, "terdekat", round(jarak, 1))


def cari_alamat(q: str, lat: float | None = None, lon: float | None = None) -> PencarianAlamat:
    kueri = re.sub(r"\s+", " ", q).strip()
    bias = (round(lat, 1), round(lon, 1)) if lat is not None and lon is not None else None
    hasil = []
    pasangan_daring = 0
    for item in _cari_nominatim(kueri.lower(), bias):
        titik_lat, titik_lon = float(item["lat"]), float(item["lon"])
        if not di_indonesia(titik_lat, titik_lon):
            continue
        # Titik jalan berada di tengah ruas; rumah terdekatnya bukan alamat yang dicari.
        cocok = None
        if item.get("category") != "highway":
            di_kota = _di_kota_bengkulu(titik_lon, titik_lat)
            if di_kota or (
                pasangan_daring < MAKS_PASANGAN_DARING
                and item.get("category") not in KATEGORI_BUKAN_ALAMAT
            ):
                cocok = _bangunan_di_titik(titik_lon, titik_lat)
                pasangan_daring += 0 if di_kota else 1
        alamat = item.get("display_name") or kueri
        hasil.append(
            {
                "nama": item.get("name") or alamat.split(",")[0],
                "alamat": alamat.removesuffix(", Indonesia"),
                "lat": round(titik_lat, 7),
                "lon": round(titik_lon, 7),
                "presisi": item.get("addresstype") or item.get("type") or "tidak diketahui",
                "bangunan": cocok[0].model_dump(mode="json", exclude_unset=True) if cocok else None,
                "kecocokan": cocok[1] if cocok else None,
                "jarak_m": cocok[2] if cocok else None,
            }
        )
        if len(hasil) == JUMLAH_HASIL:
            break
    return PencarianAlamat.model_validate({"kueri": kueri, "hasil": hasil, "atribusi": ATRIBUSI})


def _di_kota_bengkulu(lon: float, lat: float) -> bool:
    return batas_kota().covers(Point(lon, lat))
