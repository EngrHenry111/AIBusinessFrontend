import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiListOrdered, RiLoginBoxLine, RiHeartPulseLine, RiLoader4Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { CheckInModal, Modal, Field, useHospitalSettings } from './HospitalForms';
import { VISIT_STATUS, PRIORITY, money, fullName, sexAge, bp, todayInput, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const STAGES = [
  ['waiting', 'Waiting for nurse'],
  ['triaged', 'Waiting for doctor'],
  ['in_consultation', 'With doctor'],
  ['done', 'Done'],
  ['all', 'All'],
];

export default function Queue() {
  const navigate = useNavigate();
  const me = useHospitalMe();
  const settings = useHospitalSettings();
  const [date, setDate] = useState(todayInput());
  const [stage, setStage] = useState('waiting');
  const [department, setDepartment] = useState('');
  const [mine, setMine] = useState(false);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  // Doctors start on their own waiting list.
  useEffect(() => { if (me?.role === 'doctor') { setStage('triaged'); setMine(true); } }, [me?.role]);

  const load = useCallback(async () => {
    try {
      const { data } = await hospitalService.getVisits({ date, department: department || undefined, mine: mine ? '1' : undefined });
      setVisits(data.data);
    } catch (e) { toast.error(errMsg(e, 'Failed to load the queue')); } finally { setLoading(false); }
  }, [date, department, mine]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['visits', 'lab', 'pharmacy', 'bills', 'payment']);

  const inStage = (v) => (stage === 'all' ? true : stage === 'done' ? ['completed', 'admitted', 'cancelled'].includes(v.status) : v.status === stage);
  const counts = Object.fromEntries(STAGES.map(([k]) => [k, visits.filter((v) => (k === 'all' ? true : k === 'done' ? ['completed', 'admitted', 'cancelled'].includes(v.status) : v.status === k)).length]));
  const order = { emergency: 0, urgent: 1, normal: 2 };
  const shown = visits.filter(inStage).sort((a, b) => (stage === 'done' || stage === 'all' ? b.queueNumber - a.queueNumber : (order[a.priority] - order[b.priority]) || a.queueNumber - b.queueNumber));

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiListOrdered style={{ verticalAlign: '-3px' }} /> Queue</h1>
          <p>{visits.length} visit{visits.length === 1 ? '' : 's'} on {new Date(`${date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}. Emergencies go to the top. <span className="sc-live">Live</span></p>
        </div>
        {can.register(me) && <button className="btn btn-primary" onClick={() => setModal('checkin')}><RiLoginBoxLine /> Check in</button>}
      </div>

      <div className="sc-tabs" role="tablist">
        {STAGES.map(([k, l]) => <button key={k} role="tab" aria-selected={stage === k} className={`sc-tab ${stage === k ? 'active' : ''}`} onClick={() => setStage(k)}>{l}<span className="sc-tab-count">{counts[k]}</span></button>)}
      </div>

      <div className="card">
        <div className="sc-filters">
          <input className="form-input" type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value || todayInput())} style={{ maxWidth: 170 }} />
          <select className="form-input form-select" aria-label="Clinic" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All clinics</option>
            {(settings?.departments || []).map((d) => <option key={d}>{d}</option>)}
          </select>
          {can.consult(me) && <label className="sc-check"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only my patients</label>}
        </div>
        {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div> : shown.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><RiListOrdered /></div><h3>Nobody here</h3><p>{stage === 'waiting' ? 'Checked-in patients appear here for the nurse.' : 'No patients at this stage.'}</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>No.</th><th>Patient</th><th>Reason</th><th>Clinic / doctor</th>{can.clinical(me) && <th>Vitals</th>}<th>Orders</th>{can.cash(me) && <th className="num">Owes</th>}<th>Status</th><th /></tr></thead>
              <tbody>
                {shown.map((v) => {
                  const vt = v.latestVitals;
                  return (
                    <tr key={v._id} className="sc-row" onClick={() => navigate(`/hospital/visits/${v._id}`)}>
                      <td><span className={`hp-queue-no ${v.priority}`}>{v.queueNumber}</span></td>
                      <td>
                        <div className="sc-strong">{fullName(v.patientId)}</div>
                        <span className="cell-sub">{v.patientId?.hospitalNumber} · {sexAge(v.patientId)}{v.patientId?.insurance?.hmo ? ` · ${v.patientId.insurance.hmo}` : ''}</span>
                        {v.patientId?.allergies?.length > 0 && <span className="cell-sub sc-owing">Allergies: {v.patientId.allergies.join(', ')}</span>}
                      </td>
                      <td>{v.reason || <span className="cell-sub">—</span>}{v.priority !== 'normal' && <span className={`badge badge-${PRIORITY[v.priority].badge}`} style={{ marginLeft: 6 }}>{PRIORITY[v.priority].label}</span>}</td>
                      <td>{v.department}<span className="cell-sub">{v.doctorId?.name || 'Any doctor'}</span></td>
                      {can.clinical(me) && <td>{vt ? <span className="cell-sub" style={{ display: 'inline' }}>{[bp(vt) && `BP ${bp(vt)}`, vt.temperature && `${vt.temperature}°C`, vt.pulse && `P ${vt.pulse}`, vt.spo2 && `SpO₂ ${vt.spo2}%`].filter(Boolean).join(' · ')}</span> : <span className="cell-sub">—</span>}</td>}
                      <td>
                        {(v.lab.requested || v.lab.collected) ? <span className="badge badge-warning">Lab pending</span> : v.lab.completed ? <span className="badge badge-success">Results ready</span> : null}{' '}
                        {(v.rx.pending || v.rx.billed) ? <span className="badge badge-info">Pharmacy</span> : null}
                      </td>
                      {can.cash(me) && <td className="num">{v.bill?.balance > 0 ? <span className="sc-owing">{money(v.bill.balance)}</span> : <span className="cell-sub">—</span>}</td>}
                      <td><span className={`badge badge-${VISIT_STATUS[v.status]?.badge}`}>{VISIT_STATUS[v.status]?.label}</span></td>
                      <td className="num" onClick={(e) => e.stopPropagation()}>
                        {can.triage(me) && ['waiting', 'triaged'].includes(v.status) && <button className="btn btn-secondary btn-sm" onClick={() => setModal({ vitals: v })}><RiHeartPulseLine /> Vitals</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'checkin' && <CheckInModal onClose={() => setModal(null)} onDone={() => { setModal(null); setStage('waiting'); load(); }} />}
      {modal?.vitals && <VitalsModal visit={modal.vitals} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

const VITALS = [
  ['systolic', 'BP systolic', 'mmHg'], ['diastolic', 'BP diastolic', 'mmHg'], ['temperature', 'Temperature', '°C'], ['pulse', 'Pulse', 'bpm'],
  ['respiration', 'Respiration', '/min'], ['spo2', 'SpO₂', '%'], ['weight', 'Weight', 'kg'], ['height', 'Height', 'cm'],
  ['glucose', 'Blood glucose', 'mmol/L'], ['painScore', 'Pain (0–10)', ''],
];

export function VitalsModal({ visit, onClose, onDone }) {
  const [form, setForm] = useState({ priority: visit.priority });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const bmi = form.weight && form.height ? (form.weight / ((form.height / 100) ** 2)).toFixed(1) : null;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await hospitalService.addVitals(visit._id, form);
      toast.success('Vitals saved: patient is waiting for the doctor');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Vitals · ${fullName(visit.patientId)}`} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save vitals</button></>}>
      <div className="form-grid-3">
        {VITALS.map(([k, l, unit]) => (
          <Field key={k} label={l} hint={unit ? `(${unit})` : ''}><input className="form-input" type="number" step="any" inputMode="decimal" value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></Field>
        ))}
        <Field label="Priority">
          <select className="form-input form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
          </select>
        </Field>
        <Field label="Note" span><input className="form-input" value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></Field>
      </div>
      {bmi && <p className="cell-sub">BMI {bmi}</p>}
    </Modal>
  );
}
