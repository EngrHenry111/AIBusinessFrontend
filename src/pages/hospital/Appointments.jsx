import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiCalendarLine, RiAddLine, RiLoader4Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import { Modal, Field, PatientPicker, CheckInModal, useDoctors, useHospitalSettings } from './HospitalForms';
import { fullName, todayInput, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const STATUS = { booked: { label: 'Booked', badge: 'brand' }, checked_in: { label: 'Arrived', badge: 'success' }, cancelled: { label: 'Cancelled', badge: 'neutral' }, no_show: { label: 'Did not come', badge: 'danger' } };
const addDays = (d, n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export default function Appointments() {
  const doctors = useDoctors();
  const [from, setFrom] = useState(todayInput());
  const [days, setDays] = useState(1);
  const [doctorId, setDoctorId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await hospitalService.getAppointments({ from, to: addDays(from, days - 1), doctorId: doctorId || undefined });
      setRows(data.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [from, days, doctorId]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['appointments', 'visits']);

  async function setStatus(a, status) {
    try { await hospitalService.updateAppointment(a._id, { status }); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  const byDate = rows.reduce((m, a) => { (m[a.date] = m[a.date] || []).push(a); return m; }, {});

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiCalendarLine style={{ verticalAlign: '-3px' }} /> Appointments</h1>
          <p>Book patients with a doctor or clinic. On the day, check them in from here.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><RiAddLine /> Book appointment</button>
      </div>
      <div className="card">
        <div className="sc-filters">
          <input className="form-input" type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value || todayInput())} style={{ maxWidth: 170 }} />
          <select className="form-input form-select" aria-label="Range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>That day</option><option value={7}>7 days</option><option value={30}>30 days</option>
          </select>
          <select className="form-input form-select" aria-label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">All doctors</option>{doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><RiCalendarLine /></div><h3>No appointments</h3><p>Nothing booked for these dates.</p></div>
        ) : Object.entries(byDate).map(([date, list]) => (
          <div key={date}>
            {days > 1 && <div className="sc-card-title card-pad" style={{ marginBottom: 0 }}>{new Date(`${date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</div>}
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Time</th><th>Patient</th><th>Doctor / clinic</th><th>Reason</th><th>Status</th><th /></tr></thead>
              <tbody>{list.map((a) => (
                <tr key={a._id}>
                  <td className="sc-strong">{a.time || '—'}</td>
                  <td><Link to={`/hospital/patients/${a.patientId?._id}`} className="sc-strong">{fullName(a.patientId)}</Link><span className="cell-sub">{a.patientId?.hospitalNumber}{a.patientId?.phone ? ` · ${a.patientId.phone}` : ''}</span></td>
                  <td>{a.doctorId?.name || 'Any doctor'}<span className="cell-sub">{a.department}</span></td>
                  <td>{a.reason || '—'}</td>
                  <td><span className={`badge badge-${STATUS[a.status].badge}`}>{STATUS[a.status].label}</span></td>
                  <td className="num">
                    {a.status === 'booked' && (
                      <span className="sc-actions" style={{ justifyContent: 'flex-end' }}>
                        {a.date === todayInput() && <button className="btn btn-primary btn-sm" onClick={() => setModal({ checkin: a })}>Check in</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ edit: a })}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'no_show')}>No show</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'cancelled')}>Cancel</button>
                      </span>
                    )}
                    {a.status === 'checked_in' && a.visitId && <Link className="btn btn-ghost btn-sm" to={`/hospital/visits/${a.visitId}`}>Open visit</Link>}
                    {['cancelled', 'no_show'].includes(a.status) && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'booked')}>Rebook</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        ))}
      </div>
      {(modal === 'new' || modal?.edit) && <AppointmentModal appointment={modal?.edit} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal?.checkin && <CheckInModal patient={modal.checkin.patientId} appointment={modal.checkin} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function AppointmentModal({ appointment, onClose, onDone }) {
  const doctors = useDoctors();
  const settings = useHospitalSettings();
  const [patient, setPatient] = useState(appointment?.patientId || null);
  const [form, setForm] = useState({
    date: appointment?.date || todayInput(), time: appointment?.time || '09:00', doctorId: appointment?.doctorId?._id || '',
    department: appointment?.department || '', reason: appointment?.reason || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    if (!patient) return toast.error('Choose the patient');
    setBusy(true);
    try {
      if (appointment) await hospitalService.updateAppointment(appointment._id, { ...form, patientId: patient._id });
      else await hospitalService.createAppointment({ ...form, patientId: patient._id });
      toast.success('Appointment saved');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
    return undefined;
  }
  return (
    <Modal title={appointment ? 'Edit appointment' : 'Book appointment'} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !patient}>Save</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {patient ? <div className="sc-note" style={{ display: 'flex', justifyContent: 'space-between' }}><span><b>{fullName(patient)}</b> · {patient.hospitalNumber}</span>{!appointment && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPatient(null)}>Change</button>}</div> : <PatientPicker onPick={setPatient} />}
        <div className="form-grid-2">
          <Field label="Date"><input className="form-input" type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Time"><input className="form-input" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
          <Field label="Doctor">
            <select className="form-input form-select" value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
              <option value="">Any doctor</option>{doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Clinic">
            <select className="form-input form-select" value={form.department} onChange={(e) => set('department', e.target.value)}>
              <option value="">—</option>{(settings?.departments || []).map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Reason" span><input className="form-input" value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
