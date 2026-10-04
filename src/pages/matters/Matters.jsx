import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiScales3Line, RiSearchLine, RiCalendarEventLine, RiShieldCheckLine,
  RiAlertLine, RiCloseLine, RiDeleteBinLine, RiLoader4Line,
} from 'react-icons/ri';
import { matterService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  PRACTICE_AREAS, MATTER_STATUS, BILLING_METHODS, CURRENCIES, money, hours, fmtDate, relativeDay, daysUntil,
} from './matterConstants';
import './Matters.css';

export default function Matters() {
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');
  const [area, setArea] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await matterService.getAll({ status: status || undefined, practiceArea: area || undefined, search: search || undefined });
      setMatters(data.data);
      setStatusCounts(Object.fromEntries((data.statusCounts || []).map((s) => [s._id, s.count])));
    } catch { toast.error('Failed to load matters'); }
    finally { setLoading(false); }
  }, [status, area, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const total = Object.values(statusCounts).reduce((s, n) => s + n, 0);

  return (
    <div className="matters-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiScales3Line style={{ verticalAlign: '-3px' }} /> Matters</h1>
          <p>Cases and client files: deadlines, billable time, trust money and invoices, all in one place.</p>
        </div>
        <div className="mt-header-actions">
          <Link to="/matters/calendar" className="btn btn-secondary"><RiCalendarEventLine /> Court calendar</Link>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><RiAddLine /> New matter</button>
        </div>
      </div>

      <div className="mt-status-tabs" role="tablist">
        {[['', 'All', total], ...Object.entries(MATTER_STATUS).map(([k, v]) => [k, v.label, statusCounts[k] || 0])].map(([k, label, n]) => (
          <button key={k || 'all'} role="tab" aria-selected={status === k} className={`mt-tab ${status === k ? 'active' : ''}`} onClick={() => setStatus(k)}>
            {label} <span className="mt-tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mt-filters">
          <div className="mt-search">
            <RiSearchLine />
            <input placeholder="Search title, client, suit number, opposing party…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input form-select" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Practice area">
            <option value="">All practice areas</option>
            {Object.entries(PRACTICE_AREAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="mt-loading"><RiLoader4Line className="spin" /> Loading matters…</div>
        ) : matters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiScales3Line /></div>
            <h3>{search || area || status ? 'No matching matters' : 'No matters yet'}</h3>
            <p>Open a matter for each case or client file to track deadlines, time, trust money and billing.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><RiAddLine /> New matter</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table mt-table">
              <thead>
                <tr><th>Matter</th><th>Client</th><th>Next date</th><th className="num">Unbilled</th><th className="num">Trust</th><th>Status</th></tr>
              </thead>
              <tbody>
                {matters.map((m) => {
                  const cur = m.billing?.currency || 'NGN';
                  const unbilled = (m.totals?.unbilledTime || 0) + (m.totals?.unbilledExpenses || 0);
                  const soon = m.nextDate && daysUntil(m.nextDate.date) <= 3;
                  return (
                    <tr key={m._id} className="mt-row" onClick={() => navigate(`/matters/${m._id}`)}>
                      <td>
                        <div className="mt-title">{m.title}</div>
                        <div className="cell-sub">
                          {m.matterNumber} · {PRACTICE_AREAS[m.practiceArea] || 'Other'}
                          {m.court?.suitNumber && <> · {m.court.suitNumber}</>}
                        </div>
                      </td>
                      <td>{m.client?.name}</td>
                      <td>
                        {m.nextDate ? (
                          <span className={soon ? 'mt-soon' : ''}>
                            {soon && <RiAlertLine />} {m.nextDate.title}
                            <span className="cell-sub">{fmtDate(m.nextDate.date)} · {relativeDay(m.nextDate.date)}</span>
                          </span>
                        ) : <span className="cell-sub">—</span>}
                      </td>
                      <td className="num">
                        {money(unbilled, cur)}
                        {m.totals?.unbilledMinutes > 0 && <span className="cell-sub">{hours(m.totals.unbilledMinutes)}</span>}
                      </td>
                      <td className="num">{money(m.trustBalance, cur)}</td>
                      <td><span className={`badge badge-${MATTER_STATUS[m.status]?.badge || 'neutral'}`}>{MATTER_STATUS[m.status]?.label || m.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <MatterFormModal onClose={() => setShowNew(false)} onSaved={(m) => navigate(`/matters/${m._id}`)} />}
    </div>
  );
}

const EMPTY = {
  title: '', description: '', practiceArea: 'litigation',
  client: { name: '', type: 'individual', email: '', phone: '', address: '' },
  court: { name: '', suitNumber: '', judge: '' },
  opposingParties: [{ name: '', role: '', counsel: '' }],
  billing: { method: 'hourly', hourlyRate: '', flatFee: '', contingencyPercent: '', currency: '' },
};

function ConflictResults({ hits }) {
  if (!hits) return null;
  if (!hits.length) return <div className="mt-conflict clear"><RiShieldCheckLine /> No conflicts found.</div>;
  return (
    <div className="mt-conflict warn">
      <strong><RiAlertLine /> {hits.length} possible match{hits.length > 1 ? 'es' : ''}</strong>
      <ul>
        {hits.map((h, i) => (
          <li key={i} className={`sev-${h.severity}`}>
            “{h.searched}” ({h.searchedAs}) appears as <b>{h.foundAs}</b>
            {h.source === 'matter' ? <> in <Link to={`/matters/${h.matterId}`} target="_blank">{h.matterNumber} — {h.title}</Link></> : <> in your {h.source}s{h.email ? ` (${h.email})` : ''}</>}
            {h.severity === 'high' && <span className="badge badge-danger">Adverse</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Prefill from an existing matter (edit) — every field the form shows.
function fromMatter(m) {
  const s = (v) => (v == null ? '' : v);
  return {
    title: s(m.title), description: s(m.description), practiceArea: m.practiceArea || 'other',
    client: { name: s(m.client?.name), type: m.client?.type || 'individual', email: s(m.client?.email), phone: s(m.client?.phone), address: s(m.client?.address) },
    court: { name: s(m.court?.name), suitNumber: s(m.court?.suitNumber), judge: s(m.court?.judge) },
    opposingParties: (m.opposingParties || []).map((p) => ({ name: s(p.name), role: s(p.role), counsel: s(p.counsel) })),
    billing: {
      method: m.billing?.method || 'hourly', hourlyRate: s(m.billing?.hourlyRate), flatFee: s(m.billing?.flatFee),
      contingencyPercent: s(m.billing?.contingencyPercent), currency: m.billing?.currency || 'NGN',
    },
  };
}

// New matter, or edit one (pass `matter`). Opening a new matter runs the
// conflict check server-side; a potential conflict needs a recorded reason.
export function MatterFormModal({ matter, onClose, onSaved }) {
  const { company } = useAuth();
  const editing = Boolean(matter);
  const [form, setForm] = useState(() => (editing ? fromMatter(matter)
    : { ...EMPTY, billing: { ...EMPTY.billing, currency: company?.defaultCurrency || 'NGN' } }));
  const [hits, setHits] = useState(null);
  const [needsWaiver, setNeedsWaiver] = useState(false);
  const [waiverNotes, setWaiverNotes] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (path, value) => setForm((f) => {
    const [a, b] = path.split('.');
    return b ? { ...f, [a]: { ...f[a], [b]: value } } : { ...f, [a]: value };
  });
  const setParty = (i, k, v) => setForm((f) => ({ ...f, opposingParties: f.opposingParties.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));

  // Names changed → a previous check no longer applies.
  useEffect(() => { setHits(null); setNeedsWaiver(false); }, [form.client.name, form.opposingParties]);

  function payload() {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    return {
      ...form,
      opposingParties: form.opposingParties.filter((p) => p.name.trim()),
      billing: {
        ...form.billing,
        hourlyRate: num(form.billing.hourlyRate),
        flatFee: num(form.billing.flatFee),
        contingencyPercent: num(form.billing.contingencyPercent),
      },
    };
  }

  async function check() {
    if (!form.client.name.trim()) return toast.error('Enter the client name first');
    setChecking(true);
    try {
      const { data } = await matterService.conflictCheck({ ...payload(), excludeMatterId: matter?._id });
      setHits(data.data.hits);
    } catch { toast.error('Conflict check failed'); }
    finally { setChecking(false); }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { data } = await matterService.update(matter._id, payload());
        toast.success('Matter updated');
        onSaved(data.data);
        return;
      }
      const { data } = await matterService.create({ ...payload(), conflictWaived: needsWaiver, conflictNotes: waiverNotes });
      toast.success(`Matter ${data.data.matterNumber} opened`);
      onSaved(data.data);
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.code === 'CONFLICT_CHECK') {
        setHits(err.response.data.data.hits);
        setNeedsWaiver(true);
        toast.error('Possible conflict of interest. Review it before opening the matter.');
      } else {
        toast.error(err.response?.data?.message || 'Could not open matter');
      }
    } finally { setSaving(false); }
  }

  const bm = form.billing.method;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal mt-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>{editing ? `Edit ${matter.matterNumber}` : 'New matter'}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Matter title *</label>
            <input className="form-input" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Adeyemi v. Lagos Properties Ltd" />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Practice area</label>
              <select className="form-input form-select" value={form.practiceArea} onChange={(e) => set('practiceArea', e.target.value)}>
                {Object.entries(PRACTICE_AREAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Client type</label>
              <select className="form-input form-select" value={form.client.type} onChange={(e) => set('client.type', e.target.value)}>
                <option value="individual">Individual</option>
                <option value="organization">Organisation</option>
              </select>
            </div>
          </div>

          <h4 className="mt-section">Client</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Client name *</label>
              <input className="form-input" required value={form.client.name} onChange={(e) => set('client.name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="form-hint">(for invoices)</span></label>
              <input className="form-input" type="email" value={form.client.email} onChange={(e) => set('client.email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.client.phone} onChange={(e) => set('client.phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.client.address} onChange={(e) => set('client.address', e.target.value)} />
            </div>
          </div>

          <h4 className="mt-section">Opposing parties</h4>
          {form.opposingParties.map((p, i) => (
            <div key={i} className="mt-party-row">
              <input className="form-input" placeholder="Name" value={p.name} onChange={(e) => setParty(i, 'name', e.target.value)} />
              <input className="form-input" placeholder="Role (e.g. Defendant)" value={p.role} onChange={(e) => setParty(i, 'role', e.target.value)} />
              <input className="form-input" placeholder="Their counsel" value={p.counsel} onChange={(e) => setParty(i, 'counsel', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Remove party"
                onClick={() => setForm((f) => ({ ...f, opposingParties: f.opposingParties.filter((_, j) => j !== i) }))}><RiDeleteBinLine /></button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm((f) => ({ ...f, opposingParties: [...f.opposingParties, { name: '', role: '', counsel: '' }] }))}>
            <RiAddLine /> Add party
          </button>

          <div className="mt-conflict-bar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={check} disabled={checking}>
              {checking ? <RiLoader4Line className="spin" /> : <RiShieldCheckLine />} Run conflict check
            </button>
            {!editing && <span className="form-hint">Runs automatically when you open the matter.</span>}
          </div>
          <ConflictResults hits={hits} />
          {needsWaiver && (
            <div className="form-group">
              <label className="form-label">Reason for proceeding *</label>
              <textarea className="form-input form-textarea" required rows={2} value={waiverNotes} onChange={(e) => setWaiverNotes(e.target.value)}
                placeholder="e.g. Different person with the same name. Client consent obtained in writing." />
            </div>
          )}

          <h4 className="mt-section">Court</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Court</label>
              <input className="form-input" value={form.court.name} onChange={(e) => set('court.name', e.target.value)} placeholder="e.g. High Court of Lagos State" />
            </div>
            <div className="form-group">
              <label className="form-label">Suit / case number</label>
              <input className="form-input" value={form.court.suitNumber} onChange={(e) => set('court.suitNumber', e.target.value)} placeholder="e.g. LD/1234/2026" />
            </div>
          </div>

          <h4 className="mt-section">Billing</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-input form-select" value={bm} onChange={(e) => set('billing.method', e.target.value)}>
                {Object.entries(BILLING_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input form-select" value={form.billing.currency} onChange={(e) => set('billing.currency', e.target.value)}>
                {[...new Set([form.billing.currency, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {['hourly', 'retainer'].includes(bm) && (
              <div className="form-group">
                <label className="form-label">Hourly rate</label>
                <input className="form-input" type="number" min="0" step="any" value={form.billing.hourlyRate} onChange={(e) => set('billing.hourlyRate', e.target.value)} />
              </div>
            )}
            {bm === 'flat_fee' && (
              <div className="form-group">
                <label className="form-label">Flat fee</label>
                <input className="form-input" type="number" min="0" step="any" value={form.billing.flatFee} onChange={(e) => set('billing.flatFee', e.target.value)} />
              </div>
            )}
            {bm === 'contingency' && (
              <div className="form-group">
                <label className="form-label">Contingency %</label>
                <input className="form-input" type="number" min="0" max="100" step="any" value={form.billing.contingencyPercent} onChange={(e) => set('billing.contingencyPercent', e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn ${needsWaiver ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : needsWaiver ? 'Open matter anyway' : 'Open matter'}
          </button>
        </div>
      </form>
    </div>
  );
}
