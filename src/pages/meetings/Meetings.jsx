import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingService } from '../../services';
import {
  RiAddLine, RiVideoLine, RiRobot2Line, RiDeleteBinLine,
  RiCalendarLine, RiTimeLine, RiTeamLine,
  RiCheckLine, RiAlertLine, RiLoader4Line,
  RiArrowDownSLine, RiArrowUpSLine, RiEditLine,
  RiListUnordered, RiCalendar2Line, RiArrowLeftSLine, RiArrowRightSLine,
  RiRepeatLine, RiExternalLinkLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Meeting.css';

const STATUS_COLORS = { scheduled:'info', in_progress:'warning', completed:'success', cancelled:'neutral' };

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

const RECURRING_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const EMPTY_FORM = {
  title:'', description:'', scheduledAt:'', duration:60, externalParticipants:'', status:'scheduled',
  meetingType:'team', location:'', chairman:'', secretary:'', quorumRequired:50,
  isRecurring:false, recurringInterval:'monthly',
};

export default function Meetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);
  const [summarizing, setSummarizing] = useState(null);
  const [showTranscript, setShowTranscript] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('list'); // list | calendar
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [calSelected, setCalSelected] = useState(null);

  useEffect(() => { loadMeetings(); }, [statusFilter]);

  async function loadMeetings() {
    setLoading(true);
    try {
      const { data } = await meetingService.getAll({ status: statusFilter || undefined, limit: 100 });
      setMeetings(data.data);
    } catch { toast.error('Failed to load meetings'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await meetingService.create({
        ...form,
        recurringInterval: form.isRecurring ? form.recurringInterval : undefined,
        externalParticipants: form.externalParticipants
          ? form.externalParticipants.split(',').map(e => { const p=e.trim().split(' '); return {name:p[0],email:p[1]||''}; })
          : [],
      });
      setMeetings(prev => [data.data, ...prev]);
      setShowForm(false); setForm(EMPTY_FORM);
      toast.success(`Meeting scheduled — ${data.data.referenceNumber}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meeting?')) return;
    try {
      await meetingService.delete(id);
      setMeetings(prev => prev.filter(m => m._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  async function handleSummarize(meeting) {
    const text = transcript || meeting.transcript;
    if (!text?.trim()) { setShowTranscript(meeting._id); return; }
    setSummarizing(meeting._id);
    try {
      const { data } = await meetingService.summarize(meeting._id, text);
      setMeetings(prev => prev.map(m => m._id === meeting._id ? data.data : m));
      setShowTranscript(null); setTranscript(''); setExpanded(meeting._id);
      toast.success('AI summary generated');
    } catch { toast.error('Summarization failed'); }
    finally { setSummarizing(null); }
  }

  async function handleStatusChange(id, status) {
    try {
      const { data } = await meetingService.update(id, { status });
      setMeetings(prev => prev.map(m => m._id === id ? data.data : m));
      if (status === 'completed') toast.success('Marked completed');
    } catch { toast.error('Failed to update'); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  // ── Calendar helpers ────────────────────────────────────────────────
  const monthMeetings = useMemo(() => meetings.filter(m => {
    if (!m.scheduledAt) return false;
    const d = new Date(m.scheduledAt);
    return d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth();
  }), [meetings, calMonth]);

  const calendarCells = useMemo(() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);

  const meetingsOnDay = (day) => monthMeetings.filter(m => new Date(m.scheduledAt).getDate() === day);
  const today = new Date();
  const isToday = (day) => day === today.getDate() && calMonth.getMonth() === today.getMonth() && calMonth.getFullYear() === today.getFullYear();

  return (
    <div className="meetings-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Meetings</h1><p>{meetings.length} meetings · AI-powered summaries, minutes & action items</p></div>
          <div style={{ display:'flex', gap:8 }}>
            <div className="view-toggle">
              <button className={view==='list'?'active':''} onClick={()=>setView('list')} title="List view"><RiListUnordered /></button>
              <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')} title="Calendar view"><RiCalendar2Line /></button>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> Schedule Meeting</button>
          </div>
        </div>
      </div>

      {view === 'list' && (
        <div className="status-filters">
          {['','scheduled','in_progress','completed','cancelled'].map(s => (
            <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={() => setStatusFilter(s)}>
              {s===''?'All':s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>Schedule New Meeting</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Meeting Type</label>
                <select className="form-input form-select" value={form.meetingType} onChange={e=>setForm(p=>({...p,meetingType:e.target.value}))}>
                  {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Duration (min)</label>
                <input className="form-input" type="number" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Board room / Zoom link" /></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-input form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select></div>
              <div className="form-group"><label className="form-label">Chairman</label>
                <input className="form-input" value={form.chairman} onChange={e=>setForm(p=>({...p,chairman:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Secretary</label>
                <input className="form-input" value={form.secretary} onChange={e=>setForm(p=>({...p,secretary:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Quorum Required (%)</label>
                <input className="form-input" type="number" min="0" max="100" value={form.quorumRequired} onChange={e=>setForm(p=>({...p,quorumRequired:e.target.value}))} /></div>
            </div>
            <div className="form-group" style={{marginTop:12}}><label className="form-label">Description / Agenda</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Meeting agenda..." /></div>
            <div className="form-group" style={{marginTop:12}}><label className="form-label">External Participants (Name email, comma separated)</label>
              <input className="form-input" value={form.externalParticipants} onChange={e=>setForm(p=>({...p,externalParticipants:e.target.value}))} placeholder="John john@co.com, Jane jane@co.com" /></div>

            <div className="recurring-row">
              <label className="recurring-toggle">
                <input type="checkbox" checked={form.isRecurring} onChange={e=>setForm(p=>({...p,isRecurring:e.target.checked}))} />
                <RiRepeatLine /> Recurring meeting
              </label>
              {form.isRecurring && (
                <select className="form-input form-select" style={{maxWidth:180}} value={form.recurringInterval} onChange={e=>setForm(p=>({...p,recurringInterval:e.target.value}))}>
                  {RECURRING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
            <p className="form-hint">When a recurring meeting is marked completed, the next occurrence is created automatically.</p>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? Array(3).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:80,marginBottom:10,borderRadius:12}} />) :

      view === 'calendar' ? (
        <div className="card card-pad meeting-calendar">
          <div className="cal-nav">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setCalMonth(d=>new Date(d.getFullYear(), d.getMonth()-1, 1))}><RiArrowLeftSLine /></button>
            <h3>{calMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setCalMonth(d=>new Date(d.getFullYear(), d.getMonth()+1, 1))}><RiArrowRightSLine /></button>
          </div>
          <div className="cal-grid cal-dow">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="cal-dow-cell">{d}</div>)}
          </div>
          <div className="cal-grid">
            {calendarCells.map((day, i) => {
              if (!day) return <div key={i} className="cal-cell empty" />;
              const dayMeetings = meetingsOnDay(day);
              return (
                <div key={i} className={`cal-cell ${isToday(day)?'today':''} ${calSelected===day?'selected':''}`} onClick={()=>setCalSelected(calSelected===day?null:day)}>
                  <span className="cal-daynum">{day}</span>
                  <div className="cal-dots">
                    {dayMeetings.slice(0,3).map(m => <span key={m._id} className="cal-dot" style={{background:typeInfo(m.meetingType).color}} title={m.title} />)}
                    {dayMeetings.length>3 && <span className="cal-more">+{dayMeetings.length-3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {calSelected && (
            <div className="cal-day-list">
              <h4>{calMonth.toLocaleDateString('en-US',{month:'long'})} {calSelected}</h4>
              {meetingsOnDay(calSelected).length === 0 ? <p className="form-hint">No meetings this day.</p> :
                meetingsOnDay(calSelected).map(m => (
                  <div key={m._id} className="cal-day-item" onClick={()=>navigate(`/meetings/${m._id}`)}>
                    <span className="type-dot" style={{background:typeInfo(m.meetingType).color}} />
                    <span className="cal-item-title">{m.title}</span>
                    <span className="cal-item-time">{new Date(m.scheduledAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                    <RiExternalLinkLine />
                  </div>
                ))}
            </div>
          )}
        </div>
      ) :

      meetings.length===0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiVideoLine /></div>
          <h3>No meetings yet</h3>
          <p>Schedule a meeting to get AI-powered summaries and action items.</p>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}><RiAddLine /> Schedule Meeting</button>
        </div>
      ) : (
        <div className="meetings-list">
          {meetings.map(meeting => (
            <div key={meeting._id} className="meeting-card card">
              <div className="meeting-header" onClick={()=>setExpanded(expanded===meeting._id?null:meeting._id)}>
                <div className="meeting-icon" style={{background:`${typeInfo(meeting.meetingType).color}20`, color:typeInfo(meeting.meetingType).color}}><RiVideoLine /></div>
                <div className="meeting-info">
                  <div className="meeting-title">
                    {meeting.title}
                    <span className="type-chip" style={{color:typeInfo(meeting.meetingType).color, borderColor:typeInfo(meeting.meetingType).color}}>{typeInfo(meeting.meetingType).label}</span>
                    {meeting.isRecurring && <RiRepeatLine className="recurring-icon" title="Recurring meeting" />}
                  </div>
                  <div className="meeting-meta">
                    {meeting.referenceNumber && <span className="ref-chip">{meeting.referenceNumber}</span>}
                    {meeting.scheduledAt && <span><RiCalendarLine /> {fmt(meeting.scheduledAt)}</span>}
                    {meeting.duration && <span><RiTimeLine /> {meeting.duration} min</span>}
                    {meeting.externalParticipants?.length>0 && <span><RiTeamLine /> {meeting.externalParticipants.length} participants</span>}
                    {meeting.ai?.summary && <span className="ai-badge"><RiRobot2Line /> AI Summary ready</span>}
                  </div>
                </div>
                <div className="meeting-actions" onClick={e=>e.stopPropagation()}>
                  <select className="status-select" value={meeting.status} onChange={e=>handleStatusChange(meeting._id,e.target.value)}>
                    <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>navigate(`/meetings/${meeting._id}`)} title="Full details (minutes, agenda, attendance, resolutions…)">
                    <RiExternalLinkLine />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleSummarize(meeting)} disabled={summarizing===meeting._id} title="AI Summarize">
                    {summarizing===meeting._id ? <RiLoader4Line className="spin" /> : <RiRobot2Line />}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(meeting._id)} title="Delete"><RiDeleteBinLine /></button>
                  {expanded===meeting._id ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                </div>
              </div>

              {expanded===meeting._id && (
                <div className="meeting-expanded">
                  {meeting.description && <p className="meeting-description">{meeting.description}</p>}

                  <button className="btn btn-secondary btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>navigate(`/meetings/${meeting._id}`)}>
                    <RiExternalLinkLine /> Open full details — agenda, attendance, minutes, resolutions, action items
                  </button>

                  {(showTranscript===meeting._id || !meeting.ai?.summary) && (
                    <div className="transcript-section">
                      <label className="form-label">Paste Meeting Transcript or Notes</label>
                      <textarea className="form-input form-textarea" rows={6}
                        placeholder="Paste your meeting transcript here, then click AI Summarize..."
                        value={transcript} onChange={e=>setTranscript(e.target.value)} />
                      <button className={`btn btn-primary ${summarizing===meeting._id?'btn-loading':''}`}
                        onClick={()=>handleSummarize(meeting)} disabled={summarizing===meeting._id||!transcript.trim()} style={{marginTop:8}}>
                        {!summarizing && <><RiRobot2Line /> Generate AI Summary</>}
                      </button>
                    </div>
                  )}

                  {meeting.ai?.summary && (
                    <div className="ai-summary">
                      <div className="ai-summary-header">
                        <RiRobot2Line /><span>AI Meeting Summary</span>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setShowTranscript(meeting._id)} style={{marginLeft:'auto'}}>
                          <RiEditLine /> Re-analyze
                        </button>
                      </div>
                      <div className="ai-section"><h4>Summary</h4><p>{meeting.ai.summary}</p></div>
                      {meeting.ai.keyDecisions?.length>0 && (
                        <div className="ai-section"><h4>Key Decisions</h4><ul>
                          {meeting.ai.keyDecisions.map((d,i)=><li key={i}><RiCheckLine className="check-icon" /> {d}</li>)}
                        </ul></div>
                      )}
                      {meeting.ai.actionItems?.length>0 && (
                        <div className="ai-section"><h4>Action Items (AI-suggested)</h4>
                          <div className="action-items">
                            {meeting.ai.actionItems.map((item,i)=>(
                              <div key={i} className={`action-item priority-${item.priority||'medium'}`}>
                                <div className="action-item-top">
                                  <span className="action-task">{item.task}</span>
                                  <span className={`badge badge-${item.priority==='high'?'danger':item.priority==='low'?'neutral':'warning'}`}>{item.priority||'medium'}</span>
                                </div>
                                {(item.assignedTo||item.dueDate) && (
                                  <div className="action-item-meta">
                                    {item.assignedTo && <span>👤 {item.assignedTo}</span>}
                                    {item.dueDate && <span>📅 {item.dueDate}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {meeting.ai.risks?.length>0 && (
                        <div className="ai-section"><h4>Risks & Blockers</h4><ul>
                          {meeting.ai.risks.map((r,i)=><li key={i}><RiAlertLine className="alert-icon" /> {r}</li>)}
                        </ul></div>
                      )}
                      {meeting.ai.followUps?.length>0 && (
                        <div className="ai-section"><h4>Follow-ups</h4><ul>
                          {meeting.ai.followUps.map((f,i)=><li key={i}>{f}</li>)}
                        </ul></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
