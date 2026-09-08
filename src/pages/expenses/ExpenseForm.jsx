import { useState, useRef } from 'react';
import { expenseService } from '../../services';
import { RiCloseLine, RiUploadCloud2Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from './categories';
import './Expenses.css';

const today = () => new Date().toISOString().slice(0, 10);
const INTERVALS = ['daily', 'weekly', 'monthly', 'yearly'];

export default function ExpenseForm({ expense, onClose, onSaved }) {
  const editing = Boolean(expense?._id);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: expense?.title || '',
    amount: expense?.amount ?? '',
    category: expense?.category || 'other',
    date: expense?.date ? expense.date.slice(0, 10) : today(),
    paymentMethod: expense?.paymentMethod || 'cash',
    vendor: expense?.vendor || '',
    description: expense?.description || '',
    isRecurring: expense?.isRecurring || false,
    recurringInterval: expense?.recurringInterval || 'monthly',
    tags: (expense?.tags || []).join(', '),
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!(Number(form.amount) > 0)) return toast.error('Amount must be greater than zero');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('amount', Number(form.amount));
      fd.append('category', form.category);
      fd.append('date', form.date);
      fd.append('paymentMethod', form.paymentMethod);
      fd.append('vendor', form.vendor);
      fd.append('description', form.description);
      fd.append('isRecurring', form.isRecurring ? 'true' : 'false');
      if (form.isRecurring) fd.append('recurringInterval', form.recurringInterval);
      fd.append('tags', form.tags);
      if (receiptFile) fd.append('receipt', receiptFile);

      const res = editing
        ? await expenseService.update(expense._id, fd)
        : await expenseService.create(fd);
      toast.success(editing ? 'Expense updated' : 'Expense added');
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="exp-overlay" onClick={onClose}>
      <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><RiCloseLine /></button>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Amount (₦) *</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.amount}
              onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-input form-select" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vendor / Supplier</label>
            <input className="form-input" value={form.vendor} onChange={(e) => set('vendor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description / Notes</label>
          <textarea className="form-input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Receipt (optional)</label>
          <div className={`receipt-drop ${receiptFile || expense?.receipt ? 'has' : ''}`} onClick={() => fileRef.current?.click()}>
            <RiUploadCloud2Line size={20} />
            <div>{receiptFile ? receiptFile.name : expense?.receipt ? 'Replace current receipt' : 'Click to upload image or PDF'}</div>
            {receiptFile && receiptFile.type.startsWith('image/') && (
              <img className="receipt-thumb" src={URL.createObjectURL(receiptFile)} alt="" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden
            onChange={(e) => { setReceiptFile(e.target.files[0] || null); e.target.value = ''; }} />
        </div>

        <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} />
          This is a recurring expense
        </label>
        {form.isRecurring && (
          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Interval</label>
            <select className="form-input form-select" value={form.recurringInterval} onChange={(e) => set('recurringInterval', e.target.value)}>
              {INTERVALS.map((i) => <option key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn btn-primary" disabled={saving} onClick={submit} style={{ flex: 1 }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Expense'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
