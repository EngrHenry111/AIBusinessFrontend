import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiUserSettingsLine, RiLoader4Line, RiUserAddLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { Field, Modal } from './SchoolForms';
import useSchoolMe from './useSchoolMe';
import useSchoolLive from './useSchoolLive';
import { errMsg } from './schoolConstants';
import './School.css';

const ROLES = {
  '': { label: 'Full access (no role set)', hint: 'Same as admin. Pick a role to limit what they see.' },
  admin: { label: 'Admin', hint: 'Everything except owner-only actions.' },
  bursar: { label: 'Bursar', hint: 'Fees, payments, debtors and student records. No admissions or results.' },
  teacher: { label: 'Teacher', hint: 'Only their classes: register, scores for their subjects, report comments, timetable.' },
};

// Colleagues who can work on someone's behalf: they must be able to sign in,
// and a bursar has no access to classes or scores.
const helpersFrom = (staff) => staff.filter((u) => !u.noLogin && u.status === 'active' && u.schoolRole !== 'bursar');

export default function SchoolStaff() {
  const me = useSchoolMe();
  const [staff, setStaff] = useState(null);
  const [saving, setSaving] = useState(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => schoolService.getStaff().then(({ data }) => setStaff(data.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  useSchoolLive(load, ['staff', 'classes']);

  async function setRole(u, role) {
    setSaving(u._id);
    try { await schoolService.setStaffRole(u._id, role || null); toast.success(`${u.name}: ${ROLES[role || ''].label}`); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(null); }
  }

  async function setHelper(u, helperId) {
    setSaving(u._id);
    try { await schoolService.setStaffHelper(u._id, helperId || null); toast.success(helperId ? `Helper set for ${u.name}` : `Helper removed for ${u.name}`); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(null); }
  }

  if (!staff) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const helpers = helpersFrom(staff);
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiUserSettingsLine style={{ verticalAlign: '-3px' }} /> School staff</h1>
          <p>Decide what each team member can do. Teachers only see the classes and subjects they're assigned on the <Link to="/school/classes">Classes</Link> page.</p>
        </div>
        <div className="sc-actions">
          {me?.manager && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><RiUserAddLine /> Add staff</button>}
          <Link to="/team" className="btn btn-secondary">Invite team members</Link>
        </div>
      </div>

      <div className="sc-grid-2" style={{ marginBottom: 16 }}>
        {['admin', 'bursar', 'teacher'].map((k) => (
          <div key={k} className="card card-pad" style={{ padding: 14 }}><b>{ROLES[k].label}</b><div className="cell-sub">{ROLES[k].hint}</div></div>
        ))}
        <div className="card card-pad" style={{ padding: 14 }}><b>Owner / manager</b><div className="cell-sub">Always full access, plus voids, waivers, promotion, publishing results and the term report.</div></div>
      </div>

      {staff.every((u) => u.schoolRole === 'owner') && (
        <div className="sc-note warn" style={{ marginBottom: 16 }}>
          <b>No staff on your team yet.</b> Only owners/managers are listed. Invite teachers who will sign in on the <Link to="/team">Team</Link> page (they get an email to set a password), or use <b>Add staff</b> for anyone without a phone or email. Either way they'll appear here to give a role, and in the teacher lists on the Classes page.
        </div>
      )}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Team member</th><th>Teaches</th><th style={{ width: 260 }}>School role</th></tr></thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u._id}>
                  <td>
                    <span className="sc-strong">{u.name}</span>
                    {u.noLogin
                      ? <span className="cell-sub"><span className="badge badge-neutral">No login</span>{u.phone ? ` ${u.phone}` : ''}{u.status !== 'active' && ` · ${u.status}`}</span>
                      : <span className="cell-sub">{u.email}{u.status !== 'active' && ` · ${u.status}`}</span>}
                  </td>
                  <td>
                    {u.classTeacherOf.length > 0 && <span className="cell-sub" style={{ marginTop: 0 }}>Class teacher: {u.classTeacherOf.join(', ')}</span>}
                    {u.teaches.length > 0 && <span className="cell-sub">{u.teaches.slice(0, 6).join(', ')}{u.teaches.length > 6 ? ` +${u.teaches.length - 6}` : ''}</span>}
                    {!u.classTeacherOf.length && !u.teaches.length && <span className="cell-sub" style={{ marginTop: 0 }}>—</span>}
                    {u.schoolRole === 'teacher' && !u.classTeacherOf.length && !u.teaches.length && <span className="cell-sub sc-owing">Not assigned to any class yet</span>}
                  </td>
                  <td>
                    {u.schoolRole === 'owner' ? <span className="badge badge-brand">Owner / manager</span> : (
                      <select className="form-input form-select" value={u.schoolRole || ''} disabled={!me?.manager || saving === u._id}
                        onChange={(e) => setRole(u, e.target.value)} title={me?.manager ? '' : 'Only owners and managers can change roles'} aria-label={`School role for ${u.name}`}>
                        {Object.entries(ROLES).filter(([k]) => k || !u.noLogin).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                    {u.noLogin && (
                      <>
                        <label className="cell-sub" htmlFor={`helper-${u._id}`}>Colleague who helps them</label>
                        <select id={`helper-${u._id}`} className="form-input form-select" value={u.helperId || ''} disabled={!me?.manager || saving === u._id} onChange={(e) => setHelper(u, e.target.value)}>
                          <option value="">No one (admins only)</option>
                          {helpers.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                        </select>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adding && <AddStaffModal helpers={helpers} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

// Someone who works at the school but won't use the platform themselves.
function AddStaffModal({ helpers, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', role: 'teacher', helperId: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await schoolService.addStaff({ ...form, helperId: form.helperId || null });
      toast.success(`${form.name.trim()} added`);
      onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <Modal title="Add staff" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add staff'}</button></>}>
      <p className="cell-sub" style={{ marginTop: 0, marginBottom: 12 }}>
        For staff without a phone or email. They appear in the class, timetable and payroll lists like anyone else, but they can't sign in and don't use a plan seat.
      </p>
      <Field label="Full name"><input className="form-input" required minLength={2} maxLength={100} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Phone" hint="(optional)"><input className="form-input" type="tel" maxLength={40} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="School role">
        <select className="form-input form-select" value={form.role} onChange={(e) => set('role', e.target.value)}>
          {['teacher', 'bursar', 'admin'].map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
        </select>
      </Field>
      <Field label="Colleague who helps them" hint="(enters their scores and register from their own login)">
        <select className="form-input form-select" value={form.helperId} onChange={(e) => set('helperId', e.target.value)}>
          <option value="">No one (admins only)</option>
          {helpers.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
      </Field>
    </Modal>
  );
}
