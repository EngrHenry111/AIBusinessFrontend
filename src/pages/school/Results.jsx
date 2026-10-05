import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSchoolMe from './useSchoolMe';
import toast from 'react-hot-toast';
import { RiFileList3Line, RiLoader4Line, RiSaveLine, RiDownload2Line, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import Papa from 'papaparse';
import { schoolService } from '../../services';
import { useClasses } from './SchoolForms';
import { useAuth } from '../../context/AuthContext';
import useSchoolLive from './useSchoolLive';
import { TERMS, errMsg, fmtDateTime } from './schoolConstants';
import './School.css';

export default function Results() {
  const [classes] = useClasses();
  const [settings, setSettings] = useState(null);
  const [params] = useSearchParams();
  const [classId, setClassId] = useState(params.get('classId') || '');
  const [period, setPeriod] = useState(null);
  const [view, setView] = useState('entry');

  useEffect(() => {
    schoolService.getSettings().then(({ data }) => { setSettings(data.data); setPeriod({ session: data.data.currentSession, term: data.data.currentTerm }); }).catch(() => {});
  }, []);
  useEffect(() => { if (!classId && classes.length) setClassId(classes[0]._id); }, [classes, classId]);
  const cls = classes.find((c) => c._id === classId);

  if (!period) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiFileList3Line style={{ verticalAlign: '-3px' }} /> Results</h1>
          <p>Enter CA and exam scores per subject; totals, grades, class positions and report cards are worked out for you.</p>
        </div>
        <div className="sc-actions">
          <select className="form-input form-select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input className="form-input" style={{ width: 110 }} value={period.session} onChange={(e) => setPeriod({ ...period, session: e.target.value })} aria-label="Session" />
          <select className="form-input form-select" value={period.term} onChange={(e) => setPeriod({ ...period, term: e.target.value })} aria-label="Term">
            {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        {[['entry', 'Score entry'], ['broadsheet', 'Broadsheet & report cards']].map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={`sc-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>)}
      </div>
      {!cls ? <div className="sc-note">Create classes (with subjects) on the <Link to="/school/classes">Classes</Link> page first.</div>
        : view === 'entry' ? <ScoreEntry cls={cls} period={period} settings={settings} />
          : <Broadsheet classId={classId} period={period} />}
    </div>
  );
}

function ScoreEntry({ cls, period, settings }) {
  const me = useSchoolMe();
  const [params] = useSearchParams();
  // A subject teacher sees only their subjects; the class teacher all of them.
  const mine = me?.role === 'teacher' ? me.teaching.find((t) => t._id === cls._id) : null;
  const subjects = mine && !mine.classTeacher ? (cls.subjects || []).filter((s) => mine.subjects.includes(s)) : (cls.subjects || []);
  const [subject, setSubject] = useState(params.get('subject') && subjects.includes(params.get('subject')) ? params.get('subject') : subjects[0] || '');
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!subjects.includes(subject)) setSubject(subjects[0] || ''); }, [cls._id, subjects.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    if (!subject) { setSheet(null); return; }
    schoolService.getScoreSheet({ classId: cls._id, subject, ...period }).then(({ data }) => {
      setSheet(data.data);
      setRows(Object.fromEntries(data.data.students.map((s) => [s._id, { ca: s.ca ?? '', exam: s.exam ?? '' }])));
      setDirty(false);
    }).catch((e) => toast.error(errMsg(e)));
  }, [cls._id, subject, period]);
  useEffect(() => { load(); }, [load]);

  const caMax = sheet?.caMax ?? settings?.caMax ?? 40;
  const examMax = 100 - caMax;
  const grade = (total) => [...(settings?.gradingScale || [])].sort((a, b) => b.min - a.min).find((g) => total >= g.min)?.grade || '';
  const set = (id, k, v) => { setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } })); setDirty(true); };
  const bad = (v, max) => v !== '' && (Number(v) < 0 || Number(v) > max || Number.isNaN(Number(v)));
  const anyBad = Object.values(rows).some((r) => bad(r.ca, caMax) || bad(r.exam, examMax));

  async function save() {
    setSaving(true);
    try {
      const scores = Object.entries(rows).map(([studentId, r]) => ({ studentId, ca: r.ca, exam: r.exam }));
      const { data } = await schoolService.saveScoreSheet({ classId: cls._id, subject, ...period, scores });
      toast.success(`${data.data.saved} score(s) saved`);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }

  if (!cls.subjects?.length) return <div className="sc-note warn">{cls.name} has no subjects yet. Add them on the <Link to="/school/classes">Classes</Link> page.</div>;
  return (
    <div className="card">
      <div className="sc-filters" style={{ justifyContent: 'space-between' }}>
        <select className="form-input form-select" value={subject} onChange={(e) => { if (!dirty || window.confirm('Discard unsaved scores?')) setSubject(e.target.value); }} aria-label="Subject">
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="cell-sub" style={{ margin: 0 }}>CA out of {caMax} · Exam out of {examMax}. Clear both boxes to remove a score.</span>
        <button className="btn btn-primary btn-sm" disabled={!dirty || saving || anyBad} onClick={save}><RiSaveLine /> {saving ? 'Saving…' : 'Save scores'}</button>
      </div>
      {!sheet ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : sheet.students.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No active students in this class.</p> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Student</th><th className="num">CA ({caMax})</th><th className="num">Exam ({examMax})</th><th className="num">Total</th><th>Grade</th></tr></thead>
            <tbody>
              {sheet.students.map((s) => {
                const r = rows[s._id] || { ca: '', exam: '' };
                const has = r.ca !== '' || r.exam !== '';
                const total = (Number(r.ca) || 0) + (Number(r.exam) || 0);
                return (
                  <tr key={s._id}>
                    <td><span className="sc-strong">{s.name}</span><span className="cell-sub">{s.admissionNumber}</span></td>
                    <td className="num"><input className={`form-input sc-score-input ${bad(r.ca, caMax) ? 'bad' : ''}`} type="number" min="0" max={caMax} step="0.5" value={r.ca} onChange={(e) => set(s._id, 'ca', e.target.value)} aria-label={`CA for ${s.name}`} /></td>
                    <td className="num"><input className={`form-input sc-score-input ${bad(r.exam, examMax) ? 'bad' : ''}`} type="number" min="0" max={examMax} step="0.5" value={r.exam} onChange={(e) => set(s._id, 'exam', e.target.value)} aria-label={`Exam for ${s.name}`} /></td>
                    <td className="num sc-strong">{has ? total : '—'}</td>
                    <td>{has ? grade(total) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Broadsheet({ classId, period }) {
  const { user } = useAuth();
  const canPublish = ['manager', 'company_owner', 'super_admin'].includes(user?.role);
  const [data, setData] = useState(null);
  const [publication, setPublication] = useState(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadPublication = useCallback(() => schoolService.publications().then(({ data: r }) => {
    setPublication(r.data.find((p) => p.classId === classId && p.session === period.session && p.term === period.term) || null);
  }).catch(() => {}), [classId, period]);
  useEffect(() => {
    setData(null);
    schoolService.broadsheet({ classId, ...period }).then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
    loadPublication();
  }, [classId, period, loadPublication]);
  useSchoolLive((evt) => { if (evt.classId === classId) loadPublication(); }, ['results']);

  async function togglePublish() {
    const publish = !publication;
    if (publish && !window.confirm(`Release ${data.class.name}'s ${TERMS[period.term]} results to parents?${notify ? ' Parents will be emailed/texted a link.' : ''}`)) return;
    setBusy(true);
    try {
      const { data: r } = await schoolService.publishResults({ classId, ...period, publish, notify: publish && notify });
      toast.success(publish ? `Results published${r.data.notifying ? ` — notifying ${r.data.notifying} parent(s)` : ''}` : 'Results hidden from parents');
      loadPublication();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const exportCsv = () => {
    const csv = Papa.unparse(data.rows.map((r) => ({ position: r.position || '', admissionNumber: r.admissionNumber, student: r.name, ...Object.fromEntries(data.subjects.map((s) => [s, r.scores[s] ?? ''])), total: r.total ?? '', average: r.average ?? '' })));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `broadsheet-${data.class.name}-${period.term}.csv`;
    a.click();
  };

  return (
    <div className="card">
      <div className="sc-filters" style={{ justifyContent: 'space-between' }}>
        <span className="cell-sub" style={{ margin: 0 }}>
          {data.class.name} · {data.session} {TERMS[data.term]} — ranked by average.{' '}
          {publication
            ? <span className="badge badge-success"><RiEyeLine /> Published {fmtDateTime(publication.publishedAt)}</span>
            : <span className="badge badge-neutral"><RiEyeOffLine /> Not visible to parents</span>}
        </span>
        <div className="sc-actions">
          {canPublish && !publication && <label className="sc-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify parents</label>}
          {canPublish && <button className={`btn btn-sm ${publication ? 'btn-secondary' : 'btn-primary'}`} disabled={busy || !data.rows.some((r) => r.total != null)} onClick={togglePublish}>{publication ? <><RiEyeOffLine /> Unpublish</> : <><RiEyeLine /> Publish to parents</>}</button>}
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}><RiDownload2Line /> Export</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="table sc-broadsheet">
          <thead><tr><th>Pos.</th><th>Student</th>{data.subjects.map((s) => <th key={s} className="num" title={s}>{s.length > 12 ? `${s.slice(0, 11)}…` : s}</th>)}<th className="num">Total</th><th className="num">Avg</th><th /></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r._id}>
                <td className="sc-strong">{r.position || '—'}</td>
                <td><span className="sc-strong">{r.name}</span><span className="cell-sub">{r.admissionNumber}</span></td>
                {data.subjects.map((s) => <td key={s} className="num">{r.scores[s] ?? '—'}</td>)}
                <td className="num">{r.total ?? '—'}</td>
                <td className="num sc-strong">{r.average ?? '—'}</td>
                <td className="num">{r.total != null && <Link className="btn btn-ghost btn-sm" to={`/school/report-card/${r._id}?session=${encodeURIComponent(period.session)}&term=${period.term}`}>Report card</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
