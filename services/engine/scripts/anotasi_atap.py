"""Meja anotasi lokal yang tidak menampilkan OSM maupun prediksi segmentasi."""

import argparse
import hashlib
import io
import json
from functools import lru_cache
from pathlib import Path
from threading import RLock

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from PIL import Image
from pydantic import BaseModel, Field

from app.evaluation import DIR_EVALUASI, acuan_piksel, digest
from app.imagery import ambil_citra
from app.vision import BingkaiCitra

app = FastAPI(title="Anotasi atap lokal", docs_url=None, redoc_url=None)
_kunci_acuan = RLock()


def manifest():
    return json.loads((DIR_EVALUASI / "manifest.json").read_text("utf-8"))


def anotasi():
    with _kunci_acuan:
        return _baca_acuan()


def _baca_acuan():
    p = DIR_EVALUASI / "acuan.json"
    return (
        json.loads(p.read_text("utf-8"))
        if p.exists()
        else {
            "sha256_manifest": digest(manifest()),
            "metode": "anotasi-visual-terpisah",
            "sampel": {},
        }
    )


def sampel(identitas):
    return next(s for s in manifest()["sampel"] if s["id"] == identitas)


@lru_cache(maxsize=32)
def citra(identitas):
    s = sampel(identitas)
    rgb = ambil_citra(BingkaiCitra(**s["bingkai"]))
    buffer = io.BytesIO()
    Image.fromarray(rgb).save(buffer, format="PNG")
    return buffer.getvalue(), hashlib.sha256(rgb.tobytes()).hexdigest()


@app.get("/", response_class=HTMLResponse)
def halaman():
    return Path(__file__).with_suffix(".html").read_text("utf-8")


@app.get("/galeri", response_class=HTMLResponse)
def galeri():
    return Path(__file__).with_name("galeri_atap.html").read_text("utf-8")


@app.get("/sampel")
def daftar():
    # Geometri OSM dan hasil model sengaja tidak diberikan pada layar anotasi.
    acuan = anotasi()["sampel"]
    return [
        {
            "id": s["id"],
            "crop": s["crop"],
            "penanda": s["penanda"],
            "status": acuan.get(str(s["id"]), {}).get("status", "belum"),
        }
        for s in manifest()["sampel"]
    ]


@app.get("/citra/{identitas}")
def gambar(identitas: int):
    try:
        png, sha = citra(identitas)
    except StopIteration as error:
        raise HTTPException(404) from error
    return Response(
        png, media_type="image/png", headers={"X-Citra-SHA256": sha, "Cache-Control": "no-store"}
    )


class Acuan(BaseModel):
    status: str
    rings: list = Field(default_factory=list)
    catatan: str = ""
    review: str = "belum"


@app.get("/acuan/{identitas}")
def baca_acuan(identitas: int):
    return anotasi()["sampel"].get(str(identitas))


@app.post("/acuan/{identitas}")
def simpan(identitas: int, data: Acuan, request: Request):
    if request.headers.get("origin") not in {None, f"http://{request.headers.get('host')}"}:
        raise HTTPException(403, "Asal permintaan tidak cocok dengan meja lokal.")
    try:
        s = sampel(identitas)
    except StopIteration as error:
        raise HTTPException(404) from error
    if data.status not in {"digambar", "ambigu"}:
        raise HTTPException(422, "Status acuan tidak valid.")
    if data.review not in {"belum", "ditinjau"}:
        raise HTTPException(422, "Status tinjauan tidak valid.")
    if data.status == "digambar":
        try:
            acuan_piksel(data.rings, BingkaiCitra(**s["bingkai"]))
        except (ValueError, IndexError, TypeError) as error:
            raise HTTPException(422, str(error)) from error
    elif not data.catatan.strip():
        raise HTTPException(422, "Acuan ambigu memerlukan alasan.")
    _, sha = citra(identitas)
    with _kunci_acuan:
        hasil = anotasi()
        if hasil["sha256_manifest"] != digest(manifest()):
            raise HTTPException(409, "Manifest berubah.")
        hasil["sampel"][str(identitas)] = {**data.model_dump(), "sha256_citra": sha}
        p = DIR_EVALUASI / "acuan.json"
        sementara = p.with_suffix(".tmp")
        sementara.write_text(json.dumps(hasil, ensure_ascii=False, indent=2) + "\n", "utf-8")
        sementara.replace(p)
    return {"status": "tersimpan", "id": identitas}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8060)
    args = parser.parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port)
