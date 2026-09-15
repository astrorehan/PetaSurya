// Generator kontrak: zod → JSON Schema (schema/kontrak.json) → pydantic
// (services/engine/app/contracts.py). Keluaran deterministik: nama diurutkan
// dan cap waktu dimatikan supaya menjalankan dua kali menghasilkan diff kosong.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { registri } from "../src/index.ts";

const akar = resolve(import.meta.dirname, "..");
const dirSkema = join(akar, "schema");
const dirEngine = resolve(akar, "..", "..", "services", "engine");
const berkasSkema = join(dirSkema, "kontrak.json");
const berkasPy = join(dirEngine, "app", "contracts.py");

// Registri zod memberi $ref antar-skema (HasilSimulasi → AsumsiSimulasi)
// alih-alih menyalin definisi. `io: "input"` = bentuk yang diterima API:
// field ber-default boleh kosong, properti tambahan (mis. "_catatan" pada
// fixture) tidak ditolak.
const reg = z.registry<{ id: string }>();
for (const nama of Object.keys(registri).sort()) reg.add(registri[nama], { id: nama });
const { schemas } = z.toJSONSchema(reg, {
  target: "draft-2020-12",
  io: "input",
  uri: (id) => `#/$defs/${id}`,
});

const defs: Record<string, unknown> = {};
for (const nama of Object.keys(schemas).sort()) {
  const { $schema: _s, $id: _i, ...isi } = schemas[nama] as Record<string, unknown>;
  defs[nama] = isi;
}
const dokumen = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://petasurya.id/schema/kontrak.json",
  $defs: defs,
};

mkdirSync(dirSkema, { recursive: true });
writeFileSync(berkasSkema, JSON.stringify(dokumen, null, 2) + "\n");
console.log(`gen:contracts: ${Object.keys(defs).length} skema → ${berkasSkema}`);

// Di CI `uv` ada di PATH; di mesin Windows pengembang hanya `python -m uv`.
const uv = spawnSync("uv", ["--version"], { stdio: "ignore" }).status === 0
  ? ["uv"]
  : ["python", "-m", "uv"];
const hasil = spawnSync(
  uv[0],
  [
    ...uv.slice(1), "run", "--project", dirEngine, "datamodel-codegen",
    "--input", berkasSkema,
    "--input-file-type", "jsonschema",
    "--output", berkasPy,
    "--output-model-type", "pydantic_v2.BaseModel",
    "--target-python-version", "3.12",
    "--use-standard-collections",
    "--use-union-operator",
    "--use-schema-description",
    "--use-field-description",
    "--field-constraints",
    "--use-double-quotes",
    "--collapse-root-models",
    "--formatters", "ruff-check", "ruff-format",
    "--custom-formatters", "kontrak_formatter",
    "--disable-timestamp",
    "--custom-file-header", "# Dihasilkan `pnpm gen:contracts` dari packages/contracts. Jangan disunting tangan.",
  ],
  {
    stdio: "inherit",
    cwd: dirEngine,
    // kontrak_formatter.py membuang model akar kosong; lihat berkasnya.
    env: { ...process.env, PYTHONPATH: join(dirEngine, "scripts") },
  },
);
if (hasil.status !== 0) {
  console.error("gen:contracts: datamodel-codegen gagal");
  process.exit(hasil.status ?? 1);
}
console.log(`gen:contracts: pydantic → ${berkasPy}`);
