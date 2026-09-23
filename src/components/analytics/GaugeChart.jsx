// A circular progress gauge built with plain SVG (no extra chart library
// needed for a single arc) — color-coded green/yellow/red by value.
export default function GaugeChart({ value = 0, label, size = 140, goodAbove = 70, okAbove = 40 }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = pct >= goodAbove ? '#10b981' : pct >= okAbove ? '#f59e0b' : '#ef4444';

  return (
    <div className="gauge-chart" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={12} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.2} fontWeight="800" fill="var(--text-primary)">
          {Math.round(pct)}%
        </text>
      </svg>
      {label && <div className="gauge-label">{label}</div>}
    </div>
  );
}
