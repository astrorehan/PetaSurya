"""Titik masuk FastAPI. Satu service: rute, CORS, health, simulasi, geodata."""

from fastapi import FastAPI, Path, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.aggregate import PermintaanAgregasiInput, jalankan_agregasi
from app.buildings import DiLuarCakupan, muat_katalog
from app.contracts import (
    AnalisisAtap,
    BangunanRingkas,
    Error,
    GalatApi,
    HasilAgregasi,
    HasilSimulasi,
    KodeGalat,
    PaketPemindaian,
)
from app.geodata import (
    HasilGeocode,
    PermintaanAnalisis,
    cari_bangunan_radius,
    geocode_pencarian_lokal,
    proses_analisis_atap,
)
from app.scans import paket_pemindaian
from app.simulation import (
    BuildingNotFoundError,
    PermintaanSimulasi,
    RoofTooSmallError,
    jalankan_simulasi,
)
from app.storage import baca
from app.vision import MODEL_VERSION

VERSION = "engine.2026.10.14"

app = FastAPI(title="PetaSurya engine", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
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
