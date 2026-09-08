import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { twoFactorService } from '../../services';
import {
  RiShieldKeyholeLine, RiLoader4Line, RiDownload2Line, RiCheckLine,
  RiCheckboxCircleFill, RiArrowRightLine, RiArrowLeftLine, RiFileCopyLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './TwoFactor.css';

export default function TwoFactor() {
  const { user, updateUser } = useAuth();
  const enabled = !!user?.twoFactorEnabled;

  const [step, setStep] = useState(null);      // null | 1 | 2 | 3
  const [setupData, setSetupData] = useState(null); // { qrCode, secret }
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const codeRef = useRef(null);

  useEffect(() => { if (step === 2) codeRef.current?.focus(); }, [step]);

  async function startSetup() {
    setBusy(true);
    try {
      const { data } = await twoFactorService.setup();
      setSetupData(data.data);
      setCode('');
      setStep(1);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not start 2FA setup'); }
    finally { setBusy(false); }
  }

  async function verify(value) {
    const v = (value ?? code).trim();
    if (!/^\d{6}$/.test(v)) return;
    setBusy(true);
    try {
      const { data } = await twoFactorService.verify(v);
      setBackupCodes(data.backupCodes || []);
      updateUser({ twoFactorEnabled: true });
      setStep(3);
      toast.success('Two-factor authentication enabled');
    } catch (e) {
      toast.error(e.response?.data?.message || 'That code is incorrect');
      setCode('');
      codeRef.current?.focus();
    } finally { setBusy(false); }
  }

  async function disable() {
    if (disableCode.length < 6) return;
    setBusy(true);
    try {
      await twoFactorService.disable(disableCode);
      updateUser({ twoFactorEnabled: false });
      setShowDisable(false);
      setDisableCode('');
      toast.success('Two-factor authentication disabled');
    } catch (e) { toast.error(e.response?.data?.message || 'Incorrect code'); }
    finally { setBusy(false); }
  }

  function finishSetup() {
    setStep(null);
    setSetupData(null);
    setBackupCodes([]);
    setCode('');
  }

  function downloadCodes() {
    const text =
      `BizlyAI — Two-Factor Backup Codes\n` +
      `Account: ${user?.email}\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      backupCodes.join('\n') +
      `\n\nEach code can be used once. Keep them somewhere safe — you'll need one if you lose your authenticator device.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bizlyai-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  const onCodeChange = (setter) => (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setter(v);
    if (v.length === 6) verify(v);
  };

  /* ── STATE 3: already enabled ─────────────────────────────────────────── */
  if (enabled && step === null) {
    return (
      <div className="tf-card">
        <div className="tf-head">
          <div>
            <h3>Two-Factor Authentication</h3>
            <p>An authenticator code is required every time you sign in.</p>
          </div>
          <span className="tf-badge on"><RiCheckboxCircleFill /> 2FA is enabled</span>
        </div>

        {!showDisable ? (
          <button className="btn btn-danger" onClick={() => setShowDisable(true)}>Disable 2FA</button>
        ) : (
          <div className="tf-disable">
            <p>Enter a current 6-digit code — or one of your backup codes — to turn 2FA off.</p>
            <input
              className="form-input"
              placeholder="6-digit code or backup code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))}
            />
            <div className="tf-row">
              <button className="btn btn-danger" onClick={disable} disabled={busy || disableCode.length < 6}>
                {busy ? <RiLoader4Line className="spin" /> : 'Confirm disable'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowDisable(false); setDisableCode(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── SETUP · Step 1: scan QR ──────────────────────────────────────────── */
  if (step === 1 && setupData) {
    return (
      <div className="tf-card">
        <div className="tf-steps"><span className="on">1 Scan</span><span>2 Verify</span><span>3 Backup</span></div>
        <h3>Scan this QR code</h3>
        <p>Open <strong>Google Authenticator</strong>, <strong>Authy</strong> or any TOTP app and scan:</p>
        <div className="tf-qr"><img src={setupData.qrCode} alt="2FA QR code" /></div>
        <div className="tf-manual">
          <span>Can't scan? Enter this key manually:</span>
          <code onClick={() => { navigator.clipboard?.writeText(setupData.secret); toast.success('Key copied'); }}>
            {setupData.secret} <RiFileCopyLine />
          </code>
        </div>
        <div className="tf-row">
          <button className="btn btn-secondary" onClick={finishSetup}><RiArrowLeftLine /> Cancel</button>
          <button className="btn btn-primary" onClick={() => setStep(2)}>Next <RiArrowRightLine /></button>
        </div>
      </div>
    );
  }

  /* ── SETUP · Step 2: verify code ──────────────────────────────────────── */
  if (step === 2) {
    return (
      <div className="tf-card">
        <div className="tf-steps"><span>1 Scan</span><span className="on">2 Verify</span><span>3 Backup</span></div>
        <h3>Enter the 6-digit code</h3>
        <p>Type the current code shown in your authenticator app.</p>
        <input
          ref={codeRef}
          className="form-input tf-code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          onChange={onCodeChange(setCode)}
        />
        <div className="tf-row">
          <button className="btn btn-secondary" onClick={() => setStep(1)}><RiArrowLeftLine /> Back</button>
          <button className="btn btn-primary" onClick={() => verify()} disabled={busy || code.length !== 6}>
            {busy ? <RiLoader4Line className="spin" /> : 'Verify & Enable'}
          </button>
        </div>
      </div>
    );
  }

  /* ── SETUP · Step 3: backup codes ─────────────────────────────────────── */
  if (step === 3) {
    return (
      <div className="tf-card">
        <div className="tf-steps"><span>1 Scan</span><span>2 Verify</span><span className="on">3 Backup</span></div>
        <h3><RiCheckLine style={{ color: '#10b981', verticalAlign: '-2px' }} /> Save your backup codes</h3>
        <p>Store these somewhere safe. Each one works <strong>once</strong> if you lose access to your authenticator.</p>
        <div className="tf-codes-grid">
          {backupCodes.map((c) => <span key={c} className="tf-code">{c}</span>)}
        </div>
        <div className="tf-row">
          <button className="btn btn-secondary" onClick={downloadCodes}><RiDownload2Line /> Download Backup Codes</button>
          <button className="btn btn-primary" onClick={finishSetup}><RiCheckLine /> I've saved my codes</button>
        </div>
      </div>
    );
  }

  /* ── STATE 1: not enabled ─────────────────────────────────────────────── */
  return (
    <div className="tf-card">
      <div className="tf-head">
        <div>
          <h3>Two-Factor Authentication</h3>
          <p>Add an extra layer of security — a code from your phone at every login.</p>
        </div>
      </div>
      <button className="btn btn-primary" onClick={startSetup} disabled={busy}>
        {busy ? <RiLoader4Line className="spin" /> : <><RiShieldKeyholeLine /> Enable 2FA</>}
      </button>
    </div>
  );
}
