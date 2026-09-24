import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { storefrontService, subscriptionPlanService, storeCustomerService } from '../../services';
import { getStoreToken } from './storeAuth';
import { RiArrowLeftLine, RiCheckLine, RiSecurePaymentLine, RiBox3Line, RiBankCardLine, RiTruckLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Store.css';
import './Subscribe.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const INTERVAL_LABEL = { daily: 'day', weekly: 'week', biweekly: '2 weeks', monthly: 'month', quarterly: 'quarter' };
const STEPS = ['Confirm Plan', 'Delivery Details', 'Payment', 'Review'];

export default function Subscribe() {
  const { slug, planId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = getStoreToken(slug);

  const [store, setStore] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null); // set on success

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  useEffect(() => {
    if (!token) {
      navigate(`/store/${slug}/login?redirect=${encodeURIComponent(`/store/${slug}/subscribe/${planId}`)}`, { replace: true });
      return;
    }
    Promise.all([
      storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)),
      subscriptionPlanService.getPublic(slug).then(({ data }) => setPlan((data.data || []).find((p) => p._id === planId) || null)),
      storeCustomerService.getMe(slug, token).then(({ data }) => {
        setName(data.data.name || '');
        setPhone(data.data.phone || '');
        setAddress(data.data.addresses?.find((a) => a.isDefault)?.address || data.data.addresses?.[0]?.address || '');
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, planId, token]);

  // Returning from Paystack with ?ref=<reference>
  useEffect(() => {
    const ref = params.get('ref');
    if (!ref || !token) return;
    subscriptionPlanService.verify(slug, token, ref)
      .then(({ data }) => setResult(data.data.subscription))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not confirm your subscription'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, token]);

  async function submit() {
    setErr('');
    if (!address.trim()) return setErr('A delivery address is required.');
    setSubmitting(true);
    try {
      const { data } = await subscriptionPlanService.subscribe(slug, token, {
        planId, paymentMethod, startDate: new Date(startDate).toISOString(),
        customerDetails: { name, phone, address },
      });
      if (data.data.directSubscribe) {
        setResult(data.data.subscription);
      } else {
        window.location.href = data.data.authorizationUrl;
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not start your subscription. Please try again.');
      setSubmitting(false);
    }
  }

  const brand = store?.settings?.primaryColor || '#7c3aed';
  const total = plan ? plan.price + (plan.deliveryFee || 0) : 0;

  if (loading) {
    return <div className="sf sub-page" style={{ '--sf-brand': brand }}><div className="sf-page"><p className="sub-loading">Loading…</p></div></div>;
  }

  if (result) {
    return (
      <div className="sf sub-page" style={{ '--sf-brand': brand }}>
        <div className="sf-page sub-success">
          <div className="sub-success-icon">🎉</div>
          <h1>You're subscribed!</h1>
          <p className="sub-success-name">{result.name}</p>
          <p>Your first delivery: <strong>{new Date(result.nextDeliveryDate <= new Date().toISOString() ? (result.lastDeliveryDate || result.startDate) : result.nextDeliveryDate).toLocaleDateString()}</strong></p>
          <p className="muted">We'll notify you by email before each delivery.</p>
          <div className="sub-success-actions">
            <Link to={`/store/${slug}/account?tab=subscriptions`} className="sf-btn-ghost">View My Subscriptions</Link>
            <Link to={`/store/${slug}`} className="sf-btn">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="sf sub-page" style={{ '--sf-brand': brand }}>
        <div className="sf-page"><p>This subscription plan is no longer available.</p><Link to={`/store/${slug}/subscriptions`} className="sf-btn">View Plans</Link></div>
      </div>
    );
  }

  return (
    <div className="sf sub-page" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}/subscriptions`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to plans
          </Link>
        </div>
      </header>

      <div className="sf-page sub-layout">
        <div className="sub-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`sub-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="sub-step-dot">{i < step ? <RiCheckLine /> : i + 1}</span>
              <span className="sub-step-label">{s}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="sf-panel">
            <h2><RiBox3Line style={{ verticalAlign: '-3px' }} /> {plan.name}</h2>
            {plan.description && <p className="muted">{plan.description}</p>}
            <ul className="sub-items">{plan.items.map((it, i) => <li key={i}>{it.quantity}× {it.name}</li>)}</ul>
            <div className="sub-price-row">
              <span className="sub-price">{naira(plan.price)}</span> / {INTERVAL_LABEL[plan.interval] || plan.interval}
              {plan.deliveryFee > 0 && <span className="muted"> + {naira(plan.deliveryFee)} delivery</span>}
            </div>
            {plan.trialDays > 0 && <p className="sub-trial-note">Your first delivery ships right away — your next charge is delayed by {plan.trialDays} extra day{plan.trialDays > 1 ? 's' : ''} as a welcome bonus.</p>}
            <button className="sf-btn" onClick={() => setStep(1)}>Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="sf-panel">
            <h2>Delivery Details</h2>
            <div className="sf-field"><label>Full name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="sf-field"><label>Phone *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="sf-field"><label>Delivery address *</label><textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="sf-field">
              <label>Start date</label>
              <input type="date" className="sf-field-input" min={new Date().toISOString().slice(0, 10)} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {err && <p className="co-error">{err}</p>}
            <div className="sub-step-actions">
              <button className="sf-btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button className="sf-btn" onClick={() => { if (!name.trim() || !phone.trim() || !address.trim()) return setErr('All fields are required.'); setErr(''); setStep(2); }}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="sf-panel">
            <h2>Payment Method</h2>
            <div className="sub-pay-options">
              <button type="button" className={`sub-pay-opt ${paymentMethod === 'paystack' ? 'active' : ''}`} onClick={() => setPaymentMethod('paystack')}>
                <RiBankCardLine /> Card (auto-renews each {INTERVAL_LABEL[plan.interval] || plan.interval})
              </button>
              {store?.deliverySettings?.podEnabled && (
                <button type="button" className={`sub-pay-opt ${paymentMethod === 'pay_on_delivery' ? 'active' : ''}`} onClick={() => setPaymentMethod('pay_on_delivery')}>
                  <RiTruckLine /> Pay on delivery, each time
                </button>
              )}
            </div>
            {paymentMethod === 'paystack' && <p className="muted sub-pay-note">Your card is charged {naira(total)} now, then automatically every {INTERVAL_LABEL[plan.interval] || plan.interval} — cancel anytime.</p>}
            <div className="sub-step-actions">
              <button className="sf-btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="sf-btn" onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="sf-panel">
            <h2>Review &amp; Confirm</h2>
            <div className="sub-review-row"><span>Plan</span><strong>{plan.name}</strong></div>
            <div className="sub-review-row"><span>Deliver to</span><strong>{address}</strong></div>
            <div className="sub-review-row"><span>Start date</span><strong>{new Date(startDate).toLocaleDateString()}</strong></div>
            <div className="sub-review-row"><span>Payment</span><strong>{paymentMethod === 'paystack' ? 'Card (auto-renew)' : 'Pay on delivery'}</strong></div>
            <div className="sub-review-row sub-review-total"><span>Total per delivery</span><strong>{naira(total)}</strong></div>
            {err && <p className="co-error">{err}</p>}
            <div className="sub-step-actions">
              <button className="sf-btn-ghost" onClick={() => setStep(2)} disabled={submitting}>Back</button>
              <button className="sf-btn" onClick={submit} disabled={submitting}>
                {submitting ? 'Please wait…' : 'Start Subscription'}
              </button>
            </div>
            <div className="sf-secure"><RiSecurePaymentLine /> Secured by Paystack</div>
          </div>
        )}
      </div>
    </div>
  );
}
