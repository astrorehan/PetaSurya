"""L1: footprint bangunan OSM daring untuk seluruh Indonesia, dimuat per sel dan di-cache.

Di luar snapshot Kota Bengkulu, bangunan diambil dari OpenStreetMap saat peta
meminta. Peta dibagi menjadi sel bujur-lintang UKURAN_SEL; satu permintaan area
memuat jendela SEL_PER_SISI × SEL_PER_SISI sel di sekitar pusat bbox, sehingga
sisi jendela ≈ 2 × 0,003° ≈ 670 m. Alasan ukuran:

- viewport zoom 15,5 selebar ±3 km; satu bbox sebesar itu di Jakarta berisi puluhan
  ribu bangunan, jauh di atas batas 2.000 footprint per respons dan menekan
  server publik OSM;
- jendela ±0,45 km² di kawasan padat (±8.000 bangunan/km²) ≈ 3.600 way ≈ 1–2 MB
  JSON Overpass, masih jauh dari batas 50.000 simpul API /map;
- sel menjadi satuan cache: menggeser peta ke sel yang sudah dimuat tidak
  menghubungi jaringan lagi.

Kebijakan yang diikuti:

- Overpass API (https://dev.overpass-api.de/overpass-doc/en/preface/commons.html):
  ≈ 10.000 permintaan dan ≈ 1 GB per hari per pengguna; HTTP 429 = ditolak oleh
  batas laju, 504 = batas waktu/memori. Permintaan diserialkan oleh satu kunci,
  berjeda ≥ JEDA_MIN_S, dan memuat `[timeout:…][maxsize:…]`. Jawaban 200 dengan
  `remark` "runtime error" diperlakukan sebagai gagal. Setelah gagal, Overpass
  dilewati selama JEDA_OVERPASS_SAKIT_S dan jalur cadangan dipakai.
- API OSM `/map` (cadangan): bbox ≤ 0,25 derajat persegi dan ≤ 50.000 simpul;
  melebihi batas = HTTP 400, lalu jendela dipecah per sel.
- User-Agent mengenali aplikasi beserta URL repositori.

Cache (SQLite, data/cache): tabel `sel_osm` menyimpan daftar ID bangunan tiap sel
dan waktu ambil; tabel `bangunan_osm` menyimpan geometri per ID (dipakai
`cari_bangunan` saat bangunan dipindai). Tabel katalog `bangunan` sengaja tidak
dipakai agar ribuan bangunan yang hanya dilihat tidak membengkakkan katalog.
Sel kedaluwarsa setelah TTL_SEL_S dan diambil ulang.
"""

from __future__ import annotations

import json
import math
import time
import xml.etree.ElementTree as ET
from collections.abc import Callable
from datetime import UTC, datetime
from threading import Lock
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic import ValidationError
from shapely.geometry import Polygon, mapping

from app.contracts import BangunanRingkas
from app.storage import baca_banyak, simpan_banyak
from app.vision import luas_geodesik
from app.wilayah_id import di_indonesia

VERSION = "l1-osm.2026.10.25"
URL_OVERPASS = "https://overpass-api.de/api/interpreter"
URL_OSM = "https://api.openstreetmap.org/api/0.6"
USER_AGENT = "PetaSurya/0.1 (+https://github.com/astrorehan/PetaSurya)"
PENERBIT = "OpenStreetMap contributors, ODbL 1.0"

UKURAN_SEL = 0.003  # derajat; ≈ 333 m di khatulistiwa
SEL_PER_SISI = 2  # jendela 2 × 2 sel ≈ 670 m
MAKS_SEL_PENUTUP = 16  # pagar untuk pencarian radius (≤ 200 m → 3 × 3 sel)
TTL_SEL_S = 14 * 86400  # bangunan OSM berubah pelan; dua minggu cukup segar
JEDA_MIN_S = 1.0  # jeda antarpermintaan jaringan ke OSM
JEDA_OVERPASS_SAKIT_S = 120.0
TUNGGU_KUNCI_S = 45.0
WAKTU_OVERPASS_S = 8  # batas tunggu soket Overpass; kueri sendiri [timeout:10]
WAKTU_API_S = 20
BATAS_BYTE_OVERPASS = 24_000_000
BATAS_BYTE_API = 16_000_000

Sel = tuple[int, int]  # (indeks bujur, indeks lintang)
KodeWilayah = Callable[[float, float], str | None]  # (lon, lat) -> kode atau None

_kunci_jaringan = Lock()
_terakhir = 0.0
_overpass_sakit_sampai = 0.0


# ---- geometri sel -----------------------------------------------------------


