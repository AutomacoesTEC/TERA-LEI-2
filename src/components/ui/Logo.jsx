export default function Logo() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a853" />
          <stop offset="100%" stopColor="#f5d98a" />
        </linearGradient>
      </defs>
      <rect width={36} height={36} rx={10} fill="url(#lg)" />
      <text x={18} y={25} textAnchor="middle" fill="#0c0e12" fontWeight={800} fontSize={20} fontFamily="'Segoe UI',sans-serif">T</text>
    </svg>
  );
}
