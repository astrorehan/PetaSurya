"""Pengujian deterministik mesin karbon L5 PetaSurya."""

import pytest

from app.carbon import (
    VERSION,
    FaktorEmisiGrid,
    HasilKarbon,
    hitung_karbon,
)


def test_versi_l5():
    """Pastikan VERSION L5 berformat standar sesuai protokol."""
    assert VERSION.startswith("l5.")


def test_karbon_sumatera_valid():
    """Uji perhitungan emisi kotor, terlekat, bersih, dan EPBT untuk sistem Sumatera."""
    ef = FaktorEmisiGrid(
        sistem="Sumatera",
        nilai_tco2_per_mwh=0.76,
        tahun=2023,
        sumber_url="https://gatrik.esdm.go.id/faktor-emisi-2023",
    )
    hasil = hitung_karbon(
        e_ac_kwh=19_840.0,
        ef_grid=ef,
        degradasi_thn=0.006,
        umur_tahun=25,
    )
    assert isinstance(hasil, HasilKarbon)

    # Emisi kotor tahun 1: 19.840 kWh / 1000 * 0.76 tCO2/MWh = 15.0784 tCO2e
    expected_yr1 = (19_840.0 / 1000.0) * 0.76
    assert abs(hasil.co2e_ton_yr - expected_yr1) < 0.01

    # Emisi kotor 25 tahun harus lebih besar dari tahun 1,
    # tetapi kurang dari 25 * tahun 1 karena degradasi tahunan
    assert hasil.co2e_ton_yr < hasil.co2e_ton_25yr_kotor < 25.0 * hasil.co2e_ton_yr

    # Emisi terlekat harus positif (~45 gCO2e/kWh)
    assert hasil.co2e_ton_terlekat > 0.0
    assert hasil.co2e_ton_terlekat < hasil.co2e_ton_25yr_kotor

    # Emisi bersih = kotor - terlekat
    assert (
        abs(hasil.co2e_ton_25yr_bersih - (hasil.co2e_ton_25yr_kotor - hasil.co2e_ton_terlekat))
        < 1e-4
    )

    # EPBT harus berada di rentang 1 hingga 2 tahun untuk iklim tropis
    assert 1.0 <= hasil.epbt_tahun <= 2.0

    # Pembanding kendaraan harus ada dan memiliki teks serta rujukan sumber
    assert len(hasil.pembanding) >= 1
    p0 = hasil.pembanding[0]
    assert "mobil penumpang" in p0.teks
    assert "12.000 km/tahun" in p0.asumsi


def test_penolakan_faktor_emisi_tanpa_url():
    """Sesuai §07 cetak biru: angka eksternal WAJIB memiliki URL sumber valid."""
    with pytest.raises(ValueError, match="sumber_url"):
        FaktorEmisiGrid(
            sistem="Sumatera",
            nilai_tco2_per_mwh=0.76,
            tahun=2023,
            sumber_url="",
        )


def test_penolakan_faktor_emisi_non_positif():
    """Faktor emisi jaringan harus lebih besar dari 0."""
    with pytest.raises(ValueError, match="nilai_tco2_per_mwh"):
        FaktorEmisiGrid(
            sistem="Sumatera",
            nilai_tco2_per_mwh=-0.5,
            tahun=2023,
            sumber_url="https://contoh.id",
        )


def test_penolakan_energi_negatif():
    """Energi AC tidak boleh bernilai negatif."""
    ef = FaktorEmisiGrid(
        sistem="Sumatera",
        nilai_tco2_per_mwh=0.76,
        tahun=2023,
        sumber_url="https://gatrik.esdm.go.id",
    )
    with pytest.raises(ValueError, match="e_ac_kwh"):
        hitung_karbon(e_ac_kwh=-1000.0, ef_grid=ef)
