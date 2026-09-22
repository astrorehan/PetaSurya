"""Mesin deterministik L4 untuk analisis keekonomian PLTS atap.

Menghitung indikator finansial: CAPEX, penghematan tahunan, waktu balik modal
(payback), nilai kini bersih (NPV), tingkat pengembalian internal (IRR), dan
biaya energi tersamaratakan (LCOE).
"""

from __future__ import annotations

from dataclasses import dataclass

VERSION = "l4.2026.09.22"


@dataclass(frozen=True)
class HasilEkonomi:
    """Hasil kalkulasi keekonomian sistem PLTS atap."""

    capex_idr: float
    """Total investasi awal sistem, Rp."""

    savings_idr_yr1: float
    """Penghematan tagihan listrik tahun pertama, Rp/tahun."""

    payback_years: float | None
    """Waktu balik modal dengan interpolasi linier, tahun.

    Bernilai None bila arus kas tidak pernah menutup investasi dalam umur
    sistem.
    """

    npv_idr: float
    """Nilai kini bersih (Net Present Value) pada tingkat diskonto r, Rp."""

    irr: float | None
    """Internal Rate of Return (fraksi tahunan).

    Bernilai None bila tidak ada akar real dalam rentang pencarian [-0.99, 1.0].
    """

    lcoe_idr_kwh: float
    """Levelized Cost of Electricity, Rp/kWh."""

    arus_kas: list[float]
    """Arus kas bersih tahunan (Savings_n - OPEX_n) untuk n = 1..umur_tahun, Rp."""


def irr_bisection(
    kas: list[float],
    capex: float,
    lo: float = -0.99,
    hi: float = 1.0,
    iterasi: int = 60,
) -> float | None:
    """Hitung IRR menggunakan metode bagi dua (bisection).

    Bisection dipilih karena deterministik dan dijamin stabil tanpa risiko
    loncatan divergen (seperti pada Newton-Raphson saat kurva NPV datar).

    Rumus:
        r sehingga NPV(r) = -CAPEX + sum_{n=1..N} (Kas_n / (1 + r)^n) = 0
    Satuan:
        r dalam fraksi desimal (mis. 0.08 = 8%/tahun).
    Sumber:
        Cetak biru PetaSurya §06; standar evaluasi kelayakan finansial proyek energi.
    """

    def npv_fn(r: float) -> float:
        return -capex + sum(k / ((1.0 + r) ** (n + 1)) for n, k in enumerate(kas))

    f_lo = npv_fn(lo)
    f_hi = npv_fn(hi)

    if f_lo * f_hi > 0:
        # Tidak ada perpotongan nol pada rentang yang diuji
        return None

    for _ in range(iterasi):
        mid = (lo + hi) / 2.0
        f_mid = npv_fn(mid)
        if f_lo * f_mid <= 0:
            hi = mid
            f_hi = f_mid
        else:
            lo = mid
            f_lo = f_mid

    return (lo + hi) / 2.0


