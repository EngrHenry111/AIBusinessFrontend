import { useState, useEffect } from 'react';
import { RiMailUnreadLine, RiCloseLine, RiLoader4Line } from 'react-icons/ri';
import { authService } from '../services';
import { useAuth } from '../context/AuthContext';
import './EmailVerificationBanner.css';

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(
    (() => { try { return sessionStorage.getItem('evb_dismissed') === '1'; } catch { return false; } })()
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { updateUser } = useAuth();

  // People usually click the link in their mail app or another tab. When they
  // come back here, ask the server again so the banner goes away by itself.
  useEffect(() => {
    let busy = false;
    const recheck = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const { data } = await authService.getMe();
        if (data.user?.emailVerified) updateUser({ emailVerified: true });
      } catch { /* not important enough to bother anyone */ } finally { busy = false; }
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [updateUser]);

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