def sel_titik(lon: float, lat: float) -> Sel:
    return math.floor(lon / UKURAN_SEL + 1e-9), math.floor(lat / UKURAN_SEL + 1e-9)


def kotak_sel(sel: Sel) -> tuple[float, float, float, float]:
    """(barat, selatan, timur, utara) sel, derajat."""
    ix, iy = sel
    return tuple(  # type: ignore[return-value]
        round(v * UKURAN_SEL, 6) for v in (ix, iy, ix + 1, iy + 1)
    )


def jendela_pusat(lon: float, lat: float) -> list[Sel]:
    """Blok SEL_PER_SISI² sel yang berpusat pada simpul kisi terdekat dari titik."""
    nx, ny = round(lon / UKURAN_SEL), round(lat / UKURAN_SEL)
    awal = SEL_PER_SISI // 2
    return [
        (nx - awal + i, ny - awal + j) for i in range(SEL_PER_SISI) for j in range(SEL_PER_SISI)
    ]


def sel_penutup(barat: float, selatan: float, timur: float, utara: float) -> list[Sel]:
    """Semua sel yang memotong bbox; paling banyak MAKS_SEL_PENUTUP."""
    x0, y0 = sel_titik(barat, selatan)
    x1 = max(x0, math.ceil(timur / UKURAN_SEL - 1e-9) - 1)
    y1 = max(y0, math.ceil(utara / UKURAN_SEL - 1e-9) - 1)
    sel = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    if len(sel) > MAKS_SEL_PENUTUP:
        raise ValueError("Area terlalu luas untuk dimuat dari OSM.")
    return sel


def kotak_gabungan(sel: list[Sel]) -> tuple[float, float, float, float]:
    kotak = [kotak_sel(s) for s in sel]
    return (
        min(k[0] for k in kotak),
        min(k[1] for k in kotak),
        max(k[2] for k in kotak),
        max(k[3] for k in kotak),
    )


def _id_sel(sel: Sel) -> int:
    """ID bilangan bulat tunggal untuk baris cache; |indeks| < 100.000 (±300° pada 0,003°)."""
    return (sel[0] + 100_000) * 1_000_000 + (sel[1] + 100_000)


# ---- pembacaan data OSM -----------------------------------------------------


def bangunan_dari_cincin(
    way_id: int,
    tags: dict[str, str],
    titik: list[tuple[float, float]],
    kode_wilayah: KodeWilayah | None = None,
) -> tuple[BangunanRingkas, tuple[float, float, float, float]] | None:
    """Poligon bangunan valid di Indonesia beserta kotak pembatasnya; selain itu None."""
    if tags.get("building") in {None, "no"} or len(titik) < 4 or titik[0] != titik[-1]:
        return None
    geom = Polygon(titik)
    if (
        geom.is_empty
        or not geom.is_valid
        or not all(math.isfinite(v) for xy in geom.exterior.coords for v in xy)
    ):
        return None
    pusat = geom.representative_point()
    if not di_indonesia(pusat.y, pusat.x):
        return None
    luas = luas_geodesik(geom)
    if luas <= 0:
        return None
    lantai = tags.get("building:levels", "")
    try:
        b = BangunanRingkas(
            id=way_id,
            source="osm",
            source_ref=f"way/{way_id}",
            geom=mapping(geom),
            footprint_m2=round(luas, 1) or luas,
            building_tag=tags["building"],
            nama=tags.get("name"),
            levels=int(lantai) if lantai.isdigit() and int(lantai) > 0 else None,
            region_code=kode_wilayah(pusat.x, pusat.y) if kode_wilayah else None,
        )
    except ValidationError:
        return None
    return b, geom.bounds


def dari_xml(
    xml: bytes, kode_wilayah: KodeWilayah | None = None
) -> list[tuple[BangunanRingkas, tuple[float, float, float, float]]]:
    osm = ET.fromstring(xml)
    simpul = {
        n.attrib["id"]: (float(n.attrib["lon"]), float(n.attrib["lat"]))
        for n in osm.findall("node")
    }
    hasil = []
    for way in osm.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        ref = [n.attrib["ref"] for n in way.findall("nd")]
        if not all(r in simpul for r in ref):
            continue
        if b := bangunan_dari_cincin(
            int(way.attrib["id"]), tags, [simpul[r] for r in ref], kode_wilayah
        ):
            hasil.append(b)
    return hasil


