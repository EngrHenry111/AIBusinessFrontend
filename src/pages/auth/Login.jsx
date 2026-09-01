import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiRobot2Line, RiEyeLine, RiEyeOffLine, RiGoogleLine, RiLockLine, RiMailLine } from 'react-icons/ri';
import './Auth.css';

const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo"><RiRobot2Line /></div>
          <h1>EngrHenryTech BusinessAI</h1>
          <p>Sign in to your workspace</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Google Sign In */}
        <button className="btn-google" onClick={handleGoogle} type="button">
          <RiGoogleLine />
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-icon-wrapper">
              <RiMailLine className="input-icon" />
              <input
                className="form-input input-with-icon"
                type="email"
                placeholder="e.g. engrhenrytech@gmail.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your account password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
              <button type="button" className="password-toggle"
                onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
          </div>

          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button
            type="submit"
            className={`btn btn-primary auth-submit ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {!loading && 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
