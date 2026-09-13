"""Titik masuk FastAPI. Satu service: rute, CORS, health."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

VERSION = "engine.2026.09.13"

app = FastAPI(title="PetaSurya engine", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    """Dipakai pemantau hosting dan footer web (menampilkan versi mesin)."""
    return {"status": "ok", "engine_version": VERSION}
