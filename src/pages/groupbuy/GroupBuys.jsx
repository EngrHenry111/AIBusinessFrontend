import { useState, useEffect, useCallback } from 'react';
import { groupBuyService, productService } from '../../services';
import {
  RiGroupLine, RiAddLine, RiCloseLine, RiFileCopyLine, RiDeleteBinLine,
  RiExternalLinkLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './GroupBuys.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const STATUS_BADGE = { active: 'success', successful: 'success', failed: 'danger', cancelled: 'neutral', expired: 'neutral' };
const EMPTY_FORM = { productId: '', title: '', description: '', groupPrice: '', minimumParticipants: 5, maximumParticipants: '', endDate: '' };

export default function GroupBuys() {
  const [groupBuys, setGroupBuys] = useState(null);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    groupBuyService.getAll({ status: statusFilter || undefined })
      .then(({ data }) => { setGroupBuys(data.data); setStats(data.stats); })
      .catch(() => toast.error('Could not load group buys'));
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function cancel(gb) {
    if (!window.confirm(`Cancel "${gb.title}"? Any paid participants will be refunded automatically.`)) return;
    try { await groupBuyService.cancel(gb._id); toast.success('Group buy cancelled and refunded'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to cancel'); }
  }

  function copyLink(gb) {
    navigator.clipboard.writeText(gb.shareLink);
    toast.success('Link copied!');
  }

  return (
    <div className="groupbuys-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiGroupLine style={{ verticalAlign: '-3px' }} /> Group Buying</h1>
          <p>"Get 5 friends to order together and everyone saves" — digital Ajo for shopping.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><RiAddLine /> Create Group Buy</button>
      </div>

      <div className="gbp-stat-grid">
        <div className="gbp-stat"><span className="gbp-num">{stats.active ?? 0}</span><span className="gbp-label">Active</span></div>
        <div className="gbp-stat"><span className="gbp-num">{stats.successful ?? 0}</span><span className="gbp-label">Successful</span></div>
        <div className="gbp-stat"><span className="gbp-num">{stats.failed ?? 0}</span><span className="gbp-label">Failed</span></div>
        <div className="gbp-stat"><span className="gbp-num">{stats.cancelled ?? 0}</span><span className="gbp-label">Cancelled</span></div>
      </div>

      <div className="card">
        <div className="gbp-filter-row">
          <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Product</th><th>Group Price</th><th>Participants</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead>
            <tbody>
              {groupBuys === null && <tr><td colSpan={6}>Loading…</td></tr>}
              {groupBuys?.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <div className="empty-state-icon"><RiGroupLine /></div>
                    <h3>No group buys yet</h3>
                    <p>Create one to let customers team up for a discount.</p>
                  </div>
                </td></tr>
              )}
              {groupBuys?.map((gb) => (
                <tr key={gb._id}>
                  <td><strong>{gb.productName}</strong><br /><span className="gbp-hint">{gb.title}</span></td>
                  <td>{naira(gb.groupPrice)} <span className="gbp-hint">(was {naira(gb.originalPrice)})</span></td>
                  <td>{gb.currentParticipants} / {gb.minimumParticipants}{gb.maximumParticipants ? ` (max ${gb.maximumParticipants})` : ''}</td>
                  <td><span className={`badge badge-${STATUS_BADGE[gb.status] || 'neutral'}`}>{gb.status}</span></td>
                  <td className="gbp-hint">{new Date(gb.endDate).toLocaleString()}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <a className="btn btn-ghost btn-icon btn-sm" href={gb.shareLink} target="_blank" rel="noopener noreferrer" title="View live page"><RiExternalLinkLine /></a>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyLink(gb)} title="Copy share link"><RiFileCopyLine /></button>
                    {gb.status === 'active' && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => cancel(gb)} title="Cancel & refund"><RiDeleteBinLine /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <CreateGroupBuyModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function CreateGroupBuyModal({ onClose, onCreated }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productService.getAll({ status: 'active', limit: 100 }).then(({ data }) => setProducts(data.data)).catch(() => {});
  }, []);

  const product = products.find((p) => p._id === form.productId);
  const preview = product && form.groupPrice && form.minimumParticipants
    ? `If ${form.minimumParticipants} people join, each pays ${naira(form.groupPrice)} instead of ${naira(product.price)}.`
    : null;

  async function submit(e) {
    e.preventDefault();
    if (!form.productId || !form.groupPrice || !form.minimumParticipants || !form.endDate) {
      return toast.error('Product, group price, minimum participants and deadline are required.');
    }
    setSaving(true);
    try {
      await groupBuyService.create({
        productId: form.productId, title: form.title || undefined, description: form.description || undefined,
        groupPrice: Number(form.groupPrice), minimumParticipants: Number(form.minimumParticipants),
        maximumParticipants: form.maximumParticipants || undefined, endDate: new Date(form.endDate).toISOString(),
      });
      toast.success('Group buy created!');
      onCreated();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Failed to create group buy');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><RiGroupLine style={{ verticalAlign: '-3px' }} /> Create Group Buy</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-input form-select" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
                <option value="">Select a product…</option>
                {products.map((p) => <option key={p._id} value={p._id}>{p.name} — {naira(p.price)}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Title (optional)</label>
              <input className="form-input" placeholder={product ? `Group Buy: ${product.name}` : ''} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Group price (₦)</label>
                <input className="form-input" type="number" value={form.groupPrice} onChange={(e) => setForm((f) => ({ ...f, groupPrice: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Minimum participants</label>
                <input className="form-input" type="number" min={2} value={form.minimumParticipants} onChange={(e) => setForm((f) => ({ ...f, minimumParticipants: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Maximum participants</label>
                <input className="form-input" type="number" placeholder="Unlimited" value={form.maximumParticipants} onChange={(e) => setForm((f) => ({ ...f, maximumParticipants: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Deadline</label>
                <input className="form-input" type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description (optional)</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>

            {preview && <p className="gbp-preview">{preview}</p>}

            <button className="btn btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
              {saving ? 'Creating…' : 'Create Group Buy'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
