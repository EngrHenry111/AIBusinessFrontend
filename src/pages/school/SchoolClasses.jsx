import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiBookOpenLine, RiAddLine, RiEditLine, RiDeleteBinLine, RiLoader4Line, RiMagicLine } from 'react-icons/ri';
import { schoolService, userService } from '../../services';
import useSchoolLive from './useSchoolLive';
import { Modal, Field } from './SchoolForms';
import { errMsg } from './schoolConstants';
import './School.css';

// One-click starting points for a typical Nigerian school.
const PRESETS = {
  Nursery: { section: 'Nursery', names: ['Creche', 'Nursery 1', 'Nursery 2'], subjects: ['Numeracy', 'Literacy', 'Rhymes', 'Creative Arts', 'Health Habits'] },
  Primary: { section: 'Primary', names: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'], subjects: ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Civic Education', 'CRS/IRS', 'Computer Studies', 'Verbal Reasoning', 'Quantitative Reasoning', 'Creative Arts'] },
  'Junior Secondary': { section: 'Junior Secondary', names: ['JSS 1', 'JSS 2', 'JSS 3'], subjects: ['Mathematics', 'English Language', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Business Studies', 'Agricultural Science', 'Computer Studies', 'CRS/IRS', 'French', 'Home Economics', 'Creative Arts'] },
  'Senior Secondary': { section: 'Senior Secondary', names: ['SS 1', 'SS 2', 'SS 3'], subjects: ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government', 'Literature in English', 'Geography', 'Civic Education', 'Further Mathematics', 'Agricultural Science', 'Data Processing'] },
};

export default function SchoolClasses() {
  const [classes, setClasses] = useState(null);
  const [team, setTeam] = useState([]);
  const [editing, setEditing] = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);

  const load = () => schoolService.getClasses().then(({ data }) => setClasses(data.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); userService.getTeam().then(({ data }) => setTeam(data.data || [])).catch(() => {}); }, []);
  useSchoolLive(load, ['classes', 'students']);

  if (!classes) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiBookOpenLine style={{ verticalAlign: '-3px' }} /> Classes &amp; subjects</h1>
          <p>Classes order promotions by level; each class's subjects drive score entry and report cards.</p>
        </div>
        <div className="sc-actions">
          <button className="btn btn-secondary" onClick={() => setPresetOpen(true)}><RiMagicLine /> Quick setup</button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><RiAddLine /> Add class</button>
        </div>
      </div>

      <div className="card">
        {classes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiBookOpenLine /></div>
            <h3>No classes yet</h3>
            <p>Use Quick setup to create Nursery, Primary, JSS or SS classes with standard subjects in one click.</p>
            <button className="btn btn-primary" onClick={() => setPresetOpen(true)}><RiMagicLine /> Quick setup</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Class</th><th>Class teacher</th><th>Subjects</th><th className="num">Students</th><th /></tr></thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c._id}>
                    <td><Link to={`/school/students?classId=${c._id}`} className="sc-strong">{c.name}</Link><span className="cell-sub">{[c.section, `Level ${c.level}`].filter(Boolean).join(' · ')}{!c.active && ' · inactive'}</span></td>
                    <td>{c.classTeacher?.name || <span className="cell-sub">—</span>}</td>
                    <td><span className="cell-sub" style={{ marginTop: 0 }}>{c.subjects?.length ? `${c.subjects.length}: ${c.subjects.slice(0, 4).join(', ')}${c.subjects.length > 4 ? '…' : ''}` : 'None yet'}</span></td>
                    <td className="num">{c.studentCount}{c.capacity ? ` / ${c.capacity}` : ''}</td>
                    <td className="num">
                      <div className="sc-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)} aria-label="Edit"><RiEditLine /></button>
                        <button className="btn btn-ghost btn-sm" aria-label="Delete" onClick={async () => {
                          if (!window.confirm(`Delete ${c.name}?`)) return;
                          try { await schoolService.deleteClass(c._id); toast.success('Class deleted'); load(); } catch (e) { toast.error(errMsg(e)); }
                        }}><RiDeleteBinLine /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <ClassModal cls={editing === 'new' ? null : editing} team={team} nextLevel={Math.max(0, ...classes.map((c) => c.level || 0)) + 1} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {presetOpen && <PresetModal existing={classes} onClose={() => setPresetOpen(false)} onDone={() => { setPresetOpen(false); load(); }} />}
    </div>
  );
}

