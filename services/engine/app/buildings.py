"""L1: katalog OSM, footprint snapshot kota, pencarian area, dan geometri bangunan baru."""

import gzip
import json
import math
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import numpy as np
from pydantic import ConfigDict, Field, model_validator
from pyproj import Geod
from shapely.geometry import Point, box, shape
from shapely.ops import unary_union

from app import osm_daring
from app.contracts import BangunanRingkas, FootprintArea, PermintaanFootprintArea
from app.storage import baca, simpan
from app.wilayah_id import TOLERANSI_DERAJAT, di_indonesia
from app.wilayah_id import _indeks as _indeks_provinsi

VERSION = "l1.2026.10.25"
ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "data/fixtures"
BERKAS_FOOTPRINT = FIXTURE / "kota/footprint-bengkulu.json.gz"
URL_OSM = "https://api.openstreetmap.org/api/0.6"
GEOD = Geod(ellps="WGS84")


class DiLuarCakupan(ValueError):
    pass


@lru_cache(maxsize=1)
def batas_kota():
    data = json.loads((FIXTURE / "wilayah/kota-bengkulu.geojson").read_text("utf-8"))
    return unary_union([shape(f["geometry"]) for f in data["features"]])


def bangunan_di_kota(bangunan: BangunanRingkas) -> bool:
    return batas_kota().covers(shape(bangunan.geom.model_dump()).representative_point())


def _kode_wilayah(lon: float, lat: float) -> str | None:
    """Kode BPS Kota Bengkulu bila titik di dalam batas kota; di tempat lain belum dipetakan."""
    return "1771" if batas_kota().covers(Point(lon, lat)) else None


def baca_osm(xml: bytes) -> list[BangunanRingkas]:
    """Way bangunan tertutup di Indonesia dari XML OSM, urut ID."""
    hasil = [b for b, _ in osm_daring.dari_xml(xml, _kode_wilayah)]
    return sorted(hasil, key=lambda b: b.id)


def bbox_di_indonesia(barat: float, selatan: float, timur: float, utara: float) -> bool:
    """bbox memotong daratan Indonesia (toleransi pantai sama dengan wilayah_id)."""
    pohon = _indeks_provinsi()[0]
    return (
        len(pohon.query_nearest(box(barat, selatan, timur, utara), max_distance=TOLERANSI_DERAJAT))
        > 0
    )


@lru_cache(maxsize=1)
def _awal() -> tuple[BangunanRingkas, ...]:
    daftar = baca_osm((FIXTURE / "bangunan/mentah/osm-unib-20261013.osm").read_bytes())
    by_id = {b.id: b for b in daftar}
    for berkas in sorted((FIXTURE / "bangunan").glob("*.json")):
        b = BangunanRingkas.model_validate_json(berkas.read_text("utf-8"))
        by_id[b.id] = b
    return tuple(by_id.values())


@lru_cache(maxsize=1)
def _awal_per_id() -> dict[int, BangunanRingkas]:
    return {b.id: b for b in _awal()}


def muat_katalog() -> list[BangunanRingkas]:
    daftar = {b.id: b for b in _awal()}
    for data in baca("bangunan"):
        b = BangunanRingkas.model_validate(data)
        daftar[b.id] = b
    return sorted(daftar.values(), key=lambda b: b.id)


class PermintaanFootprintInput(PermintaanFootprintArea):
    model_config = ConfigDict(allow_inf_nan=False)
    batas: int = Field(1500, ge=1, le=2000)

    @model_validator(mode="after")
    def tepi_berurutan(self):
        if self.barat >= self.timur or self.selatan >= self.utara:
            raise ValueError("Tepi barat/selatan harus lebih kecil dari timur/utara.")
        return self


