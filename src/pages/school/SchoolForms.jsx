import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiCloseLine, RiSearchLine, RiLoader4Line } from 'react-icons/ri';
import { schoolService } from '../../services';
import {
  TERMS, PAYMENT_METHODS, money, fmtDate, toInputDate, todayInput, fullName, errMsg,
} from './schoolConstants';

// Classes are needed by nearly every school form.
export function useClasses() {
  const [classes, setClasses] = useState([]);
  const load = () => schoolService.getClasses().then(({ data }) => setClasses(data.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  return [classes, load];
}

export function Modal({ title, onClose, children, footer, size = '', onSubmit }) {
  const Tag = onSubmit ? 'form' : 'div';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <Tag className={`modal ${size || 'sc-modal'}`} onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </Tag>
    </div>
  );
}

export function Field({ label, children, hint, span }) {
  return (
    <div className="form-group" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label className="form-label">{label}{hint && <span className="form-hint"> {hint}</span>}</label>
      {children}
    </div>
  );
}

function GuardianFields({ value, onChange, required }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="form-grid-2">
      <Field label={`Parent / guardian name${required ? ' *' : ''}`}><input className="form-input" required={required} value={value.name || ''} onChange={set('name')} /></Field>
      <Field label="Relationship"><input className="form-input" placeholder="Father, Mother, Uncle…" value={value.relationship || ''} onChange={set('relationship')} /></Field>
      <Field label={`Phone${required ? ' *' : ''}`}><input className="form-input" type="tel" required={required} value={value.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Email" hint="(receipts & results are sent here)"><input className="form-input" type="email" value={value.email || ''} onChange={set('email')} /></Field>
      <Field label="Occupation"><input className="form-input" value={value.occupation || ''} onChange={set('occupation')} /></Field>
      <Field label="Address"><input className="form-input" value={value.address || ''} onChange={set('address')} /></Field>
    </div>
  );
}

function ChildFields({ form, set, classes, classKey = 'classId', classLabel = 'Class' }) {
  return (
    <div className="form-grid-3">
      <Field label="Surname *"><input className="form-input" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
      <Field label="First name *"><input className="form-input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
      <Field label="Other names"><input className="form-input" value={form.otherNames || ''} onChange={(e) => set('otherNames', e.target.value)} /></Field>
      <Field label="Gender">
        <select className="form-input form-select" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
          <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
        </select>
      </Field>
      <Field label="Date of birth"><input className="form-input" type="date" value={form.dateOfBirth || ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
      <Field label={classLabel}>
        <select className="form-input form-select" value={form[classKey] || ''} onChange={(e) => set(classKey, e.target.value)}>
          <option value="">— Not assigned —</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

const EMPTY_STUDENT = { admissionNumber: '', firstName: '', lastName: '', otherNames: '', gender: '', dateOfBirth: '', classId: '', address: '', stateOfOrigin: '', religion: '', bloodGroup: '', medicalNotes: '', previousSchool: '', status: 'active', guardian: {} };

export function StudentFormModal({ student, classes, onClose, onSaved }) {
  const editing = Boolean(student);
  const [form, setForm] = useState(() => (editing ? {
    ...EMPTY_STUDENT, ...student, classId: student.classId?._id || student.classId || '',
    dateOfBirth: toInputDate(student.dateOfBirth), guardian: student.guardian || {},
  } : EMPTY_STUDENT));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, classId: form.classId || null, dateOfBirth: form.dateOfBirth || null };
      const { data } = editing ? await schoolService.updateStudent(student._id, payload) : await schoolService.createStudent(payload);
      toast.success(editing ? 'Student updated' : `Student added — ${data.data.admissionNumber}`);
      onSaved(data.data);
    } catch (err) { toast.error(errMsg(err, 'Could not save student')); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={editing ? `Edit ${fullName(student)}` : 'Add student'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save student'}</button></>}>
      <div className="sc-section">Student</div>
      <ChildFields form={form} set={set} classes={classes} />
      <div className="form-grid-3" style={{ marginTop: 12 }}>
        <Field label="Admission number" hint={editing ? '' : '(blank = automatic)'}><input className="form-input" value={form.admissionNumber} onChange={(e) => set('admissionNumber', e.target.value)} /></Field>
        <Field label="Status">
          <select className="form-input form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option><option value="suspended">Suspended</option><option value="withdrawn">Withdrawn</option><option value="graduated">Graduated</option>
          </select>
        </Field>
        <Field label="Previous school"><input className="form-input" value={form.previousSchool || ''} onChange={(e) => set('previousSchool', e.target.value)} /></Field>
        <Field label="State of origin"><input className="form-input" value={form.stateOfOrigin || ''} onChange={(e) => set('stateOfOrigin', e.target.value)} /></Field>
        <Field label="Religion"><input className="form-input" value={form.religion || ''} onChange={(e) => set('religion', e.target.value)} /></Field>
        <Field label="Blood group"><input className="form-input" value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} /></Field>
      </div>
      <div className="form-grid-2" style={{ marginTop: 12 }}>
        <Field label="Home address"><input className="form-input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Medical notes / allergies"><input className="form-input" value={form.medicalNotes || ''} onChange={(e) => set('medicalNotes', e.target.value)} /></Field>
      </div>
      <div className="sc-section">Parent / guardian</div>
      <GuardianFields value={form.guardian} onChange={(g) => set('guardian', g)} />
      {!editing && <p className="cell-sub" style={{ marginTop: 12 }}>This term's fees for the chosen class are billed to the student automatically.</p>}
    </Modal>
  );
}

const EMPTY_APP = { firstName: '', lastName: '', otherNames: '', gender: '', dateOfBirth: '', classAppliedFor: '', previousSchool: '', address: '', medicalNotes: '', guardian: {}, interviewDate: '', entranceScore: '', notes: '' };

export function ApplicationFormModal({ application, classes, onClose, onSaved }) {
  const editing = Boolean(application);
  const [form, setForm] = useState(() => (editing ? {
    ...EMPTY_APP, ...application,
    classAppliedFor: application.classAppliedFor?._id || application.classAppliedFor || '',
    dateOfBirth: toInputDate(application.dateOfBirth),
    interviewDate: application.interviewDate ? new Date(application.interviewDate).toISOString().slice(0, 16) : '',
    entranceScore: application.entranceScore ?? '',
    guardian: application.guardian || {},
  } : EMPTY_APP));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, dateOfBirth: form.dateOfBirth || null };
      delete payload.status;
      const { data } = editing ? await schoolService.updateApplication(application._id, payload) : await schoolService.createApplication(payload);
      toast.success(editing ? 'Application updated' : `Application ${data.data.applicationNumber} created`);
      onSaved(data.data);
    } catch (err) { toast.error(errMsg(err, 'Could not save application')); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={editing ? `Application ${application.applicationNumber}` : 'New application (walk-in)'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <div className="sc-section">Child</div>
      <ChildFields form={form} set={set} classes={classes} classKey="classAppliedFor" classLabel="Class applying for" />
      <div className="form-grid-2" style={{ marginTop: 12 }}>
        <Field label="Previous school"><input className="form-input" value={form.previousSchool || ''} onChange={(e) => set('previousSchool', e.target.value)} /></Field>
        <Field label="Medical notes"><input className="form-input" value={form.medicalNotes || ''} onChange={(e) => set('medicalNotes', e.target.value)} /></Field>
      </div>
      <div className="sc-section">Parent / guardian</div>
      <GuardianFields value={form.guardian} onChange={(g) => set('guardian', g)} required />
      <div className="sc-section">Assessment</div>
      <div className="form-grid-3">
        <Field label="Interview / exam date"><input className="form-input" type="datetime-local" value={form.interviewDate} onChange={(e) => set('interviewDate', e.target.value)} /></Field>
        <Field label="Entrance score (%)"><input className="form-input" type="number" min="0" max="100" value={form.entranceScore} onChange={(e) => set('entranceScore', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Notes"><textarea className="form-input form-textarea" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// Take a payment at the bursary. Pass `bill` to pay a known bill, or
// `student` to choose among their bills, or nothing to search for a student.
export function RecordPaymentModal({ bill: initialBill, student: initialStudent, onClose, onSaved }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(initialStudent || null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [bills, setBills] = useState(initialBill ? [initialBill] : null);
  const [billId, setBillId] = useState(initialBill?._id || '');
  const [form, setForm] = useState({ amount: initialBill ? String(Math.max(0, initialBill.balance)) : '', method: 'cash', reference: '', payerName: '', paidAt: todayInput(), note: '', sendReceipt: true });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const bill = bills?.find((b) => b._id === billId);

  useEffect(() => {
    if (student || search.trim().length < 2) { setResults([]); return undefined; }
    const t = setTimeout(() => schoolService.getStudents({ search, limit: 8, status: 'all' }).then(({ data }) => setResults(data.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [search, student]);

  useEffect(() => {
    if (initialBill || !student) return;
    schoolService.getBills({ studentId: student._id, status: 'outstanding', session: 'all', term: 'all', limit: 50 })
      .then(({ data }) => {
        setBills(data.data);
        if (data.data.length) { setBillId(data.data[0]._id); set('amount', String(data.data[0].balance)); }
      }).catch(() => setBills([]));
  }, [student, initialBill]);

  async function submit(e) {
    e.preventDefault();
    if (!bill) return toast.error('Choose the bill being paid');
    setSaving(true);
    try {
      const { data } = await schoolService.recordPayment({ ...form, billId: bill._id, amount: Number(form.amount) });
      const p = data.data.payment;
      toast.success((t) => (
        <span>Payment recorded — {p.receiptNumber}. <button type="button" className="btn btn-sm btn-ghost" onClick={() => { toast.dismiss(t.id); navigate(`/school/receipts/${p._id}`); }}>Print receipt</button></span>
      ), { duration: 6000 });
      onSaved?.(data.data);
    } catch (err) { toast.error(errMsg(err, 'Could not record payment')); }
    finally { setSaving(false); }
  }

  const balanceAfter = bill ? bill.balance - (Number(form.amount) || 0) : 0;

  return (
    <Modal title="Record fee payment" size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving || !bill}>{saving ? 'Saving…' : `Record ${form.amount ? money(form.amount) : 'payment'}`}</button></>}>
      {!student && !initialBill ? (
        <>
          <Field label="Student">
            <div className="sc-search"><RiSearchLine /><input autoFocus placeholder="Name or admission number…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </Field>
          <ul className="sc-list" style={{ marginTop: 8 }}>
            {results.map((s) => (
              <li key={s._id} style={{ cursor: 'pointer' }} onClick={() => setStudent(s)}>
                <div><span className="sc-strong">{fullName(s)}</span><span className="cell-sub">{s.admissionNumber} · {s.classId?.name || 'No class'}</span></div>
                {s.balance > 0 ? <span className="sc-owing">{money(s.balance)}</span> : <span className="cell-sub">Nothing owed</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {student && (
            <div className="sc-note" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span><b>{fullName(student)}</b> · {student.admissionNumber}</span>
              {!initialStudent && !initialBill && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setStudent(null); setBills(null); setBillId(''); }}>Change</button>}
            </div>
          )}
          {bills == null ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : bills.length === 0 ? (
            <div className="sc-note ok">This student has no outstanding bills.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!initialBill && (
                <Field label="Bill">
                  <select className="form-input form-select" value={billId} onChange={(e) => { setBillId(e.target.value); const b = bills.find((x) => x._id === e.target.value); if (b) set('amount', String(b.balance)); }}>
                    {bills.map((b) => <option key={b._id} value={b._id}>{b.title} · {b.session} {TERMS[b.term]} — owes {money(b.balance)}</option>)}
                  </select>
                </Field>
              )}
              {bill && <div className="cell-sub">Bill {bill.billNumber}: total {money(bill.total)}, paid {money(bill.amountPaid)}, balance <b>{money(bill.balance)}</b>{bill.dueDate && ` · due ${fmtDate(bill.dueDate)}`}</div>}
              <div className="form-grid-2">
                <Field label="Amount (₦) *"><input className="form-input" type="number" min="1" step="0.01" max={bill?.balance} required value={form.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
                <Field label="Method">
                  <select className="form-input form-select" value={form.method} onChange={(e) => set('method', e.target.value)}>
                    {Object.entries(PAYMENT_METHODS).filter(([k]) => k !== 'online').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Reference" hint="(teller / transfer ref)"><input className="form-input" value={form.reference} onChange={(e) => set('reference', e.target.value)} /></Field>
                <Field label="Date paid"><input className="form-input" type="date" max={todayInput()} value={form.paidAt} onChange={(e) => set('paidAt', e.target.value)} /></Field>
                <Field label="Paid by"><input className="form-input" placeholder={student?.guardian?.name || ''} value={form.payerName} onChange={(e) => set('payerName', e.target.value)} /></Field>
                <Field label="Note"><input className="form-input" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
              </div>
              <label className="sc-check"><input type="checkbox" checked={form.sendReceipt} onChange={(e) => set('sendReceipt', e.target.checked)} /> Email the receipt to the parent</label>
              {bill && Number(form.amount) > 0 && (
                <div className="sc-summary">
                  <div><span>Balance after this payment</span><b className={balanceAfter > 0 ? 'sc-owing' : 'sc-credit'}>{balanceAfter < 0 ? 'More than owed' : money(balanceAfter)}</b></div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