function ClassModal({ cls, team, nextLevel, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: cls?.name || '', level: cls?.level ?? nextLevel, section: cls?.section || '',
    classTeacher: cls?.classTeacher?._id || '', capacity: cls?.capacity ?? '', active: cls?.active ?? true,
    subjects: (cls?.subjects || []).join('\n'),
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, level: Number(form.level) || 0, capacity: form.capacity === '' ? undefined : Number(form.capacity), subjects: form.subjects.split(/[\n,]/) };
    try {
      if (cls) await schoolService.updateClass(cls._id, payload); else await schoolService.createClass(payload);
      toast.success('Class saved'); onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={cls ? `Edit ${cls.name}` : 'Add class'} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-grid-2">
          <Field label="Name *"><input className="form-input" required placeholder="JSS 1A" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Section"><input className="form-input" placeholder="Junior Secondary" value={form.section} onChange={(e) => set('section', e.target.value)} /></Field>
          <Field label="Level" hint="(for promotion order)"><input className="form-input" type="number" value={form.level} onChange={(e) => set('level', e.target.value)} /></Field>
          <Field label="Capacity"><input className="form-input" type="number" min="0" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
        </div>
        <Field label="Class teacher">
          <select className="form-input form-select" value={form.classTeacher} onChange={(e) => set('classTeacher', e.target.value)}>
            <option value="">— None —</option>
            {team.map((u) => <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Subjects" hint="(one per line)"><textarea className="form-input form-textarea" rows={6} value={form.subjects} onChange={(e) => set('subjects', e.target.value)} /></Field>
        <label className="sc-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
      </div>
    </Modal>
  );
}

function PresetModal({ existing, onClose, onDone }) {
  const [picked, setPicked] = useState(['Primary', 'Junior Secondary', 'Senior Secondary']);
  const [arms, setArms] = useState('');
  const [busy, setBusy] = useState(false);
  const have = new Set(existing.map((c) => c.name.toLowerCase()));

  async function run() {
    setBusy(true);
    const armList = arms.split(',').map((a) => a.trim()).filter(Boolean);
    let level = Math.max(0, ...existing.map((c) => c.level || 0));
    let created = 0;
    for (const key of Object.keys(PRESETS).filter((k) => picked.includes(k))) {
      const p = PRESETS[key];
      for (const base of p.names) {
        level += 1;
        for (const name of armList.length ? armList.map((a) => `${base}${a}`) : [base]) {
          if (have.has(name.toLowerCase())) continue;
          try {
            // eslint-disable-next-line no-await-in-loop
            await schoolService.createClass({ name, level, section: p.section, subjects: p.subjects });
            created += 1;
          } catch { /* skip duplicates */ }
        }
      }
    }
    toast.success(`${created} class(es) created`);
    setBusy(false);
    onDone();
  }

  return (
    <Modal title="Quick setup" size="sc-modal-sm" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !picked.length} onClick={run}>{busy ? 'Creating…' : 'Create classes'}</button></>}>
      <p className="cell-sub" style={{ marginTop: 0 }}>Creates the classes with standard subjects. You can rename classes and edit subjects afterwards.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {Object.entries(PRESETS).map(([k, p]) => (
          <label key={k} className="sc-check">
            <input type="checkbox" checked={picked.includes(k)} onChange={(e) => setPicked(e.target.checked ? [...picked, k] : picked.filter((x) => x !== k))} />
            {k} <span className="form-hint">({p.names.join(', ')})</span>
          </label>
        ))}
      </div>
      <Field label="Arms" hint="(optional, comma-separated — e.g. A, B makes JSS 1A and JSS 1B)"><input className="form-input" placeholder="A, B" value={arms} onChange={(e) => setArms(e.target.value)} /></Field>
    </Modal>
  );
}
