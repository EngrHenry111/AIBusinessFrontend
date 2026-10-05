import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import {
  RiMoneyDollarCircleLine, RiAddLine, RiLoader4Line, RiSearchLine, RiDownload2Line,
  RiPrinterLine, RiCloseLine, RiEditLine, RiDeleteBinLine, RiFlashlightLine, RiLinkM, RiNotification3Line,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import useSchoolLive from './useSchoolLive';
import { RecordPaymentModal, ReminderModal, Modal, Field, useClasses } from './SchoolForms';
import {
  TERMS, BILL_STATUS, PAYMENT_METHODS, money, fmtDate, fmtDateTime, toInputDate, fullName, errMsg, publicLink,
} from './schoolConstants';
import './School.css';

const TABS = [['overview', 'Overview'], ['structures', 'Fee structures'], ['bills', 'Bills'], ['payments', 'Payments'], ['debtors', 'Debtors']];

function downloadCsv(rows, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

export default function Fees() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [classes] = useClasses();
  const [settings, setSettings] = useState(null);
  const [period, setPeriod] = useState(null); // { session, term }
  const [recording, setRecording] = useState(params.get('record') === '1');
  const [tick, setTick] = useState(0); // bumps on live updates → tabs reload

  useEffect(() => {
    schoolService.getSettings().then(({ data }) => {
      setSettings(data.data);
      setPeriod({ session: data.data.currentSession, term: data.data.currentTerm });
    }).catch((e) => toast.error(errMsg(e)));
  }, []);
  useSchoolLive((evt) => {
    // Online payments are announced app-wide by the top bar.
    if (evt.kind === 'payment' && evt.message && !evt.voided && !/online/.test(evt.message)) toast.success(evt.message, { icon: '💰' });
    setTick((t) => t + 1);
  }, ['payment', 'fees', 'students']);

  const setTab = (t) => { const p = new URLSearchParams(params); p.set('tab', t); p.delete('record'); setParams(p); };

  if (!settings || !period) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;
  const sessions = [...new Set([settings.currentSession, ...[1, 2].map((i) => { const y = Number(settings.currentSession.slice(0, 4)) - i; return `${y}/${y + 1}`; })])];

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiMoneyDollarCircleLine style={{ verticalAlign: '-3px' }} /> School fees <span className="sc-live" style={{ marginLeft: 8, verticalAlign: 'middle' }}>Live</span></h1>
          <p>Bill each term, take payments at the desk or online, and see who still owes — all updating as payments land.</p>
        </div>
        <div className="sc-actions">
          <select className="form-input form-select" value={period.session} onChange={(e) => setPeriod({ ...period, session: e.target.value })} aria-label="Session">
            {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input form-select" value={period.term} onChange={(e) => setPeriod({ ...period, term: e.target.value })} aria-label="Term">
            {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(publicLink(settings.slug, 'portal')); toast.success('Parent portal link copied'); }}><RiLinkM /> Parent portal link</button>
          <button className="btn btn-primary" onClick={() => setRecording(true)}><RiAddLine /> Record payment</button>
        </div>
      </div>

      <div className="sc-tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'overview' && <Overview period={period} tick={tick} />}
      {tab === 'structures' && <Structures period={period} classes={classes} tick={tick} />}
      {tab === 'bills' && <Bills period={period} classes={classes} tick={tick} />}
      {tab === 'payments' && <Payments tick={tick} />}
      {tab === 'debtors' && <Debtors period={period} classes={classes} tick={tick} />}

      {recording && <RecordPaymentModal onClose={() => setRecording(false)} onSaved={() => setRecording(false)} />}
    </div>
  );
}

