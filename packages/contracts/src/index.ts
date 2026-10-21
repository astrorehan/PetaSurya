import type { ZodType } from "zod";
import { HasilAgregasi, PermintaanAgregasi, RingkasanAgregasi, SumberAgregasi, UrutanAgregasi, WilayahAgregasi } from "./agregasi.ts";
import { AnalisisAtap, CitraAnalisis, MetodeAnalisis, TipeAtap } from "./analisis.ts";
import { BangunanRingkas, PerkiraanJenis, SumberBangunan } from "./bangunan.ts";
import { FootprintArea, PerkiraanRumah, PermintaanFootprintArea } from "./footprint.ts";
import { GalatApi, KodeGalat } from "./galat.ts";
import { MultiPolygonGeoJSON, PolygonGeoJSON } from "./geojson.ts";
import { BingkaiPemindaian, PaketPemindaian, TilePemindaian } from "./pemindaian.ts";
import {
  AsumsiSimulasi,
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
  HasilSimulasi,
  SumberBangunan,
  PerkiraanJenis,
  BangunanRingkas,
  PermintaanFootprintArea,
  PerkiraanRumah,
  FootprintArea,
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
};
