"""Pengujian deterministik mesin ekonomi L4 PetaSurya."""

import pytest

from app.economics import VERSION, HasilEkonomi, hitung_ekonomi, irr_bisection


def test_versi_l4():
    """Pastikan VERSION L4 berformat standar sesuai protokol."""
    assert VERSION.startswith("l4.")


def test_ekonomi_kafe_positif():
    """Uji skenario tipikal UMKM berbeban siang dengan pengembalian investasi layak.

    Masukan:
    - kwp = 8.8 kWp
    - e_ac_kwh = 12.300 kWh/tahun
    - scr = 0.75 (kafe / warung siang)
    - tarif_rp_kwh = 1444.70 Rp/kWh
    - biaya_per_kwp = 14.000.000 Rp/kWp
    """
    hasil = hitung_ekonomi(
        kwp=8.8,
        e_ac_kwh=12_300.0,
        scr=0.75,
        tarif_rp_kwh=1444.70,
        biaya_per_kwp=14_000_000.0,
        diskonto=0.09,
        faktor_ekspor=0.0,
    )
    assert isinstance(hasil, HasilEkonomi)
    assert hasil.capex_idr == 8.8 * 14_000_000.0  # 123.200.000 Rp

    # Penghematan tahun 1: 12.300 * 0.75 * 1444.70 = 13.329.357,5 Rp
    expected_savings_1 = 12_300.0 * 0.75 * 1444.70
    assert abs(hasil.savings_idr_yr1 - expected_savings_1) < 1.0

    # Payback harus masuk akal untuk kafe (~10-11 tahun)
    assert hasil.payback_years is not None
    assert 10.0 <= hasil.payback_years <= 11.5

    # IRR harus konvergen dan positif
    assert hasil.irr is not None
    assert 0.05 <= hasil.irr <= 0.12

    # Verifikasi bahwa IRR benar-benar membuat NPV mendekati 0 (< Rp 1.000)
    capex = hasil.capex_idr
    npv_at_irr = -capex + sum(
        k / ((1.0 + hasil.irr) ** (n + 1)) for n, k in enumerate(hasil.arus_kas)
    )
    assert abs(npv_at_irr) < 1_000.0

    # LCOE harus berada di kisaran wajar (di bawah atau sekitar tarif listrik)
    assert 800.0 <= hasil.lcoe_idr_kwh <= 1_600.0


def test_ekonomi_rumah_tidak_balik_modal():
    """Uji kasus jujur: rumah tangga dengan SCR rendah dan biaya tinggi tidak balik modal.

    Fitur kejujuran (§06): jika kumulatif arus kas selama masa pakai (25 tahun)
    tidak mencapai CAPEX, payback_years harus None, bukan angka palsu > 25 tahun.
    """
    hasil = hitung_ekonomi(
        kwp=3.3,
        e_ac_kwh=2_500.0,  # Iradiansi/produksi rendah
        scr=0.30,  # Rumah kosong siang hari
        tarif_rp_kwh=1444.70,
        biaya_per_kwp=17_000_000.0,  # Biaya skala kecil tinggi
        diskonto=0.09,
        faktor_ekspor=0.0,  # Net-metering ditiadakan
    )
    assert hasil.payback_years is None
    assert hasil.npv_idr < 0.0
    # Arus kas 25 tahun tidak mampu menutupi CAPEX
    assert sum(hasil.arus_kas) < hasil.capex_idr


def test_ekonomi_ekspor_skema_lama_vs_baru():
    """Perbandingan skema ekspor Permen ESDM 2/2024 (0%) vs skema lama (65%)."""
    asumsi_dasar = dict(
        kwp=5.0,
        e_ac_kwh=7_000.0,
        scr=0.50,
        tarif_rp_kwh=1444.70,
        biaya_per_kwp=14_500_000.0,
        diskonto=0.09,
    )
    hasil_tanpa_ekspor = hitung_ekonomi(**asumsi_dasar, faktor_ekspor=0.0)
    hasil_ekspor_65 = hitung_ekonomi(**asumsi_dasar, faktor_ekspor=0.65)

    # Skema 65% menghasilkan penghematan tahun 1 lebih tinggi
    assert hasil_ekspor_65.savings_idr_yr1 > hasil_tanpa_ekspor.savings_idr_yr1
    assert hasil_ekspor_65.npv_idr > hasil_tanpa_ekspor.npv_idr

    # Payback skema 65% lebih singkat
    assert hasil_ekspor_65.payback_years is not None
    assert hasil_tanpa_ekspor.payback_years is not None
    assert hasil_ekspor_65.payback_years < hasil_tanpa_ekspor.payback_years


def test_irr_bisection_akar_tidak_ada():
    """Uji bisection mengembalikan None jika semua arus kas negatif."""
    kas_negatif = [-1_000_000.0] * 25
    akar = irr_bisection(kas_negatif, capex=10_000_000.0)
    assert akar is None


def test_validasi_masukan_ekonomi():
    """Uji penolakan nilai masukan yang tidak fisik / di luar batas."""
    with pytest.raises(ValueError, match="kwp"):
        hitung_ekonomi(
            kwp=-1.0,
            e_ac_kwh=5000,
            scr=0.5,
            tarif_rp_kwh=1444.7,
            biaya_per_kwp=14_000_000,
        )

    with pytest.raises(ValueError, match="scr"):
        hitung_ekonomi(
            kwp=5.0,
            e_ac_kwh=5000,
            scr=1.5,
            tarif_rp_kwh=1444.7,
            biaya_per_kwp=14_000_000,
        )

    with pytest.raises(ValueError, match="tarif"):
        hitung_ekonomi(
            kwp=5.0,
            e_ac_kwh=5000,
            scr=0.5,
            tarif_rp_kwh=-100,
            biaya_per_kwp=14_000_000,
        )
