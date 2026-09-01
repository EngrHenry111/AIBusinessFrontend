import { useState, useEffect } from 'react';
import { appointmentService } from '../../services';
import {
  RiAddLine, RiCalendarLine, RiDeleteBinLine, RiTimeLine,
  RiUserLine, RiPhoneLine, RiMailLine, RiArrowDownSLine,
  RiArrowUpSLine, RiRobot2Line, RiMapPinLine, RiVideoLine,
  RiCheckLine, RiLoader4Line
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Appointment.css';

const STATUS_COLORS = {
  pending:'warning', confirmed:'success', rescheduled:'info',
  cancelled:'neutral', completed:'success', no_show:'danger'
};

const EMPTY_FORM = {
  title:'', description:'', scheduledAt:'', duration:60,
  customer:{ name:'', email:'', phone:'' },
  type:'general', location:'', isVirtual:false, meetingLink:'', notes:''
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('all'); // 'all' | 'upcoming'

  useEffect(() => { loadData(); }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [allRes, upcomingRes] = await Promise.all([
        appointmentService.getAll({ status: statusFilter || undefined }),
        appointmentService.getUpcoming(),
      ]);
      setAppointments(allRes.data.data);
      setUpcoming(upcomingRes.data.data);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await appointmentService.create(form);
      setAppointments(prev => [data.data, ...prev]);
      if (new Date(form.scheduledAt) > new Date()) {
        setUpcoming(prev => [...prev, data.data].sort((a,b) => new Date(a.scheduledAt)-new Date(b.scheduledAt)));
      }
      setShowForm(false); setForm(EMPTY_FORM);
      toast.success('Appointment scheduled');
      if (data.data.ai?.confirmationDraft) toast.success('AI confirmation email drafted!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleStatusChange(id, status) {
    try {
      const { data } = await appointmentService.update(id, { status });
      setAppointments(prev => prev.map(a => a._id===id ? data.data : a));
      setUpcoming(prev => prev.map(a => a._id===id ? data.data : a));
    } catch { toast.error('Failed to update'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await appointmentService.delete(id);
      setAppointments(prev => prev.filter(a => a._id!==id));
      setUpcoming(prev => prev.filter(a => a._id!==id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-US',{
    weekday:'short', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  }) : '—';

  const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('en-US',{
    weekday:'long', month:'long', day:'numeric', year:'numeric'
  }) : '—';

  const isToday = (dt) => {
    const d = new Date(dt);
    const n = new Date();
    return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  };

  const displayList = view==='upcoming' ? upcoming : appointments;

  return (
    <div className="appointments-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Appointments</h1>
            <p>{upcoming.length} upcoming · {appointments.length} total</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowForm(v=>!v)}>
            <RiAddLine /> Schedule Appointment
          </button>
        </div>
      </div>

      {/* Upcoming strip */}
      {upcoming.length > 0 && (
        <div className="upcoming-strip">
          <div className="upcoming-header"><RiCalendarLine /> Next Up</div>
          <div className="upcoming-list">
            {upcoming.slice(0,5).map(appt => (
              <div key={appt._id} className={`upcoming-card ${isToday(appt.scheduledAt)?'today':''}`}>
                <div className="upcoming-time">
                  {isToday(appt.scheduledAt) && <span className="today-badge">Today</span>}
                  <span>{new Date(appt.scheduledAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <div className="upcoming-info">
                  <span className="upcoming-title">{appt.title}</span>
                  <span className="upcoming-customer">{appt.customer?.name}</span>
                </div>
                <span className={`badge badge-${STATUS_COLORS[appt.status]||'neutral'}`}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View toggle + filters */}
      <div className="appt-toolbar">
        <div className="view-toggle">
          <button className={`view-btn ${view==='all'?'active':''}`} onClick={()=>setView('all')}>All</button>
          <button className={`view-btn ${view==='upcoming'?'active':''}`} onClick={()=>setView('upcoming')}>
            Upcoming {upcoming.length>0 && <span className="count-badge">{upcoming.length}</span>}
          </button>
        </div>
        {view==='all' && (
          <div className="status-filters">
            {['','pending','confirmed','rescheduled','completed','cancelled','no_show'].map(s=>(
              <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}>
                {s===''?'All':s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>Schedule Appointment</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={form.title}
                  onChange={e=>setForm(p=>({...p,title:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-input form-select" value={form.type}
                  onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  <option value="general">General</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="demo">Demo</option>
                  <option value="interview">Interview</option>
                  <option value="service">Service</option>
                </select></div>
              <div className="form-group"><label className="form-label">Date & Time *</label>
                <input className="form-input" type="datetime-local" value={form.scheduledAt}
                  onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min="15" step="15" value={form.duration}
                  onChange={e=>setForm(p=>({...p,duration:e.target.value}))} /></div>
            </div>

            <div className="form-section-title">Customer Details</div>
            <div className="form-grid-3">
              <div className="form-group"><label className="form-label">Name *</label>
                <input className="form-input" value={form.customer.name}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,name:e.target.value}}))} required /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.customer.email}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,email:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={form.customer.phone}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,phone:e.target.value}}))} /></div>
            </div>

            <div className="form-section-title">Location</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  <input type="checkbox" checked={form.isVirtual}
                    onChange={e=>setForm(p=>({...p,isVirtual:e.target.checked}))}
                    style={{marginRight:6}} />
                  Virtual / Online meeting
                </label>
                {form.isVirtual ? (
                  <input className="form-input" placeholder="Meeting link (Zoom, Teams...)" value={form.meetingLink}
                    onChange={e=>setForm(p=>({...p,meetingLink:e.target.value}))} style={{marginTop:8}} />
                ) : (
                  <input className="form-input" placeholder="Physical address" value={form.location}
                    onChange={e=>setForm(p=>({...p,location:e.target.value}))} style={{marginTop:8}} />
                )}
              </div>
              <div className="form-group"><label className="form-label">Notes</label>
                <textarea className="form-input form-textarea" value={form.notes}
                  onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any special requirements..." /></div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:16,alignItems:'center'}}>
              <button type="submit" className="btn btn-primary">Schedule</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:8}}>
                <RiRobot2Line style={{display:'inline',marginRight:4}} />AI will draft a confirmation email automatically
              </span>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? Array(4).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:80,marginBottom:10,borderRadius:12}} />) :
      displayList.length===0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiCalendarLine /></div>
          <h3>{view==='upcoming'?'No upcoming appointments':'No appointments yet'}</h3>
          <p>Schedule your first appointment to get started.</p>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}><RiAddLine /> Schedule Appointment</button>
        </div>
      ) : (
        <div className="appointments-list">
          {displayList.map(appt => (
            <div key={appt._id} className={`appt-card card ${isToday(appt.scheduledAt)?'today-card':''}`}>
              <div className="appt-header" onClick={()=>setExpanded(expanded===appt._id?null:appt._id)}>
                {/* Date block */}
                <div className="appt-date-block">
                  <span className="appt-month">{new Date(appt.scheduledAt).toLocaleString('en-US',{month:'short'})}</span>
                  <span className="appt-day">{new Date(appt.scheduledAt).getDate()}</span>
                </div>

                <div className="appt-info">
                  <div className="appt-title">{appt.title}</div>
                  <div className="appt-meta">
                    <span><RiTimeLine /> {fmt(appt.scheduledAt)} · {appt.duration} min</span>
                    {appt.customer?.name && <span><RiUserLine /> {appt.customer.name}</span>}
                    {appt.isVirtual ? <span><RiVideoLine /> Virtual</span> :
                      appt.location && <span><RiMapPinLine /> {appt.location}</span>}
                  </div>
                </div>

                <div className="appt-actions" onClick={e=>e.stopPropagation()}>
                  <select className="status-select" value={appt.status}
                    onChange={e=>handleStatusChange(appt._id,e.target.value)}>
                    {['pending','confirmed','rescheduled','completed','cancelled','no_show'].map(s=>(
                      <option key={s} value={s}>{s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}</option>
                    ))}
                  </select>
                  <span className={`badge badge-${STATUS_COLORS[appt.status]||'neutral'}`}>
                    {appt.status.replace('_',' ')}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(appt._id)} title="Delete">
                    <RiDeleteBinLine />
                  </button>
                  {expanded===appt._id?<RiArrowUpSLine />:<RiArrowDownSLine />}
                </div>
              </div>

              {expanded===appt._id && (
                <div className="appt-expanded">
                  <div className="appt-detail-grid">
                    <div>
                      <h4>Customer</h4>
                      {appt.customer?.name && <p><RiUserLine /> {appt.customer.name}</p>}
                      {appt.customer?.email && <p><RiMailLine /> {appt.customer.email}</p>}
                      {appt.customer?.phone && <p><RiPhoneLine /> {appt.customer.phone}</p>}
                    </div>
                    <div>
                      <h4>Details</h4>
                      <p><RiCalendarLine /> {fmtDate(appt.scheduledAt)}</p>
                      <p><RiTimeLine /> Duration: {appt.duration} minutes</p>
                      {appt.isVirtual && appt.meetingLink && (
                        <p><RiVideoLine /> <a href={appt.meetingLink} target="_blank" rel="noreferrer">{appt.meetingLink}</a></p>
                      )}
                      {!appt.isVirtual && appt.location && <p><RiMapPinLine /> {appt.location}</p>}
                    </div>
                  </div>

                  {appt.notes && <p className="appt-notes">{appt.notes}</p>}
                  {appt.description && <p className="appt-notes">{appt.description}</p>}

                  {appt.ai?.confirmationDraft && (
                    <div className="ai-confirmation">
                      <div className="ai-conf-header">
                        <RiRobot2Line /><span>AI Confirmation Email Draft</span>
                        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-muted)'}}>Copy and send to customer</span>
                      </div>
                      <pre className="conf-text">{appt.ai.confirmationDraft}</pre>
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
