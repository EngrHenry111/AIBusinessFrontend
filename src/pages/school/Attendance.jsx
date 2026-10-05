import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiCalendarCheckLine, RiLoader4Line, RiCheckDoubleLine, RiSaveLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import useSchoolLive from './useSchoolLive';
import { useClasses } from './SchoolForms';
import { ATTENDANCE, todayInput, fmtDateTime, errMsg } from './schoolConstants';
import './School.css';

export default function Attendance() {
  const [classes] = useClasses();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [view, setView] = useState('register');

  useEffect(() => { if (!classId && classes.length) setClassId(classes[0]._id); }, [classes, classId]);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiCalendarCheckLine style={{ verticalAlign: '-3px' }} /> Attendance</h1>
          <p>Take each class's register daily; totals feed the dashboard, student profiles and report cards.</p>
        </div>
        <div className="sc-actions">
          <select className="form-input form-select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
            {classes.length === 0 && <option value="">No classes yet</option>}
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {view === 'register' && <input className="form-input" type="date" max={todayInput()} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />}
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        {[['register', 'Daily register'], ['report', 'Term summary']].map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={`sc-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>)}
      </div>
      {!classId ? <div className="sc-note">Create a class first on the <Link to="/school/classes">Classes</Link> page.</div>
        : view === 'register' ? <Register classId={classId} date={date} /> : <Report classId={classId} />}
    </div>
  );
}

function Register({ classId, date }) {
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => schoolService.getRegister({ classId, date }).then(({ data: r }) => {
    setData(r.data);
    setMarks(Object.fromEntries(r.data.students.map((s) => [s._id, s.status || ''])));
    setDirty(false);
  }).catch((e) => toast.error(errMsg(e))), [classId, date]);
  useEffect(() => { setData(null); load(); }, [load]);
  // Another teacher saved this register — refresh unless we have unsaved changes.
  useSchoolLive((evt) => { if (evt.classId === classId && evt.date === date && !dirty) load(); }, ['attendance']);

  const mark = (id, st) => { setMarks((m) => ({ ...m, [id]: st })); setDirty(true); };
  const markAll = (st) => { setMarks(Object.fromEntries(data.students.map((s) => [s._id, st]))); setDirty(true); };
  const counts = Object.values(marks).reduce((a, s) => ({ ...a, [s || 'unmarked']: (a[s || 'unmarked'] || 0) + 1 }), {});

  async function save() {
    const records = Object.entries(marks).filter(([, s]) => s).map(([studentId, status]) => ({ studentId, status }));
    if (counts.unmarked && !window.confirm(`${counts.unmarked} student(s) are not marked. Save anyway?`)) return;
    setSaving(true);
    try { await schoolService.saveRegister({ classId, date, records }); toast.success('Register saved'); setDirty(false); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }

  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="card">
      <div className="sc-filters" style={{ justifyContent: 'space-between' }}>
        <span className="cell-sub" style={{ margin: 0 }}>
          {data.taken ? <>Saved{data.takenBy?.name && ` by ${data.takenBy.name}`} · {fmtDateTime(data.updatedAt)}</> : 'Not taken yet'}
          {' · '}{counts.present || 0} present, {counts.late || 0} late, {counts.absent || 0} absent{counts.excused ? `, ${counts.excused} excused` : ''}{counts.unmarked ? `, ${counts.unmarked} unmarked` : ''}
        </span>
        <div className="sc-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => markAll('present')} disabled={!data.students.length}><RiCheckDoubleLine /> All present</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty}><RiSaveLine /> {saving ? 'Saving…' : 'Save register'}</button>
        </div>
      </div>
      {data.students.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No active students in this class.</p> : (
        <div className="table-wrapper">
          <table className="table sc-register">
            <thead><tr><th>#</th><th>Student</th><th>Mark</th></tr></thead>
            <tbody>
              {data.students.map((s, i) => (
                <tr key={s._id}>
                  <td className="cell-sub">{i + 1}</td>
                  <td><span className="sc-strong">{s.name}</span><span className="cell-sub">{s.admissionNumber}</span></td>
                  <td>
                    <div className="sc-att" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
                      {Object.entries(ATTENDANCE).map(([k, v]) => (
                        <button key={k} type="button" role="radio" aria-checked={marks[s._id] === k} title={v.label} className={`${k} ${marks[s._id] === k ? 'on' : ''}`} onClick={() => mark(s._id, k)}>{v.short}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="sc-table-foot"><span>P = present · L = late (counts as attended) · A = absent · E = excused</span></div>
    </div>
  );
}

function Report({ classId }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => schoolService.attendanceReport({ classId }).then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e))), [classId]);
  useEffect(() => { setData(null); load(); }, [load]);
  useSchoolLive(load, ['attendance']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="card">
      <div className="sc-filters"><span className="cell-sub" style={{ margin: 0 }}>{data.days} register(s) taken this term for {data.class.name}.</span></div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Student</th><th className="num">Present</th><th className="num">Late</th><th className="num">Absent</th><th className="num">Excused</th><th className="num">Attendance</th></tr></thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s._id}>
                <td><Link to={`/school/students/${s._id}`} className="sc-strong">{s.name}</Link><span className="cell-sub">{s.admissionNumber}</span></td>
                <td className="num">{s.present}</td><td className="num">{s.late}</td>
                <td className="num">{s.absent > 0 ? <span className="sc-owing">{s.absent}</span> : 0}</td>
                <td className="num">{s.excused}</td>
                <td className="num sc-strong">{s.rate == null ? '—' : `${s.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
