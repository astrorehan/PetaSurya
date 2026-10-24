"""Titik masuk FastAPI. Satu service: rute, CORS, health, simulasi, geodata."""

import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Path, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.aggregate import PermintaanAgregasiInput, jalankan_agregasi
from app.alamat import PermintaanAlamatInput, cari_alamat
from app.buildings import (
    DiLuarCakupan,
    PermintaanFootprintInput,
    footprint_di_area,
    muat_katalog,
)
from app.contracts import (
    AnalisisAtap,
    BangunanRingkas,
    Error,
    FootprintArea,
    GalatApi,
    HasilAgregasi,
    HasilSimulasi,
    InfoWilayah,
    KodeGalat,
    PaketPemindaian,
    PencarianAlamat,
    PermintaanWilayah,
)
from app.emisi import info_wilayah
from app.geodata import (
    HasilGeocode,
    MesinSibuk,
    PermintaanAnalisis,
    cari_bangunan_radius,
    geocode_pencarian_lokal,
    proses_analisis_atap,
)
from app.scans import paket_pemindaian
from app.settings import asal_web
from app.simulation import (
    BuildingNotFoundError,
    PermintaanSimulasi,
    RoofTooSmallError,
    jalankan_simulasi,
)
from app.storage import baca
from app.vision import MODEL_VERSION, _sesi

VERSION = "engine.2026.10.21.1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("PETASURYA_PRELOAD_MODEL", "0") == "1":
        _sesi()
    yield


app = FastAPI(title="PetaSurya engine", version=VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=asal_web(),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
# Footprint satu tampilan peta ±0,5 MB JSON; gzip memangkasnya ±5×.
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.exception_handler(MesinSibuk)
def mesin_sibuk(request: Request, error: MesinSibuk):
    return JSONResponse(
        status_code=503,
        headers={"Retry-After": "10"},
        content={
            "error": {"code": "GEODATA_UNAVAILABLE", "message": str(error), "retriable": True}
        },
    )


@app.exception_handler(DiLuarCakupan)
def di_luar_cakupan(request: Request, error: DiLuarCakupan):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "OUT_OF_COVERAGE", "message": str(error), "retriable": False}},
    )


