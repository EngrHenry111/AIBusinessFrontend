import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiTestTubeLine, RiCapsuleLine, RiArrowLeftRightLine, RiLogoutBoxRLine, RiPrinterLine, RiAddLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { Modal, Field, Allergies, LabOrderModal, PrescribeModal, ChargeModal, PaymentModal } from './HospitalForms';
import { OUTCOMES, LAB_STATUS, RX_STATUS, CHARGE_CATEGORIES, ROUTES, money, fmtDate, fmtDateTime, fullName, sexAge, bp, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const KIND_LABEL = { vitals: 'Observations', note: 'Nursing note', medication: 'Drug given', doctor: 'Doctor\'s note' };

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('chart');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getAdmission(id); setData(r.data); } catch (e) { toast.error(errMsg(e)); navigate('/hospital/wards'); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive((evt) => { if (!evt.admissionId || evt.admissionId === id || ['lab', 'pharmacy', 'bills', 'payment'].includes(evt.kind)) load(); }, ['wards', 'lab', 'pharmacy', 'bills', 'payment']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const { admission: a, estimate, bill, labs, prescriptions, visit, clinical } = data;
  const p = a.patientId;
  const onWard = a.status === 'admitted';
  const refresh = () => { setModal(null); load(); };
  const tabs = [...(clinical ? [['chart', 'Chart'], ['orders', 'Orders']] : []), ['bill', 'Bill'], ...(a.status === 'discharged' && clinical ? [['summary', 'Discharge summary']] : [])];
  const current = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <div className="school-page fade-in">
      <button className="btn btn-ghost sc-back sc-no-print" onClick={() => navigate('/hospital/wards')}><RiArrowLeftLine /> Wards</button>
      <div className="card hp-patient-bar sc-no-print">
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2><Link to={`/hospital/patients/${p._id}`} style={{ color: 'inherit' }}>{fullName(p)}</Link></h2>
          <span className="cell-sub">{p.hospitalNumber} · {sexAge(p)} · {a.admissionNumber} · {a.wardId?.name}, {a.bedLabel} · admitted {fmtDateTime(a.admittedAt)}{a.doctorId ? ` · ${a.doctorId.name}` : ''}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className={`badge badge-${onWard ? 'danger' : 'success'}`}>{onWard ? 'On the ward' : `Discharged ${fmtDate(a.discharge?.at)}`}</span>
            <Allergies patient={p} />
            {p.insurance?.hmo && <span className="badge badge-info">{p.insurance.hmo}</span>}
            <span className="badge badge-neutral">{estimate.days} day{estimate.days === 1 ? '' : 's'} · beds {money(estimate.amount)}</span>
          </div>
          {a.diagnosis && <p className="cell-sub" style={{ margin: '6px 0 0' }}>Diagnosis: {a.diagnosis}</p>}
        </div>
        {onWard && (
          <div className="sc-actions">
            {can.ward(me) && <button className="btn btn-secondary" onClick={() => setModal('transfer')}><RiArrowLeftRightLine /> Transfer</button>}
            {can.consult(me) && <button className="btn btn-primary" onClick={() => setModal('discharge')}><RiLogoutBoxRLine /> Discharge</button>}
          </div>
        )}
      </div>

      <div className="sc-tabs sc-no-print" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={current === k} className={`sc-tab ${current === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {current === 'chart' && (
        <div className="sc-grid-main">
          <div className="card card-pad">
            <div className="sc-card-title"><span>Nursing chart</span></div>
            {a.chart.length === 0 ? <p className="cell-sub">Nothing charted yet.</p> : (
              <ul className="hp-chart">
                {[...a.chart].reverse().map((c) => (
                  <li key={c._id}>
                    <div className="meta">{fmtDateTime(c.at)} · {KIND_LABEL[c.kind]} · {c.by?.name || '—'}</div>
                    {c.kind === 'vitals' && <div>{[bp(c.vitals) && `BP ${bp(c.vitals)}`, c.vitals?.temperature && `T ${c.vitals.temperature}°C`, c.vitals?.pulse && `P ${c.vitals.pulse}`, c.vitals?.respiration && `R ${c.vitals.respiration}`, c.vitals?.spo2 && `SpO₂ ${c.vitals.spo2}%`, c.vitals?.glucose && `RBS ${c.vitals.glucose}`, c.intake != null && `In ${c.intake}ml`, c.output != null && `Out ${c.output}ml`].filter(Boolean).join(' · ')}</div>}
                    {c.kind === 'medication' && <div><b>{c.drug}</b> {c.dose} {c.route}{c.text ? ` · ${c.text}` : ''}</div>}
                    {['note', 'doctor'].includes(c.kind) && <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {onWard && can.ward(me) && <ChartForm admissionId={a._id} isDoctor={can.consult(me)} onDone={load} />}
        </div>
      )}

      {current === 'orders' && (
        <div className="card card-pad">
          <div className="sc-card-title">
            <span>Tests and drugs</span>
            {onWard && <span className="sc-actions" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {can.orderLab(me) && <button className="btn btn-secondary btn-sm" onClick={() => setModal('lab')}><RiTestTubeLine /> Order lab</button>}
              {can.prescribe(me) && <button className="btn btn-secondary btn-sm" onClick={() => setModal('rx')}><RiCapsuleLine /> Prescribe</button>}
            </span>}
          </div>
          {labs.length === 0 && prescriptions.length === 0 && <p className="cell-sub">Nothing ordered.</p>}
          <ul className="sc-list">
            {labs.map((l) => (
              <li key={l._id} className="sc-row" onClick={() => navigate(`/hospital/lab/${l._id}`)}>
                <div><span className="sc-strong">{l.labNumber}: {l.tests.map((t) => t.name).join(', ')}</span><span className="cell-sub">{fmtDateTime(l.createdAt)} · {l.requestedBy?.name}</span></div>
                <span className={`badge badge-${LAB_STATUS[l.status]?.badge}`}>{LAB_STATUS[l.status]?.label}</span>
              </li>
            ))}
            {prescriptions.map((r) => (
              <li key={r._id} className="sc-row" onClick={() => navigate(`/hospital/pharmacy?rx=${r._id}`)}>
                <div><span className="sc-strong">{r.rxNumber}: {r.items.map((i) => `${i.drugName} ${i.dose || ''} ${i.frequency || ''}`).join('; ')}</span><span className="cell-sub">{fmtDateTime(r.createdAt)} · {r.prescribedBy?.name}</span></div>
                <span className={`badge badge-${RX_STATUS[r.status]?.badge}`}>{RX_STATUS[r.status]?.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {current === 'bill' && (
        <div className="card card-pad" style={{ maxWidth: 720 }}>
          <div className="sc-card-title">
            <span>Bill {bill?.billNumber}</span>
            <span className="sc-actions" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {onWard && can.charge(me) && <button className="btn btn-ghost btn-sm" onClick={() => setModal('charge')}><RiAddLine /> Charge</button>}
              {bill && <Link to={`/hospital/bills/${bill._id}`}>Open bill</Link>}
            </span>
          </div>
          {!bill ? <p className="cell-sub">No bill.</p> : (
            <>
              <ul className="sc-list">{bill.items.map((it) => <li key={it._id}><div><span>{it.description}</span><span className="cell-sub">{CHARGE_CATEGORIES[it.category]}</span></div><span>{money(it.amount)}</span></li>)}</ul>
              {onWard && <div className="sc-note" style={{ marginTop: 8 }}>Bed charges so far: {money(estimate.amount)} ({estimate.days} day{estimate.days === 1 ? '' : 's'}). These go on the bill at discharge.</div>}
              <div className="sc-kv"><span>Total</span><div><b>{money(bill.total)}</b></div></div>
              {bill.hmoAmount > 0 && <div className="sc-kv"><span>{bill.hmo.name} pays</span><div>{money(bill.hmoAmount)}</div></div>}
              <div className="sc-kv"><span>Paid</span><div>{money(bill.amountPaid)}</div></div>
              <div className="sc-kv"><span>Patient owes</span><div>{bill.balance > 0 ? <b className="sc-owing">{money(bill.balance)}</b> : 'Nothing'}</div></div>
              {can.cash(me) && bill.balance > 0 && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setModal('pay')}>Receive payment</button>}
            </>
          )}
        </div>
      )}

      {current === 'summary' && <DischargeSummary a={a} p={p} visit={visit} labs={labs} prescriptions={prescriptions} />}

      {modal === 'lab' && <LabOrderModal admissionId={a._id} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'rx' && <PrescribeModal admissionId={a._id} patient={p} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'charge' && <ChargeModal kind="admissions" id={a._id} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'pay' && bill && <PaymentModal bill={bill} onClose={() => setModal(null)} onDone={(pay) => navigate(`/hospital/receipts/${pay._id}`)} />}
      {modal === 'transfer' && <TransferModal admission={a} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'discharge' && <DischargeModal admission={a} estimate={estimate} onClose={() => setModal(null)} onDone={() => { setModal(null); setTab('summary'); load(); }} />}
    </div>
  );
}

function ChartForm({ admissionId, isDoctor, onDone }) {
  const [kind, setKind] = useState('vitals');
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const vitals = Object.fromEntries(['systolic', 'diastolic', 'temperature', 'pulse', 'respiration', 'spo2', 'glucose'].filter((k) => form[k] !== undefined && form[k] !== '').map((k) => [k, Number(form[k])]));
      await hospitalService.addChart(admissionId, { kind, ...form, vitals });
      toast.success('Charted');
      setForm({});
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  const num = (k, l) => <Field label={l}><input className="form-input" type="number" step="any" value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></Field>;
  return (
    <form className="card card-pad" onSubmit={submit}>
      <div className="sc-card-title"><span>Add to chart</span></div>
      <div className="sc-tabs" role="tablist">
        {[['vitals', 'Obs'], ['medication', 'Drug given'], ['note', 'Note'], ...(isDoctor ? [['doctor', 'Doctor']] : [])].map(([k, l]) => (
          <button type="button" key={k} className={`sc-tab ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      {kind === 'vitals' && (
        <div className="form-grid-2">
          {num('systolic', 'BP sys')}{num('diastolic', 'BP dia')}{num('temperature', 'Temp °C')}{num('pulse', 'Pulse')}{num('respiration', 'Resp')}{num('spo2', 'SpO₂ %')}{num('glucose', 'RBS')}{num('intake', 'Intake ml')}{num('output', 'Output ml')}
        </div>
      )}
      {kind === 'medication' && (
        <div className="form-grid-2">
          <Field label="Drug" span><input className="form-input" required value={form.drug || ''} onChange={(e) => set('drug', e.target.value)} /></Field>
          <Field label="Dose"><input className="form-input" value={form.dose || ''} onChange={(e) => set('dose', e.target.value)} /></Field>
          <Field label="Route"><select className="form-input form-select" value={form.route || 'Oral'} onChange={(e) => set('route', e.target.value)}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Note" span><input className="form-input" value={form.text || ''} onChange={(e) => set('text', e.target.value)} /></Field>
        </div>
      )}
      {['note', 'doctor'].includes(kind) && <Field label={kind === 'doctor' ? 'Ward round note' : 'Note'}><textarea className="form-input" rows={4} required value={form.text || ''} onChange={(e) => set('text', e.target.value)} /></Field>}
      <button className="btn btn-primary" style={{ marginTop: 10, width: '100%' }} disabled={busy}>Save</button>
    </form>
  );
}

function TransferModal({ admission, onClose, onDone }) {
  const [wards, setWards] = useState([]);
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { hospitalService.getWards().then(({ data }) => setWards(data.data.filter((w) => w.active !== false))).catch(() => {}); }, []);
  const free = (wards.find((w) => w._id === wardId)?.beds || []).filter((b) => b.status === 'available');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await hospitalService.transfer(admission._id, { wardId, bedId }); toast.success('Transferred'); onDone(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Transfer patient" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !bedId}>Transfer</button></>}>
      <p className="cell-sub" style={{ marginTop: 0 }}>Now in {admission.wardId?.name}, {admission.bedLabel}. Each ward's days are billed at its own rate.</p>
      <div className="form-grid-2">
        <Field label="Ward"><select className="form-input form-select" value={wardId} onChange={(e) => { setWardId(e.target.value); setBedId(''); }}><option value="">— Choose —</option>{wards.map((w) => <option key={w._id} value={w._id}>{w.name} ({money(w.dailyRate)}/day)</option>)}</select></Field>
        <Field label="Bed"><select className="form-input form-select" value={bedId} onChange={(e) => setBedId(e.target.value)} disabled={!wardId}><option value="">{wardId && !free.length ? 'No free bed' : '— Choose —'}</option>{free.map((b) => <option key={b._id} value={b._id}>{b.label}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function DischargeModal({ admission, estimate, onClose, onDone }) {
  const [form, setForm] = useState({ outcome: 'improved', summary: '', instructions: '', followUpDate: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    if (form.outcome === 'deceased' && !window.confirm('Record this patient as deceased?')) return;
    setBusy(true);
    try {
      const { data } = await hospitalService.discharge(admission._id, form);
      toast.success(data.data.bill?.balance > 0 ? `Discharged. Patient owes ${money(data.data.bill.balance)} on ${data.data.bill.billNumber}` : 'Discharged');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Discharge patient" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Discharge</button></>}>
      <div className="sc-note" style={{ marginBottom: 12 }}>{estimate.days} day{estimate.days === 1 ? '' : 's'} on the ward: {money(estimate.amount)} in bed charges will be added to the bill.</div>
      <div className="form-grid-2">
        <Field label="Outcome"><select className="form-input form-select" value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Follow-up date"><input className="form-input" type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} /></Field>
        <Field label="Summary of stay" span><textarea className="form-input" rows={5} placeholder="Presentation, treatment given, progress, condition at discharge…" value={form.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Instructions for the patient" span><textarea className="form-input" rows={3} placeholder="Drugs to continue, warning signs, diet…" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function DischargeSummary({ a, p, visit, labs, prescriptions }) {
  const [hospital, setHospital] = useState(null);
  useEffect(() => { hospitalService.getSettings().then(({ data }) => setHospital(data.data)).catch(() => {}); }, []);
  const d = a.discharge || {};
  return (
    <>
      <div className="sc-actions sc-no-print" style={{ justifyContent: 'flex-end', marginBottom: 12 }}><button className="btn btn-primary" onClick={() => window.print()}><RiPrinterLine /> Print</button></div>
      <div className="sc-doc">
        <div className="sc-doc-head">
          {hospital?.logo && <img src={hospital.logo} alt="" />}
          <div><h2>{hospital?.hospitalName}</h2><div className="sub">{[hospital?.address, hospital?.phone, hospital?.email].filter(Boolean).join(' · ')}</div></div>
        </div>
        <p className="sc-doc-title">Discharge summary</p>
        <div className="sc-doc-meta">
          <div><span>Patient:</span> <b>{fullName(p)}</b></div>
          <div><span>Hospital no.:</span> {p.hospitalNumber}</div>
          <div><span>Sex / age:</span> {sexAge(p) || '—'}</div>
          <div><span>Admission no.:</span> {a.admissionNumber}</div>
          <div><span>Admitted:</span> {fmtDateTime(a.admittedAt)}</div>
          <div><span>Discharged:</span> {fmtDateTime(d.at)} ({d.bedDays} day{d.bedDays === 1 ? '' : 's'})</div>
          <div><span>Ward:</span> {(a.stays || []).map((s) => `${s.wardName} ${s.bedLabel}`).join(' → ')}</div>
          <div><span>Outcome:</span> <b>{OUTCOMES[d.outcome] || '—'}</b></div>
        </div>
        <table><tbody>
          <tr><th style={{ width: '28%' }}>Diagnosis</th><td>{a.diagnosis || (visit?.consultation?.diagnoses || []).map((x) => x.text).join(', ') || '—'}</td></tr>
          <tr><th>Reason for admission</th><td>{a.reason || visit?.consultation?.complaint || '—'}</td></tr>
          <tr><th>Summary</th><td style={{ whiteSpace: 'pre-wrap' }}>{d.summary || '—'}</td></tr>
          <tr><th>Investigations</th><td>{labs.filter((l) => l.status === 'completed').map((l) => l.tests.map((t) => `${t.name}: ${t.results.filter((x) => x.value).map((x) => `${x.name} ${x.value}${x.flag ? ` (${x.flag})` : ''}`).join(', ')}`).join('; ')).join('; ') || '—'}</td></tr>
          <tr><th>Drugs</th><td>{prescriptions.filter((r) => r.status !== 'cancelled').flatMap((r) => r.items.map((i) => `${i.drugName} ${i.dose || ''} ${i.frequency || ''}`.trim())).join('; ') || '—'}</td></tr>
          <tr><th>Instructions</th><td style={{ whiteSpace: 'pre-wrap' }}>{d.instructions || '—'}</td></tr>
          <tr><th>Follow-up</th><td>{d.followUpDate ? fmtDate(d.followUpDate) : '—'}</td></tr>
        </tbody></table>
        <div className="sc-doc-foot">
          <div><div className="sc-doc-sign">Doctor: {d.by?.name || a.doctorId?.name || ''}</div></div>
          <div><div className="sc-doc-sign">Signature / stamp</div></div>
        </div>
      </div>
    </>
  );
}
