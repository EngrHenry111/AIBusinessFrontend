import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiEditLine, RiLoader4Line, RiAddLine, RiPrinterLine, RiDeleteBinLine,
  RiMoneyDollarCircleLine, RiFileList3Line, RiCloseLine, RiNotification3Line,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import useSchoolLive from './useSchoolLive';
import { StudentFormModal, RecordPaymentModal, ReminderModal, Modal, Field, useClasses } from './SchoolForms';
import {
  TERMS, STUDENT_STATUS, BILL_STATUS, PAYMENT_METHODS, money, fmtDate, fmtDateTime, fullName, errMsg,
} from './schoolConstants';
import './School.css';

const isManager = (role) => ['manager', 'company_owner', 'super_admin'].includes(role);

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes] = useClasses();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('fees');
  const [modal, setModal] = useState(null); // 'edit' | 'pay' | {pay: bill} | {discount: bill} | 'charge'

  const load = useCallback(() => schoolService.getStudent(id).then(({ data: res }) => setData(res.data))
    .catch((e) => { toast.error(errMsg(e, 'Student not found')); navigate('/school/students'); }), [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useSchoolLive((evt) => {
    if (!evt.studentId || evt.studentId === id) {
      if (evt.kind === 'payment' && evt.studentId === id && evt.message && !evt.voided && !/online/.test(evt.message)) toast.success(evt.message);
      load();
    }
  }, ['payment', 'fees', 'students', 'attendance']);

  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;
  const { student, bills, payments, attendance, outstanding, settings, application } = data;
  const attTotal = Object.values(attendance).reduce((s, n) => s + n, 0);
  const attended = (attendance.present || 0) + (attendance.late || 0);
  const paidTotal = payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
  const g = student.guardian || {};

  async function billAction(fn, msg) {
    try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="school-page fade-in">
      <Link to="/school/students" className="sc-back"><RiArrowLeftLine /> Students</Link>
      <div className="page-header page-header-row">
        <div className="sc-head">
          <div className="sc-avatar">{student.photo ? <img src={student.photo} alt="" /> : `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`}</div>
          <div>
            <h1 style={{ margin: 0 }}>{fullName(student)}</h1>
            <p style={{ margin: 0 }}>{student.admissionNumber} · {student.classId?.name || 'No class'} · <span className={`badge badge-${STUDENT_STATUS[student.status]?.badge}`}>{STUDENT_STATUS[student.status]?.label}</span></p>
          </div>
        </div>
        <div className="sc-actions">
          <Link to={`/school/report-card/${student._id}`} className="btn btn-secondary"><RiFileList3Line /> Report card</Link>
          {outstanding > 0 && <button className="btn btn-secondary" onClick={() => setModal('remind')}><RiNotification3Line /> Remind parent</button>}
          <button className="btn btn-secondary" onClick={() => setModal('edit')}><RiEditLine /> Edit</button>
          <button className="btn btn-primary" onClick={() => setModal('pay')} disabled={outstanding <= 0}><RiMoneyDollarCircleLine /> Record payment</button>
        </div>
      </div>

      <div className="sc-stats">
        <div className="stat-card"><div className="stat-label">Fees owed</div><div className={`stat-value ${outstanding > 0 ? 'sc-owing' : ''}`}>{money(outstanding)}</div></div>
        <div className="stat-card"><div className="stat-label">Paid (all time)</div><div className="stat-value">{money(paidTotal)}</div><div className="cell-sub">{payments.filter((p) => !p.voided).length} payment(s)</div></div>
        <div className="stat-card"><div className="stat-label">Attendance this term</div><div className="stat-value">{attTotal ? `${Math.round((attended / attTotal) * 100)}%` : '—'}</div><div className="cell-sub">{attTotal ? `${attended} of ${attTotal} days · ${attendance.absent || 0} absent` : 'No registers yet'}</div></div>
        <div className="stat-card"><div className="stat-label">Parent / guardian</div><div className="stat-value" style={{ fontSize: 16 }}>{g.name || '—'}</div><div className="cell-sub">{g.phone}{g.phone && g.email && ' · '}{g.email}</div></div>
      </div>

      <div className="sc-tabs" role="tablist">
        {[['fees', 'Fees & payments'], ['profile', 'Profile']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="sc-filters" style={{ justifyContent: 'space-between' }}>
              <span className="sc-card-title" style={{ margin: 0 }}>Bills</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal('charge')}><RiAddLine /> Add a charge</button>
            </div>
            {bills.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No bills yet. Bills are created from the term's fee structures on the Fees page.</p> : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Bill</th><th>Term</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b._id}>
                        <td><div className="sc-strong">{b.title}</div><span className="cell-sub">{b.billNumber}{b.discount > 0 && ` · discount ${money(b.discount)}`}{b.dueDate && ` · due ${fmtDate(b.dueDate)}`}</span></td>
                        <td>{b.session}<span className="cell-sub">{TERMS[b.term]}</span></td>
                        <td className="num">{money(b.total)}</td>
                        <td className="num">{money(b.amountPaid)}</td>
                        <td className="num">{b.balance > 0 ? <span className="sc-owing">{money(b.balance)}</span> : b.balance < 0 ? <span className="sc-credit">{money(-b.balance)} credit</span> : '—'}</td>
                        <td><span className={`badge badge-${BILL_STATUS[b.status]?.badge}`}>{BILL_STATUS[b.status]?.label}</span></td>
                        <td className="num">
                          <div className="sc-actions" style={{ justifyContent: 'flex-end' }}>
                            {['unpaid', 'partial'].includes(b.status) && <button className="btn btn-primary btn-sm" onClick={() => setModal({ pay: b })}>Pay</button>}
                            {!['waived', 'cancelled'].includes(b.status) && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ discount: b })}>Discount</button>}
                            {isManager(user?.role) && ['unpaid', 'partial'].includes(b.status) && (
                              <button className="btn btn-ghost btn-sm" onClick={() => { const r = window.prompt('Reason for waiving the remaining balance (e.g. scholarship):'); if (r) billAction(() => schoolService.waiveBill(b._id, r), 'Bill waived'); }}>Waive</button>
                            )}
                            {isManager(user?.role) && b.amountPaid <= 0 && b.status !== 'cancelled' && (
                              <button className="btn btn-ghost btn-sm" title="Cancel bill" onClick={() => window.confirm('Cancel this bill?') && billAction(() => schoolService.cancelBill(b._id), 'Bill cancelled')}><RiCloseLine /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="sc-filters"><span className="sc-card-title" style={{ margin: 0 }}>Payments</span></div>
            {payments.length === 0 ? <p className="cell-sub" style={{ padding: 16 }}>No payments yet.</p> : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className="num">Amount</th><th /></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className={p.voided ? 'sc-voided' : ''}>
                        <td><Link to={`/school/receipts/${p._id}`} className="sc-strong">{p.receiptNumber}</Link>{p.voided && <span className="cell-sub">Voided: {p.voidReason}</span>}</td>
                        <td>{fmtDateTime(p.paidAt)}<span className="cell-sub">{p.recordedBy?.name ? `by ${p.recordedBy.name}` : p.method === 'online' ? 'by parent, online' : ''}</span></td>
                        <td>{PAYMENT_METHODS[p.method]}{p.reference && <span className="cell-sub">{p.reference}</span>}</td>
                        <td className="num">{money(p.amount)}</td>
                        <td className="num">
                          <div className="sc-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link to={`/school/receipts/${p._id}`} className="btn btn-ghost btn-sm" title="Print receipt"><RiPrinterLine /></Link>
                            {isManager(user?.role) && !p.voided && (
                              <button className="btn btn-ghost btn-sm" title="Void payment" onClick={() => { const r = window.prompt('Why is this payment being voided?'); if (r) billAction(() => schoolService.voidPayment(p._id, r), 'Payment voided'); }}><RiDeleteBinLine /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="sc-grid-2">
          <div className="card card-pad">
            <div className="sc-card-title">Student</div>
            {[
              ['Admission no.', student.admissionNumber], ['Class', student.classId?.name], ['Gender', student.gender && (student.gender === 'male' ? 'Male' : 'Female')],
              ['Date of birth', student.dateOfBirth && fmtDate(student.dateOfBirth)], ['Admitted', fmtDate(student.admittedAt)],
              ['Application', application && `${application.applicationNumber} (${application.source === 'online' ? 'online' : 'walk-in'})`],
              ['State of origin', student.stateOfOrigin], ['Religion', student.religion], ['Blood group', student.bloodGroup],
              ['Previous school', student.previousSchool], ['Address', student.address], ['Medical notes', student.medicalNotes],
              ['Left', student.leftAt && fmtDate(student.leftAt)],
            ].filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>)}
          </div>
          <div className="card card-pad">
            <div className="sc-card-title">Parent / guardian</div>
            {[['Name', g.name], ['Relationship', g.relationship], ['Phone', g.phone && <a href={`tel:${g.phone}`}>{g.phone}</a>], ['Email', g.email && <a href={`mailto:${g.email}`}>{g.email}</a>], ['Occupation', g.occupation], ['Address', g.address]]
              .filter(([, v]) => v).map(([k, v]) => <div className="sc-kv" key={k}><span>{k}</span><div>{v}</div></div>)}
            {isManager(user?.role) && (
              <button className="btn btn-ghost btn-sm" style={{ color: '#b91c1c', marginTop: 16 }} onClick={async () => {
                if (!window.confirm(`Permanently delete ${fullName(student)}? Students with payments can only be marked withdrawn.`)) return;
                try { await schoolService.deleteStudent(student._id); toast.success('Student deleted'); navigate('/school/students'); } catch (e) { toast.error(errMsg(e)); }
              }}><RiDeleteBinLine /> Delete student</button>
            )}
          </div>
        </div>
      )}

      {modal === 'edit' && <StudentFormModal student={student} classes={classes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {(modal === 'pay' || modal?.pay) && <RecordPaymentModal student={student} bill={modal?.pay} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.discount && <DiscountModal bill={modal.discount} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'remind' && <ReminderModal studentIds={[student._id]} title={`Remind ${student.firstName}'s parent`} onClose={() => setModal(null)} />}
      {modal === 'charge' && <ChargeModal student={student} settings={settings} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

function DiscountModal({ bill, onClose, onSaved }) {
  const [discount, setDiscount] = useState(String(bill.discount || ''));
  const [reason, setReason] = useState(bill.discountReason || '');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await schoolService.updateBill(bill._id, { discount: Number(discount) || 0, discountReason: reason }); toast.success('Discount saved'); onSaved(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Discount — ${bill.title}`} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Discount (₦)" hint={`of ${money(bill.subtotal)}`}><input className="form-input" type="number" min="0" max={bill.subtotal} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
        <Field label="Reason"><input className="form-input" placeholder="Sibling discount, staff child, scholarship…" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="sc-summary"><div><span>New total</span><b>{money(bill.subtotal - (Number(discount) || 0))}</b></div><div><span>Balance after discount</span><b>{money(bill.subtotal - (Number(discount) || 0) - bill.amountPaid)}</b></div></div>
      </div>
    </Modal>
  );
}

function ChargeModal({ student, settings, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([{ name: '', amount: '' }]);
  const [term, setTerm] = useState(settings.currentTerm);
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await schoolService.createBill({ studentId: student._id, title: title || items[0]?.name, items: items.map((i) => ({ name: i.name, amount: Number(i.amount) })), term, session: settings.currentSession, dueDate: dueDate || undefined });
      toast.success('Charge added'); onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Add a charge for ${student.firstName}`} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || total <= 0}>Add {money(total)}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Title"><input className="form-input" placeholder="Excursion, lost textbook…" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div>
          <label className="form-label">Items</label>
          {items.map((it, i) => (
            <div className="sc-item-row" key={i}>
              <input className="form-input" placeholder="Item" required value={it.name} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Amount" required value={it.amount} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
              <button type="button" className="btn btn-ghost btn-icon" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove"><RiCloseLine /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems([...items, { name: '', amount: '' }])}><RiAddLine /> Add item</button>
        </div>
        <div className="form-grid-2">
          <Field label="Term">
            <select className="form-input form-select" value={term} onChange={(e) => setTerm(e.target.value)}>
              {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