@app.exception_handler(OSError)
def sumber_tidak_tersedia(request: Request, error: OSError):
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "GEODATA_UNAVAILABLE",
                "message": "Data bangunan belum tersedia. Coba lagi atau pilih hasil tersimpan.",
                "retriable": True,
            }
        },
    )


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Kembalikan amplop kontrak tanpa menyalin nilai NaN/Infinity ke JSON."""
    kolom = sorted({".".join(str(bagian) for bagian in galat["loc"]) for galat in exc.errors()})
    galat = GalatApi(
        error=Error(
            code=KodeGalat.VALIDATION_ERROR,
            message="Masukan tidak valid.",
            hint=f"Periksa nilai pada: {', '.join(kolom)}.",
            retriable=False,
        )
    )
    return JSONResponse(status_code=422, content=galat.model_dump())


@app.exception_handler(BuildingNotFoundError)
def building_not_found_handler(request: Request, exc: BuildingNotFoundError) -> JSONResponse:
    galat = GalatApi(
        error=Error(
            code=KodeGalat.BUILDING_NOT_FOUND,
            message=str(exc),
            hint="Pastikan ID bangunan atau analisis atap terdaftar dalam basis data.",
            retriable=False,
        )
    )
    return JSONResponse(status_code=404, content=galat.model_dump())


@app.exception_handler(RoofTooSmallError)
def roof_too_small_handler(request: Request, exc: RoofTooSmallError) -> JSONResponse:
    galat = GalatApi(
        error=Error(
            code=KodeGalat.ROOF_TOO_SMALL,
            message=str(exc),
            hint="Dibutuhkan minimal luas atap yang cukup untuk satu modul fotovoltaik.",
            retriable=False,
        )
    )
    return JSONResponse(status_code=400, content=galat.model_dump())


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    """Dipakai pemantau hosting dan footer web (menampilkan versi mesin)."""
    return {"status": "ok", "engine_version": VERSION}


@app.get("/api/v1/ready")
def ready():
    """Kesiapan inferensi memuat encoder dan decoder; tidak bergantung sumber citra."""
    try:
        _sesi()
    except Exception:
        return JSONResponse(
            status_code=503, content={"status": "not_ready", "model_version": MODEL_VERSION}
        )
    return {"status": "ready", "model_version": MODEL_VERSION, "provider": "CPUExecutionProvider"}


@app.post("/api/v1/aggregate", response_model=HasilAgregasi)
def aggregate(permintaan: PermintaanAgregasiInput) -> HasilAgregasi:
    """Estimasi footprint dan pemilihan atap pada snapshot Kota Bengkulu."""
    return jalankan_agregasi(permintaan)


@app.get("/api/v1/buildings", response_model=list[BangunanRingkas])
def get_buildings(
    lat: float = Query(..., ge=-85, le=85, description="Lintang titik pusat pencarian"),
    lon: float = Query(..., ge=-180, le=180, description="Bujur titik pusat pencarian"),
    r: float = Query(
        200.0,
        gt=0.0,
        le=200.0,
        description="Radius pencarian dalam meter (maksimal 200 meter)",
    ),
    live: bool = False,
) -> list[BangunanRingkas]:
    """Kembalikan poligon bangunan di sekitar koordinat dalam radius r meter."""
    return cari_bangunan_radius(lat=lat, lon=lon, radius_m=r, live=live)


@app.get("/api/v1/footprints", response_model=FootprintArea, response_model_exclude_unset=True)
def footprint_area(permintaan: Annotated[PermintaanFootprintInput, Query()]) -> FootprintArea:
    """Footprint bangunan dalam bbox peta di Indonesia.

    Snapshot Kota Bengkulu tanpa jaringan; di tempat lain jendela sekitar pusat bbox
    dari OSM (di-cache). Lihat `area_dimuat` dan `jenis_sumber` pada respons.
    """
    return footprint_di_area(permintaan)


@app.get("/api/v1/alamat", response_model=PencarianAlamat, response_model_exclude_unset=True)
def alamat(permintaan: Annotated[PermintaanAlamatInput, Query()]) -> PencarianAlamat:
    """Alamat di Indonesia dari Nominatim beserta footprint bangunan di titiknya."""
    return cari_alamat(permintaan.q, permintaan.lat, permintaan.lon)


@app.get("/api/v1/wilayah", response_model=InfoWilayah)
def wilayah(permintaan: Annotated[PermintaanWilayah, Query()]) -> InfoWilayah:
    """Provinsi di titik dan faktor emisi sistem listriknya (Gatrik 2019)."""
    info = info_wilayah(permintaan.lat, permintaan.lon)
    if info is None:
        raise DiLuarCakupan("Titik berada di luar wilayah Indonesia.")
    return info


@app.get("/api/v1/catalog", response_model=list[BangunanRingkas], response_model_exclude_unset=True)
def katalog():
    return muat_katalog()


@app.get("/api/v1/scans", response_model=list[int])
def indeks_hasil():
    import json

    from app.geodata import DIR_ANALISIS

    data = [json.loads(p.read_text("utf-8")) for p in DIR_ANALISIS.glob("*.json")]
    data.extend(baca("analisis"))
    return sorted({a["building_id"] for a in data if a["model_version"] == MODEL_VERSION})


@app.get(
    "/api/v1/scans/{building_id}", response_model=PaketPemindaian, response_model_exclude_unset=True
)
def scan_tersimpan(building_id: int = Path(gt=0)):
    return paket_pemindaian(building_id)


@app.post("/api/v1/scans", response_model=PaketPemindaian, response_model_exclude_unset=True)
def scan_langsung(permintaan: PermintaanAnalisis):
    return paket_pemindaian(permintaan.building_id, jalankan=True, force=permintaan.force)


@app.get("/api/v1/geocode", response_model=list[HasilGeocode])
def geocode(
    q: str = Query(..., min_length=1, description="Kata kunci alamat atau nama tempat"),
) -> list[HasilGeocode]:
    """Pencarian alamat dan nama tempat lokal."""
    return geocode_pencarian_lokal(q)


@app.post("/api/v1/analyze", response_model=AnalisisAtap, response_model_exclude_unset=True)
def analyze(permintaan: PermintaanAnalisis) -> AnalisisAtap:
    """Analisis segmentasi atap satu bangunan (CV atau fallback)."""
    return proses_analisis_atap(permintaan.building_id, force=permintaan.force)


@app.post("/api/v1/simulate", response_model=HasilSimulasi)
def simulate(permintaan: PermintaanSimulasi) -> HasilSimulasi:
    """Jalankan orkestrasi L3 fisika + L4 ekonomi + L5 karbon."""
    return jalankan_simulasi(permintaan)
