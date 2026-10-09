"""Pembanding numerik L3 terhadap pvlib dengan cuaca NASA POWER."""

from __future__ import annotations

import json
import random
from pathlib import Path

import pandas as pd
import pvlib
import pytest

from app.physics import VERSION, energi_tahunan

DIR_FIXTURE = Path(__file__).resolve().parents[3] / "data" / "fixtures" / "cuaca"
BERKAS_CUACA = DIR_FIXTURE / "mentah" / "nasa-power-bengkulu-2024.json"

_RNG = random.Random(20260921)
KASUS = [
    (_RNG.uniform(-8, 5), _RNG.uniform(95, 141), _RNG.uniform(0, 30), _RNG.uniform(0, 359))
    for _ in range(20)
]


@pytest.fixture(scope="session")
def cuaca_tmy() -> pd.DataFrame:
    """Cuaca hourly 2024 NASA POWER dalam kolom yang dipahami ModelChain."""

    payload = json.loads(BERKAS_CUACA.read_text(encoding="utf-8"))
    parameter = payload["properties"]["parameter"]
    index = pd.to_datetime(list(parameter["T2M"]), format="%Y%m%d%H", utc=True).tz_convert(
        "Asia/Jakarta"
    )
    return pd.DataFrame(
        {
            "ghi": list(parameter["ALLSKY_SFC_SW_DWN"].values()),
            "dni": list(parameter["ALLSKY_SFC_SW_DNI"].values()),
            "dhi": list(parameter["ALLSKY_SFC_SW_DIFF"].values()),
            "temp_air": list(parameter["T2M"].values()),
            "wind_speed": list(parameter["WS2M"].values()),
        },
        index=index,
    ).clip(lower=0)


@pytest.mark.parametrize("lat,lon,tilt,azim", KASUS)
def test_deviasi_di_bawah_2_persen(
    lat: float, lon: float, tilt: float, azim: float, cuaca_tmy: pd.DataFrame
) -> None:
    kita = energi_tahunan(
        lat,
        lon,
        tilt,
        azim,
        cuaca_tmy,
        kwp=5.0,
        albedo=0.2,
        gamma_pdc=-0.0035,
        t_noct_c=45.0,
        kotoran=0.97,
        mismatch=0.98,
        kabel_dc=0.98,
        efisiensi_inverter=0.965,
        ketersediaan=0.98,
    )
    lokasi = pvlib.location.Location(lat, lon, tz="Asia/Jakarta")
    posisi = lokasi.get_solarposition(cuaca_tmy.index)
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=azim,
        solar_zenith=posisi["apparent_zenith"],
        solar_azimuth=posisi["azimuth"],
        dni=cuaca_tmy["dni"],
        ghi=cuaca_tmy["ghi"],
        dhi=cuaca_tmy["dhi"],
        dni_extra=pvlib.irradiance.get_extra_radiation(cuaca_tmy.index),
        albedo=0.2,
        model="haydavies",
    )
    # Model NOCT sederhana sesuai spesifikasi, dengan asumsi yang sama seperti API.
    suhu = cuaca_tmy["temp_air"] + poa["poa_global"] * (45.0 - 20.0) / 800.0
    pdc = pvlib.pvsystem.pvwatts_dc(poa["poa_global"], suhu, pdc0=5000, gamma_pdc=-0.0035)
    acuan = pdc.fillna(0).clip(lower=0).sum() * 0.97 * 0.98 * 0.98 * 0.965 * 0.98 / 1000
    deviasi = abs(kita - acuan) / acuan
    assert deviasi < 0.02, (
        f"L3 {VERSION} menyimpang {deviasi:.1%} dari pvlib "
        f"pada lat={lat:.2f} tilt={tilt:.1f} azim={azim:.0f}"
    )
