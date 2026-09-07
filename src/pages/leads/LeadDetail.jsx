import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadService } from '../../services';
import {
  RiArrowLeftLine, RiEditLine, RiSave3Line, RiCloseLine, RiRobot2Line, RiLoader4Line,
  RiMailLine, RiPhoneLine, RiMapPinLine, RiBuilding2Line, RiUserAddLine, RiTimeLine,
  RiFileAddLine, RiCalendarEventLine, RiVideoAddLine, RiChat3Line, RiSendPlane2Line,
  RiFileList3Line, RiCalendarCheckLine, RiExchangeLine, RiFlashlightLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './LeadDetail.css';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STATUS_COLORS = { new: 'brand', contacted: 'info', qualified: 'warning', proposal: 'warning', negotiation: 'warning', won: 'success', lost: 'neutral' };
const SOURCES = ['website', 'referral', 'social', 'email', 'cold_call', 'event', 'other'];

const scoreColor = (s) => (s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : s >= 25 ? '#6366f1' : '#94a3b8');
const money = (n, cur) => `${cur || 'USD'} ${Number(n || 0).toLocaleString()}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const dayTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const TL_ICON = {
  created: RiUserAddLine, note: RiChat3Line, invoice: RiFileList3Line,
  appointment: RiCalendarCheckLine, meeting: RiVideoAddLine, status_change: RiExchangeLine,
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadService.getDetail(id);
      setData(res.data.data);
    } catch {
      toast.error('Lead not found');
      navigate('/leads', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const lead = data?.lead;

  async function changeStatus(status) {
    try {
      const res = await leadService.update(id, { status });
      setData((d) => ({ ...d, lead: { ...d.lead, ...res.data.data } }));
      toast.success('Status updated');
      load();
    } catch { toast.error('Failed to update status'); }
  }

  function startEdit() {
    setForm({
      name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
      company: lead.company || '', position: lead.position || '', source: lead.source || 'other',
      value: lead.value || 0, description: lead.description || '',
    });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await leadService.update(id, form);
      setData((d) => ({ ...d, lead: { ...d.lead, ...res.data.data } }));
      setEditing(false);
      toast.success('Lead updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await leadService.addNote(id, noteText.trim());
      setData((d) => ({ ...d, lead: { ...d.lead, notes: res.data.data.notes }, notes: res.data.data.notes }));
      setNoteText('');
      toast.success('Note added');
      load();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

  if (loading || !lead) {
    return <div className="ld-loading"><RiLoader4Line className="spin" /></div>;
  }

  const invoices = data.invoices || [];
  const appointments = data.appointments || [];
  const meetings = data.meetings || [];
  const notes = data.notes || lead.notes || [];
  const timeline = data.activityTimeline || [];

  return (
    <div className="ld-page fade-in">
      <button className="ld-back" onClick={() => navigate('/leads')}><RiArrowLeftLine /> Back to Leads</button>

      {/* ── Header ── */}
      {editing ? (
        <form className="card card-pad" onSubmit={saveEdit}>
          <h3 style={{ marginBottom: 14 }}>Edit Lead</h3>
          <div className="ld-edit-grid">
            <div className="form-group"><label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Company</label>
              <input className="form-input" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Position</label>
              <input className="form-input" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Deal Value</label>
              <input className="form-input" type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Source</label>
              <select className="form-input form-select" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}>
                {SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Description</label>
            <textarea className="form-input form-textarea" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <RiLoader4Line className="spin" /> : <RiSave3Line />} Save
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}><RiCloseLine /> Cancel</button>
          </div>
        </form>
      ) : (
        <div className="card card-pad">
          <div className="ld-head">
            <div className="ld-avatar">{lead.name?.[0]?.toUpperCase()}</div>
            <div className="ld-head-main">
              <h1>{lead.name}</h1>
              <div className="ld-head-sub">{lead.company || 'No company'}{lead.position ? ` · ${lead.position}` : ''}</div>
              <div className="ld-head-contacts">
                {lead.email && <span><RiMailLine /> {lead.email}</span>}
                {lead.phone && <span><RiPhoneLine /> {lead.phone}</span>}
              </div>
            </div>
            <div className="ld-head-right">
              <div className="ld-score" style={{ background: scoreColor(lead.score || 0) }}>
                <b>{lead.score || 0}</b><span>AI Score</span>
              </div>
              <select className="ld-status-select" value={lead.status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <span className={`badge badge-${STATUS_COLORS[lead.status] || 'neutral'}`}>{lead.status}</span>
              <button className="btn btn-secondary btn-sm" onClick={startEdit}><RiEditLine /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info cards ── */}
      <div className="ld-info-row">
        <div className="ld-info"><div className="ld-info-label">Lead Source</div><div className="ld-info-value">{(lead.source || 'other').replace('_', ' ')}</div></div>
        <div className="ld-info"><div className="ld-info-label">Industry / Company</div><div className="ld-info-value">{lead.company || '—'}</div></div>
        <div className="ld-info"><div className="ld-info-label">Deal Value</div><div className="ld-info-value">{money(lead.value, lead.currency)}</div></div>
        <div className="ld-info"><div className="ld-info-label">Created</div><div className="ld-info-value">{day(lead.createdAt)}</div></div>
      </div>

      {/* ── Tabs ── */}
      <div className="ld-tabs">
        {[
          ['overview', 'Overview'],
          ['timeline', 'Activity'],
          ['notes', `Notes`],
          ['related', 'Related'],
        ].map(([k, label]) => (
          <button key={k} className={`ld-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
            {k === 'notes' && notes.length > 0 && <span className="ld-tab-count">{notes.length}</span>}
            {k === 'related' && (invoices.length + appointments.length + meetings.length) > 0 &&
              <span className="ld-tab-count">{invoices.length + appointments.length + meetings.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <>
          <div className="card ld-ai-card">
            <h3><RiRobot2Line /> AI Lead Score — {lead.score || 0}/100</h3>
            {lead.ai?.summary ? (
              <>
                <p>{lead.ai.summary}</p>
                {lead.ai.recommendedAction && <p><strong>Recommended action:</strong> {lead.ai.recommendedAction}</p>}
                {lead.ai.priority && <span className={`badge badge-${lead.ai.priority === 'high' ? 'danger' : lead.ai.priority === 'medium' ? 'warning' : 'neutral'}`}>{lead.ai.priority} priority</span>}
                {lead.ai.followUpDraft && <pre>{lead.ai.followUpDraft}</pre>}
              </>
            ) : (
              <p>This lead hasn't been analysed yet. Run AI analysis from the Leads list to get a score, a recommended next action and a follow-up email draft.</p>
            )}
          </div>

          <div className="ld-grid-2">
            <div className="card card-pad ld-block">
              <h3>Contact Info</h3>
              <div className="ld-kv">
                <div className="ld-kv-row"><span>Email</span><span>{lead.email || '—'}</span></div>
                <div className="ld-kv-row"><span>Phone</span><span>{lead.phone || '—'}</span></div>
                <div className="ld-kv-row"><span>Company</span><span>{lead.company || '—'}</span></div>
                <div className="ld-kv-row"><span>Position</span><span>{lead.position || '—'}</span></div>
                <div className="ld-kv-row"><span>Assigned to</span><span>{lead.assignedTo?.name || 'Unassigned'}</span></div>
                {lead.description && <div className="ld-kv-row"><span>Description</span><span>{lead.description}</span></div>}
              </div>
            </div>

            <div className="card card-pad ld-block">
              <h3>Quick Actions</h3>
              <div className="ld-actions-grid">
                <button className="ld-action" onClick={() => navigate(`/invoices?prefill=${id}`)}>
                  <RiFileAddLine /> Create Invoice
                </button>
                <button className="ld-action" onClick={() => navigate(`/appointments?prefill=${id}`)}>
                  <RiCalendarEventLine /> Schedule Appointment
                </button>
                <button className="ld-action" onClick={() => navigate(`/meetings?prefill=${id}`)}>
                  <RiVideoAddLine /> Create Meeting
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Activity timeline ── */}
      {tab === 'timeline' && (
        <div className="card card-pad">
          {timeline.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><RiTimeLine /></div><h3>No activity yet</h3></div>
          ) : (
            <div className="ld-timeline">
              {timeline.map((ev, i) => {
                const Icon = TL_ICON[ev.icon] || RiFlashlightLine;
                return (
                  <div key={i} className="ld-tl-item">
                    <div className={`ld-tl-dot ${ev.type || ''}`}><Icon /></div>
                    <div className="ld-tl-body">{ev.description}</div>
                    <div className="ld-tl-meta">{dayTime(ev.at)}{ev.user ? ` · ${ev.user}` : ''}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {tab === 'notes' && (
        <div className="card card-pad">
          <div className="ld-notes-list">
            {notes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No notes yet. Add the first one below.</p>
            ) : (
              [...notes].reverse().map((n, i) => (
                <div key={n._id || i} className="ld-note">
                  <div className="ld-note-head">
                    <strong>{n.createdBy?.name || 'Team member'}</strong>
                    <span>{dayTime(n.createdAt)}</span>
                  </div>
                  <div className="ld-note-body">{n.content}</div>
                </div>
              ))
            )}
          </div>

          <form className="ld-note-form" onSubmit={submitNote}>
            <textarea
              className="form-input form-textarea"
              placeholder="Add a note about this lead…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={addingNote || !noteText.trim()}>
              {addingNote ? <RiLoader4Line className="spin" /> : <RiSendPlane2Line />} Add Note
            </button>
          </form>
        </div>
      )}

      {/* ── Related ── */}
      {tab === 'related' && (
        <div className="card card-pad">
          <div className="ld-related-section">
            <h3>Invoices ({invoices.length})</h3>
            {invoices.length === 0 ? <p className="muted" style={{ color: 'var(--text-muted)', fontSize: 13 }}>No invoices for this email.</p> : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Invoice #</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td><strong>{inv.invoiceNumber}</strong></td>
                        <td>{money(inv.total, inv.currency)}</td>
                        <td><span className="badge badge-neutral">{inv.status}</span></td>
                        <td className="muted">{day(inv.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="ld-related-section">
            <h3>Appointments ({appointments.length})</h3>
            {appointments.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No appointments for this email.</p> : (
              <div className="ld-mini-list">
                {appointments.map((a) => (
                  <div key={a._id} className="ld-mini-item">
                    <span><strong>{a.title}</strong> <span className="muted">· {dayTime(a.scheduledAt)}</span></span>
                    <span className="badge badge-neutral">{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ld-related-section">
            <h3>Meetings ({meetings.length})</h3>
            {meetings.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No related meetings found.</p> : (
              <div className="ld-mini-list">
                {meetings.map((m) => (
                  <div key={m._id} className="ld-mini-item">
                    <span><strong>{m.title}</strong> <span className="muted">· {m.scheduledAt ? dayTime(m.scheduledAt) : day(m.createdAt)}</span></span>
                    <span className="badge badge-neutral">{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
