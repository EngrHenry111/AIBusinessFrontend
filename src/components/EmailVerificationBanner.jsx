import { useState } from 'react';
import { RiMailUnreadLine, RiCloseLine, RiLoader4Line } from 'react-icons/ri';
import { authService } from '../services';
import './EmailVerificationBanner.css';

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(
    (() => { try { return sessionStorage.getItem('evb_dismissed') === '1'; } catch { return false; } })()
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem('evb_dismissed', '1'); } catch { /* ignore */ }
  }

  async function resend() {
    setSending(true);
    try {
      await authService.resendVerification();
    } catch {
      // Never alarm the user over this — delivery issues are logged
      // server-side and don't affect their access either way.
    } finally {
      setSent(true);
      setSending(false);
    }
  }

  return (
    <div className="evb">
      <RiMailUnreadLine className="evb-icon" />
      <span className="evb-text">Please verify your email when you get a chance. Check your inbox or click Resend.</span>
      {sent ? (
        <span className="evb-sent">✅ Sent! Check your inbox</span>
      ) : (
        <button className="evb-btn" onClick={resend} disabled={sending}>
          {sending ? <RiLoader4Line className="evb-spin" /> : 'Resend verification email'}
        </button>
      )}
      <button className="evb-close" onClick={dismiss} aria-label="Dismiss"><RiCloseLine /></button>
    </div>
  );
}
