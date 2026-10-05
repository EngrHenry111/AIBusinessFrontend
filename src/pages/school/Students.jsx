import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import {
  RiGraduationCapLine, RiSearchLine, RiAddLine, RiLoader4Line, RiUpload2Line,
  RiDownload2Line, RiArrowUpLine,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import useSchoolLive from './useSchoolLive';
import useSchoolMe, { can } from './useSchoolMe';
import { StudentFormModal, Modal, Field, useClasses } from './SchoolForms';
import { STUDENT_STATUS, money, errMsg } from './schoolConstants';
import './School.css';

export default function Students() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const me = useSchoolMe();
  const showFees = can.finance(me);
  const [classes, reloadClasses] = useClasses();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const classId = params.get('classId') || '';
  const status = params.get('status') || 'active';
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(params.get('import') ? 'import' : null);

  const setFilter = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p); setPage(1); };

  const load = useCallback(async () => {
    try {
      const { data } = await schoolService.getStudents({ classId: classId || undefined, status, search: search || undefined, page, limit: 50 });
      setStudents(data.data);
      setPagination(data.pagination);
    } catch (e) { toast.error(errMsg(e, 'Failed to load students')); }
    finally { setLoading(false); }
  }, [classId, status, search, page]);

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useSchoolLive(load, ['students', 'payment', 'fees']);

  async function exportCsv() {
    try {
      const { data } = await schoolService.getStudents({ classId: classId || undefined, status, limit: 500 });
      const csv = Papa.unparse(data.data.map((s) => ({
        admissionNumber: s.admissionNumber, lastName: s.lastName, firstName: s.firstName, otherNames: s.otherNames || '',
        gender: s.gender || '', className: s.classId?.name || '', status: s.status,
        guardianName: s.guardian?.name || '', guardianPhone: s.guardian?.phone || '', guardianEmail: s.guardian?.email || '',
        balanceOwed: s.balance,
      })));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'students.csv';
      a.click();
    } catch (e) { toast.error(errMsg(e, 'Export failed')); }
  }

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiGraduationCapLine style={{ verticalAlign: '-3px' }} /> Students</h1>
          <p>{pagination.total.toLocaleString()} {STUDENT_STATUS[status]?.label.toLowerCase() || ''} student{pagination.total === 1 ? '' : 's'}{classId && classes.length ? ` in ${classes.find((c) => c._id === classId)?.name || 'this class'}` : ''}.</p>
        </div>
        <div className="sc-actions">
          {me?.manager && <button className="btn btn-secondary" onClick={() => setModal('promote')}><RiArrowUpLine /> Promote</button>}
          {showFees && <button className="btn btn-secondary" onClick={exportCsv}><RiDownload2Line /> Export</button>}
          {can.admin(me) && <button className="btn btn-secondary" onClick={() => setModal('import')}><RiUpload2Line /> Import</button>}
          {can.admin(me) && <button className="btn btn-primary" onClick={() => setModal('new')}><RiAddLine /> Add student</button>}
        </div>
      </div>

      <div className="card">
        <div className="sc-filters">
          <div className="sc-search"><RiSearchLine /><input placeholder="Search name, admission number, parent or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <select className="form-input form-select" value={classId} onChange={(e) => setFilter('classId', e.target.value)} aria-label="Class">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            <option value="none">No class assigned</option>
          </select>
          <select className="form-input form-select" value={status} onChange={(e) => setFilter('status', e.target.value === 'active' ? '' : e.target.value)} aria-label="Status">
            {Object.entries(STUDENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="all">All statuses</option>
          </select>
        </div>
        {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div> : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiGraduationCapLine /></div>
            <h3>No students found</h3>
            <p>Add students one by one, import them from a spreadsheet, or enrol admitted applicants.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Student</th><th>Class</th><th>Parent / guardian</th>{showFees && <th className="num">Fees owed</th>}<th>Status</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id} className="sc-row" onClick={() => navigate(`/school/students/${s._id}`)}>
                      <td><div className="sc-strong">{s.fullName}</div><span className="cell-sub">{s.admissionNumber}{s.gender && ` · ${s.gender === 'male' ? 'M' : 'F'}`}</span></td>
                      <td>{s.classId?.name || <span className="cell-sub">—</span>}</td>
                      <td>{s.guardian?.name || '—'}<span className="cell-sub">{s.guardian?.phone}</span></td>
                      {showFees && <td className="num">{s.balance > 0 ? <span className="sc-owing">{money(s.balance)}</span> : <span className="cell-sub">—</span>}</td>}
                      <td><span className={`badge badge-${STUDENT_STATUS[s.status]?.badge}`}>{STUDENT_STATUS[s.status]?.label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="sc-table-foot">
                <span>Page {pagination.page} of {pagination.pages}</span>
                <div className="sc-actions">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal === 'new' && <StudentFormModal classes={classes} onClose={() => setModal(null)} onSaved={(s) => navigate(`/school/students/${s._id}`)} />}
      {modal === 'import' && <ImportModal onClose={() => { setModal(null); if (params.get('import')) setFilter('import', ''); }} onDone={() => { load(); reloadClasses(); }} />}
      {modal === 'promote' && <PromoteModal classes={classes} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); reloadClasses(); }} />}
    </div>
  );
}

