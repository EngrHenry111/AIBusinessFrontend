import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { createPortal } from 'react-dom';
import { leadService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../services/socket';
import { MANUAL_SOURCES, SOURCE_LABELS, AUTO_SOURCES, sourceLabel, formatMoney } from '../../constants/leads';
import {
  RiAddLine, RiSearchLine, RiRobot2Line, RiUserLine, RiMailLine, RiPhoneLine,
  RiDeleteBinLine, RiLoader4Line, RiUploadCloud2Line, RiCloseLine, RiArrowRightSLine,
  RiArrowLeftSLine, RiCheckLine, RiArrowRightLine, RiFileTextLine, RiFlashlightLine, RiAlarmWarningLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../../components/ui/Skeleton';
import './Leads.css';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STATUS_COLORS = { new: 'brand', contacted: 'info', qualified: 'warning', proposal: 'warning', negotiation: 'warning', won: 'success', lost: 'neutral' };

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'website', value: '', description: '' });
  const [sourceFilter, setSourceFilter] = useState('');
  const [showAutomation, setShowAutomation] = useState(false);
  const { user, company } = useAuth();
  const canManage = ['company_owner', 'manager', 'super_admin'].includes(user?.role);

  useEffect(() => { loadLeads(); }, [statusFilter]);

  // Leads captured from chat, WhatsApp, the store or the business card show
  // up here live. Bursts (several messages at once) are folded into one reload.
  const reloadTimer = useRef(null);
  useEffect(() => {
    const companyId = company?.id || company?._id;
    if (!companyId) return;
    const socket = connectSocket();
    socket.on('connect', () => socket.emit('join_company', companyId));
    socket.on('leads:update', (p) => {
      if (p?.created) toast.success('New lead captured automatically', { icon: '⚡' });
      clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => loadLeads({ quiet: true }), 800);
    });
    return () => { clearTimeout(reloadTimer.current); socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, company?._id]);

  async function loadLeads({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    try {
      const { data } = await leadService.getAll({ status: statusFilter || undefined, search: search || undefined });
      setLeads(data.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await leadService.create(form);
      setLeads(prev => [data.data, ...prev]);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', company: '', source: 'website', value: '', description: '' });
      toast.success('Lead created');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create lead'); }
  }

  async function handleAnalyze(id) {
    setAnalyzing(id);
    try {
      const { data } = await leadService.analyze(id);
      setLeads(prev => prev.map(l => l._id === id ? data.data : l));
      toast.success('Lead analyzed by AI');
    } catch { toast.error('AI analysis failed'); } finally { setAnalyzing(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead?')) return;
    try {
      await leadService.delete(id);
      setLeads(prev => prev.filter(l => l._id !== id));
      toast.success('Lead deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const now = new Date();
  const isDue = (l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= now && !['won', 'lost', 'converted'].includes(l.status);
  const filtered = leads
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))
    .filter(l => !sourceFilter || (sourceFilter === 'auto' ? l.autoCaptured : sourceFilter === 'due' ? isDue(l) : l.source === sourceFilter));
  const autoCount = leads.filter(l => l.autoCaptured).length;
  const dueCount = leads.filter(isDue).length;

  return (
    <div className="leads-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Leads</h1><p>{leads.length} total leads{autoCount > 0 && ` · ${autoCount} captured automatically`}{dueCount > 0 && ` · ${dueCount} follow-up${dueCount === 1 ? '' : 's'} due`}</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowAutomation(true)}><RiFlashlightLine /> Automation</button>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><RiUploadCloud2Line /> Import CSV</button>
            <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> Add Lead</button>
          </div>
        </div>
      </div>

      {showAutomation && <AutomationModal canManage={canManage} onClose={() => setShowAutomation(false)} />}

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadLeads(); }}
        />
      )}

      {/* Filters */}
      <div className="leads-filters">
        <div className="search-bar">
          <RiSearchLine />
          <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadLeads()} />
        </div>
        <div className="status-filters">
          <button className={`filter-btn ${!statusFilter ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
          {STATUS_OPTIONS.map(s => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select className="form-input form-select leads-source-filter" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All sources</option>
          <option value="due">Follow-up due</option>
          <option value="auto">Captured automatically</option>
          {[...AUTO_SOURCES, ...MANUAL_SOURCES].map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>New Lead</h3>
          <form onSubmit={handleCreate} className="lead-form">
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Deal Value (₦)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Source</label>
                <select className="form-input form-select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {MANUAL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Create Lead</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Lead List */}
      {loading ? (
        <div className="card"><SkeletonTable rows={6} cols={4} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiUserLine /></div>
          <h3>No leads found</h3>
          <p>Add a lead, or let them come in by themselves from your website chat, WhatsApp, online store and business card.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><RiAddLine /> Add Lead</button>
        </div>
      ) : (
        <div className="lead-list">
          {filtered.map(lead => (
            <div
              key={lead._id}
              className="lead-card card lead-card-clickable"
              onClick={() => navigate(`/leads/${lead._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/leads/${lead._id}`); }}
            >
              <div className="lead-card-main">
                <div className="lead-avatar">{lead.name[0].toUpperCase()}</div>
                <div className="lead-info">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-company">
                    {lead.company || 'No company'}
                    <span className={`lead-source ${lead.autoCaptured ? 'auto' : ''}`}>{lead.autoCaptured && <RiFlashlightLine />}{sourceLabel(lead.source)}</span>
                    {isDue(lead) && <span className="lead-due"><RiAlarmWarningLine /> Follow up</span>}
                  </div>
                  <div className="lead-contacts">
                    {lead.email && <span><RiMailLine />{lead.email}</span>}
                    {lead.phone && <span><RiPhoneLine />{lead.phone}</span>}
                  </div>
                </div>
                <div className="lead-meta">
                  <span className={`badge badge-${STATUS_COLORS[lead.status] || 'neutral'}`}>{lead.status}</span>
                  {lead.value > 0 && <span className="lead-value">{formatMoney(lead.value, lead.currency)}</span>}
                  {lead.score > 0 && <span className="lead-score">Score: {lead.score}</span>}
                </div>
                <div className="lead-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/leads/${lead._id}`)} title="Open">
                    <RiArrowRightLine />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleAnalyze(lead._id)} disabled={analyzing === lead._id} title="AI Analyze">
                    {analyzing === lead._id ? <RiLoader4Line className="spin" /> : <RiRobot2Line />}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Generate Contract" onClick={() => navigate('/contracts/new', {
                    state: { party2: { name: lead.name, email: lead.email || '', phone: lead.phone || '', role: 'Client' }, linkedLeadId: lead._id },
                  })}>
                    <RiFileTextLine />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(lead._id)} title="Delete">
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
              {lead.ai?.recommendedAction && (
                <div className="lead-ai-insight">
                  <RiRobot2Line />
                  <div>
                    <strong>AI Recommendation:</strong> {lead.ai.recommendedAction}
                    {lead.ai.priority && <span className={`badge badge-${lead.ai.priority === 'high' ? 'danger' : lead.ai.priority === 'medium' ? 'warning' : 'neutral'}`} style={{ marginLeft: 8 }}>{lead.ai.priority} priority</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Automation settings ────────────────────────────────────────────────── */
const AUTOMATION_ROWS = [
  { key: 'chat', title: 'Website chat', text: 'A visitor who leaves an email in the chat widget, or types an email or phone number into a message.' },
  { key: 'whatsapp', title: 'WhatsApp', text: 'Anyone who messages your connected WhatsApp number.' },
  { key: 'store', title: 'Online store', text: 'Shoppers who start or complete checkout, or create an account on your store.' },
  { key: 'card', title: 'Business card', text: 'Visitors who share their details on a team member’s digital business card (assigned to that member).' },
  { key: 'aiScoring', title: 'AI scoring on arrival', text: 'Each new captured lead gets a score, a suggested next step and a follow-up email draft (up to 30 a day).' },
];

function AutomationModal({ canManage, onClose }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    leadService.getCaptureSettings().then(({ data }) => setSettings(data.data)).catch(() => toast.error('Could not load automation settings'));
  }, []);

  async function toggle(key) {
    const next = !settings[key];
    setSaving(key);
    try {
      const { data } = await leadService.updateCaptureSettings({ [key]: next });
      setSettings(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setSaving(''); }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RiFlashlightLine /> Lead automation</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <p className="automation-intro">New people are added to Leads by themselves. Someone who already exists (same email or phone number) is updated instead of being added twice. Every message, checkout and purchase lands on their timeline, a payment marks them <b>won</b>, and each new lead gets a follow-up date for the next day. Whoever owns the lead (or the business owner) is emailed when a follow-up is due.</p>
          {!settings ? <div style={{ textAlign: 'center', padding: 20 }}><RiLoader4Line className="spin" /></div> : (
            <div className="automation-list">
              {AUTOMATION_ROWS.map((row) => (
                <label key={row.key} className="automation-row">
                  <div>
                    <strong>{row.title}</strong>
                    <p>{row.text}</p>
                  </div>
                  <input type="checkbox" className="automation-switch" checked={settings[row.key]} disabled={!canManage || saving === row.key} onChange={() => toggle(row.key)} />
                </label>
              ))}
            </div>
          )}
          {!canManage && <p className="csv-hint">Only managers and the owner can change these.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── CSV Import ─────────────────────────────────────────────────────────── */
const TARGET_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'status', label: 'Status', required: false },
];

const guessColumn = (headers, key) => {
  const h = headers.map((x) => x.toLowerCase().replace(/[^a-z]/g, ''));
  const wants = {
    name: ['name', 'fullname', 'contact', 'leadname'],
    email: ['email', 'emailaddress', 'mail'],
    phone: ['phone', 'phonenumber', 'mobile', 'tel', 'cell'],
    company: ['company', 'organization', 'organisation', 'business', 'account'],
    status: ['status', 'stage', 'leadstatus'],
  }[key];
  const idx = h.findIndex((x) => wants.includes(x));
  return idx >= 0 ? headers[idx] : '';
};

function CsvImportModal({ onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);       // parsed objects
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [pasted, setPasted] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function ingest(text) {
    const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
    const hdrs = parsed.meta.fields || [];
    if (!hdrs.length || !parsed.data.length) {
      toast.error('Could not read any rows from that CSV');
      return;
    }
    setHeaders(hdrs);
    setRows(parsed.data);
    setMapping(Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, guessColumn(hdrs, f.key)])));
    setStep(2);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result || ''));
    reader.readAsText(file);
  }

  const mappedRows = rows.map((r) => {
    const out = {};
    TARGET_FIELDS.forEach((f) => {
      const col = mapping[f.key];
      if (col) out[f.key] = (r[col] ?? '').toString().trim();
    });
    return out;
  });

  const canProceed = mapping.name && mapping.email;

  async function runImport() {
    setImporting(true);
    try {
      const { data } = await leadService.bulkImport(mappedRows);
      setResult(data);
      setStep(4);
      if (data.imported > 0) toast.success(`${data.imported} leads imported`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal csv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Leads from CSV</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>

        <div className="csv-steps">
          {['Upload', 'Map columns', 'Preview', 'Done'].map((s, i) => (
            <span key={s} className={`csv-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'complete' : ''}`}>
              {step > i + 1 ? <RiCheckLine /> : i + 1} {s}
            </span>
          ))}
        </div>

        <div className="modal-body">
          {/* Step 1 — upload / paste */}
          {step === 1 && (
            <div className="csv-upload">
              <label className="csv-drop">
                <RiUploadCloud2Line />
                <span>Choose a CSV file</span>
                <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
              </label>
              <div className="csv-or">or paste CSV data</div>
              <textarea
                className="form-input form-textarea"
                placeholder={'name,email,phone,company\nJane Doe,jane@acme.com,08012345678,Acme Ltd'}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                style={{ minHeight: 120, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
              <button className="btn btn-primary" disabled={!pasted.trim()} onClick={() => ingest(pasted)}>
                Parse pasted data <RiArrowRightSLine />
              </button>
            </div>
          )}

          {/* Step 2 — map columns */}
          {step === 2 && (
            <div className="csv-map">
              <p className="csv-hint">{rows.length} rows found. Match your columns to lead fields.</p>
              {TARGET_FIELDS.map((f) => (
                <div key={f.key} className="csv-map-row">
                  <span>{f.label}{f.required && ' *'}</span>
                  <select
                    className="form-input form-select"
                    value={mapping[f.key] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                  >
                    <option value="">— ignore —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              {!canProceed && <p className="csv-warn">Name and Email must be mapped.</p>}
            </div>
          )}

          {/* Step 3 — preview */}
          {step === 3 && (
            <div className="csv-preview">
              <p className="csv-hint">Preview of the first {Math.min(5, mappedRows.length)} of {mappedRows.length} rows:</p>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr>{TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                  <tbody>
                    {mappedRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => <td key={f.key}>{r[f.key] || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4 — result */}
          {step === 4 && result && (
            <div className="csv-result">
              <div className="csv-result-big">
                <strong>{result.imported}</strong> imported · <strong>{result.skipped}</strong> skipped
                {result.errors?.length ? <> · <strong>{result.errors.length}</strong> errors</> : null}
              </div>
              {result.errors?.length > 0 && (
                <div className="csv-errors">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <div key={i}>Row {e.row}: {e.reason}</div>
                  ))}
                  {result.errors.length > 20 && <div>…and {result.errors.length - 20} more</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 4 ? (
            <button className="btn btn-primary" onClick={onDone}>Done</button>
          ) : (
            <>
              {step > 1 && step < 4 && (
                <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
                  <RiArrowLeftSLine /> Back
                </button>
              )}
              {step === 2 && (
                <button className="btn btn-primary" disabled={!canProceed} onClick={() => setStep(3)}>
                  Preview <RiArrowRightSLine />
                </button>
              )}
              {step === 3 && (
                <button className="btn btn-primary" disabled={importing} onClick={runImport}>
                  {importing ? <RiLoader4Line className="spin" /> : <RiUploadCloud2Line />} Import {mappedRows.length} leads
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
