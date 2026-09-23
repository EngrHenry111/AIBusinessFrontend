import { RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// A KPI stat card with an optional % change badge and a tiny sparkline.
// `change` is a plain number (e.g. 12.4 for +12.4%) — omit it to hide the
// arrow/badge entirely (some KPIs, like "Outstanding Invoices", have no
// meaningful "growth" direction).
export default function KPICard({ label, value, change, sub, sparkline, color = '#6366f1' }) {
  const positive = change != null && change >= 0;
  return (
    <div className="kpi-card card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {change != null && (
          <span className={`kpi-change ${positive ? 'up' : 'down'}`}>
            {positive ? <RiArrowUpLine /> : <RiArrowDownLine />}{Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {sparkline?.length > 1 && (
        <div className="kpi-sparkline">
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={sparkline}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
