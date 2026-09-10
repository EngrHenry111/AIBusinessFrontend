import { useState, useEffect, useCallback, useRef } from 'react';
import { storeAdminService, paymentSettingsService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiStoreLine, RiFileCopyLine, RiCheckLine, RiExternalLinkLine, RiUploadCloud2Line,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './StoreSettings.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

const TABS = [
  { id: 'setup', label: 'Store Setup' },
  { id: 'payment', label: 'Payment Setup' },
  { id: 'appearance', label: 'Store Appearance' },
  { id: 'analytics', label: 'Store Analytics' },
];

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  );
}

export default function StoreSettings() {
  const { updateCompany } = useAuth();
  const [tab, setTab] = useState('setup');

  const [store, setStore] = useState(null);
  const [pay, setPay] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        storeAdminService.getSettings(),
        paymentSettingsService.getSettings(),
      ]);
      setStore(s.data.data);
      setPay(p.data.data);
    } catch {
      toast.error('Could not load store settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !store || !pay) {
    return (
      <div className="store-settings">
        <div className="page-header"><h1>My Store</h1></div>
        <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
      </div>
    );
  }

  const paymentReady = pay.isPaymentSetup;

  return (
    <div className="store-settings fade-in">
      <div className="page-header">
        <h1><RiStoreLine style={{ verticalAlign: '-3px' }} /> My Store</h1>
        <p>Sell your products online. BizlyAI takes a {pay.commissionPercent ?? 3}% commission on each sale; the rest settles to your bank automatically.</p>
      </div>

      <div className="ss-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'setup' && <SetupTab store={store} paymentReady={paymentReady} onSaved={(d) => { setStore((s) => ({ ...s, ...d })); updateCompany?.({ storeEnabled: d.storeEnabled }); }} />}
      {tab === 'payment' && <PaymentTab pay={pay} onChanged={load} />}
      {tab === 'appearance' && <AppearanceTab store={store} onSaved={(settings) => setStore((s) => ({ ...s, settings }))} />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

/* ── Tab 1: Store Setup ──────────────────────────────────────────────── */
function SetupTab({ store, paymentReady, onSaved }) {
  const [slug, setSlug] = useState(store.storeSlug || '');
  const [description, setDescription] = useState(store.settings.description || '');
  const [announcement, setAnnouncement] = useState(store.settings.announcement || '');
  const [enabled, setEnabled] = useState(store.storeEnabled);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${store.storeUrl.replace(/\/[^/]*$/, '')}/${slug}`;

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeAdminService.updateSettings({
        storeSlug: slug, storeEnabled: enabled, description, announcement,
      });
      toast.success('Store settings saved');
      onSaved({ storeSlug: data.data.storeSlug, storeEnabled: data.data.storeEnabled, settings: { ...store.settings, description, announcement } });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad">
      <div className="ss-toggle-row">
        <div>
          <div className="t-label">Enable store</div>
          <div className="t-help">
            {paymentReady ? 'Your store is reachable at the link below when enabled.' : 'Set up payments first to enable your store.'}
          </div>
        </div>
        <Switch checked={enabled} disabled={!paymentReady} onChange={setEnabled} />
      </div>

      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="form-label">Store link</label>
        <div className="ss-url">
          <span style={{ flex: 1 }}>{url}</span>
          <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? <RiCheckLine /> : <RiFileCopyLine />} {copied ? 'Copied' : 'Copy'}</button>
          {store.storeEnabled && (
            <a className="btn btn-ghost btn-sm" href={store.storeUrl} target="_blank" rel="noreferrer"><RiExternalLinkLine /> Open</a>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Store slug</label>
        <input className="form-input" value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="your-business" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lowercase letters, numbers and hyphens only.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Store description</label>
        <textarea className="form-input" rows={3} value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell shoppers what you sell." />
      </div>

      <div className="form-group">
        <label className="form-label">Announcement bar (optional)</label>
        <input className="form-input" value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="e.g. Free delivery within Lagos this week!" />
      </div>

      <button className="btn btn-primary" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

/* ── Tab 2: Payment Setup ────────────────────────────────────────────── */
function PaymentTab({ pay, onChanged }) {
  const [banks, setBanks] = useState([]);
  const [editing, setEditing] = useState(!pay.isPaymentSetup);
  const [bankCode, setBankCode] = useState(pay.bankCode || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [verified, setVerified] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paymentSettingsService.getBanks()
      .then(({ data }) => setBanks(data.data))
      .catch(() => toast.error('Could not load bank list'));
  }, []);

  useEffect(() => { setVerified(null); }, [bankCode, accountNumber]);

  async function verify() {
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      toast.error('Select a bank and enter a 10-digit account number');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await paymentSettingsService.verifyAccount({ accountNumber, bankCode });
      setVerified(data.data.accountName);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not verify that account');
    } finally {
      setVerifying(false);
    }
  }

  async function submit() {
    if (!verified) { toast.error('Verify the account first'); return; }
    setSaving(true);
    try {
      await (pay.isPaymentSetup
        ? paymentSettingsService.updatePayment({ bankCode, accountNumber })
        : paymentSettingsService.setupPayment({ bankCode, accountNumber }));
      toast.success('Payments configured');
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to set up payments');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad">
      <div className={`ss-status ${pay.isPaymentSetup ? 'ok' : 'warn'}`}>
        {pay.isPaymentSetup ? <RiCheckLine /> : '⚠️'}
        {pay.isPaymentSetup ? 'Ready to accept payments' : 'Payment not configured'}
      </div>

      {pay.isPaymentSetup && !editing ? (
        <>
          <p style={{ fontSize: 14 }}>
            Payments go to <strong>{pay.accountName}</strong> at <strong>{pay.bankName || 'your bank'}</strong>.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Account number: {pay.accountNumberMasked}</p>
          <button className="btn btn-secondary" onClick={() => { setEditing(true); setAccountNumber(''); setVerified(null); }}>
            Update bank details
          </button>
        </>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Bank</label>
            <select className="form-input form-select" value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
              <option value="">Select your bank</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account number</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" inputMode="numeric" maxLength={10} value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} />
              <button className="btn btn-secondary" disabled={verifying} onClick={verify}>
                {verifying ? 'Checking…' : 'Verify'}
              </button>
            </div>
          </div>

          {verified && (
            <div className="ss-status ok" style={{ marginTop: 4 }}>
              <RiCheckLine /> {verified}
            </div>
          )}

          <button className="btn btn-primary" disabled={saving || !verified} onClick={submit}>
            {saving ? 'Saving…' : pay.isPaymentSetup ? 'Update bank details' : 'Setup Payment'}
          </button>
          {pay.isPaymentSetup && (
            <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setEditing(false)}>Cancel</button>
          )}
        </>
      )}
    </div>
  );
}

/* ── Tab 3: Store Appearance ─────────────────────────────────────────── */
function AppearanceTab({ store, onSaved }) {
  const fileRef = useRef(null);
  const [banner, setBanner] = useState(store.settings.banner || null);
  const [primaryColor, setPrimaryColor] = useState(store.settings.primaryColor || '#6366f1');
  const [showOutOfStock, setShowOutOfStock] = useState(store.settings.showOutOfStock !== false);
  const [allowBackorders, setAllowBackorders] = useState(Boolean(store.settings.allowBackorders));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadBanner(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('banner', file);
      const { data } = await storeAdminService.uploadBanner(fd);
      setBanner(data.data.banner);
      toast.success('Banner updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeAdminService.updateSettings({
        banner, primaryColor, showOutOfStock, allowBackorders,
      });
      toast.success('Appearance saved');
      onSaved(data.data.settings);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad">
      <div className="form-group">
        <label className="form-label">Store banner</label>
        {banner && <img className="ss-banner-preview" src={banner} alt="" />}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <RiUploadCloud2Line /> {uploading ? 'Uploading…' : banner ? 'Replace banner' : 'Upload banner'}
          </button>
          {banner && <button className="btn btn-ghost" onClick={() => setBanner(null)}>Remove</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { uploadBanner(e.target.files[0]); e.target.value = ''; }} />
      </div>

      <div className="form-group">
        <label className="form-label">Primary colour</label>
        <div className="ss-color-row">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          <input className="form-input" style={{ maxWidth: 140 }} value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)} />
        </div>
      </div>

      <div className="ss-toggle-row">
        <div>
          <div className="t-label">Show out-of-stock products</div>
          <div className="t-help">Display products with zero stock (greyed out) instead of hiding them.</div>
        </div>
        <Switch checked={showOutOfStock} onChange={setShowOutOfStock} />
      </div>
      <div className="ss-toggle-row">
        <div>
          <div className="t-label">Allow backorders</div>
          <div className="t-help">Let customers buy even when a product is out of stock.</div>
        </div>
        <Switch checked={allowBackorders} onChange={setAllowBackorders} />
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save appearance'}
      </button>
    </div>
  );
}

/* ── Tab 4: Store Analytics ──────────────────────────────────────────── */
function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeAdminService.getAnalytics()
      .then(({ data: r }) => setData(r.data))
      .catch(() => toast.error('Could not load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />;
  if (!data) return null;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="ss-stat-grid">
        <div className="ss-stat"><div className="s-label">Store revenue</div><div className="s-value">{naira(data.totalRevenue)}</div></div>
        <div className="ss-stat"><div className="s-label">Store orders</div><div className="s-value">{data.totalOrders}</div></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Top selling products</h3>
        {data.topProducts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No sales yet.</p>
        ) : (
          <table className="ss-table">
            <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={i}><td>{p.name}</td><td>{p.units}</td><td>{naira(p.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card card-pad">
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Recent store orders</h3>
        {data.recentOrders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No orders yet.</p>
        ) : (
          <table className="ss-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o._id}>
                  <td>{o.orderNumber}</td>
                  <td>{o.customer?.name || '—'}</td>
                  <td>{naira(o.total)}</td>
                  <td><span className="badge badge-neutral">{o.status}</span></td>
                  <td>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
