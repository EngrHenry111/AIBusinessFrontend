import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService, storeCustomerService } from '../../services';
import {
  RiArrowLeftLine, RiUserLine, RiLogoutBoxLine, RiCoinLine, RiHeartLine,
  RiMapPin2Line, RiAddLine, RiDeleteBinLine, RiStore2Line,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { getStoreToken, clearStoreToken } from './storeAuth';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja',
];

export default function CustomerAccount() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = getStoreToken(slug);

  const [store, setStore] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
  }, [slug]);

  const load = useCallback(() => {
    if (!token) { navigate(`/store/${slug}/login?redirect=/store/${slug}/account`, { replace: true }); return; }
    setLoading(true);
    storeCustomerService.getMe(slug, token)
      .then(({ data }) => setCustomer(data.data))
      .catch(() => { clearStoreToken(slug); navigate(`/store/${slug}/login?redirect=/store/${slug}/account`, { replace: true }); })
      .finally(() => setLoading(false));
  }, [slug, token, navigate]);

  useEffect(() => { load(); }, [load]);

  function logout() {
    clearStoreToken(slug);
    navigate(`/store/${slug}`);
  }

  const brand = store?.settings?.primaryColor || '#6366f1';

  if (loading || !customer) {
    return <div className="sf" style={{ '--sf-brand': brand }}><div className="sf-loading">Loading your account…</div></div>;
  }

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
          <button className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px' }} onClick={logout}><RiLogoutBoxLine /> Log Out</button>
        </div>
      </header>

      <div className="sf-page">
        <h1><RiUserLine style={{ verticalAlign: '-3px' }} /> My Account</h1>
        <p style={{ marginTop: -14, color: 'var(--sf-muted)' }}>{customer.name} · {customer.email}</p>

        <div className="acc-stats">
          <div className="acc-stat"><span className="acc-stat-num">{customer.orderCount}</span><span>Orders</span></div>
          <div className="acc-stat"><span className="acc-stat-num">{naira(customer.totalSpent)}</span><span>Total Spent</span></div>
          <div className="acc-stat"><span className="acc-stat-num"><RiCoinLine /> {customer.loyalty?.points || 0}</span><span>{customer.loyalty?.tier || 'Bronze'} Points</span></div>
        </div>

        <div className="pp-tabs" style={{ marginBottom: 20 }}>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>My Orders</button>
          <button className={tab === 'wishlist' ? 'active' : ''} onClick={() => setTab('wishlist')}>My Wishlist</button>
          <button className={tab === 'addresses' ? 'active' : ''} onClick={() => setTab('addresses')}>Saved Addresses</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Account Settings</button>
        </div>

        {tab === 'orders' && <OrdersTab slug={slug} token={token} />}
        {tab === 'wishlist' && <WishlistTab slug={slug} token={token} />}
        {tab === 'addresses' && <AddressesTab slug={slug} token={token} customer={customer} onSaved={setCustomer} />}
        {tab === 'settings' && <SettingsTab slug={slug} token={token} customer={customer} onSaved={setCustomer} />}
      </div>
    </div>
  );
}

