import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiEditLine, RiLoginBoxLine, RiTestTubeLine, RiCapsuleLine, RiHotelBedLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { PatientFormModal, CheckInModal, LabOrderModal, PrescribeModal, AdmitModal, PaymentModal, Allergies } from './HospitalForms';
import {
  VISIT_STATUS, VISIT_TYPES, LAB_STATUS, RX_STATUS, BILL_STATUS, PAYMENT_METHODS, OUTCOMES,
  money, fmtDate, fmtDateTime, fullName, sexAge, errMsg,
} from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('visits');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getPatient(id); setData(r.data); } catch (e) { toast.error(errMsg(e)); navigate('/hospital/patients'); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive((evt) => { if (!evt.patientId || evt.patientId === id) load(); }, ['patients', 'visits', 'lab', 'pharmacy', 'bills', 'payment', 'wards']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const { patient: p, visits, bills, payments, labs, prescriptions, admissions, outstanding, clinical } = data;
  const done = () => { setModal(null); load(); };
  const tabs = [
    ['visits', 'Visits', visits.length], ...(clinical ? [['labs', 'Lab results', labs.length], ['rx', 'Prescriptions', prescriptions.length]] : []),
    ['admissions', 'Admissions', admissions.length], ['bills', 'Bills & payments', bills.length], ['details', 'Details'],
  ];

  return (
    <div className="school-page fade-in">
      <button className="btn btn-ghost sc-back" onClick={() => navigate('/hospital/patients')}><RiArrowLeftLine /> Patients</button>
      <div className="card hp-patient-bar">
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2>{fullName(p)}</h2>
          <span className="cell-sub">{p.hospitalNumber} · {sexAge(p) || 'Age not recorded'}{p.phone ? ` · ${p.phone}` : ''}{p.bloodGroup ? ` · ${p.bloodGroup}` : ''}{p.genotype ? ` · ${p.genotype}` : ''}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <Allergies patient={p} />
            {p.insurance?.hmo && <span className="badge badge-info">{p.insurance.hmo}{p.insurance.enrolleeId ? ` · ${p.insurance.enrolleeId}` : ''}</span>}
            {p.status !== 'active' && <span className="badge badge-neutral">{p.status}</span>}
            {outstanding > 0 && <span className="badge badge-danger">Owes {money(outstanding)}</span>}
          </div>
        </div>
        <div className="sc-actions">
          {can.register(me) && <button className="btn btn-secondary" onClick={() => setModal('edit')}><RiEditLine /> Edit</button>}
          {can.orderLab(me) && <button className="btn btn-secondary" onClick={() => setModal('lab')}><RiTestTubeLine /> Lab test</button>}
          {can.pharmacy(me) && <button className="btn btn-secondary" onClick={() => setModal('rx')}><RiCapsuleLine /> Counter sale</button>}
          {can.consult(me) && <button className="btn btn-secondary" onClick={() => setModal('admit')}><RiHotelBedLine /> Admit</button>}
          {can.register(me) && p.status === 'active' && <button className="btn btn-primary" onClick={() => setModal('checkin')}><RiLoginBoxLine /> Check in</button>}
        </div>
      </div>

      <div className="sc-tabs" role="tablist">
        {tabs.map(([k, l, n]) => <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}{n !== undefined && <span className="sc-tab-count">{n}</span>}</button>)}
      </div>

      {tab === 'visits' && (
        <div className="card">
          {visits.length === 0 ? <p className="cell-sub card-pad">No visits yet.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Date</th><th>Visit</th><th>Clinic</th><th>Doctor</th>{clinical && <th>Diagnosis</th>}<th>Status</th></tr></thead>
              <tbody>{visits.map((v) => (
                <tr key={v._id} className="sc-row" onClick={() => navigate(`/hospital/visits/${v._id}`)}>
                  <td>{fmtDate(v.createdAt)}</td><td>{v.visitNumber}<span className="cell-sub">{VISIT_TYPES[v.type]}</span></td><td>{v.department || '—'}</td><td>{v.doctorId?.name || '—'}</td>
                  {clinical && <td>{(v.consultation?.diagnoses || []).map((d) => d.text).join(', ') || <span className="cell-sub">—</span>}</td>}
                  <td><span className={`badge badge-${VISIT_STATUS[v.status]?.badge}`}>{VISIT_STATUS[v.status]?.label}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === 'labs' && (
        <div className="card">
          {labs.length === 0 ? <p className="cell-sub card-pad">No lab tests yet.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Date</th><th>Lab no.</th><th>Tests</th><th>Abnormal</th><th>Status</th></tr></thead>
              <tbody>{labs.map((l) => {
                const abnormal = l.tests.flatMap((t) => t.results.filter((x) => x.flag).map((x) => `${x.name} ${x.value}${x.flag}`));
                return (
                  <tr key={l._id} className="sc-row" onClick={() => navigate(`/hospital/lab/${l._id}`)}>
                    <td>{fmtDate(l.createdAt)}</td><td>{l.labNumber}</td><td>{l.tests.map((t) => t.name).join(', ')}</td>
                    <td>{abnormal.length ? <span className="sc-owing">{abnormal.slice(0, 3).join(', ')}{abnormal.length > 3 ? '…' : ''}</span> : <span className="cell-sub">—</span>}</td>
                    <td><span className={`badge badge-${LAB_STATUS[l.status]?.badge}`}>{LAB_STATUS[l.status]?.label}</span></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === 'rx' && (
        <div className="card">
          {prescriptions.length === 0 ? <p className="cell-sub card-pad">No prescriptions yet.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Date</th><th>Rx no.</th><th>Drugs</th><th>By</th><th>Status</th></tr></thead>
              <tbody>{prescriptions.map((r) => (
                <tr key={r._id} className="sc-row" onClick={() => navigate(`/hospital/pharmacy?rx=${r._id}`)}>
                  <td>{fmtDate(r.createdAt)}</td><td>{r.rxNumber}</td>
                  <td>{r.items.map((i) => `${i.drugName}${i.dose ? ` ${i.dose}` : ''}${i.frequency ? ` ${i.frequency}` : ''}`).join('; ')}</td>
                  <td>{r.prescribedBy?.name || '—'}</td>
                  <td><span className={`badge badge-${RX_STATUS[r.status]?.badge}`}>{RX_STATUS[r.status]?.label}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === 'admissions' && (
        <div className="card">
          {admissions.length === 0 ? <p className="cell-sub card-pad">Never admitted.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Admitted</th><th>No.</th><th>Ward</th><th>Discharged</th><th>Outcome</th></tr></thead>
              <tbody>{admissions.map((a) => (
                <tr key={a._id} className="sc-row" onClick={() => navigate(`/hospital/admissions/${a._id}`)}>
                  <td>{fmtDate(a.admittedAt)}</td><td>{a.admissionNumber}</td><td>{a.wardId?.name || '—'}{a.bedLabel ? `, ${a.bedLabel}` : ''}</td>
                  <td>{a.discharge?.at ? fmtDate(a.discharge.at) : <span className="badge badge-danger">On ward</span>}</td>
                  <td>{OUTCOMES[a.discharge?.outcome] || '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === 'bills' && (
        <div className="sc-grid-2">
          <div className="card">
            <div className="sc-card-title card-pad" style={{ marginBottom: 0 }}>Bills</div>
            {bills.length === 0 ? <p className="cell-sub card-pad">No bills.</p> : (
              <div className="table-wrapper"><table className="table">
                <thead><tr><th>Bill</th><th className="num">Total</th><th className="num">Owes</th><th /></tr></thead>
                <tbody>{bills.map((b) => (
                  <tr key={b._id}>
                    <td><Link to={`/hospital/bills/${b._id}`} className="sc-strong">{b.billNumber}</Link><span className="cell-sub">{fmtDate(b.createdAt)}{b.hmo?.name ? ` · ${b.hmo.name}` : ''}</span></td>
                    <td className="num">{money(b.total)}</td>
                    <td className="num">{b.balance > 0 ? <span className="sc-owing">{money(b.balance)}</span> : <span className={`badge badge-${BILL_STATUS[b.status]?.badge}`}>{BILL_STATUS[b.status]?.label}</span>}</td>
                    <td className="num">{can.cash(me) && b.balance > 0 && b.status !== 'cancelled' && <button className="btn btn-primary btn-sm" onClick={() => setModal({ pay: b })}>Pay</button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          <div className="card">
            <div className="sc-card-title card-pad" style={{ marginBottom: 0 }}>Payments</div>
            {payments.length === 0 ? <p className="cell-sub card-pad">No payments.</p> : (
              <ul className="sc-list card-pad">{payments.map((x) => (
                <li key={x._id} className={x.voided ? 'sc-voided' : ''}>
                  <div><Link to={`/hospital/receipts/${x._id}`} className="sc-strong">{x.receiptNumber}</Link><span className="cell-sub">{fmtDateTime(x.paidAt)} · {PAYMENT_METHODS[x.method]}{x.voided ? ' · VOID' : ''}</span></div>
                  <b>{money(x.amount)}</b>
                </li>
              ))}</ul>
            )}
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="sc-grid-2">
          <div className="card card-pad">
            <div className="sc-card-title">Personal</div>
            {[['Date of birth', p.dateOfBirth && fmtDate(p.dateOfBirth)], ['Email', p.email], ['Address', p.address], ['Occupation', p.occupation], ['Marital status', p.maritalStatus],
              ['Registered', fmtDate(p.createdAt)]].filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>)}
            <div className="sc-card-title" style={{ marginTop: 16 }}>Next of kin</div>
            {p.nextOfKin?.name ? [['Name', p.nextOfKin.name], ['Relationship', p.nextOfKin.relationship], ['Phone', p.nextOfKin.phone]].filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>) : <p className="cell-sub">Not recorded.</p>}
          </div>
          <div className="card card-pad">
            <div className="sc-card-title">Medical</div>
            {[['Blood group', p.bloodGroup], ['Genotype', p.genotype], ['Allergies', p.allergies?.join(', ')], ['Long-term conditions', p.chronicConditions?.join(', ')], ['Notes', p.medicalNotes]]
              .filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>)}
            <div className="sc-card-title" style={{ marginTop: 16 }}>Insurance</div>
            {p.insurance?.hmo ? [['HMO', p.insurance.hmo], ['Enrollee ID', p.insurance.enrolleeId], ['Cover ends', p.insurance.expiresAt && fmtDate(p.insurance.expiresAt)]].filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>) : <p className="cell-sub">Self-paying.</p>}
          </div>
        </div>
      )}

      {modal === 'edit' && <PatientFormModal patient={p} onClose={() => setModal(null)} onSaved={done} />}
      {modal === 'checkin' && <CheckInModal patient={p} onClose={() => setModal(null)} onDone={(v) => navigate(`/hospital/visits/${v._id}`)} />}
      {modal === 'lab' && <LabOrderModal patientId={p._id} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'rx' && <PrescribeModal patientId={p._id} patient={p} onClose={() => setModal(null)} onDone={(rx) => navigate(`/hospital/pharmacy?rx=${rx._id}`)} />}
      {modal === 'admit' && <AdmitModal patient={p} onClose={() => setModal(null)} onDone={(a) => navigate(`/hospital/admissions/${a._id}`)} />}
      {modal?.pay && <PaymentModal bill={modal.pay} onClose={() => setModal(null)} onDone={(pay) => navigate(`/hospital/receipts/${pay._id}`)} />}
    </div>
  );
}
