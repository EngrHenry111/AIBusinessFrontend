import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { storefrontService, storeCustomerService } from '../../services';
import { RiArrowLeftLine, RiUserLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { setStoreToken } from './storeAuth';
import { readWishlist } from './wishlist';
import './Store.css';

export default function StoreLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirect') || `/store/${slug}/account`;

  const [store, setStore] = useState(null);
  const [mode, setMode] = useState(location.pathname.endsWith('/register') ? 'register' : 'login'); // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function afterAuth(token) {
    setStoreToken(slug, token);
    // Merge whatever this browser wishlisted anonymously into the account.
    const local = readWishlist(slug);
    if (local.length) storeCustomerService.syncWishlist(slug, token, local).catch(() => {});
    navigate(redirectTo, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (mode === 'forgot') {
      if (!form.email.trim()) { setErr('Enter your email address.'); return; }
      setSubmitting(true);
      try {
        await storeCustomerService.forgotPassword(slug, form.email.trim());
        setForgotSent(true);
      } catch (e2) {
        setErr(e2.response?.data?.message || 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (mode === 'register' && (!form.name.trim() || !form.email.trim() || form.password.length < 6)) {
      setErr('Name, email and a password of at least 6 characters are required.');
      return;
    }
    if (mode === 'login' && (!form.email.trim() || !form.password)) {
      setErr('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = mode === 'register'
        ? await storeCustomerService.register(slug, form)
        : await storeCustomerService.login(slug, { email: form.email, password: form.password });
      toast.success(mode === 'register' ? 'Account created!' : 'Welcome back!');
      await afterAuth(data.data.token);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const brand = store?.settings?.primaryColor || '#6366f1';

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
        </div>
      </header>

      <div className="sf-page" style={{ maxWidth: 420 }}>
        <div className="sf-panel">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <RiUserLine style={{ fontSize: 32, color: 'var(--sf-brand)' }} />
            <h1 style={{ fontSize: '1.3rem', margin: '8px 0 0' }}>{mode === 'login' ? 'Log In' : mode === 'register' ? 'Create an Account' : 'Reset Password'}</h1>
            <p style={{ color: 'var(--sf-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>{store?.name}</p>
          </div>

          {mode === 'forgot' && forgotSent ? (
            <p style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: '0.9rem' }}>
              If that email has an account here, a reset link has been sent. Check your inbox.
            </p>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="sf-field"><label>Full name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              )}
              <div className="sf-field"><label>Email address</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              {mode === 'register' && (
                <div className="sf-field"><label>Phone number</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              )}
              {mode !== 'forgot' && (
                <div className="sf-field"><label>Password</label><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} /></div>
              )}
              {mode === 'login' && (
                <button type="button" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: 'var(--sf-brand)', fontSize: '0.8rem', marginBottom: 12 }} onClick={() => { setErr(''); setMode('forgot'); }}>
                  Forgot password?
                </button>
              )}

              {err && <p className="co-error">{err}</p>}
              <button className="sf-btn" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'login' ? 'Log In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 16 }}>
            {mode === 'forgot' ? (
              <button style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: 'var(--sf-brand)', fontWeight: 700 }} onClick={() => { setErr(''); setForgotSent(false); setMode('login'); }}>
                Back to log in
              </button>
            ) : (
              <>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: 'var(--sf-brand)', fontWeight: 700 }} onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
                  {mode === 'login' ? 'Create one' : 'Log in'}
                </button>
              </>
            )}
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to={redirectTo === `/store/${slug}/account` ? `/store/${slug}/checkout` : redirectTo} className="sf-nav-link">
            Continue as guest instead
          </Link>
        </div>
      </div>
    </div>
  );
}
