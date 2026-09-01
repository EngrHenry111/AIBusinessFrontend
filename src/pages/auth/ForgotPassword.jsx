import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services';
import { RiRobot2Line, RiMailLine, RiArrowLeftLine, RiCheckLine } from 'react-icons/ri';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo" style={{ background: '#10b981' }}>
              <RiCheckLine />
            </div>
            <h1>Check Your Email</h1>
            <p>We sent a password reset link to</p>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{email}</p>
          </div>
          <div className="sent-info">
            <p>The link expires in <strong>10 minutes</strong>.</p>
            <p>Check your spam folder if you don't see it.</p>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={() => setSent(false)}>
            Try a different email
          </button>
          <p className="auth-switch" style={{ marginTop: 16 }}>
            <Link to="/login"><RiArrowLeftLine style={{ display: 'inline', marginRight: 4 }} />Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><RiRobot2Line /></div>
          <h1>Forgot Password?</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-icon-wrapper">
              <RiMailLine className="input-icon" />
              <input
                className="form-input input-with-icon"
                type="email"
                placeholder="e.g. engrhenrytech@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            className={`btn btn-primary auth-submit ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {!loading && 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login"><RiArrowLeftLine style={{ display: 'inline', marginRight: 4 }} />Back to login</Link>
        </p>
      </div>
    </div>
  );
}
