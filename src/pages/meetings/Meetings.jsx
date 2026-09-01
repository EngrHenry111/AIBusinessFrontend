import { useState, useEffect } from 'react';
import { meetingService } from '../../services';
import {
  RiAddLine, RiVideoLine, RiRobot2Line, RiDeleteBinLine,
  RiCalendarLine, RiTimeLine, RiTeamLine,
  RiCheckLine, RiAlertLine, RiLoader4Line,
  RiArrowDownSLine, RiArrowUpSLine, RiEditLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Meeting.css';

const STATUS_COLORS = { scheduled:'info', in_progress:'warning', completed:'success', cancelled:'neutral' };
const EMPTY_FORM = { title:'', description:'', scheduledAt:'', duration:60, externalParticipants:'', status:'scheduled' };

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);
  const [summarizing, setSummarizing] = useState(null);
  const [showTranscript, setShowTranscript] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadMeetings(); }, [statusFilter]);

  async function loadMeetings() {
    setLoading(true);
    try {
      const { data } = await meetingService.getAll({ status: statusFilter || undefined });
      setMeetings(data.data);
    } catch { toast.error('Failed to load meetings'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await meetingService.create({
        ...form,
        externalParticipants: form.externalParticipants
          ? form.externalParticipants.split(',').map(e => { const p=e.trim().split(' '); return {name:p[0],email:p[1]||''}; })
          : [],
      });
      setMeetings(prev => [data.data, ...prev]);
      setShowForm(false); setForm(EMPTY_FORM);
      toast.success('Meeting created');
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
    } catch { toast.error('Failed to update'); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  return (
    <div className="meetings-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Meetings</h1><p>{meetings.length} meetings · AI-powered summaries & action items</p></div>
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> Schedule Meeting</button>
        </div>
      </div>

      <div className="status-filters">
        {['','scheduled','in_progress','completed','cancelled'].map(s => (
          <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={() => setStatusFilter(s)}>
            {s===''?'All':s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>Schedule New Meeting</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Duration (min)</label>
                <input className="form-input" type="number" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-input form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select></div>
            </div>
            <div className="form-group" style={{marginTop:12}}><label className="form-label">Description</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Meeting agenda..." /></div>
            <div className="form-group" style={{marginTop:12}}><label className="form-label">External Participants (Name email, comma separated)</label>
              <input className="form-input" value={form.externalParticipants} onChange={e=>setForm(p=>({...p,externalParticipants:e.target.value}))} placeholder="John john@co.com, Jane jane@co.com" /></div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? Array(3).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:80,marginBottom:10,borderRadius:12}} />) :
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
                <div className="meeting-icon"><RiVideoLine /></div>
                <div className="meeting-info">
                  <div className="meeting-title">{meeting.title}</div>
                  <div className="meeting-meta">
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
                        <div className="ai-section"><h4>Action Items</h4>
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
