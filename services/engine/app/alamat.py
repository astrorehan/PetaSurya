"""L1: pencarian alamat Kota Bengkulu lewat geocoder Nominatim, lalu footprint snapshot.

Kebijakan pemakaian Nominatim (https://operations.osmfoundation.org/policies/nominatim/)
meminta paling banyak satu permintaan per detik, User-Agent yang mengenali aplikasi,
tanpa pelengkapan otomatis saat mengetik, dan hasil di-cache. Engine hanya mencari
saat pengguna mengirim kueri, menjeda antarpermintaan, dan menyimpan hasil di memori.
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
from shapely.geometry import Point, shape

from app.buildings import PermintaanFootprintInput, batas_kota, footprint_di_area
from app.contracts import BangunanRingkas, PencarianAlamat

VERSION = "l1-alamat.2026.10.21"
URL_NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "PetaSurya/0.1 (+https://github.com/astrorehan/PetaSurya)"
ATRIBUSI = "Alamat © kontributor OpenStreetMap (ODbL), dicari dengan Nominatim"
JEDA_MIN_S = 1.0  # kebijakan Nominatim: ≤ 1 permintaan/detik
JUMLAH_HASIL = 5
# Titik alamat yang jatuh di jalan atau halaman dipasangkan ke footprint terdekat
# bila cukup dekat; lebih jauh dari ini, hasil hanya memindahkan peta.
RADIUS_BANGUNAN_M = 30.0
METER_PER_DERAJAT = 111_320.0  # keliling ekuator WGS84 / 360, cukup untuk jarak puluhan meter

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


@lru_cache(maxsize=256)
def _cari_nominatim(kueri: str) -> tuple[dict, ...]:
    barat, selatan, timur, utara = batas_kota().bounds
    q = urlencode(
        {
            "q": kueri,
            "format": "jsonv2",
            "limit": JUMLAH_HASIL * 2,
            "countrycodes": "id",
            "viewbox": f"{barat},{utara},{timur},{selatan}",
            "bounded": 1,
            "accept-language": "id",
        }
    )
    return tuple(_ambil(f"{URL_NOMINATIM}?{q}"))


def _bangunan_di_titik(lon: float, lat: float) -> tuple[BangunanRingkas, str, float] | None:
    """Footprint yang memuat titik, atau yang tepinya terdekat dalam RADIUS_BANGUNAN_M."""
    d_lat = 2 * RADIUS_BANGUNAN_M / METER_PER_DERAJAT
    d_lon = d_lat / math.cos(math.radians(lat))
    area = footprint_di_area(
        PermintaanFootprintInput(
            barat=lon - d_lon, selatan=lat - d_lat, timur=lon + d_lon, utara=lat + d_lat, batas=60
        )
    )
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


def cari_alamat(q: str) -> PencarianAlamat:
    kueri = re.sub(r"\s+", " ", q).strip()
    kota = batas_kota()
    hasil = []
    for item in _cari_nominatim(kueri.lower()):
        lat, lon = float(item["lat"]), float(item["lon"])
        if not kota.covers(Point(lon, lat)):
            continue
        # Titik jalan berada di tengah ruas; rumah terdekatnya bukan alamat yang dicari.
        cocok = None if item.get("category") == "highway" else _bangunan_di_titik(lon, lat)
        alamat = item.get("display_name") or kueri
        hasil.append(
            {
                "nama": item.get("name") or alamat.split(",")[0],
                "alamat": alamat.removesuffix(", Indonesia"),
                "lat": round(lat, 7),
                "lon": round(lon, 7),
                "presisi": item.get("addresstype") or item.get("type") or "tidak diketahui",
                "bangunan": cocok[0].model_dump(mode="json", exclude_unset=True) if cocok else None,
                "kecocokan": cocok[1] if cocok else None,
                "jarak_m": cocok[2] if cocok else None,
            }
        )
        if len(hasil) == JUMLAH_HASIL:
            break
    return PencarianAlamat.model_validate({"kueri": kueri, "hasil": hasil, "atribusi": ATRIBUSI})
