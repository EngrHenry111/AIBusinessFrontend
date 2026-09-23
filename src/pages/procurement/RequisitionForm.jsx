import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { procurementService, userService } from '../../services';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiArrowRightLine, RiAddLine, RiDeleteBinLine, RiCheckLine } from 'react-icons/ri';
import { TYPE_LABELS } from './Procurement';
import './Procurement.css';

const STEPS = ['Basic Info', 'Items', 'Approval Chain', 'Documents', 'Review & Submit'];
const EMPTY_ITEM = { description: '', quantity: 1, unit: 'pieces', estimatedUnitPrice: 0, category: '' };
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Mirrors backend procurementController's requiredApprovalRoles() exactly —
// duplicated here only so the wizard can show the right number of approver
// pickers before submitting; the backend re-validates and is authoritative.
function requiredRoles(amount) {
  if (amount < 100000) return ['Department Head'];
  if (amount <= 1000000) return ['Department Head', 'Finance Officer'];
  return ['Department Head', 'Finance Officer', 'MD/Director'];
}

export default function RequisitionForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('purchase_requisition');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('medium');
  const [budgetCode, setBudgetCode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [approvers, setApprovers] = useState([]);
  const [documentNotes, setDocumentNotes] = useState('');

  const [budgets, setBudgets] = useState([]);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    procurementService.getBudgets().then(({ data }) => setBudgets(data.data)).catch(() => {});
    userService.getTeam().then(({ data }) => setTeam(data.data)).catch(() => {});
  }, []);

  const estimatedTotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.estimatedUnitPrice) || 0), 0),
    [items]
  );
  const roles = useMemo(() => requiredRoles(estimatedTotal), [estimatedTotal]);
  const selectedBudget = budgets.find((b) => b.code === budgetCode);
  const budgetAvailable = selectedBudget ? selectedBudget.totalBudget - selectedBudget.allocated : null;
  const overBudget = budgetAvailable != null && estimatedTotal > budgetAvailable;

  useEffect(() => {
    // Keep the approvers array the same length as the currently required
    // roles, preserving any picks that still fit.
    setApprovers((prev) => roles.map((_, i) => prev[i] || { approverId: '' }));
  }, [roles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  function validateStep() {
    setErr('');
    if (step === 0 && !title.trim()) { setErr('Title is required.'); return false; }
    if (step === 1) {
      if (!items.length || items.some((i) => !i.description.trim() || !i.quantity || !i.estimatedUnitPrice)) {
        setErr('Every item needs a description, quantity and unit price.');
        return false;
      }
      if (overBudget) { setErr(`This requisition exceeds the available budget on "${budgetCode}".`); return false; }
    }
    if (step === 2 && approvers.some((a) => !a.approverId)) { setErr('Select an approver for every required level.'); return false; }
    return true;
  }

  function next() { if (validateStep()) setStep((s) => Math.min(STEPS.length - 1, s + 1)); }
  function back() { setErr(''); setStep((s) => Math.max(0, s - 1)); }

  const basePayload = {
    title: title.trim(), type, department, priority,
    items: items.map((i) => ({ ...i, quantity: Number(i.quantity), estimatedUnitPrice: Number(i.estimatedUnitPrice) })),
    budgetCode: budgetCode || undefined, deliveryDate: deliveryDate || undefined, deliveryLocation, notes,
  };

  async function saveDraft() {
    setSaving(true);
    try {
      const { data } = await procurementService.create(basePayload);
      toast.success('Saved as draft');
      navigate(`/procurement/${data.data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  async function submitForApproval() {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const { data } = await procurementService.create(basePayload);
      await procurementService.update(data.data._id, { submit: true, approvers });
      toast.success('Submitted for approval');
      navigate(`/procurement/${data.data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="procurement-page fade-in">
      <button className="btn btn-ghost" onClick={() => navigate('/procurement')} style={{ marginBottom: 12 }}><RiArrowLeftLine /> Back to Procurement</button>
      <div className="page-header"><h1>New Requisition</h1><p>Government-grade purchase requisition</p></div>

      <div className="setup-steps" style={{ marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`setup-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span>{i < step ? <RiCheckLine /> : i + 1}</span>
            <label>{s}</label>
          </div>
        ))}
      </div>

      {/* Step 1 — Basic Info */}
      {step === 0 && (
        <div className="card card-pad">
          <h3>Basic Info</h3>
          <div className="proc-form-grid">
            <label className="pf-field" style={{ gridColumn: '1 / -1' }}><span>Title *</span><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office furniture for new branch" /></label>
            <label className="pf-field"><span>Type</span>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="pf-field"><span>Department</span><input className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
            <label className="pf-field"><span>Priority</span>
              <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="pf-field"><span>Budget Code</span>
              <select className="form-input" value={budgetCode} onChange={(e) => setBudgetCode(e.target.value)}>
                <option value="">None</option>
                {budgets.map((b) => <option key={b._id} value={b.code}>{b.code} — {naira(b.totalBudget - b.allocated)} available</option>)}
              </select>
            </label>
            <label className="pf-field"><span>Delivery Date</span><input className="form-input" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></label>
            <label className="pf-field"><span>Delivery Location</span><input className="form-input" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} /></label>
            <label className="pf-field" style={{ gridColumn: '1 / -1' }}><span>Notes</span><textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
        </div>
      )}

      {/* Step 2 — Items */}
      {step === 1 && (
        <div className="card card-pad">
          <h3>Items</h3>
          <div className="table-wrapper">
            <table className="table compact">
              <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Est. Price</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td><input className="form-input" value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></td>
                    <td><input className="form-input" type="number" min={0} style={{ width: 70 }} value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} /></td>
                    <td><input className="form-input" style={{ width: 90 }} value={it.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} /></td>
                    <td><input className="form-input" type="number" min={0} style={{ width: 110 }} value={it.estimatedUnitPrice} onChange={(e) => updateItem(i, 'estimatedUnitPrice', e.target.value)} /></td>
                    <td>{naira((Number(it.quantity) || 0) * (Number(it.estimatedUnitPrice) || 0))}</td>
                    <td>{items.length > 1 && <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(i)}><RiDeleteBinLine /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><RiAddLine /> Add Item</button>

          <div className="proc-total-row">
            <span>Estimated Total</span><strong>{naira(estimatedTotal)}</strong>
          </div>
          {selectedBudget && (
            <div className={`proc-budget-check ${overBudget ? 'over' : ''}`}>
              Budget "{budgetCode}": {naira(budgetAvailable)} available {overBudget && '— this exceeds the available budget!'}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Approval Chain */}
      {step === 2 && (
        <div className="card card-pad">
          <h3>Approval Chain</h3>
          <p className="muted">Based on a value of {naira(estimatedTotal)}, this requisition requires <strong>{roles.length}</strong> approval level{roles.length > 1 ? 's' : ''}: {roles.join(' → ')}.</p>
          {roles.map((role, i) => (
            <label key={i} className="pf-field" style={{ maxWidth: 420 }}>
              <span>Level {i + 1} — {role}</span>
              <select className="form-input" value={approvers[i]?.approverId || ''} onChange={(e) => setApprovers((prev) => prev.map((a, idx) => (idx === i ? { approverId: e.target.value } : a)))}>
                <option value="">Select a team member…</option>
                {team.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role?.replace('_', ' ')})</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      {/* Step 4 — Documents */}
      {step === 3 && (
        <div className="card card-pad">
          <h3>Supporting Documents</h3>
          <p className="muted">Note which documents will accompany this requisition (e.g. vendor CAC certificate, prior invoices, technical specification). These can be attached to individual vendor quotations once you're comparing bids.</p>
          <label className="pf-field" style={{ maxWidth: 600 }}>
            <span>Document checklist / notes</span>
            <textarea className="form-input" rows={4} value={documentNotes} onChange={(e) => setDocumentNotes(e.target.value)} placeholder="e.g. Technical specification attached separately by email to Finance." />
          </label>
        </div>
      )}

      {/* Step 5 — Review & Submit */}
      {step === 4 && (
        <div className="card card-pad">
          <h3>Review &amp; Submit</h3>
          <div className="proc-review-grid">
            <div><span className="muted">Title</span><p>{title}</p></div>
            <div><span className="muted">Type</span><p>{TYPE_LABELS[type]}</p></div>
            <div><span className="muted">Department</span><p>{department || '—'}</p></div>
            <div><span className="muted">Priority</span><p>{priority}</p></div>
            <div><span className="muted">Delivery</span><p>{deliveryLocation || '—'} {deliveryDate ? `by ${deliveryDate}` : ''}</p></div>
            <div><span className="muted">Budget Code</span><p>{budgetCode || 'None'}</p></div>
          </div>
          <h4 style={{ marginTop: 16 }}>Items ({items.length})</h4>
          {items.map((it, i) => <div key={i} className="proc-review-item"><span>{it.description} × {it.quantity} {it.unit}</span><span>{naira(it.quantity * it.estimatedUnitPrice)}</span></div>)}
          <div className="proc-total-row"><span>Estimated Total</span><strong>{naira(estimatedTotal)}</strong></div>

          <h4 style={{ marginTop: 16 }}>Approval Chain</h4>
          {roles.map((role, i) => <div key={i} className="proc-review-item"><span>Level {i + 1} — {role}</span><span>{team.find((u) => u._id === approvers[i]?.approverId)?.name || '—'}</span></div>)}
        </div>
      )}

      {err && <p className="proc-error" style={{ marginTop: 12 }}>{err}</p>}
      <div className="setup-nav">
        {step > 0 && <button className="btn btn-ghost" onClick={back}><RiArrowLeftLine /> Back</button>}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 && <button className="btn btn-primary" onClick={next}>Next <RiArrowRightLine /></button>}
        {step === STEPS.length - 1 && (
          <>
            <button className="btn btn-secondary" disabled={saving} onClick={saveDraft}>Save as Draft</button>
            <button className="btn btn-primary" disabled={saving} onClick={submitForApproval}>{saving ? 'Submitting…' : 'Submit for Approval'}</button>
          </>
        )}
      </div>
    </div>
  );
}
