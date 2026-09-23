import { useState } from 'react';
import { procurementService } from '../../services';
import toast from 'react-hot-toast';
import { RiAddLine, RiAlertLine } from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const EMPTY = { code: '', department: '', description: '', totalBudget: '' };
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const chartTooltip = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' };

export default function BudgetManager({ budgets, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.totalBudget) return toast.error('Budget code and total amount are required.');
    setSaving(true);
    try {
      await procurementService.createBudget({ ...form, totalBudget: Number(form.totalBudget) });
      toast.success('Budget line created');
      setForm(EMPTY);
      setShowForm(false);
      onReload();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Failed to create budget line');
    } finally {
      setSaving(false);
    }
  }

  const byDepartment = Object.values(
    budgets.reduce((acc, b) => {
      const key = b.department || 'Unassigned';
      if (!acc[key]) acc[key] = { department: key, allocated: 0, total: 0 };
      acc[key].allocated += b.allocated || 0;
      acc[key].total += b.totalBudget || 0;
      return acc;
    }, {})
  );

  return (
    <>
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Budget Lines</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}><RiAddLine /> Add Budget Line</button>
      </div>

      {showForm && (
        <form className="card card-pad proc-form-panel" onSubmit={submit}>
          <div className="proc-form-grid">
            <label className="pf-field"><span>Budget Code *</span><input className="form-input" placeholder="IT-2026-01" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></label>
            <label className="pf-field"><span>Department</span><input className="form-input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></label>
            <label className="pf-field"><span>Total Budget (₦) *</span><input className="form-input" type="number" value={form.totalBudget} onChange={(e) => setForm((f) => ({ ...f, totalBudget: e.target.value }))} /></label>
            <label className="pf-field" style={{ gridColumn: '1 / -1' }}><span>Description</span><input className="form-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Budget Line'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {byDepartment.length > 0 && (
        <div className="card card-pad">
          <h3>Budget Utilization by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDepartment} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`)} />
              <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
              <Bar dataKey="allocated" name="Allocated" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" name="Total Budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Department</th><th>Code</th><th>Total</th><th>Allocated</th><th>Spent</th><th>Available</th><th>Utilization</th></tr></thead>
            <tbody>
              {budgets.map((b) => {
                const pct = b.totalBudget ? Math.round((b.allocated / b.totalBudget) * 100) : 0;
                return (
                  <tr key={b._id}>
                    <td>{b.department || '—'}</td>
                    <td className="mono">{b.code}</td>
                    <td>{naira(b.totalBudget)}</td>
                    <td>{naira(b.allocated)}</td>
                    <td>{naira(b.spent)}</td>
                    <td>{naira(b.totalBudget - b.allocated)}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="usage-track"><div className="usage-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 80 ? 'var(--color-danger)' : 'var(--color-brand)' }} /></div>
                      <span style={{ fontSize: 12, color: pct >= 80 ? 'var(--color-danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {pct >= 80 && <RiAlertLine />} {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!budgets.length && <tr><td colSpan={7} className="muted">No budget lines yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
