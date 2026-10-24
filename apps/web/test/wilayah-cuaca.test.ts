import { afterEach, describe, expect, it, vi } from "vitest";
import { BangunanRingkas, InfoWilayah, type CuacaSimulasi } from "@petasurya/contracts";
import katalog from "../../../data/fixtures/katalog-bangunan.json";
import { PROFIL_SIMULASI } from "../lib/pemindaian";
import { barisCuaca, keteranganCuaca } from "../lib/cuaca";
import { asumsiDenganWilayah, bacaFaktorEmisi, barisWilayah, diKotaBengkulu, perluFaktorEmisi, petunjukFaktorEmisi } from "../lib/wilayah";

afterEach(() => { vi.unstubAllGlobals(); });

const bengkulu = BangunanRingkas.parse(katalog.bangunan[0]);
// Persegi kecil di sekitar Monas, Jakarta Pusat.
const jakarta = BangunanRingkas.parse({
  ...katalog.bangunan[0],
  id: 4001,
  geom: { type: "Polygon", coordinates: [[[106.8270, -6.1755], [106.8274, -6.1755], [106.8274, -6.1751], [106.8270, -6.1751], [106.8270, -6.1755]]] },
});

const jawaBali = InfoWilayah.parse({
  provinsi_iso: "ID-JK", provinsi_nama: "DKI Jakarta", sistem_grid: "Jawa-Madura-Bali", ef_grid_tco2_mwh: 0.87, rentang_tco2_mwh: null,
  tahun_data: 2019, metode: "CM ex-ante, CO2", status: "terverifikasi", catatan: "Sistem utama", sumber_id: "gatrik", sumber_url: "https://example.org/gatrik.pdf",
});

const tanpaFaktor = InfoWilayah.parse({
  ...jawaBali, provinsi_iso: "ID-PA", provinsi_nama: "Papua", sistem_grid: null, ef_grid_tco2_mwh: null, rentang_tco2_mwh: [0.58, 1.2], status: "belum_diverifikasi",
});

describe("keterangan cuaca", () => {
  const cuaca: CuacaSimulasi = { lat: -6.1754, lon: 106.8272, tahun: 2024, sumber: "ERA5 via Open-Meteo" };
  it("menyebut lokasi bangunan bila hasil membawa titik cuaca, dan tetap terbaca tanpanya", () => {
    expect(keteranganCuaca(cuaca)).toBe("kWh/tahun · cuaca 2024 di lokasi bangunan");
    expect(keteranganCuaca(undefined)).toBe("kWh/tahun · cuaca acuan");
  });
  it("menulis koordinat dengan format id-ID dan arah mata angin", () => {
    expect(barisCuaca(cuaca)).toEqual([["Data cuaca", "2024 · ERA5 via Open-Meteo"], ["Titik cuaca", "6,18° LS, 106,83° BT"]]);
    expect(barisCuaca(undefined)).toEqual([]);
  });
});

describe("faktor emisi menurut wilayah", () => {
  const asumsi = PROFIL_SIMULASI.rumah.data.asumsi;
  it("mengenali bangunan di Kota Bengkulu dan di luarnya", () => {
    expect(diKotaBengkulu(bengkulu)).toBe(true);
    expect(diKotaBengkulu(jakarta)).toBe(false);
  });
  it("tidak mengubah faktor 0,84 Bengkulu walau wilayah tersedia", () => {
    expect(asumsiDenganWilayah(asumsi, { ...jawaBali, ef_grid_tco2_mwh: 0.5 }, bengkulu)).toBe(asumsi);
  });
  it("memakai faktor sistem setempat di luar Bengkulu, dan bawaan bila wilayah tidak diketahui", () => {
    expect(asumsiDenganWilayah(asumsi, jawaBali, jakarta).ef_grid_tco2_mwh).toBe(0.87);
    expect(asumsiDenganWilayah(asumsi, null, jakarta)).toBe(asumsi);
    expect(asumsiDenganWilayah(asumsi, { ...jawaBali, ef_grid_tco2_mwh: null, status: "belum_diverifikasi" }, jakarta)).toBe(asumsi);
  });
  it("menulis baris wilayah hanya bila ada yang perlu dijelaskan", () => {
    expect(barisWilayah(jawaBali, jakarta)).toEqual([["Wilayah", "DKI Jakarta · Jawa-Madura-Bali"]]);
    expect(barisWilayah(null, bengkulu)).toEqual([]);
    expect(barisWilayah(null, jakarta)).toEqual([["Wilayah", "Belum dikenali; faktor emisi bawaan Sumatera"]]);
    expect(barisWilayah({ ...jawaBali, status: "perkiraan" }, jakarta).map(([k]) => k)).toEqual(["Wilayah", "Status faktor"]);
  });
  it("wilayah tanpa faktor resmi tidak diisi tebakan dan menunggu isian pengguna", () => {
    expect(perluFaktorEmisi(tanpaFaktor, jakarta)).toBe(true);
    expect(perluFaktorEmisi(jawaBali, jakarta)).toBe(false);
    expect(perluFaktorEmisi(null, jakarta)).toBe(false);
    expect(perluFaktorEmisi(tanpaFaktor, bengkulu)).toBe(false);
    expect(asumsiDenganWilayah(asumsi, tanpaFaktor, jakarta)).toBe(asumsi);
    expect(asumsiDenganWilayah(asumsi, tanpaFaktor, jakarta, 0.72).ef_grid_tco2_mwh).toBe(0.72);
    expect(asumsiDenganWilayah(asumsi, tanpaFaktor, bengkulu, 0.72)).toBe(asumsi);
    expect(barisWilayah(tanpaFaktor, jakarta)).toEqual([["Wilayah", "Papua"], ["Status faktor", "Belum ada faktor resmi provinsi; nilai diisi pengguna"]]);
  });
  it("petunjuk memuat rentang dengan format id-ID bila ada", () => {
    expect(petunjukFaktorEmisi(tanpaFaktor)).toBe("Sistem listrik di wilayah ini beragam: 0,58–1,20 tCO₂/MWh. Isi faktor emisi.");
    expect(petunjukFaktorEmisi({ ...tanpaFaktor, rentang_tco2_mwh: null })).toBe("Faktor emisi wilayah ini belum tersedia. Isi faktor emisi.");
  });
  it("membaca isian faktor emisi dengan koma atau titik dan menolak yang tidak sah", () => {
    expect(bacaFaktorEmisi("0,72")).toBe(0.72);
    expect(bacaFaktorEmisi(" 0.9 ")).toBe(0.9);
    for (const salah of ["", "0", "-1", "abc", "12", undefined, null]) expect(bacaFaktorEmisi(salah)).toBeNull();
  });
  it("memanggil engine sekali per sel dan mengulang setelah gagal", async () => {
    const { wilayahBangunan } = await import("../lib/wilayah");
    const gagal = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", gagal);
    const lain = BangunanRingkas.parse({ ...jakarta, id: 4002, geom: { type: "Polygon", coordinates: [[[110.4, -7.8], [110.4004, -7.8], [110.4004, -7.7996], [110.4, -7.7996], [110.4, -7.8]]] } });
    expect(await wilayahBangunan(lain)).toBeNull();
    const ok = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(jawaBali))));
    vi.stubGlobal("fetch", ok);
    expect((await wilayahBangunan(lain))?.provinsi_nama).toBe("DKI Jakarta");
    await wilayahBangunan(lain);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(new URL(ok.mock.calls[0][0]).searchParams.get("lat")).toBe("-7.7998");
  });
});
