import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { INDUSTRIES } from '../../constants/industries';
import { rememberReferralCode, peekReferralCode, takeReferralCode } from '../../constants/referral';
import { RiRobot2Line, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyName: '', industry: '', phone: '',
    ref: params.get('ref') || peekReferralCode(),
  });

  // Keep the code even if they leave and sign up with Google instead.
  useEffect(() => { if (params.get('ref')) rememberReferralCode(params.get('ref')); }, [params]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      takeReferralCode();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span className="form-hint">(for SMS updates, optional)</span></label>
              <input
                className="form-input"
                type="tel"
                placeholder="e.g. 08012345678"
                value={form.phone}
                onChange={e => f('phone', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Referral Code <span className="form-hint">(optional)</span></label>
              <input
                className="form-input"
                placeholder="e.g. GRACE7K2A"
                value={form.ref}
                onChange={e => f('ref', e.target.value.toUpperCase())}
                maxLength={20}
              />
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
