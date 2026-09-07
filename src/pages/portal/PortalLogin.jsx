import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { RiCheckLine, RiMailLine, RiLoader4Line } from 'react-icons/ri';
import { portalService } from '../../services';
import './Portal.css';

function PortalMark() {
  return (
    <span className="pt-logo">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="ptMark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#ptMark)" />
        <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
      </svg>
      Bizly<b>AI</b>
    </span>
  );
}

export default function PortalLogin() {
  const [params] = useSearchParams();
  const companyId = params.get('company') || '';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    params.get('expired') ? 'Your access link has expired. Enter your email for a new one.' : ''
  );

  useEffect(() => { document.title = 'Access Your Documents · BizlyAI'; }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!companyId) {
      setError('This portal link is missing a company reference. Ask your provider for a fresh link.');
      return;
    }
    setLoading(true);
    try {
      await portalService.requestAccess(email.trim(), companyId);
      setSent(true);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'No records found for this email address.'
          : err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt pt-login">
      <PortalMark />

      <div className="pt-card">
        {sent ? (
          <div className="pt-success">
            <div className="pt-success-icon"><RiCheckLine /></div>
            <h2>Check your email!</h2>
            <p>We sent an access link to <strong>{email}</strong>.</p>
            <p className="pt-hint">The link works for 24 hours. Check your spam folder if it doesn't arrive.</p>
          </div>
        ) : (
          <>
            <h1>Access Your Documents</h1>
            <p className="pt-sub">Enter your email and we'll send you a secure link to view your invoices, orders and appointments.</p>

            <form onSubmit={handleSubmit}>
              <div className="pt-field">
                <label htmlFor="pt-email">Email address</label>
                <input
                  id="pt-email"
                  className="pt-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button className="pt-btn" type="submit" disabled={loading}>
                {loading ? <RiLoader4Line className="pt-spin" /> : <RiMailLine />}
                Send Access Link
              </button>

              {error && <div className="pt-error">{error}</div>}
            </form>
          </>
        )}
      </div>

      <Link to="/" style={{ fontSize: 13, color: '#64748b' }}>← Back to bislyai.com</Link>
    </div>
  );
}
