export const Ic = ({ d, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const IC = {
  up: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  bk: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  tg: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",
  sd: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  tr: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  br: "M9.5 2a3.5 3.5 0 0 0-3.19 4.94A3.5 3.5 0 0 0 4 10.5a3.5 3.5 0 0 0 1.98 3.15A3.5 3.5 0 0 0 8.5 18h1a.5.5 0 0 0 .5-.5V2.5a.5.5 0 0 0-.5-.5z",
  bl: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  lk: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  sc: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  ls: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  rf: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  sr: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
};

export const Sp = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--gold)"
    strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
  </svg>
);
