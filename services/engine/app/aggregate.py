"""L6: estimasi footprint dan adopsi berdasarkan pemilihan atap individual."""

import gzip
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from statistics import median

from pydantic import ConfigDict, Field

from app.carbon import VERSION as CARBON_VERSION
from app.carbon import hitung_karbon
from app.contracts import HasilAgregasi, PermintaanAgregasi, RingkasanAgregasi
from app.economics import VERSION as ECONOMICS_VERSION
from app.economics import hitung_ekonomi
from app.physics import VERSION as PHYSICS_VERSION
from app.physics import energi_tahunan
from app.simulation import (
    AsumsiPermintaanSimulasi,
    ParameterFisikaInput,
    muat_cuaca_bengkulu,
)
from app.sumber import faktor_emisi, rujukan_biaya, rujukan_tarif

VERSION = "l6.2026.10.14"
ROOT = Path(__file__).resolve().parents[3]
BERKAS_KOTA = ROOT / "data/fixtures/kota/bangunan-bengkulu.json.gz"
BERKAS_WILAYAH = ROOT / "data/fixtures/wilayah/kecamatan-kota-bengkulu.geojson"


class AsumsiAgregasiInput(AsumsiPermintaanSimulasi):
    opex_frac: float = Field(0.01, ge=0, le=0.1)
    diskonto: float = Field(0.09, ge=0, le=0.3)
    eskalasi_tarif: float = Field(0, ge=0, le=0.2)
    degradasi_thn: float = Field(0.006, ge=0, le=0.02)
    umur_tahun: int = Field(25, gt=0, le=100)
    faktor_ekspor: float = Field(0, ge=0, le=1)


class PermintaanAgregasiInput(PermintaanAgregasi):
    """Tolak non-finite juga pada parameter fisika dan asumsi bersarang."""

    model_config = ConfigDict(allow_inf_nan=False)
    asumsi: AsumsiAgregasiInput
    parameter_fisika: ParameterFisikaInput


@dataclass(frozen=True, slots=True)
class AtapAgregasi:
    source_ref: str
    wilayah_id: str | None
    footprint_m2: float
    usable_area_m2: float
    module_count: int
    kwp: float
    e_ac_kwh_yr1: float
    co2_ton_yr1: float
    capex_idr: float
    savings_idr_yr1: float
    payback_years: float | None
    lcoe_idr_kwh: float


