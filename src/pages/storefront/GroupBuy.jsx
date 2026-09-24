import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../../services/api';
import { storefrontService, groupBuyService } from '../../services';
import {
  RiArrowLeftLine, RiFireLine, RiGroupLine, RiWhatsappLine, RiFileCopyLine,
  RiSecurePaymentLine, RiCheckboxCircleLine, RiTimeLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Store.css';
import './GroupBuy.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function useCountdown(ms) {
  const [left, setLeft] = useState(ms || 0);
  useEffect(() => {
    setLeft(ms || 0);
    if (!ms) return;
    const start = Date.now();
    const iv = setInterval(() => setLeft(Math.max(0, ms - (Date.now() - start))), 1000);
    return () => clearInterval(iv);
  }, [ms]);
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, d, h, m, s, urgent: left > 0 && left < 3600000, expired: left <= 0 };
}

function ProgressBar({ current, minimum }) {
  const pct = Math.min(100, Math.round((current / minimum) * 100));
  const color = pct >= 100 ? 'green' : pct >= 60 ? 'yellow' : 'red';
  return (
    <div className="gb-progress">
      <div className="gb-progress-track"><div className={`gb-progress-fill ${color}`} style={{ width: `${pct}%` }} /></div>
      <div className="gb-progress-label">{current} of {minimum} people joined</div>
    </div>
  );
}