@dataclass(frozen=True, slots=True)
class IndeksFootprint:
    """Way snapshot kota dalam larik; koordinat bilangan bulat 1e-7°."""

    id: np.ndarray  # int64, urut naik
    awal: np.ndarray  # int64 [N+1], titik pertama tiap cincin dalam xy
    xy: np.ndarray  # int64 [M, 2], tanpa titik penutup
    kotak: np.ndarray  # int64 [N, 4]: barat, selatan, timur, utara
    luas: np.ndarray  # float64, m² geodesik
    tag: list[str]
    nama: list[str | None]
    lantai: list[int | None]
    skala: int  # titik per derajat
    perkiraan_rumah: dict
    sumber: dict

    def bangunan(self, i: int) -> dict:
        titik = (self.xy[self.awal[i] : self.awal[i + 1]] / self.skala).tolist()
        luas = float(self.luas[i])
        rumah = self.perkiraan_rumah
        return {
            "id": int(self.id[i]),
            "source": "osm",
            "source_ref": f"way/{self.id[i]}",
            "geom": {"type": "Polygon", "coordinates": [[*titik, titik[0]]]},
            "footprint_m2": luas,
            "building_tag": self.tag[i],
            "nama": self.nama[i],
            "levels": self.lantai[i],
            "region_code": "1771",
            "perkiraan_jenis": "rumah"
            if self.tag[i] == "yes"
            and self.nama[i] is None
            and rumah["min_m2"] <= luas <= rumah["max_m2"]
            else None,
        }


@lru_cache(maxsize=1)
def indeks_footprint() -> IndeksFootprint:
    """Muat sekali (±0,3 s, ±35 MB untuk 120 ribu way); tanpa jaringan."""
    data = json.loads(gzip.decompress(BERKAS_FOOTPRINT.read_bytes()))
    awal = np.concatenate([[0], np.cumsum(data["n_titik"], dtype=np.int64)])
    xy = np.cumsum(np.asarray(data["xy"], dtype=np.int64).reshape(-1, 2), axis=0)
    mulai = awal[:-1]
    kotak = np.stack(
        [
            np.minimum.reduceat(xy[:, 0], mulai),
            np.minimum.reduceat(xy[:, 1], mulai),
            np.maximum.reduceat(xy[:, 0], mulai),
            np.maximum.reduceat(xy[:, 1], mulai),
        ],
        axis=1,
    )
    return IndeksFootprint(
        id=np.asarray(data["id"], dtype=np.int64),
        awal=awal,
        xy=xy,
        kotak=kotak,
        luas=np.asarray(data["luas_m2"], dtype=np.float64),
        tag=data["tag"],
        nama=data["nama"],
        lantai=data["lantai"],
        skala=round(1 / data["presisi_derajat"]),
        perkiraan_rumah=data["perkiraan_rumah"],
        sumber=data["sumber"],
    )


def simpan_bangunan_hasil(bangunan: BangunanRingkas) -> None:
    """Bangunan hasil pemindaian ikut katalog agar hasilnya dapat dipilih lagi.

    Bangunan dari katalog awal sudah tersedia; snapshot kota dan bangunan OSM daring
    ditulis dengan asalnya masing-masing.
    """
    if baca("bangunan", bangunan.id) or bangunan.id in _awal_per_id():
        return
    if bangunan_snapshot(bangunan.id):
        sumber = indeks_footprint().sumber
        asal = {"_sumber_url": sumber["url"], "_timestamp_osm": sumber["timestamp_osm"]}
    else:
        asal = {"_sumber_url": osm_daring.URL_OVERPASS}
    simpan(
        "bangunan", bangunan.id, {**bangunan.model_dump(mode="json", exclude_unset=True), **asal}
    )


def bangunan_snapshot(identitas: int) -> BangunanRingkas | None:
    indeks = indeks_footprint()
    i = int(np.searchsorted(indeks.id, identitas))
    if i < len(indeks.id) and indeks.id[i] == identitas:
        return BangunanRingkas.model_validate(indeks.bangunan(i))
    return None


PESAN_DI_LUAR = "PetaSurya mencakup wilayah Indonesia; area ini berada di luar Indonesia."


