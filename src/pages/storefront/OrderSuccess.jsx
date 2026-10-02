import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { storefrontService } from '../../services';
import { RiWhatsappLine } from 'react-icons/ri';
import { clearCart } from './cart';
import toast from 'react-hot-toast';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Paystack bank transfers / USSD can sit in "pending" for a while before the
// bank settles — keep checking for up to ~3 minutes before giving up.
const PENDING_POLL_MS = 4000;
const PENDING_MAX_TRIES = 45;

export default function OrderSuccess() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const directOrderNumber = params.get('order');
  const directEmail = params.get('email');
  const directMethod = params.get('method');

  // verifying | pending (bank still settling) | ok | unpaid (Paystack says no money received) | failed (couldn't confirm)
  const [state, setState] = useState('verifying');
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  // Direct orders (pay on delivery) — no Paystack round trip, just look the
  // order up the same way the tracking page does.
  useEffect(() => {
    if (!directOrderNumber || !directEmail) return;
    storefrontService.track(slug, directOrderNumber, directEmail)
      .then(({ data }) => { setOrder({ ...data.data, paymentMethod: directMethod || data.data.paymentMethod }); setState('ok'); clearCart(slug); })
      .catch((e) => { setState('failed'); setMessage(e.response?.data?.message || 'Could not find your order.'); });
  }, [slug, directOrderNumber, directEmail, directMethod]);

  // Paystack orders — the server asks Paystack directly whether this
  // reference was paid. The order (and the "confirmed" screen) only exists
  // once Paystack reports a successful charge; the cart is kept until then.
  useEffect(() => {
    if (directOrderNumber) return; // handled above
    if (!reference) { setState('failed'); setMessage('No payment reference found.'); return; }
    let tries = 0;
    let stop = false;
    let timer;

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
          const paymentStatus = e.response?.data?.paymentStatus;
          const msg = e.response?.data?.message;

          if (paymentStatus === 'pending' && tries < PENDING_MAX_TRIES) {
            setState('pending');
            timer = setTimeout(check, PENDING_POLL_MS);
          } else if (paymentStatus === 'failed' && tries >= 2) {
            // Checked twice — Paystack definitely has no successful charge.
            setState('unpaid');
            setMessage(msg || 'Payment was not completed. You have not been charged.');
          } else if (tries < 4 || paymentStatus === 'failed') {
            timer = setTimeout(check, 2500); // network blip / Paystack catching up
          } else {
            setState('failed');
            setMessage(msg || 'We could not confirm your payment yet.');
          }
        });
    };
    check();
    return () => { stop = true; clearTimeout(timer); };
  }, [slug, reference, directOrderNumber]);

  const brand = store?.settings?.primaryColor || '#6366f1';
  const waNumber = store?.contact?.phone?.replace(/\D/g, '') || '2349028361165';

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <div className="sf-page sf-success">
        {state === 'verifying' && (
          <>
            <div className="sf-success-icon">⏳</div>
            <h1>Confirming your payment…</h1>
            <p>We&apos;re checking with Paystack. This only takes a moment.</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="sf-success-icon">⏳</div>
            <h1>Waiting for your bank…</h1>
            <p>
              Paystack is still waiting for your bank to confirm this payment. Please keep this page open —
              your order will be confirmed automatically as soon as the money arrives.
            </p>
          </>
        )}

        {state === 'unpaid' && (
          <>
            <div className="sf-success-icon">❌</div>
            <h1>Payment not completed</h1>
            <p>{message}</p>
            <p style={{ fontSize: '0.85rem' }}>Your cart has been saved — you can go back and try again.</p>
            <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/store/${slug}/checkout?payment=failed`} className="sf-btn" style={{ width: 'auto', padding: '12px 22px', display: 'inline-block' }}>
                Try payment again
              </Link>
              <Link to={`/store/${slug}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px', display: 'inline-block' }}>
                Back to store
              </Link>
            </div>
          </>
        )}

        {state === 'ok' && order && (
          <>
            <div className="sf-success-icon">✅</div>
            <h1>Order placed successfully!</h1>
            <p>
              Your order <strong>{order.orderNumber}</strong> is confirmed.<br />
              You&apos;ll receive a confirmation email at <strong>{order.customer?.email || directEmail}</strong>.
            </p>

            <div className="sf-panel" style={{ marginTop: 20 }}>
              <h2>Order Summary</h2>
              {(order.items || []).map((i, idx) => (
                <div key={idx} className="sf-row">
                  <span>{i.name}{i.variant ? ` (${i.variant})` : ''} × {i.quantity}</span>
                  {i.price != null && <span>{naira(i.price * i.quantity)}</span>}
                </div>
              ))}
              <div className="sf-row total"><span>Total</span><span>{naira(order.total)}</span></div>
            </div>

            {order.paymentMethod === 'pay_on_delivery' && (
              <div className="sf-panel" style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>💵 Pay on Delivery</p>
                <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>Your order is confirmed. Pay <strong>{naira(order.total)}</strong> in cash when it's delivered.</p>
              </div>
            )}

            {order.paymentMethod === 'split_payment' && (
              <div className="sf-panel" style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>💰 Split Payment</p>
                <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>You've paid the first half online. The remaining balance is due on delivery.</p>
              </div>
            )}

            <div className="sf-panel" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>📦 Your order is being processed</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--sf-muted, #64748b)' }}>
                {store?.name || 'The seller'} will be in touch shortly about delivery.
              </p>
            </div>

            {order.trackingNumber && (
              <div className="sf-panel" style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>📦 Track your shipment</p>
                <p style={{ margin: '6px 0 10px', fontSize: '0.9rem' }}>
                  Track at: <strong>bislyai.com/track/{order.trackingNumber}</strong>
                </p>
                <button
                  className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 18px' }}
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${order.trackingNumber}`); toast.success('Tracking link copied!'); }}
                >
                  Copy Tracking Link
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/store/${slug}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }}>
                Continue Shopping
              </Link>
              {order.trackingNumber ? (
                <Link to={`/track/${order.trackingNumber}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }}>
                  Track Order
                </Link>
              ) : (
                <Link to={`/store/${slug}/track/${order.orderNumber}?email=${encodeURIComponent(order.customer?.email || directEmail || '')}`} className="sf-btn sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }}>
                  Track Order
                </Link>
              )}
              <a className="sf-wa" href={`https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(`Hi, about my order ${order.orderNumber}`)}`} target="_blank" rel="noreferrer">
                <RiWhatsappLine /> Chat with us
              </a>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="sf-success-icon">⚠️</div>
            <h1>Order not confirmed</h1>
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
