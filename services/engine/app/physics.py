"""Fungsi deterministik L3 untuk transposisi iradiansi dan energi tahunan."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
import pvlib

VERSION = "l3.2026.09.21"


@dataclass(frozen=True)
class POAResult:
    """Komponen iradiansi bidang modul, semuanya dalam W/m²."""

    direct: Any
    diffuse: Any
    ground: Any

    @property
    def total(self) -> Any:
        """Jumlah POA langsung, baur, dan pantul tanah dalam W/m²."""

        return self.direct + self.diffuse + self.ground


def _cosd(value: Any) -> Any:
    """Hitung cosinus untuk sudut masukan dalam derajat."""

    return np.cos(np.deg2rad(value))


def _sind(value: Any) -> Any:
    """Hitung sinus untuk sudut masukan dalam derajat."""

    return np.sin(np.deg2rad(value))


def _non_negative(value: Any) -> Any:
    """Ganti nilai iradiansi tak valid atau negatif dengan nol."""

    if isinstance(value, pd.Series):
        return value.astype(float).replace([np.inf, -np.inf], np.nan).fillna(0).clip(lower=0)
    return np.maximum(np.nan_to_num(np.asarray(value, dtype=float), nan=0.0), 0.0)


def _dni_extra_for(index: pd.Index | None) -> Any:
    """Ambil irradiansi ekstraterestrial harian dari fungsi referensi pvlib."""

    if isinstance(index, pd.DatetimeIndex):
        return pd.Series(
            pvlib.irradiance.get_extra_radiation(index.dayofyear),
            index=index,
        )
    return pvlib.irradiance.get_extra_radiation(1)


def hitung_poa(
    ghi: Any,
    dni: Any,
    dhi: Any,
    solar_zenith: Any,
    solar_azimuth: Any,
    tilt: float,
    azimuth: float,
    *,
    albedo: float = 0.2,
    dni_extra: Any | None = None,
) -> POAResult:
    """Transposisikan GHI/DNI/DHI menjadi POA pada bidang modul.

    Rumus yang dipakai adalah ``POA = DNI·max(cos(AOI), 0) + POA_baur +
    GHI·albedo·(1-cos(tilt))/2``. Komponen baur menggunakan anisotropi
    Hay-Davies melalui pvlib, yang merupakan model transposisi bawaan
    pembanding L3. Semua masukan dan keluaran iradiansi bersatuan W/m²;
    sudut bersatuan derajat, azimut dihitung dari utara searah jarum jam.
    Sumber rumus: cetak biru PetaSurya §05; implementasi acuan:
    ``pvlib.irradiance.haydavies``.
    """

    index = solar_zenith.index if isinstance(solar_zenith, pd.Series) else None
    if dni_extra is None:
        dni_extra = _dni_extra_for(index)

    cos_aoi = _cosd(solar_zenith) * _cosd(tilt) + _sind(solar_zenith) * _sind(tilt) * _cosd(
        solar_azimuth - azimuth
    )
    direct = _non_negative(dni) * np.maximum(cos_aoi, 0.0)

    diffuse = pvlib.irradiance.haydavies(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        dhi=_non_negative(dhi),
        dni=_non_negative(dni),
        dni_extra=dni_extra,
        solar_zenith=solar_zenith,
        solar_azimuth=solar_azimuth,
    )
    diffuse = _non_negative(diffuse)
    ground = _non_negative(ghi) * float(albedo) * (1.0 - _cosd(tilt)) / 2.0

    return POAResult(direct=direct, diffuse=diffuse, ground=ground)


def suhu_sel_noct(poa_wm2: Any, temp_air_c: Any, *, t_noct_c: float) -> Any:
    """Hitung suhu sel dengan model NOCT dalam °C.

    Rumusnya ``T_sel = T_amb + (POA/1000)·(T_NOCT−20)/0,8``. POA bersatuan
    W/m², suhu masukan dan keluaran °C, serta ``t_noct_c`` adalah °C. Nilai
    NOCT wajib diberikan karena belum ada lembar data modul produksi di
    registri sumber. Sumber rumus: cetak biru PetaSurya §05 butir 2.
    """

    return temp_air_c + (poa_wm2 / 1000.0) * (float(t_noct_c) - 20.0) / 0.8


def daya_dc(
    poa_wm2: Any,
    temp_sel_c: Any,
    *,
    kwp: float,
    gamma_pdc: float,
    temp_ref_c: float = 25.0,
) -> Any:
    """Hitung daya DC PVWatts dari POA dan suhu sel.

    Rumusnya ``P_DC = P_STC·(POA/1000)·[1+γ_P·(T_sel−T_ref)]``; POA
    bersatuan W/m², ``kwp`` menghasilkan daya W, suhu °C, dan ``gamma_pdc``
    bersatuan 1/°C. ``kwp`` dan ``gamma_pdc`` wajib diberikan agar tidak ada
    spesifikasi modul rekaan. Sumber rumus dan acuan numerik:
    cetak biru PetaSurya §05 butir 3 dan ``pvlib.pvsystem.pvwatts_dc``.
    """

    if kwp <= 0:
        raise ValueError("kwp harus lebih besar dari nol")
    return pvlib.pvsystem.pvwatts_dc(
        effective_irradiance=poa_wm2,
        temp_cell=temp_sel_c,
        pdc0=kwp * 1000.0,
        gamma_pdc=gamma_pdc,
        temp_ref=temp_ref_c,
    )


def _periksa_faktor(nama: str, nilai: float) -> float:
    """Validasi faktor derate sebagai fraksi antara nol dan satu."""

    faktor = float(nilai)
    if not 0.0 <= faktor <= 1.0:
        raise ValueError(f"{nama} harus berada di antara 0 dan 1")
    return faktor


def derate_berurutan(
    daya_w: Any,
    *,
    kotoran: float,
    mismatch: float,
    kabel_dc: float,
    efisiensi_inverter: float,
    ketersediaan: float,
) -> Any:
    """Kalikan rantai derate listrik dan operasional dalam satuan daya W.

    Rumusnya ``P_out = P_in·kotoran·mismatch·kabel_dc·efisiensi_inverter·ketersediaan``.
    Semua faktor adalah fraksi tanpa satuan dan wajib diberikan; ``daya_w``
    dan hasilnya bersatuan W. Sumber urutan faktor: cetak biru PetaSurya §05
    butir 3. Nilai faktor modul produksi belum ditetapkan.
    """

    faktor = (
        _periksa_faktor("kotoran", kotoran)
        * _periksa_faktor("mismatch", mismatch)
        * _periksa_faktor("kabel_dc", kabel_dc)
        * _periksa_faktor("efisiensi_inverter", efisiensi_inverter)
        * _periksa_faktor("ketersediaan", ketersediaan)
    )
    return daya_w * faktor


def energi_tahunan(
    lat: float,
    lon: float,
    tilt: float,
    azimuth: float,
    cuaca_tmy: pd.DataFrame,
    *,
    kwp: float,
    albedo: float,
    gamma_pdc: float,
) -> float:
    """Hitung energi AC tahunan dari cuaca hourly.

    POA dihitung dari transposisi di atas, suhu sel memakai parameter SAPM
    ``open_rack_glass_glass`` pvlib, daya DC memakai ``pvwatts_dc``, dan daya
    AC memakai ``inverter.pvwatts``. Masukan cuaca wajib memiliki kolom
    ``ghi``, ``dni``, ``dhi`` (W/m²), ``temp_air`` (°C), dan ``wind_speed``
    (m/s) dengan indeks waktu berzona. Keluaran adalah kWh/tahun. Sumber
    persamaan dan parameter pembanding: cetak biru PetaSurya §05 dan pvlib.

    Nilai ``albedo`` dan ``gamma_pdc`` wajib diberikan oleh pemanggil; belum
    ada default produksi sebelum lembar data modul dan asumsi permukaan
    dicatat di registri sumber.
    """

    if kwp <= 0:
        raise ValueError("kwp harus lebih besar dari nol")
    kolom_wajib = {"ghi", "dni", "dhi", "temp_air", "wind_speed"}
    kurang = kolom_wajib.difference(cuaca_tmy.columns)
    if kurang:
        raise ValueError(f"kolom cuaca kurang: {', '.join(sorted(kurang))}")
    if not isinstance(cuaca_tmy.index, pd.DatetimeIndex):
        raise TypeError("indeks cuaca harus berupa DatetimeIndex")
    if cuaca_tmy.index.tz is None:
        raise ValueError("indeks cuaca harus memiliki zona waktu")

    lokasi = pvlib.location.Location(lat, lon, tz=str(cuaca_tmy.index.tz))
    posisi = lokasi.get_solarposition(cuaca_tmy.index)
    poa = hitung_poa(
        ghi=cuaca_tmy["ghi"],
        dni=cuaca_tmy["dni"],
        dhi=cuaca_tmy["dhi"],
        solar_zenith=posisi["apparent_zenith"],
        solar_azimuth=posisi["azimuth"],
        tilt=tilt,
        azimuth=azimuth,
        albedo=albedo,
    )
    parameter_suhu = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"]["open_rack_glass_glass"]
    suhu_sel = pvlib.temperature.sapm_cell(
        poa_global=poa.total,
        temp_air=cuaca_tmy["temp_air"],
        wind_speed=cuaca_tmy["wind_speed"],
        **parameter_suhu,
    )
    pdc = daya_dc(poa.total, suhu_sel, kwp=kwp, gamma_pdc=gamma_pdc)
    pac = pvlib.inverter.pvwatts(pdc=pdc, pdc0=kwp * 1000.0)
    return float(pd.Series(pac, index=cuaca_tmy.index).fillna(0).sum() / 1000.0)
