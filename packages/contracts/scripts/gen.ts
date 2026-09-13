// Generator kontrak: zod → JSON Schema (schema/*.json) → pydantic.
// Keluaran deterministik: nama diurutkan agar diff kosong saat dijalankan ulang.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { registri } from "../src/index.ts";

const outDir = join(import.meta.dirname, "..", "schema");
mkdirSync(outDir, { recursive: true });

const nama = Object.keys(registri).sort();
for (const n of nama) {
  const skema = z.toJSONSchema(registri[n], { target: "draft-2020-12" });
  writeFileSync(join(outDir, `${n}.json`), JSON.stringify(skema, null, 2) + "\n");
}
console.log(`gen:contracts: ${nama.length} skema ditulis ke ${outDir}`);
