import { afterEach, describe, expect, it, vi } from "vitest";
import simulasiContoh from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import parameterFisika from "../../../data/fixtures/parameter/fisika-contoh.json";

const payload = {
  roof_analysis_id: 9912,
  asumsi: simulasiContoh.asumsi,
  parameter_fisika: parameterFisika,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("klien simulasi", () => {
  it.each([
    [undefined, "http://localhost:8000"],
    ["", "http://localhost:8000"],
    ["   ", "http://localhost:8000"],
    ["https://engine.example.test", "https://engine.example.test"],
    [" https://engine.example.test/layanan/// ", "https://engine.example.test/layanan"],
  ])("membaca NEXT_PUBLIC_API_BASE=%s", async (alamat, dasar) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE", alamat);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(simulasiContoh)));
    vi.stubGlobal("fetch", fetchMock);
    const { API_BASE, hitungUlangAtap } = await import("../lib/api");
    expect(API_BASE).toBe(dasar);
    const hasil = await hitungUlangAtap(payload);
    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe(`${dasar}/api/v1/simulate`);
    expect(opsi.method).toBe("POST");
    expect(opsi.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opsi.body)).toEqual(payload);
    expect(opsi.signal).toBeInstanceOf(AbortSignal);
    expect(hasil.id).toBe(simulasiContoh.id);
  });

  it.each([422, 500])("menolak respons HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    const { GalatSimulasi, hitungUlangAtap } = await import("../lib/api");
    await expect(hitungUlangAtap(payload)).rejects.toBeInstanceOf(GalatSimulasi);
  });

  it.each(["{}", "bukan JSON"])("menolak respons sukses dengan isi tidak valid: %s", async (isi) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(isi)));
    const { GalatSimulasi, hitungUlangAtap } = await import("../lib/api");
    await expect(hitungUlangAtap(payload)).rejects.toBeInstanceOf(GalatSimulasi);
  });

  it("mempertahankan galat koneksi agar layar dapat menampilkan keadaan luring", async () => {
    const galat = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(galat));
    const { hitungUlangAtap } = await import("../lib/api");
    await expect(hitungUlangAtap(payload)).rejects.toBe(galat);
  });

  it("membatasi waktu permintaan hingga 20 detik", async () => {
    const signal = AbortSignal.abort();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    const galat = new DOMException("Waktu habis", "TimeoutError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(galat));
    const { hitungUlangAtap } = await import("../lib/api");
    await expect(hitungUlangAtap(payload)).rejects.toBe(galat);
    expect(timeout).toHaveBeenCalledWith(20_000);
  });
});
