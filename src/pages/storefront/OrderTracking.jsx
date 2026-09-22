import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService } from '../../services';
import { RiArrowLeftLine, RiCheckLine, RiTimeLine } from 'react-icons/ri';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

const STAGES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const STAGE_LABELS = { pending: 'Order Placed', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };

export default function OrderTracking() {
  const { slug, orderNumber: orderNumberParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [orderNumber, setOrderNumber] = useState(orderNumberParam || params.get('order') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [store, setStore] = useState(null);

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (orderNumberParam && params.get('email')) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(e) {
    e?.preventDefault();
    if (!orderNumber.trim() || !email.trim()) { setError('Enter both your order number and email.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await storefrontService.track(slug, orderNumber.trim(), email.trim());
      setOrder(data.data);
    } catch (e2) {
      setOrder(null);
      setError(e2.response?.data?.message || 'Could not find that order.');
    } finally {
      setLoading(false);
    }
  }

  const brand = store?.settings?.primaryColor || '#6366f1';
  const isCancelled = order && ['cancelled', 'refunded'].includes(order.status);
  const currentStageIdx = order ? STAGES.indexOf(order.status) : -1;

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
        </div>
      </header>

      <div className="sf-page">
        <h1>Track Your Order</h1>

        <form className="sf-panel" onSubmit={lookup}>
          <div className="sf-field"><label>Order Number</label><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-00001" /></div>
          <div className="sf-field"><label>Email used for this order</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {error && <p className="co-error">{error}</p>}
          <button className="sf-btn" disabled={loading}>{loading ? 'Searching…' : 'Track Order'}</button>
        </form>

        {order && (
          <div className="sf-panel">
            <h2>Order {order.orderNumber}</h2>
            {isCancelled ? (
              <p className="co-error">This order was {order.status}.</p>
            ) : (
              <div className="ot-timeline">
                {STAGES.map((s, i) => {
                  const done = i <= currentStageIdx;
                  return (
                    <div key={s} className={`ot-stage ${done ? 'done' : ''}`}>
                      <span className="ot-stage-icon">{done ? <RiCheckLine /> : <RiTimeLine />}</span>
                      <div>
                        <strong>{STAGE_LABELS[s]}</strong>
                        {s === 'shipped' && order.trackingNumber && done && <p>Tracking: {order.trackingNumber}{order.carrier ? ` · ${order.carrier}` : ''}</p>}
                        {s === 'delivered' && order.deliveredAt && done && <p>{fmtDate(order.deliveredAt)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="sf-row" style={{ marginTop: 16 }}><span>Payment</span><span>{order.paymentStatus} · {order.paymentMethod}</span></div>
            <div className="sf-row"><span>Total</span><span>{naira(order.total)}</span></div>
            {order.estimatedDelivery && <div className="sf-row"><span>Estimated delivery</span><span>{fmtDate(order.estimatedDelivery)}</span></div>}

            <h3 style={{ marginTop: 16, fontSize: '0.95rem' }}>Items</h3>
            {order.items.map((i, idx) => (
              <div key={idx} className="sf-row"><span>{i.name}{i.variant ? ` (${i.variant})` : ''} × {i.quantity}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
