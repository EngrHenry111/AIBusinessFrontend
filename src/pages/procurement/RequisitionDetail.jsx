import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { procurementService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiCheckLine, RiCloseLine, RiTimeLine, RiDownloadLine,
  RiAddLine, RiAlertLine, RiTruckLine,
} from 'react-icons/ri';
import { TYPE_LABELS, STATUS_COLORS, PRIORITY_COLORS } from './Procurement';
import './Procurement.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const EMPTY_VENDOR = { name: '', email: '', phone: '', quotedPrice: '' };

export default function RequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR);
  const [showDeliverForm, setShowDeliverForm] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [actualTotal, setActualTotal] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    procurementService.getOne(id).then(({ data }) => setR(data.data)).catch(() => toast.error('Failed to load requisition')).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="procurement-page"><div className="skeleton" style={{ height: 400, borderRadius: 14 }} /></div>;
  if (!r) return null;

  const currentStep = r.approvalChain.find((s) => s.order === r.currentApprovalLevel);
  const isMyTurn = r.status === 'pending_approval' && currentStep && String(currentStep.approverId) === String(user?._id);

  async function act(type) {
    if (type === 'reject' && !comment.trim()) return toast.error('A rejection reason is required.');
    setActing(true);
    try {
      if (type === 'approve') await procurementService.approve(id, comment);
      else await procurementService.reject(id, comment);
      toast.success(type === 'approve' ? 'Approved' : 'Rejected');
      setComment('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  }

  async function addVendor(e) {
    e.preventDefault();
    if (!vendorForm.name.trim() || !vendorForm.quotedPrice) return toast.error('Vendor name and quoted price are required.');
    try {
      await procurementService.addVendor(id, { ...vendorForm, quotedPrice: Number(vendorForm.quotedPrice) });
      toast.success('Quotation added');
      setVendorForm(EMPTY_VENDOR);
      setShowVendorForm(false);
      load();
    } catch (e2) { toast.error(e2.response?.data?.message || 'Failed to add quotation'); }
  }

  async function selectVendor(vendorId) {
    if (!window.confirm('Select this vendor as the winning bid?')) return;
    try {
      await procurementService.selectVendor(id, vendorId);
      toast.success('Vendor selected');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to select vendor'); }
  }

  async function markDelivered(e) {
    e.preventDefault();
    if (!receivedBy.trim()) return toast.error('Receiver name is required.');
    try {
      await procurementService.markDelivered(id, { receivedBy, actualTotal: actualTotal || undefined });
      toast.success('Marked as delivered');
      setShowDeliverForm(false);
      load();
    } catch (e2) { toast.error(e2.response?.data?.message || 'Failed to mark delivered'); }
  }

  return (
    <div className="procurement-page fade-in">
      <button className="btn btn-ghost" onClick={() => navigate('/procurement')} style={{ marginBottom: 12 }}><RiArrowLeftLine /> Back to Procurement</button>

      <div className="page-header page-header-row">
        <div>
          <h1 className="mono">{r.referenceNumber}</h1>
          <p>{r.title}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <span className={`badge badge-${STATUS_COLORS[r.status]}`}>{r.status.replace('_', ' ')}</span>
            <span className={`badge badge-${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
            <span className="badge badge-neutral">{TYPE_LABELS[r.type]}</span>
          </div>
        </div>
        <div className="contract-view-actions">
          {r.selectedVendor?.name && <a className="btn btn-secondary" href={procurementService.getPO(id)} target="_blank" rel="noreferrer"><RiDownloadLine /> Purchase Order</a>}
          {r.status === 'approved' && <button className="btn btn-secondary" onClick={() => setShowDeliverForm((v) => !v)}><RiTruckLine /> Mark Delivered</button>}
        </div>
      </div>

      {r.complianceWarnings?.map((w, i) => (
        <div key={i} className="proc-warning-banner"><RiAlertLine /> {w}</div>
      ))}

      {showDeliverForm && (
        <form className="card card-pad proc-form-panel" onSubmit={markDelivered}>
          <h3>Goods Receipt</h3>
          <div className="proc-form-grid">
            <label className="pf-field"><span>Received By *</span><input className="form-input" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} /></label>
            <label className="pf-field"><span>Actual Total (₦)</span><input className="form-input" type="number" value={actualTotal} onChange={(e) => setActualTotal(e.target.value)} placeholder={r.estimatedTotal} /></label>
          </div>
          <button className="btn btn-primary">Confirm Goods Receipt</button>
        </form>
      )}

      {/* Approval chain stepper */}
      <div className="card card-pad">
        <h3>Approval Chain</h3>
        <div className="approval-stepper">
          {r.approvalChain.map((s, i) => (
            <div key={i} className={`approval-stepper-item ${s.status}`}>
              <div className="asi-icon">{s.status === 'approved' ? <RiCheckLine /> : s.status === 'rejected' ? <RiCloseLine /> : <RiTimeLine />}</div>
              <div className="asi-body">
                <strong>{s.approverName}</strong>
                <span className="muted">{s.approverRole}</span>
                <span className={`badge badge-${s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'danger' : 'warning'}`} style={{ marginTop: 4 }}>{s.status}</span>
                {s.actionedAt && <span className="muted" style={{ fontSize: 12 }}>{fmtDateTime(s.actionedAt)}</span>}
                {s.comment && <p className="asi-comment">"{s.comment}"</p>}
              </div>
            </div>
          ))}
          {!r.approvalChain.length && <p className="muted">Still a draft — not yet submitted for approval.</p>}
        </div>

        {isMyTurn && (
          <div className="proc-approve-box">
            <textarea className="form-input" rows={2} placeholder="Comment (required for rejection)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn btn-primary" disabled={acting} onClick={() => act('approve')}><RiCheckLine /> Approve</button>
              <button className="btn btn-danger" disabled={acting} onClick={() => act('reject')}><RiCloseLine /> Reject</button>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card">
        <div className="card-header-row"><h3>Items</h3></div>
        <div className="table-wrapper">
          <table className="table compact">
            <thead><tr><th>Description</th><th>Qty</th><th>Est. Unit Price</th><th>Est. Total</th><th>Actual Total</th></tr></thead>
            <tbody>
              {r.items.map((it, i) => (
                <tr key={i}><td>{it.description}</td><td>{it.quantity} {it.unit}</td><td>{naira(it.estimatedUnitPrice)}</td><td>{naira(it.estimatedTotal)}</td><td className="muted">{it.actualTotal != null ? naira(it.actualTotal) : '—'}</td></tr>
              ))}
              <tr className="total-row"><td colSpan={3}><strong>Total</strong></td><td><strong>{naira(r.estimatedTotal)}</strong></td><td><strong>{r.actualTotal != null ? naira(r.actualTotal) : '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor quotations */}
      <div className="card">
        <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Vendor Quotations</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowVendorForm((v) => !v)}><RiAddLine /> Add Vendor</button>
        </div>
        {showVendorForm && (
          <form className="proc-form-panel" onSubmit={addVendor} style={{ padding: '0 20px 16px' }}>
            <div className="proc-form-grid">
              <label className="pf-field"><span>Vendor Name *</span><input className="form-input" value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label className="pf-field"><span>Email</span><input className="form-input" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} /></label>
              <label className="pf-field"><span>Quoted Price (₦) *</span><input className="form-input" type="number" value={vendorForm.quotedPrice} onChange={(e) => setVendorForm((f) => ({ ...f, quotedPrice: e.target.value }))} /></label>
            </div>
            <button className="btn btn-primary btn-sm">Add Quotation</button>
          </form>
        )}
        <div className="table-wrapper">
          <table className="table compact">
            <thead><tr><th>Vendor</th><th>Quoted Price</th><th></th></tr></thead>
            <tbody>
              {r.vendors.map((v) => (
                <tr key={v._id} style={v.selected ? { background: 'var(--bg-secondary)' } : undefined}>
                  <td>{v.name} {v.selected && <span className="badge badge-success">Winner</span>}</td>
                  <td>{naira(v.quotedPrice)}</td>
                  <td>{!v.selected && r.status !== 'completed' && <button className="btn btn-ghost btn-sm" onClick={() => selectVendor(v._id)}>Select</button>}</td>
                </tr>
              ))}
              {!r.vendors.length && <tr><td colSpan={3} className="muted">No quotations yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit trail */}
      <div className="card">
        <div className="card-header-row"><h3>Audit Trail</h3></div>
        <div className="proc-audit-list">
          {r.auditTrail.slice().reverse().map((a, i) => (
            <div key={i} className="proc-audit-row">
              <span className="proc-audit-action">{a.action}</span>
              <span className="muted">{a.performedByName || 'System'} · {fmtDateTime(a.timestamp)}{a.ipAddress ? ` · ${a.ipAddress}` : ''}</span>
              {a.comment && <span className="muted">"{a.comment}"</span>}
            </div>
          ))}
          {!r.auditTrail.length && <p className="muted" style={{ padding: 16 }}>No activity recorded yet</p>}
        </div>
      </div>
    </div>
  );
}
