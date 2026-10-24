"""L5: faktor emisi jaringan listrik menurut lokasi.

Sumber: Ditjen Ketenagalistrikan ESDM, Faktor Emisi GRK Sistem Ketenagalistrikan
Tahun 2019 (154 sistem). Nilai yang dipakai adalah kolom 10 dokumen, CM ex-ante
dengan bobot OM/BM 0,75/0,25 (kolom untuk PLTB dan PLTS), satuan tCO2/MWh,
komponen CO2 saja. Tabel dan pemetaan provinsi ke sistem ada di
data/fixtures/emisi/grid-2019.json; registri sumber: ef_grid_gatrik_2019.

Pemetaan titik → provinsi memakai batas geoBoundaries (app.wilayah_id), lalu
provinsi → sistem memakai kolom Provinsi dokumen. Status:
- terverifikasi: provinsi tercantum pada sistem antarprovinsi atau pada satu-satunya grid;
- perkiraan: dokumen tidak menyebut sistem utama; dipilih grid dengan lebih dari
  separuh pembangkit provinsi;
- belum_diverifikasi: tanpa faktor (rentang nilai antargrid disertakan bila ada).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from app.contracts import InfoWilayah
from app.wilayah_id import provinsi_di_titik

VERSION = "l5.2026.10.25"

ROOT = Path(__file__).resolve().parents[3]
BERKAS = ROOT / "data/fixtures/emisi/grid-2019.json"
METODE = "CM ex-ante, bobot OM 0,75/BM 0,25 (kolom PLTS); komponen CO2 saja"

Status = Literal["terverifikasi", "perkiraan", "belum_diverifikasi"]


@dataclass(frozen=True)
class FaktorEmisiWilayah:
    provinsi_iso: str  # ISO 3166-2, mis. "ID-BE"
    provinsi_nama: str
    sistem: str | None  # nama grid pada dokumen, mis. "Sumatera"
    sistem_no: int | None  # nomor baris dokumen
    ef_tco2_mwh: float | None  # None bila belum diverifikasi
    tahun_data: int
    sumber_id: str
    sumber_url: str
    status: Status
    rentang_tco2_mwh: tuple[float, float] | None  # nilai terendah dan tertinggi antargrid provinsi
    catatan: str

    @property
    def pendekatan(self) -> bool:
        return self.status == "perkiraan"


@lru_cache(maxsize=1)
def _data() -> dict:
    return json.loads(BERKAS.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _sistem() -> dict[int, dict]:
    return {s["no"]: s for s in _data()["sistem"]}


@lru_cache(maxsize=1)
def _provinsi() -> dict[str, dict]:
    return {p["iso"]: p for p in _data()["pemetaan_provinsi"]}


def faktor_emisi_provinsi(iso: str) -> FaktorEmisiWilayah:
    """Faktor emisi bawaan provinsi menurut kode ISO 3166-2."""
    p = _provinsi()[iso]
    sumber = _data()["_sumber"]
    sistem = _sistem()[p["sistem_no"]] if p["sistem_no"] is not None else None
    rentang = tuple(p["rentang"]) if p["rentang"] else None
    return FaktorEmisiWilayah(
        provinsi_iso=iso,
        provinsi_nama=p["nama"],
        sistem=sistem["nama"] if sistem else None,
        sistem_no=p["sistem_no"],
        ef_tco2_mwh=sistem["cm_ex_ante_075"] if sistem else None,
        tahun_data=2019,
        sumber_id=sumber["id"],
        sumber_url=sumber["url"],
        status=p["status"],
        rentang_tco2_mwh=rentang,
        catatan=p["dasar"],
    )


def faktor_emisi_wilayah(lat: float, lon: float) -> FaktorEmisiWilayah | None:
    """Faktor emisi sistem listrik di titik; None bila titik di luar Indonesia."""
    provinsi = provinsi_di_titik(lat, lon)
    if provinsi is None:
        return None
    return faktor_emisi_provinsi(provinsi.iso)


def info_wilayah(lat: float, lon: float) -> InfoWilayah | None:
    """Bentuk kontrak GET /api/v1/wilayah; None bila titik di luar Indonesia."""
    f = faktor_emisi_wilayah(lat, lon)
    if f is None:
        return None
    return InfoWilayah(
        provinsi_iso=f.provinsi_iso,
        provinsi_nama=f.provinsi_nama,
        sistem_grid=f.sistem,
        ef_grid_tco2_mwh=f.ef_tco2_mwh,
        rentang_tco2_mwh=list(f.rentang_tco2_mwh) if f.rentang_tco2_mwh else None,
        tahun_data=f.tahun_data,
        metode=METODE,
        status=f.status,
        catatan=f.catatan,
        sumber_id=f.sumber_id,
        sumber_url=f.sumber_url,
    )
