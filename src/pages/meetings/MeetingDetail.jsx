import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { meetingService, userService } from '../../services';
import {
  RiArrowLeftLine, RiDownloadLine, RiAddLine, RiDeleteBinLine, RiCheckLine,
  RiUploadCloud2Line, RiFileTextLine, RiCheckboxCircleLine,
  RiCircleLine, RiSaveLine, RiSparklingLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Meeting.css';
import './MeetingDetail.css';

const MEETING_TYPES = [
  { value: 'board', label: 'Board Meeting', color: '#6366f1' },
  { value: 'management', label: 'Management Meeting', color: '#8b5cf6' },
  { value: 'team', label: 'Team Briefing', color: '#3b82f6' },
  { value: 'client', label: 'Client Meeting', color: '#06b6d4' },
  { value: 'agm', label: 'AGM', color: '#dc2626' },
  { value: 'egm', label: 'EGM', color: '#ea580c' },
  { value: 'committee', label: 'Committee Meeting', color: '#0891b2' },
  { value: 'strategy', label: 'Strategy Session', color: '#7c3aed' },
  { value: 'review', label: 'Review Meeting', color: '#059669' },
  { value: 'townhall', label: 'Town Hall', color: '#d97706' },
];
const typeInfo = (t) => MEETING_TYPES.find(m => m.value === t) || { label: t || 'Meeting', color: '#64748b' };

const TABS = ['Overview', 'Agenda', 'Attendance', 'Minutes', 'Resolutions', 'Action Items', 'Attachments'];

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  const load = useCallback(() => {
    setLoading(true);
    meetingService.getOne(id)
      .then(({ data }) => setMeeting(data.data))
      .catch(() => { toast.error('Meeting not found'); navigate('/meetings'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { userService.getTeam().then(({ data }) => setTeam(data.data)).catch(() => {}); }, []);

  if (loading || !meeting) return <div className="skeleton" style={{ height: 420, borderRadius: 14, margin: 16 }} />;

  const type = typeInfo(meeting.meetingType);
  const present = (meeting.attendance || []).filter(a => a.status === 'present').length;
  const totalInvited = (meeting.attendance || []).length;
  const attendancePct = totalInvited ? Math.round((present / totalInvited) * 100) : 0;

  return (
    <div className="meetings-page md-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/meetings')}><RiArrowLeftLine /> Back to meetings</button>
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {meeting.title}
              <span className="type-chip" style={{ color: type.color, borderColor: type.color }}>{type.label}</span>
            </h1>
            <p>
              {meeting.referenceNumber && <span className="ref-chip" style={{ marginRight: 10 }}>{meeting.referenceNumber}</span>}
              {fmtDT(meeting.scheduledAt)} {meeting.duration ? `· ${meeting.duration} min` : ''} {meeting.location ? `· ${meeting.location}` : ''}
            </p>
          </div>
          <div className="header-actions">
            <a className="btn btn-secondary" href={meetingService.exportPdfUrl(meeting._id)} target="_blank" rel="noreferrer">
              <RiDownloadLine /> Export Official PDF
            </a>
          </div>
        </div>
      </div>

      <div className="md-tabs">
        {TABS.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Overview' && <OverviewTab meeting={meeting} attendancePct={attendancePct} totalInvited={totalInvited} present={present} onChange={load} />}
      {tab === 'Agenda' && <AgendaTab meeting={meeting} onChange={setMeeting} />}
      {tab === 'Attendance' && <AttendanceTab meeting={meeting} onChange={setMeeting} />}
      {tab === 'Minutes' && <MinutesTab meeting={meeting} onChange={setMeeting} />}
      {tab === 'Resolutions' && <ResolutionsTab meeting={meeting} onChange={setMeeting} />}
      {tab === 'Action Items' && <ActionItemsTab meeting={meeting} team={team} onChange={setMeeting} />}
      {tab === 'Attachments' && <AttachmentsTab meeting={meeting} onChange={setMeeting} />}
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────── */
function OverviewTab({ meeting, attendancePct, totalInvited, present, onChange }) {
  const [confirming, setConfirming] = useState(false);

  async function confirmPrevious() {
    setConfirming(true);
    try {
      await meetingService.confirmPreviousMinutes(meeting._id);
      toast.success('Previous minutes confirmed');
      onChange();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setConfirming(false); }
  }

  return (
    <div className="md-grid">
      <div className="card card-pad">
        <h3>Meeting Details</h3>
        <dl className="md-dl">
          <dt>Chairman</dt><dd>{meeting.chairman || '—'}</dd>
          <dt>Secretary</dt><dd>{meeting.secretary || '—'}</dd>
          <dt>Status</dt><dd style={{ textTransform: 'capitalize' }}>{meeting.status.replace('_', ' ')}</dd>
          <dt>Quorum Required</dt><dd>{meeting.quorumRequired ?? 50}%</dd>
          <dt>Attendance</dt><dd>{present}/{totalInvited} ({attendancePct}%) — {meeting.quorumReached ? <span className="quorum-badge ok">Quorum reached</span> : <span className="quorum-badge no">Quorum not reached</span>}</dd>
          {meeting.isRecurring && <><dt>Recurring</dt><dd style={{ textTransform: 'capitalize' }}>{meeting.recurringInterval}</dd></>}
        </dl>
        {meeting.description && <><h4 className="md-subhead">Description / Agenda Notes</h4><p className="md-desc">{meeting.description}</p></>}
      </div>

      <div className="card card-pad">
        <h3>Participants</h3>
        {meeting.participants?.length === 0 && meeting.externalParticipants?.length === 0 ? (
          <p className="form-hint">No participants added.</p>
        ) : (
          <ul className="md-participants">
            {(meeting.participants || []).map(p => <li key={p._id}>{p.name} <span className="form-hint">(team)</span></li>)}
            {(meeting.externalParticipants || []).map((p, i) => <li key={i}>{p.name} <span className="form-hint">{p.email}</span></li>)}
          </ul>
        )}

        {meeting.previousMeetingId && (
          <div className="prev-minutes-box">
            <h4 className="md-subhead">Previous Meeting</h4>
            <p style={{ fontSize: 13 }}>
              <Link to={`/meetings/${meeting.previousMeetingId._id}`}>{meeting.previousMeetingId.title}</Link>
              {' · '}{fmtD(meeting.previousMeetingId.scheduledAt)}
            </p>
            {meeting.previousMinutesConfirmed ? (
              <p className="quorum-badge ok" style={{ marginTop: 6 }}>
                Confirmed by {meeting.previousMinutesConfirmedBy} on {fmtD(meeting.previousMinutesConfirmedAt)}
              </p>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} disabled={confirming} onClick={confirmPrevious}>
                Confirm previous minutes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Agenda builder ───────────────────────────────────────────────────── */
function AgendaTab({ meeting, onChange }) {
  const [form, setForm] = useState({ title: '', presenter: '', timeAllocated: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { data } = await meetingService.addAgendaItem(meeting._id, {
        ...form, number: (meeting.agenda?.length || 0) + 1,
      });
      onChange(data.data);
      setForm({ title: '', presenter: '', timeAllocated: '', notes: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggleDone(item) {
    try {
      const { data } = await meetingService.updateAgendaItem(meeting._id, item._id, { completed: !item.completed });
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  async function remove(item) {
    try {
      const { data } = await meetingService.deleteAgendaItem(meeting._id, item._id);
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  const items = [...(meeting.agenda || [])].sort((a, b) => (a.number || 0) - (b.number || 0));

  return (
    <div className="card card-pad">
      <h3>Agenda</h3>
      {items.length === 0 ? <p className="form-hint">No agenda items yet.</p> : (
        <div className="agenda-list">
          {items.map(item => (
            <div key={item._id} className={`agenda-item ${item.completed ? 'done' : ''}`}>
              <button className="agenda-check" onClick={() => toggleDone(item)}>
                {item.completed ? <RiCheckboxCircleLine /> : <RiCircleLine />}
              </button>
              <div className="agenda-body">
                <div className="agenda-top">
                  <span className="agenda-num">{item.number}.</span>
                  <span className="agenda-title">{item.title}</span>
                  {item.timeAllocated ? <span className="agenda-time">({item.timeAllocated} min)</span> : null}
                  {item.presenter && <span className="agenda-presenter">— {item.presenter}</span>}
                </div>
                {item.notes && <p className="agenda-notes">{item.notes}</p>}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(item)}><RiDeleteBinLine /></button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="agenda-form">
        <div className="form-grid-2">
          <input className="form-input" placeholder="Agenda item title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <input className="form-input" placeholder="Presenter" value={form.presenter} onChange={e => setForm(p => ({ ...p, presenter: e.target.value }))} />
          <input className="form-input" type="number" placeholder="Time allocated (min)" value={form.timeAllocated} onChange={e => setForm(p => ({ ...p, timeAllocated: e.target.value }))} />
          <input className="form-input" placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving || !form.title.trim()} style={{ marginTop: 10 }}><RiAddLine /> Add Agenda Item</button>
      </form>
    </div>
  );
}

/* ── Attendance ───────────────────────────────────────────────────────── */
function AttendanceTab({ meeting, onChange }) {
  const [newRow, setNewRow] = useState({ name: '', email: '', role: '' });

  async function setStatus(index, status) {
    try {
      const { data } = await meetingService.recordAttendance(meeting._id, { index, status });
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  async function addAttendee(e) {
    e.preventDefault();
    if (!newRow.name.trim()) return;
    try {
      const { data } = await meetingService.recordAttendance(meeting._id, {
        attendance: [...(meeting.attendance || []), { ...newRow, status: 'absent' }],
      });
      onChange(data.data);
      setNewRow({ name: '', email: '', role: '' });
    } catch { toast.error('Failed'); }
  }

  const present = (meeting.attendance || []).filter(a => a.status === 'present').length;
  const total = (meeting.attendance || []).length;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="card card-pad">
      <h3>Attendance</h3>
      <div className="quorum-bar-row">
        <div className="quorum-bar"><div className="quorum-fill" style={{ width: `${pct}%`, background: meeting.quorumReached ? 'var(--color-success)' : 'var(--color-warning)' }} /></div>
        <span className="form-hint">{present}/{total} present ({pct}%) — quorum {meeting.quorumRequired ?? 50}% {meeting.quorumReached ? '✅ reached' : '⚠️ not reached'}</span>
      </div>

      {(meeting.attendance || []).length === 0 ? <p className="form-hint">No attendees listed.</p> : (
        <table className="md-table">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {meeting.attendance.map((a, i) => (
              <tr key={i}>
                <td>{a.name}{a.email ? <div className="form-hint">{a.email}</div> : null}</td>
                <td>{a.role || '—'}</td>
                <td>
                  <select className="status-select" value={a.status} onChange={e => setStatus(i, e.target.value)}>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={addAttendee} className="agenda-form">
        <div className="form-grid-2">
          <input className="form-input" placeholder="Name *" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} />
          <input className="form-input" placeholder="Role" value={newRow.role} onChange={e => setNewRow(p => ({ ...p, role: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={!newRow.name.trim()} style={{ marginTop: 10 }}><RiAddLine /> Add Attendee</button>
      </form>
    </div>
  );
}

/* ── Minutes ──────────────────────────────────────────────────────────── */
function MinutesTab({ meeting, onChange }) {
  const [text, setText] = useState(meeting.minutes || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function save(status) {
    setSaving(true);
    try {
      const { data } = await meetingService.saveMinutes(meeting._id, { minutes: text, status });
      onChange(data.data);
      toast.success(status === 'final' ? 'Minutes finalized' : 'Draft saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function generate() {
    if (!text.trim()) return toast.error('Add some rough notes first');
    setGenerating(true);
    try {
      const { data } = await meetingService.generateMinutes(meeting._id, text);
      setText(data.data.minutes);
      onChange(data.data);
      toast.success('Minutes formatted by AI');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setGenerating(false); }
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Meeting Minutes</h3>
        <span className={`badge badge-${meeting.minutesStatus === 'final' ? 'success' : 'neutral'}`}>{meeting.minutesStatus === 'final' ? 'Final' : 'Draft'}</span>
      </div>
      <p className="form-hint" style={{ marginBottom: 10 }}>Paste rough notes, then use "Generate from Notes" to have AI format them into professional minutes.</p>
      <textarea className="form-input form-textarea minutes-area" rows={16} value={text} onChange={e => setText(e.target.value)}
        placeholder="Type or paste rough meeting notes here…" />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" disabled={generating} onClick={generate}>
          {generating ? 'Generating…' : <><RiSparklingLine /> Generate from Notes</>}
        </button>
        <button className="btn btn-secondary" disabled={saving} onClick={() => save('draft')}><RiSaveLine /> Save Draft</button>
        <button className="btn btn-primary" disabled={saving} onClick={() => save('final')}><RiCheckLine /> Finalize Minutes</button>
      </div>
    </div>
  );
}

/* ── Resolutions / motions ────────────────────────────────────────────── */
function ResolutionsTab({ meeting, onChange }) {
  const [form, setForm] = useState({ description: '', proposedBy: '', secondedBy: '' });
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const { data } = await meetingService.addResolution(meeting._id, form);
      onChange(data.data);
      setForm({ description: '', proposedBy: '', secondedBy: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function vote(res, field, value) {
    try {
      const { data } = await meetingService.updateResolution(meeting._id, res._id, { [field]: value });
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  async function remove(res) {
    try {
      const { data } = await meetingService.deleteResolution(meeting._id, res._id);
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="card card-pad">
      <h3>Resolutions &amp; Motions</h3>
      {(meeting.resolutions || []).length === 0 ? <p className="form-hint">No resolutions recorded yet.</p> : (
        <div className="resolutions-list">
          {meeting.resolutions.map(r => (
            <div key={r._id} className="resolution-card">
              <div className="resolution-head">
                <strong>RESOLUTION {r.number}:</strong>
                <span className={`badge badge-${r.status === 'carried' ? 'success' : r.status === 'rejected' ? 'danger' : 'neutral'}`}>{r.status}</span>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={() => remove(r)}><RiDeleteBinLine /></button>
              </div>
              <p className="resolution-desc">{r.description}</p>
              <p className="form-hint">Proposed by {r.proposedBy || '—'} · Seconded by {r.secondedBy || '—'}</p>
              <div className="vote-row">
                <label>For <input type="number" min="0" className="vote-input" value={r.votesFor} onChange={e => vote(r, 'votesFor', Number(e.target.value))} /></label>
                <label>Against <input type="number" min="0" className="vote-input" value={r.votesAgainst} onChange={e => vote(r, 'votesAgainst', Number(e.target.value))} /></label>
                <label>Abstain <input type="number" min="0" className="vote-input" value={r.votesAbstain} onChange={e => vote(r, 'votesAbstain', Number(e.target.value))} /></label>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="agenda-form">
        <textarea className="form-input form-textarea" rows={2} placeholder="Resolution / motion description *"
          value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        <div className="form-grid-2" style={{ marginTop: 8 }}>
          <input className="form-input" placeholder="Proposed by" value={form.proposedBy} onChange={e => setForm(p => ({ ...p, proposedBy: e.target.value }))} />
          <input className="form-input" placeholder="Seconded by" value={form.secondedBy} onChange={e => setForm(p => ({ ...p, secondedBy: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving || !form.description.trim()} style={{ marginTop: 10 }}><RiAddLine /> Add Resolution</button>
      </form>
    </div>
  );
}

/* ── Action items ─────────────────────────────────────────────────────── */
function ActionItemsTab({ meeting, team, onChange }) {
  const [form, setForm] = useState({ task: '', assignedTo: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!form.task.trim()) return;
    setSaving(true);
    try {
      const assignee = team.find(t => t._id === form.assignedTo);
      const { data } = await meetingService.addActionItem(meeting._id, {
        task: form.task, assignedTo: form.assignedTo || undefined,
        assignedToName: assignee?.name, dueDate: form.dueDate || undefined,
      });
      onChange(data.data);
      setForm({ task: '', assignedTo: '', dueDate: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggle(item) {
    try {
      const { data } = await meetingService.updateActionItem(meeting._id, item._id, {
        status: item.status === 'completed' ? 'pending' : 'completed',
      });
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  async function remove(item) {
    try {
      const { data } = await meetingService.deleteActionItem(meeting._id, item._id);
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="card card-pad">
      <h3>Action Items</h3>
      {(meeting.actionItems || []).length === 0 ? <p className="form-hint">No action items yet.</p> : (
        <div className="agenda-list">
          {meeting.actionItems.map(item => (
            <div key={item._id} className={`agenda-item ${item.status === 'completed' ? 'done' : ''}`}>
              <button className="agenda-check" onClick={() => toggle(item)}>
                {item.status === 'completed' ? <RiCheckboxCircleLine /> : <RiCircleLine />}
              </button>
              <div className="agenda-body">
                <div className="agenda-top"><span className="agenda-title">{item.task}</span></div>
                <p className="agenda-notes">
                  {item.assignedTo?.name || item.assignedToName ? `👤 ${item.assignedTo?.name || item.assignedToName}` : 'Unassigned'}
                  {item.dueDate ? ` · 📅 Due ${fmtD(item.dueDate)}` : ''}
                  {item.status === 'completed' && item.completedAt ? ` · ✅ Done ${fmtD(item.completedAt)}` : ''}
                </p>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(item)}><RiDeleteBinLine /></button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="agenda-form">
        <div className="form-grid-2">
          <input className="form-input" placeholder="Task description *" value={form.task} onChange={e => setForm(p => ({ ...p, task: e.target.value }))} />
          <select className="form-input form-select" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}>
            <option value="">Assign to team member (optional)</option>
            {team.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving || !form.task.trim()} style={{ marginTop: 10 }}><RiAddLine /> Add Action Item</button>
      </form>
    </div>
  );
}

/* ── Attachments ──────────────────────────────────────────────────────── */
function AttachmentsTab({ meeting, onChange }) {
  const fileRef = useRef(null);
  const [category, setCategory] = useState('document');
  const [uploading, setUploading] = useState(false);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      fd.append('name', file.name);
      const { data } = await meetingService.uploadAttachment(meeting._id, fd);
      onChange(data.data);
      toast.success('File uploaded');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  }

  async function remove(att) {
    try {
      const { data } = await meetingService.deleteAttachment(meeting._id, att._id);
      onChange(data.data);
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="card card-pad">
      <h3>Attachments</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-input form-select" style={{ maxWidth: 200 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="agenda">Agenda document</option>
          <option value="presentation">Presentation</option>
          <option value="document">Supporting document</option>
        </select>
        <button className="btn btn-secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <RiUploadCloud2Line /> {uploading ? 'Uploading…' : 'Upload File'}
        </button>
        <input ref={fileRef} type="file" hidden onChange={e => { upload(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {(meeting.attachments || []).length === 0 ? <p className="form-hint">No attachments yet.</p> : (
        <table className="md-table">
          <thead><tr><th>File</th><th>Category</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>
            {meeting.attachments.map(a => (
              <tr key={a._id}>
                <td><a href={a.url} target="_blank" rel="noreferrer"><RiFileTextLine /> {a.name}</a></td>
                <td style={{ textTransform: 'capitalize' }}>{a.category}</td>
                <td>{fmtD(a.uploadedAt)}</td>
                <td>
                  <div className="actions">
                    <a className="btn btn-ghost btn-icon btn-sm" href={a.url} target="_blank" rel="noreferrer"><RiDownloadLine /></a>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(a)}><RiDeleteBinLine /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