def dari_overpass(
    data: dict, kode_wilayah: KodeWilayah | None = None
) -> list[tuple[BangunanRingkas, tuple[float, float, float, float]]]:
    """Elemen `way` hasil `out geom`; elemen tanpa geometri lengkap dilewati."""
    hasil = []
    for el in data.get("elements", []):
        if el.get("type") != "way" or not isinstance(el.get("id"), int):
            continue
        geometri = el.get("geometry") or []
        if not geometri or any(not isinstance(g, dict) for g in geometri):
            continue
        try:
            titik = [(float(g["lon"]), float(g["lat"])) for g in geometri]
        except (KeyError, TypeError, ValueError):
            continue
        if b := bangunan_dari_cincin(el["id"], el.get("tags") or {}, titik, kode_wilayah):
            hasil.append(b)
    return hasil


# ---- jaringan ---------------------------------------------------------------


def _ambil_url(
    url: str, *, data: bytes | None, timeout: float, batas_byte: int, accept: str
) -> bytes:
    """Satu permintaan HTTP; semua galat jaringan adalah OSError."""
    global _terakhir
    tunggu = JEDA_MIN_S - (time.monotonic() - _terakhir)
    if tunggu > 0:
        time.sleep(tunggu)
    try:
        permintaan = Request(url, data=data, headers={"User-Agent": USER_AGENT, "Accept": accept})
        with urlopen(permintaan, timeout=timeout) as r:
            isi = r.read(batas_byte + 1)
    finally:
        _terakhir = time.monotonic()
    if len(isi) > batas_byte:
        raise OSError("Area terlalu padat; pilih area yang lebih kecil.")
    return isi


def _overpass(sel: list[Sel]) -> tuple[dict, dict]:
    barat, selatan, timur, utara = kotak_gabungan(sel)
    kueri = (
        "[out:json][timeout:10][maxsize:67108864];"
        f'way["building"]({selatan},{barat},{utara},{timur});out geom qt;'
    )
    mentah = _ambil_url(
        URL_OVERPASS,
        data=urlencode({"data": kueri}).encode(),
        timeout=WAKTU_OVERPASS_S,
        batas_byte=BATAS_BYTE_OVERPASS,
        accept="application/json",
    )
    try:
        data = json.loads(mentah)
    except ValueError as galat:
        raise OSError("Jawaban Overpass tidak dapat dibaca.") from galat
    if not isinstance(data, dict) or "runtime error" in str(data.get("remark", "")):
        raise OSError("Overpass gagal menyelesaikan kueri.")
    osm3s = data.get("osm3s") or {}
    return data, {
        "via": "overpass",
        "url": URL_OVERPASS,
        "timestamp_osm": str(osm3s.get("timestamp_osm_base") or _sekarang_iso()),
    }


def _api_osm(sel: list[Sel], kode_wilayah: KodeWilayah | None):
    """API /map; HTTP 400 (melebihi 50.000 simpul) memecah jendela menjadi per sel."""
    barat, selatan, timur, utara = kotak_gabungan(sel)
    url = f"{URL_OSM}/map?bbox={barat:.6f},{selatan:.6f},{timur:.6f},{utara:.6f}"
    try:
        xml = _ambil_url(
            url, data=None, timeout=WAKTU_API_S, batas_byte=BATAS_BYTE_API, accept="text/xml"
        )
    except HTTPError as galat:
        if galat.code == 400 and len(sel) > 1:
            hasil = []
            for satu in sel:
                hasil.extend(_api_osm([satu], kode_wilayah)[0])
            return hasil, _meta_api()
        raise
    try:
        hasil = dari_xml(xml, kode_wilayah)
    except ET.ParseError as galat:
        raise OSError("Geometri OSM belum dapat dibaca.") from galat
    return hasil, _meta_api()


def _meta_api() -> dict:
    return {"via": "osm_api", "url": f"{URL_OSM}/map", "timestamp_osm": _sekarang_iso()}


def _sekarang_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _unduh(sel: list[Sel], kode_wilayah: KodeWilayah | None):
    """Overpass lebih dahulu; bila gagal, API /map. Kegagalan keduanya = OSError."""
    global _overpass_sakit_sampai
    if time.monotonic() >= _overpass_sakit_sampai:
        try:
            data, meta = _overpass(sel)
            return dari_overpass(data, kode_wilayah), meta
        except OSError:
            _overpass_sakit_sampai = time.monotonic() + JEDA_OVERPASS_SAKIT_S
    return _api_osm(sel, kode_wilayah)


# ---- cache sel --------------------------------------------------------------


def _sel_segar(sel: list[Sel]) -> dict[Sel, dict]:
    baris = baca_banyak("sel_osm", [_id_sel(s) for s in sel])
    sekarang = time.time()
    return {
        s: baris[_id_sel(s)]
        for s in sel
        if _id_sel(s) in baris and sekarang - baris[_id_sel(s)]["diambil"] < TTL_SEL_S
    }


