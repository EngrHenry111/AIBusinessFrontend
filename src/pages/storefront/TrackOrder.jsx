import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { deliveryService } from '../../services';
import { RiCheckLine, RiTimeLine, RiStore2Line, RiSearchLine } from 'react-icons/ri';
import './Store.css';

const STAGES = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
const STAGE_LABELS = {
  pending: 'Order Placed', picked_up: 'Picked Up', in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
};
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export default function TrackOrder() {
  const { trackingNumber: paramNumber } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(paramNumber || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(paramNumber));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paramNumber) return;
    setLoading(true);
    setError('');
    deliveryService.track(paramNumber)
      .then(({ data: r }) => setData(r.data))
      .catch((e) => { setData(null); setError(e.response?.data?.message || 'No shipment found for this tracking number.'); })
      .finally(() => setLoading(false));
  }, [paramNumber]);

  function submit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    navigate(`/track/${input.trim()}`);
  }

  const failedOrReturned = data && ['failed', 'returned'].includes(data.status);
  const currentStageIdx = data ? STAGES.indexOf(data.status) : -1;

  return (
    <div className="sf" style={{ '--sf-brand': '#6366f1' }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to="/" className="sf-brand" style={{ fontSize: '1rem' }}><RiStore2Line /> BizlyAI</Link>
        </div>
      </header>

      <div className="sf-page">
        <h1>Track Your Order</h1>
        <p className="muted" style={{ marginTop: -14, color: 'var(--sf-muted)' }}>Enter your tracking number — no account needed.</p>

        <form className="sf-panel" onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div className="sf-field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Tracking Number</label>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. BIZLY-TRK-0001" />
          </div>
          <button className="sf-btn" style={{ width: 'auto', padding: '10px 20px' }} disabled={loading}>
            <RiSearchLine /> {loading ? 'Searching…' : 'Track'}
          </button>
        </form>

        {error && <p className="co-error">{error}</p>}

        {data && (
          <div className="sf-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {data.storeLogo ? <img src={data.storeLogo} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} /> : <RiStore2Line />}
              <div>
                <h2 style={{ margin: 0 }}>{data.orderNumber || data.trackingNumber}</h2>
                {data.storeName && <p className="muted" style={{ margin: 0, color: 'var(--sf-muted)', fontSize: 13 }}>{data.storeName} · via {data.provider}</p>}
              </div>
            </div>

            {failedOrReturned ? (
              <p className="co-error" style={{ textTransform: 'capitalize' }}>Delivery {data.status}. Contact the store for help.</p>
            ) : (
              <div className="ot-timeline">
                {STAGES.map((s, i) => {
                  const done = i <= currentStageIdx;
                  const event = data.history.find((h) => h.status === s);
                  return (
                    <div key={s} className={`ot-stage ${done ? 'done' : ''}`}>
                      <span className="ot-stage-icon">{done ? <RiCheckLine /> : <RiTimeLine />}</span>
                      <div>
                        <strong>{STAGE_LABELS[s]}</strong>
                        {event && <p>{event.location ? `${event.location} · ` : ''}{fmtDate(event.timestamp)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data.estimatedDelivery && !data.deliveredAt && (
              <div className="sf-row" style={{ marginTop: 16 }}><span>Estimated delivery</span><span>{fmtDate(data.estimatedDelivery)}</span></div>
            )}
            {data.deliveredAt && (
              <div className="sf-row" style={{ marginTop: 16 }}><span>Delivered</span><span>{fmtDate(data.deliveredAt)}</span></div>
            )}

            {data.storeSlug && (
              <Link to={`/store/${data.storeSlug}`} className="sf-btn-ghost" style={{ display: 'inline-block', marginTop: 16, textAlign: 'center', textDecoration: 'none' }}>
                Contact Store / Continue Shopping
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
