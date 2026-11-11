import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { whatsappService } from '../../services';
import { connectSocket } from '../../services/socket';
import {
  RiWhatsappLine, RiLoader4Line, RiLink, RiLinkUnlink, RiRefreshLine, RiInboxLine, RiArrowRightLine,
  RiShieldCheckLine, RiQrCodeLine, RiSendPlaneLine, RiErrorWarningLine, RiFileCopyLine, RiExternalLinkLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './WhatsApp.css';

const MANAGERS = ['company_owner', 'manager', 'super_admin'];

// Connecting the business's WhatsApp number. The chats themselves are
// answered in the shared Inbox, alongside every other channel.
export default function WhatsApp() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;
  const canManage = MANAGERS.includes(user?.role);

  const [cloud, setCloud] = useState(null);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '' });
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [newToken, setNewToken] = useState('');

  const [waStatus, setWaStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [waError, setWaError] = useState(null);
  const [waPhone, setWaPhone] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await whatsappService.getStatus();
      setWaStatus(data.data.status);
      setQr(data.data.qr || null);
      setWaError(data.data.error || null);
      setWaPhone(data.data.phone || null);
      setCloud(data.data.cloud || null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (waStatus === 'connected' || waStatus === 'disconnected' || waStatus === 'error') return undefined;
    const iv = setInterval(loadStatus, 4000);
    return () => clearInterval(iv);
  }, [waStatus, loadStatus]);

  useEffect(() => {
    if (!companyId) return undefined;
    const socket = connectSocket();
    socket.on('connect', () => {
      socket.emit('whatsapp:join', companyId);
      socket.emit('join_user', user._id);
    });
    socket.on('whatsapp:qr', (p) => { setQr(p.qr); setWaStatus('qr_ready'); });
    socket.on('whatsapp:status', (p) => {
      setWaStatus(p.status);
      setWaError(p.error || null);
      if (p.status === 'connected') { setQr(null); setWaPhone(p.phone || null); toast.success('WhatsApp connected'); }
    });
    // Official WhatsApp token stopped working / expiring soon.
    socket.on('whatsapp:token_status', () => loadStatus());
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  // ── Official WhatsApp ────────────────────────────────────────────────────
  async function connectCloud(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await whatsappService.connectCloud(form);
      setCloud(data.data);
      setForm({ phoneNumberId: '', wabaId: '', accessToken: '' });
      toast.success(data.message || 'WhatsApp connected');
      loadStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not connect WhatsApp', { duration: 7000 });
    } finally { setSaving(false); }
  }

  // Replace the token on a connected number (expired, or moving to a never-expiring one).
  async function updateToken(e) {
    e.preventDefault();
    if (!newToken) return;
    setSaving(true);
    try {
      const { data } = await whatsappService.connectCloud({ phoneNumberId: cloud.phoneNumberId, wabaId: cloud.wabaId, accessToken: newToken });
      setCloud(data.data);
      setNewToken('');
      setShowTokenForm(false);
      toast.success('Access token updated. Replies are working again.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the token', { duration: 7000 });
    } finally { setSaving(false); }
  }

  async function disconnectCloud() {
    if (!window.confirm('Disconnect this WhatsApp number? The AI will stop answering it.')) return;
    try {
      const { data } = await whatsappService.disconnectCloud();
      setCloud(data.data);
      toast.success('WhatsApp disconnected');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to disconnect'); }
  }

  async function sendTest(e) {
    e.preventDefault();
    if (!testPhone.trim()) return;
    setTesting(true);
    try {
      const { data } = await whatsappService.sendTest(testPhone.trim());
      toast.success(data.message || 'Test message sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test message failed', { duration: 7000 });
    } finally { setTesting(false); }
  }

  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Copied'); };

  // ── QR code (unofficial) ─────────────────────────────────────────────────
  async function connectQr() {
    setConnecting(true);
    try {
      const { data } = await whatsappService.initialize();
      setWaStatus(data.data?.status || 'connecting');
      toast('Starting WhatsApp — scan the QR code', { icon: '📱' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start WhatsApp');
    } finally { setConnecting(false); }
  }

  async function disconnectQr() {
    if (!window.confirm('Disconnect this WhatsApp number?')) return;
    try {
      await whatsappService.disconnect();
      setWaStatus('disconnected'); setQr(null); setWaPhone(null);
      toast.success('WhatsApp disconnected');
    } catch { toast.error('Failed to disconnect'); }
  }

  const cloudOn = Boolean(cloud?.connected);
  const expiresAt = cloud?.tokenExpiresAt ? new Date(cloud.tokenExpiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt - Date.now()) / 86400000) : null;
  // managed: BizlyAI connected this number on its own account and keeps the token.
  const managed = Boolean(cloud?.managed);
  const expiringSoon = !managed && daysLeft !== null && daysLeft <= 7;
  const tokenFormOpen = cloudOn && canManage && !managed && (cloud.needsReconnect || expiringSoon || showTokenForm);
  const qrOn = waStatus === 'connected';

  return (
    <div className="wa-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiWhatsappLine style={{ color: '#25D366' }} /> WhatsApp</h1>
            <p>Connect your business number. The AI answers customers, and your team takes over from the Inbox.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadStatus}>
            <RiRefreshLine /> Refresh
          </button>
        </div>
      </div>

      {/* ── Official WhatsApp (Cloud API) ─────────────────────────────── */}
      <section className="wa-card card card-pad">
        <div className="wa-card-head">
          <RiShieldCheckLine className="wa-card-icon" />
          <div>
            <h2>Official WhatsApp <span className="wa-pill">Recommended</span></h2>
            <p>Meta's WhatsApp Business Platform. Free to receive and reply, no phone needs to stay online, and no QR code to re-scan.</p>
          </div>
        </div>

        {cloud && !cloud.webhookReady && (
          <div className="wa-alert">
            <RiErrorWarningLine />
            <span>Incoming messages can't reach BizlyAI yet: the platform's WhatsApp webhook isn't configured on the server. Sending works; receiving starts once it is set up.</span>
          </div>
        )}

        {cloudOn ? (
          <>
            <div className="wa-connected-row">
              <span className="wa-status-dot connected" />
              <div className="wa-connected-text">
                <strong>{cloud.displayPhone || 'Connected'}</strong>
                <span>{[cloud.verifiedName, cloud.connectedAt && `connected ${new Date(cloud.connectedAt).toLocaleDateString()}`].filter(Boolean).join(' · ')}</span>
              </div>
              {canManage && <button className="btn btn-sm btn-secondary" onClick={disconnectCloud}><RiLinkUnlink /> Disconnect</button>}
            </div>

            {cloud.needsReconnect && managed ? (
              <div className="wa-alert wa-alert-danger" role="alert">
                <RiErrorWarningLine />
                <span>
                  <strong>Replies have paused.</strong> There's a problem with the connection BizlyAI manages for this number. Our team has been alerted and is fixing it — you don't need to do anything.
                  Customers' messages still reach your Inbox.
                </span>
              </div>
            ) : cloud.needsReconnect ? (
              <div className="wa-alert wa-alert-danger" role="alert">
                <RiErrorWarningLine />
                <span>
                  <strong>Replies have stopped.</strong> Meta no longer accepts this number's access token{cloud.lastError ? ` (${cloud.lastError.replace(/\.$/, '')})` : ''}.
                  Customers' messages still reach your Inbox, but neither the AI nor your team can answer until you paste a new token below.
                </span>
              </div>
            ) : expiringSoon ? (
              <div className="wa-alert" role="alert">
                <RiErrorWarningLine />
                <span>
                  Your access token {daysLeft <= 0 ? 'expires today' : `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`} ({expiresAt.toLocaleDateString()}).
                  Paste a new one below — a System User token set to <em>Never expire</em> means you won't need to do this again.
                </span>
              </div>
            ) : managed ? (
              <p className="wa-token-line">Connected and looked after by BizlyAI — nothing for you to renew.</p>
            ) : (
              <p className="wa-token-line">
                {expiresAt ? `Access token valid until ${expiresAt.toLocaleDateString()}.` : 'Access token never expires.'}
                {canManage && !showTokenForm && <button type="button" className="wa-link-btn" onClick={() => setShowTokenForm(true)}>Update token</button>}
              </p>
            )}

            {tokenFormOpen && (
              <form className="wa-test" onSubmit={updateToken}>
                <label htmlFor="wa-new-token">New access token</label>
                <div className="wa-test-row">
                  <input id="wa-new-token" className="form-input" type="password" autoComplete="off" placeholder="Paste the new token (kept secret)" value={newToken} onChange={(e) => setNewToken(e.target.value.trim())} />
                  <button className="btn btn-primary" disabled={saving || newToken.length < 20}>
                    {saving ? <RiLoader4Line className="spin" /> : <RiLink />} Save token
                  </button>
                  {showTokenForm && !cloud.needsReconnect && !expiringSoon && (
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowTokenForm(false); setNewToken(''); }}>Cancel</button>
                  )}
                </div>
                <small>Same number, new token: your chats and settings stay as they are.</small>
              </form>
            )}
            <form className="wa-test" onSubmit={sendTest}>
              <label htmlFor="wa-test-phone">Send a test message</label>
              <div className="wa-test-row">
                <input id="wa-test-phone" className="form-input" placeholder="Your WhatsApp number, e.g. 0801 234 5678" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                <button className="btn btn-secondary" disabled={testing || !testPhone.trim()}>
                  {testing ? <RiLoader4Line className="spin" /> : <RiSendPlaneLine />} Send
                </button>
              </div>
              <small>Sends Meta's "hello_world" template. With a test number, the recipient must be on the test number's allowed list in your Meta app.</small>
            </form>
          </>
        ) : canManage ? (
          <form className="wa-cloud-form" onSubmit={connectCloud}>
            <ol className="wa-steps">
              <li>Open your app at <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps <RiExternalLinkLine /></a> → <strong>WhatsApp → API Setup</strong>.</li>
              <li>Copy the <strong>Phone number ID</strong> and the <strong>WhatsApp Business Account ID</strong> into the fields below.</li>
              <li>Paste an <strong>access token</strong>. For a connection that never expires, use a System User token (Business settings → System users) with the <em>whatsapp_business_messaging</em> and <em>whatsapp_business_management</em> permissions.</li>
            </ol>
            <div className="wa-fields">
              <label>
                Phone number ID
                <input className="form-input" inputMode="numeric" placeholder="e.g. 1446066501920917" value={form.phoneNumberId}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value.replace(/\s/g, '') }))} required />
              </label>
              <label>
                WhatsApp Business Account ID
                <input className="form-input" inputMode="numeric" placeholder="e.g. 924215253977795" value={form.wabaId}
                  onChange={(e) => setForm((f) => ({ ...f, wabaId: e.target.value.replace(/\s/g, '') }))} required />
              </label>
              <label className="wa-field-wide">
                Access token
                <input className="form-input" type="password" autoComplete="off" placeholder="Paste the token (kept secret, never shown again)" value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value.trim() }))} required />
              </label>
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <RiLoader4Line className="spin" /> : <RiLink />} Connect WhatsApp
            </button>
          </form>
        ) : (
          <p className="wa-muted">Not connected. Ask your business owner or a manager to connect WhatsApp.</p>
        )}

        {cloud?.webhookUrl && user?.role === 'super_admin' && (
          <div className="wa-webhook">
            <span>Platform webhook (set once in the Meta app → WhatsApp → Configuration):</span>
            <code>{cloud.webhookUrl}</code>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(cloud.webhookUrl)}><RiFileCopyLine /> Copy</button>
          </div>
        )}
      </section>

      {/* ── QR code (unofficial, whatsapp-web.js) ─────────────────────── */}
      {!cloudOn && (
        <details className="wa-card card wa-qr-section" open={qrOn || waStatus === 'qr_ready' || waStatus === 'connecting'}>
          <summary>
            <RiQrCodeLine /> Link with a QR code instead <span className="wa-muted">(unofficial: your phone must stay online, and Meta may restrict the number)</span>
          </summary>
          {!qrOn ? (
            <div className="wa-connect">
              <div className="wa-connect-info">
                <div className={`wa-status-dot ${waStatus}`} />
                <div>
                  <strong>
                    {waStatus === 'qr_ready' ? 'Scan the QR code'
                      : waStatus === 'connecting' ? 'Starting WhatsApp…'
                        : waStatus === 'error' ? 'Connection error'
                          : 'Not linked'}
                  </strong>
                  <p>
                    {waError || (waStatus === 'qr_ready'
                      ? 'Open WhatsApp on your phone → Linked devices → Link a device'
                      : 'Links your WhatsApp like WhatsApp Web does.')}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="wa-connect-action">
                  {qr && waStatus === 'qr_ready' ? (
                    <img className="wa-qr" src={qr} alt="WhatsApp QR code" />
                  ) : (
                    <button className="btn btn-secondary" onClick={connectQr} disabled={connecting || waStatus === 'connecting'}>
                      {connecting || waStatus === 'connecting' ? <RiLoader4Line className="spin" /> : <RiQrCodeLine />}
                      {waStatus === 'error' ? 'Try again' : 'Show QR code'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="wa-connected-row">
              <span className="wa-status-dot connected" />
              <span>Linked{waPhone ? ` · +${waPhone}` : ''}</span>
              {canManage && <button className="btn btn-sm btn-secondary" onClick={disconnectQr}><RiLinkUnlink /> Unlink</button>}
            </div>
          )}
        </details>
      )}

      <Link to="/inbox?channel=whatsapp" className="wa-inbox-link card card-pad">
        <RiInboxLine />
        <div>
          <strong>WhatsApp chats are in the Inbox</strong>
          <p>Read and answer them next to your website chats, with each customer's history and purchases beside the conversation.</p>
        </div>
        <RiArrowRightLine />
      </Link>
    </div>
  );
}
