import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiTimeLine, RiLoader4Line, RiSaveLine, RiPrinterLine, RiAddLine, RiDeleteBinLine, RiCloseLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { useClasses, Modal, Field } from './SchoolForms';
import useSchoolMe, { can } from './useSchoolMe';
import useSchoolLive from './useSchoolLive';
import { TERMS, errMsg, fmtDate } from './schoolConstants';
import './School.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function Timetable() {
  const me = useSchoolMe();
  const isAdmin = can.admin(me);
  const [params] = useSearchParams();
  const [tab, setTab] = useState(['class', 'teacher', 'exams', 'bells'].includes(params.get('tab')) ? params.get('tab') : 'class');
  const tabs = [['class', 'Class timetable'], ['teacher', isAdmin ? 'Teacher timetables' : 'My timetable'], ['exams', 'Exam timetable'], ...(isAdmin ? [['bells', 'Bell times']] : [])];
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiTimeLine style={{ verticalAlign: '-3px' }} /> Timetable</h1>
          <p>Weekly lessons for each class, every teacher's week, and the exam timetable. Parents see their child's in the parent portal.</p>
        </div>
        <button className="btn btn-secondary sc-no-print" onClick={() => window.print()}><RiPrinterLine /> Print</button>
      </div>
      <div className="sc-tabs sc-no-print" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'class' && <ClassTimetable editable={isAdmin} />}
      {tab === 'teacher' && <TeacherTimetable me={me} isAdmin={isAdmin} />}
      {tab === 'exams' && <Exams editable={isAdmin} />}
      {tab === 'bells' && <BellTimes />}
    </div>
  );
}

