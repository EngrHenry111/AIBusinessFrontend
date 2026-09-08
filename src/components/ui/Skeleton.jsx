import './Skeleton.css';

/**
 * Reusable pulse-animated placeholders.
 *   <SkeletonLine width="60%" />
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} cols={4} />
 *   <SkeletonAvatar size={40} />
 */

export function SkeletonLine({ width = '100%', height = 12, style }) {
  return <div className="sk sk-line" style={{ width, height, ...style }} />;
}

export function SkeletonAvatar({ size = 40 }) {
  return <div className="sk sk-avatar" style={{ width: size, height: size }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="sk-card">
      <div className="sk-card-head">
        <SkeletonAvatar size={38} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="45%" height={13} />
          <SkeletonLine width="70%" height={10} style={{ marginTop: 8 }} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={`${90 - i * 12}%`} style={{ marginTop: 12 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="sk-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="sk-row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? '30%' : `${60 + ((r + c) % 3) * 10}%`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default SkeletonCard;
