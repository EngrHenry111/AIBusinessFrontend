import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiLoader4Line, RiTestTubeLine, RiCapsuleLine, RiHotelBedLine, RiHeartPulseLine, RiCheckLine, RiAddLine, RiCloseLine, RiSaveLine,
} from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { LabOrderModal, PrescribeModal, AdmitModal, PaymentModal, ChargeModal, Allergies, Field } from './HospitalForms';
import { VitalsModal } from './Queue';
import {
  VISIT_STATUS, VISIT_TYPES, LAB_STATUS, RX_STATUS, CHARGE_CATEGORIES, COMMON_DIAGNOSES,
  money, fmtDate, fmtDateTime, fullName, sexAge, bp, toInputDate, errMsg,
} from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const EMPTY_NOTES = { complaint: '', history: '', examination: '', assessment: '', diagnoses: [], plan: '', followUpDate: '' };

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState(EMPTY_NOTES);
  const [dirty, setDirty] = useState(false);
  const [diag, setDiag] = useState('');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const load = useCallback(async (keepNotes) => {
    try {
      const { data: r } = await hospitalService.getVisit(id);
      setData(r.data);
      if (!keepNotes) {
        const c = r.data.visit.consultation || {};
        setNotes({ ...EMPTY_NOTES, ...c, diagnoses: c.diagnoses || [], followUpDate: toInputDate(c.followUpDate) });
        setDirty(false);
      }
    } catch (e) { toast.error(errMsg(e)); navigate('/hospital/queue'); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  // Live: results or payments arriving shouldn't wipe notes being typed.
  useHospitalLive((evt) => { if (!evt.visitId || evt.visitId === id || ['lab', 'pharmacy', 'bills', 'payment'].includes(evt.kind)) load(true); }, ['visits', 'lab', 'pharmacy', 'bills', 'payment', 'wards']);

  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const { visit, bill, labs, prescriptions, admission, history, clinical } = data;
  const p = visit.patientId;
  const closed = ['completed', 'cancelled', 'admitted'].includes(visit.status);
  const canWrite = can.consult(me) && visit.status !== 'cancelled';
  const setNote = (k, v) => { setNotes((n) => ({ ...n, [k]: v })); setDirty(true); };
  const latest = visit.vitals?.[visit.vitals.length - 1];
  const refresh = () => { setModal(null); load(true); };

  function addDiagnosis(value) {
    const text = String(value || diag).trim();
    if (!text) return;
    const known = COMMON_DIAGNOSES.find(([code, t]) => `${t} (${code})` === text || t.toLowerCase() === text.toLowerCase());
    const entry = known ? { code: known[0], text: known[1] } : { code: '', text };
    if (!notes.diagnoses.some((d) => d.text.toLowerCase() === entry.text.toLowerCase())) setNote('diagnoses', [...notes.diagnoses, entry]);
    setDiag('');
  }

  async function save(complete = false) {
    setSaving(true);
    try {
      await hospitalService.saveConsultation(id, { ...notes, complete });
      toast.success(complete ? 'Visit completed' : 'Notes saved');
      setDirty(false);
      if (complete) navigate('/hospital/queue'); else load();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  }

  async function setStatus(status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try { await hospitalService.setVisitStatus(id, status); toast.success('Visit updated'); load(); } catch (err) { toast.error(errMsg(err)); }
  }

  return (
    <div className="school-page fade-in">
      <button className="btn btn-ghost sc-back" onClick={() => navigate('/hospital/queue')}><RiArrowLeftLine /> Queue</button>
      <div className="card hp-patient-bar">
        <span className={`hp-queue-no ${visit.priority}`}>{visit.queueNumber}</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2><Link to={`/hospital/patients/${p._id}`} style={{ color: 'inherit' }}>{fullName(p)}</Link></h2>
          <span className="cell-sub">{p.hospitalNumber} · {sexAge(p)} · {VISIT_TYPES[visit.type]} · {visit.department} · {visit.visitNumber}{visit.doctorId ? ` · ${visit.doctorId.name}` : ''}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`badge badge-${VISIT_STATUS[visit.status]?.badge}`}>{VISIT_STATUS[visit.status]?.label}</span>
            <Allergies patient={p} />
            {p.insurance?.hmo && <span className="badge badge-info">{p.insurance.hmo}</span>}
            {p.genotype && <span className="badge badge-neutral">{p.genotype}</span>}
            {(p.chronicConditions || []).map((c) => <span key={c} className="badge badge-neutral">{c}</span>)}
          </div>
          {visit.reason && <p className="cell-sub" style={{ margin: '6px 0 0' }}>Came for: {visit.reason}</p>}
        </div>
        <div className="sc-actions">
          {can.triage(me) && !closed && <button className="btn btn-secondary" onClick={() => setModal('vitals')}><RiHeartPulseLine /> Vitals</button>}
          {can.consult(me) && !closed && <button className="btn btn-secondary" onClick={() => setModal('admit')}><RiHotelBedLine /> Admit</button>}
          {admission && <Link className="btn btn-secondary" to={`/hospital/admissions/${admission._id}`}><RiHotelBedLine /> {admission.wardId?.name}, {admission.bedLabel}</Link>}
          {can.triage(me) && visit.status === 'waiting' && <button className="btn btn-ghost" onClick={() => setStatus('cancelled', 'Cancel this visit? Unpaid charges are cancelled too.')}><RiCloseLine /> Cancel visit</button>}
          {can.triage(me) && visit.status === 'completed' && <button className="btn btn-ghost" onClick={() => setStatus('in_consultation')}>Reopen</button>}
        </div>
      </div>

      <div className="sc-grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {clinical && (
            <div className="card card-pad">
              <div className="sc-card-title"><span>Consultation</span>{visit.consultation?.startedAt && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>Started {fmtDateTime(visit.consultation.startedAt)}</span>}</div>
              <fieldset disabled={!canWrite} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Presenting complaint"><textarea className="form-input" rows={2} value={notes.complaint || ''} onChange={(e) => setNote('complaint', e.target.value)} /></Field>
                <Field label="History"><textarea className="form-input" rows={3} value={notes.history || ''} onChange={(e) => setNote('history', e.target.value)} /></Field>
                <Field label="Examination"><textarea className="form-input" rows={3} value={notes.examination || ''} onChange={(e) => setNote('examination', e.target.value)} /></Field>
                <Field label="Diagnosis">
                  <datalist id="hp-dx">{COMMON_DIAGNOSES.map(([code, t]) => <option key={code} value={`${t} (${code})`} />)}</datalist>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" list="hp-dx" placeholder="Type or pick: Malaria, Hypertension…" value={diag}
                      onChange={(e) => { setDiag(e.target.value); if (COMMON_DIAGNOSES.some(([c, t]) => `${t} (${c})` === e.target.value)) addDiagnosis(e.target.value); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDiagnosis(); } }} />
                    <button type="button" className="btn btn-secondary" onClick={() => addDiagnosis()}><RiAddLine /></button>
                  </div>
                  <div className="hp-diag-chips">
                    {notes.diagnoses.map((d) => (
                      <span key={d.text} className="sc-chip">{d.text}{d.code ? ` · ${d.code}` : ''}
                        {canWrite && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${d.text}`} onClick={() => setNote('diagnoses', notes.diagnoses.filter((x) => x !== d))}><RiCloseLine /></button>}
                      </span>
                    ))}
                  </div>
                </Field>
                <Field label="Assessment"><textarea className="form-input" rows={2} value={notes.assessment || ''} onChange={(e) => setNote('assessment', e.target.value)} /></Field>
                <Field label="Plan"><textarea className="form-input" rows={3} value={notes.plan || ''} onChange={(e) => setNote('plan', e.target.value)} /></Field>
                <Field label="Follow-up date"><input className="form-input" type="date" style={{ maxWidth: 200 }} value={notes.followUpDate || ''} onChange={(e) => setNote('followUpDate', e.target.value)} /></Field>
              </fieldset>
              {canWrite && (
                <div className="sc-actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" disabled={saving || !dirty} onClick={() => save(false)}><RiSaveLine /> {dirty ? 'Save notes' : 'Saved'}</button>
                  {!closed && <button className="btn btn-primary" disabled={saving} onClick={() => save(true)}><RiCheckLine /> Save & complete visit</button>}
                </div>
              )}
            </div>
          )}

          {clinical && (
            <div className="card card-pad">
              <div className="sc-card-title">
                <span>Orders</span>
                <span className="sc-actions" style={{ textTransform: 'none', letterSpacing: 0 }}>
                  {can.orderLab(me) && visit.status !== 'cancelled' && <button className="btn btn-secondary btn-sm" onClick={() => setModal('lab')}><RiTestTubeLine /> Order lab</button>}
                  {can.prescribe(me) && visit.status !== 'cancelled' && <button className="btn btn-secondary btn-sm" onClick={() => setModal('rx')}><RiCapsuleLine /> Prescribe</button>}
                </span>
              </div>
              {labs.length === 0 && prescriptions.length === 0 && <p className="cell-sub">No tests or drugs ordered yet.</p>}
              {labs.map((l) => (
                <div key={l._id} className="sc-note" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/hospital/lab/${l._id}`} className="sc-strong">{l.labNumber}: {l.tests.map((t) => t.name).join(', ')}</Link>
                    <span className={`badge badge-${LAB_STATUS[l.status]?.badge}`}>{LAB_STATUS[l.status]?.label}</span>
                  </div>
                  {l.status === 'completed' && (
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      {l.tests.map((t) => (
                        <div key={t._id}><b>{t.name}:</b> {t.results.filter((x) => x.value).map((x) => <span key={x.name}>{x.name} {x.value}{x.unit ? ` ${x.unit}` : ''}{x.flag && <span className={`hp-flag ${x.flag}`}>{x.flag}</span>}; </span>)}{t.comment ? ` ${t.comment}` : ''}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {prescriptions.map((r) => (
                <div key={r._id} className="sc-note" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span className="sc-strong">{r.rxNumber}</span>
                    <span>
                      {r.status === 'pending' && can.consult(me) && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ editRx: r })}>Edit</button>}
                      <span className={`badge badge-${RX_STATUS[r.status]?.badge}`}>{RX_STATUS[r.status]?.label}</span>
                    </span>
                  </div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                    {r.items.map((i) => <li key={i._id}>{i.drugName} {i.dose} {i.frequency} {i.route && i.route !== 'Oral' ? i.route : ''} {i.duration && `× ${i.duration}`}{i.status === 'not_available' && <b> (not in stock: buy outside)</b>}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {clinical && (
            <div className="card card-pad">
              <div className="sc-card-title"><span>Vitals</span>{latest && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{fmtDateTime(latest.takenAt)}</span>}</div>
              {!latest ? <p className="cell-sub">Not taken yet.</p> : (
                <div className="hp-vitals">
                  {bp(latest) && <div className={`hp-vital ${latest.systolic >= 140 || latest.diastolic >= 90 ? 'abnormal' : ''}`}><span>BP</span><b>{bp(latest)}</b></div>}
                  {latest.temperature && <div className={`hp-vital ${latest.temperature >= 37.5 ? 'abnormal' : ''}`}><span>Temp</span><b>{latest.temperature}°C</b></div>}
                  {latest.pulse && <div className={`hp-vital ${latest.pulse > 100 || latest.pulse < 60 ? 'abnormal' : ''}`}><span>Pulse</span><b>{latest.pulse}</b></div>}
                  {latest.respiration && <div className="hp-vital"><span>Resp</span><b>{latest.respiration}</b></div>}
                  {latest.spo2 && <div className={`hp-vital ${latest.spo2 < 95 ? 'abnormal' : ''}`}><span>SpO₂</span><b>{latest.spo2}%</b></div>}
                  {latest.weight && <div className="hp-vital"><span>Weight</span><b>{latest.weight} kg</b></div>}
                  {latest.bmi && <div className="hp-vital"><span>BMI</span><b>{latest.bmi}</b></div>}
                  {latest.glucose && <div className="hp-vital"><span>Glucose</span><b>{latest.glucose}</b></div>}
                </div>
              )}
              {latest?.note && <p className="cell-sub">{latest.note}</p>}
              {visit.vitals?.length > 1 && <p className="cell-sub">{visit.vitals.length} readings this visit.</p>}
            </div>
          )}

          <div className="card card-pad">
            <div className="sc-card-title">
              <span>Bill</span>
              <span className="sc-actions" style={{ textTransform: 'none', letterSpacing: 0 }}>
                {can.charge(me) && visit.status !== 'cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => setModal('charge')}><RiAddLine /> Charge</button>}
                {bill && <Link to={`/hospital/bills/${bill._id}`}>{bill.billNumber}</Link>}
              </span>
            </div>
            {!bill || !bill.items.length ? <p className="cell-sub">No charges yet.</p> : (
              <>
                <ul className="sc-list">
                  {bill.items.map((it) => <li key={it._id}><div><span>{it.description}</span><span className="cell-sub">{CHARGE_CATEGORIES[it.category]}</span></div><span>{money(it.amount)}</span></li>)}
                </ul>
                <div className="sc-kv"><span>Total</span><div><b>{money(bill.total)}</b></div></div>
                {bill.hmoAmount > 0 && <div className="sc-kv"><span>{bill.hmo.name} pays</span><div>{money(bill.hmoAmount)}</div></div>}
                <div className="sc-kv"><span>Paid</span><div>{money(bill.amountPaid)}</div></div>
                <div className="sc-kv"><span>Patient owes</span><div>{bill.balance > 0 ? <b className="sc-owing">{money(bill.balance)}</b> : bill.balance < 0 ? <b>Refund {money(-bill.balance)}</b> : 'Nothing'}</div></div>
                {can.cash(me) && bill.balance > 0 && <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={() => setModal('pay')}>Receive payment</button>}
              </>
            )}
          </div>

          {clinical && history.length > 0 && (
            <div className="card card-pad">
              <div className="sc-card-title"><span>Previous visits</span></div>
              <ul className="sc-list">
                {history.map((h) => (
                  <li key={h._id} className="sc-row" onClick={() => navigate(`/hospital/visits/${h._id}`)}>
                    <div>
                      <span className="sc-strong">{fmtDate(h.date)} · {h.department}</span>
                      <span className="cell-sub">{(h.consultation?.diagnoses || []).map((d) => d.text).join(', ') || h.consultation?.complaint || 'No notes'}{h.doctorId ? ` · ${h.doctorId.name}` : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {modal === 'vitals' && <VitalsModal visit={visit} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'lab' && <LabOrderModal visitId={visit._id} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'rx' && <PrescribeModal visitId={visit._id} patient={p} onClose={() => setModal(null)} onDone={refresh} />}
      {modal?.editRx && <PrescribeModal existing={modal.editRx} patient={p} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'admit' && <AdmitModal visitId={visit._id} patient={p} defaultDiagnosis={notes.diagnoses.map((d) => d.text).join(', ')} onClose={() => setModal(null)} onDone={(a) => navigate(`/hospital/admissions/${a._id}`)} />}
      {modal === 'charge' && <ChargeModal kind="visits" id={visit._id} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'pay' && bill && <PaymentModal bill={bill} onClose={() => setModal(null)} onDone={(pay) => navigate(`/hospital/receipts/${pay._id}`)} />}
    </div>
  );
}
