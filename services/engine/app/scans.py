"""Paket citra, bangunan, dan hasil untuk pemindaian langsung."""

import time
from dataclasses import asdict

from app.buildings import cari_bangunan
from app.contracts import PaketPemindaian
from app.geodata import analisis_tersimpan, proses_analisis_atap
from app.imagery import bingkai_bangunan, daftar_tile
from app.simulation import BuildingNotFoundError


def paket_pemindaian(building_id: int, jalankan=False, force=False) -> PaketPemindaian:
    bangunan = cari_bangunan(building_id)
    if bangunan is None:
        raise BuildingNotFoundError("Bangunan OSM tidak ditemukan di Kota Bengkulu.")
    sebelumnya = analisis_tersimpan(building_id)
    mulai = time.monotonic()
    if jalankan:
        analisis = proses_analisis_atap(building_id, force=force)
    else:
        analisis = sebelumnya
    bingkai = bingkai_bangunan(bangunan)
    return PaketPemindaian.model_validate(
        {
            "bangunan": bangunan.model_dump(mode="json", exclude_unset=True),
            "analisis": analisis.model_dump(mode="json", exclude_unset=True) if analisis else None,
            "bingkai": {
                **asdict(bingkai),
                "meter_per_piksel": bingkai.meter_per_piksel,
                "tiles": daftar_tile(bingkai),
            },
            "tersimpan": sebelumnya is not None and not force,
            "durasi_detik": round(time.monotonic() - mulai, 3)
            if jalankan and (sebelumnya is None or force)
            else 0,
        }
    )
