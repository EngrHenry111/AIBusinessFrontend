import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiSearchLine, RiAddLine, RiDeleteBinLine, RiAlertLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import { Modal, Field } from '../school/SchoolForms';
import {
  PAYMENT_METHODS, VISIT_TYPES, FREQUENCIES, ROUTES, BLOOD_GROUPS, GENOTYPES, money, fullName, errMsg, toInputDate, sexAge,
} from './hospitalConstants';

export { Modal, Field };

// Settings and doctors are needed by most hospital forms.
export function useHospitalSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => { hospitalService.getSettings().then(({ data }) => setSettings(data.data)).catch(() => {}); }, []);
  return settings;
}

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  useEffect(() => { hospitalService.getDoctors().then(({ data }) => setDoctors(data.data)).catch(() => {}); }, []);
  return doctors;
}

export function Allergies({ patient }) {
  if (!patient?.allergies?.length) return null;
  return <span className="hp-alert"><RiAlertLine /> Allergies: {patient.allergies.join(', ')}</span>;
}

// Search by name, hospital number, phone or HMO enrollee ID.
export function PatientPicker({ onPick, autoFocus = true, placeholder = 'Search name, hospital no. or phone…' }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return undefined; }
    const t = setTimeout(() => {
      hospitalService.getPatients({ search, limit: 8 }).then(({ data }) => setResults(data.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  return (
    <div>
      <div className="sc-search"><RiSearchLine /><input autoFocus={autoFocus} placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {results.length > 0 && (
        <ul className="sc-list" style={{ marginTop: 8 }}>
          {results.map((p) => (
            <li key={p._id} className="sc-row" onClick={() => { onPick(p); setSearch(''); setResults([]); }}>
              <div><span className="sc-strong">{p.fullName}</span><span className="cell-sub">{p.hospitalNumber} · {sexAge(p)}{p.phone ? ` · ${p.phone}` : ''}</span></div>
              {p.insurance?.hmo && <span className="badge badge-info">{p.insurance.hmo}</span>}
            </li>
          ))}
        </ul>
      )}
      {search.trim().length >= 2 && results.length === 0 && <p className="cell-sub">No patient found.</p>}
    </div>
  );
}

const EMPTY_PATIENT = {
  firstName: '', lastName: '', otherNames: '', gender: '', dateOfBirth: '', phone: '', email: '', address: '', occupation: '',
  maritalStatus: '', bloodGroup: '', genotype: '', allergies: '', chronicConditions: '', medicalNotes: '',
  nextOfKin: {}, insurance: {}, hospitalNumber: '',
};

export function PatientFormModal({ patient, onClose, onSaved }) {
  const settings = useHospitalSettings();
  const editing = Boolean(patient);
  const [form, setForm] = useState(() => (patient ? {
    ...EMPTY_PATIENT, ...patient,
    dateOfBirth: toInputDate(patient.dateOfBirth),
    allergies: (patient.allergies || []).join(', '),
    chronicConditions: (patient.chronicConditions || []).join(', '),
    nextOfKin: patient.nextOfKin || {},
    insurance: { ...(patient.insurance || {}), expiresAt: toInputDate(patient.insurance?.expiresAt) },
  } : EMPTY_PATIENT));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSub = (k, sub, v) => setForm((f) => ({ ...f, [k]: { ...f[k], [sub]: v } }));
  const regFee = settings?.chargeRegistration && settings.services.find((s) => s.active !== false && s.category === 'registration' && s.price > 0);

  async function submit(e, allowDuplicate = false) {
    e?.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, allowDuplicate };
      if (editing) {
        const { data } = await hospitalService.updatePatient(patient._id, payload);
        toast.success('Patient updated');
        onSaved(data.data);
      } else {
        const { data } = await hospitalService.createPatient(payload);
        toast.success(`Registered: ${data.data.patient.hospitalNumber}${data.data.billId ? ' · card fee added to bill' : ''}`);
        onSaved(data.data.patient, data.data.billId);
      }
    } catch (err) {
      if (err?.response?.data?.code === 'DUPLICATE_PATIENT' || /already be registered/.test(errMsg(err))) {
        if (window.confirm(`${errMsg(err)} Register a new record anyway?`)) { setBusy(false); return submit(null, true); }
      } else toast.error(errMsg(err));
    } finally { setBusy(false); }
    return undefined;
  }

  return (
    <Modal title={editing ? `Edit ${fullName(patient)}` : 'Register patient'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Register'}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-grid-3">
          <Field label="Surname *"><input className="form-input" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
          <Field label="First name *"><input className="form-input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Other names"><input className="form-input" value={form.otherNames || ''} onChange={(e) => set('otherNames', e.target.value)} /></Field>
          <Field label="Sex">
            <select className="form-input form-select" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </Field>
          <Field label="Date of birth"><input className="form-input" type="date" value={form.dateOfBirth || ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
          <Field label="Phone"><input className="form-input" type="tel" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="form-input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Occupation"><input className="form-input" value={form.occupation || ''} onChange={(e) => set('occupation', e.target.value)} /></Field>
          <Field label="Marital status">
            <select className="form-input form-select" value={form.maritalStatus || ''} onChange={(e) => set('maritalStatus', e.target.value)}>
              <option value="">—</option>{['Single', 'Married', 'Divorced', 'Widowed'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Address" span><input className="form-input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
        </div>

        <div className="sc-card-title" style={{ marginBottom: 0 }}>Medical</div>
        <div className="form-grid-3">
          <Field label="Blood group">
            <select className="form-input form-select" value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)}>
              <option value="">Unknown</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Genotype">
            <select className="form-input form-select" value={form.genotype || ''} onChange={(e) => set('genotype', e.target.value)}>
              <option value="">Unknown</option>{GENOTYPES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Allergies" hint="(comma separated)"><input className="form-input" placeholder="Penicillin, Sulfa…" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} /></Field>
          <Field label="Long-term conditions" span hint="(comma separated)"><input className="form-input" placeholder="Hypertension, Asthma…" value={form.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} /></Field>
        </div>

        <div className="sc-card-title" style={{ marginBottom: 0 }}>Next of kin</div>
        <div className="form-grid-3">
          <Field label="Name"><input className="form-input" value={form.nextOfKin.name || ''} onChange={(e) => setSub('nextOfKin', 'name', e.target.value)} /></Field>
          <Field label="Relationship"><input className="form-input" value={form.nextOfKin.relationship || ''} onChange={(e) => setSub('nextOfKin', 'relationship', e.target.value)} /></Field>
          <Field label="Phone"><input className="form-input" type="tel" value={form.nextOfKin.phone || ''} onChange={(e) => setSub('nextOfKin', 'phone', e.target.value)} /></Field>
        </div>

        <div className="sc-card-title" style={{ marginBottom: 0 }}>Health insurance (HMO)</div>
        <div className="form-grid-3">
          <Field label="HMO">
            <select className="form-input form-select" value={form.insurance.hmo || ''} onChange={(e) => setSub('insurance', 'hmo', e.target.value)}>
              <option value="">None (self-paying)</option>
              {(settings?.hmos || []).filter((h) => h.active !== false).map((h) => <option key={h._id} value={h.name}>{h.name} ({h.coverPercent}%)</option>)}
            </select>
          </Field>
          <Field label="Enrollee ID"><input className="form-input" value={form.insurance.enrolleeId || ''} onChange={(e) => setSub('insurance', 'enrolleeId', e.target.value)} /></Field>
          <Field label="Cover ends"><input className="form-input" type="date" value={form.insurance.expiresAt || ''} onChange={(e) => setSub('insurance', 'expiresAt', e.target.value)} /></Field>
        </div>
        {settings && !settings.hmos?.length && <p className="cell-sub" style={{ margin: 0 }}>Add the HMOs you accept in <Link to="/hospital/settings?tab=hmos">Hospital settings</Link>.</p>}
        {!editing && (
          <Field label="Hospital number" hint="(blank = automatic)"><input className="form-input" value={form.hospitalNumber} onChange={(e) => set('hospitalNumber', e.target.value)} /></Field>
        )}
        {!editing && regFee && <div className="sc-note">A {regFee.name} charge of {money(regFee.price)} will be added for the cashier.</div>}
      </div>
    </Modal>
  );
}

export function CheckInModal({ patient: initial, appointment, onClose, onDone }) {
  const settings = useHospitalSettings();
  const doctors = useDoctors();
  const [patient, setPatient] = useState(initial || null);
  const [form, setForm] = useState({ type: 'outpatient', priority: 'normal', department: appointment?.department || '', doctorId: appointment?.doctorId?._id || appointment?.doctorId || '', serviceId: '', reason: appointment?.reason || '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const consults = (settings?.services || []).filter((s) => s.active !== false && s.category === 'consultation');
  useEffect(() => {
    if (settings && !form.serviceId && consults[0]) set('serviceId', consults[0]._id);
    if (settings && !form.department) set('department', settings.departments[0] || '');
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (!patient) return toast.error('Choose the patient');
    setBusy(true);
    try {
      const { data } = await hospitalService.checkIn({ ...form, patientId: patient._id, appointmentId: appointment?._id });
      toast.success(`Checked in: queue no. ${data.data.queueNumber}`);
      onDone(data.data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
    return undefined;
  }

  return (
    <Modal title="Check in patient" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !patient}>{busy ? 'Checking in…' : 'Check in'}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {patient ? (
          <div className="sc-note" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span><b>{fullName(patient)}</b> · {patient.hospitalNumber} · {sexAge(patient)}</span>
            {!initial && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPatient(null)}>Change</button>}
          </div>
        ) : <PatientPicker onPick={setPatient} />}
        <div className="form-grid-2">
          <Field label="Visit type">
            <select className="form-input form-select" value={form.type} onChange={(e) => { set('type', e.target.value); if (e.target.value === 'emergency') set('priority', 'emergency'); }}>
              {Object.entries(VISIT_TYPES).filter(([k]) => k !== 'inpatient').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="form-input form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
            </select>
          </Field>
          <Field label="Clinic / department">
            <select className="form-input form-select" value={form.department} onChange={(e) => set('department', e.target.value)}>
              {(settings?.departments || []).map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Doctor">
            <select className="form-input form-select" value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
              <option value="">Next available</option>
              {doctors.map((d) => <option key={d._id} value={d._id}>{d.title ? `${d.title} ` : ''}{d.name}</option>)}
            </select>
          </Field>
          <Field label="Consultation fee" span>
            <select className="form-input form-select" value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
              <option value="">No charge</option>
              {consults.map((s) => <option key={s._id} value={s._id}>{s.name}: {money(s.price)}</option>)}
            </select>
          </Field>
          <Field label="Reason for visit" span><input className="form-input" placeholder="Fever, follow-up, antenatal…" value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

export function PaymentModal({ bill, onClose, onDone }) {
  const [form, setForm] = useState({ amount: Math.max(0, bill.balance), method: 'cash', reference: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await hospitalService.recordPayment({ ...form, billId: bill._id, amount: Number(form.amount) });
      toast.success(`${money(data.data.payment.amount)} received · ${data.data.payment.receiptNumber}`);
      onDone(data.data.payment);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Receive payment · ${bill.billNumber}`} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !(Number(form.amount) > 0)}>{busy ? 'Saving…' : `Receive ${money(form.amount)}`}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="sc-note">Patient owes <b>{money(bill.balance)}</b>{bill.hmo?.name ? ` (after ${bill.hmo.name} covers ${money(bill.hmoAmount)})` : ''}.</div>
        <div className="form-grid-2">
          <Field label="Amount (₦)"><input className="form-input" type="number" min="0.01" step="0.01" max={Math.max(0, bill.balance)} required value={form.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
          <Field label="Method">
            <select className="form-input form-select" value={form.method} onChange={(e) => set('method', e.target.value)}>
              {Object.entries(PAYMENT_METHODS).filter(([k]) => k !== 'online').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Reference" hint="(POS / transfer)"><input className="form-input" value={form.reference} onChange={(e) => set('reference', e.target.value)} /></Field>
          <Field label="Note"><input className="form-input" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

// Adds a service (procedure, nursing…) or a custom charge to a bill, or to
// a visit's / admission's bill.
export function ChargeModal({ billId, kind, id, onClose, onDone }) {
  const settings = useHospitalSettings();
  const [mode, setMode] = useState('service');
  const [form, setForm] = useState({ serviceId: '', quantity: 1, description: '', unitPrice: '', category: 'procedure' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const services = (settings?.services || []).filter((s) => s.active !== false && s.category !== 'registration');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const payload = mode === 'service' ? { serviceId: form.serviceId, quantity: Number(form.quantity) || 1 } : { description: form.description, unitPrice: Number(form.unitPrice) || 0, quantity: Number(form.quantity) || 1, category: form.category };
    try {
      if (billId) await hospitalService.addBillItem(billId, payload); else await hospitalService.addCharge(kind, id, payload);
      toast.success('Charge added');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add charge" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || (mode === 'service' ? !form.serviceId : !form.description)}>Add</button></>}>
      <div className="sc-tabs" role="tablist">
        <button type="button" className={`sc-tab ${mode === 'service' ? 'active' : ''}`} onClick={() => setMode('service')}>From price list</button>
        <button type="button" className={`sc-tab ${mode === 'custom' ? 'active' : ''}`} onClick={() => setMode('custom')}>Other</button>
      </div>
      <div className="form-grid-2">
        {mode === 'service' ? (
          <Field label="Service" span>
            <select className="form-input form-select" required value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
              <option value="">— Choose —</option>
              {services.map((s) => <option key={s._id} value={s._id}>{s.name}: {money(s.price)}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Description" span><input className="form-input" required value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="Price (₦)"><input className="form-input" type="number" min="0" required value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} /></Field>
            <Field label="Type">
              <select className="form-input form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="procedure">Procedure</option><option value="nursing">Nursing</option><option value="consultation">Consultation</option><option value="other">Other</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Quantity"><input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// Order tests for a visit, an admission, or a walk-in patient.
export function LabOrderModal({ visitId, admissionId, patientId, onClose, onDone }) {
  const [tests, setTests] = useState([]);
  const [chosen, setChosen] = useState(new Set());
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('routine');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { hospitalService.getLabTests().then(({ data }) => setTests(data.data)).catch(() => {}); }, []);
  const shown = tests.filter((t) => !search || `${t.name} ${t.code || ''} ${t.category}`.toLowerCase().includes(search.toLowerCase()));
  const groups = useMemo(() => shown.reduce((m, t) => { (m[t.category] = m[t.category] || []).push(t); return m; }, {}), [shown]);
  const total = tests.filter((t) => chosen.has(t._id)).reduce((s, t) => s + t.price, 0);
  const toggle = (id) => setChosen((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await hospitalService.createLabRequest({ visitId, admissionId, patientId, testIds: [...chosen], priority, clinicalNotes: notes });
      toast.success(`Lab request ${data.data.labNumber} sent`);
      onDone(data.data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Order lab tests" onClose={onClose} onSubmit={submit}
      footer={<><span className="cell-sub" style={{ marginRight: 'auto' }}>{chosen.size} test(s) · {money(total)}</span><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !chosen.size}>Send to lab</button></>}>
      {tests.length === 0 ? <p className="cell-sub">No lab tests set up yet. <Link to="/hospital/lab?tab=tests">Set up the test menu</Link>.</p> : (
        <>
          <div className="sc-search" style={{ marginBottom: 10 }}><RiSearchLine /><input autoFocus placeholder="Search tests…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="hp-order-list">
            {Object.entries(groups).map(([cat, list]) => (
              <div key={cat}>
                <div className="sc-card-title" style={{ marginBottom: 4 }}>{cat}</div>
                {list.map((t) => (
                  <label key={t._id} className="sc-check" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span><input type="checkbox" checked={chosen.has(t._id)} onChange={() => toggle(t._id)} /> {t.name}{t.code ? ` (${t.code})` : ''}</span>
                    <span className="cell-sub">{money(t.price)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <Field label="Priority">
              <select className="form-input form-select" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option></select>
            </Field>
            <Field label="Clinical notes"><input className="form-input" placeholder="Suspected malaria…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        </>
      )}
    </Modal>
  );
}

const EMPTY_RX = { drugName: '', dose: '', frequency: 'bd', route: 'Oral', duration: '', quantity: '', instructions: '' };

export function PrescribeModal({ visitId, admissionId, patientId, patient, existing, onClose, onDone }) {
  const [rows, setRows] = useState(existing?.items?.length ? existing.items.map((i) => ({ ...EMPTY_RX, ...i })) : [{ ...EMPTY_RX }]);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [drugs, setDrugs] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { hospitalService.getDrugs({ limit: 1000 }).then(({ data }) => setDrugs(data.data)).catch(() => {}); }, []);
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const stockOf = (name) => drugs.find((d) => `${d.name}${d.strength ? ` ${d.strength}` : ''}`.toLowerCase() === String(name).toLowerCase());
  const allergic = (name) => (patient?.allergies || []).find((a) => a && String(name).toLowerCase().includes(a.toLowerCase()));

  async function submit(e) {
    e.preventDefault();
    const items = rows.filter((r) => r.drugName.trim()).map((r) => ({ ...r, itemId: stockOf(r.drugName)?._id, quantity: Number(r.quantity) || 0 }));
    const warn = items.map((r) => allergic(r.drugName)).filter(Boolean);
    if (warn.length && !window.confirm(`Patient is allergic to ${[...new Set(warn)].join(', ')}. Prescribe anyway?`)) return;
    setBusy(true);
    try {
      const { data } = existing
        ? await hospitalService.updatePrescription(existing._id, { items, notes })
        : await hospitalService.createPrescription({ visitId, admissionId, patientId, items, notes });
      toast.success(existing ? 'Prescription updated' : `Prescription ${data.data.rxNumber} sent to pharmacy`);
      onDone(data.data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <Modal title={existing ? `Edit ${existing.rxNumber}` : 'Prescribe'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !rows.some((r) => r.drugName.trim())}>{existing ? 'Save' : 'Send to pharmacy'}</button></>}>
      <Allergies patient={patient} />
      <datalist id="hp-drugs">{drugs.map((d) => <option key={d._id} value={`${d.name}${d.strength ? ` ${d.strength}` : ''}`}>{d.stock} {d.unit} in stock</option>)}</datalist>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        {rows.map((r, i) => {
          const s = stockOf(r.drugName);
          return (
            <div key={i} className="hp-rx-row">
              <Field label={i === 0 ? 'Drug' : ''}>
                <input className="form-input" list="hp-drugs" placeholder="Drug and strength" value={r.drugName} onChange={(e) => setRow(i, 'drugName', e.target.value)} />
                <span className="cell-sub">{s ? `${s.stock} ${s.unit} in stock` : r.drugName ? 'Not in stock list' : ''}{allergic(r.drugName) ? ' · ALLERGY' : ''}</span>
              </Field>
              <Field label={i === 0 ? 'Dose' : ''}><input className="form-input" placeholder="1 tab" value={r.dose} onChange={(e) => setRow(i, 'dose', e.target.value)} /></Field>
              <Field label={i === 0 ? 'How often' : ''}>
                <select className="form-input form-select" value={r.frequency} onChange={(e) => setRow(i, 'frequency', e.target.value)}>
                  {FREQUENCIES.map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
                </select>
              </Field>
              <Field label={i === 0 ? 'For' : ''}><input className="form-input" placeholder="5 days" value={r.duration} onChange={(e) => setRow(i, 'duration', e.target.value)} /></Field>
              <Field label={i === 0 ? 'Qty' : ''}><input className="form-input" type="number" min="0" value={r.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} /></Field>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ ...EMPTY_RX }]))}><RiDeleteBinLine /></button>
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <select className="form-input form-select" aria-label="Route" value={r.route} onChange={(e) => setRow(i, 'route', e.target.value)}>{ROUTES.map((x) => <option key={x}>{x}</option>)}</select>
                <input className="form-input" placeholder="Instructions (after meals…)" value={r.instructions} onChange={(e) => setRow(i, 'instructions', e.target.value)} />
              </div>
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRows((rs) => [...rs, { ...EMPTY_RX }])}><RiAddLine /> Add drug</button>
        <Field label="Notes for the pharmacist"><input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function AdmitModal({ visitId, patient, defaultDiagnosis = '', onClose, onDone }) {
  const doctors = useDoctors();
  const [wards, setWards] = useState([]);
  const [picked, setPicked] = useState(patient || null);
  const [form, setForm] = useState({ wardId: '', bedId: '', reason: '', diagnosis: defaultDiagnosis, doctorId: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => { hospitalService.getWards().then(({ data }) => setWards(data.data.filter((w) => w.active !== false))).catch(() => {}); }, []);
  const ward = wards.find((w) => w._id === form.wardId);
  const free = (ward?.beds || []).filter((b) => b.status === 'available');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await hospitalService.admit({ ...form, visitId, patientId: visitId ? undefined : picked?._id });
      toast.success(`Admitted · ${data.data.admissionNumber}`);
      onDone(data.data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Admit patient" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !form.bedId || (!visitId && !picked)}>Admit</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!visitId && (picked ? <div className="sc-note"><b>{fullName(picked)}</b> · {picked.hospitalNumber}</div> : <PatientPicker onPick={setPicked} />)}
        {wards.length === 0 ? <p className="cell-sub">No wards yet. <Link to="/hospital/wards">Add wards and beds</Link>.</p> : (
          <div className="form-grid-2">
            <Field label="Ward">
              <select className="form-input form-select" required value={form.wardId} onChange={(e) => { set('wardId', e.target.value); set('bedId', ''); }}>
                <option value="">— Choose —</option>
                {wards.map((w) => <option key={w._id} value={w._id}>{w.name} ({w.beds.filter((b) => b.status === 'available').length} free · {money(w.dailyRate)}/day)</option>)}
              </select>
            </Field>
            <Field label="Bed">
              <select className="form-input form-select" required value={form.bedId} onChange={(e) => set('bedId', e.target.value)} disabled={!ward}>
                <option value="">{ward && !free.length ? 'No free bed' : '— Choose —'}</option>
                {free.map((b) => <option key={b._id} value={b._id}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Doctor in charge" span>
              <select className="form-input form-select" value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
                <option value="">Me / the consulting doctor</option>
                {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Diagnosis" span><input className="form-input" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} /></Field>
            <Field label="Reason for admission" span><textarea className="form-input" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
