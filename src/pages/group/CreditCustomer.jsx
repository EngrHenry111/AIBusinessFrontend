import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiCloseLine, RiMoneyDollarCircleLine, RiSendPlaneLine, RiEditLine, RiPrinterLine, RiScales2Line } from 'react-icons/ri';
import { groupService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { naira, fmtDate, todayYmd, isOwner } from './groupUtils';
import { AGING_LABELS, KIND_LABELS, CustomerForm } from './CreditCustomers';
import './Group.css';

const TYPE_LABELS = { sale: 'Credit sale', payment: 'Payment', adjustment: 'Adjustment', reversal: 'Reversal' };

export default function CreditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [data, setData] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    groupService.getCreditCustomer(id)
      .then(({ data: r }) => { setData(r.data); setCanManage(r.canManage); })
      .catch((e) => { toast.error(e.response?.data?.message || 'Customer not found'); navigate('/group/credit'); });
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { groupService.getBranches().then(({ data: r }) => setBranches(r.data || [])).catch(() => {}); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function act(fn, msg) {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(msg);
      setModal(null);
      setForm({});
      load();
      return r;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong');
      return null;
    } finally { setBusy(false); }
  }
  async function remind() {
    setBusy(true);
    try {
      const { data: r } = await groupService.creditRemind(id);
      const ok = r.data.results.filter((x) => x.ok).map((x) => x.channel);
      if (ok.length) toast.success(`Reminder sent by ${ok.join(' and ')}`);
      else toast.error(r.data.results.map((x) => `${x.channel}: ${x.reason}`).join(' · ') || 'Reminder not delivered');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send the reminder');
    } finally { setBusy(false); }
  }

  if (!data) return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;
  const c = data.customer;

  return (
    <div className="grp-page fade-in">
      <div className="grp-row grp-no-print">
        <Link to="/group/credit" className="btn btn-ghost btn-sm"><RiArrowLeftLine /> All credit customers</Link>
        <span className="grp-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><RiPrinterLine /> Print statement</button>
        {canManage && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal('edit')}><RiEditLine /> Edit</button>
            {isOwner(user) && <button className="btn btn-secondary btn-sm" onClick={() => { setForm({}); setModal('adjust'); }}><RiScales2Line /> Adjust</button>}
            <button className="btn btn-secondary btn-sm" onClick={remind} disabled={busy || data.outstanding <= 0}><RiSendPlaneLine /> Send reminder</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ date: todayYmd(), method: 'transfer' }); setModal('pay'); }}><RiMoneyDollarCircleLine /> Record payment</button>
          </>
        )}
      </div>

      <div className="card grp-doc">
        <div className="grp-doc-head">
          <div>
            <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{company?.companyName} · Customer statement</div>
            <h2>{c.name}</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {KIND_LABELS[c.kind]}{c.contactName ? ` · ${c.contactName}` : ''}{c.phone ? ` · ${c.phone}` : ''}{c.email ? ` · ${c.email}` : ''}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Terms: pay within {c.termsDays} days{c.creditLimit ? ` · Credit limit ${naira(c.creditLimit)}` : ''}{c.lastReminderAt ? ` · Last reminder ${fmtDate(c.lastReminderAt)}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted" style={{ fontSize: 12 }}>Balance owed</div>
            <div style={{ fontSize: 28, fontWeight: 800 }} className={data.overdue > 0 ? 'grp-neg' : ''}>{naira(data.outstanding)}</div>
            {data.unappliedCredit > 0 && <div className="grp-pos" style={{ fontSize: 13 }}>In credit {naira(data.unappliedCredit)}</div>}
          </div>
        </div>

        <div className="grp-recon" style={{ marginBottom: 20 }}>
          {Object.entries(AGING_LABELS).map(([k, l]) => (
            <div key={k} className={k !== 'notDue' && data.aging[k] > 0 ? 'verdict short' : ''}>
              <div className="l">{l}</div><div className={`v ${k !== 'notDue' && data.aging[k] > 0 ? 'grp-neg' : ''}`}>{naira(data.aging[k])}</div>
            </div>
          ))}
        </div>

        {!data.statement.length ? <p className="muted">No transactions yet.</p> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Date</th><th>Details</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
              <tbody>
                {data.statement.map((t) => (
                  <tr key={t._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                    <td>
                      <div>{TYPE_LABELS[t.type]}{t.branchName ? ` · ${t.branchName}` : ''}{t.method ? ` · ${t.method}` : ''}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{[t.reference, t.vehicle && `Vehicle ${t.vehicle}`, t.note, t.dueDate && t.amount > 0 ? `due ${fmtDate(t.dueDate)}` : ''].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="grp-num" style={{ textAlign: 'right' }}>{t.amount > 0 ? naira(t.amount) : ''}</td>
                    <td className="grp-num grp-pos" style={{ textAlign: 'right' }}>{t.amount < 0 ? naira(-t.amount) : ''}</td>
                    <td className="grp-num" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(t.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'edit' && <CustomerForm initial={{ ...c }} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}

      {(modal === 'pay' || modal === 'adjust') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{modal === 'pay' ? `Payment from ${c.name}` : `Adjust ${c.name}'s balance`}</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(null)} aria-label="Close"><RiCloseLine /></button></div>
            <div className="modal-body">
              {modal === 'pay' ? (
                <div className="grp-form-grid">
                  <div className="form-group"><label className="form-label">Amount paid (₦)</label><input type="number" className="form-input" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} autoFocus /></div>
                  <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date || ''} max={todayYmd()} onChange={(e) => set('date', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Method</label>
                    <select className="form-input form-select" value={form.method || ''} onChange={(e) => set('method', e.target.value)}>
                      {['transfer', 'cash', 'pos', 'cheque'].map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Received at</label>
                    <select className="form-input form-select" value={form.branchId || ''} onChange={(e) => set('branchId', e.target.value)}>
                      <option value="">Head office</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Reference / teller no.</label><input className="form-input" value={form.reference || ''} onChange={(e) => set('reference', e.target.value)} /></div>
                </div>
              ) : (
                <>
                  <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Positive adds to what they owe; negative reduces it (e.g. a discount or write-off).</p>
                  <div className="grp-form-grid">
                    <div className="form-group"><label className="form-label">Amount (₦)</label><input type="number" className="form-input" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} placeholder="-5000" /></div>
                    <div className="form-group"><label className="form-label">Reason</label><input className="form-input" value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}
                onClick={() => (modal === 'pay' ? act(() => groupService.creditPayment(id, form), 'Payment recorded') : act(() => groupService.creditAdjustment(id, form), 'Balance adjusted'))}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
