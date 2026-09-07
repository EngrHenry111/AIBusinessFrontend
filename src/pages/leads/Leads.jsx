import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { leadService } from '../../services';
import {
  RiAddLine, RiSearchLine, RiRobot2Line, RiUserLine, RiMailLine, RiPhoneLine,
  RiDeleteBinLine, RiLoader4Line, RiUploadCloud2Line, RiCloseLine, RiArrowRightSLine,
  RiArrowLeftSLine, RiCheckLine, RiArrowRightLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
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

  useEffect(() => { loadLeads(); }, [statusFilter]);

  async function loadLeads() {
    setLoading(true);
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

  const filtered = leads.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="leads-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Leads</h1><p>{leads.length} total leads</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><RiUploadCloud2Line /> Import CSV</button>
            <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> Add Lead</button>
          </div>
        </div>
      </div>

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
              <div className="form-group"><label className="form-label">Deal Value ($)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Source</label>
                <select className="form-input form-select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  <option value="website">Website</option><option value="referral">Referral</option><option value="social">Social</option><option value="email">Email</option><option value="cold_call">Cold Call</option><option value="event">Event</option><option value="other">Other</option>
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
        Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 8, borderRadius: 10 }} />)
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiUserLine /></div>
          <h3>No leads found</h3>
          <p>Add your first lead to start tracking your sales pipeline.</p>
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
                  <div className="lead-company">{lead.company || 'No company'}</div>
                  <div className="lead-contacts">
                    {lead.email && <span><RiMailLine />{lead.email}</span>}
                    {lead.phone && <span><RiPhoneLine />{lead.phone}</span>}
                  </div>
                </div>
                <div className="lead-meta">
                  <span className={`badge badge-${STATUS_COLORS[lead.status] || 'neutral'}`}>{lead.status}</span>
                  {lead.value > 0 && <span className="lead-value">${Number(lead.value).toLocaleString()}</span>}
                  {lead.score > 0 && <span className="lead-score">Score: {lead.score}</span>}
                </div>
                <div className="lead-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/leads/${lead._id}`)} title="Open">
                    <RiArrowRightLine />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleAnalyze(lead._id)} disabled={analyzing === lead._id} title="AI Analyze">
                    {analyzing === lead._id ? <RiLoader4Line className="spin" /> : <RiRobot2Line />}
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
