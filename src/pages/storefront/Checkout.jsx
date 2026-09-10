import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService } from '../../services';
import { RiArrowLeftLine, RiSecurePaymentLine } from 'react-icons/ri';
import { readCart, cartTotal } from './cart';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [cart, setCart] = useState(() => readCart(slug));
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (cart.length === 0) navigate(`/store/${slug}`, { replace: true });
  }, [cart, slug, navigate]);

  const total = cartTotal(cart);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function pay() {
    setErr('');
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setErr('Please fill in your name, email and phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await storefrontService.checkout(slug, {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customer: form,
      });
      // Redirect to Paystack hosted checkout; it returns to /store/:slug/success
      window.location.href = data.data.authorizationUrl;
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start payment. Please try again.');
      setSubmitting(false);
    }
  }

  const brand = store?.settings?.primaryColor || '#6366f1';

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
        <h1>Checkout</h1>

        <div className="sf-panel">
          <h2>Order Summary</h2>
          {cart.map((i) => (
            <div key={i.productId} className="sf-row">
              <span>{i.name} × {i.quantity}</span>
              <span>{naira(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="sf-row total"><span>Total</span><span>{naira(total)}</span></div>
        </div>

        <div className="sf-panel">
          <h2>Your Details</h2>
          <div className="sf-field">
            <label>Full name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="sf-field">
            <label>Email address *</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="sf-field">
            <label>Phone number *</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="sf-field">
            <label>Delivery address</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="sf-field">
            <label>Notes for the seller</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        {err && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: 12 }}>{err}</p>}

        <div className="sf-panel">
          <button className="sf-btn" disabled={submitting} onClick={pay}>
            {submitting ? 'Starting payment…' : `Pay ${naira(total)} with Paystack`}
          </button>
          <div className="sf-secure">
            <RiSecurePaymentLine /> Secured by Paystack · Cards, bank transfer &amp; USSD accepted
          </div>
        </div>
      </div>
    </div>
  );
}
