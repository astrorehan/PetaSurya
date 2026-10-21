"use client";

import { Play } from "lucide-react";
import { useId, useState } from "react";
import { Tombol } from "@petasurya/ui";
import { Kode } from "./Lembar";
import g from "./ikonGerak.module.css";

/** Peraga durasi: tiga balok menempuh jalur yang sama dengan --ease-out. */
export function DemoGerak({ baris }: { baris: { token: string; ms: string; tugas: string }[] }) {
  const [ujung, setUjung] = useState(false);
  const [kurva, setKurva] = useState("--ease-out");
  const id = useId();

  return (
    <div className={g.demo}>
      <label className={g.pilihKurva} htmlFor={id}>Kurva gerak
        <select id={id} aria-label="Kurva gerak" value={kurva} onChange={(e) => setKurva(e.target.value)}>
          <option value="--ease-out">Standard</option>
          <option value="--ease-enter">Enter</option>
          <option value="--ease-exit">Exit</option>
          <option value="--ease-in-out">In / out</option>
        </select>
      </label>
      <ol className={g.durasi}>
        {baris.map((b) => (
          <li key={b.token} className={g.durasiBaris}>
            <span className={g.durasiNama}>
              <Kode>{b.token}</Kode>
              <span className="num">{b.ms.replace("ms", " ms")}</span>
            </span>
            <span className={g.durasiTugas}>{b.tugas}</span>
            <span className={g.jalur} aria-hidden="true">
              <span className={g.balok} data-ujung={ujung || undefined} style={{ transitionDuration: `var(${b.token})`, transitionTimingFunction: `var(${kurva})` }} />
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
