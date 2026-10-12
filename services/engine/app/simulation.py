"""Modul orkestrasi simulasi PLTS atap: L3 fisika + L4 ekonomi + L5 karbon."""

from __future__ import annotations

import json
import uuid
from functools import lru_cache
from pathlib import Path

import pandas as pd
import pvlib
from pydantic import BaseModel, ConfigDict, Field

from app.carbon import (
    VERSION as CARBON_VERSION,
)
from app.carbon import (
    hitung_karbon,
)
from app.contracts import (
    AnalisisAtap,
    AsumsiSimulasi,
    DerateSimulasi,
    HasilSimulasi,
    JejakDerate,
    JejakRumus,
    JejakSimulasi,
    ModulSimulasi,
    ParameterFisika,
)
from app.economics import (
    VERSION as ECONOMICS_VERSION,
)
from app.economics import (
    hitung_ekonomi,
)
from app.physics import (
    VERSION as PHYSICS_VERSION,
)
from app.physics import (
    daya_ac_noct,
    derate_berurutan,
    hitung_poa,
)
from app.sumber import faktor_emisi, modul_demo, rujukan_biaya, rujukan_tarif

DIR_ROOT = Path(__file__).resolve().parents[3]
DIR_ANALISIS = DIR_ROOT / "data" / "fixtures" / "analisis"
BERKAS_CUACA = DIR_ROOT / "data" / "fixtures" / "cuaca" / "mentah" / "nasa-power-bengkulu-2024.json"


class ModulInput(ModulSimulasi):
    """Spesifikasi modul eksplisit tanpa nilai produksi bawaan."""

    model_config = ConfigDict(allow_inf_nan=False)


class DerateInput(DerateSimulasi):
    """Rugi operasional dan efisiensi inverter yang dikirim pemanggil."""

    model_config = ConfigDict(allow_inf_nan=False)


class ParameterFisikaInput(ParameterFisika):
    """Parameter fisika wajib tanpa default modul atau rugi tersembunyi."""

    model_config = ConfigDict(allow_inf_nan=False)

    modul: ModulInput
    derate: DerateInput


class AsumsiPermintaanSimulasi(AsumsiSimulasi):
    """Validasi masukan mesin di atas kontrak hasil yang dihasilkan otomatis."""

    model_config = ConfigDict(allow_inf_nan=False)

    umur_tahun: int | None = Field(25, gt=0, le=9007199254740991)


class PermintaanSimulasi(BaseModel):
    """Badan permintaan untuk POST /api/v1/simulate."""

    model_config = ConfigDict(allow_inf_nan=False)

    roof_analysis_id: int = Field(..., gt=0)
    asumsi: AsumsiPermintaanSimulasi
    parameter_fisika: ParameterFisikaInput
    usable_area_m2: float | None = Field(None, ge=0.0, description="Luas atap layak, m²")
    tilt_deg: float | None = Field(None, ge=0.0, le=90.0, description="Kemiringan atap, °")
    azimuth_deg: float | None = Field(None, ge=0.0, le=360.0, description="Azimut dari utara, °")


class BuildingNotFoundError(Exception):
    """Dilempar saat data analisis atap tidak ditemukan di basis data/fixture."""


class RoofTooSmallError(Exception):
    """Dilempar saat atap tidak cukup luas untuk memuat minimal satu modul."""


@lru_cache(maxsize=1)
def muat_cuaca_bengkulu() -> pd.DataFrame:
    """Muat dan cache dataset cuaca hourly 2024 NASA POWER titik Bengkulu."""
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


def cari_analisis_atap(roof_analysis_id: int) -> AnalisisAtap | None:
    """Cari analisis atap berdasarkan id dari fixture yang tersedia."""
    if not DIR_ANALISIS.exists():
        return None
    for berkas in DIR_ANALISIS.glob("*.json"):
        try:
            data = json.loads(berkas.read_text(encoding="utf-8"))
            if data.get("roof_analysis_id") == roof_analysis_id:
                return AnalisisAtap.model_validate(data)
        except Exception:
            continue
    return None


