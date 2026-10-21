"""Bentuk hasil Mode Kota deterministik dari snapshot dan skenario eksplisit."""

import json
import time

from app.aggregate import ROOT, PermintaanAgregasiInput, jalankan_agregasi


def main():
    awal = time.perf_counter()
    berkas = ROOT / "data/fixtures/kota/permintaan-bengkulu.json"
    permintaan = PermintaanAgregasiInput.model_validate_json(berkas.read_text("utf-8"))
    hasil = jalankan_agregasi(permintaan)
    target = ROOT / "data/fixtures/agregasi/kota-bengkulu.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(hasil.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        json.dumps(
            {
                "atap_layak": hasil.potensi.n_bangunan,
                "terpilih": hasil.skenario.n_bangunan,
                "kwp": hasil.skenario.kwp,
                "kwh": hasil.skenario.e_ac_kwh_yr1,
                "detik": round(time.perf_counter() - awal, 2),
            }
        )
    )


if __name__ == "__main__":
    main()