def footprint_di_area(permintaan: PermintaanFootprintInput) -> FootprintArea:
    """Footprint dalam bbox peta, yang terdekat dari pusat bbox dahulu.

    bbox yang memotong Kota Bengkulu memakai snapshot (tanpa jaringan). Di tempat
    lain di Indonesia, jendela di sekitar pusat bbox dimuat dari OSM (osm_daring).
    """
    p = permintaan
    if box(p.barat, p.selatan, p.timur, p.utara).intersects(batas_kota()):
        return _footprint_snapshot(p)
    if not bbox_di_indonesia(p.barat, p.selatan, p.timur, p.utara):
        raise DiLuarCakupan(PESAN_DI_LUAR)
    return _footprint_daring(p)


def _footprint_snapshot(p: PermintaanFootprintInput) -> FootprintArea:
    """Way yang kotak pembatasnya memotong bbox.

    Jarak dihitung pada bidang ekuirektangular (bujur × cos lintang), cukup
    untuk mengurutkan dalam satu tampilan peta. ID OSM mengurai seri.
    """
    indeks = indeks_footprint()
    barat, selatan, timur, utara = (
        round(v * indeks.skala) for v in (p.barat, p.selatan, p.timur, p.utara)
    )
    k = indeks.kotak
    pilih = np.flatnonzero(
        (k[:, 2] >= barat) & (k[:, 0] <= timur) & (k[:, 3] >= selatan) & (k[:, 1] <= utara)
    )
    cos_lintang = math.cos(math.radians((p.selatan + p.utara) / 2))
    dx = ((k[pilih, 0] + k[pilih, 2]) / 2 - (barat + timur) / 2) * cos_lintang
    dy = (k[pilih, 1] + k[pilih, 3]) / 2 - (selatan + utara) / 2
    urut = pilih[np.lexsort((indeks.id[pilih], dx * dx + dy * dy))][: p.batas]
    # ID katalog awal memakai versi katalog, sama dengan cari_bangunan saat dipindai.
    awal = _awal_per_id()
    return FootprintArea.model_validate(
        {
            "permintaan": p.model_dump(),
            "jumlah": len(pilih),
            "terpotong": len(pilih) > p.batas,
            "bangunan": [
                awal[int(indeks.id[i])].model_dump(mode="json", exclude_unset=True)
                if int(indeks.id[i]) in awal
                else indeks.bangunan(i)
                for i in urut
            ],
            "perkiraan_rumah": indeks.perkiraan_rumah,
            "sumber": indeks.sumber,
            "jenis_sumber": "snapshot",
            "area_dimuat": {
                "barat": p.barat,
                "selatan": p.selatan,
                "timur": p.timur,
                "utara": p.utara,
            },
        }
    )


def _kotak_bangunan(b: BangunanRingkas) -> tuple[float, float, float, float]:
    cincin = np.asarray(b.geom.model_dump()["coordinates"][0], dtype=float)
    return (
        float(cincin[:, 0].min()),
        float(cincin[:, 1].min()),
        float(cincin[:, 0].max()),
        float(cincin[:, 1].max()),
    )


