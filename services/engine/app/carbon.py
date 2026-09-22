"""Mesin deterministik L5 untuk perhitungan dampak karbon PLTS atap.

Menghitung emisi yang dihindari (kotor), jejak emisi terlekat (embodied)
sepanjang siklus hidup modul, emisi bersih terhindar, waktu balik energi
(EPBT), serta padanan kendaraan penumpang berdasar rujukan terverifikasi.
"""

from __future__ import annotations

from dataclasses import dataclass

VERSION = "l5.2026.09.22"

# Faktor emisi terlekat siklus hidup modul fotovoltaik silikon monokristalin
# Sumber: NREL Life Cycle Assessment of Photovoltaics (2021) / IPCC AR6 WG3
# Nilai tipikal untuk iklim tropis dan proses manufaktur modern: 45 gCO2e/kWh
EMBODIED_EMISSION_FACTOR_TCO2_PER_MWH = 0.045

# Emisi tahunan rata-rata mobil penumpang berbahan bakar bensin di Indonesia
# Asumsi: jarak tempuh 12.000 km/tahun, efisiensi bahan bakar 14 km/liter,
# faktor emisi bensin 2,33 kg CO2/liter. Emisi tahunan ≈ 2,00 tCO2e/mobil-tahun.
# Sumber: Panduan Penghitungan Emisi GRK Sektor Transportasi Darat (Kemenhub/KLHK).
FAKTOR_EMISI_MOBIL_PENUMPANG_TON_TAHUN = 2.00


@dataclass(frozen=True)
class FaktorEmisiGrid:
    """Parameter faktor emisi jaringan listrik regional."""

    sistem: str
    """Nama sistem kelistrikan, mis. 'Sumatera' atau 'Jamali'."""

    nilai_tco2_per_mwh: float
    """Faktor emisi jaringan, tCO2e/MWh."""

    tahun: int
    """Tahun publikasi angka resmi."""

    sumber_url: str
    """Tautan rujukan resmi publikasi ESDM/PLN."""

    def __post_init__(self) -> None:
        if self.nilai_tco2_per_mwh <= 0.0:
            raise ValueError("nilai_tco2_per_mwh harus bernilai positif lebih besar dari 0.")
        if not self.sumber_url or not self.sumber_url.strip():
            raise ValueError("sumber_url wajib diisi untuk menjamin keterlacakan sumber angka.")


@dataclass(frozen=True)
class PembandingEmisi:
    """Padanan analogi emisi yang dapat dipertahankan secara ilmiah."""

    teks: str
    """Deskripsi padanan untuk pengguna, mis. 'setara emisi tahunan N mobil penumpang'."""

    dasar: str
    """Rujukan angka pembanding resmi."""

    asumsi: str
    """Asumsi operasional yang dipakai."""


@dataclass(frozen=True)
class HasilKarbon:
    """Hasil kalkulasi dampak karbon kotor, terlekat, dan bersih."""

    co2e_ton_yr: float
    """Emisi jaringan yang dihindari tahun pertama (kotor), tCO2e/tahun."""

    co2e_ton_25yr_kotor: float
    """Total emisi kotor terhindar selama umur sistem dengan degradasi, tCO2e."""

    co2e_ton_terlekat: float
    """Total emisi terlekat (embodied) manufaktur dan rantai pasok modul, tCO2e."""

    co2e_ton_25yr_bersih: float
    """Total emisi bersih terhindar = kotor - terlekat, tCO2e."""

    epbt_tahun: float
    """Waktu balik energi (Energy Payback Time), tahun."""

    ef_dipakai: FaktorEmisiGrid
    """Data faktor emisi jaringan yang digunakan."""

    pembanding: list[PembandingEmisi]
    """Daftar analogi pembanding resmi."""


def hitung_karbon(
    e_ac_kwh: float,
    ef_grid: FaktorEmisiGrid,
    *,
    degradasi_thn: float = 0.006,
    umur_tahun: int = 25,
) -> HasilKarbon:
    """Hitung dampak mitigasi karbon dari pembangkitan energi AC sistem PLTS atap.

    Rumus yang dipakai:
        1. CO2_n = (E_n / 1000) · EF_grid [tCO2e/tahun]
        2. CO2_kotor_25thn = sum_{n=1..umur} CO2_n [tCO2e]
        3. EMB_total = sum_{n=1..umur} (E_n / 1000) · 0,045 [tCO2e]
        4. CO2_bersih = CO2_kotor_25thn - EMB_total [tCO2e]
        5. EPBT = sum(E_n) · 0,045 / (E_ac · EF_grid) [tahun]

    Satuan:
        e_ac_kwh dalam kWh, EF_grid dalam tCO2e/MWh, keluaran dalam tCO2e.
    Sumber:
        Cetak biru PetaSurya §07; NREL LCA PV; Pedoman Teknis MRV Mitigasi Sektor Energi.
    """
    if e_ac_kwh < 0.0:
        raise ValueError("e_ac_kwh tidak boleh bernilai negatif.")
    if umur_tahun <= 0:
        raise ValueError("umur_tahun harus lebih besar dari 0.")

    e_tahunan: list[float] = [
        e_ac_kwh * ((1.0 - degradasi_thn) ** (n - 1)) for n in range(1, umur_tahun + 1)
    ]

    co2_tahunan = [(e / 1000.0) * ef_grid.nilai_tco2_per_mwh for e in e_tahunan]
    co2e_yr1 = co2_tahunan[0] if co2_tahunan else 0.0
    co2e_25yr_kotor = sum(co2_tahunan)

    # Karbon terlekat siklus hidup modul (45 gCO2e/kWh = 0.045 tCO2e/MWh)
    co2e_terlekat = sum((e / 1000.0) * EMBODIED_EMISSION_FACTOR_TCO2_PER_MWH for e in e_tahunan)
    co2e_25yr_bersih = co2e_25yr_kotor - co2e_terlekat

    # Energy Payback Time (EPBT) dalam tahun
    if co2e_yr1 > 0.0:
        epbt_tahun = co2e_terlekat / co2e_yr1
    else:
        epbt_tahun = 0.0

    # Analogi pembanding mobil penumpang
    jumlah_mobil = max(1, int(round(co2e_yr1 / FAKTOR_EMISI_MOBIL_PENUMPANG_TON_TAHUN)))
    pembanding = [
        PembandingEmisi(
            teks=f"setara emisi tahunan sekitar {jumlah_mobil:,} mobil penumpang",
            dasar="Kemenhub/KLHK & IPCC Guideline sektor transportasi",
            asumsi=(
                "Jarak tempuh 12.000 km/tahun, efisiensi BBM 14 km/liter, "
                "emisi 2,00 tCO2e/kendaraan-tahun"
            ),
        )
    ]

    return HasilKarbon(
        co2e_ton_yr=co2e_yr1,
        co2e_ton_25yr_kotor=co2e_25yr_kotor,
        co2e_ton_terlekat=co2e_terlekat,
        co2e_ton_25yr_bersih=co2e_25yr_bersih,
        epbt_tahun=epbt_tahun,
        ef_dipakai=ef_grid,
        pembanding=pembanding,
    )