def sha256_teks(berkas: Path) -> str:
    """SHA-256 isi teks setelah CRLF → LF.

    Git menyimpan berkas teks dengan LF, tetapi checkout Windows dapat menulis
    CRLF. Hash bytes mentah membuat snapshot hanya cocok dengan satu checkout.
    """
    return sha256(berkas.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


@lru_cache(maxsize=1)
def muat_wilayah() -> list[dict]:
    data = json.loads(BERKAS_WILAYAH.read_text("utf-8"))
    return [
        {"id": str(f["properties"]["id"]), "nama": f["properties"]["nama"]}
        for f in data["features"]
    ]


@lru_cache(maxsize=1)
def muat_data_kota() -> dict:
    """Baca snapshot tetap; tidak memanggil OSM atau model segmentasi."""
    data = json.loads(gzip.decompress(BERKAS_KOTA.read_bytes()))
    if data["sha256_batas_kecamatan"] != sha256_teks(BERKAS_WILAYAH):
        raise OSError("Batas kecamatan berubah; bentuk ulang snapshot Mode Kota.")
    ids = [b["source_ref"] for b in data["bangunan"]]
    if len(ids) != len(set(ids)):
        raise OSError("Snapshot memiliki footprint berulang.")
    return data


def hitung_bangunan(permintaan: PermintaanAgregasiInput, bangunan: list[dict]) -> tuple:
    """Luas layak = footprint × fraksi; floor jumlah modul dilakukan per atap.

    Dengan orientasi, rugi dan profil ekonomi seragam, L3–L5 linear terhadap
    kWp. Mesin menghitung basis 1 kWp sekali, kemudian mengalikan per atap.
    Payback dan LCOE tetap sama untuk profil seragam. Tidak mengasumsikan
    hasil segmentasi, bayangan, daya tersambung atau tata letak modul.
    """
    if not bangunan or permintaan.fraksi_layak == 0:
        return ()
    fisika = permintaan.parameter_fisika
    modul = fisika.modul
    rugi = fisika.derate
    energi_per_kwp = energi_tahunan(
        -3.76268,
        102.27168,
        permintaan.tilt_deg,
        permintaan.azimuth_deg,
        muat_cuaca_bengkulu(),
        kwp=1,
        albedo=fisika.albedo,
        gamma_pdc=modul.gamma_p,
        t_noct_c=modul.t_noct,
        kotoran=1 - rugi.kotoran,
        mismatch=1 - rugi.mismatch,
        kabel_dc=1 - rugi.kabel_dc,
        efisiensi_inverter=rugi.inverter,
        ketersediaan=1 - rugi.ketersediaan,
    )
    asumsi = permintaan.asumsi
    ekonomi = hitung_ekonomi(
        kwp=1,
        e_ac_kwh=energi_per_kwp,
        scr=asumsi.scr,
        tarif_rp_kwh=asumsi.tarif_rp_kwh,
        biaya_per_kwp=asumsi.biaya_per_kwp,
        opex_frac=asumsi.opex_frac,
        diskonto=asumsi.diskonto,
        eskalasi_tarif=asumsi.eskalasi_tarif,
        degradasi_thn=asumsi.degradasi_thn,
        umur_tahun=asumsi.umur_tahun,
        faktor_ekspor=asumsi.faktor_ekspor,
    )
    ef, _ = faktor_emisi(asumsi.ef_grid_tco2_mwh)
    karbon = hitung_karbon(
        energi_per_kwp, ef, degradasi_thn=asumsi.degradasi_thn, umur_tahun=asumsi.umur_tahun
    )
    luas_modul = modul.panjang_m * modul.lebar_m
    hasil = []
    for b in bangunan:
        layak = b["footprint_m2"] * permintaan.fraksi_layak
        n_modul = math.floor(layak / luas_modul)
        if n_modul < 1:
            continue
        kapasitas = n_modul * modul.wp / 1000
        hasil.append(
            AtapAgregasi(
                source_ref=b["source_ref"],
                wilayah_id=b["wilayah_id"],
                footprint_m2=b["footprint_m2"],
                usable_area_m2=layak,
                module_count=n_modul,
                kwp=kapasitas,
                e_ac_kwh_yr1=kapasitas * energi_per_kwp,
                co2_ton_yr1=kapasitas * karbon.co2e_ton_yr,
                capex_idr=kapasitas * ekonomi.capex_idr,
                savings_idr_yr1=kapasitas * ekonomi.savings_idr_yr1,
                payback_years=ekonomi.payback_years,
                lcoe_idr_kwh=ekonomi.lcoe_idr_kwh,
            )
        )
    return tuple(hasil)


def pilih_atap(atap: tuple | list, adopsi: float, urut: str) -> tuple:
    """Pilih floor(N × adopsi) atap; identitas OSM mengurai nilai seri."""
    kunci = {
        "kwp": lambda a: (-a.kwp, a.source_ref),
        "payback": lambda a: (
            a.payback_years is None,
            a.payback_years if a.payback_years is not None else math.inf,
            a.source_ref,
        ),
        "lcoe": lambda a: (a.lcoe_idr_kwh, a.source_ref),
    }[urut]
    return tuple(sorted(atap, key=kunci)[: math.floor(len(atap) * adopsi)])


def jumlahkan(atap: tuple | list) -> RingkasanAgregasi:
    """Jumlah sebelum pembulatan tampilan; median mengabaikan payback null."""
    payback = [a.payback_years for a in atap if a.payback_years is not None]
    nilai = {
        kolom: math.fsum(getattr(a, kolom) for a in atap)
        for kolom in (
            "footprint_m2",
            "usable_area_m2",
            "kwp",
            "e_ac_kwh_yr1",
            "co2_ton_yr1",
            "capex_idr",
            "savings_idr_yr1",
        )
    }
    return RingkasanAgregasi(
        n_bangunan=len(atap),
        module_count=sum(a.module_count for a in atap),
        payback_median_years=median(payback) if payback else None,
        **nilai,
    )


@lru_cache(maxsize=3)
def _atap_snapshot(kunci: str) -> tuple:
    """Adopsi/urutan berubah tanpa menghitung ulang fisika atau setiap footprint."""
    masukan = json.loads(kunci)
    permintaan = PermintaanAgregasiInput.model_validate({**masukan, "adopsi": 0, "urut": "kwp"})
    return hitung_bangunan(permintaan, muat_data_kota()["bangunan"])


def jalankan_agregasi(permintaan: PermintaanAgregasiInput) -> HasilAgregasi:
    data = muat_data_kota()
    wilayah = muat_wilayah()
    kunci = json.dumps(
        permintaan.model_dump(mode="json", exclude={"adopsi", "urut"}), sort_keys=True
    )
    atap = _atap_snapshot(kunci)
    terpilih = pilih_atap(atap, permintaan.adopsi, permintaan.urut)
    potensi_wilayah = defaultdict(list)
    skenario_wilayah = defaultdict(list)
    n_tercatat = Counter(b["wilayah_id"] for b in data["bangunan"])
    for a in atap:
        potensi_wilayah[a.wilayah_id].append(a)
    for a in terpilih:
        skenario_wilayah[a.wilayah_id].append(a)

    def kelompok(id, nama):
        return {
            "id": id if id is not None else "tanpa-batas",
            "nama": nama,
            "n_tercatat": n_tercatat[id],
            "potensi": jumlahkan(potensi_wilayah[id]),
            "skenario": jumlahkan(skenario_wilayah[id]),
        }

    asumsi = permintaan.asumsi
    _, sumber_karbon = faktor_emisi(asumsi.ef_grid_tco2_mwh)
    sumber_tarif = rujukan_tarif(asumsi.golongan_tarif, asumsi.daya_va, asumsi.tarif_rp_kwh)
    return HasilAgregasi.model_validate(
        {
            "kode_wilayah": "1771",
            "engine_version": f"{VERSION}+{PHYSICS_VERSION}+{ECONOMICS_VERSION}+{CARBON_VERSION}",
            "jenis_potensi": "estimasi_footprint",
            "permintaan": permintaan.model_dump(mode="json"),
            "sumber": data["sumber"],
            "cakupan": {
                "n_tercatat": len(data["bangunan"]),
                "n_layak": len(atap),
                "n_terlalu_kecil": len(data["bangunan"]) - len(atap),
                "n_tanpa_wilayah": n_tercatat[None],
                "n_batas_wilayah": len(wilayah),
                "catatan": (
                    "Hanya footprint pada snapshot OSM; kelengkapan seluruh kota tidak diketahui. "
                    "Bangunan tanpa pasangan batas kecamatan tetap masuk total kota. "
                    "Kapasitas berdasarkan luas; struktur, daya, bayangan dan izin belum diperiksa."
                ),
            },
            "potensi": jumlahkan(atap),
            "skenario": jumlahkan(terpilih),
            "wilayah": [kelompok(w["id"], w["nama"]) for w in wilayah],
            "tanpa_wilayah": kelompok(None, "Tanpa batas kecamatan"),
            "jejak": {
                "kapasitas": {
                    "rumus": (
                        "N_modul_atap = floor(footprint × fraksi_layak / luas_modul); "
                        "kWp = Σ(N_modul_atap × Wp / 1000)"
                    ),
                    "sumber": (
                        "Footprint OSM; modul Jinko F5 atau masukan pengguna. "
                        "Fraksi layak adalah asumsi, bukan hasil segmentasi."
                    ),
                },
                "energi": {
                    "rumus": (
                        "E_AC = Σ(kWp_atap × E_AC_per_kWp); "
                        "basis dihitung L3 Hay-Davies/NOCT, derate satu kali"
                    ),
                    "sumber": (
                        "NASA POWER Bengkulu 2024; orientasi, albedo dan rugi seragam "
                        "sesuai parameter skenario."
                    ),
                },
                "ekonomi": {
                    "rumus": (
                        "Investasi = ΣCAPEX_atap; "
                        "hemat = ΣE_atap × [SCR + (1−SCR) × faktor_ekspor] × tarif"
                    ),
                    "sumber": (
                        f"{sumber_tarif}. "
                        f"{rujukan_biaya(asumsi.biaya_per_kwp)}. "
                        "Profil ekonomi seragam; tidak mengestimasi beban tiap bangunan."
                    ),
                },
                "karbon": {
                    "rumus": "CO2_tahun1 = Σ(E_AC_atap / 1000 × EF_grid), tCO2/tahun",
                    "sumber": sumber_karbon,
                },
                "adopsi": {
                    "rumus": (
                        "Pilih floor(N_atap_layak × adopsi) atap dari urutan prioritas "
                        "seluruh cakupan kota, kemudian jumlahkan"
                    ),
                    "sumber": (
                        "Kapasitas terbesar, payback terpendek, atau LCOE terendah; "
                        "ID OSM mengurai seri. Profil seragam menghasilkan payback dan "
                        "LCOE yang sama; bukan peringkat ekonomi hasil survei."
                    ),
                },
            },
        }
    )
