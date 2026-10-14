import { useId } from "react";

/* Mark Surya: kepala atap mengintip dari sudut, dengan matahari di balik bubungan. */
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
  const id = useId().replace(/:/g, "");
  const kepala = "M8 29C8 25.8 9.2 23.8 11.7 21.4L20.4 13C22.4 11 25.6 11 27.6 13L36.3 21.4C38.8 23.8 40 25.8 40 29V35C40 38.6 37.4 41 34 41H14C10.6 41 8 38.6 8 35Z";
  const mata = (
    <>
      <rect x="16.5" y="24.5" width="5.5" height="10" rx="2.75" />
      <rect x="26.5" y="24.5" width="4.5" height="8.5" rx="2.25" />
    </>
  );
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
      <defs>
        <clipPath id={`bingkai-${id}`}><rect width="48" height="48" rx="11" /></clipPath>
        <linearGradient id={`dasar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--brand-icon-top)" />
          <stop offset="1" stopColor="var(--brand-icon-bottom)" />
        </linearGradient>
        <linearGradient id={`kepala-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--brand-icon-face)" />
          <stop offset="1" stopColor="var(--brand-icon-shade)" />
        </linearGradient>
        <mask id={`siluet-${id}`}>
          <path d={kepala} fill="white" />
          <g fill="black">{mata}</g>
        </mask>
      </defs>
      <g clipPath={`url(#bingkai-${id})`}>
        {!mono && <rect width="48" height="48" rx="11" fill={`url(#dasar-${id})`} />}
        <g transform="translate(21 25) rotate(-25) scale(1.5) translate(-24 -26)">
          <circle cx="24" cy="11" r="5" fill={mono ? "currentColor" : "var(--brand-amber)"} />
          <path d={kepala} fill={mono ? "currentColor" : `url(#kepala-${id})`} mask={mono ? `url(#siluet-${id})` : undefined} />
          {!mono && <g fill="var(--brand-icon-eye)">{mata}</g>}
        </g>
        {!mono && <rect x="0.5" y="0.5" width="47" height="47" rx="10.5" fill="none" stroke="var(--brand-hairline)" />}
      </g>
    </svg>
  );
}
