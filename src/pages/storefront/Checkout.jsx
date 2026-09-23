import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService, couponService, storeCustomerService } from '../../services';
import { RiArrowLeftLine, RiArrowRightLine, RiSecurePaymentLine, RiCoinLine, RiTruckLine, RiBankCardLine, RiWallet3Line } from 'react-icons/ri';
import { readCart, cartTotal, setQty, removeItem, writeCart } from './cart';
import { getStoreToken } from './storeAuth';
import { getCartSessionId } from './cartSession';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const STEPS = ['Cart', 'Details', 'Delivery', 'Payment', 'Confirm'];
const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja',
];

function computeDeliveryFee(ds, subtotal, state) {
  if (!ds) return 0;
  if (ds.freeDeliveryMinimum != null && subtotal >= ds.freeDeliveryMinimum) return 0;
  if (state && ds.feesByState?.[state] != null) return ds.feesByState[state];
  return ds.defaultFee ?? 2000;
}

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [store, setStore] = useState(null);
  const [cart, setCart] = useState(() => readCart(slug));
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [loyalty, setLoyalty] = useState(null);
  const [usePoints, setUsePoints] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  // Pre-fill from the shopper's account, if they're logged in on this store.
  useEffect(() => {
    const token = getStoreToken(slug);
    if (!token) return;
    storeCustomerService.getMe(slug, token).then(({ data }) => {
      const c = data.data;
      setForm((f) => ({ ...f, name: f.name || c.name, email: f.email || c.email, phone: f.phone || c.phone || '' }));
      setSavedAddresses(c.addresses || []);
      const def = (c.addresses || []).find((a) => a.isDefault) || c.addresses?.[0];
      if (def) setForm((f) => ({ ...f, address: f.address || def.address, city: f.city || def.city, state: f.state || def.state }));
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (cart.length === 0) navigate(`/store/${slug}`, { replace: true });
  }, [cart, slug, navigate]);

  useEffect(() => {
    if (!EMAIL_RE.test(form.email.trim())) { setLoyalty(null); setUsePoints(false); return; }
    let alive = true;
    const t = setTimeout(() => {
      storefrontService.getLoyaltyStatus(slug, form.email.trim())
        .then(({ data }) => { if (alive) setLoyalty(data.data); })
        .catch(() => { if (alive) setLoyalty(null); });
    }, 600);
    return () => { alive = false; clearTimeout(t); };
  }, [form.email, slug]);

  // Save the cart as "abandoned" once the shopper has entered a valid email —
  // if they leave before paying, a reminder email can bring them back. Kept
  // in sync (debounced) as the cart or their details change afterward.
  useEffect(() => {
    if (!EMAIL_RE.test(form.email.trim()) || cart.length === 0) return;
    const t = setTimeout(() => {
      storefrontService.saveAbandonedCart(slug, {
        sessionId: getCartSessionId(slug),
        email: form.email.trim(),
        name: form.name,
        phone: form.phone,
        items: cart.map((i) => ({
          productId: i.productId, name: i.name, image: i.image, price: i.price,
          quantity: i.quantity, variantGroup: i.variantGroup, variantValue: i.variantValue,
        })),
        total: cartTotal(cart),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [form.email, form.name, form.phone, cart, slug]);

  const sync = (next) => { setCart(next); writeCart(slug, next); };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const subtotal = cartTotal(cart);
  const deliveryFee = useMemo(() => computeDeliveryFee(store?.deliverySettings, subtotal, form.state), [store, subtotal, form.state]);
  const couponDiscount = coupon?.discount || 0;
  const preLoyaltyTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);
  const canRedeem = loyalty?.enabled && loyalty.points >= loyalty.minimumRedemption && loyalty.redeemableValue > 0;
  const loyaltyDiscount = usePoints && canRedeem ? Math.min(loyalty.redeemableValue, preLoyaltyTotal - 1) : 0;
  const total = Math.max(0, preLoyaltyTotal - loyaltyDiscount);

  const ds = store?.deliverySettings;
  const podAvailable = ds?.podEnabled && total <= (ds?.podMaxAmount ?? 50000);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const { data } = await couponService.validate(slug, couponInput.trim(), subtotal + deliveryFee);
      setCoupon({ code: data.data.code, discount: data.data.discount });
    } catch (e) {
      setCoupon(null);
      setCouponError(e.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponChecking(false);
    }
  }

  function validateStep() {
    if (step === 1) {
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() || !form.state) {
        setErr('Please fill in your name, email, phone, address and delivery state.');
        return false;
      }
      if (!EMAIL_RE.test(form.email.trim())) { setErr('Enter a valid email address.'); return false; }
    }
    if (step === 3 && paymentMethod === 'pay_on_delivery' && !podAvailable) {
      setErr('Pay on delivery is not available for this order.');
      return false;
    }
    setErr('');
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() { setErr(''); setStep((s) => Math.max(0, s - 1)); }

  async function placeOrder() {
    if (!termsAccepted) return setErr('Please accept the terms to continue.');
    setErr('');
    setSubmitting(true);
    try {
      const { data } = await storefrontService.checkout(slug, {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, variantGroup: i.variantGroup, variantValue: i.variantValue })),
        customer: form,
        shippingState: form.state,
        shippingCity: form.city,
        notes: form.notes,
        couponCode: coupon?.code,
        redeemPoints: usePoints && canRedeem ? loyalty.points : 0,
        paymentMethod,
        cartSessionId: getCartSessionId(slug),
      });

      if (data.data.directOrder) {
        navigate(`/store/${slug}/success?order=${data.data.order.orderNumber}&email=${encodeURIComponent(form.email)}&method=${paymentMethod}`, {
          state: { bankDetails: data.data.bankDetails },
        });
      } else {
        window.location.href = data.data.authorizationUrl;
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not place your order. Please try again.');
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

        <div className="setup-steps co-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`setup-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span>{i < step ? '✓' : i + 1}</span>
              <label>{s}</label>
            </div>
          ))}
        </div>

        {/* Step 0: Cart Review */}
        {step === 0 && (
          <>
            <div className="sf-panel">
              <h2>Order Summary</h2>
              {cart.map((i) => (
                <div key={`${i.productId}-${i.variantValue || ''}`} className="sf-row co-cart-row">
                  <span>{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.quantity}</span>
                  <span>{naira(i.price * i.quantity)}</span>
                  <button className="sf-line-rm" onClick={() => sync(removeItem(slug, i.productId, i.variantValue))}>Remove</button>
                </div>
              ))}
              <div className="sf-row total"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
            </div>

            <div className="sf-panel">
              <h2>Coupon Code</h2>
              <div className="co-coupon-row">
                <input className="sf-field-input" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter coupon code" disabled={!!coupon} />
                {coupon ? (
                  <button className="sf-btn-ghost" onClick={() => { setCoupon(null); setCouponInput(''); }}>Remove</button>
                ) : (
                  <button className="sf-btn-ghost" disabled={couponChecking} onClick={applyCoupon}>{couponChecking ? 'Checking…' : 'Apply'}</button>
                )}
              </div>
              {couponError && <p className="co-error">{couponError}</p>}
              {coupon && <p className="co-success">Coupon "{coupon.code}" applied — {naira(coupon.discount)} off</p>}
            </div>

            <div className="setup-nav"><div style={{ flex: 1 }} /><button className="sf-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={next}>Next <RiArrowRightLine /></button></div>
          </>
        )}

        {/* Step 1: Customer Details */}
        {step === 1 && (
          <>
            <div className="sf-panel">
              <h2>Your Details</h2>
              <div className="sf-field"><label>Full name *</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="sf-field"><label>Email address *</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="sf-field"><label>Phone number *</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              {savedAddresses.length > 0 && (
                <div className="sf-field">
                  <label>Use a saved address</label>
                  <select onChange={(e) => {
                    const addr = savedAddresses[e.target.value];
                    if (addr) setForm((f) => ({ ...f, address: addr.address, city: addr.city, state: addr.state }));
                  }}>
                    <option value="">Enter a new address below…</option>
                    {savedAddresses.map((a, i) => <option key={i} value={i}>{a.label} — {a.address}</option>)}
                  </select>
                </div>
              )}
              <div className="sf-field"><label>Delivery address *</label><input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
              <div className="co-field-grid">
                <div className="sf-field"><label>City</label><input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
                <div className="sf-field">
                  <label>State *</label>
                  <select value={form.state} onChange={(e) => set('state', e.target.value)}>
                    <option value="">Select state</option>
                    {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {canRedeem && (
              <div className="sf-panel sf-loyalty">
                <div className="sf-loyalty-row">
                  <RiCoinLine className="sf-loyalty-icon" />
                  <div>
                    <strong>You have {loyalty.points.toLocaleString()} points</strong>
                    <p>= {naira(loyalty.redeemableValue)} available to redeem</p>
                  </div>
                  <label className="sf-loyalty-toggle">
                    <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                    <span>Use points</span>
                  </label>
                </div>
              </div>
            )}

            {err && <p className="co-error">{err}</p>}
            <div className="setup-nav">
              <button className="sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }} onClick={back}><RiArrowLeftLine /> Back</button>
              <div style={{ flex: 1 }} />
              <button className="sf-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={next}>Next <RiArrowRightLine /></button>
            </div>
          </>
        )}

        {/* Step 2: Delivery */}
        {step === 2 && (
          <>
            <div className="sf-panel">
              <h2>Delivery</h2>
              <div className="sf-row"><span>Delivery to</span><span>{form.state || '—'}</span></div>
              <div className="sf-row"><span>Delivery fee</span><span>{deliveryFee === 0 ? 'FREE' : naira(deliveryFee)}</span></div>
              <div className="sf-row"><span>Estimated delivery</span><span>{ds?.estimatedDeliveryDays || 3} day(s)</span></div>
              <div className="sf-field" style={{ marginTop: 14 }}>
                <label>Special instructions (optional)</label>
                <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Landmark, preferred delivery time, etc." />
              </div>
            </div>
            <div className="setup-nav">
              <button className="sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }} onClick={back}><RiArrowLeftLine /> Back</button>
              <div style={{ flex: 1 }} />
              <button className="sf-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={next}>Next <RiArrowRightLine /></button>
            </div>
          </>
        )}

        {/* Step 3: Payment Method */}
        {step === 3 && (
          <>
            <div className="sf-panel">
              <h2>Payment Method</h2>
              <div className="co-pay-grid">
                <button className={`co-pay-card ${paymentMethod === 'paystack' ? 'active' : ''}`} onClick={() => setPaymentMethod('paystack')}>
                  <RiSecurePaymentLine />
                  <strong>Pay Now (Paystack)</strong>
                  <span>Most secure. Pay with card, bank transfer or USSD.</span>
                </button>
                <button className={`co-pay-card ${!podAvailable ? 'disabled' : ''} ${paymentMethod === 'pay_on_delivery' ? 'active' : ''}`} disabled={!podAvailable} onClick={() => setPaymentMethod('pay_on_delivery')}>
                  <RiTruckLine />
                  <strong>Pay on Delivery</strong>
                  <span>{ds?.podEnabled ? `Pay cash when your order arrives. Available for orders up to ${naira(ds?.podMaxAmount ?? 50000)}.` : 'Not available for this store.'}</span>
                </button>
                <button className={`co-pay-card ${paymentMethod === 'bank_transfer' ? 'active' : ''}`} onClick={() => setPaymentMethod('bank_transfer')}>
                  <RiBankCardLine />
                  <strong>Bank Transfer</strong>
                  <span>Transfer to our account and upload your receipt.</span>
                </button>
                <button className={`co-pay-card ${paymentMethod === 'split_payment' ? 'active' : ''}`} onClick={() => setPaymentMethod('split_payment')}>
                  <RiWallet3Line />
                  <strong>Split Payment</strong>
                  <span>Pay 50% now, 50% on delivery.</span>
                </button>
              </div>
            </div>
            {err && <p className="co-error">{err}</p>}
            <div className="setup-nav">
              <button className="sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }} onClick={back}><RiArrowLeftLine /> Back</button>
              <div style={{ flex: 1 }} />
              <button className="sf-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={next}>Next <RiArrowRightLine /></button>
            </div>
          </>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <>
            <div className="sf-panel">
              <h2>Review Your Order</h2>
              {cart.map((i) => (
                <div key={`${i.productId}-${i.variantValue || ''}`} className="sf-row">
                  <span>{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.quantity}</span>
                  <span>{naira(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="sf-row"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
              <div className="sf-row"><span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : naira(deliveryFee)}</span></div>
              {couponDiscount > 0 && <div className="sf-row" style={{ color: '#16a34a' }}><span>Coupon ({coupon.code})</span><span>− {naira(couponDiscount)}</span></div>}
              {loyaltyDiscount > 0 && <div className="sf-row" style={{ color: '#16a34a' }}><span>Points discount</span><span>− {naira(loyaltyDiscount)}</span></div>}
              <div className="sf-row total"><span>Total</span><span>{naira(total)}</span></div>
              <div className="sf-row"><span>Payment method</span><span>{{
                paystack: 'Pay Now (Paystack)', pay_on_delivery: 'Pay on Delivery', bank_transfer: 'Bank Transfer', split_payment: 'Split Payment (50/50)',
              }[paymentMethod]}</span></div>
              {paymentMethod === 'split_payment' && <p className="co-hint">You'll pay {naira(Math.round(total / 2))} now and {naira(total - Math.round(total / 2))} on delivery.</p>}
            </div>

            <label className="co-terms">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              I agree to the store's terms of sale and confirm my order details are correct.
            </label>

            {err && <p className="co-error">{err}</p>}
            <div className="setup-nav">
              <button className="sf-btn-ghost" style={{ width: 'auto', padding: '12px 22px' }} onClick={back}><RiArrowLeftLine /> Back</button>
              <div style={{ flex: 1 }} />
              <button className="sf-btn" style={{ width: 'auto', padding: '12px 28px' }} disabled={submitting} onClick={placeOrder}>
                {submitting ? 'Placing order…' : `Place Order — ${naira(total)}`}
              </button>
            </div>
            <div className="sf-secure"><RiSecurePaymentLine /> Secured by Paystack · Cards, bank transfer &amp; USSD accepted</div>
          </>
        )}
      </div>
    </div>
  );
}
