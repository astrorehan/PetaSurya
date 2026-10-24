# Dihasilkan `pnpm gen:contracts` dari packages/contracts. Jangan disunting tangan.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import AnyUrl, BaseModel, Field, RootModel


class AreaDimuat(BaseModel):
    barat: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur tepi barat area yang dimuat, derajat WGS84
    """
    selatan: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang tepi selatan area yang dimuat, derajat WGS84
    """
    timur: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur tepi timur area yang dimuat, derajat WGS84
    """
    utara: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang tepi utara area yang dimuat, derajat WGS84
    """


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
    Tarif yang dipakai dalam skenario, Rp/kWh
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


class CuacaSimulasi(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang titik cuaca yang diminta ke sumber, derajat
    """
    lon: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur titik cuaca yang diminta ke sumber, derajat
    """
    tahun: int = Field(..., ge=-9007199254740991, le=9007199254740991)
    """
    Tahun data cuaca per jam
    """
    sumber: str
    """
    Penerbit dan produk data cuaca
    """


class DerateSimulasi(BaseModel):
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


class Cakupan(BaseModel):
    n_tercatat: int = Field(..., ge=0, le=9007199254740991)
    n_layak: int = Field(..., ge=0, le=9007199254740991)
    n_terlalu_kecil: int = Field(..., ge=0, le=9007199254740991)
    n_tanpa_wilayah: int = Field(..., ge=0, le=9007199254740991)
    n_batas_wilayah: int = Field(..., ge=0, le=9007199254740991)
    catatan: str


class JarakM(RootModel[float]):
    root: float = Field(..., ge=0.0)
    """
    Jarak titik ke footprint, meter; 0 bila memuat
    """


class EfGridTco2Mwh(RootModel[float]):
    root: float = Field(..., gt=0.0)
    """
    Faktor emisi jaringan, tCO2/MWh; null bila belum diverifikasi
    """


class RentangTco2MwhItem(RootModel[float]):
    root: float = Field(..., gt=0.0)


class RentangTco2Mwh(RootModel[list[RentangTco2MwhItem]]):
    root: list[RentangTco2MwhItem] = Field(..., max_length=2, min_length=2)
    """
    [terendah, tertinggi] faktor emisi antarsistem terpisah dalam provinsi, tCO2/MWh
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
    Hasil perkalian faktor derate; terpisah dari PR energi
    """


class JejakRumus(BaseModel):
    rumus: str
    sumber: str


class JejakSimulasi(BaseModel):
    poa: JejakRumus
    suhu_sel: JejakRumus
    derate: JejakDerate
    ekonomi: JejakRumus | None = None
    """
    Rumus dan sumber tarif serta biaya yang cocok dengan masukan
    """
    karbon: JejakRumus | None = None
    """
    Sumber, tahun data dan metode faktor emisi yang dipakai
    """


class JenisSumberFootprint(StrEnum):
    snapshot = "snapshot"
    osm_daring = "osm_daring"


class KecocokanBangunan(StrEnum):
    memuat = "memuat"
    terdekat = "terdekat"


class KodeGalat(StrEnum):
    BUILDING_NOT_FOUND = "BUILDING_NOT_FOUND"
    GEODATA_UNAVAILABLE = "GEODATA_UNAVAILABLE"
    OUT_OF_COVERAGE = "OUT_OF_COVERAGE"
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


class ModulSimulasi(BaseModel):
    wp: float = Field(..., gt=0.0)
    """
    Daya puncak modul, Wp
    """
    panjang_m: float = Field(..., gt=0.0)
    """
    Panjang modul, meter
    """
    lebar_m: float = Field(..., gt=0.0)
    """
    Lebar modul, meter
    """
    gamma_p: float = Field(..., le=0.0)
    """
    Koefisien suhu daya, 1/°C
    """
    t_noct: float = Field(..., gt=0.0)
    """
    Nominal Operating Cell Temperature, °C
    """


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


class ParameterFisika(BaseModel):
    modul: ModulSimulasi
    derate: DerateSimulasi
    albedo: float = Field(..., ge=0.0, le=1.0)
    """
    Reflektansi permukaan tanah, fraksi
    """


class PerkiraanJenis(StrEnum):
    rumah = "rumah"


class PerkiraanRumah(BaseModel):
    min_m2: float = Field(..., gt=0.0)
    """
    Batas bawah luas footprint, m²
    """
    max_m2: float = Field(..., gt=0.0)
    """
    Batas atas luas footprint, m²
    """
    dasar: str
    """
    Asal rentang luas
    """


class Asumsi(BaseModel):
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
    Tarif yang dipakai dalam skenario, Rp/kWh
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
    umur_tahun: int | None = Field(25, gt=0, le=100)
    ef_grid_tco2_mwh: float = Field(..., gt=0.0)
    """
    Faktor emisi jaringan, tCO2e/MWh
    """
    faktor_ekspor: float | None = Field(0, ge=0.0, le=1.0)
    """
    Nilai ekspor relatif terhadap tarif; 0 bila net-metering dihapus
    """


class PermintaanAlamat(BaseModel):
    q: str = Field(..., max_length=200, min_length=3)
    """
    Alamat atau nama tempat yang diketik pengguna
    """
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    """
    Lintang pusat peta untuk mengutamakan hasil terdekat; wajib berpasangan dengan lon
    """
    lon: float | None = Field(None, ge=-180.0, le=180.0)
    """
    Bujur pusat peta untuk mengutamakan hasil terdekat; wajib berpasangan dengan lat
    """


class PermintaanFootprintArea(BaseModel):
    barat: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur tepi barat, derajat WGS84
    """
    selatan: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang tepi selatan, derajat WGS84
    """
    timur: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur tepi timur, derajat WGS84
    """
    utara: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang tepi utara, derajat WGS84
    """
    batas: int | None = Field(1500, ge=1, le=2000)
    """
    Jumlah footprint maksimum per respons
    """


class PermintaanWilayah(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang titik, derajat WGS84
    """
    lon: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur titik, derajat WGS84
    """


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


class PaybackMedianYears(RootModel[float]):
    root: float = Field(..., ge=0.0)
    """
    Median hanya atap yang balik modal; null bila tidak ada
    """


class RingkasanAgregasi(BaseModel):
    n_bangunan: int = Field(..., ge=0, le=9007199254740991)
    module_count: int = Field(..., ge=0, le=9007199254740991)
    footprint_m2: float = Field(..., ge=0.0)
    usable_area_m2: float = Field(..., ge=0.0)
    kwp: float = Field(..., ge=0.0)
    e_ac_kwh_yr1: float = Field(..., ge=0.0)
    """
    Energi AC tahun pertama, kWh
    """
    co2_ton_yr1: float = Field(..., ge=0.0)
    """
    Emisi grid terhindar tahun pertama, tCO2; faktor ESDM mengukur CO2
    """
    capex_idr: float = Field(..., ge=0.0)
    savings_idr_yr1: float = Field(..., ge=0.0)
    payback_median_years: PaybackMedianYears | None
    """
    Median hanya atap yang balik modal; null bila tidak ada
    """


class StatusFaktorEmisi(StrEnum):
    """
    terverifikasi: tercantum di dokumen; perkiraan: dipilih PetaSurya; belum_diverifikasi: kosong
    """

    terverifikasi = "terverifikasi"
    perkiraan = "perkiraan"
    belum_diverifikasi = "belum_diverifikasi"


class SumberAgregasi(BaseModel):
    penerbit: str
    url: AnyUrl
    diambil: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    timestamp_osm: str
    catatan: str


class SumberBangunan(StrEnum):
    osm = "osm"
    ms_footprints = "ms_footprints"
    user_drawn = "user_drawn"


class TilePemindaian(BaseModel):
    x: float
    y: float
    url: AnyUrl


class TipeAtap(StrEnum):
    datar = "datar"
    pelana = "pelana"
    limas = "limas"
    kompleks = "kompleks"


class UrutanAgregasi(StrEnum):
    kwp = "kwp"
    payback = "payback"
    lcoe = "lcoe"


class WilayahAgregasi(BaseModel):
    id: str
    nama: str
    n_tercatat: int = Field(..., ge=0, le=9007199254740991)
    """
    Jumlah footprint pada snapshot, termasuk yang terlalu kecil
    """
    potensi: RingkasanAgregasi
    skenario: RingkasanAgregasi


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
    perkiraan_jenis: PerkiraanJenis | None = None
    """
    Perkiraan dari luas footprint, bukan tag OSM
    """


class BingkaiPemindaian(BaseModel):
    x0: float
    y0: float
    lebar: int = Field(..., gt=0, le=9007199254740991)
    tinggi: int = Field(..., gt=0, le=9007199254740991)
    zoom: int = Field(..., ge=0, le=22)
    meter_per_piksel: float = Field(..., gt=0.0)
    tiles: list[TilePemindaian]


class FootprintArea(BaseModel):
    permintaan: PermintaanFootprintArea
    jumlah: int = Field(..., ge=0, le=9007199254740991)
    """
    Footprint yang memotong bbox
    """
    terpotong: bool
    """
    Jumlah melebihi batas; yang terdekat dari pusat bbox dikirim
    """
    bangunan: list[BangunanRingkas]
    """
    Terdekat dari pusat bbox lebih dahulu
    """
    perkiraan_rumah: PerkiraanRumah | None = None
    """
    Rentang luas perkiraan rumah; hanya untuk snapshot Kota Bengkulu
    """
    sumber: SumberAgregasi
    """
    Snapshot OSM (Mode Kota) atau layanan OSM yang dipakai untuk bangunan daring
    """
    jenis_sumber: JenisSumberFootprint | None = None
    """
    'snapshot' = berkas Kota Bengkulu; 'osm_daring' = diambil dari OSM lalu di-cache
    """
    area_dimuat: AreaDimuat | None = None
    """
    Bagian bbox yang dimuat; 'osm_daring' hanya jendela sekitar pusat bbox
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


class Jejak(BaseModel):
    kapasitas: JejakRumus
    energi: JejakRumus
    ekonomi: JejakRumus
    karbon: JejakRumus
    adopsi: JejakRumus


class HasilAlamat(BaseModel):
    nama: str
    """
    Baris pertama alamat untuk ditampilkan
    """
    alamat: str
    """
    Alamat lengkap dari geocoder
    """
    lat: float = Field(..., ge=-90.0, le=90.0)
    """
    Lintang titik alamat, derajat WGS84
    """
    lon: float = Field(..., ge=-180.0, le=180.0)
    """
    Bujur titik alamat, derajat WGS84
    """
    presisi: str
    """
    Jenis objek OSM yang cocok, mis. 'house', 'road', 'building'
    """
    bangunan: BangunanRingkas | None
    """
    Footprint pada atau dekat titik alamat
    """
    kecocokan: KecocokanBangunan | None
    """
    'memuat' bila titik di dalam footprint
    """
    jarak_m: JarakM | None
    """
    Jarak titik ke footprint, meter; 0 bila memuat
    """


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
    cuaca: CuacaSimulasi | None = None
    """
    Titik cuaca yang dipakai; kosong pada hasil lama
    """
    parameter_fisika: ParameterFisika | None = None
    """
    Masukan fisika yang dipakai untuk reproduksi hasil
    """


class InfoWilayah(BaseModel):
    provinsi_iso: str = Field(..., pattern="^ID-[A-Z]{2}$")
    """
    Kode ISO 3166-2 provinsi, mis. ID-BE
    """
    provinsi_nama: str
    """
    Nama provinsi
    """
    sistem_grid: str | None
    """
    Nama sistem ketenagalistrikan pada dokumen sumber; null bila belum diverifikasi
    """
    ef_grid_tco2_mwh: EfGridTco2Mwh | None
    """
    Faktor emisi jaringan, tCO2/MWh; null bila belum diverifikasi
    """
    rentang_tco2_mwh: RentangTco2Mwh | None
    """
    [terendah, tertinggi] faktor emisi antarsistem terpisah dalam provinsi, tCO2/MWh
    """
    tahun_data: int = Field(..., ge=-9007199254740991, le=9007199254740991)
    """
    Tahun data faktor emisi, bukan tahun simulasi
    """
    metode: str
    """
    Kolom dokumen yang dipakai dan cakupan gas
    """
    status: StatusFaktorEmisi
    catatan: str
    """
    Dasar pemilihan sistem untuk provinsi ini
    """
    sumber_id: str
    """
    Kunci entri pada registri sumber
    """
    sumber_url: AnyUrl
    """
    Tautan dokumen sumber
    """


class PaketPemindaian(BaseModel):
    bangunan: BangunanRingkas
    analisis: AnalisisAtap | None
    bingkai: BingkaiPemindaian
    tersimpan: bool
    durasi_detik: float = Field(..., ge=0.0)


class PencarianAlamat(BaseModel):
    kueri: str
    hasil: list[HasilAlamat]
    """
    Hanya titik di dalam wilayah Indonesia
    """
    atribusi: str
    """
    Atribusi data geocoder yang wajib ditampilkan
    """


class PermintaanAgregasi(BaseModel):
    kode_wilayah: Literal["1771"]
    """
    Kode Kota Bengkulu; cakupan cuaca dan snapshot OSM
    """
    fraksi_layak: float = Field(..., ge=0.0, le=1.0)
    """
    Bagian footprint yang diasumsikan layak, fraksi; bukan hasil segmentasi
    """
    tilt_deg: float = Field(..., ge=0.0, le=90.0)
    """
    Kemiringan panel seragam, derajat; asumsi skenario
    """
    azimuth_deg: float = Field(..., ge=0.0, le=360.0)
    """
    Hadap panel dari utara, derajat; asumsi skenario
    """
    adopsi: float = Field(..., ge=0.0, le=1.0)
    """
    Fraksi jumlah atap layak yang dipilih, dibulatkan ke bawah
    """
    urut: UrutanAgregasi
    asumsi: Asumsi
    parameter_fisika: ParameterFisika


class HasilAgregasi(BaseModel):
    kode_wilayah: Literal["1771"]
    engine_version: str
    jenis_potensi: Literal["estimasi_footprint"]
    permintaan: PermintaanAgregasi
    sumber: SumberAgregasi
    cakupan: Cakupan
    potensi: RingkasanAgregasi
    skenario: RingkasanAgregasi
    wilayah: list[WilayahAgregasi]
    tanpa_wilayah: WilayahAgregasi
    jejak: Jejak