const TEMPLATE_COLUMNS = ['admissionNumber', 'lastName', 'firstName', 'otherNames', 'gender', 'dateOfBirth', 'className', 'guardianName', 'guardianPhone', 'guardianEmail', 'guardianRelationship', 'address'];

function ImportModal({ onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function downloadTemplate() {
    const csv = Papa.unparse({ fields: TEMPLATE_COLUMNS, data: [['', 'Okafor', 'Chidera', 'Grace', 'F', '2014-03-21', 'JSS 1A', 'Mr. Emeka Okafor', '08031234567', 'emeka@example.com', 'Father', '12 Allen Ave, Ikeja']] });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'students-template.csv';
    a.click();
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => { setRows(res.data.filter((r) => r.firstName || r.lastName)); setResult(null); },
      error: () => toast.error('Could not read that file'),
    });
  }

  async function run() {
    setBusy(true);
    try {
      const { data } = await schoolService.bulkCreateStudents(rows);
      setResult(data.data);
      toast.success(`${data.data.created} student(s) imported`);
      onDone();
    } catch (e) { toast.error(errMsg(e, 'Import failed')); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Import students" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" disabled={!rows.length || busy || result} onClick={run}>{busy ? 'Importing…' : `Import ${rows.length || ''} student${rows.length === 1 ? '' : 's'}`}</button></>}>
      <p className="cell-sub" style={{ marginTop: 0 }}>Upload a CSV with these columns. <b>className</b> must match a class you've created. Leave <b>admissionNumber</b> blank to number students automatically.</p>
      <div className="sc-note" style={{ marginBottom: 12, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-word' }}>{TEMPLATE_COLUMNS.join(', ')}</div>
      <div className="sc-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}><RiDownload2Line /> Download template</button>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
      </div>
      {rows.length > 0 && !result && <div className="sc-note">{rows.length} row(s) ready. First: {rows[0].lastName} {rows[0].firstName}{rows[0].className ? ` (${rows[0].className})` : ''}</div>}
      {result && (
        <div className={`sc-note ${result.failed.length ? 'warn' : 'ok'}`}>
          {result.created} imported{result.failed.length ? `, ${result.failed.length} skipped:` : '.'}
          {result.failed.length > 0 && <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{result.failed.slice(0, 30).map((f) => <li key={f.row}>Row {f.row} {f.name}: {f.error}</li>)}</ul>}
        </div>
      )}
    </Modal>
  );
}

function PromoteModal({ classes, onClose, onDone }) {
  const [fromClassId, setFrom] = useState('');
  const [toClassId, setTo] = useState('');
  const [graduate, setGraduate] = useState(false);
  const [busy, setBusy] = useState(false);
  const from = classes.find((c) => c._id === fromClassId);

  // Suggest the next class up by level.
  useEffect(() => {
    if (!from) return;
    const next = classes.filter((c) => c.level > from.level).sort((a, b) => a.level - b.level)[0];
    setTo(next?._id || '');
  }, [fromClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    const target = graduate ? 'graduate them' : `move them to ${classes.find((c) => c._id === toClassId)?.name}`;
    if (!window.confirm(`${from.studentCount} active student(s) in ${from.name} — ${target}?`)) return;
    setBusy(true);
    try {
      const { data } = await schoolService.promote({ fromClassId, toClassId: graduate ? undefined : toClassId, graduate });
      toast.success(`${data.data.moved} student(s) ${graduate ? 'graduated' : 'promoted'}`);
      onDone();
    } catch (err) { toast.error(errMsg(err, 'Promotion failed')); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Promote students" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !fromClassId || (!graduate && !toClassId)}>{busy ? 'Working…' : graduate ? 'Graduate class' : 'Promote class'}</button></>}>
      <p className="cell-sub" style={{ marginTop: 0 }}>At the end of a session, move a whole class up. Tip: promote from the top class down (graduate SS 3 first, then SS 2 → SS 3…) so classes don't mix. To hold a student back, change their class on their profile afterwards.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="From class">
          <select className="form-input form-select" required value={fromClassId} onChange={(e) => setFrom(e.target.value)}>
            <option value="">— Choose —</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.studentCount})</option>)}
          </select>
        </Field>
        <label className="sc-check"><input type="checkbox" checked={graduate} onChange={(e) => setGraduate(e.target.checked)} /> Final class — graduate these students</label>
        {!graduate && (
          <Field label="To class">
            <select className="form-input form-select" required value={toClassId} onChange={(e) => setTo(e.target.value)}>
              <option value="">— Choose —</option>
              {classes.filter((c) => c._id !== fromClassId).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