def pastikan_sel(
    sel: list[Sel], kode_wilayah: KodeWilayah | None = None, *, jaringan: bool = True
) -> dict[Sel, dict]:
    """Rekaman sel yang tersedia; sel yang kurang diambil dari OSM bila `jaringan`.

    Sel kosong (tanpa bangunan) juga direkam supaya tidak diambil berulang.
    Mengembalikan hanya sel yang ada; tanpa `jaringan`, sel yang belum di-cache
    tidak muncul. Galat jaringan = OSError.
    """
    ada = _sel_segar(sel)
    kurang = [s for s in sel if s not in ada]
    if not kurang or not jaringan:
        return ada
    if not _kunci_jaringan.acquire(timeout=TUNGGU_KUNCI_S):
        raise OSError("Pemuatan bangunan OSM sedang sibuk.")
    try:
        # Permintaan lain mungkin sudah memuatnya selagi menunggu kunci.
        ada = _sel_segar(sel)
        kurang = [s for s in sel if s not in ada]
        if kurang:
            kotak_ambil = sorted(kurang)
            xs = [s[0] for s in kotak_ambil]
            ys = [s[1] for s in kotak_ambil]
            rect = [
                (x, y) for x in range(min(xs), max(xs) + 1) for y in range(min(ys), max(ys) + 1)
            ]
            bangunan, meta = _unduh(rect, kode_wilayah)
            ada.update(_simpan_sel(rect, bangunan, meta))
    finally:
        _kunci_jaringan.release()
    return ada


def _simpan_sel(rect: list[Sel], bangunan, meta: dict) -> dict[Sel, dict]:
    milik: dict[Sel, list[int]] = {s: [] for s in rect}
    baris_bangunan = {}
    for b, (x0, y0, x1, y1) in bangunan:
        baris_bangunan[b.id] = {**b.model_dump(mode="json"), "_sumber_url": meta["url"]}
        ax, ay = sel_titik(x0, y0)
        bx = max(ax, math.ceil(x1 / UKURAN_SEL - 1e-9) - 1)
        by = max(ay, math.ceil(y1 / UKURAN_SEL - 1e-9) - 1)
        for x in range(ax, bx + 1):
            for y in range(ay, by + 1):
                if (x, y) in milik:
                    milik[(x, y)].append(b.id)
    waktu = time.time()
    rekaman = {
        s: {
            "diambil": waktu,
            "tanggal": _sekarang_iso()[:10],
            "via": meta["via"],
            "url": meta["url"],
            "timestamp_osm": meta["timestamp_osm"],
            "id": sorted(set(ids)),
        }
        for s, ids in milik.items()
    }
    simpan_banyak("bangunan_osm", baris_bangunan)
    simpan_banyak("sel_osm", {_id_sel(s): r for s, r in rekaman.items()})
    return rekaman


def bangunan_sel(rekaman: dict[Sel, dict]) -> list[BangunanRingkas]:
    """Gabungan bangunan semua sel, tanpa duplikat (bangunan melintasi batas sel)."""
    ids = sorted({i for r in rekaman.values() for i in r["id"]})
    hasil = []
    for baris in baca_banyak("bangunan_osm", ids).values():
        try:
            hasil.append(BangunanRingkas.model_validate(baris))
        except ValidationError:
            continue
    return sorted(hasil, key=lambda b: b.id)


def bangunan_tersimpan(identitas: int) -> BangunanRingkas | None:
    """Bangunan dari sel yang pernah dimuat; tanpa jaringan."""
    if baris := baca_banyak("bangunan_osm", [identitas]).get(identitas):
        try:
            return BangunanRingkas.model_validate(baris)
        except ValidationError:
            return None
    return None


def sumber_terlama(rekaman: dict[Sel, dict]) -> dict:
    """Metadata sumber untuk respons: rekaman tertua, agar tidak melebih-lebihkan kesegaran."""
    r = min(rekaman.values(), key=lambda x: x["diambil"])
    layanan = "Overpass API" if r["via"] == "overpass" else "API OpenStreetMap"
    return {
        "penerbit": f"{PENERBIT}, melalui {layanan}",
        "url": r["url"],
        "diambil": r["tanggal"],
        "timestamp_osm": r["timestamp_osm"],
        "catatan": (
            "Footprint OSM diambil saat peta dibuka dan disimpan sementara; kelengkapan "
            "dan ketepatan bergantung pada kontributor OSM. Relasi multipolygon belum "
            "dimuat. Tidak ada tebakan jenis bangunan di luar Kota Bengkulu."
        ),
    }
