"""Hitung ulang tiga skenario demo dengan sumber angka dari registri bersama."""

import json
from pathlib import Path

from app.simulation import PermintaanSimulasi, jalankan_simulasi
from app.sumber import modul_demo, registri, tarif_dasar

ROOT = Path(__file__).resolve().parents[3]
SKENARIO = (
    ("contoh-3f8c.json", 9912, "B-1/TR", 5500),
    ("contoh-limun-1145010599.json", 9913, "R-1/TR", 2200),
    ("contoh-unib-1146141501.json", 9914, "B-2/TR", 197000),
)


def buat_fixture() -> None:
    """Simpan hasil mesin, masukan, dan asal angka; ID tetap stabil antar hitungan."""
    sumber = registri()
    p = ROOT / "data/fixtures/parameter/fisika-contoh.json"
    fisika = json.loads(p.read_text(encoding="utf-8"))
    fisika["modul"] = modul_demo()
    fisika["_sumber_modul_id"] = "modul_jinko_jkm550m_72hl4_f5"
    fisika["_catatan"] = (
        "Modul mengikuti lembar data Jinko F5; albedo dan derate tetap asumsi demo, "
        "bukan pengukuran kondisi atap."
    )
    p.write_text(
        json.dumps(fisika, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )
    for nama, analisis_id, golongan, daya in SKENARIO:
        p = ROOT / "data/fixtures/simulasi" / nama
        lama = json.loads(p.read_text(encoding="utf-8"))
        asumsi = dict(lama["asumsi"])
        asumsi.update(
            golongan_tarif=golongan,
            daya_va=daya,
            tarif_rp_kwh=tarif_dasar(golongan, daya),
            biaya_per_kwp=sumber["biaya_per_kwp_terpasang"]["nilai"]["acuan_demo"],
            ef_grid_tco2_mwh=sumber["ef_grid_sumatera_2019"]["nilai"]["cm_ex_ante_om_075_bm_025"],
            faktor_ekspor=sumber["permen_esdm_2_2024_faktor_ekspor"]["nilai"],
        )
        hasil = jalankan_simulasi(
            PermintaanSimulasi(
                roof_analysis_id=analisis_id,
                asumsi=asumsi,
                parameter_fisika=fisika,
            )
        ).model_dump(mode="json")
        hasil["id"] = lama["id"]
        hasil["_catatan"] = (
            "contoh simulasi dihitung dengan mesin dari cuaca NASA POWER 2024, "
            "tarif dasar Permen 7/2024, biaya acuan IESR 2020, "
            "modul Jinko F5 dan faktor emisi Sumatera 2019. "
            "Analisis atap, daya tersambung, SCR, diskonto, OPEX, degradasi, "
            "albedo dan derate tetap asumsi demo; bukan hasil survei lapangan."
        )
        hasil["_sumber_ids"] = [
            "nasa_power_hourly_bengkulu_2024",
            "tarif_pln_permen_7_2024",
            "kebijakan_tarif_tetap_2024_2026",
            "biaya_per_kwp_terpasang",
            "permen_esdm_2_2024_faktor_ekspor",
            "ef_grid_sumatera_2019",
            "unfccc_tool07_v7_bobot_surya",
            "modul_jinko_jkm550m_72hl4_f5",
        ]
        p.write_text(
            json.dumps(hasil, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
        )
        print(f"{nama}: {hasil['kwp']} kWp, payback={hasil['payback_years']}")


if __name__ == "__main__":
    buat_fixture()
