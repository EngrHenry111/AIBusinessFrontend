import { useState, useEffect, useCallback } from 'react';
import { procurementService } from '../../services';
import toast from 'react-hot-toast';
import { RiAddLine, RiSearchLine, RiStarFill, RiStarLine, RiCloseLine, RiShieldCheckLine, RiForbidLine } from 'react-icons/ri';

const EMPTY = { name: '', email: '', phone: '', address: '', rcNumber: '', tinNumber: '', category: '', bankName: '', accountNumber: '', accountName: '', notes: '' };

export default function VendorRegister() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    procurementService.getVendors({ search: search || undefined })
      .then(({ data }) => setVendors(data.data))
      .catch(() => toast.error('Failed to load vendors'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Vendor name is required.');
    setSaving(true);
    try {
      await procurementService.createVendor({ ...form, category: form.category ? form.category.split(',').map((c) => c.trim()) : [] });
      toast.success('Vendor added');
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Failed to add vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="contract-search" style={{ maxWidth: 320 }}>
          <RiSearchLine /><input placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}><RiAddLine /> Add Vendor</button>
      </div>

      {showForm && (
        <form className="card card-pad proc-form-panel" onSubmit={submit}>
          <h3>New Vendor</h3>
          <div className="proc-form-grid">
            <label className="pf-field"><span>Vendor Name *</span><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
            <label className="pf-field"><span>Email</span><input className="form-input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
            <label className="pf-field"><span>Phone</span><input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label className="pf-field"><span>RC Number</span><input className="form-input" value={form.rcNumber} onChange={(e) => setForm((f) => ({ ...f, rcNumber: e.target.value }))} /></label>
            <label className="pf-field"><span>TIN</span><input className="form-input" value={form.tinNumber} onChange={(e) => setForm((f) => ({ ...f, tinNumber: e.target.value }))} /></label>
            <label className="pf-field"><span>Categories (comma-separated)</span><input className="form-input" placeholder="Office Supplies, IT Equipment" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></label>
            <label className="pf-field" style={{ gridColumn: '1 / -1' }}><span>Address</span><input className="form-input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></label>
            <label className="pf-field"><span>Bank Name</span><input className="form-input" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} /></label>
            <label className="pf-field"><span>Account Number</span><input className="form-input" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} /></label>
            <label className="pf-field"><span>Account Name</span><input className="form-input" value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} /></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Vendor'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Categories</th><th>Rating</th><th>Orders</th><th>Total Value</th><th>Status</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="muted">Loading…</td></tr>}
              {!loading && vendors.map((v) => (
                <tr key={v._id} className="contract-row" onClick={() => setDetail(v)}>
                  <td><strong>{v.name}</strong></td>
                  <td className="cell-sub">{v.email}<br /><span>{v.phone}</span></td>
                  <td className="muted">{(v.category || []).join(', ') || '—'}</td>
                  <td>{[1, 2, 3, 4, 5].map((n) => (n <= (v.rating || 0) ? <RiStarFill key={n} style={{ color: '#f59e0b' }} /> : <RiStarLine key={n} style={{ color: 'var(--border)' }} />))}</td>
                  <td>{v.totalOrders}</td>
                  <td>₦{Number(v.totalValue || 0).toLocaleString()}</td>
                  <td>
                    {v.blacklisted ? <span className="badge badge-danger"><RiForbidLine /> Blacklisted</span>
                      : v.isPrequalified ? <span className="badge badge-success"><RiShieldCheckLine /> Prequalified</span>
                      : <span className="badge badge-neutral">Standard</span>}
                  </td>
                </tr>
              ))}
              {!loading && !vendors.length && <tr><td colSpan={7} className="muted">No vendors registered yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detail.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}><RiCloseLine /></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{detail.email || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{detail.phone || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">RC Number</span><span className="detail-value">{detail.rcNumber || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">TIN</span><span className="detail-value">{detail.tinNumber || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Bank</span><span className="detail-value">{detail.bankName || '—'} {detail.accountNumber}</span></div>
                <div className="detail-item"><span className="detail-label">Total Orders</span><span className="detail-value">{detail.totalOrders}</span></div>
                <div className="detail-item"><span className="detail-label">Total Value</span><span className="detail-value">₦{Number(detail.totalValue || 0).toLocaleString()}</span></div>
              </div>
              {detail.notes && <p className="muted" style={{ marginTop: 12 }}>{detail.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