function OrdersTab({ slug, token }) {
  const [orders, setOrders] = useState(null);
  useEffect(() => { storeCustomerService.getOrders(slug, token).then(({ data }) => setOrders(data.data)).catch(() => setOrders([])); }, [slug, token]);

  if (orders === null) return <p style={{ color: 'var(--sf-muted)' }}>Loading orders…</p>;
  if (orders.length === 0) return <div className="sf-empty"><h3>No orders yet</h3><p>Your order history will show up here.</p></div>;

  return (
    <div className="acc-orders">
      {orders.map((o) => (
        <Link key={o._id} to={`/store/${slug}/track/${o.orderNumber}`} className="sf-panel acc-order-row">
          <div>
            <strong>{o.orderNumber}</strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--sf-muted)' }}>{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{naira(o.total)}</strong>
            <p style={{ margin: '2px 0 0' }}><span className={`badge badge-${o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'neutral' : 'info'}`}>{o.status}</span></p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function WishlistTab({ slug, token }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => { storeCustomerService.getWishlist(slug, token).then(({ data }) => setItems(data.data)).catch(() => setItems([])); }, [slug, token]);
  useEffect(() => { load(); }, [load]);

  async function remove(productId) {
    await storeCustomerService.removeFromWishlist(slug, token, productId);
    load();
  }

  if (items === null) return <p style={{ color: 'var(--sf-muted)' }}>Loading wishlist…</p>;
  if (items.length === 0) return <div className="sf-empty"><h3>Your wishlist is empty</h3><p>Tap the heart on any product to save it here.</p></div>;

  return (
    <div className="sf-grid">
      {items.map((p) => (
        <div key={p._id} className="sf-card">
          <Link to={`/store/${slug}/product/${p._id}`} className="sf-card-img">
            {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span className="ph"><RiStore2Line /></span>}
          </Link>
          <div className="sf-card-body">
            <Link to={`/store/${slug}/product/${p._id}`} className="sf-card-name">{p.name}</Link>
            <div className="sf-card-price">{naira(p.effectivePrice)}</div>
            <button className="sf-add" style={{ background: '#ef4444' }} onClick={() => remove(p._id)}><RiDeleteBinLine /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressesTab({ slug, token, customer, onSaved }) {
  const [addresses, setAddresses] = useState(customer.addresses?.length ? customer.addresses : []);
  const [saving, setSaving] = useState(false);

  const update = (i, field, val) => setAddresses((a) => a.map((addr, idx) => (idx === i ? { ...addr, [field]: val } : addr)));
  const add = () => setAddresses((a) => [...a, { label: 'Home', address: '', city: '', state: '', isDefault: a.length === 0 }]);
  const remove = (i) => setAddresses((a) => a.filter((_, idx) => idx !== i));

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeCustomerService.updateAddresses(slug, token, addresses);
      setAddresses(data.data);
      onSaved((c) => ({ ...c, addresses: data.data }));
      toast.success('Addresses saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sf-panel">
      <h2><RiMapPin2Line style={{ verticalAlign: '-3px' }} /> Saved Addresses</h2>
      {addresses.map((a, i) => (
        <div key={i} className="acc-address-row">
          <div className="co-field-grid">
            <div className="sf-field"><label>Label</label><input value={a.label} onChange={(e) => update(i, 'label', e.target.value)} placeholder="Home, Office…" /></div>
            <div className="sf-field"><label>City</label><input value={a.city} onChange={(e) => update(i, 'city', e.target.value)} /></div>
          </div>
          <div className="sf-field"><label>Address</label><input value={a.address} onChange={(e) => update(i, 'address', e.target.value)} /></div>
          <div className="co-field-grid">
            <div className="sf-field">
              <label>State</label>
              <select value={a.state} onChange={(e) => update(i, 'state', e.target.value)}>
                <option value="">Select state</option>
                {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={a.isDefault} onChange={(e) => update(i, 'isDefault', e.target.checked)} /> Default address
            </label>
          </div>
          <button className="sf-line-rm" onClick={() => remove(i)}>Remove this address</button>
        </div>
      ))}
      <button className="sf-btn-ghost" style={{ width: 'auto', padding: '10px 18px', marginBottom: 14 }} onClick={add}><RiAddLine /> Add Address</button>
      <button className="sf-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Addresses'}</button>
    </div>
  );
}

function SettingsTab({ slug, token, customer, onSaved }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { data } = await storeCustomerService.updateProfile(slug, token, { name, phone });
      onSaved((c) => ({ ...c, ...data.data }));
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sf-panel">
      <h2>Account Settings</h2>
      <div className="sf-field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="sf-field"><label>Email</label><input value={customer.email} disabled style={{ opacity: 0.6 }} /></div>
      <div className="sf-field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <button className="sf-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Changes'}</button>
    </div>
  );
}
