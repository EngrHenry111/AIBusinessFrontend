import { useState, useEffect } from 'react';
import { leadService } from '../../services';
import { RiAddLine, RiSearchLine, RiRobot2Line, RiUserLine, RiMailLine, RiPhoneLine, RiDeleteBinLine, RiEditLine, RiLoader4Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Leads.css';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STATUS_COLORS = { new: 'brand', contacted: 'info', qualified: 'warning', proposal: 'warning', negotiation: 'warning', won: 'success', lost: 'neutral' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'website', value: '', notes: '' });

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
      setForm({ name: '', email: '', phone: '', company: '', source: 'website', value: '', notes: '' });
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
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> Add Lead</button>
        </div>
      </div>

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
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
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
            <div key={lead._id} className="lead-card card">
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
                <div className="lead-actions">
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
