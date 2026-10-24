import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { RiMoneyDollarCircleLine, RiSearchLine, RiLoader4Line, RiDownload2Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import { PaymentModal, useHospitalSettings } from './HospitalForms';
import { BILL_STATUS, CLAIM_STATUS, PAYMENT_METHODS, money, fmtDate, fmtDateTime, fullName, todayInput, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const TABS = [['bills', 'Bills'], ['payments', 'Payments'], ['debtors', 'Debtors'], ['claims', 'HMO claims']];
const monthStart = () => `${todayInput().slice(0, 8)}01`;

function download(rows, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

export default function Billing() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'bills';
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiMoneyDollarCircleLine style={{ verticalAlign: '-3px' }} /> Billing</h1>
          <p>Every visit's charges collect on one bill: consultation, lab, drugs, procedures and beds. <span className="sc-live">Live</span></p>
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setParams(k === 'bills' ? {} : { tab: k })}>{l}</button>)}
      </div>
      {tab === 'bills' && <Bills />}
      {tab === 'payments' && <Payments />}
      {tab === 'debtors' && <Debtors />}
      {tab === 'claims' && <Claims />}
    </div>
  );
}

function Bills() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('owing');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [pay, setPay] = useState(null);
  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getBills({ status, search: search || undefined, limit: 100 }); setData(r); } catch (e) { toast.error(errMsg(e)); }
  }, [status, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useHospitalLive(load, ['bills', 'payment', 'lab', 'pharmacy', 'visits', 'wards', 'patients']);

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input autoFocus placeholder="Search patient, hospital no., phone or bill no.…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="form-input form-select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="owing">To pay</option><option value="paid">Paid</option><option value="all">All</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : data.data.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><RiMoneyDollarCircleLine /></div><h3>No bills</h3><p>{status === 'owing' ? 'Nobody is waiting to pay.' : 'No bills match.'}</p></div>
      ) : (
        <>
          <div className="table-wrapper"><table className="table">
            <thead><tr><th>Bill</th><th>Patient</th><th>Payer</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Owes</th><th /></tr></thead>
            <tbody>{data.data.map((b) => (
              <tr key={b._id} className="sc-row" onClick={() => navigate(`/hospital/bills/${b._id}`)}>
                <td><span className="sc-strong">{b.billNumber}</span><span className="cell-sub">{fmtDateTime(b.updatedAt)} · {b.items.length} item(s)</span></td>
                <td><span className="sc-strong">{fullName(b.patientId)}</span><span className="cell-sub">{b.patientId?.hospitalNumber}</span></td>
                <td>{b.hmo?.name ? <span className="badge badge-info">{b.hmo.name} {b.hmo.coverPercent}%</span> : <span className="cell-sub">Self</span>}</td>
                <td className="num">{money(b.total)}</td>
                <td className="num">{money(b.amountPaid)}</td>
                <td className="num">{b.balance > 0 ? <span className="sc-owing">{money(b.balance)}</span> : <span className={`badge badge-${BILL_STATUS[b.status]?.badge}`}>{BILL_STATUS[b.status]?.label}</span>}</td>
                <td className="num" onClick={(e) => e.stopPropagation()}>{b.balance > 0 && b.status !== 'cancelled' && <button className="btn btn-primary btn-sm" onClick={() => setPay(b)}>Receive</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="sc-table-foot"><span>{data.pagination.total} bill(s) · total {money(data.totals.total)} · patients owe <b>{money(data.totals.balance)}</b>{data.totals.hmo ? ` · HMOs ${money(data.totals.hmo)}` : ''}</span></div>
        </>
      )}
      {pay && <PaymentModal bill={pay} onClose={() => setPay(null)} onDone={(p) => navigate(`/hospital/receipts/${p._id}`)} />}
    </div>
  );
}

function Payments() {
  const [from, setFrom] = useState(todayInput());
  const [to, setTo] = useState(todayInput());
  const [method, setMethod] = useState('');
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getPayments({ from, to, method: method || undefined, voided: 'all' }); setData(r); } catch (e) { toast.error(errMsg(e)); }
  }, [from, to, method]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['payment']);

  return (
    <div className="card">
      <div className="sc-filters">
        <input className="form-input" type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 170 }} />
        <input className="form-input" type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 170 }} />
        <select className="form-input form-select" aria-label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All methods</option>{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {data?.data.length > 0 && <button className="btn btn-secondary" onClick={() => download(data.data.map((p) => ({ receipt: p.receiptNumber, date: new Date(p.paidAt).toISOString(), patient: fullName(p.patientId), hospitalNumber: p.patientId?.hospitalNumber, bill: p.billId?.billNumber, method: PAYMENT_METHODS[p.method], reference: p.reference, amount: p.amount, cashier: p.recordedBy?.name, voided: p.voided ? 'yes' : '' })), `payments-${from}-to-${to}.csv`)}><RiDownload2Line /> Export</button>}
      </div>
      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
        <>
          <div className="sc-chips card-pad" style={{ paddingTop: 0 }}>
            <span className="sc-chip"><b>Total {money(data.total)}</b></span>
            {Object.entries(data.byMethod).map(([k, v]) => <span key={k} className="sc-chip">{PAYMENT_METHODS[k]}: {money(v.amount)} ({v.n})</span>)}
          </div>
          {data.data.length === 0 ? <p className="cell-sub card-pad">No payments in this period.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Receipt</th><th>Patient</th><th>Method</th><th>Cashier</th><th className="num">Amount</th></tr></thead>
              <tbody>{data.data.map((p) => (
                <tr key={p._id} className={p.voided ? 'sc-voided' : ''}>
                  <td><Link to={`/hospital/receipts/${p._id}`} className="sc-strong">{p.receiptNumber}</Link><span className="cell-sub">{fmtDateTime(p.paidAt)}{p.voided ? ' · VOID' : ''}</span></td>
                  <td>{fullName(p.patientId)}<span className="cell-sub">{p.patientId?.hospitalNumber} · <Link to={`/hospital/bills/${p.billId?._id}`}>{p.billId?.billNumber}</Link></span></td>
                  <td>{PAYMENT_METHODS[p.method]}{p.reference && <span className="cell-sub">{p.reference}</span>}</td>
                  <td>{p.recordedBy?.name || '—'}</td>
                  <td className="num">{money(p.amount)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}
    </div>
  );
}

function Debtors() {
  const [data, setData] = useState(null);
  const load = useCallback(async () => { try { const { data: r } = await hospitalService.getDebtors(); setData(r); } catch (e) { toast.error(errMsg(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['bills', 'payment']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  return (
    <div className="card">
      <div className="sc-filters">
        <span><b>{data.data.length}</b> patient(s) owe <b className="sc-owing">{money(data.total)}</b></span>
        {data.data.length > 0 && <button className="btn btn-secondary" onClick={() => download(data.data.map((d) => ({ patient: fullName(d.patient), hospitalNumber: d.patient.hospitalNumber, phone: d.patient.phone, bills: d.bills, owes: d.balance, oldestBill: fmtDate(d.oldest) })), 'hospital-debtors.csv')}><RiDownload2Line /> Export</button>}
      </div>
      {data.data.length === 0 ? <p className="cell-sub card-pad">Nobody owes the hospital.</p> : (
        <div className="table-wrapper"><table className="table">
          <thead><tr><th>Patient</th><th>Phone</th><th className="num">Bills</th><th>Owing since</th><th className="num">Owes</th></tr></thead>
          <tbody>{data.data.map((d) => (
            <tr key={d._id}>
              <td><Link to={`/hospital/patients/${d.patient._id}`} className="sc-strong">{fullName(d.patient)}</Link><span className="cell-sub">{d.patient.hospitalNumber}</span></td>
              <td>{d.patient.phone ? <a href={`tel:${d.patient.phone}`}>{d.patient.phone}</a> : '—'}</td>
              <td className="num">{d.bills}</td>
              <td>{fmtDate(d.oldest)}</td>
              <td className="num"><span className="sc-owing">{money(d.balance)}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Claims() {
  const settings = useHospitalSettings();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayInput());
  const [hmo, setHmo] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const load = useCallback(async () => {
    try { const { data: r } = await hospitalService.getClaims({ from, to, hmo: hmo || undefined, status: status || undefined }); setData(r); setPicked(new Set()); } catch (e) { toast.error(errMsg(e)); }
  }, [from, to, hmo, status]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['bills']);

  async function mark(newStatus) {
    const reference = newStatus === 'submitted' || newStatus === 'paid' ? window.prompt('Batch or payment reference (optional):') ?? undefined : undefined;
    try { const { data: r } = await hospitalService.updateClaims({ billIds: [...picked], status: newStatus, reference }); toast.success(`${r.data.updated} claim(s) updated`); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="card">
      <div className="sc-filters">
        <input className="form-input" type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 170 }} />
        <input className="form-input" type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 170 }} />
        <select className="form-input form-select" aria-label="HMO" value={hmo} onChange={(e) => setHmo(e.target.value)}>
          <option value="">All HMOs</option>{(settings?.hmos || []).map((h) => <option key={h._id} value={h.name}>{h.name}</option>)}
        </select>
        <select className="form-input form-select" aria-label="Claim status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>{Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {data?.data.length > 0 && <button className="btn btn-secondary" onClick={() => download(data.data.map((b) => ({ bill: b.billNumber, date: fmtDate(b.createdAt), hmo: b.hmo?.name, enrolleeId: b.hmo?.enrolleeId || b.patientId?.insurance?.enrolleeId, patient: fullName(b.patientId), hospitalNumber: b.patientId?.hospitalNumber, services: b.items.map((i) => i.description).join('; '), billTotal: b.total, hmoAmount: b.hmoAmount, claimStatus: CLAIM_STATUS[b.claim?.status || 'pending'].label })), `hmo-claims-${from}-to-${to}.csv`)}><RiDownload2Line /> Export claim sheet</button>}
      </div>
      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
        <>
          {data.summary.length > 0 && (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>HMO</th><th className="num">Bills</th><th className="num">To claim</th><th className="num">Submitted</th><th className="num">Paid</th><th className="num">Rejected</th></tr></thead>
              <tbody>{data.summary.map((s) => <tr key={s.hmo}><td className="sc-strong">{s.hmo}</td><td className="num">{s.bills}</td><td className="num">{money(s.pending)}</td><td className="num">{money(s.submitted)}</td><td className="num">{money(s.paid)}</td><td className="num">{money(s.rejected)}</td></tr>)}</tbody>
            </table></div>
          )}
          {picked.size > 0 && (
            <div className="sc-filters">
              <span>{picked.size} selected</span>
              <button className="btn btn-secondary btn-sm" onClick={() => mark('submitted')}>Mark submitted</button>
              <button className="btn btn-secondary btn-sm" onClick={() => mark('paid')}>Mark paid</button>
              <button className="btn btn-ghost btn-sm" onClick={() => mark('rejected')}>Mark rejected</button>
              <button className="btn btn-ghost btn-sm" onClick={() => mark('pending')}>Reset</button>
            </div>
          )}
          {data.data.length === 0 ? <p className="cell-sub card-pad">No HMO bills in this period.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th><input type="checkbox" aria-label="Select all" checked={picked.size === data.data.length} onChange={(e) => setPicked(e.target.checked ? new Set(data.data.map((b) => b._id)) : new Set())} /></th><th>Bill</th><th>Patient</th><th>HMO</th><th className="num">HMO pays</th><th>Claim</th></tr></thead>
              <tbody>{data.data.map((b) => (
                <tr key={b._id}>
                  <td><input type="checkbox" aria-label={`Select ${b.billNumber}`} checked={picked.has(b._id)} onChange={() => toggle(b._id)} /></td>
                  <td><Link to={`/hospital/bills/${b._id}`} className="sc-strong">{b.billNumber}</Link><span className="cell-sub">{fmtDate(b.createdAt)}</span></td>
                  <td>{fullName(b.patientId)}<span className="cell-sub">{b.hmo?.enrolleeId || b.patientId?.insurance?.enrolleeId || b.patientId?.hospitalNumber}</span></td>
                  <td>{b.hmo?.name}</td>
                  <td className="num">{money(b.hmoAmount)}</td>
                  <td><span className={`badge badge-${CLAIM_STATUS[b.claim?.status || 'pending'].badge}`}>{CLAIM_STATUS[b.claim?.status || 'pending'].label}</span>{b.claim?.reference && <span className="cell-sub">{b.claim.reference}</span>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}
    </div>
  );
}
