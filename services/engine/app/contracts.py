# Dihasilkan `pnpm gen:contracts` dari packages/contracts. Jangan disunting tangan.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, RootModel


class AsumsiSimulasi(BaseModel):
    golongan_tarif: str
    """
    Golongan tarif PLN, mis. 'R-1/TR'
    """
    daya_va: int = Field(..., gt=0, le=9007199254740991)
    """
    Daya tersambung, VA
    """
    tarif_rp_kwh: float = Field(..., gt=0.0)
    """
    Tarif berlaku, Rp/kWh
    """
    scr: float = Field(..., ge=0.0, le=1.0)
    """
    Self-consumption ratio, fraksi 0–1
    """
    biaya_per_kwp: float = Field(..., gt=0.0)
    """
    Biaya terpasang, Rp/kWp
    """
    opex_frac: float | None = Field(0.01, ge=0.0, le=0.1)
    """
    O&M per tahun, fraksi capex
    """
    diskonto: float | None = Field(0.09, ge=0.0, le=0.3)
    """
    Tingkat diskonto nominal, fraksi
    """
    eskalasi_tarif: float | None = Field(0, ge=0.0, le=0.2)
    """
    Kenaikan tarif per tahun, fraksi
    """
    degradasi_thn: float | None = Field(0.006, ge=0.0, le=0.02)
    """
    Degradasi modul per tahun, fraksi
    """
    umur_tahun: int | None = Field(25, ge=-9007199254740991, le=9007199254740991)
    """
    Umur sistem, tahun
    """
    ef_grid_tco2_mwh: float = Field(..., gt=0.0)
    """
    Faktor emisi jaringan, tCO2e/MWh
    """
    faktor_ekspor: float | None = Field(0, ge=0.0, le=1.0)
    """
    Nilai ekspor relatif terhadap tarif; 0 bila net-metering dihapus
    """


class Levels(RootModel[int]):
    root: int = Field(..., gt=0, le=9007199254740991)
    """
    Jumlah lantai bila diketahui
    """


class CitraAnalisis(BaseModel):
    source: str
    """
    Penyedia citra, mis. 'esri-world-imagery'
    """
    date: str | None
    """
    Tanggal citra ISO-8601 bila diketahui
    """


class JejakDerate(BaseModel):
    kotoran: float = Field(..., ge=0.0, le=1.0)
    """
    Rugi kotoran, fraksi
    """
    mismatch: float = Field(..., ge=0.0, le=1.0)
    """
    Rugi mismatch modul, fraksi
    """
    kabel_dc: float = Field(..., ge=0.0, le=1.0)
    """
    Rugi kabel DC, fraksi
    """
    inverter: float = Field(..., ge=0.0, le=1.0)
    """
    Efisiensi inverter, fraksi (bukan rugi)
    """
    ketersediaan: float = Field(..., ge=0.0, le=1.0)
    """
    Rugi ketersediaan, fraksi
    """
    gabungan: float = Field(..., ge=0.0, le=1.0)
    """
    Performance ratio hasil perkalian
    """


class JejakRumus(BaseModel):
    rumus: str
    sumber: str


class JejakSimulasi(BaseModel):
    poa: JejakRumus
    suhu_sel: JejakRumus
    derate: JejakDerate


class KodeGalat(StrEnum):
    BUILDING_NOT_FOUND = "BUILDING_NOT_FOUND"
    IMAGERY_UNAVAILABLE = "IMAGERY_UNAVAILABLE"
    IRRADIANCE_UNAVAILABLE = "IRRADIANCE_UNAVAILABLE"
    TARIFF_NOT_FOUND = "TARIFF_NOT_FOUND"
    ROOF_TOO_SMALL = "ROOF_TOO_SMALL"
    NARRATION_UNVERIFIED = "NARRATION_UNVERIFIED"
    DEVICE_UNAUTHORIZED = "DEVICE_UNAUTHORIZED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL = "INTERNAL"


class MetodeAnalisis(StrEnum):
    cv = "cv"
    footprint_fallback = "footprint_fallback"
    manual = "manual"


class CoordinateItemItemItem(RootModel[float]):
    root: float = Field(..., ge=-180.0, le=180.0)


class CoordinateItemItemItem1(RootModel[float]):
    root: float = Field(..., ge=-90.0, le=90.0)


class CoordinateItemItem(RootModel[tuple[CoordinateItemItemItem, CoordinateItemItemItem1]]):
    root: tuple[CoordinateItemItemItem, CoordinateItemItemItem1] = Field(
        ..., max_length=2, min_length=2
    )
    """
    [lon, lat] derajat, WGS84
    """


class CoordinateItem(RootModel[list[CoordinateItemItem]]):
    root: list[CoordinateItemItem] = Field(..., min_length=4)


class Coordinate(RootModel[list[CoordinateItem]]):
    root: list[CoordinateItem] = Field(..., min_length=1)


class MultiPolygonGeoJSON(BaseModel):
    type: Literal["MultiPolygon"]
    coordinates: list[Coordinate]


