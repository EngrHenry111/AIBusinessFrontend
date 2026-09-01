import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authService } from '../../services';
import { RiRobot2Line, RiLockLine, RiEyeLine, RiEyeOffLine, RiCheckLine } from 'react-icons/ri';
import './Auth.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, form.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  const strength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const s = strength(form.password);

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo" style={{ background: '#10b981' }}><RiCheckLine /></div>
            <h1>Password Reset!</h1>
            <p>Your password has been changed successfully.</p>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Redirecting to login in 3 seconds...
            </p>
          </div>
          <Link to="/login" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo"><RiRobot2Line /></div>
          <h1>Set New Password</h1>
          <p>Choose a strong password for your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="password-input">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                minLength={8}
                required
              />
              <button type="button" className="password-toggle"
                onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="strength-bar">
                <div className="strength-segments">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="strength-segment"
                      style={{ background: i <= s ? strengthColor[s] : 'var(--border)' }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: strengthColor[s] }}>{strengthLabel[s]}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              required
            />
            {form.confirm && form.password !== form.confirm && (
              <span className="form-error">Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            className={`btn btn-primary auth-submit ${loading ? 'btn-loading' : ''}`}
            disabled={loading || (form.confirm && form.password !== form.confirm)}
          >
            {!loading && 'Reset Password'}
          </button>
        </form>

        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
