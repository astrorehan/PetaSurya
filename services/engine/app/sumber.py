"""Rujukan angka eksternal yang cocok dengan masukan skenario."""

from functools import lru_cache
from pathlib import Path

import yaml

from app.carbon import FaktorEmisiGrid

ROOT = Path(__file__).resolve().parents[3]
LABEL_TARIF = (
    "Tarif dasar Permen ESDM 7/2024, tidak naik sejak 2024 "
    "(rujukan kebijakan hingga September 2026)"
)


@lru_cache(maxsize=1)
def registri() -> dict:
    """Baca registri bersama mesin dan web tanpa konstanta nominal terpisah."""
    data = yaml.safe_load((ROOT / "data/sources/sumber.yaml").read_text(encoding="utf-8"))
    return {s["id"]: s for s in data["sumber"]}


def modul_demo() -> dict:
    """Parameter NOCT Jinko F5 dalam satuan kontrak mesin."""
    data = registri()["modul_jinko_jkm550m_72hl4_f5"]["nilai"]
    return {k: data[k] for k in ("wp", "panjang_m", "lebar_m", "gamma_p", "t_noct")}


def tarif_dasar(golongan: str, daya: int) -> float | None:
    """Tarif datar demo; pelanggan subsidi reguler bertingkat tidak disederhanakan."""
    nilai = registri()["tarif_pln_permen_7_2024"]["nilai"]
    if golongan == "R-1/TR" and daya in (1300, 2200):
        return nilai[f"r1_{daya}va_rp_kwh"]
    if golongan == "B-1/TR" and daya == 1300:
        return nilai["b1_1300va_rp_kwh"]
    if golongan == "B-1/TR" and 2200 <= daya <= 5500:
        return nilai["b1_2200_5500va_rp_kwh"]
    if golongan == "B-2/TR" and 6600 <= daya <= 200000:
        return nilai["b2_6600va_200kva_rp_kwh"]
    return None


def rujukan_tarif(golongan: str, daya: int, nilai: float) -> str:
    """Hindari klaim tarif resmi saat nominal atau golongan sudah diubah."""
    if nilai == tarif_dasar(golongan, daya):
        return LABEL_TARIF
    return "Tarif masukan pengguna; belum cocok dengan tarif dasar dalam registri"


def rujukan_biaya(nilai: float) -> str:
    """Titik tengah biaya historis adalah asumsi, bukan penawaran pemasok."""
    biaya = registri()["biaya_per_kwp_terpasang"]["nilai"]
    if nilai == biaya["acuan_demo"]:
        return "Biaya acuan IESR 2020: titik tengah Rp14–15 juta/kWp; bukan penawaran 2026"
    return "Biaya masukan pengguna; sumber nominal belum diverifikasi"


def faktor_emisi(nilai: float) -> tuple[FaktorEmisiGrid, str]:
    """Pilih sumber CM ex-ante surya; nilai lain tetap masukan pengguna."""
    sumber = registri()["ef_grid_sumatera_2019"]
    cocok = nilai == sumber["nilai"]["cm_ex_ante_om_075_bm_025"]
    faktor = FaktorEmisiGrid(
        sistem="Sumatera",
        nilai_tco2_per_mwh=nilai,
        tahun=sumber["tahun"] if cocok else 0,
        sumber_url=sumber["url"] if cocok else "https://petasurya.id/metodologi",
    )
    rujukan = (
        "Gatrik, Sumatera 2019, CM ex-ante OM/BM 0,75/0,25; komponen CO2 saja"
        if cocok
        else "Faktor emisi masukan pengguna; tahun dan metode belum diverifikasi"
    )
    return faktor, rujukan