def jalankan_simulasi(permintaan: PermintaanSimulasi) -> HasilSimulasi:
    """Eksekusi kalkulasi terpadu L3 fisika + L4 ekonomi + L5 karbon."""
    analisis = cari_analisis_atap(permintaan.roof_analysis_id)

    usable_area = permintaan.usable_area_m2
    tilt = permintaan.tilt_deg
    azimuth = permintaan.azimuth_deg

    if analisis is not None:
        if usable_area is None:
            usable_area = analisis.usable_area_m2
        if tilt is None:
            tilt = analisis.tilt_deg
        if azimuth is None:
            azimuth = analisis.azimuth_deg

    if usable_area is None or tilt is None or azimuth is None:
        raise BuildingNotFoundError(
            f"Analisis atap id {permintaan.roof_analysis_id} tidak ditemukan."
        )

    parameter = permintaan.parameter_fisika
    modul = parameter.modul
    rugi = parameter.derate
    luas_modul = modul.panjang_m * modul.lebar_m
    module_count = int(usable_area / luas_modul)

    if module_count < 1:
        raise RoofTooSmallError(
            f"Luas layak {usable_area:.1f} m² tidak cukup untuk modul ukuran {luas_modul:.2f} m²."
        )

    kwp = round(module_count * (modul.wp / 1000.0), 2)

    # L3: Fisika solar & energi
    lat = -3.76268
    lon = 102.27168
    cuaca = muat_cuaca_bengkulu()
    lokasi = pvlib.location.Location(lat, lon, tz=str(cuaca.index.tz))
    posisi = lokasi.get_solarposition(cuaca.index)

    poa = hitung_poa(
        ghi=cuaca["ghi"],
        dni=cuaca["dni"],
        dhi=cuaca["dhi"],
        solar_zenith=posisi["apparent_zenith"],
        solar_azimuth=posisi["azimuth"],
        tilt=tilt,
        azimuth=azimuth,
        albedo=parameter.albedo,
    )

    faktor = {
        "kotoran": 1 - rugi.kotoran,
        "mismatch": 1 - rugi.mismatch,
        "kabel_dc": 1 - rugi.kabel_dc,
        "efisiensi_inverter": rugi.inverter,
        "ketersediaan": 1 - rugi.ketersediaan,
    }
    pac = daya_ac_noct(
        poa.total,
        cuaca["temp_air"],
        kwp=kwp,
        gamma_pdc=modul.gamma_p,
        t_noct_c=modul.t_noct,
        **faktor,
    )

    pac_series = pd.Series(pac, index=cuaca.index).fillna(0).clip(lower=0) / 1000.0
    monthly_kwh = [
        round(float(pac_series[pac_series.index.month == m].sum()), 1) for m in range(1, 13)
    ]
    e_ac_kwh_yr1 = round(sum(monthly_kwh), 1)

    poa_kwh_m2_yr = round(
        float(pd.Series(poa.total, index=cuaca.index).fillna(0).sum() / 1000.0), 1
    )
    pr = round(e_ac_kwh_yr1 / (poa_kwh_m2_yr * kwp), 3) if (poa_kwh_m2_yr * kwp) > 0 else 0.0

    # L4: Ekonomi
    asumsi = permintaan.asumsi
    hasil_ekonomi = hitung_ekonomi(
        kwp=kwp,
        e_ac_kwh=e_ac_kwh_yr1,
        scr=asumsi.scr,
        tarif_rp_kwh=asumsi.tarif_rp_kwh,
        biaya_per_kwp=asumsi.biaya_per_kwp,
        opex_frac=asumsi.opex_frac if asumsi.opex_frac is not None else 0.01,
        diskonto=asumsi.diskonto if asumsi.diskonto is not None else 0.09,
        eskalasi_tarif=asumsi.eskalasi_tarif if asumsi.eskalasi_tarif is not None else 0.0,
        degradasi_thn=asumsi.degradasi_thn if asumsi.degradasi_thn is not None else 0.006,
        umur_tahun=asumsi.umur_tahun if asumsi.umur_tahun is not None else 25,
        faktor_ekspor=asumsi.faktor_ekspor if asumsi.faktor_ekspor is not None else 0.0,
    )

    # L5: Karbon
    ef, sumber_emisi = faktor_emisi(asumsi.ef_grid_tco2_mwh)
    hasil_karbon = hitung_karbon(
        e_ac_kwh=e_ac_kwh_yr1,
        ef_grid=ef,
        degradasi_thn=asumsi.degradasi_thn if asumsi.degradasi_thn is not None else 0.006,
        umur_tahun=asumsi.umur_tahun if asumsi.umur_tahun is not None else 25,
    )

    jejak = JejakSimulasi(
        poa=JejakRumus(
            rumus="POA = DNI·max(cos(AOI), 0) + POA_baur + POA_tanah",
            sumber="Hay-Davies (pvlib.irradiance.haydavies); cuaca NASA POWER Bengkulu 2024",
        ),
        suhu_sel=JejakRumus(
            rumus=f"T_sel = T_amb + (POA/1000)·(NOCT−20)/0,8; NOCT = {modul.t_noct:g} °C",
            sumber=(
                "Model NOCT; Jinko JKM550M-72HL4(-V) F5-EN, 2022, halaman 2"
                if modul.model_dump() == modul_demo()
                else "Model NOCT; spesifikasi modul masukan pengguna"
            ),
        ),
        derate=JejakDerate(
            **rugi.model_dump(),
            gabungan=float(derate_berurutan(1.0, **faktor)),
        ),
        ekonomi=JejakRumus(
            rumus="Kas_n = E_n × [SCR + (1−SCR) × faktor_ekspor] × tarif_n − OPEX_n",
            sumber=(
                f"{rujukan_tarif(asumsi.golongan_tarif, asumsi.daya_va, asumsi.tarif_rp_kwh)}. "
                f"{rujukan_biaya(asumsi.biaya_per_kwp)}. "
                "SCR, OPEX, diskonto dan degradasi adalah asumsi skenario."
            ),
        ),
        karbon=JejakRumus(
            rumus="CO2_tahun1 = E_AC / 1000 × EF_grid; satuan tCO2/tahun",
            sumber=sumber_emisi,
        ),
    )

    engine_version = f"{PHYSICS_VERSION}+{ECONOMICS_VERSION}+{CARBON_VERSION}"

    return HasilSimulasi(
        id=str(uuid.uuid4()),
        engine_version=engine_version,
        kwp=kwp,
        module_count=module_count,
        poa_kwh_m2_yr=poa_kwh_m2_yr,
        e_ac_kwh_yr1=e_ac_kwh_yr1,
        pr=pr,
        scr=asumsi.scr,
        capex_idr=hasil_ekonomi.capex_idr,
        savings_idr_yr1=hasil_ekonomi.savings_idr_yr1,
        payback_years=hasil_ekonomi.payback_years,
        npv_idr=hasil_ekonomi.npv_idr,
        irr=hasil_ekonomi.irr,
        lcoe_idr_kwh=hasil_ekonomi.lcoe_idr_kwh,
        co2e_ton_yr=round(hasil_karbon.co2e_ton_yr, 2),
        co2e_ton_25yr=round(hasil_karbon.co2e_ton_25yr_bersih, 2),
        monthly_kwh=monthly_kwh,
        asumsi=asumsi,
        jejak=jejak,
        parameter_fisika=parameter,
    )
