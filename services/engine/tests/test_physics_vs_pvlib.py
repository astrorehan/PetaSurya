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
    )
    lokasi = pvlib.location.Location(lat, lon, tz="Asia/Jakarta")
    sistem = pvlib.pvsystem.PVSystem(
        surface_tilt=tilt,
        surface_azimuth=azim,
        module_parameters={"pdc0": 5000, "gamma_pdc": -0.0035},
        inverter_parameters={"pdc0": 5000},
        temperature_model_parameters=pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"][
            "open_rack_glass_glass"
        ],
    )
    mc = pvlib.modelchain.ModelChain(sistem, lokasi, aoi_model="physical", spectral_model="no_loss")
    mc.run_model(cuaca_tmy)
    acuan = mc.results.ac.sum() / 1000
    deviasi = abs(kita - acuan) / acuan
    assert deviasi < 0.02, (
        f"L3 {VERSION} menyimpang {deviasi:.1%} dari pvlib "
        f"pada lat={lat:.2f} tilt={tilt:.1f} azim={azim:.0f}"
    )
