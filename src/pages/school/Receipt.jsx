import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiPrinterLine, RiLoader4Line } from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, PAYMENT_METHODS, money, fmtDateTime, fullName, errMsg } from './schoolConstants';
import './School.css';

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { schoolService.getPayment(id).then(({ data: r }) => setData(r.data)).catch((e) => { toast.error(errMsg(e)); navigate(-1); }); }, [id, navigate]);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const { payment: p, school } = data;
  const bill = p.billId || {};
  const st = p.studentId || {};
  return (
    <div className="school-page fade-in">
      <div className="sc-actions sc-no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button>
        <button className="btn btn-primary" onClick={() => window.print()}><RiPrinterLine /> Print</button>
      </div>
      <div className="sc-doc">
        <div className="sc-doc-head">
          {school.logo && <img src={school.logo} alt="" />}
          <div>
            <h2>{school.schoolName}</h2>
            {school.motto && <div className="sub"><i>{school.motto}</i></div>}
            <div className="sub">{[school.address, school.phone, school.email].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <p className="sc-doc-title">Official receipt</p>
        <div className="sc-doc-meta">
          <div><span>Receipt no.:</span> <b>{p.receiptNumber}</b></div>
          <div><span>Date:</span> {fmtDateTime(p.paidAt)}</div>
          <div><span>Student:</span> <b>{fullName(st)}</b></div>
          <div><span>Admission no.:</span> {st.admissionNumber}</div>
          <div><span>Class:</span> {st.classId?.name || '—'}</div>
          <div><span>Paid by:</span> {p.payerName || st.guardian?.name || '—'}</div>
          <div><span>Method:</span> {PAYMENT_METHODS[p.method]}{p.reference ? ` (${p.reference})` : ''}</div>
          <div><span>Bill:</span> {bill.billNumber} — {bill.session} {TERMS[bill.term]}</div>
        </div>
        <table>
          <thead><tr><th>{bill.title || 'School fees'}</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {(bill.items || []).map((i, k) => <tr key={k}><td>{i.name}</td><td className="num">{money(i.amount)}</td></tr>)}
            {bill.discount > 0 && <tr><td>Discount{bill.discountReason ? ` (${bill.discountReason})` : ''}</td><td className="num">−{money(bill.discount)}</td></tr>}
            <tr><th>Bill total</th><th className="num">{money(bill.total)}</th></tr>
            <tr><th>Amount paid on this receipt</th><th className="num">{money(p.amount)}</th></tr>
            <tr><td>Total paid on this bill to date</td><td className="num">{money(bill.amountPaid)}</td></tr>
            <tr><th>Balance outstanding</th><th className="num">{money(Math.max(0, bill.balance))}</th></tr>
          </tbody>
        </table>
        <div className="sc-doc-foot">
          <div>
            {p.voided ? <span className="sc-stamp void">VOID</span> : <span className="sc-stamp">PAID</span>}
            {p.voided && <div style={{ marginTop: 8 }}>Voided: {p.voidReason}</div>}
            {p.note && <div style={{ marginTop: 8 }}>{p.note}</div>}
          </div>
          <div><div className="sc-doc-sign">Bursar{p.recordedBy?.name ? `: ${p.recordedBy.name}` : ''}</div></div>
        </div>
      </div>
    </div>
  );
}
