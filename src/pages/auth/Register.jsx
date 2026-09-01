import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiRobot2Line, RiGoogleLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyName: '', industry: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  }

  const f = (field, value) => setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="auth-logo"><RiRobot2Line /></div>
          <h1>Get Started Free</h1>
          <p>Create your EngrHenryTech BusinessAI workspace</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Google */}
        <button className="btn-google" onClick={handleGoogle} type="button">
          <RiGoogleLine />
          <span>Sign up with Google</span>
        </button>

        <div className="auth-divider"><span>or register with email</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-grid">
            <div className="form-group">
              <label className="form-label">Your Full Name *</label>
              <input
                className="form-input"
                placeholder="e.g. EngrHenryTech"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Work Email *</label>
              <input
                className="form-input"
                type="email"
                placeholder="e.g. engrhenrytech@gmail.com"
                value={form.email}
                onChange={e => f('email', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company / Business Name *</label>
              <input
                className="form-input"
                placeholder="e.g. EngrHenryTech Ltd"
                value={form.companyName}
                onChange={e => f('companyName', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <select
                className="form-input form-select"
                value={form.industry}
                onChange={e => f('industry', e.target.value)}
              >
                <option value="">Select your industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance & Banking</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail & E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="consulting">Consulting</option>
                <option value="education">Education</option>
                <option value="government">Government</option>
                <option value="logistics">Logistics</option>
                <option value="agriculture">Agriculture</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password (min 8 characters) *</label>
            <div className="password-input">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={form.password}
                onChange={e => f('password', e.target.value)}
                minLength={8}
                required
              />
              <button type="button" className="password-toggle"
                onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
          </div>

          <p className="auth-terms">
            By creating an account, you agree to our{' '}
            <Link to="/terms">Terms of Service</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <button
            type="submit"
            className={`btn btn-primary auth-submit ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {!loading && 'Create Free Workspace'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