def _footprint_daring(p: PermintaanFootprintInput) -> FootprintArea:
    """Bangunan OSM di jendela sel sekitar pusat bbox; tanpa tebakan jenis bangunan.

    Hanya jendela (sekitar 670 m, lihat osm_daring) yang dimuat, bukan seluruh bbox;
    `area_dimuat` memberi tahu bagian bbox yang benar-benar tercakup.
    """
    lon_c, lat_c = (p.barat + p.timur) / 2, (p.selatan + p.utara) / 2
    if not di_indonesia(lat_c, lon_c):
        raise DiLuarCakupan(f"{PESAN_DI_LUAR} Geser peta ke wilayah Indonesia.")
    sel = osm_daring.jendela_pusat(lon_c, lat_c)
    rekaman = osm_daring.pastikan_sel(sel, _kode_wilayah)
    j_barat, j_selatan, j_timur, j_utara = osm_daring.kotak_gabungan(sel)
    area = {
        "barat": max(p.barat, j_barat),
        "selatan": max(p.selatan, j_selatan),
        "timur": min(p.timur, j_timur),
        "utara": min(p.utara, j_utara),
    }
    cos_lintang = math.cos(math.radians(lat_c))
    terpilih = []
    for b in osm_daring.bangunan_sel(rekaman):
        x0, y0, x1, y1 = _kotak_bangunan(b)
        if x1 < p.barat or x0 > p.timur or y1 < p.selatan or y0 > p.utara:
            continue
        dx = ((x0 + x1) / 2 - lon_c) * cos_lintang
        dy = (y0 + y1) / 2 - lat_c
        terpilih.append((dx * dx + dy * dy, b.id, b))
    terpilih.sort(key=lambda t: (t[0], t[1]))
    return FootprintArea.model_validate(
        {
            "permintaan": p.model_dump(),
            "jumlah": len(terpilih),
            "terpotong": len(terpilih) > p.batas,
            "bangunan": [
                b.model_dump(mode="json", exclude_unset=True) for _, _, b in terpilih[: p.batas]
            ],
            "sumber": osm_daring.sumber_terlama(rekaman),
            "jenis_sumber": "osm_daring",
            "area_dimuat": area,
        }
    )


def ambil_osm(url: str) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": osm_daring.USER_AGENT}), timeout=20) as r:
        xml = r.read(4_000_001)
    if len(xml) > 4_000_000:
        raise OSError("Area terlalu padat; pilih area yang lebih kecil.")
    return xml


def cari_bangunan(identitas: int) -> BangunanRingkas | None:
    """Cache lokal → katalog awal → snapshot kota → sel OSM tersimpan → OSM API daring."""
    if tersimpan := baca("bangunan", identitas):
        return BangunanRingkas.model_validate(tersimpan[0])
    if awal := _awal_per_id().get(identitas):
        return awal
    if snapshot := bangunan_snapshot(identitas):
        return snapshot
    if dari_sel := osm_daring.bangunan_tersimpan(identitas):
        return dari_sel
    url = f"{URL_OSM}/way/{identitas}/full"
    try:
        hasil = baca_osm(ambil_osm(url))
    except HTTPError as error:
        if error.code in {404, 410}:
            return None
        raise
    except ET.ParseError as error:
        raise OSError("Geometri OSM belum dapat dibaca.") from error
    for b in hasil:
        simpan("bangunan", b.id, {**b.model_dump(mode="json"), "_sumber_url": url})
        if b.id == identitas:
            return b
    return None


def temukan_area(lat: float, lon: float, radius: float, daring=False) -> list[BangunanRingkas]:
    """Bangunan katalog dan sel OSM dalam radius meter; `daring` memuat sel yang belum ada."""
    if not di_indonesia(lat, lon):
        raise DiLuarCakupan(PESAN_DI_LUAR)
    barat = GEOD.fwd(lon, lat, 270, radius)[0]
    timur = GEOD.fwd(lon, lat, 90, radius)[0]
    selatan = GEOD.fwd(lon, lat, 180, radius)[1]
    utara = GEOD.fwd(lon, lat, 0, radius)[1]
    sel = osm_daring.sel_penutup(barat, selatan, timur, utara)
    rekaman = osm_daring.pastikan_sel(sel, _kode_wilayah, jaringan=daring)
    kandidat = {b.id: b for b in osm_daring.bangunan_sel(rekaman)}
    kandidat.update({b.id: b for b in muat_katalog()})  # katalog (hasil tersimpan) didahulukan
    dekat = []
    for b in kandidat.values():
        x0, y0, x1, y1 = _kotak_bangunan(b)
        if x1 < barat or x0 > timur or y1 < selatan or y0 > utara:
            continue
        pusat = shape(b.geom.model_dump()).centroid
        jarak = GEOD.inv(lon, lat, pusat.x, pusat.y)[2]
        if jarak <= radius:
            dekat.append((jarak, b))
    return [b for _, b in sorted(dekat, key=lambda pasangan: (pasangan[0], pasangan[1].id))]
