import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiUserSettingsLine, RiLoader4Line } from 'react-icons/ri';
import { schoolService } from '../../services';
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

export default function SchoolStaff() {
  const me = useSchoolMe();
  const [staff, setStaff] = useState(null);
  const [saving, setSaving] = useState(null);
  const load = useCallback(() => schoolService.getStaff().then(({ data }) => setStaff(data.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  useSchoolLive(load, ['staff', 'classes']);

  async function setRole(u, role) {
    setSaving(u._id);
    try { await schoolService.setStaffRole(u._id, role || null); toast.success(`${u.name}: ${ROLES[role || ''].label}`); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(null); }
  }

  if (!staff) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiUserSettingsLine style={{ verticalAlign: '-3px' }} /> School staff</h1>
          <p>Decide what each team member can do. Teachers only see the classes and subjects they're assigned on the <Link to="/school/classes">Classes</Link> page.</p>
        </div>
        <Link to="/team" className="btn btn-secondary">Invite team members</Link>
      </div>

      <div className="sc-grid-2" style={{ marginBottom: 16 }}>
        {['admin', 'bursar', 'teacher'].map((k) => (
          <div key={k} className="card card-pad" style={{ padding: 14 }}><b>{ROLES[k].label}</b><div className="cell-sub">{ROLES[k].hint}</div></div>
        ))}
        <div className="card card-pad" style={{ padding: 14 }}><b>Owner / manager</b><div className="cell-sub">Always full access, plus voids, waivers, promotion, publishing results and the term report.</div></div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Team member</th><th>Teaches</th><th style={{ width: 260 }}>School role</th></tr></thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u._id}>
                  <td><span className="sc-strong">{u.name}</span><span className="cell-sub">{u.email}{u.status !== 'active' && ` · ${u.status}`}</span></td>
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
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
