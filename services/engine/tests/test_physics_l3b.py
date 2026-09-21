"""Tes L3b untuk suhu sel, daya DC, dan derate berurutan."""

from __future__ import annotations

import pytest

from app.physics import VERSION, daya_dc, derate_berurutan, suhu_sel_noct


def test_suhu_sel_noct_memakai_parameter_wajib() -> None:
    # Nilai contoh cetak biru, bukan default produksi.
    assert suhu_sel_noct(950.0, 32.0, t_noct_c=45.0) == pytest.approx(61.6875)


def test_daya_dc_memakai_gamma_parameter_wajib() -> None:
    # γ_P contoh tes dari cetak biru, bukan lembar data modul produksi.
    hasil = daya_dc(950.0, 61.6875, kwp=5.0, gamma_pdc=-0.0035)
    assert hasil == pytest.approx(5000.0 * 0.95 * (1 - 0.0035 * 36.6875))


def test_derate_berurutan_mengalikan_semua_faktor() -> None:
    hasil = derate_berurutan(
        5000.0,
        kotoran=0.97,
        mismatch=0.98,
        kabel_dc=0.98,
        efisiensi_inverter=0.965,
        ketersediaan=0.98,
    )
    assert hasil == pytest.approx(5000.0 * 0.97 * 0.98 * 0.98 * 0.965 * 0.98)


def test_version_l3_naik_dari_transposisi() -> None:
    assert VERSION == "l3.2026.09.21"
