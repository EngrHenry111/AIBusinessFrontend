// A simple conversion funnel — each stage's bar width is proportional to its
// count relative to the first (widest) stage, with the drop-off % shown
// between consecutive stages.
const GRADIENT = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];

export default function FunnelChart({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="funnel-chart">
      {stages.map((s, i) => {
        const widthPct = Math.max(8, Math.round((s.count / max) * 100));
        const prev = stages[i - 1];
        const dropPct = prev && prev.count ? Math.round((s.count / prev.count) * 100) : null;
        return (
          <div key={s.label} className="funnel-row">
            {dropPct != null && <div className="funnel-connector">{dropPct}% →</div>}
            <div className="funnel-bar-track">
              <div className="funnel-bar" style={{ width: `${widthPct}%`, background: GRADIENT[i % GRADIENT.length] }}>
                <span className="funnel-bar-label">{s.label}</span>
                <span className="funnel-bar-count">{s.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
