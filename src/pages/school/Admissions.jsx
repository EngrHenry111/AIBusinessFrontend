import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiUserAddLine, RiSearchLine, RiAddLine, RiLoader4Line, RiCheckLine, RiCloseLine,
  RiLinkM, RiDeleteBinLine, RiEditLine, RiGraduationCapLine,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import useSchoolLive from './useSchoolLive';
import { ApplicationFormModal, Modal, Field, useClasses } from './SchoolForms';
import { APPLICATION_STATUS, fmtDate, fmtDateTime, errMsg, publicLink } from './schoolConstants';
import './School.css';

const PIPELINE = ['submitted', 'under_review', 'interview', 'admitted', 'enrolled', 'rejected', 'withdrawn'];

export default function Admissions() {
  const [params, setParams] = useSearchParams();
  const [classes] = useClasses();
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // application | 'new'
  const [openId, setOpenId] = useState(params.get('open'));
  const [slug, setSlug] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await schoolService.getApplications({ status: status || undefined, search: search || undefined });
      setApps(data.data);
      setCounts(data.statusCounts || {});
    } catch (e) { toast.error(errMsg(e, 'Failed to load applications')); }
    finally { setLoading(false); }
  }, [status, search]);

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useEffect(() => { schoolService.getSettings().then(({ data }) => setSlug(data.data.slug)).catch(() => {}); }, []);
  useSchoolLive(load, ['admissions']);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const close = () => { setOpenId(null); if (params.get('open')) setParams({}); };

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiUserAddLine style={{ verticalAlign: '-3px' }} /> Admissions</h1>
          <p>Applications from your online form and walk-ins, from review to enrolment.</p>
        </div>
        <div className="sc-actions">
          {slug && (
            <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(publicLink(slug, 'apply')); toast.success('Admission form link copied'); }}>
              <RiLinkM /> Copy online form link
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setEditing('new')}><RiAddLine /> New application</button>
        </div>
      </div>

      <div className="sc-tabs" role="tablist">
        {[['', 'All', total], ...PIPELINE.map((k) => [k, APPLICATION_STATUS[k].label, counts[k] || 0])].map(([k, label, n]) => (
          <button key={k || 'all'} role="tab" aria-selected={status === k} className={`sc-tab ${status === k ? 'active' : ''}`} onClick={() => setStatus(k)}>
            {label} <span className="sc-tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="sc-filters">
          <div className="sc-search"><RiSearchLine /><input placeholder="Search child, parent, phone or application number…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div> : apps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiUserAddLine /></div>
            <h3>No applications{status ? ' here' : ' yet'}</h3>
            <p>Share the online admission form with parents, or add a walk-in application.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Applicant</th><th>Class</th><th>Parent / guardian</th><th>Received</th><th>Status</th></tr></thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a._id} className="sc-row" onClick={() => setOpenId(a._id)}>
                    <td><div className="sc-strong">{a.lastName} {a.firstName} {a.otherNames}</div><span className="cell-sub">{a.applicationNumber}{a.source === 'online' && ' · online'}</span></td>
                    <td>{a.classAppliedFor?.name || '—'}</td>
                    <td>{a.guardian?.name}<span className="cell-sub">{a.guardian?.phone}</span></td>
                    <td>{fmtDate(a.createdAt)}{a.interviewDate && <span className="cell-sub">Interview {fmtDateTime(a.interviewDate)}</span>}</td>
                    <td><span className={`badge badge-${APPLICATION_STATUS[a.status]?.badge}`}>{APPLICATION_STATUS[a.status]?.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ApplicationFormModal application={editing === 'new' ? null : editing} classes={classes}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {openId && !editing && (
        <ApplicationDrawer id={openId} classes={classes} onClose={close} onEdit={(a) => setEditing(a)} onChanged={load} />
      )}
    </div>
  );
}

function ApplicationDrawer({ id, classes, onClose, onEdit, onChanged }) {
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [enrollClass, setEnrollClass] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [notify, setNotify] = useState(true);

  const load = useCallback(() => schoolService.getApplication(id).then(({ data }) => {
    setApp(data.data);
    setEnrollClass(data.data.classAppliedFor?._id || '');
  }).catch((e) => { toast.error(errMsg(e)); onClose(); }), [id, onClose]);
  useEffect(() => { load(); }, [load]);
  useSchoolLive((evt) => { if (!evt.applicationId || evt.applicationId === id) load(); }, ['admissions']);

  async function act(fn, msg) {
    setBusy(true);
    try { await fn(); toast.success(msg); await load(); onChanged(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  }

  if (!app) return <Modal title="Application" onClose={onClose}><div className="sc-loading"><RiLoader4Line className="spin" /></div></Modal>;
  const open = ['submitted', 'under_review', 'interview'].includes(app.status);
  const kv = (label, value) => (value ? <div className="sc-kv"><span>{label}</span><div>{value}</div></div> : null);

  return (
    <Modal title={`${app.lastName} ${app.firstName} — ${app.applicationNumber}`} onClose={onClose}
      footer={(
        <>
          {app.status !== 'enrolled' && <button className="btn btn-ghost" style={{ marginRight: 'auto', color: '#b91c1c' }} disabled={busy} onClick={async () => {
            if (!window.confirm('Delete this application?')) return;
            try { await schoolService.deleteApplication(app._id); toast.success('Application deleted'); onChanged(); onClose(); }
            catch (e) { toast.error(errMsg(e)); }
          }}><RiDeleteBinLine /> Delete</button>}
          {app.status !== 'enrolled' && <button className="btn btn-secondary" onClick={() => onEdit(app)}><RiEditLine /> Edit</button>}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </>
      )}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span className={`badge badge-${APPLICATION_STATUS[app.status]?.badge}`}>{APPLICATION_STATUS[app.status]?.label}</span>
        <span className="cell-sub" style={{ margin: 0 }}>{app.source === 'online' ? 'Applied online' : 'Walk-in'} on {fmtDateTime(app.createdAt)}</span>
      </div>

      {kv('Class applying for', app.classAppliedFor?.name)}
      {kv('Gender', app.gender && (app.gender === 'male' ? 'Male' : 'Female'))}
      {kv('Date of birth', app.dateOfBirth && fmtDate(app.dateOfBirth))}
      {kv('Previous school', app.previousSchool)}
      {kv('Medical notes', app.medicalNotes)}
      {kv('Parent / guardian', <>{app.guardian?.name}{app.guardian?.relationship && ` (${app.guardian.relationship})`}<span className="cell-sub">{[app.guardian?.phone, app.guardian?.email].filter(Boolean).join(' · ')}</span></>)}
      {kv('Address', app.guardian?.address || app.address)}
      {kv('Interview', app.interviewDate && fmtDateTime(app.interviewDate))}
      {kv('Entrance score', app.entranceScore != null && `${app.entranceScore}%`)}
      {kv('Notes', app.notes && <span style={{ whiteSpace: 'pre-wrap' }}>{app.notes}</span>)}
      {kv('Decided', app.decidedAt && `${fmtDateTime(app.decidedAt)}${app.decidedBy?.name ? ` by ${app.decidedBy.name}` : ''}`)}

      {open && (
        <>
          <div className="sc-section">Move along</div>
          <div className="sc-actions">
            {app.status === 'submitted' && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act(() => schoolService.updateApplication(app._id, { status: 'under_review' }), 'Marked under review')}>Start review</button>}
            {app.status !== 'interview' && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onEdit(app)}>Schedule interview / add score</button>}
            <label className="sc-check" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={!app.guardian?.email} /> Email the parent</label>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(() => schoolService.decide(app._id, { decision: 'rejected', notify }), 'Marked not admitted')}><RiCloseLine /> Decline</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(() => schoolService.decide(app._id, { decision: 'admitted', notify }), 'Offer of admission made')}><RiCheckLine /> Admit</button>
          </div>
        </>
      )}

      {app.status === 'admitted' && (
        <>
          <div className="sc-section">Enrol as a student</div>
          <div className="form-grid-2">
            <Field label="Class">
              <select className="form-input form-select" value={enrollClass} onChange={(e) => setEnrollClass(e.target.value)}>
                <option value="">— Choose —</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Admission number" hint="(blank = automatic)"><input className="form-input" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} /></Field>
          </div>
          <p className="cell-sub">Enrolling creates the student record and bills this term's fees for the class straight away.</p>
          <div className="sc-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" disabled={busy || !enrollClass} onClick={async () => {
              setBusy(true);
              try {
                const { data } = await schoolService.enroll(app._id, { classId: enrollClass, admissionNumber: admissionNumber || undefined });
                toast.success(`Enrolled — admission no. ${data.data.student.admissionNumber}`);
                onChanged();
                navigate(`/school/students/${data.data.student._id}`);
              } catch (e) { toast.error(errMsg(e)); setBusy(false); }
            }}><RiGraduationCapLine /> Enrol student</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => schoolService.updateApplication(app._id, { status: 'withdrawn' }), 'Marked as withdrawn')}>Parent declined the offer</button>
          </div>
        </>
      )}

      {app.status === 'enrolled' && app.studentId && (
        <div className="sc-note ok" style={{ marginTop: 16 }}>
          Enrolled as <Link to={`/school/students/${app.studentId._id}`}>{app.studentId.lastName} {app.studentId.firstName} ({app.studentId.admissionNumber})</Link>.
        </div>
      )}
      {['rejected', 'withdrawn'].includes(app.status) && (
        <div className="sc-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act(() => schoolService.updateApplication(app._id, { status: 'under_review' }), 'Re-opened')}>Re-open application</button>
        </div>
      )}
    </Modal>
  );
}
