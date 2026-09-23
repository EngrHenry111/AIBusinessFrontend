import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService, storeCustomerService } from '../../services';
import { RiArrowLeftLine, RiLockPasswordLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { setStoreToken } from './storeAuth';
import './Store.css';

export default function StoreResetPassword() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setSubmitting(true);
    try {
      const { data } = await storeCustomerService.resetPassword(slug, token, password);
      setStoreToken(slug, data.data.token);
      toast.success('Password reset — you are now logged in.');
      navigate(`/store/${slug}/account`, { replace: true });
    } catch (e2) {
      setErr(e2.response?.data?.message || 'This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  const brand = store?.settings?.primaryColor || '#6366f1';

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}/login`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to log in
          </Link>
        </div>
      </header>

      <div className="sf-page" style={{ maxWidth: 420 }}>
        <div className="sf-panel">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <RiLockPasswordLine style={{ fontSize: 32, color: 'var(--sf-brand)' }} />
            <h1 style={{ fontSize: '1.3rem', margin: '8px 0 0' }}>Set a New Password</h1>
            <p style={{ color: 'var(--sf-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>{store?.name}</p>
          </div>

          <form onSubmit={submit}>
            <div className="sf-field"><label>New password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="sf-field"><label>Confirm password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {err && <p className="co-error">{err}</p>}
            <button className="sf-btn" disabled={submitting}>{submitting ? 'Please wait…' : 'Reset Password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
