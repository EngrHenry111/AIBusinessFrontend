import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { twoFactorService } from '../../services';
import { RiShieldKeyholeLine, RiLoader4Line, RiArrowLeftLine } from 'react-icons/ri';
import './Auth.css';

export default function TwoFactorLogin() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { completeAuth } = useAuth();

  const tempToken = state?.tempToken || sessionStorage.getItem('2fa_temp') || '';
  const [mode, setMode] = useState('totp'); // totp | backup
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    document.title = 'Two-step verification · BizlyAI';
    if (!tempToken) { nav('/login', { replace: true }); return; }
    sessionStorage.setItem('2fa_temp', tempToken);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setError(''); setCode(''); inputRef.current?.focus(); }, [mode]);

  async function submit(value) {
    const v = (value ?? code).trim();
    if (mode === 'totp' ? !/^\d{6}$/.test(v) : v.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const { data } = mode === 'totp'
        ? await twoFactorService.completeLogin(tempToken, v)
        : await twoFactorService.useBackupCode(tempToken, v);
      sessionStorage.removeItem('2fa_temp');
      completeAuth(data);
      nav('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'That code was not accepted.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  function onChange(e) {
    let v = e.target.value;
    if (mode === 'totp') {
      v = v.replace(/\D/g, '').slice(0, 6);
      setCode(v);
      if (v.length === 6) submit(v);
    } else {
      v = v.replace(/[^a-fA-F0-9]/g, '').slice(0, 8).toLowerCase();
      setCode(v);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand">
          <div className="auth-logo"><RiShieldKeyholeLine /></div>
          <h1>Two-step verification</h1>
          <p>{mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Enter one of your saved backup codes'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            ref={inputRef}
            className="form-input tfa-code-input"
            inputMode={mode === 'totp' ? 'numeric' : 'text'}
            autoComplete="one-time-code"
            placeholder={mode === 'totp' ? '000000' : '••••••••'}
            value={code}
            onChange={onChange}
          />
          <button
            type="submit"
            className={`btn btn-primary auth-submit ${loading ? 'btn-loading' : ''}`}
            style={{ marginTop: 14 }}
            disabled={loading || code.length < 6}
          >
            {!loading && 'Verify'}
          </button>
        </form>

        <button type="button" className="tfa-link-btn" style={{ marginTop: 14 }}
          onClick={() => setMode(mode === 'totp' ? 'backup' : 'totp')}>
          {mode === 'totp' ? 'Use a backup code instead' : 'Use your authenticator app'}
        </button>

        <div style={{ marginTop: 10 }}>
          <Link to="/login" className="tfa-back" onClick={() => sessionStorage.removeItem('2fa_temp')}>
            <RiArrowLeftLine /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
