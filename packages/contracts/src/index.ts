import type { ZodType } from "zod";
import { HasilAlamat, KecocokanBangunan, PencarianAlamat, PermintaanAlamat } from "./alamat.ts";
import { HasilAgregasi, PermintaanAgregasi, RingkasanAgregasi, SumberAgregasi, UrutanAgregasi, WilayahAgregasi } from "./agregasi.ts";
import { AnalisisAtap, CitraAnalisis, MetodeAnalisis, TipeAtap } from "./analisis.ts";
import { BangunanRingkas, PerkiraanJenis, SumberBangunan } from "./bangunan.ts";
import { AreaDimuat, FootprintArea, JenisSumberFootprint, PerkiraanRumah, PermintaanFootprintArea } from "./footprint.ts";
import { GalatApi, KodeGalat } from "./galat.ts";
import { MultiPolygonGeoJSON, PolygonGeoJSON } from "./geojson.ts";
import { BingkaiPemindaian, PaketPemindaian, TilePemindaian } from "./pemindaian.ts";
import { InfoWilayah, PermintaanWilayah, StatusFaktorEmisi } from "./wilayah.ts";
import {
  AsumsiSimulasi,
  CuacaSimulasi,
  DerateSimulasi,
  HasilSimulasi,
  JejakDerate,
  JejakRumus,
  JejakSimulasi,
  ModulSimulasi,
  ParameterFisika,
} from "./simulasi.ts";

export * from "./analisis.ts";
export * from "./bangunan.ts";
export * from "./galat.ts";
export * from "./geojson.ts";
export * from "./simulasi.ts";
export * from "./pemindaian.ts";
export * from "./agregasi.ts";
export * from "./footprint.ts";
export * from "./alamat.ts";
export * from "./wilayah.ts";

// Registri skema yang di-generate ke JSON Schema lalu pydantic.
// Kunci = nama kelas di sisi Python (services/engine/app/contracts.py).
export const registri: Record<string, ZodType> = {
  PolygonGeoJSON,
  MultiPolygonGeoJSON,
  AsumsiSimulasi,
  ModulSimulasi,
  DerateSimulasi,
  ParameterFisika,
  JejakRumus,
  JejakDerate,
  JejakSimulasi,
  CuacaSimulasi,
  HasilSimulasi,
  SumberBangunan,
  PerkiraanJenis,
  BangunanRingkas,
  PermintaanFootprintArea,
  PerkiraanRumah,
  JenisSumberFootprint,
  AreaDimuat,
  FootprintArea,
  PermintaanAlamat,
  KecocokanBangunan,
  HasilAlamat,
  PencarianAlamat,
  TipeAtap,
  MetodeAnalisis,
  CitraAnalisis,
  AnalisisAtap,
  KodeGalat,
  GalatApi,
  BingkaiPemindaian,
  PaketPemindaian,
  TilePemindaian,
  HasilAgregasi,
  PermintaanAgregasi,
  RingkasanAgregasi,
  SumberAgregasi,
  UrutanAgregasi,
  WilayahAgregasi,
  PermintaanWilayah,
  StatusFaktorEmisi,
  InfoWilayah,
};
