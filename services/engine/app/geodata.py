"""Layanan L1 geospasial: kueri bangunan, geocoding lokal, dan analisis atap."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from pydantic import BaseModel, Field
from shapely import transform
from shapely.geometry import shape

from app.analyses import analisis_bangunan_terbaru, simpan_analisis
from app.contracts import (
    AnalisisAtap,
    BangunanRingkas,
)
from app.imagery import ambil_citra, bingkai_bangunan, muat_citra_lokal
from app.simulation import BuildingNotFoundError
from app.vision import analisis_dari_mask, segmentasi_atap

DIR_ROOT = Path(__file__).resolve().parents[3]
DIR_BANGUNAN = DIR_ROOT / "data" / "fixtures" / "bangunan"
DIR_ANALISIS = DIR_ROOT / "data" / "fixtures" / "analisis"


class HasilGeocode(BaseModel):
    """Hasil geocoding alamat atau koordinat."""

    name: str = Field(..., description="Nama singkat lokasi")
    display_name: str = Field(..., description="Alamat lengkap")
    lat: float = Field(..., description="Lintang WGS84, derajat")
    lon: float = Field(..., description="Bujur WGS84, derajat")
    building_id: int | None = Field(None, description="ID bangunan jika cocok dengan objek")
    region_code: str | None = Field(None, description="Kode wilayah BPS")


class PermintaanAnalisis(BaseModel):
    """Badan permintaan untuk POST /api/v1/analyze."""

    building_id: int = Field(gt=0)
    force: bool = False


def jarak_haversine_meter(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Hitung jarak permukaan bumi dalam meter dengan rumus Haversine."""
    r_bumi = 6371000.0  # Meter
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_bumi * c


def muat_semua_bangunan() -> list[tuple[BangunanRingkas, float, float]]:
    """Muat bangunan fixture beserta koordinat centroid (lat, lon)."""
    hasil: list[tuple[BangunanRingkas, float, float]] = []
    if not DIR_BANGUNAN.exists():
        return hasil

    for berkas in DIR_BANGUNAN.glob("*.json"):
        if berkas.name.endswith(".overpass.json"):
            continue
        try:
            konten = json.loads(berkas.read_text(encoding="utf-8"))
            bangunan = BangunanRingkas.model_validate(konten)
            ring = konten["geom"]["coordinates"][0]
            # Hitung centroid rata-rata koordinat simpul
            lon_c = sum(p[0] for p in ring) / len(ring)
            lat_c = sum(p[1] for p in ring) / len(ring)
            hasil.append((bangunan, lat_c, lon_c))
        except Exception:
            continue
    return hasil


def cari_bangunan_radius(lat: float, lon: float, radius_m: float = 200.0) -> list[BangunanRingkas]:
    """Cari bangunan di dalam radius tertentu (maks 200 meter)."""
    daftar = muat_semua_bangunan()
    cocok: list[BangunanRingkas] = []
    for b, lat_c, lon_c in daftar:
        if jarak_haversine_meter(lat, lon, lat_c, lon_c) <= radius_m:
            cocok.append(b)
    return cocok


def geocode_pencarian_lokal(q: str) -> list[HasilGeocode]:
    """Cari lokasi lokal Bengkulu berdasarkan string pencarian atau nama bangunan."""
    kata_kunci = q.strip().lower()
    if not kata_kunci:
        return []

    daftar = muat_semua_bangunan()
    hasil: list[HasilGeocode] = []

    aliases: dict[int, list[str]] = {
        991016391: [
            "indomaret",
            "toko",
            "wr supratman",
            "supratman",
            "kandang limun",
        ],
        1145010599: ["rumah", "kandang limun", "unib", "residence"],
        1146141501: [
            "kampus",
            "fakultas hukum",
            "fh unib",
            "unib",
            "universitas bengkulu",
        ],
    }

    for b, lat_c, lon_c in daftar:
        nama = (b.nama or "").lower()
        alias_list = aliases.get(b.id, [])
        tag = (b.building_tag or "").lower()

        cocok = (
            kata_kunci in nama
            or kata_kunci in str(b.id)
            or any(kata_kunci in a for a in alias_list)
            or any(a in kata_kunci for a in alias_list)
            or kata_kunci in tag
        )

        if cocok:
            nama_tampil = b.nama or f"Bangunan #{b.id}"
            alamat = f"{nama_tampil}, Kandang Limun, Kota Bengkulu"
            hasil.append(
                HasilGeocode(
                    name=nama_tampil,
                    display_name=alamat,
                    lat=round(lat_c, 6),
                    lon=round(lon_c, 6),
                    building_id=b.id,
                    region_code=b.region_code or "1771",
                )
            )

    return hasil


def proses_analisis_atap(building_id: int, force: bool = False) -> AnalisisAtap:
    """Ambil atau hitung analisis atap untuk sebuah bangunan."""
    # 1. Periksa apakah sudah ada berkas analisis fixture tersimpan
    tersimpan = analisis_bangunan_terbaru(building_id)
    if tersimpan and not force:
        return tersimpan
    if DIR_ANALISIS.exists():
        for berkas in DIR_ANALISIS.glob("*.json"):
            try:
                data = json.loads(berkas.read_text(encoding="utf-8"))
                if data.get("building_id") == building_id:
                    tersimpan = AnalisisAtap.model_validate(data)
                    if not force:
                        return tersimpan
                    break
            except Exception:
                continue

    # 2. Cari data bangunan
    daftar = muat_semua_bangunan()
    bangunan_ditemukan: BangunanRingkas | None = None
    for b, _, _ in daftar:
        if b.id == building_id:
            bangunan_ditemukan = b
            break

    if bangunan_ditemukan is None:
        raise BuildingNotFoundError(f"Bangunan id {building_id} tidak terdaftar.")

    # Hasil tersimpan selalu didahulukan; penghitungan langsung tidak menyimpan tile Esri.
    bangunan = bangunan_ditemukan
    bingkai = bingkai_bangunan(bangunan)
    sebab = None
    try:
        lokal = muat_citra_lokal(building_id)
        if lokal:
            bingkai, citra, sumber = lokal
        else:
            citra = ambil_citra(bingkai)
            sumber = "esri-world-imagery"
        footprint = transform(
            shape(bangunan.geom.model_dump()), bingkai.ke_piksel, interleaved=False
        )
        mask, skor = segmentasi_atap(citra, footprint)
    except (OSError, ValueError) as galat:
        sebab = str(galat)
        sumber = "tidak-tersedia"
        mask = np.zeros((bingkai.tinggi, bingkai.lebar), dtype=np.uint8)
        skor = 0.0
    analisis, _ = analisis_dari_mask(bangunan, bingkai, mask, skor)
    if tersimpan:
        analisis.roof_analysis_id = tersimpan.roof_analysis_id
    analisis.imagery.source = sumber
    if sebab:
        analisis.peringatan = f"Analisis citra tidak tersedia ({sebab}). {analisis.peringatan}"
    simpan_analisis(analisis)
    return analisis