export default function GroupBuy() {
  const { slug, shareCode } = useParams();
  const [params] = useSearchParams();
  const [store, setStore] = useState(null);
  const [gb, setGb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState('');
  const [justJoined, setJustJoined] = useState(false);
  const [feed, setFeed] = useState([]); // live "X just joined" ticker
  const [shareData, setShareData] = useState(null);

  const load = useCallback(() => {
    groupBuyService.getPublic(slug, shareCode)
      .then(({ data }) => setGb(data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug, shareCode]);

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
    load();
  }, [slug, load]);

  useEffect(() => {
    groupBuyService.share(slug, shareCode).then(({ data }) => setShareData(data.data)).catch(() => {});
  }, [slug, shareCode]);

  // Returning from Paystack with ?ref=<reference>
  useEffect(() => {
    const ref = params.get('ref');
    if (!ref) return;
    groupBuyService.verify(slug, shareCode, ref)
      .then(({ data }) => { setGb(data.data); setJustJoined(true); toast.success("You're in! 🎉"); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not confirm your payment'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Live updates while anyone is viewing the page
  useEffect(() => {
    if (!gb?._id) return;
    const socket = io(SOCKET_ORIGIN, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join_groupbuy', gb._id));
    socket.on('groupbuy:update', (p) => {
      setGb((g) => (g ? { ...g, currentParticipants: p.currentParticipants ?? g.currentParticipants, status: p.status ?? g.status } : g));
      if (p.joinedName) {
        setFeed((f) => [{ id: Date.now(), name: p.joinedName }, ...f].slice(0, 5));
        toast(`${p.joinedName} just joined! 🎉`, { icon: '👋' });
      }
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gb?._id]);

  const countdown = useCountdown(gb?.msRemaining);
  const brand = store?.settings?.primaryColor || '#7c3aed';

  async function submitJoin(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim() || !EMAIL_RE.test(email)) return setErr('A valid name and email are required.');
    setJoining(true);
    try {
      const { data } = await groupBuyService.join(slug, shareCode, { name, email, phone, quantity });
      window.location.href = data.data.authorizationUrl;
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not join this group buy. Please try again.');
      setJoining(false);
    }
  }

  function shareWhatsApp() {
    const url = shareData?.whatsappUrl || `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join this group buy: ${window.location.href}`)}`;
    window.open(url, '_blank', 'noopener');
  }
  function copyLink() {
    navigator.clipboard.writeText(shareData?.link || window.location.href);
    toast.success('Link copied!');
  }

  if (loading) return <div className="sf gb-page" style={{ '--sf-brand': brand }}><div className="sf-page"><p className="muted">Loading…</p></div></div>;
  if (notFound || !gb) {
    return (
      <div className="sf gb-page" style={{ '--sf-brand': brand }}>
        <div className="sf-page"><p>This group buy could not be found.</p><Link to={`/store/${slug}`} className="sf-btn">Back to store</Link></div>
      </div>
    );
  }

  const closed = gb.status !== 'active' || countdown.expired;
  const total = gb.groupPrice * quantity;

  return (
    <div className="sf gb-page" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
        </div>
      </header>

      <div className="sf-page gb-layout">
        <div className="gb-hero">
          <div className="gb-hero-img">
            {gb.productImage ? <img src={gb.productImage} alt={gb.productName} /> : <RiGroupLine />}
          </div>
          <div className="gb-hero-badge"><RiFireLine /> Group Buy Deal!</div>
          <h1>{gb.productName}</h1>
          <div className="gb-price-row">
            <span className="gb-price-original">{naira(gb.originalPrice)}</span>
            <span className="gb-price-group">{naira(gb.groupPrice)}</span>
            {gb.discountPercent > 0 && <span className="gb-save-badge">SAVE {gb.discountPercent}%</span>}
          </div>
          {gb.description && <p className="muted">{gb.description}</p>}
        </div>

        <div className="sf-panel">
          <ProgressBar current={gb.currentParticipants} minimum={gb.minimumParticipants} />
          {gb.status === 'successful' ? (
            <div className="gb-unlocked"><RiCheckboxCircleLine /> Deal unlocked! Orders are being processed.</div>
          ) : gb.status === 'failed' ? (
            <div className="gb-closed-note">This group buy didn't reach its target — all participants were refunded.</div>
          ) : gb.status === 'cancelled' ? (
            <div className="gb-closed-note">This group buy was cancelled by the store.</div>
          ) : countdown.expired ? (
            <div className="gb-closed-note">This group buy has expired.</div>
          ) : (
            <div className="gb-need-more">{gb.remainingToUnlock} more people needed to unlock the deal</div>
          )}

          {!closed && (
            <div className={`gb-countdown ${countdown.urgent ? 'urgent' : ''}`}>
              <RiTimeLine /> Deal expires in: <strong>{String(countdown.d).padStart(2, '0')}:{String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}</strong>
            </div>
          )}

          {(gb.currentParticipants > 0 || feed.length > 0) && (
            <div className="gb-participants">
              <div className="gb-avatars">
                {Array.from({ length: Math.min(gb.currentParticipants, 10) }).map((_, i) => (
                  <span key={i} className="gb-avatar" style={{ zIndex: 10 - i }}>{String.fromCharCode(65 + (i % 26))}</span>
                ))}
              </div>
              {feed[0] && <div className="gb-feed-item">{feed[0].name} just joined! 🎉</div>}
            </div>
          )}
        </div>

        {justJoined && (
          <div className="sf-panel gb-joined-banner">
            <RiCheckboxCircleLine /> You're in! We'll email you when the deal unlocks (or if it doesn't, you'll be refunded automatically).
          </div>
        )}

        {!closed && !justJoined && (
          <form onSubmit={submitJoin} className="sf-panel">
            <h2>Join This Group Buy</h2>
            <div className="sf-field">
              <label>Quantity</label>
              <div className="gb-qty-row">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)}>+</button>
              </div>
            </div>
            <div className="gb-total-row">Your total: {naira(gb.groupPrice)} × {quantity} = <strong>{naira(total)}</strong></div>

            <div className="sf-field"><label>Full name *</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="sf-field"><label>Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="sf-field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>

            {err && <p className="co-error">{err}</p>}
            <button className="sf-btn gb-join-btn" disabled={joining}>{joining ? 'Please wait…' : `Join Group Buy — ${naira(total)}`}</button>
            <p className="gb-safety-note">Your payment is protected — if the group target isn't reached by the deadline, you'll be refunded in full automatically.</p>
            <div className="sf-secure"><RiSecurePaymentLine /> Secured by Paystack</div>
          </form>
        )}

        <div className="sf-panel gb-share-panel">
          <h2>Help Unlock This Deal! Share With Friends</h2>
          <p className="muted">The more people join, the better for everyone!</p>
          <div className="gb-share-actions">
            <button type="button" className="gb-share-btn whatsapp" onClick={shareWhatsApp}><RiWhatsappLine /> Share on WhatsApp</button>
            <button type="button" className="gb-share-btn" onClick={copyLink}><RiFileCopyLine /> Copy Link</button>
          </div>
          {shareData?.qrCode && (
            <div className="gb-qr"><img src={shareData.qrCode} alt="QR code" /><span className="muted">Scan to open this deal</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