function Grid({ periods, renderCell }) {
  return (
    <div className="table-wrapper" style={{ border: 0 }}>
      <table className="sc-tt">
        <thead><tr><th>Period</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={i} className={p.isBreak ? 'brk' : ''}>
              <th><div>{p.label}</div><span className="cell-sub" style={{ marginTop: 0 }}>{p.start}–{p.end}</span></th>
              {p.isBreak
                ? <td colSpan={5} className="brk-cell">{p.label}</td>
                : DAYS.map((_, d) => <td key={d}>{renderCell(d + 1, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassTimetable({ editable }) {
  const [classes] = useClasses();
  const [classId, setClassId] = useState('');
  const [data, setData] = useState(null);
  const [cells, setCells] = useState({}); // "day:period" -> subject
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!classId && classes.length) setClassId(classes[0]._id); }, [classes, classId]);
  const load = useCallback(() => {
    if (!classId) return;
    schoolService.getTimetable({ classId }).then(({ data: r }) => {
      setData(r.data);
      setCells(Object.fromEntries(r.data.slots.map((s) => [`${s.day}:${s.period}`, s.subject])));
      setDirty(false);
    }).catch((e) => toast.error(errMsg(e)));
  }, [classId]);
  useEffect(() => { setData(null); load(); }, [load]);
  useSchoolLive((evt) => { if (!dirty && (!evt.classId || evt.classId === classId)) load(); }, ['timetable']);

  if (!classes.length) return <div className="sc-note">Create classes first on the <Link to="/school/classes">Classes</Link> page.</div>;
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const teacherFor = Object.fromEntries((data.class.subjectTeachers || []).map((st) => [st.subject, st]));
  const lessons = Object.values(cells).filter(Boolean).length;

  async function save() {
    setSaving(true);
    try {
      const slots = Object.entries(cells).filter(([, sub]) => sub).map(([k, subject]) => {
        const [day, period] = k.split(':').map(Number);
        return { day, period, subject, teacher: teacherFor[subject]?.teacher };
      });
      await schoolService.saveTimetable({ classId, session: data.session, term: data.term, slots });
      toast.success('Timetable saved'); setDirty(false); load();
    } catch (e) { toast.error(errMsg(e), { duration: 8000 }); } finally { setSaving(false); }
  }

  return (
    <div className="card">
      <div className="sc-filters sc-no-print" style={{ justifyContent: 'space-between' }}>
        <div className="sc-actions">
          <select className="form-input form-select" value={classId} onChange={(e) => { if (!dirty || window.confirm('Discard unsaved changes?')) setClassId(e.target.value); }} aria-label="Class">
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <span className="cell-sub" style={{ margin: 0 }}>{data.session} · {TERMS[data.term]} · {lessons} lesson{lessons === 1 ? '' : 's'} a week</span>
        </div>
        {editable && <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}><RiSaveLine /> {saving ? 'Saving…' : 'Save timetable'}</button>}
      </div>
      {editable && !data.class.subjects?.length && <div className="sc-note warn" style={{ margin: 16 }}>Add subjects to {data.class.name} on the Classes page first.</div>}
      <div className="sc-doc" style={{ border: 0, maxWidth: 'none' }}>
        <p className="sc-doc-title">{data.class.name} timetable — {TERMS[data.term]}, {data.session}</p>
        <Grid periods={data.periods} renderCell={(day, period) => {
          const sub = cells[`${day}:${period}`] || '';
          const t = teacherFor[sub]?.teacherName;
          if (!editable) return sub ? <><div className="sc-strong">{sub}</div>{t && <span className="cell-sub">{t}</span>}</> : null;
          return (
            <>
              <select className="form-input form-select sc-tt-select" value={sub} aria-label={`${DAYS[day - 1]} period ${data.periods[period].label}`}
                onChange={(e) => { setCells((c) => ({ ...c, [`${day}:${period}`]: e.target.value })); setDirty(true); }}>
                <option value="">—</option>
                {data.class.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {t && <span className="cell-sub">{t}</span>}
            </>
          );
        }} />
      </div>
      {editable && <div className="sc-table-foot sc-no-print"><span>Teachers come from each subject's teacher on the Classes page. Saving is refused if a teacher would be in two classes at once.</span></div>}
    </div>
  );
}

function TeacherTimetable({ me, isAdmin }) {
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState(isAdmin ? '' : 'me');
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!isAdmin) return;
    schoolService.getStaff().then(({ data: r }) => {
      const list = r.data.filter((u) => u.classTeacherOf.length || u.teaches.length);
      setStaff(list);
      if (list[0]) setUserId(list[0]._id);
    }).catch(() => {});
  }, [isAdmin]);
  useEffect(() => {
    if (!userId) return;
    setData(null);
    schoolService.teacherTimetable(userId).then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [userId]);

  if (isAdmin && !staff.length) return <div className="sc-note">No teachers are assigned to subjects yet. Assign them on the <Link to="/school/classes">Classes</Link> page.</div>;
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const at = Object.fromEntries(data.slots.map((s) => [`${s.day}:${s.period}`, s]));
  return (
    <div className="card">
      <div className="sc-filters sc-no-print">
        {isAdmin && (
          <select className="form-input form-select" value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Teacher">
            {staff.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}
        <span className="cell-sub" style={{ margin: 0 }}>{data.lessonsPerWeek} lesson{data.lessonsPerWeek === 1 ? '' : 's'} a week{me && !isAdmin && me.teaching?.length ? ` · ${me.teaching.map((c) => c.name).join(', ')}` : ''}</span>
      </div>
      <div className="sc-doc" style={{ border: 0, maxWidth: 'none' }}>
        <p className="sc-doc-title">{data.teacher.name} — {TERMS[data.term]}, {data.session}</p>
        <Grid periods={data.periods} renderCell={(day, period) => {
          const s = at[`${day}:${period}`];
          return s ? <><div className="sc-strong">{s.className}</div><span className="cell-sub">{s.subject}</span></> : null;
        }} />
      </div>
    </div>
  );
}

function Exams({ editable }) {
  const [classes] = useClasses();
  const [papers, setPapers] = useState(null);
  const [period, setPeriod] = useState(null);
  const [classId, setClassId] = useState('');
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => schoolService.getExams({ classId: classId || undefined }).then(({ data }) => { setPapers(data.data); setPeriod({ session: data.session, term: data.term }); })
    .catch((e) => toast.error(errMsg(e))), [classId]);
  useEffect(() => { load(); }, [load]);
  useSchoolLive(load, ['exams']);

  if (!papers) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const byDate = papers.reduce((m, p) => { (m[p.date] = m[p.date] || []).push(p); return m; }, {});
  return (
    <div className="card">
      <div className="sc-filters sc-no-print" style={{ justifyContent: 'space-between' }}>
        <select className="form-input form-select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {editable && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><RiAddLine /> Add paper</button>}
      </div>
      <div className="sc-doc" style={{ border: 0, maxWidth: 'none' }}>
        <p className="sc-doc-title">Examination timetable — {TERMS[period.term]}, {period.session}{classId ? ` · ${classes.find((c) => c._id === classId)?.name || ''}` : ''}</p>
        {papers.length === 0 ? <p className="cell-sub">No papers scheduled yet.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Class</th><th>Subject</th><th>Venue</th><th>Invigilator</th>{editable && <th className="sc-no-print" />}</tr></thead>
            <tbody>
              {Object.entries(byDate).map(([date, list]) => list.map((p, i) => (
                <tr key={p._id}>
                  {i === 0 && <td rowSpan={list.length}><b>{new Date(`${date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short' })}</b> {fmtDate(`${date}T12:00:00`)}</td>}
                  <td>{p.start}–{p.end}</td><td>{p.classId?.name}</td><td>{p.subject}</td><td>{p.venue || '—'}</td><td>{p.invigilator?.name || '—'}</td>
                  {editable && (
                    <td className="sc-no-print">
                      <button className="btn btn-ghost btn-sm" aria-label="Remove paper" onClick={async () => {
                        if (!window.confirm(`Remove ${p.classId?.name} ${p.subject}?`)) return;
                        try { await schoolService.deleteExam(p._id); load(); } catch (e) { toast.error(errMsg(e)); }
                      }}><RiDeleteBinLine /></button>
                    </td>
                  )}
                </tr>
              )))}
            </tbody>
          </table>
        )}
      </div>
      {adding && <ExamModal classes={classes} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function ExamModal({ classes, onClose, onSaved }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ classIds: [], subject: '', date: '', start: '09:00', end: '11:00', venue: '', invigilator: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { schoolService.getStaff().then(({ data }) => setStaff(data.data)).catch(() => {}); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const subjects = [...new Set(classes.filter((c) => form.classIds.includes(c._id)).flatMap((c) => c.subjects || []))];
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await schoolService.createExams({ ...form, invigilator: form.invigilator || undefined });
      toast.success(`${data.data.length} paper(s) scheduled`); onSaved();
    } catch (err) { toast.error(errMsg(err), { duration: 8000 }); } finally { setBusy(false); }
  }
  return (
    <Modal title="Schedule an exam paper" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !form.classIds.length}>Schedule</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Classes" hint="(pick every arm sitting this paper)">
          <div className="sc-chips">
            {classes.map((c) => <button type="button" key={c._id} className={`sc-chip ${form.classIds.includes(c._id) ? 'on' : ''}`} onClick={() => set('classIds', form.classIds.includes(c._id) ? form.classIds.filter((x) => x !== c._id) : [...form.classIds, c._id])}>{c.name}</button>)}
          </div>
        </Field>
        <Field label="Subject *">
          <input className="form-input" required list="exam-subjects" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          <datalist id="exam-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <div className="form-grid-3">
          <Field label="Date *"><input className="form-input" type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Starts *"><input className="form-input" type="time" required value={form.start} onChange={(e) => set('start', e.target.value)} /></Field>
          <Field label="Ends *"><input className="form-input" type="time" required value={form.end} onChange={(e) => set('end', e.target.value)} /></Field>
        </div>
        <div className="form-grid-2">
          <Field label="Venue"><input className="form-input" placeholder="Hall, Room 4…" value={form.venue} onChange={(e) => set('venue', e.target.value)} /></Field>
          <Field label="Invigilator">
            <select className="form-input form-select" value={form.invigilator} onChange={(e) => set('invigilator', e.target.value)}>
              <option value="">—</option>
              {staff.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </Field>
        </div>
        <p className="cell-sub" style={{ margin: 0 }}>Refused if a class already has a paper then, or the invigilator is in another room.</p>
      </div>
    </Modal>
  );
}

function BellTimes() {
  const [periods, setPeriods] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { schoolService.getSettings().then(({ data }) => setPeriods(data.data.periods)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!periods) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const set = (i, k, v) => setPeriods(periods.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  async function save() {
    setSaving(true);
    try { const { data } = await schoolService.savePeriods(periods); setPeriods(data.data); toast.success('Bell times saved'); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }
  return (
    <div className="card card-pad" style={{ maxWidth: 640 }}>
      <div className="sc-card-title"><span>School day</span><button className="btn btn-primary btn-sm" disabled={saving} onClick={save}><RiSaveLine /> Save</button></div>
      {periods.map((p, i) => (
        <div key={i} className="sc-item-row" style={{ gridTemplateColumns: 'minmax(80px, 1fr) 140px 140px auto auto', alignItems: 'center' }}>
          <input className="form-input" value={p.label} aria-label="Label" onChange={(e) => set(i, 'label', e.target.value)} />
          <input className="form-input" type="time" value={p.start} aria-label="Start" onChange={(e) => set(i, 'start', e.target.value)} />
          <input className="form-input" type="time" value={p.end} aria-label="End" onChange={(e) => set(i, 'end', e.target.value)} />
          <label className="sc-check"><input type="checkbox" checked={Boolean(p.isBreak)} onChange={(e) => set(i, 'isBreak', e.target.checked)} /> Break</label>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove period" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}><RiCloseLine /></button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const last = periods[periods.length - 1]; setPeriods([...periods, { label: '', start: last?.end || '08:00', end: last?.end || '08:40' }]); }}><RiAddLine /> Add period</button>
      <p className="cell-sub">Removing periods from the end also removes any lessons in them.</p>
    </div>
  );
}
