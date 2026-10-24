import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiPrinterLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { PaymentModal, ChargeModal, useHospitalSettings } from './HospitalForms';
import { BILL_STATUS, CHARGE_CATEGORIES, PAYMENT_METHODS, money, fmtDate, fmtDateTime, fullName, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useHospitalMe();
  const settings = useHospitalSettings();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getBill(id); setData(r.data); } catch (e) { toast.error(errMsg(e)); navigate('/hospital/billing'); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive((evt) => { if (!evt.billId || evt.billId === id) load(); }, ['bills', 'payment']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const { bill: b, payments, visit, hospital } = data;
  const p = b.patientId;
  const open = b.status !== 'cancelled';
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div className="school-page fade-in">
      <div className="sc-actions sc-no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button>
        <div className="sc-actions">
          {open && can.charge(me) && <button className="btn btn-secondary" onClick={() => setModal('charge')}><RiAddLine /> Add charge</button>}
          {open && can.manager(me) && <button className="btn btn-secondary" onClick={() => {
            const v = window.prompt('Discount amount (₦):', b.discount || 0);
            if (v === null) return;
            const reason = window.prompt('Reason for the discount:', b.discountReason || '') ?? '';
            act(() => hospitalService.setDiscount(id, { discount: Number(v) || 0, reason }), 'Discount saved');
          }}>Discount</button>}
          {open && can.cash(me) && settings?.hmos?.length > 0 && (
            <select className="form-input form-select" aria-label="HMO cover" style={{ width: 'auto' }} value={b.hmo?.name || ''} onChange={(e) => act(() => hospitalService.setBillHmo(id, { name: e.target.value || null, enrolleeId: p.insurance?.enrolleeId }), 'Payer updated')}>
              <option value="">Self-paying</option>{settings.hmos.filter((h) => h.active !== false).map((h) => <option key={h._id} value={h.name}>{h.name} ({h.coverPercent}%)</option>)}
            </select>
          )}
          {open && can.manager(me) && !payments.some((x) => !x.voided) && <button className="btn btn-ghost" onClick={() => window.confirm('Cancel this bill?') && act(() => hospitalService.cancelBill(id), 'Bill cancelled')}>Cancel bill</button>}
          <button className="btn btn-secondary" onClick={() => window.print()}><RiPrinterLine /> Print</button>
          {open && can.cash(me) && b.balance > 0 && <button className="btn btn-primary" onClick={() => setModal('pay')}>Receive {money(b.balance)}</button>}
        </div>
      </div>

      <div className="sc-doc">
        <div className="sc-doc-head">
          {hospital.logo && <img src={hospital.logo} alt="" />}
          <div><h2>{hospital.hospitalName}</h2><div className="sub">{[hospital.address, hospital.phone, hospital.email].filter(Boolean).join(' · ')}</div></div>
        </div>
        <p className="sc-doc-title">Invoice</p>
        <div className="sc-doc-meta">
          <div><span>Bill no.:</span> <b>{b.billNumber}</b> <span className={`badge badge-${BILL_STATUS[b.status]?.badge} sc-no-print`}>{BILL_STATUS[b.status]?.label}</span></div>
          <div><span>Date:</span> {fmtDate(b.createdAt)}</div>
          <div><span>Patient:</span> <b><Link to={`/hospital/patients/${p._id}`} style={{ color: 'inherit' }}>{fullName(p)}</Link></b></div>
          <div><span>Hospital no.:</span> {p.hospitalNumber}</div>
          {visit && <div><span>Visit:</span> {visit.visitNumber} · {visit.department}</div>}
          <div><span>Payer:</span> {b.hmo?.name ? `${b.hmo.name} (${b.hmo.coverPercent}%)${b.hmo.enrolleeId ? ` · ${b.hmo.enrolleeId}` : ''}` : 'Self'}</div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Type</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th><th className="sc-no-print" /></tr></thead>
          <tbody>
            {b.items.length === 0 && <tr><td colSpan={6}>No charges.</td></tr>}
            {b.items.map((it) => (
              <tr key={it._id}>
                <td>{it.description}<div className="cell-sub sc-no-print">{fmtDateTime(it.addedAt)}{it.addedBy?.name ? ` · ${it.addedBy.name}` : ''}</div></td>
                <td>{CHARGE_CATEGORIES[it.category]}</td>
                <td className="num">{it.quantity}</td><td className="num">{money(it.unitPrice)}</td><td className="num">{money(it.amount)}</td>
                <td className="sc-no-print num">{open && can.cash(me) && !['lab', 'prescription'].includes(it.refType) && (
                  <button className="btn btn-ghost btn-icon" aria-label="Remove line" onClick={() => window.confirm(`Remove "${it.description}"?`) && act(() => hospitalService.removeBillItem(id, it._id), 'Line removed')}><RiDeleteBinLine /></button>
                )}</td>
              </tr>
            ))}
            <tr><th colSpan={4}>Subtotal</th><th className="num">{money(b.subtotal)}</th><th className="sc-no-print" /></tr>
            {b.discount > 0 && <tr><td colSpan={4}>Discount{b.discountReason ? ` (${b.discountReason})` : ''}</td><td className="num">−{money(b.discount)}</td><td className="sc-no-print" /></tr>}
            <tr><th colSpan={4}>Total</th><th className="num">{money(b.total)}</th><th className="sc-no-print" /></tr>
            {b.hmoAmount > 0 && <tr><td colSpan={4}>Covered by {b.hmo.name}</td><td className="num">−{money(b.hmoAmount)}</td><td className="sc-no-print" /></tr>}
            <tr><td colSpan={4}>Paid by patient</td><td className="num">{money(b.amountPaid)}</td><td className="sc-no-print" /></tr>
            <tr><th colSpan={4}>{b.balance < 0 ? 'Refund due to patient' : 'Balance to pay'}</th><th className="num">{money(Math.abs(b.balance))}</th><th className="sc-no-print" /></tr>
          </tbody>
        </table>
        {payments.length > 0 && (
          <>
            <p className="sc-doc-title" style={{ marginTop: 20 }}>Payments</p>
            <table>
              <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className="num">Amount</th><th className="sc-no-print" /></tr></thead>
              <tbody>{payments.map((x) => (
                <tr key={x._id} className={x.voided ? 'sc-voided' : ''}>
                  <td><Link to={`/hospital/receipts/${x._id}`}>{x.receiptNumber}</Link>{x.voided ? ` · VOID (${x.voidReason})` : ''}</td>
                  <td>{fmtDateTime(x.paidAt)}</td><td>{PAYMENT_METHODS[x.method]}{x.reference ? ` · ${x.reference}` : ''}</td><td className="num">{money(x.amount)}</td>
                  <td className="sc-no-print num">{!x.voided && can.manager(me) && <button className="btn btn-ghost btn-sm" onClick={() => { const r = window.prompt('Why is this payment being voided?'); if (r) act(() => hospitalService.voidPayment(x._id, r), 'Payment voided'); }}>Void</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
      </div>

      {modal === 'pay' && <PaymentModal bill={b} onClose={() => setModal(null)} onDone={(pay) => navigate(`/hospital/receipts/${pay._id}`)} />}
      {modal === 'charge' && <ChargeModal billId={b._id} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}
