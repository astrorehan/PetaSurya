"""Titik masuk FastAPI. Satu service: rute, CORS, health, simulasi."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.contracts import Error, GalatApi, HasilSimulasi, KodeGalat
from app.simulation import (
    BuildingNotFoundError,
    PermintaanSimulasi,
    RoofTooSmallError,
    jalankan_simulasi,
)

VERSION = "engine.2026.09.22"

app = FastAPI(title="PetaSurya engine", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(BuildingNotFoundError)
def building_not_found_handler(request: Request, exc: BuildingNotFoundError) -> JSONResponse:
    galat = GalatApi(
        error=Error(
            code=KodeGalat.BUILDING_NOT_FOUND,
            message=str(exc),
            hint="Pastikan ID analisis atap terdaftar dalam basis data.",
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


@app.post("/api/v1/simulate", response_model=HasilSimulasi)
def simulate(permintaan: PermintaanSimulasi) -> HasilSimulasi:
    """Jalankan orkestrasi L3 fisika + L4 ekonomi + L5 karbon."""
    return jalankan_simulasi(permintaan)
