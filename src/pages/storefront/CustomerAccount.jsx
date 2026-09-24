import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { storefrontService, storeCustomerService, subscriptionPlanService } from '../../services';
import {
  RiArrowLeftLine, RiUserLine, RiLogoutBoxLine, RiCoinLine, RiHeartLine,
  RiMapPin2Line, RiAddLine, RiDeleteBinLine, RiStore2Line, RiRefreshLine,
  RiLockPasswordLine, RiAlertLine, RiShoppingCart2Line, RiBox3Line,
  RiPauseCircleLine, RiPlayCircleLine, RiCloseCircleLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { getStoreToken, clearStoreToken } from './storeAuth';
import { addToCart } from './cart';
import './Store.css';

const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#94a3b8', Gold: '#f59e0b', Platinum: '#6366f1' };

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
  const [searchParams] = useSearchParams();
  const token = getStoreToken(slug);

  const [store, setStore] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') || 'orders');

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
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => setTab('subscriptions')}>My Subscriptions</button>
          <button className={tab === 'wishlist' ? 'active' : ''} onClick={() => setTab('wishlist')}>My Wishlist</button>
          <button className={tab === 'points' ? 'active' : ''} onClick={() => setTab('points')}>My Points</button>
          <button className={tab === 'addresses' ? 'active' : ''} onClick={() => setTab('addresses')}>Saved Addresses</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Account Settings</button>
        </div>

        {tab === 'orders' && <OrdersTab slug={slug} token={token} navigate={navigate} />}
        {tab === 'subscriptions' && <SubscriptionsTab slug={slug} token={token} />}
        {tab === 'wishlist' && <WishlistTab slug={slug} token={token} />}
        {tab === 'points' && <PointsTab slug={slug} token={token} />}
        {tab === 'addresses' && <AddressesTab slug={slug} token={token} customer={customer} onSaved={setCustomer} />}
        {tab === 'settings' && <SettingsTab slug={slug} token={token} customer={customer} onSaved={setCustomer} navigate={navigate} />}
      </div>
    </div>
  );
}

