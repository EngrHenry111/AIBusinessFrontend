import { useState, useEffect, useCallback, useRef } from 'react';
import { storeAdminService, paymentSettingsService, couponService, giftCardService, subscriptionPlanService, productService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiStoreLine, RiFileCopyLine, RiCheckLine, RiExternalLinkLine, RiUploadCloud2Line,
  RiAddLine, RiDeleteBinLine, RiCoupon3Line, RiTruckLine, RiGiftLine, RiBox3Line, RiCloseLine, RiPencilLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './StoreSettings.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja',
];

const TABS = [
  { id: 'setup', label: 'Store Setup' },
  { id: 'payment', label: 'Payment Setup' },
  { id: 'appearance', label: 'Store Appearance' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'delivery', label: 'Delivery Settings' },
  { id: 'giftcards', label: 'Gift Cards' },
  { id: 'subscriptions', label: 'Subscriptions' },
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
      {tab === 'coupons' && <CouponsTab />}
      {tab === 'delivery' && <DeliveryTab store={store} onSaved={(deliverySettings) => setStore((s) => ({ ...s, deliverySettings }))} />}
      {tab === 'giftcards' && <GiftCardsTab store={store} onSaved={(giftCardSettings) => setStore((s) => ({ ...s, giftCardSettings }))} />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

/* ── Tab 1: Store Setup ──────────────────────────────────────────────── */
const MARKETPLACE_CATEGORIES = ['Fashion', 'Food', 'Electronics', 'Beauty', 'Home', 'Services', 'Agriculture', 'Other'];

function SetupTab({ store, paymentReady, onSaved }) {
  const [slug, setSlug] = useState(store.storeSlug || '');
  const [description, setDescription] = useState(store.settings.description || '');
  const [announcement, setAnnouncement] = useState(store.settings.announcement || '');
  const [enabled, setEnabled] = useState(store.storeEnabled);
  const [mpCategory, setMpCategory] = useState(store.marketplace?.category || 'Other');
  const [mpLocation, setMpLocation] = useState(store.marketplace?.location || '');
  const [mpTags, setMpTags] = useState((store.marketplace?.tags || []).join(', '));
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
        marketplace: { category: mpCategory, location: mpLocation, tags: mpTags.split(',').map((t) => t.trim()).filter(Boolean) },
      });
      toast.success('Store settings saved');
      onSaved({
        storeSlug: data.data.storeSlug, storeEnabled: data.data.storeEnabled,
        settings: { ...store.settings, description, announcement },
        marketplace: data.data.marketplace,
      });
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

      <h3 style={{ fontSize: 14, marginTop: 20 }}>Marketplace Listing</h3>
      <p className="ss-hint" style={{ marginBottom: 10 }}>How your store appears in the central BizlyAI marketplace at bislyai.com/market.</p>
      <div className="form-grid-2">
        <div className="form-group"><label className="form-label">Category</label>
          <select className="form-input form-select" value={mpCategory} onChange={(e) => setMpCategory(e.target.value)}>
            {MARKETPLACE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div className="form-group"><label className="form-label">Location</label>
          <input className="form-input" value={mpLocation} onChange={(e) => setMpLocation(e.target.value)} placeholder="e.g. Lagos" /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Tags (comma-separated)</label>
        <input className="form-input" value={mpTags} onChange={(e) => setMpTags(e.target.value)} placeholder="ankara, handmade, wholesale" />
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
            <select className="form-input form-select" value={bankCode} onChange={(e) => {
              const selectedBank = banks.find((b) => b.code === e.target.value);
              console.log('Selected bank code:', selectedBank?.code);
              console.log('Selected bank name:', selectedBank?.name);
              setBankCode(e.target.value);
            }}>
              <option value="">Select your bank</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account number</label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Enter your 10-digit bank account number. Not your phone number.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" inputMode="numeric" maxLength={10} value={accountNumber}
                placeholder="e.g. 0123456789"
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

/* ── Tab: Coupons ─────────────────────────────────────────────────────── */
const EMPTY_COUPON = { code: '', type: 'percentage', value: '', minimumOrder: '', maximumDiscount: '', usageLimit: '', expiresAt: '' };

function CouponsTab() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    couponService.getAll().then(({ data }) => setCoupons(data.data)).catch(() => toast.error('Could not load coupons'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return toast.error('Code and value are required.');
    setSaving(true);
    try {
      await couponService.create({
        code: form.code.trim(), type: form.type, value: Number(form.value),
        minimumOrder: form.minimumOrder || undefined, maximumDiscount: form.maximumDiscount || undefined,
        usageLimit: form.usageLimit || undefined, expiresAt: form.expiresAt || undefined,
      });
      toast.success('Coupon created');
      setForm(EMPTY_COUPON);
      setShowForm(false);
      load();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c) {
    try {
      await couponService.update(c._id, { isActive: !c.isActive });
      load();
    } catch { toast.error('Failed to update'); }
  }

  async function remove(c) {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try { await couponService.delete(c._id); load(); toast.success('Coupon deleted'); }
    catch { toast.error('Failed to delete'); }
  }

  return (
    <div className="card card-pad">
      <div className="page-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}><RiCoupon3Line style={{ verticalAlign: '-3px' }} /> Coupons</h2>
          <p className="settings-subtitle" style={{ margin: '4px 0 0' }}>Discount codes shoppers can apply at checkout.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowForm((s) => !s)}><RiAddLine /> New Coupon</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="ss-coupon-form">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Code</label>
              <input className="form-input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-input form-select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select></div>
            <div className="form-group"><label className="form-label">Value ({form.type === 'percentage' ? '%' : '₦'})</label>
              <input className="form-input" type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Minimum Order (₦)</label>
              <input className="form-input" type="number" value={form.minimumOrder} onChange={(e) => setForm((f) => ({ ...f, minimumOrder: e.target.value }))} /></div>
            {form.type === 'percentage' && (
              <div className="form-group"><label className="form-label">Maximum Discount (₦)</label>
                <input className="form-input" type="number" value={form.maximumDiscount} onChange={(e) => setForm((f) => ({ ...f, maximumDiscount: e.target.value }))} /></div>
            )}
            <div className="form-group"><label className="form-label">Usage Limit</label>
              <input className="form-input" type="number" value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} placeholder="Unlimited" /></div>
            <div className="form-group"><label className="form-label">Expires</label>
              <input className="form-input" type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} /></div>
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Coupon'}</button>
        </form>
      )}

      <table className="ss-table" style={{ marginTop: 16 }}>
        <thead><tr><th>Code</th><th>Discount</th><th>Min. Order</th><th>Used</th><th>Expires</th><th>Status</th><th /></tr></thead>
        <tbody>
          {coupons === null && <tr><td colSpan={7}>Loading…</td></tr>}
          {coupons?.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--text-muted)' }}>No coupons yet.</td></tr>}
          {coupons?.map((c) => (
            <tr key={c._id}>
              <td><strong>{c.code}</strong></td>
              <td>{c.type === 'percentage' ? `${c.value}%` : naira(c.value)}{c.maximumDiscount ? ` (max ${naira(c.maximumDiscount)})` : ''}</td>
              <td>{c.minimumOrder ? naira(c.minimumOrder) : '—'}</td>
              <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
              <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
              <td>
                <button className={`badge ${c.isActive ? 'badge-success' : 'badge-neutral'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => toggleActive(c)}>
                  {c.isActive ? 'Active' : 'Disabled'}
                </button>
              </td>
              <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(c)}><RiDeleteBinLine /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab: Delivery Settings ───────────────────────────────────────────── */
function DeliveryTab({ store, onSaved }) {
  const ds = store.deliverySettings || {};
  const [feesByState, setFeesByState] = useState(ds.feesByState || {});
  const [defaultFee, setDefaultFee] = useState(ds.defaultFee ?? 2000);
  const [freeDeliveryMinimum, setFreeDeliveryMinimum] = useState(ds.freeDeliveryMinimum ?? '');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(ds.estimatedDeliveryDays ?? 3);
  const [podEnabled, setPodEnabled] = useState(Boolean(ds.podEnabled));
  const [podMaxAmount, setPodMaxAmount] = useState(ds.podMaxAmount ?? 50000);
  const [saving, setSaving] = useState(false);

  function setStateFee(state, value) {
    setFeesByState((f) => {
      const next = { ...f };
      if (value === '' || value == null) delete next[state];
      else next[state] = Number(value);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeAdminService.updateSettings({
        deliverySettings: {
          feesByState, defaultFee: Number(defaultFee) || 0,
          freeDeliveryMinimum: freeDeliveryMinimum === '' ? null : Number(freeDeliveryMinimum),
          estimatedDeliveryDays: Number(estimatedDeliveryDays) || 3,
          podEnabled, podMaxAmount: Number(podMaxAmount) || 0,
        },
      });
      toast.success('Delivery settings saved');
      onSaved(data.data.deliverySettings);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad">
      <h2 style={{ marginTop: 0 }}><RiTruckLine style={{ verticalAlign: '-3px' }} /> Delivery Settings</h2>

      <div className="form-grid-2">
        <div className="form-group"><label className="form-label">Default delivery fee (₦)</label>
          <input className="form-input" type="number" value={defaultFee} onChange={(e) => setDefaultFee(e.target.value)} />
          <span className="ss-hint">Used for any state not set below.</span></div>
        <div className="form-group"><label className="form-label">Free delivery from (₦)</label>
          <input className="form-input" type="number" value={freeDeliveryMinimum} onChange={(e) => setFreeDeliveryMinimum(e.target.value)} placeholder="No free delivery" /></div>
        <div className="form-group"><label className="form-label">Estimated delivery (days)</label>
          <input className="form-input" type="number" value={estimatedDeliveryDays} onChange={(e) => setEstimatedDeliveryDays(e.target.value)} /></div>
      </div>

      <div className="ss-toggle-row">
        <div>
          <div className="t-label">Enable Pay on Delivery</div>
          <div className="t-help">Let shoppers pay in cash when their order arrives.</div>
        </div>
        <Switch checked={podEnabled} onChange={setPodEnabled} />
      </div>
      {podEnabled && (
        <div className="form-group" style={{ maxWidth: 260 }}>
          <label className="form-label">Maximum order for Pay on Delivery (₦)</label>
          <input className="form-input" type="number" value={podMaxAmount} onChange={(e) => setPodMaxAmount(e.target.value)} />
        </div>
      )}

      <h3 style={{ fontSize: 14, marginTop: 20 }}>Delivery Fee by State</h3>
      <p className="ss-hint" style={{ marginBottom: 10 }}>Leave blank to use the default fee above.</p>
      <div className="ss-state-fees">
        {NG_STATES.map((state) => (
          <div key={state} className="ss-state-fee-row">
            <span>{state}</span>
            <input className="form-input" type="number" placeholder={String(defaultFee)} value={feesByState[state] ?? ''} onChange={(e) => setStateFee(state, e.target.value)} />
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save Delivery Settings'}
      </button>
    </div>
  );
}

/* ── Tab: Gift Cards ───────────────────────────────────────────────────── */
function GiftCardsTab({ store, onSaved }) {
  const gcs = store.giftCardSettings || {};
  const [enabled, setEnabled] = useState(gcs.enabled !== false);
  const [minAmount, setMinAmount] = useState(gcs.minAmount ?? 500);
  const [maxAmount, setMaxAmount] = useState(gcs.maxAmount ?? 500000);
  const [expiryDays, setExpiryDays] = useState(gcs.expiryDays ?? 365);
  const [saving, setSaving] = useState(false);

  const [giftCards, setGiftCards] = useState([]);
  const [stats, setStats] = useState({ sold: 0, redeemed: 0, outstanding: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    giftCardService.getAll({ status: statusFilter || undefined, limit: 100 })
      .then(({ data }) => { setGiftCards(data.data); setStats(data.stats); })
      .catch(() => toast.error('Failed to load gift cards'))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeAdminService.updateSettings({
        giftCardSettings: { enabled, minAmount: Number(minAmount) || 500, maxAmount: Number(maxAmount) || 500000, expiryDays: Number(expiryDays) || 365 },
      });
      toast.success('Gift card settings saved');
      onSaved(data.data.giftCardSettings);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card card-pad">
        <h2 style={{ marginTop: 0 }}><RiGiftLine style={{ verticalAlign: '-3px' }} /> Gift Card Settings</h2>

        <div className="ss-toggle-row">
          <div>
            <div className="t-label">Enable gift cards</div>
            <div className="t-help">Let shoppers buy and redeem gift cards on your store.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>

        <div className="form-grid-2">
          <div className="form-group"><label className="form-label">Minimum amount (₦)</label>
            <input className="form-input" type="number" min={100} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Maximum amount (₦)</label>
            <input className="form-input" type="number" min={500} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Expiry period (days)</label>
            <input className="form-input" type="number" min={1} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} /></div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Gift Card Settings'}
        </button>
      </div>

      <div className="ss-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="ss-stat"><div className="s-label">Total Sold</div><div className="s-value">{naira(stats.sold)}</div></div>
        <div className="ss-stat"><div className="s-label">Total Redeemed</div><div className="s-value">{naira(stats.redeemed)}</div></div>
        <div className="ss-stat"><div className="s-label">Outstanding Balance</div><div className="s-value">{naira(stats.outstanding)}</div></div>
        <div className="ss-stat"><div className="s-label">Gift Cards Issued</div><div className="s-value">{stats.count}</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Gift Cards</h3>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Code</th><th>Amount</th><th>Balance</th><th>Recipient</th><th>Status</th><th>Purchased</th><th>Expires</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="ss-hint">Loading…</td></tr>}
              {!loading && giftCards.map((gc) => (
                <tr key={gc._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{gc.code}</td>
                  <td>{naira(gc.amount)}</td>
                  <td>{naira(gc.balance)}</td>
                  <td style={{ fontSize: 13 }}>{gc.sentTo?.name}<br /><span className="ss-hint">{gc.sentTo?.email}</span></td>
                  <td><span className={`badge badge-${{ active: 'success', used: 'neutral', expired: 'danger', cancelled: 'danger' }[gc.status]}`}>{gc.status}</span></td>
                  <td className="ss-hint">{new Date(gc.purchasedAt).toLocaleDateString()}</td>
                  <td className="ss-hint">{new Date(gc.expiresAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!loading && !giftCards.length && <tr><td colSpan={7} className="ss-hint">No gift cards yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Tab: Subscriptions ──────────────────────────────────────────────── */
const EMPTY_PLAN = { name: '', description: '', interval: 'monthly', price: '', originalPrice: '', deliveryFee: '', trialDays: '', maxSubscribers: '', perks: '', items: [] };
const SUB_INTERVAL_LABEL = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', quarterly: 'Quarterly' };

function ProductPicker({ items, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    let alive = true;
    productService.getAll({ search: q, status: 'active', limit: 10 }).then(({ data }) => { if (alive) setResults(data.data); }).catch(() => {});
    return () => { alive = false; };
  }, [q]);

  function addProduct(p) {
    if (items.some((i) => i.productId === p._id)) return;
    onChange([...items, { productId: p._id, name: p.name, quantity: 1, unitPrice: p.price }]);
    setQ(''); setResults([]);
  }
  const updateQty = (id, qty) => onChange(items.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, Number(qty) || 1) } : i)));
  const remove = (id) => onChange(items.filter((i) => i.productId !== id));

  return (
    <div className="form-group">
      <label className="form-label">Products in this box</label>
      <div style={{ position: 'relative' }}>
        <input className="form-input" placeholder="Search products to add…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="card" style={{ position: 'absolute', zIndex: 5, width: '100%', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
            {results.map((p) => (
              <div key={p._id} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => addProduct(p)}>
                <span>{p.name}</span><span className="ss-hint">{naira(p.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((i) => (
            <div key={i.productId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{i.name}</span>
              <input className="form-input" type="number" min={1} value={i.quantity} onChange={(e) => updateQty(i.productId, e.target.value)} style={{ width: 70 }} />
              <span className="ss-hint" style={{ width: 90 }}>{naira(i.unitPrice)}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(i.productId)}><RiCloseLine /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionsTab() {
  const [plans, setPlans] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(() => {
    subscriptionPlanService.getPlans().then(({ data }) => setPlans(data.data)).catch(() => toast.error('Could not load subscription plans'));
  }, []);
  const loadSubscribers = useCallback(() => {
    subscriptionPlanService.getSubscribers({ status: statusFilter || undefined, limit: 100 })
      .then(({ data }) => { setSubscribers(data.data); setStats(data.stats); })
      .catch(() => toast.error('Could not load subscribers'));
  }, [statusFilter]);
  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      name: p.name, description: p.description || '', interval: p.interval, price: p.price,
      originalPrice: p.originalPrice || '', deliveryFee: p.deliveryFee || '', trialDays: p.trialDays || '',
      maxSubscribers: p.maxSubscribers || '', perks: (p.perks || []).join(', '),
      items: p.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
    setShowForm(true);
  }
  function startNew() { setEditingId(null); setForm(EMPTY_PLAN); setShowForm(true); }

  async function submitPlan(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.price || form.items.length === 0) {
      return toast.error('Name, price and at least one product are required.');
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim(), interval: form.interval,
        price: Number(form.price), originalPrice: form.originalPrice || undefined, deliveryFee: Number(form.deliveryFee) || 0,
        trialDays: Number(form.trialDays) || 0, maxSubscribers: form.maxSubscribers || null,
        perks: form.perks.split(',').map((s) => s.trim()).filter(Boolean),
        items: form.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      };
      if (editingId) await subscriptionPlanService.updatePlan(editingId, payload);
      else await subscriptionPlanService.createPlan(payload);
      toast.success(editingId ? 'Plan updated' : 'Plan created');
      setShowForm(false);
      loadPlans();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p) {
    try { await subscriptionPlanService.updatePlan(p._id, { isActive: !p.isActive }); loadPlans(); }
    catch { toast.error('Failed to update'); }
  }
  async function deletePlan(p) {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    try { await subscriptionPlanService.deletePlan(p._id); toast.success('Plan deleted'); loadPlans(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  }

  async function pauseSub(s) {
    try { await subscriptionPlanService.pauseSubscriber(s._id); loadSubscribers(); toast.success('Subscriber paused'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  }
  async function cancelSub(s) {
    const reason = window.prompt('Reason for cancelling this subscriber?');
    if (!reason?.trim()) return;
    try { await subscriptionPlanService.cancelSubscriber(s._id, reason); loadSubscribers(); toast.success('Subscriber cancelled'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  }

  return (
    <>
      <div className="ss-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="ss-stat"><div className="s-label">Total Subscribers</div><div className="s-value">{stats.total ?? '—'}</div></div>
        <div className="ss-stat"><div className="s-label">Active Subscriptions</div><div className="s-value">{stats.active ?? '—'}</div></div>
        <div className="ss-stat"><div className="s-label">Revenue This Month</div><div className="s-value">{naira(stats.revenueThisMonth)}</div></div>
        <div className="ss-stat"><div className="s-label">Churn Rate This Month</div><div className="s-value">{stats.churnRate ?? 0}%</div></div>
      </div>

      <div className="card card-pad">
        <div className="page-header-row" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}><RiBox3Line style={{ verticalAlign: '-3px' }} /> Subscription Plans</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Recurring boxes customers can subscribe to — weekly food boxes, monthly beauty boxes, and more.</p>
          </div>
          <button className="btn btn-secondary" onClick={startNew}><RiAddLine /> New Plan</button>
        </div>

        {showForm && (
          <form onSubmit={submitPlan} className="ss-coupon-form">
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Plan name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Weekly Food Box" /></div>
              <div className="form-group"><label className="form-label">Delivery interval</label>
                <select className="form-input form-select" value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}>
                  {Object.entries(SUB_INTERVAL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Price per delivery (₦)</label>
                <input className="form-input" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Original price (₦, optional — shown struck-through)</label>
                <input className="form-input" type="number" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Delivery fee (₦)</label>
                <input className="form-input" type="number" value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Trial days (0 = none)</label>
                <input className="form-input" type="number" min={0} value={form.trialDays} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Max subscribers</label>
                <input className="form-input" type="number" min={1} placeholder="Unlimited" value={form.maxSubscribers} onChange={(e) => setForm((f) => ({ ...f, maxSubscribers: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Perks (comma-separated)</label>
                <input className="form-input" placeholder="Free delivery, 10% discount, Priority support" value={form.perks} onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>

            <ProductPicker items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Plan' : 'Create Plan'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <table className="ss-table" style={{ marginTop: 16 }}>
          <thead><tr><th>Plan</th><th>Interval</th><th>Price</th><th>Subscribers</th><th>Status</th><th /></tr></thead>
          <tbody>
            {plans === null && <tr><td colSpan={6}>Loading…</td></tr>}
            {plans?.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No subscription plans yet.</td></tr>}
            {plans?.map((p) => (
              <tr key={p._id}>
                <td><strong>{p.name}</strong></td>
                <td>{SUB_INTERVAL_LABEL[p.interval] || p.interval}</td>
                <td>{naira(p.price)}</td>
                <td>{p.subscriberCount}{p.maxSubscribers ? ` / ${p.maxSubscribers}` : ''}</td>
                <td>
                  <button className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => toggleActive(p)}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(p)}><RiPencilLine /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deletePlan(p)}><RiDeleteBinLine /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Subscribers</h3>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Customer</th><th>Plan</th><th>Start Date</th><th>Next Delivery</th><th>Deliveries</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontSize: 13 }}>{s.customerName}<br /><span className="ss-hint">{s.customerEmail}</span></td>
                  <td>{s.planId?.name || s.name}</td>
                  <td className="ss-hint">{new Date(s.startDate).toLocaleDateString()}</td>
                  <td className="ss-hint">{s.status === 'active' ? new Date(s.nextDeliveryDate).toLocaleDateString() : '—'}</td>
                  <td>{s.totalDeliveries}</td>
                  <td><span className={`badge badge-${{ active: 'success', paused: 'warning', cancelled: 'danger', expired: 'neutral' }[s.status] || 'neutral'}`}>{s.status}</span></td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {s.status === 'active' && <button className="btn btn-ghost btn-sm" onClick={() => pauseSub(s)}>Pause</button>}
                    {s.status !== 'cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => cancelSub(s)}>Cancel</button>}
                  </td>
                </tr>
              ))}
              {!subscribers.length && <tr><td colSpan={7} className="ss-hint">No subscribers yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
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