def hitung_ekonomi(
    kwp: float,
    e_ac_kwh: float,
    scr: float,
    tarif_rp_kwh: float,
    biaya_per_kwp: float,
    *,
    opex_frac: float = 0.01,
    diskonto: float = 0.09,
    eskalasi_tarif: float = 0.0,
    degradasi_thn: float = 0.006,
    umur_tahun: int = 25,
    faktor_ekspor: float = 0.0,
) -> HasilEkonomi:
    """Hitung keekonomian lengkap PLTS atap untuk satu skenario pemasangan.

    Rumus utama:
        1. CAPEX = kwp · biaya_per_kwp [Rp]
        2. Savings_1 = E_ac · (SCR + (1 - SCR)·faktor_ekspor) · tarif [Rp/tahun]
        3. E_n = E_ac · (1 - degradasi_thn)^(n-1) [kWh]
        4. tarif_n = tarif · (1 + eskalasi_tarif)^(n-1) [Rp/kWh]
        5. Savings_n = E_n · (SCR + (1 - SCR)·faktor_ekspor) · tarif_n [Rp]
        6. OPEX_n = CAPEX · opex_frac [Rp]
        7. Kas_n = Savings_n - OPEX_n [Rp]
        8. Payback = tahun perpotongan kumulatif Kas_n terhadap CAPEX [tahun]
        9. NPV = -CAPEX + sum_{n=1..N} (Kas_n / (1 + diskonto)^n) [Rp]
        10. LCOE = (CAPEX + sum OPEX_n/(1+diskonto)^n) / sum (E_n/(1+diskonto)^n) [Rp/kWh]

    Sumber:
        Cetak biru PetaSurya §06; Permen ESDM 2/2024 untuk skema ekspor tanpa net-metering.
    """
    if kwp <= 0.0:
        raise ValueError("kwp harus bernilai positif.")
    if e_ac_kwh < 0.0:
        raise ValueError("e_ac_kwh tidak boleh negatif.")
    if not (0.0 <= scr <= 1.0):
        raise ValueError("scr harus berada dalam rentang 0.0 hingga 1.0.")
    if tarif_rp_kwh <= 0.0:
        raise ValueError("tarif_rp_kwh harus bernilai positif.")
    if biaya_per_kwp <= 0.0:
        raise ValueError("biaya_per_kwp harus bernilai positif.")
    if not (0.0 <= opex_frac <= 0.1):
        raise ValueError("opex_frac harus berada dalam rentang 0.0 hingga 0.1.")
    if not (0.0 <= diskonto <= 0.5):
        raise ValueError("diskonto harus berada dalam rentang wajar (0.0 hingga 0.5).")
    if not (0.0 <= faktor_ekspor <= 1.0):
        raise ValueError("faktor_ekspor harus berada dalam rentang 0.0 hingga 1.0.")
    if umur_tahun <= 0:
        raise ValueError("umur_tahun harus lebih besar dari 0.")

    capex = kwp * biaya_per_kwp

    arus_kas: list[float] = []
    e_tahunan: list[float] = []
    opex_tahunan: list[float] = []

    fraksi_tarif_efektif = scr + (1.0 - scr) * faktor_ekspor

    for n in range(1, umur_tahun + 1):
        en = e_ac_kwh * ((1.0 - degradasi_thn) ** (n - 1))
        e_tahunan.append(en)

        tarif_n = tarif_rp_kwh * ((1.0 + eskalasi_tarif) ** (n - 1))
        savings_n = en * fraksi_tarif_efektif * tarif_n
        opex_n = capex * opex_frac
        opex_tahunan.append(opex_n)

        arus_kas.append(savings_n - opex_n)

    savings_yr1 = e_ac_kwh * fraksi_tarif_efektif * tarif_rp_kwh

    # Payback dengan interpolasi linier kumulatif
    payback_years: float | None = None
    kumulatif = 0.0
    for idx, kas in enumerate(arus_kas):
        if kas > 0.0 and kumulatif + kas >= capex:
            sisa_capex = capex - kumulatif
            fraksi_tahun = sisa_capex / kas
            payback_years = float(idx) + fraksi_tahun
            break
        kumulatif += kas

    # NPV
    npv = -capex + sum(kas / ((1.0 + diskonto) ** (n + 1)) for n, kas in enumerate(arus_kas))

    # IRR
    irr = irr_bisection(arus_kas, capex)

    # LCOE (Rp/kWh)
    pembilang_lcoe = capex + sum(
        op / ((1.0 + diskonto) ** (n + 1)) for n, op in enumerate(opex_tahunan)
    )
    penyebut_lcoe = sum(e / ((1.0 + diskonto) ** (n + 1)) for n, e in enumerate(e_tahunan))
    lcoe = pembilang_lcoe / penyebut_lcoe if penyebut_lcoe > 0.0 else 0.0

    return HasilEkonomi(
        capex_idr=capex,
        savings_idr_yr1=savings_yr1,
        payback_years=payback_years,
        npv_idr=npv,
        irr=irr,
        lcoe_idr_kwh=lcoe,
        arus_kas=arus_kas,
    )
