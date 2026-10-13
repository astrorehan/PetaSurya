"""L1: katalog OSM, pencarian area, dan geometri bangunan baru di Bengkulu."""

import json
import math
import xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from pyproj import Geod
from shapely.geometry import Point, Polygon, mapping, shape
from shapely.ops import unary_union

from app.contracts import BangunanRingkas
from app.storage import baca, simpan
from app.vision import luas_geodesik

VERSION = "l1.2026.10.13.1"
ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "data/fixtures"
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


def muat_katalog() -> list[BangunanRingkas]:
    daftar = {b.id: b for b in _awal()}
    for data in baca("bangunan"):
        b = BangunanRingkas.model_validate(data)
        daftar[b.id] = b
    return sorted(daftar.values(), key=lambda b: b.id)


def ambil_osm(url: str) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": "PetaSurya/0.1"}), timeout=20) as r:
        xml = r.read(4_000_001)
    if len(xml) > 4_000_000:
        raise OSError("Area terlalu padat; pilih area yang lebih kecil.")
    return xml


def cari_bangunan(identitas: int) -> BangunanRingkas | None:
    for b in muat_katalog():
        if b.id == identitas:
            return b
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
