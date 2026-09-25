"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { Tombol } from "@petasurya/ui";
import { Kode } from "./Lembar";
import g from "./ikonGerak.module.css";

/** Peraga durasi: tiga balok menempuh jalur yang sama dengan --ease-out. */
export function DemoGerak({ baris }: { baris: { token: string; ms: string; tugas: string }[] }) {
  const [ujung, setUjung] = useState(false);

  return (
    <div className={g.demo}>
      <ol className={g.durasi}>
        {baris.map((b) => (
          <li key={b.token} className={g.durasiBaris}>
            <span className={g.durasiNama}>
              <Kode>{b.token}</Kode>
              <span className="num">{b.ms.replace("ms", " ms")}</span>
            </span>
            <span className={g.durasiTugas}>{b.tugas}</span>
            <span className={g.jalur} aria-hidden="true">
              <span className={g.balok} data-ujung={ujung || undefined} style={{ transitionDuration: `var(${b.token})` }} />
            </span>
          </li>
        ))}
      </ol>
      <div>
        <Tombol ikon={Play} onClick={() => setUjung((u) => !u)}>
          Jalankan
        </Tombol>
      </div>
    </div>
  );
}
