import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiHandCoinLine, RiAddLine, RiLoader4Line, RiCloseLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, nairaShort } from './groupUtils';
import './Group.css';

export const AGING_LABELS = { notDue: 'Not yet due', d1_30: '1–30 days overdue', d31_60: '31–60 days', d61_90: '61–90 days', d90plus: '90+ days' };
const AGING_COLORS = { notDue: '#10b981', d1_30: '#f59e0b', d31_60: '#f97316', d61_90: '#ef4444', d90plus: '#991b1b' };
export const KIND_LABELS = { company: 'Company', fleet: 'Fleet / transporter', government: 'Government', individual: 'Individual' };

export function CustomerForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    if (!String(f.name || '').trim()) { toast.error('Enter the customer name'); return; }
    setSaving(true);
    try {
      if (f._id) await groupService.updateCredit(f._id, f);
      else await groupService.createCredit(f);
      toast.success(f._id ? 'Customer updated' : 'Credit customer added');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>{f._id ? 'Edit credit customer' : 'New credit customer'}</h2><button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button></div>
        <div className="modal-body">
          <div className="grp-form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Customer / company name</label><input className="form-input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. ABC Transport Ltd" /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-input form-select" value={f.kind || 'company'} onChange={(e) => set('kind', e.target.value)}>
                {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Contact person</label><input className="form-input" value={f.contactName || ''} onChange={(e) => set('contactName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Phone / WhatsApp</label><input className="form-input" value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Credit limit (₦)</label><input type="number" className="form-input" value={f.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value)} placeholder="0 = no limit" /></div>
            <div className="form-group"><label className="form-label">Pays within (days)</label><input type="number" className="form-input" value={f.termsDays ?? 30} onChange={(e) => set('termsDays', e.target.value)} /></div>
            {!f._id && <div className="form-group"><label className="form-label">Already owes (opening balance ₦)</label><input type="number" className="form-input" value={f.openingBalance ?? ''} onChange={(e) => set('openingBalance', e.target.value)} /></div>}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Address</label><input className="form-input" value={f.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
          <label className="grp-row" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={f.autoRemind !== false} onChange={(e) => set('autoRemind', e.target.checked)} /> Send automatic payment reminders when overdue (weekly)</label>
          {f._id && <label className="grp-row" style={{ gap: 6, fontSize: 13, marginTop: 6 }}><input type="checkbox" checked={f.active !== false} onChange={(e) => set('active', e.target.checked)} /> Active (can buy on credit)</label>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function CreditCustomers() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    groupService.getCredit().then(({ data: r }) => setData(r)).catch((e) => toast.error(e.response?.data?.message || 'Could not load credit customers'));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;
  const t = data.totals || {};
  const agingTotal = Object.values(t.aging || {}).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiHandCoinLine style={{ verticalAlign: '-3px' }} /> Credit Customers</h1>
            <p className="muted">Companies and fleets that buy now and pay later. Credit sales on daily reports post to their accounts automatically.</p>
          </div>
          {data.canManage && <button className="btn btn-primary" onClick={() => setAdding(true)}><RiAddLine /> New customer</button>}
        </div>
      </div>

      <div className="card card-pad">
        <div className="grp-recon">
          <div><div className="l">Total owed to you</div><div className="v">{naira(t.outstanding)}</div></div>
          <div className={t.overdue > 0 ? 'verdict short' : ''}><div className="l">Overdue</div><div className={`v ${t.overdue > 0 ? 'grp-neg' : ''}`}>{naira(t.overdue)}</div></div>
          <div className={(t.aging?.d90plus || 0) > 0 ? 'verdict short' : ''}><div className="l">Over 90 days</div><div className="v">{naira(t.aging?.d90plus)}</div></div>
          <div><div className="l">Customers</div><div className="v">{data.data.length}</div></div>
        </div>
        {t.outstanding > 0 && (
          <>
            <div className="grp-aging-bar">
              {Object.keys(AGING_LABELS).map((k) => (t.aging?.[k] ? <span key={k} style={{ width: `${(t.aging[k] / agingTotal) * 100}%`, background: AGING_COLORS[k] }} title={`${AGING_LABELS[k]}: ${naira(t.aging[k])}`} /> : null))}
            </div>
            <div className="grp-row" style={{ gap: 14, fontSize: 12, marginTop: 6 }}>
              {Object.keys(AGING_LABELS).map((k) => (
                <span key={k} className="grp-row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: AGING_COLORS[k] }} />{AGING_LABELS[k]}: <strong>{nairaShort(t.aging?.[k])}</strong></span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card card-pad">
        {!data.data.length ? <p className="muted" style={{ textAlign: 'center', padding: 30 }}>No credit customers yet.</p> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Customer</th><th style={{ textAlign: 'right' }}>Owes</th><th style={{ textAlign: 'right' }}>Overdue</th><th>Limit used</th><th style={{ textAlign: 'right' }}>Oldest overdue</th><th>Terms</th></tr></thead>
              <tbody>
                {data.data.map((c) => {
                  const used = c.creditLimit ? Math.min(100, Math.round((c.outstanding / c.creditLimit) * 100)) : null;
                  return (
                    <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/group/credit/${c._id}`)}>
                      <td><div style={{ fontWeight: 600 }}>{c.name}</div><div className="muted" style={{ fontSize: 12 }}>{KIND_LABELS[c.kind]}{c.contactName ? ` · ${c.contactName}` : ''}</div></td>
                      <td className="grp-num" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(c.outstanding)}</td>
                      <td className={`grp-num ${c.overdue > 0 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{c.overdue > 0 ? naira(c.overdue) : '—'}</td>
                      <td style={{ minWidth: 140 }}>
                        {used === null ? <span className="muted">No limit</span> : (
                          <>
                            <div className={`grp-bar ${c.overLimit ? 'low' : used > 80 ? 'mid' : ''}`}><span style={{ width: `${used}%` }} /></div>
                            <div className="muted" style={{ fontSize: 11 }}>{c.overLimit ? <span className="grp-neg">Over limit</span> : `${used}%`} of {nairaShort(c.creditLimit)}</div>
                          </>
                        )}
                      </td>
                      <td className={`grp-num ${c.oldestOverdueDays > 60 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{c.oldestOverdueDays ? `${c.oldestOverdueDays} days` : '—'}</td>
                      <td className="muted">{c.termsDays} days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && <CustomerForm initial={{ kind: 'company', termsDays: 30, autoRemind: true }} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}
