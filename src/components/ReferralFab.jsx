import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiGiftLine, RiCloseLine, RiFileCopyLine, RiWhatsappLine, RiArrowRightLine } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { referralService } from '../services';
import './ReferralFab.css';

// Floating "Earn X%" button so owners always see the referral programme.
// Hidden on pages whose own controls sit at the bottom of the screen (chat
// composers, the Quick Sale cart), on the Referrals page itself, and for a
// week after the owner hides it.
const HIDE_ON = ['/referrals', '/assistant', '/chat', '/messages', '/whatsapp', '/widget-inbox', '/pos'];
const HIDE_KEY = 'bizly-referral-fab-hidden-until';
const HIDE_DAYS = 7;

const hiddenUntil = () => {
  try { return Number(localStorage.getItem(HIDE_KEY) || 0); } catch { return 0; }
};

export default function ReferralFab() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => hiddenUntil() > Date.now());
  const panelRef = useRef(null);
  const isOwner = user?.role === 'company_owner';

  useEffect(() => {
    if (!isOwner || hidden) return;
    let alive = true;
    referralService.get()
      .then(({ data }) => { if (alive && data?.data?.link) setInfo({ link: data.data.link, pct: Math.round((data.data.rate || 0) * 100) }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isOwner, hidden]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, [open]);

  if (!isOwner || hidden || !info || HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const earn = info.pct > 0 ? `Earn ${info.pct}%` : 'Refer & earn';
  const shareText = `I run my business on BizlyAI: sales, invoices, stock, staff and an AI assistant in one place. Start your free trial here: ${info.link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.link);
      toast.success('Referral link copied');
    } catch {
      toast.error('Could not copy. Open Referrals to copy it.');
    }
  };
  const hide = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86400000)); } catch { /* ignore */ }
    setHidden(true);
  };

  return createPortal(
    <div className="rfab" ref={panelRef}>
      {open && (
        <div className="rfab-panel" role="dialog" aria-label="Refer a business">
          <button className="rfab-x" onClick={() => setOpen(false)} aria-label="Close"><RiCloseLine /></button>
          <div className="rfab-icon"><RiGiftLine /></div>
          <h3>Refer a business, get paid</h3>
          <p>
            {info.pct > 0
              ? <>You earn <strong>{info.pct}%</strong> of every payment from each business you refer, every month they stay subscribed.</>
              : <>Earn money for every business you refer that subscribes.</>}
          </p>
          <div className="rfab-link">
            <input value={info.link} readOnly onFocus={(e) => e.target.select()} aria-label="Your referral link" />
            <button onClick={copy} aria-label="Copy link"><RiFileCopyLine /></button>
          </div>
          <div className="rfab-actions">
            <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
              <RiWhatsappLine /> Share on WhatsApp
            </a>
            <Link className="btn btn-secondary" to="/referrals">My earnings <RiArrowRightLine /></Link>
          </div>
          <button className="rfab-hide" onClick={hide}>Hide this button for {HIDE_DAYS} days</button>
        </div>
      )}
      <button className={`rfab-btn ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`${earn}: refer a business`}>
        <RiGiftLine className="rfab-gift" />
        <span>{earn}</span>
      </button>
    </div>,
    document.body,
  );
}