class Coordinate1ItemItem(RootModel[float]):
    root: float = Field(..., ge=-180.0, le=180.0)


class Coordinate1ItemItem1(RootModel[float]):
    root: float = Field(..., ge=-90.0, le=90.0)


class Coordinate1Item(RootModel[tuple[Coordinate1ItemItem, Coordinate1ItemItem1]]):
    root: tuple[Coordinate1ItemItem, Coordinate1ItemItem1] = Field(..., max_length=2, min_length=2)
    """
    [lon, lat] derajat, WGS84
    """


class Coordinate1(RootModel[list[Coordinate1Item]]):
    root: list[Coordinate1Item] = Field(..., min_length=4)


class PolygonGeoJSON(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[Coordinate1] = Field(..., min_length=1)


class SumberBangunan(StrEnum):
    osm = "osm"
    ms_footprints = "ms_footprints"
    user_drawn = "user_drawn"


class TipeAtap(StrEnum):
    datar = "datar"
    pelana = "pelana"
    limas = "limas"
    kompleks = "kompleks"


class AnalisisAtap(BaseModel):
    roof_analysis_id: int = Field(..., gt=0, le=9007199254740991)
    building_id: int = Field(..., gt=0, le=9007199254740991)
    roof_area_m2: float = Field(..., ge=0.0)
    """
    Luas atap terdeteksi, m²
    """
    usable_area_m2: float = Field(..., ge=0.0)
    """
    Luas layak setelah obstruksi & sempadan, m²
    """
    obstruction_frac: float = Field(..., ge=0.0, le=1.0)
    tilt_deg: float = Field(..., ge=0.0, le=60.0)
    """
    Kemiringan atap, derajat
    """
    azimuth_deg: float = Field(..., ge=0.0, le=360.0)
    """
    Arah hadap, derajat dari utara searah jarum jam
    """
    roof_type: TipeAtap
    confidence: float = Field(..., ge=0.0, le=1.0)
    method: MetodeAnalisis
    model_version: str
    imagery: CitraAnalisis
    mask_geojson: MultiPolygonGeoJSON | None
    """
    null bila tidak ada segmentasi
    """
    catatan: str | None = None
    peringatan: str | None = None
    """
    Diisi bila method bukan 'cv'
    """


class BangunanRingkas(BaseModel):
    id: int = Field(..., gt=0, le=9007199254740991)
    """
    id bangunan di basis data
    """
    source: SumberBangunan
    source_ref: str
    """
    Rujukan di sumber, mis. 'way/123456789'
    """
    geom: PolygonGeoJSON
    """
    Jejak bangunan, WGS84
    """
    footprint_m2: float = Field(..., gt=0.0)
    """
    Luas jejak geodesik, m²
    """
    building_tag: str | None
    """
    Tag OSM building=*, mis. 'house'
    """
    levels: Levels | None = None
    """
    Jumlah lantai bila diketahui
    """
    nama: str | None = None
    """
    Nama di sumber bila ada
    """
    region_code: str | None = None
    """
    Kode BPS wilayah bila sudah dipetakan
    """


class Error(BaseModel):
    code: KodeGalat
    message: str
    """
    Kalimat untuk pengguna, bahasa Indonesia
    """
    hint: str | None = None
    """
    Saran tindakan
    """
    retriable: bool


class GalatApi(BaseModel):
    error: Error


class HasilSimulasi(BaseModel):
    id: str
    """
    UUID simulasi
    """
    engine_version: str
    """
    Gabungan VERSION tiap lapisan, mis. 'l3.2026.09.14+l4.2026.09.20'
    """
    kwp: float
    """
    Kapasitas DC terpasang, kWp
    """
    module_count: int = Field(..., ge=-9007199254740991, le=9007199254740991)
    poa_kwh_m2_yr: float
    """
    Iradiasi bidang modul, kWh/m²/tahun
    """
    e_ac_kwh_yr1: float
    """
    Energi AC tahun pertama, kWh
    """
    pr: float
    """
    Performance ratio, fraksi
    """
    scr: float
    """
    Self-consumption ratio yang dipakai, fraksi
    """
    capex_idr: float
    """
    Investasi awal, Rp
    """
    savings_idr_yr1: float
    """
    Penghematan tagihan tahun pertama, Rp
    """
    payback_years: float | None
    """
    null = tidak balik modal dalam umur sistem
    """
    npv_idr: float
    """
    Nilai kini bersih, Rp
    """
    irr: float | None
    """
    null = tidak konvergen
    """
    lcoe_idr_kwh: float
    """
    Biaya energi rata-rata, Rp/kWh
    """
    co2e_ton_yr: float
    """
    Emisi terhindar tahun pertama, tCO2e
    """
    co2e_ton_25yr: float
    """
    Emisi terhindar sepanjang umur, tCO2e
    """
    monthly_kwh: list[float] = Field(..., max_length=12, min_length=12)
    """
    Energi AC per bulan Jan–Des, kWh
    """
    asumsi: AsumsiSimulasi
    jejak: JejakSimulasi | None = None
