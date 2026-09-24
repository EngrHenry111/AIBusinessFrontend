import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { storefrontService, giftCardService } from '../../services';
import { RiArrowLeftLine, RiGiftLine, RiSecurePaymentLine, RiMailSendLine, RiCalendarLine, RiStore2Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Store.css';
import './GiftCard.css';

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const EMOJI = ['🎉', '🎊', '✨', '🎁', '💫'];

function GiftCardPreview({ storeName, storeLogo, amount, recipientName }) {
  return (
    <div className="gc-preview">
      <div className="gc-preview-top">
        {storeLogo ? <img src={storeLogo} alt="" /> : <RiStore2Line />}
        <span>{storeName || 'Store'}</span>
      </div>
      <div className="gc-preview-amount">{naira(amount || 0)}</div>
      <div className="gc-preview-label"><RiGiftLine /> Gift Card</div>
      {recipientName && <div className="gc-preview-to">For {recipientName}</div>}
      <div className="gc-preview-shine" />
    </div>
  );
}

export default function GiftCard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [store, setStore] = useState(null);

  const [amount, setAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [usingCustom, setUsingCustom] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientMessage, setRecipientMessage] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [purchased, setPurchased] = useState(null); // gift card returned after verify

  const effectiveAmount = usingCustom ? Number(customAmount) || 0 : amount;

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  // Returning from Paystack with ?ref=<reference> — verify and show success.
  useEffect(() => {
    const ref = params.get('ref');
    if (!ref) return;
    giftCardService.verify(slug, ref)
      .then(({ data }) => setPurchased(data.data.giftCard))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not confirm gift card purchase'));
  }, [params, slug]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!effectiveAmount || effectiveAmount < 500) return setErr('Enter an amount of at least ₦500.');
    if (!recipientName.trim() || !EMAIL_RE.test(recipientEmail)) return setErr('A valid recipient name and email are required.');
    if (recipientMessage.length > 200) return setErr('Personal message must be 200 characters or fewer.');
    if (!buyerName.trim() || !EMAIL_RE.test(buyerEmail)) return setErr('A valid name and email of your own are required.');
    if (deliveryOption === 'scheduled' && !scheduledDate) return setErr('Pick a delivery date, or switch to "Send by email now".');

    setSubmitting(true);
    try {
      const { data } = await giftCardService.purchase(slug, {
        amount: effectiveAmount, recipientName, recipientEmail, recipientMessage,
        buyerName, buyerEmail, buyerPhone,
        scheduledSendAt: deliveryOption === 'scheduled' ? new Date(scheduledDate).toISOString() : undefined,
      });
      window.location.href = data.data.authorizationUrl;
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not start gift card purchase. Please try again.');
      setSubmitting(false);
    }
  }

  function sendAnother() {
    setPurchased(null);
    setRecipientName(''); setRecipientEmail(''); setRecipientMessage('');
    navigate(`/store/${slug}/gift-card`, { replace: true });
  }

  const brand = store?.settings?.primaryColor || '#7c3aed';

  if (purchased) {
    return (
      <div className="sf gc-page" style={{ '--sf-brand': brand }}>
        <div className="gc-confetti" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 4.3) % 100}%`, animationDelay: `${(i % 6) * 0.3}s` }}>{EMOJI[i % EMOJI.length]}</span>
          ))}
        </div>
        <div className="sf-page gc-success">
          <h1>Gift card sent! 🎉</h1>
          <p className="muted">Your {naira(purchased.amount)} gift card for {purchased.sentTo?.name} is on its way.</p>
          <GiftCardPreview storeName={store?.name} storeLogo={store?.logo} amount={purchased.amount} recipientName={purchased.sentTo?.name} />
          <div className="gc-success-actions">
            <button className="sf-btn-ghost" onClick={sendAnother}>Send Another</button>
            <button className="sf-btn" onClick={() => navigate(`/store/${slug}`)}>Shop Now</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sf gc-page" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
        </div>
      </header>

      <div className="sf-page gc-layout">
        <div className="gc-form-col">
          <h1><RiGiftLine style={{ verticalAlign: '-4px', color: brand }} /> Give the Gift of Shopping</h1>
          <p className="muted">Send a gift card to someone special</p>

          <form onSubmit={submit}>
            <div className="sf-panel">
              <h2>Amount</h2>
              <div className="gc-amount-grid">
                {PRESET_AMOUNTS.map((a) => (
                  <button type="button" key={a} className={`gc-amount-card ${!usingCustom && amount === a ? 'active' : ''}`}
                    onClick={() => { setUsingCustom(false); setAmount(a); }}>
                    {naira(a)}
                  </button>
                ))}
                <button type="button" className={`gc-amount-card ${usingCustom ? 'active' : ''}`} onClick={() => setUsingCustom(true)}>
                  Custom
                </button>
              </div>
              {usingCustom && (
                <input className="sf-field-input" style={{ marginTop: 10 }} type="number" min={500} max={500000}
                  placeholder="Enter amount (₦500 – ₦500,000)" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
              )}
            </div>

            <div className="sf-panel">
              <h2>Recipient Details</h2>
              <div className="sf-field"><label>Recipient name *</label><input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} /></div>
              <div className="sf-field"><label>Recipient email *</label><input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} /></div>
              <div className="sf-field">
                <label>Personal message</label>
                <textarea rows={3} maxLength={200} placeholder="Write a heartfelt message…" value={recipientMessage} onChange={(e) => setRecipientMessage(e.target.value)} />
                <span className="gc-char-count">{recipientMessage.length}/200</span>
              </div>
            </div>

            <div className="sf-panel">
              <h2>Your Details</h2>
              <div className="sf-field"><label>Your name *</label><input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
              <div className="sf-field"><label>Your email *</label><input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} /></div>
              <div className="sf-field"><label>Your phone</label><input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} /></div>
            </div>

            <div className="sf-panel">
              <h2>Delivery</h2>
              <div className="gc-delivery-options">
                <button type="button" className={`gc-delivery-opt ${deliveryOption === 'now' ? 'active' : ''}`} onClick={() => setDeliveryOption('now')}>
                  <RiMailSendLine /> Send by email now
                </button>
                <button type="button" className={`gc-delivery-opt ${deliveryOption === 'scheduled' ? 'active' : ''}`} onClick={() => setDeliveryOption('scheduled')}>
                  <RiCalendarLine /> Schedule delivery
                </button>
              </div>
              {deliveryOption === 'scheduled' && (
                <input className="sf-field-input" style={{ marginTop: 10 }} type="date" min={new Date().toISOString().slice(0, 10)}
                  value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              )}
            </div>

            {err && <p className="co-error">{err}</p>}
            <button className="sf-btn gc-submit-btn" disabled={submitting}>
              {submitting ? 'Please wait…' : `Purchase Gift Card — ${naira(effectiveAmount)}`}
            </button>
            <div className="sf-secure"><RiSecurePaymentLine /> Secured by Paystack</div>
          </form>
        </div>

        <div className="gc-preview-col">
          <GiftCardPreview storeName={store?.name} storeLogo={store?.logo} amount={effectiveAmount} recipientName={recipientName} />
        </div>
      </div>
    </div>
  );
}