function Overview({ period, tick }) {
  const [data, setData] = useState(null);
  useEffect(() => { schoolService.feeSummary(period).then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e))); }, [period, tick]);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const t = data.byClass.reduce((a, c) => ({ expected: a.expected + c.expected, collected: a.collected + c.collected, outstanding: a.outstanding + c.outstanding }), { expected: 0, collected: 0, outstanding: 0 });
  const pct = t.expected ? Math.round((t.collected / t.expected) * 100) : 0;
  return (
    <>
      <div className="sc-stats">
        <div className="stat-card"><div className="stat-label">Expected</div><div className="stat-value">{money(t.expected)}</div></div>
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value">{money(t.collected)}</div><div className="sc-progress"><div style={{ width: `${Math.min(100, pct)}%` }} /></div><div className="cell-sub">{pct}% collected</div></div>
        <div className="stat-card"><div className="stat-label">Outstanding</div><div className="stat-value sc-owing">{money(t.outstanding)}</div></div>
        <div className="stat-card"><div className="stat-label">By method</div>
          {data.byMethod.length === 0 ? <div className="cell-sub">No payments yet</div> : data.byMethod.map((m) => <div key={m._id} className="cell-sub" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{PAYMENT_METHODS[m._id]}</span><b style={{ color: 'var(--text-primary)' }}>{money(m.amount)}</b></div>)}
        </div>
      </div>
      <div className="card">
        {data.byClass.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><RiMoneyDollarCircleLine /></div><h3>No bills for {period.session} {TERMS[period.term]}</h3><p>Create a fee structure and generate bills for your classes.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Class</th><th className="num">Students billed</th><th className="num">Fully paid</th><th className="num">Expected</th><th className="num">Collected</th><th className="num">Outstanding</th><th style={{ width: 140 }}>Progress</th></tr></thead>
              <tbody>
                {data.byClass.map((c) => {
                  const p = c.expected ? Math.round((c.collected / c.expected) * 100) : 0;
                  return (
                    <tr key={c._id || 'none'}>
                      <td className="sc-strong">{c.name || 'No class'}</td>
                      <td className="num">{c.students}</td>
                      <td className="num">{c.paidBills} / {c.bills}</td>
                      <td className="num">{money(c.expected)}</td>
                      <td className="num">{money(c.collected)}</td>
                      <td className="num">{c.outstanding > 0 ? <span className="sc-owing">{money(c.outstanding)}</span> : '—'}</td>
                      <td><div className="sc-progress" title={`${p}%`}><div style={{ width: `${Math.min(100, p)}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Structures({ period, classes, tick }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => schoolService.getStructures(period).then(({ data }) => setRows(data.data)).catch((e) => toast.error(errMsg(e))), [period]);
  useEffect(() => { load(); }, [load, tick]);

  async function generate(s) {
    try { const { data } = await schoolService.generateBills(s._id); toast.success(data.message); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  if (!rows) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="card">
      <div className="sc-filters" style={{ justifyContent: 'space-between' }}>
        <span className="cell-sub" style={{ margin: 0 }}>What each class pays for {period.session} {TERMS[period.term]}. Generating creates one bill per active student; it's safe to run again after new students join.</span>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><RiAddLine /> New fee structure</button>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><RiMoneyDollarCircleLine /></div><h3>No fee structures for this term</h3><p>e.g. "JSS fees — First term": Tuition ₦120,000, Development levy ₦10,000, PTA ₦5,000.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Fee structure</th><th>Classes</th><th className="num">Per student</th><th className="num">Bills</th><th className="num">Collected</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id}>
                  <td><div className="sc-strong">{s.name}</div><span className="cell-sub">{s.items.map((i) => i.name).join(', ')}{s.dueDate && ` · due ${fmtDate(s.dueDate)}`}{!s.active && ' · inactive'}</span></td>
                  <td>{s.classIds.length ? s.classIds.map((c) => c.name).join(', ') : 'All classes'}</td>
                  <td className="num">{money(s.total)}</td>
                  <td className="num">{s.stats.bills}<span className="cell-sub">{s.stats.paid} paid</span></td>
                  <td className="num">{money(s.stats.collected)}<span className="cell-sub">of {money(s.stats.expected)}</span></td>
                  <td className="num">
                    <div className="sc-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" disabled={!s.active} onClick={() => generate(s)}><RiFlashlightLine /> Generate bills</button>
                      <button className="btn btn-ghost btn-sm" aria-label="Edit" onClick={() => setEditing(s)}><RiEditLine /></button>
                      <button className="btn btn-ghost btn-sm" aria-label="Delete" onClick={async () => {
                        if (!window.confirm(`Delete "${s.name}" and its unpaid bills?`)) return;
                        try { await schoolService.deleteStructure(s._id); toast.success('Deleted'); load(); } catch (e) { toast.error(errMsg(e)); }
                      }}><RiDeleteBinLine /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <StructureModal structure={editing === 'new' ? null : editing} period={period} classes={classes} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StructureModal({ structure, period, classes, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: structure?.name || '', session: structure?.session || period.session, term: structure?.term || period.term,
    classIds: (structure?.classIds || []).map((c) => c._id || c), dueDate: toInputDate(structure?.dueDate),
    items: structure?.items?.map((i) => ({ name: i.name, amount: String(i.amount) })) || [{ name: 'Tuition', amount: '' }],
    autoApplyToNewStudents: structure?.autoApplyToNewStudents ?? true, active: structure?.active ?? true, generateNow: !structure,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const total = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const toggleClass = (id) => set('classIds', form.classIds.includes(id) ? form.classIds.filter((x) => x !== id) : [...form.classIds, id]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, items: form.items.map((i) => ({ name: i.name, amount: Number(i.amount) })), dueDate: form.dueDate || null };
    try {
      if (structure) { await schoolService.updateStructure(structure._id, payload); toast.success('Saved — changes apply to bills generated from now on'); }
      else { const { data } = await schoolService.createStructure(payload); toast.success(form.generateNow ? `Created — ${data.billed} bill(s) generated` : 'Fee structure created'); }
      onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <Modal title={structure ? `Edit ${structure.name}` : 'New fee structure'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || total <= 0}>{busy ? 'Saving…' : `Save · ${money(total)} per student`}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-grid-3">
          <Field label="Name *"><input className="form-input" required placeholder="JSS fees — First term" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Session"><input className="form-input" pattern="\d{4}/\d{4}" value={form.session} onChange={(e) => set('session', e.target.value)} /></Field>
          <Field label="Term">
            <select className="form-input form-select" value={form.term} onChange={(e) => set('term', e.target.value)}>
              {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Applies to" hint="(none selected = every class)">
          <div className="sc-chips">
            {classes.map((c) => <button type="button" key={c._id} className={`sc-chip ${form.classIds.includes(c._id) ? 'on' : ''}`} onClick={() => toggleClass(c._id)}>{c.name}</button>)}
          </div>
        </Field>
        <div>
          <label className="form-label">Fee items</label>
          {form.items.map((it, i) => (
            <div className="sc-item-row" key={i}>
              <input className="form-input" required placeholder="Item (Tuition, PTA levy, Uniform…)" value={it.name} onChange={(e) => set('items', form.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="form-input" type="number" min="0" step="0.01" required placeholder="Amount (₦)" value={it.amount} onChange={(e) => set('items', form.items.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
              <button type="button" className="btn btn-ghost btn-icon" disabled={form.items.length === 1} onClick={() => set('items', form.items.filter((_, j) => j !== i))} aria-label="Remove item"><RiCloseLine /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('items', [...form.items, { name: '', amount: '' }])}><RiAddLine /> Add item</button>
        </div>
        <div className="form-grid-2">
          <Field label="Due date"><input className="form-input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        </div>
        <label className="sc-check"><input type="checkbox" checked={form.autoApplyToNewStudents} onChange={(e) => set('autoApplyToNewStudents', e.target.checked)} /> Bill students who join these classes later this term automatically</label>
        <label className="sc-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
        {!structure && <label className="sc-check"><input type="checkbox" checked={form.generateNow} onChange={(e) => set('generateNow', e.target.checked)} /> Generate bills for current students now</label>}
        {structure && <div className="sc-note">Editing items changes bills generated from now on. Bills already issued keep their amounts — adjust individual bills with a discount.</div>}
      </div>
    </Modal>
  );
}

function Bills({ period, classes, tick }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [totals, setTotals] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: 'outstanding', classId: '', search: '' });
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(null);

  const load = useCallback(() => schoolService.getBills({ ...period, ...filters, classId: filters.classId || undefined, search: filters.search || undefined, status: filters.status || undefined, page })
    .then(({ data }) => { setRows(data.data); setTotals(data.totals); setPagination(data.pagination); })
    .catch((e) => toast.error(errMsg(e))), [period, filters, page]);
  useEffect(() => { const t = setTimeout(load, filters.search ? 300 : 0); return () => clearTimeout(t); }, [load, tick, filters.search]);
  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input placeholder="Student or bill number…" value={filters.search} onChange={(e) => setF('search', e.target.value)} /></div>
        <select className="form-input form-select" value={filters.status} onChange={(e) => setF('status', e.target.value)} aria-label="Status">
          <option value="outstanding">Outstanding</option><option value="">All</option>
          {Object.entries(BILL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="form-input form-select" value={filters.classId} onChange={(e) => setF('classId', e.target.value)} aria-label="Class">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      {!rows ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No bills match.</p> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Student</th><th>Bill</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b._id}>
                  <td><Link to={`/school/students/${b.studentId?._id}`} className="sc-strong">{fullName(b.studentId)}</Link><span className="cell-sub">{b.studentId?.admissionNumber} · {b.classId?.name || '—'}</span></td>
                  <td>{b.title}<span className="cell-sub">{b.billNumber}{b.discount > 0 && ` · −${money(b.discount)}`}</span></td>
                  <td className="num">{money(b.total)}</td>
                  <td className="num">{money(b.amountPaid)}</td>
                  <td className="num">{b.balance > 0 ? <span className="sc-owing">{money(b.balance)}</span> : '—'}</td>
                  <td><span className={`badge badge-${BILL_STATUS[b.status]?.badge}`}>{BILL_STATUS[b.status]?.label}</span></td>
                  <td className="num">
                    {['unpaid', 'partial'].includes(b.status)
                      ? <button className="btn btn-primary btn-sm" onClick={() => setPaying(b)}>Pay</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/school/students/${b.studentId?._id}`)}>View</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="sc-table-foot">
        <span>{pagination.total} bill(s) · expected {money(totals.expected)} · collected {money(totals.collected)} · outstanding <b className="sc-owing">{money(totals.outstanding)}</b></span>
        {pagination.pages > 1 && (
          <div className="sc-actions">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>{page}/{pagination.pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
      {paying && <RecordPaymentModal bill={paying} student={paying.studentId} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />}
    </div>
  );
}

function Payments({ tick }) {
  const [rows, setRows] = useState(null);
  const [totals, setTotals] = useState({ amount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filters, setFilters] = useState({ from: '', to: '', method: '', search: '' });
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState(null);
  const query = { ...filters, from: filters.from || undefined, to: filters.to || undefined, method: filters.method || undefined, search: filters.search || undefined };

  const load = useCallback(() => schoolService.getPayments({ ...query, page, includeVoided: true })
    .then(({ data }) => {
      setRows((prev) => { if (prev?.length && data.data[0] && data.data[0]._id !== prev[0]._id) setFlash(data.data[0]._id); return data.data; });
      setTotals(data.totals); setPagination(data.pagination);
    })
    .catch((e) => toast.error(errMsg(e))), [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, filters.search ? 300 : 0); return () => clearTimeout(t); }, [load, tick, filters.search]);
  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  async function exportCsv() {
    try {
      const { data } = await schoolService.getPayments({ ...query, limit: 200 });
      downloadCsv(data.data.map((p) => ({
        receipt: p.receiptNumber, date: new Date(p.paidAt).toISOString().slice(0, 10), student: fullName(p.studentId),
        admissionNumber: p.studentId?.admissionNumber, bill: p.billId?.title, session: p.billId?.session, term: p.billId?.term,
        method: PAYMENT_METHODS[p.method], reference: p.reference || '', amount: p.amount, recordedBy: p.recordedBy?.name || '',
      })), 'fee-payments.csv');
    } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input placeholder="Student, receipt or reference…" value={filters.search} onChange={(e) => setF('search', e.target.value)} /></div>
        <input className="form-input" type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} aria-label="From" />
        <input className="form-input" type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} aria-label="To" />
        <select className="form-input form-select" value={filters.method} onChange={(e) => setF('method', e.target.value)} aria-label="Method">
          <option value="">All methods</option>
          {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}><RiDownload2Line /> Export</button>
      </div>
      {!rows ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No payments match.</p> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Receipt</th><th>Student</th><th>For</th><th>Method</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p._id} className={`${p.voided ? 'sc-voided' : ''} ${flash === p._id ? 'sc-flash' : ''}`}>
                  <td><span className="sc-strong">{p.receiptNumber}</span><span className="cell-sub">{fmtDateTime(p.paidAt)}</span></td>
                  <td><Link to={`/school/students/${p.studentId?._id}`}>{fullName(p.studentId)}</Link><span className="cell-sub">{p.studentId?.admissionNumber}</span></td>
                  <td>{p.billId?.title}<span className="cell-sub">{p.billId?.session} {TERMS[p.billId?.term]}</span></td>
                  <td>{PAYMENT_METHODS[p.method]}<span className="cell-sub">{p.voided ? `Voided: ${p.voidReason}` : p.recordedBy?.name || (p.method === 'online' ? 'Parent' : '')}</span></td>
                  <td className="num sc-strong">{money(p.amount)}</td>
                  <td className="num"><Link to={`/school/receipts/${p._id}`} className="btn btn-ghost btn-sm" aria-label="Receipt"><RiPrinterLine /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="sc-table-foot">
        <span>{totals.count} payment(s) · <b>{money(totals.amount)}</b> received</span>
        {pagination.pages > 1 && (
          <div className="sc-actions">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>{page}/{pagination.pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Debtors({ period, classes, tick }) {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [classId, setClassId] = useState('');
  const [remind, setRemind] = useState(null); // { classId } | { student }
  useEffect(() => {
    schoolService.getDebtors({ ...period, classId: classId || undefined })
      .then(({ data }) => { setRows(data.data); setTotal(data.totalOutstanding); })
      .catch((e) => toast.error(errMsg(e)));
  }, [period, classId, tick]);

  return (
    <div className="card">
      <div className="sc-filters">
        <select className="form-input form-select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto' }}>Total owed: <b className="sc-owing">{money(total)}</b></span>
        <button className="btn btn-primary btn-sm" disabled={!rows?.length} onClick={() => setRemind({ classId })}><RiNotification3Line /> Remind {classId ? 'this class' : 'all'}</button>
        <button className="btn btn-secondary btn-sm" disabled={!rows?.length} onClick={() => downloadCsv(rows.map((r) => ({
          admissionNumber: r.student.admissionNumber, student: fullName(r.student), class: r.className || '', billed: r.total, paid: r.paid, owing: r.balance,
          guardian: r.student.guardian?.name || '', phone: r.student.guardian?.phone || '', email: r.student.guardian?.email || '',
        })), `debtors-${period.session.replace('/', '-')}-${period.term}.csv`)}><RiDownload2Line /> Export</button>
      </div>
      {!rows ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? <div className="sc-note ok" style={{ margin: 16 }}>Nobody owes fees for {period.session} {TERMS[period.term]}.</div> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Student</th><th>Class</th><th>Parent / guardian</th><th className="num">Billed</th><th className="num">Paid</th><th className="num">Owing</th><th>Last reminded</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td><Link to={`/school/students/${r.student._id}`} className="sc-strong">{fullName(r.student)}</Link><span className="cell-sub">{r.student.admissionNumber}</span></td>
                  <td>{r.className || '—'}</td>
                  <td>{r.student.guardian?.name || '—'}<span className="cell-sub">{r.student.guardian?.phone && <a href={`tel:${r.student.guardian.phone}`}>{r.student.guardian.phone}</a>}</span></td>
                  <td className="num">{money(r.total)}</td>
                  <td className="num">{money(r.paid)}</td>
                  <td className="num sc-owing">{money(r.balance)}</td>
                  <td><span className="cell-sub" style={{ marginTop: 0 }}>{r.lastReminded ? fmtDateTime(r.lastReminded) : 'Never'}</span></td>
                  <td className="num"><button className="btn btn-ghost btn-sm" onClick={() => setRemind({ student: r.student })} title="Send a reminder to this parent"><RiNotification3Line /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {remind && (
        <ReminderModal
          classId={remind.classId}
          studentIds={remind.student ? [remind.student._id] : undefined}
          title={remind.student ? `Remind ${fullName(remind.student)}'s parent` : 'Send fee reminders'}
          onClose={() => setRemind(null)}
        />
      )}
    </div>
  );
}
