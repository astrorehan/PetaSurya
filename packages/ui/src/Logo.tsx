/*
 * Mark PetaSurya: matahari yang separuhnya tertutup bidang atap bergaris busbar.
 * Satu bentuk, terbaca di 16 px. Di ≤ 24 px garis busbar dilepas karena tidak
 * lagi terbaca. Jangan diputar, dimiringkan, atau diberi gradien.
 * Ruang kosong minimum di sekeliling = jari-jari matahari (9,5/48 dari sisi).
 */
export function Logo({
  size = 32,
  mono = false,
  label = "PetaSurya",
}: {
  size?: number;
  mono?: boolean;
  /** Kosongkan ("") bila logo berdampingan dengan wordmark, agar tidak dibaca dua kali. */
  label?: string;
}) {
  const dekoratif = label === "";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role={dekoratif ? undefined : "img"}
      aria-label={dekoratif ? undefined : label}
      aria-hidden={dekoratif || undefined}
      focusable="false"
    >
      <circle cx="24" cy="18" r="9.5" fill={mono ? "currentColor" : "var(--brand-surya)"} />
      <path
        d="M24 21 L45 41 H3 Z"
        fill={mono ? "currentColor" : "var(--brand-sel)"}
        stroke="var(--surface)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {size > 24 && (
        <g stroke="var(--brand-busbar)" strokeWidth="1.1" opacity=".55" fill="none">
          <path d="M13.5 32 H34.5" />
          <path d="M8.5 36.6 H39.5" />
          <path d="M24 21 V41" />
        </g>
      )}
    </svg>
  );
}
