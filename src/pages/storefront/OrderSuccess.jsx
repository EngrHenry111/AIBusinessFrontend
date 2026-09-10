import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { storefrontService } from '../../services';
import { RiWhatsappLine } from 'react-icons/ri';
import { clearCart } from './cart';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function OrderSuccess() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');

  const [state, setState] = useState('verifying'); // verifying | ok | failed
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!reference) { setState('failed'); setMessage('No payment reference found.'); return; }
    let tries = 0;
    let stop = false;

    const check = () => {
      storefrontService.verifyPayment(slug, reference)
        .then(({ data }) => {
          if (stop) return;
          setOrder(data.data.order);
          setState('ok');
          clearCart(slug);
        })
        .catch((e) => {
          if (stop) return;
          tries += 1;
          if (tries < 4) {
            setTimeout(check, 2500); // webhook may still be catching up
          } else {
            setState('failed');
            setMessage(e.response?.data?.message || 'We could not confirm your payment yet.');
          }
        });
    };
    check();
    return () => { stop = true; };
  }, [slug, reference]);

  const brand = store?.settings?.primaryColor || '#6366f1';
  const waNumber = '2349028361165';

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <div className="sf-page sf-success">
        {state === 'verifying' && (
          <>
            <div className="sf-success-icon">⏳</div>
            <h1>Confirming your payment…</h1>
            <p>This only takes a moment.</p>
          </>
        )}

        {state === 'ok' && order && (
          <>
            <div className="sf-success-icon">✅</div>
            <h1>Order placed successfully!</h1>
            <p>
              Your order <strong>{order.orderNumber}</strong> is confirmed.<br />
              You&apos;ll receive a confirmation email at <strong>{order.customer?.email}</strong>.
            </p>

            <div className="sf-panel" style={{ marginTop: 20 }}>
              <h2>Order Summary</h2>
              {(order.items || []).map((i, idx) => (
                <div key={idx} className="sf-row">
                  <span>{i.name} × {i.quantity}</span>
                  <span>{naira(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="sf-row total"><span>Total paid</span><span>{naira(order.total)}</span></div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/store/${slug}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }}>
                Continue Shopping
              </Link>
              <a className="sf-wa" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, about my order ${order.orderNumber}`)}`} target="_blank" rel="noreferrer">
                <RiWhatsappLine /> Chat with us
              </a>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="sf-success-icon">⚠️</div>
            <h1>Payment not confirmed</h1>
            <p>{message}</p>
            <p style={{ fontSize: '0.85rem' }}>
              If you were charged, your order will still be processed — you&apos;ll get an email shortly.
            </p>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to={`/store/${slug}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px', display: 'inline-block' }}>
                Back to store
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