function OrdersTab({ slug, token, navigate }) {
  const [orders, setOrders] = useState(null);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { storeCustomerService.getOrders(slug, token).then(({ data }) => setOrders(data.data)).catch(() => setOrders([])); }, [slug, token]);

  if (orders === null) return <p style={{ color: 'var(--sf-muted)' }}>Loading orders…</p>;
  if (orders.length === 0) return <div className="sf-empty"><h3>No orders yet</h3><p>Your order history will show up here.</p></div>;

  function reorder(o, e) {
    e.preventDefault();
    // Order.items only stores a flat "Size: Large" label, not the raw
    // variantGroup/variantValue pair checkout needs to re-resolve price and
    // stock — so a variant item can't be safely re-added at the right price.
    // Only items without a variant are auto-added; the rest need reselecting.
    let added = 0;
    let skipped = 0;
    o.items.forEach((i) => {
      if (i.variant) { skipped += 1; return; }
      if (!i.productId) { skipped += 1; return; }
      addToCart(slug, { _id: i.productId, name: i.name, images: i.image ? [i.image] : [], effectivePrice: i.price, price: i.price }, i.quantity, null);
      added += 1;
    });
    if (added) toast.success(`${added} item${added === 1 ? '' : 's'} added to cart`);
    if (skipped) toast(`${skipped} item${skipped === 1 ? '' : 's'} need their options reselected on the product page`, { icon: '⚠️' });
    if (added) navigate(`/store/${slug}/checkout`);
  }

  return (
    <div className="acc-orders">
      {orders.map((o) => (
        <div key={o._id} className="sf-panel acc-order-row" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }} onClick={() => setExpanded(expanded === o._id ? null : o._id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <strong>{o.orderNumber}</strong>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--sf-muted)' }}>{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>{naira(o.total)}</strong>
              <p style={{ margin: '2px 0 0' }}><span className={`badge badge-${o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'neutral' : 'info'}`}>{o.status}</span></p>
            </div>
          </div>
          {expanded === o._id && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--sf-border)', paddingTop: 12 }}>
              {o.items.map((i, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                  <span>{i.name}{i.variant ? ` (${i.variant})` : ''} × {i.quantity}</span>
                  <span>{naira(i.price * i.quantity)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <Link to={`/store/${slug}/track/${o.orderNumber}`} className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}>Track Order</Link>
                <button className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }} onClick={(e) => reorder(o, e)}><RiRefreshLine /> Reorder</button>
              </div>
            </div>
          )}
        </div>
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

  function addProductToCart(p) {
    if (p.variants?.length) { toast('This item has options — pick one on its product page.', { icon: '🛍️' }); return; }
    addToCart(slug, p, 1, null);
    toast.success('Added to cart');
  }

  return (
    <div className="sf-grid">
      {items.map((p) => (
        <div key={p._id} className="sf-card">
          <Link to={`/store/${slug}/product/${p._id}`} className="sf-card-img">
            {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span className="ph"><RiStore2Line /></span>}
            {p.isFlashSale && <span className="sf-badge-sale">SALE</span>}
          </Link>
          <div className="sf-card-body">
            <Link to={`/store/${slug}/product/${p._id}`} className="sf-card-name">{p.name}</Link>
            <div className="sf-card-price">
              {naira(p.effectivePrice)}
              {p.isFlashSale && p.effectivePrice < p.price && <span className="sf-price-was">{naira(p.price)}</span>}
            </div>
            <button className="sf-add" onClick={() => addProductToCart(p)}><RiShoppingCart2Line /> Add to Cart</button>
            <button className="sf-line-rm" style={{ marginTop: 6 }} onClick={() => remove(p._id)}><RiDeleteBinLine /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const SUB_STATUS_COLOR = { active: '#16a34a', paused: '#f59e0b', cancelled: '#94a3b8', expired: '#94a3b8' };
const SUB_INTERVAL_LABEL = { daily: 'day', weekly: 'week', biweekly: '2 weeks', monthly: 'month', quarterly: 'quarter' };

function SubscriptionsTab({ slug, token }) {
  const [subs, setSubs] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    subscriptionPlanService.getMySubscriptions(slug, token).then(({ data }) => setSubs(data.data)).catch(() => setSubs([]));
  }, [slug, token]);
  useEffect(() => { load(); }, [load]);

  async function pause(id) {
    setBusyId(id);
    try { await subscriptionPlanService.pause(slug, token, id); toast.success('Subscription paused'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Could not pause'); }
    finally { setBusyId(null); }
  }
  async function resume(id) {
    setBusyId(id);
    try { await subscriptionPlanService.resume(slug, token, id); toast.success('Subscription resumed'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Could not resume'); }
    finally { setBusyId(null); }
  }
  async function cancel(id) {
    const reason = prompt('Why are you cancelling? (required)');
    if (!reason?.trim()) return;
    setBusyId(id);
    try { await subscriptionPlanService.cancel(slug, token, id, reason); toast.success('Subscription cancelled'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Could not cancel'); }
    finally { setBusyId(null); }
  }

  if (!subs) return <p style={{ color: 'var(--sf-muted)' }}>Loading subscriptions…</p>;

  if (subs.length === 0) {
    return (
      <div className="sf-panel" style={{ textAlign: 'center' }}>
        <RiBox3Line style={{ fontSize: 32, color: 'var(--sf-muted)', marginBottom: 8 }} />
        <h3 style={{ margin: '0 0 6px' }}>No subscriptions yet</h3>
        <p style={{ color: 'var(--sf-muted)', marginBottom: 14 }}>Subscribe to a recurring box to see it here.</p>
        <Link to={`/store/${slug}/subscriptions`} className="sf-btn" style={{ display: 'inline-flex', width: 'auto', padding: '10px 20px' }}>Browse Plans</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {subs.map((s) => (
        <div key={s._id} className="sf-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>{s.name}</h2>
              <p style={{ color: 'var(--sf-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                {naira(s.total)} every {SUB_INTERVAL_LABEL[s.interval] || s.interval}
              </p>
            </div>
            <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, color: '#fff', background: SUB_STATUS_COLOR[s.status] || '#94a3b8', textTransform: 'capitalize' }}>
              {s.status}
            </span>
          </div>

          {s.status === 'active' && (
            <p style={{ fontSize: '0.85rem', marginTop: 10 }}>Next delivery: <strong>{fmtDate(s.nextDeliveryDate)}</strong></p>
          )}
          {s.status === 'paused' && <p style={{ fontSize: '0.85rem', marginTop: 10, color: 'var(--sf-muted)' }}>Paused — resume anytime to pick up your schedule.</p>}
          {s.status === 'cancelled' && <p style={{ fontSize: '0.85rem', marginTop: 10, color: 'var(--sf-muted)' }}>Cancelled{s.cancelledAt ? ` on ${fmtDate(s.cancelledAt)}` : ''}.</p>}

          <button
            style={{ background: 'none', border: 'none', color: 'var(--sf-brand)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 10 }}
            onClick={() => setExpanded(expanded === s._id ? null : s._id)}
          >
            {expanded === s._id ? 'Hide details' : `View items & history (${s.totalDeliveries} deliver${s.totalDeliveries === 1 ? 'y' : 'ies'})`}
          </button>

          {expanded === s._id && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--sf-border)', paddingTop: 10 }}>
              <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, fontSize: '0.85rem' }}>
                {s.items.map((it, i) => <li key={i}>{it.quantity}× {it.name}</li>)}
              </ul>
              {s.deliveryHistory.length === 0 ? (
                <p style={{ color: 'var(--sf-muted)', fontSize: '0.82rem' }}>No deliveries yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {s.deliveryHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--sf-border)' }}>
                        <td style={{ padding: '6px 0', fontSize: '0.82rem' }}>{fmtDate(h.deliveryDate)}</td>
                        <td style={{ padding: '6px 0', fontSize: '0.82rem', textAlign: 'right', color: h.status === 'failed' ? '#ef4444' : '#16a34a' }}>{h.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(s.status === 'active' || s.status === 'paused') && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {s.status === 'active' && (
                <button className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px' }} disabled={busyId === s._id} onClick={() => pause(s._id)}>
                  <RiPauseCircleLine /> Pause
                </button>
              )}
              {s.status === 'paused' && (
                <button className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px' }} disabled={busyId === s._id} onClick={() => resume(s._id)}>
                  <RiPlayCircleLine /> Resume
                </button>
              )}
              <button className="sf-btn-ghost" style={{ width: 'auto', padding: '8px 16px', color: '#ef4444' }} disabled={busyId === s._id} onClick={() => cancel(s._id)}>
                <RiCloseCircleLine /> Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PointsTab({ slug, token }) {
  const [data, setData] = useState(null);
  useEffect(() => { storeCustomerService.getPoints(slug, token).then(({ data: d }) => setData(d.data)).catch(() => setData({ points: 0, tier: 'Bronze', transactions: [] })); }, [slug, token]);

  if (!data) return <p style={{ color: 'var(--sf-muted)' }}>Loading points…</p>;

  return (
    <div>
      <div className="sf-panel" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--sf-brand)' }}>{data.points.toLocaleString()}</div>
        <p style={{ color: 'var(--sf-muted)', margin: '2px 0 10px' }}>points available</p>
        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: TIER_COLORS[data.tier] || '#cd7f32' }}>
          {data.tier} Tier
        </span>
        <p style={{ color: 'var(--sf-muted)', fontSize: '0.8rem', marginTop: 14 }}>Redeem your points for a discount at checkout.</p>
      </div>

      <div className="sf-panel">
        <h2>Points History</h2>
        {data.transactions.length === 0 ? (
          <p style={{ color: 'var(--sf-muted)' }}>No points activity yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.transactions.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--sf-border)' }}>
                  <td style={{ padding: '8px 0', fontSize: '0.85rem' }}>{t.description || t.type}</td>
                  <td style={{ padding: '8px 0', fontSize: '0.78rem', color: 'var(--sf-muted)' }}>{fmtDate(t.createdAt)}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: t.points >= 0 ? '#16a34a' : '#ef4444' }}>{t.points >= 0 ? '+' : ''}{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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

function SettingsTab({ slug, token, customer, onSaved, navigate }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || '');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function changePassword() {
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    setChangingPw(true);
    try {
      await storeCustomerService.changePassword(slug, token, { currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword(''); setNewPassword('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await storeCustomerService.deleteAccount(slug, token);
      clearStoreToken(slug);
      toast.success('Account deleted');
      navigate(`/store/${slug}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="sf-panel">
        <h2>Account Settings</h2>
        <div className="sf-field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="sf-field"><label>Email</label><input value={customer.email} disabled style={{ opacity: 0.6 }} /></div>
        <div className="sf-field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <button className="sf-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>

      <div className="sf-panel" style={{ marginTop: 20 }}>
        <h2><RiLockPasswordLine style={{ verticalAlign: '-3px' }} /> Change Password</h2>
        <div className="sf-field"><label>Current password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
        <div className="sf-field"><label>New password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
        <button className="sf-btn" disabled={changingPw} onClick={changePassword}>{changingPw ? 'Updating…' : 'Change Password'}</button>
      </div>

      <div className="sf-panel" style={{ marginTop: 20, borderColor: '#fecaca' }}>
        <h2 style={{ color: '#ef4444' }}><RiAlertLine style={{ verticalAlign: '-3px' }} /> Delete Account</h2>
        <p style={{ color: 'var(--sf-muted)', fontSize: '0.85rem' }}>This permanently deletes your account on this store, including your saved addresses and wishlist. Your past orders remain on record with the store.</p>
        {!confirmDelete ? (
          <button className="sf-btn-ghost" style={{ width: 'auto', padding: '10px 18px', color: '#ef4444', borderColor: '#fecaca' }} onClick={() => setConfirmDelete(true)}>Delete My Account</button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="sf-add" style={{ background: '#ef4444', width: 'auto', padding: '10px 18px' }} disabled={deleting} onClick={deleteAccount}>{deleting ? 'Deleting…' : 'Yes, delete permanently'}</button>
            <button className="sf-btn-ghost" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    </>
  );
}
