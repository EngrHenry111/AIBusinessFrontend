import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiScales3Line, RiTimerLine, RiAddLine, RiDeleteBinLine, RiCheckLine,
  RiFileList3Line, RiSafe2Line, RiCalendarEventLine, RiLoader4Line, RiCloseLine,
  RiPlayFill, RiStopFill, RiShieldCheckLine, RiAlertLine, RiEditLine,
} from 'react-icons/ri';
import { matterService } from '../../services';
import {
  PRACTICE_AREAS, MATTER_STATUS, BILLING_METHODS, KEY_DATE_TYPES, money, hours, fmtDate, relativeDay, daysUntil,
} from './matterConstants';
import { MatterFormModal } from './Matters';
import './Matters.css';

const TABS = [
  ['overview', 'Overview', RiScales3Line],
  ['time', 'Time & expenses', RiTimerLine],
  ['dates', 'Key dates', RiCalendarEventLine],
  ['trust', 'Trust account', RiSafe2Line],
  ['invoices', 'Invoices', RiFileList3Line],
];

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [matter, setMatter] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await matterService.getOne(id);
      setMatter(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Matter not found');
      navigate('/matters');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { reload(); }, [reload]);

  async function changeStatus(status) {
    try {
      await matterService.update(id, { status });
      toast.success(`Matter marked ${MATTER_STATUS[status].label.toLowerCase()}`);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update status'); }
  }

  async function remove() {
    if (!confirm('Delete this matter and its unbilled entries? This cannot be undone.')) return;
    try {
      await matterService.delete(id);
      toast.success('Matter deleted');
      navigate('/matters');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
  }

  if (loading || !matter) return <div className="mt-loading"><RiLoader4Line className="spin" /> Loading matter…</div>;

  const cur = matter.billing?.currency || 'NGN';
  const t = matter.totals || {};
  return (
    <div className="matters-page fade-in">
      <Link to="/matters" className="mt-back"><RiArrowLeftLine /> All matters</Link>
      <div className="page-header page-header-row">
        <div>
          <h1>{matter.title}</h1>
          <p>
            {matter.matterNumber} · {matter.client?.name} · {PRACTICE_AREAS[matter.practiceArea]}
            {matter.court?.suitNumber && <> · Suit {matter.court.suitNumber}</>}
          </p>
        </div>
        <div className="mt-header-actions">
          <select className="form-input form-select" value={matter.status} onChange={(e) => changeStatus(e.target.value)} aria-label="Matter status">
            {Object.entries(MATTER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => setEditing(true)}><RiEditLine /> Edit</button>
          <button className="btn btn-ghost btn-icon" onClick={remove} title="Delete matter" aria-label="Delete matter"><RiDeleteBinLine /></button>
        </div>
      </div>

      <div className="stat-grid mt-stats">
        <div className="stat-card"><div className="stat-label">Unbilled time</div><div className="stat-value">{money(t.unbilledTime, cur)}</div><div className="cell-sub">{hours(t.unbilledMinutes)}</div></div>
        <div className="stat-card"><div className="stat-label">Unbilled disbursements</div><div className="stat-value">{money(t.unbilledExpenses, cur)}</div></div>
        <div className="stat-card"><div className="stat-label">Outstanding invoices</div><div className="stat-value">{money(t.outstanding, cur)}</div></div>
        <div className="stat-card"><div className="stat-label">Client trust balance</div><div className="stat-value">{money(matter.trustBalance, cur)}</div></div>
      </div>

      <div className="mt-tabs" role="tablist">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`mt-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            <Icon /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview matter={matter} onSaved={reload} />}
      {tab === 'time' && <TimeTab matter={matter} onChanged={reload} />}
      {tab === 'dates' && <DatesTab matter={matter} onChanged={reload} />}
      {tab === 'trust' && <TrustTab matter={matter} onChanged={reload} />}
      {tab === 'invoices' && <InvoicesTab matter={matter} />}
      {editing && <MatterFormModal matter={matter} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────
function Overview({ matter }) {
  const cc = matter.conflictCheck || {};
  const b = matter.billing || {};
  const Row = ({ label, children }) => (children ? <div className="mt-kv"><span>{label}</span><div>{children}</div></div> : null);
  return (
    <div className="mt-overview">
      <div className="card card-pad">
        <h3 className="mt-card-title">Client</h3>
        <Row label="Name">{matter.client?.name}</Row>
        <Row label="Type">{matter.client?.type === 'organization' ? 'Organisation' : 'Individual'}</Row>
        <Row label="Email">{matter.client?.email && <a href={`mailto:${matter.client.email}`}>{matter.client.email}</a>}</Row>
        <Row label="Phone">{matter.client?.phone}</Row>
        <Row label="Address">{matter.client?.address}</Row>
      </div>
      <div className="card card-pad">
        <h3 className="mt-card-title">Court</h3>
        {matter.court?.name || matter.court?.suitNumber ? (
          <>
            <Row label="Court">{matter.court?.name}</Row>
            <Row label="Suit no.">{matter.court?.suitNumber}</Row>
            <Row label="Judge">{matter.court?.judge}</Row>
            <Row label="Jurisdiction">{matter.court?.jurisdiction}</Row>
          </>
        ) : <p className="cell-sub">Not in court (advisory / transactional matter).</p>}
      </div>
      <div className="card card-pad">
        <h3 className="mt-card-title">Parties</h3>
        {(matter.opposingParties || []).length === 0 && (matter.relatedParties || []).length === 0 && <p className="cell-sub">No other parties recorded.</p>}
        {(matter.opposingParties || []).map((p) => (
          <Row key={p._id} label={p.role || 'Opposing'}>{p.name}{p.counsel && <span className="cell-sub">Counsel: {p.counsel}</span>}</Row>
        ))}
        {(matter.relatedParties || []).map((p) => <Row key={p._id} label={p.role || 'Related'}>{p.name}</Row>)}
      </div>
      <div className="card card-pad">
        <h3 className="mt-card-title">Billing & team</h3>
        <Row label="Method">{BILLING_METHODS[b.method]}</Row>
        <Row label="Hourly rate">{b.hourlyRate > 0 && money(b.hourlyRate, b.currency)}</Row>
        <Row label="Flat fee">{b.flatFee > 0 && money(b.flatFee, b.currency)}</Row>
        <Row label="Contingency">{b.contingencyPercent > 0 && `${b.contingencyPercent}%`}</Row>
        <Row label="Responsible">{matter.responsibleLawyer?.name}</Row>
        <Row label="Opened">{fmtDate(matter.openedAt)}</Row>
        <Row label="Closed">{matter.closedAt && fmtDate(matter.closedAt)}</Row>
      </div>
      <div className="card card-pad mt-wide">
        <h3 className="mt-card-title">Conflict check</h3>
        {cc.checkedAt ? (
          <p className={`mt-conflict ${cc.result === 'clear' ? 'clear' : 'warn'}`}>
            {cc.result === 'clear' ? <RiShieldCheckLine /> : <RiAlertLine />}
            {cc.result === 'clear' ? 'Clear' : 'Potential conflict, waived'} · checked {fmtDate(cc.checkedAt, true)}
            {cc.hits > 0 && ` · ${cc.hits} match(es)`}
            {cc.notes && <span className="cell-sub">{cc.notes}</span>}
          </p>
        ) : <p className="cell-sub">No conflict check on record.</p>}
        {matter.description && <><h3 className="mt-card-title" style={{ marginTop: 16 }}>Description</h3><p className="mt-desc">{matter.description}</p></>}
      </div>
    </div>
  );
}

// ── Time & expenses ────────────────────────────────────────────────────────
function useTimer(key) {
  const [startedAt, setStartedAt] = useState(() => {
    try { return Number(localStorage.getItem(key)) || null; } catch { return null; }
  });
  const [, tick] = useState(0);
  useEffect(() => {
    if (!startedAt) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const start = () => { const now = Date.now(); setStartedAt(now); try { localStorage.setItem(key, String(now)); } catch { /* ignore */ } };
  const stop = () => {
    const mins = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 0;
    setStartedAt(null);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return mins;
  };
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  return { running: Boolean(startedAt), elapsed, start, stop };
}

function TimeTab({ matter, onChanged }) {
  const cur = matter.billing?.currency || 'NGN';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('time');
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', hours: '', rate: matter.billing?.hourlyRate || '', unitCost: '', quantity: 1, billable: true });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showInvoice, setShowInvoice] = useState(false);
  const timer = useTimer(`matter-timer:${matter._id}`);
  const descRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await matterService.getEntries(matter._id);
      setEntries(data.data);
    } catch { toast.error('Failed to load entries'); }
    finally { setLoading(false); }
  }, [matter._id]);
  useEffect(() => { load(); }, [load]);

  function stopTimer() {
    const mins = timer.stop();
    setKind('time');
    setForm((f) => ({ ...f, hours: (mins / 60).toFixed(2) }));
    descRef.current?.focus();
    toast.success(`${mins} min captured. Add a description and save.`);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = kind === 'time'
        ? { kind, date: form.date, description: form.description, hours: Number(form.hours), rate: form.rate === '' ? undefined : Number(form.rate), billable: form.billable }
        : { kind, date: form.date, description: form.description, unitCost: Number(form.unitCost), quantity: Number(form.quantity) || 1, billable: form.billable };
      await matterService.addEntry(matter._id, body);
      setForm((f) => ({ ...f, description: '', hours: '', unitCost: '', quantity: 1 }));
      load(); onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save entry'); }
    finally { setSaving(false); }
  }

  async function remove(entry) {
    if (!confirm('Delete this entry?')) return;
    try { await matterService.deleteEntry(entry._id); load(); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
  }

  const unbilled = entries.filter((e) => !e.invoiceId && e.billable);
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = unbilled.length > 0 && unbilled.every((e) => selected.has(e._id));
  const fmtElapsed = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="mt-stack">
      <form className="card card-pad mt-entry-form" onSubmit={save}>
        <div className="mt-entry-head">
          <div className="mt-seg" role="radiogroup" aria-label="Entry type">
            <button type="button" className={kind === 'time' ? 'active' : ''} onClick={() => setKind('time')}>Time</button>
            <button type="button" className={kind === 'expense' ? 'active' : ''} onClick={() => setKind('expense')}>Disbursement</button>
          </div>
          {matter.status !== 'closed' && (timer.running ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={stopTimer}><RiStopFill /> Stop {fmtElapsed(timer.elapsed)}</button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={timer.start}><RiPlayFill /> Start timer</button>
          ))}
        </div>
        <div className="mt-entry-grid">
          <input className="form-input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Date" />
          <input ref={descRef} className="form-input mt-entry-desc" required placeholder={kind === 'time' ? 'Work done, e.g. Drafted statement of claim' : 'e.g. Court filing fees'}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Description" />
          {kind === 'time' ? (
            <>
              <input className="form-input" type="number" min="0.01" step="0.01" required placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} aria-label="Hours" />
              <input className="form-input" type="number" min="0" step="any" placeholder={`Rate (${cur}/h)`} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} aria-label="Hourly rate" />
            </>
          ) : (
            <>
              <input className="form-input" type="number" min="0" step="any" required placeholder={`Amount (${cur})`} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} aria-label="Amount" />
              <input className="form-input" type="number" min="1" step="1" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-label="Quantity" />
            </>
          )}
          <label className="mt-check"><input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable</label>
          <button className="btn btn-primary" disabled={saving || matter.status === 'closed'}><RiAddLine /> Add</button>
        </div>
      </form>

      <div className="card">
        <div className="mt-table-head">
          <strong>{entries.length} entries</strong>
          <button className="btn btn-primary btn-sm" disabled={!unbilled.length} onClick={() => setShowInvoice(true)}>
            <RiFileList3Line /> {selected.size ? `Invoice ${selected.size} selected` : 'Invoice all unbilled'}
          </button>
        </div>
        {loading ? <div className="mt-loading"><RiLoader4Line className="spin" /></div> : entries.length === 0 ? (
          <div className="empty-state"><h3>No time or disbursements yet</h3><p>Log your work as you go. Unbilled entries roll into an invoice in one click.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all unbilled" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(unbilled.map((e) => e._id)))} /></th>
                  <th>Date</th><th>Description</th><th>By</th><th className="num">Qty / hrs</th><th className="num">Amount</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id}>
                    <td>{!e.invoiceId && e.billable && <input type="checkbox" aria-label="Select entry" checked={selected.has(e._id)} onChange={() => toggle(e._id)} />}</td>
                    <td>{fmtDate(e.date)}</td>
                    <td>
                      <span className={`badge badge-${e.kind === 'time' ? 'brand' : 'neutral'}`}>{e.kind === 'time' ? 'Time' : 'Disb.'}</span> {e.description}
                    </td>
                    <td>{e.userId?.name || '—'}</td>
                    <td className="num">{e.kind === 'time' ? hours(e.minutes) : e.quantity}</td>
                    <td className="num">{money(e.amount, cur)}</td>
                    <td>
                      {e.invoiceId ? <Link to={`/invoices?open=${e.invoiceId._id || e.invoiceId}`} className="badge badge-success">{e.invoiceId.invoiceNumber || 'Billed'}</Link>
                        : e.billable ? <span className="badge badge-warning">Unbilled</span> : <span className="badge badge-neutral">Non-billable</span>}
                    </td>
                    <td>{!e.invoiceId && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(e)} aria-label="Delete entry"><RiDeleteBinLine /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvoice && (
        <InvoiceModal
          matter={matter}
          entries={selected.size ? unbilled.filter((e) => selected.has(e._id)) : unbilled}
          onClose={() => setShowInvoice(false)}
          onDone={() => { setShowInvoice(false); setSelected(new Set()); load(); onChanged(); }}
        />
      )}
    </div>
  );
}

function InvoiceModal({ matter, entries, onClose, onDone }) {
  const cur = matter.billing?.currency || 'NGN';
  const [taxRate, setTaxRate] = useState('');
  const [dueInDays, setDueInDays] = useState(14);
  const [applyTrust, setApplyTrust] = useState(matter.trustBalance > 0);
  const [includeFlatFee, setIncludeFlatFee] = useState(matter.billing?.method === 'flat_fee' && matter.billing?.flatFee > 0);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const subtotal = entries.reduce((s, e) => s + e.amount, 0) + (includeFlatFee ? Number(matter.billing.flatFee || 0) : 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const total = subtotal + tax;
  const fromTrust = applyTrust ? Math.min(matter.trustBalance, total) : 0;

  async function create() {
    setSaving(true);
    try {
      const { data } = await matterService.invoice(matter._id, {
        entryIds: entries.map((e) => e._id), taxRate: Number(taxRate) || 0, dueInDays: Number(dueInDays), applyTrust, includeFlatFee,
      });
      const { invoice, trustApplied } = data.data;
      toast.success(`Invoice ${invoice.invoiceNumber} created${trustApplied ? `, ${money(trustApplied, cur)} paid from trust` : ''}`);
      onDone();
      navigate(`/invoices?open=${invoice._id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not create invoice'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create invoice</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <p className="cell-sub">Bills {entries.length} unbilled entr{entries.length === 1 ? 'y' : 'ies'} to {matter.client?.name}. The invoice opens as a draft you can review before sending.</p>
          {matter.billing?.method === 'flat_fee' && matter.billing?.flatFee > 0 && (
            <label className="mt-check"><input type="checkbox" checked={includeFlatFee} onChange={(e) => setIncludeFlatFee(e.target.checked)} /> Include flat fee ({money(matter.billing.flatFee, cur)})</label>
          )}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tax / VAT %</label>
              <input className="form-input" type="number" min="0" max="100" step="any" placeholder="e.g. 7.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Due in (days)</label>
              <input className="form-input" type="number" min="0" max="365" value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} />
            </div>
          </div>
          {matter.trustBalance > 0 && (
            <label className="mt-check">
              <input type="checkbox" checked={applyTrust} onChange={(e) => setApplyTrust(e.target.checked)} />
              Pay from client trust (available {money(matter.trustBalance, cur)})
            </label>
          )}
          <div className="mt-totals">
            <div><span>Subtotal</span><span>{money(subtotal, cur)}</span></div>
            {tax > 0 && <div><span>Tax</span><span>{money(tax, cur)}</span></div>}
            <div className="grand"><span>Total</span><span>{money(total, cur)}</span></div>
            {fromTrust > 0 && <div><span>Paid from trust</span><span>−{money(fromTrust, cur)}</span></div>}
            {fromTrust > 0 && <div className="grand"><span>Balance due</span><span>{money(total - fromTrust, cur)}</span></div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create invoice'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Key dates ──────────────────────────────────────────────────────────────
function DatesTab({ matter, onChanged }) {
  const [form, setForm] = useState({ title: '', type: 'hearing', date: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const dates = [...(matter.keyDates || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = dates.filter((d) => !d.done);
  const past = dates.filter((d) => d.done);

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await matterService.addKeyDate(matter._id, { ...form, date: new Date(form.date).toISOString() });
      setForm({ title: '', type: 'hearing', date: '', location: '', notes: '' });
      toast.success('Date added. The team gets reminders 7 days and 1 day before.');
      onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not add date'); }
    finally { setSaving(false); }
  }
  async function markDone(d) {
    try { await matterService.updateKeyDate(matter._id, d._id, { done: !d.done }); onChanged(); }
    catch { toast.error('Could not update'); }
  }
  async function remove(d) {
    if (!confirm(`Remove “${d.title}”?`)) return;
    try { await matterService.deleteKeyDate(matter._id, d._id); onChanged(); }
    catch { toast.error('Could not remove'); }
  }

  const DateRow = ({ d }) => {
    const n = daysUntil(d.date);
    const urgent = !d.done && n <= 3;
    return (
      <li className={`mt-date ${d.done ? 'done' : ''} ${urgent ? 'urgent' : ''} ${!d.done && n < 0 ? 'missed' : ''}`}>
        <div className="mt-date-when">
          <strong>{fmtDate(d.date)}</strong>
          <span>{new Date(d.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="mt-date-body">
          <div><span className="badge badge-neutral">{KEY_DATE_TYPES[d.type]}</span> <strong>{d.title}</strong></div>
          <div className="cell-sub">{relativeDay(d.date)}{d.location && ` · ${d.location}`}</div>
          {d.notes && <div className="cell-sub">{d.notes}</div>}
        </div>
        <div className="mt-date-actions">
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markDone(d)} title={d.done ? 'Mark not done' : 'Mark done'} aria-label="Toggle done"><RiCheckLine /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(d)} aria-label="Remove date"><RiDeleteBinLine /></button>
        </div>
      </li>
    );
  };

  return (
    <div className="mt-stack">
      <form className="card card-pad mt-date-form" onSubmit={add}>
        <select className="form-input form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Type">
          {Object.entries(KEY_DATE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="form-input" required placeholder="e.g. Hearing of motion on notice" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
        <input className="form-input" type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Date and time" />
        <input className="form-input" placeholder="Courtroom / venue" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} aria-label="Location" />
        <button className="btn btn-primary" disabled={saving}><RiAddLine /> Add date</button>
      </form>
      <div className="card card-pad">
        <h3 className="mt-card-title">Upcoming</h3>
        {upcoming.length ? <ul className="mt-dates">{upcoming.map((d) => <DateRow key={d._id} d={d} />)}</ul> : <p className="cell-sub">No upcoming dates.</p>}
        {past.length > 0 && (<><h3 className="mt-card-title" style={{ marginTop: 20 }}>Done</h3><ul className="mt-dates">{past.map((d) => <DateRow key={d._id} d={d} />)}</ul></>)}
      </div>
    </div>
  );
}

// ── Trust account ──────────────────────────────────────────────────────────
const TRUST_LABEL = { deposit: 'Deposit', invoice_payment: 'Applied to invoice', disbursement: 'Disbursement', refund: 'Refund to client' };

function TrustTab({ matter, onChanged }) {
  const cur = matter.billing?.currency || 'NGN';
  const [ledger, setLedger] = useState([]);
  const [form, setForm] = useState({ type: 'deposit', amount: '', reference: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await matterService.getTrust(matter._id); setLedger(data.data.ledger); }
    catch { toast.error('Failed to load trust ledger'); }
  }, [matter._id]);
  useEffect(() => { load(); }, [load]);

  async function post(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await matterService.addTrust(matter._id, { ...form, amount: Number(form.amount) });
      setForm({ type: 'deposit', amount: '', reference: '', description: '' });
      toast.success('Recorded in the trust ledger');
      load(); onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not record transaction'); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-stack">
      <div className="card card-pad">
        <p className="cell-sub" style={{ marginBottom: 12 }}>
          Client money held for this matter. It isn't revenue until it's applied to an invoice. The ledger can't be edited
          and can never go below zero. To correct a mistake, record a reversing entry.
        </p>
        <form className="mt-trust-form" onSubmit={post}>
          <select className="form-input form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Transaction type">
            <option value="deposit">Deposit (money in)</option>
            <option value="disbursement">Disbursement (paid for client)</option>
            <option value="refund">Refund to client</option>
          </select>
          <input className="form-input" type="number" min="0.01" step="any" required placeholder={`Amount (${cur})`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label="Amount" />
          <input className="form-input" placeholder="Bank / transfer reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} aria-label="Reference" />
          <input className="form-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Description" />
          <button className="btn btn-primary" disabled={saving}>Record</button>
        </form>
      </div>
      <div className="card">
        <div className="mt-table-head"><strong>Ledger</strong><span>Balance: <strong>{money(matter.trustBalance, cur)}</strong></span></div>
        {ledger.length === 0 ? <div className="empty-state"><p>No trust transactions yet.</p></div> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th>Details</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {ledger.map((t) => (
                  <tr key={t._id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{TRUST_LABEL[t.type]}</td>
                    <td>
                      {t.description || '—'}
                      {t.reference && <span className="cell-sub">Ref: {t.reference}</span>}
                      {t.invoiceId && <span className="cell-sub">Invoice {t.invoiceId.invoiceNumber}</span>}
                    </td>
                    <td className="num">{t.type === 'deposit' ? money(t.amount, cur) : ''}</td>
                    <td className="num">{t.type !== 'deposit' ? money(t.amount, cur) : ''}</td>
                    <td className="num">{money(t.balanceAfter, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────
const INV_BADGE = { paid: 'success', partial: 'warning', overdue: 'danger', cancelled: 'neutral', draft: 'neutral', sent: 'info', viewed: 'info' };

function InvoicesTab({ matter }) {
  const invoices = matter.invoices || [];
  if (!invoices.length) {
    return <div className="card"><div className="empty-state"><h3>No invoices yet</h3><p>Create one from the Time & expenses tab. Unbilled entries are pulled in automatically.</p></div></div>;
  }
  return (
    <div className="card">
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i._id}>
                <td><Link to={`/invoices?open=${i._id}`}>{i.invoiceNumber}</Link></td>
                <td>{fmtDate(i.issuedAt)}</td>
                <td>{fmtDate(i.dueAt)}</td>
                <td className="num">{money(i.total, i.currency)}</td>
                <td><span className={`badge badge-${INV_BADGE[i.status] || 'neutral'}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
