import { afterEach, describe, expect, it, vi } from "vitest";
import { HasilAgregasi, PermintaanAgregasi } from "@petasurya/contracts";
import tersimpan from "../../../data/fixtures/agregasi/kota-bengkulu.json";
import { hitungAgregasi } from "../lib/api";

const hasil = HasilAgregasi.parse(tersimpan);
const permintaan = PermintaanAgregasi.parse(hasil.permintaan);
afterEach(() => vi.unstubAllGlobals());

describe("Mode Kota melalui API", () => {
  it("mengirim parameter eksplisit dan memvalidasi hasil mesin", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(hasil), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect((await hitungAgregasi(permintaan)).skenario.kwp).toBe(hasil.skenario.kwp);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/aggregate$/);
    expect(JSON.parse(options.body)).toEqual(permintaan);
    expect(options.method).toBe("POST");
  });

  it("menolak hasil yang berasal dari pilihan adopsi lain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(hasil), { status: 200 })));
    await expect(hitungAgregasi({ ...permintaan, adopsi: 0.8 })).rejects.toThrow("tidak cocok");
  });

  it("meneruskan galat API dan menolak hasil yang rusak", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "GEODATA_UNAVAILABLE", message: "Snapshot belum tersedia.", retriable: true } }), { status: 503 })));
    await expect(hitungAgregasi(permintaan)).rejects.toThrow("Snapshot belum tersedia.");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    await expect(hitungAgregasi(permintaan)).rejects.toThrow("tidak valid");
  });

  it("menghubungkan pembatalan permintaan ke fetch", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation((_url, options) => {
      expect(options.signal.aborted).toBe(true);
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });
    vi.stubGlobal("fetch", fetch);
    controller.abort();
    await expect(hitungAgregasi(permintaan, controller.signal)).rejects.toThrow("Aborted");
  });

  it("menampilkan galat jaringan dalam bahasa antarmuka", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(hitungAgregasi(permintaan)).rejects.toThrow("Mesin belum dapat dihubungi");
  });
});
