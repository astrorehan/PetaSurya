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
from shapely.geometry import Point, Polygon, box, mapping, shape
from shapely.ops import unary_union

from app.contracts import BangunanRingkas, FootprintArea, PermintaanFootprintArea
from app.storage import baca, simpan
from app.vision import luas_geodesik

VERSION = "l1.2026.10.21"
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


def baca_osm(xml: bytes) -> list[BangunanRingkas]:
    osm = ET.fromstring(xml)
    nodes = {
        n.attrib["id"]: (float(n.attrib["lon"]), float(n.attrib["lat"]))
        for n in osm.findall("node")
    }
    hasil = []
    for way in osm.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        simpul = [n.attrib["ref"] for n in way.findall("nd")]
        if (
            tags.get("building") in {None, "no"}
            or len(simpul) < 4
            or simpul[0] != simpul[-1]
            or not all(n in nodes for n in simpul)
        ):
            continue
        geom = Polygon([nodes[n] for n in simpul])
        if (
            not geom.is_valid
            or geom.is_empty
            or not all(math.isfinite(v) for xy in geom.exterior.coords for v in xy)
        ):
            continue
        luas = luas_geodesik(geom)
        if luas <= 0:
            continue
        b = BangunanRingkas(
            id=int(way.attrib["id"]),
            source="osm",
            source_ref=f"way/{way.attrib['id']}",
            geom=mapping(geom),
            footprint_m2=round(luas, 1) or luas,
            building_tag=tags["building"],
            nama=tags.get("name"),
            levels=int(tags["building:levels"])
            if tags.get("building:levels", "").isdigit() and int(tags["building:levels"]) > 0
            else None,
            region_code="1771",
        )
        if bangunan_di_kota(b):
            hasil.append(b)
    return sorted(hasil, key=lambda b: b.id)


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
    """Bangunan snapshot yang sudah dianalisis ikut katalog agar hasilnya dapat dipilih lagi.

    Bangunan dari katalog awal atau OSM daring sudah tersedia; hanya snapshot yang ditulis.
    """
    if baca("bangunan", bangunan.id) or bangunan.id in _awal_per_id():
        return
    sumber = indeks_footprint().sumber
    simpan(
        "bangunan",
        bangunan.id,
        {
            **bangunan.model_dump(mode="json", exclude_unset=True),
            "_sumber_url": sumber["url"],
            "_timestamp_osm": sumber["timestamp_osm"],
        },
    )


def bangunan_snapshot(identitas: int) -> BangunanRingkas | None:
    indeks = indeks_footprint()
    i = int(np.searchsorted(indeks.id, identitas))
    if i < len(indeks.id) and indeks.id[i] == identitas:
        return BangunanRingkas.model_validate(indeks.bangunan(i))
    return None


def footprint_di_area(permintaan: PermintaanFootprintInput) -> FootprintArea:
    """Way yang kotak pembatasnya memotong bbox; yang terdekat dari pusat bbox dahulu.

    Jarak dihitung pada bidang ekuirektangular (bujur × cos lintang), cukup
    untuk mengurutkan dalam satu tampilan peta. ID OSM mengurai seri.
    """
    p = permintaan
    if not box(p.barat, p.selatan, p.timur, p.utara).intersects(batas_kota()):
        raise DiLuarCakupan(
            "Analisis tersedia di Kota Bengkulu; data cuaca memakai acuan Bengkulu."
        )
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
        }
    )


def ambil_osm(url: str) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": "PetaSurya/0.1"}), timeout=20) as r:
        xml = r.read(4_000_001)
    if len(xml) > 4_000_000:
        raise OSError("Area terlalu padat; pilih area yang lebih kecil.")
    return xml


def cari_bangunan(identitas: int) -> BangunanRingkas | None:
    """Cache lokal → katalog awal → snapshot kota → OSM API daring."""
    if tersimpan := baca("bangunan", identitas):
        return BangunanRingkas.model_validate(tersimpan[0])
    if awal := _awal_per_id().get(identitas):
        return awal
    if snapshot := bangunan_snapshot(identitas):
        return snapshot
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
    if not batas_kota().covers(Point(lon, lat)):
        raise DiLuarCakupan(
            "Analisis tersedia di Kota Bengkulu; data cuaca memakai acuan Bengkulu."
        )
    if daring:
        barat = GEOD.fwd(lon, lat, 270, radius)[0]
        timur = GEOD.fwd(lon, lat, 90, radius)[0]
        selatan = GEOD.fwd(lon, lat, 180, radius)[1]
        utara = GEOD.fwd(lon, lat, 0, radius)[1]
        url = f"{URL_OSM}/map?bbox={barat},{selatan},{timur},{utara}"
        try:
            hasil = baca_osm(ambil_osm(url))
        except ET.ParseError as error:
            raise OSError("Geometri OSM belum dapat dibaca.") from error
        for b in hasil:
            simpan("bangunan", b.id, {**b.model_dump(mode="json"), "_sumber_url": url})
    dekat = []
    for b in muat_katalog():
        pusat = shape(b.geom.model_dump()).centroid
        jarak = GEOD.inv(lon, lat, pusat.x, pusat.y)[2]
        if jarak <= radius:
            dekat.append((jarak, b))
    return [b for _, b in sorted(dekat, key=lambda pasangan: (pasangan[0], pasangan[1].id))]
