import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiUserSettingsLine, RiLoader4Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe from './useHospitalMe';
import { useHospitalSettings } from './HospitalForms';
import { HOSPITAL_ROLES, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const WHAT = {
  admin: 'Everything',
  doctor: 'Patients, consultations, lab and drug orders, admissions, discharge',
  nurse: 'Check-in, vitals/triage, ward chart, transfers, sample collection',
  pharmacist: 'Prescriptions, pricing, dispensing and drug stock',
  lab: 'Lab worklist, results, verification and the test menu',
  cashier: 'Bills, payments, receipts, debtors and HMO claims (no medical notes)',
  records: 'Registration, check-in and appointments',
};

export default function HospitalStaff() {
  const me = useHospitalMe();
  const settings = useHospitalSettings();
  const [staff, setStaff] = useState(null);
  const load = useCallback(async () => { try { const { data } = await hospitalService.getStaff(); setStaff(data.data); } catch (e) { toast.error(errMsg(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['staff']);

  async function save(u, patch) {
    try {
      await hospitalService.setStaffRole(u._id, { role: u.hospitalRole === 'owner' ? undefined : u.hospitalRole, department: u.department, title: u.title, ...patch });
      toast.success('Saved');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiUserSettingsLine style={{ verticalAlign: '-3px' }} /> Hospital staff</h1>
          <p>Give each team member a hospital role. It decides what they see and can do. Invite new staff from <Link to="/team">Team</Link>.</p>
        </div>
      </div>
      <div className="card">
        {!staff ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
          <div className="table-wrapper"><table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Title</th><th>Clinic</th><th>Can</th></tr></thead>
            <tbody>{staff.map((u) => (
              <tr key={u._id}>
                <td><span className="sc-strong">{u.name}</span><span className="cell-sub">{u.email}</span></td>
                <td>{u.hospitalRole === 'owner' ? <span className="badge badge-brand">Owner / manager</span> : (
                  <select className="form-input form-select" aria-label={`Role for ${u.name}`} disabled={!me?.manager} value={u.hospitalRole || ''} onChange={(e) => save(u, { role: e.target.value || null })}>
                    <option value="">No role (full access)</option>
                    {Object.entries(HOSPITAL_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}</td>
                <td>{u.hospitalRole && u.hospitalRole !== 'owner' ? <input className="form-input" aria-label="Title" placeholder="Dr., Matron…" disabled={!me?.manager} defaultValue={u.title} onBlur={(e) => e.target.value !== u.title && save(u, { title: e.target.value })} /> : '—'}</td>
                <td>{u.hospitalRole && u.hospitalRole !== 'owner' ? (
                  <select className="form-input form-select" aria-label="Clinic" disabled={!me?.manager} value={u.department} onChange={(e) => save(u, { department: e.target.value })}>
                    <option value="">Any</option>{(settings?.departments || []).map((d) => <option key={d}>{d}</option>)}
                  </select>
                ) : '—'}</td>
                <td className="cell-sub" style={{ display: 'table-cell', maxWidth: 280 }}>{WHAT[u.hospitalRole === 'owner' || !u.hospitalRole ? 'admin' : u.hospitalRole]}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
