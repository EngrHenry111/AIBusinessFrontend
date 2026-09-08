import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RiLoader4Line, RiCheckboxCircleFill, RiErrorWarningFill } from 'react-icons/ri';
import { authService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, updateUser } = useAuth();
  const [state, setState] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    document.title = 'Verify email · BizlyAI';
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    if (!token) { setState('error'); setMessage('This verification link is missing its token.'); return; }

    authService.verifyEmail(token)
      .then((res) => {
        setState('success');
        setMessage(res.data.message || 'Email verified!');
        if (isAuthenticated) updateUser({ emailVerified: true });
        setTimeout(() => navigate(isAuthenticated ? '/dashboard' : '/login'), 3000);
      })
      .catch((err) => {
        setState('error');
        setMessage(err.response?.data?.message || 'This link has expired or is invalid.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resend() {
    setResending(true);
    try {
      await authService.resendVerification();
      setResent(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not send a new link. Please log in and try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand">
          <div className="auth-logo"><span style={{ fontWeight: 800 }}>B</span></div>
          <h1>BizlyAI</h1>
        </div>

        {state === 'verifying' && (
          <>
            <RiLoader4Line style={{ fontSize: 40, color: 'var(--color-brand)', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: 14, color: 'var(--text-secondary)' }}>Verifying your email…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <RiCheckboxCircleFill style={{ fontSize: 48, color: '#10b981' }} />
            <h2 style={{ margin: '14px 0 6px', fontSize: 20 }}>Email verified!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Redirecting you to your dashboard…</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 18, justifyContent: 'center' }}>Go to dashboard now</Link>
          </>
        )}

        {state === 'error' && (
          <>
            <RiErrorWarningFill style={{ fontSize: 48, color: '#ef4444' }} />
            <h2 style={{ margin: '14px 0 6px', fontSize: 20 }}>Link expired or invalid</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>

            {isAuthenticated ? (
              resent ? (
                <p style={{ marginTop: 16, color: '#10b981', fontSize: 14, fontWeight: 600 }}>✅ Sent! Check your inbox.</p>
              ) : (
                <button className="btn btn-primary" style={{ marginTop: 18, justifyContent: 'center' }} onClick={resend} disabled={resending}>
                  {resending ? <RiLoader4Line style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Request new verification link'}
                </button>
              )
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ marginTop: 18, justifyContent: 'center' }}>
                Log in to request a new link
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
