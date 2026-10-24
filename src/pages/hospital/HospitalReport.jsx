import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RiPieChartLine, RiLoader4Line, RiPrinterLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import { CHARGE_CATEGORIES, PAYMENT_METHODS, VISIT_TYPES, OUTCOMES, money, todayInput, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const monthStart = () => `${todayInput().slice(0, 8)}01`;

function Bars({ rows, label, value, format = (v) => v }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <p className="cell-sub">Nothing in this period.</p>;
  return (
    <div className="sc-bars">
      {rows.map((r, i) => (
        <div key={i} className="sc-bar-row">
          <span className="truncate">{label(r)}</span>
          <div className="sc-progress"><div style={{ width: `${(value(r) / max) * 100}%` }} /></div>
          <span className="num">{format(value(r))}</span>
        </div>
      ))}
    </div>
  );
}

export default function HospitalReport() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayInput());
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    setData(null);
    try { const { data: r } = await hospitalService.getReport({ from, to }); setData(r.data); } catch (e) { toast.error(errMsg(e)); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiPieChartLine style={{ verticalAlign: '-3px' }} /> Hospital report</h1>
          <p>Money, patients, clinics, diagnoses, lab and pharmacy for any period.</p>
        </div>
        <div className="sc-actions sc-no-print">
          <input className="form-input" type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="form-input" type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => window.print()}><RiPrinterLine /> Print</button>
        </div>
      </div>
      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
        <>
          <div className="sc-stats">
            <div className="stat-card"><div className="stat-label">Billed</div><div className="stat-value">{money(data.revenue.billed)}</div><div className="cell-sub">All charges added in the period</div></div>
            <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value">{money(data.revenue.collected)}</div><div className="cell-sub">Payments received</div></div>
            <div className="stat-card"><div className="stat-label">Visits</div><div className="stat-value">{data.visits.total}</div><div className="cell-sub">{data.patients.new} new patients</div></div>
            <div className="stat-card"><div className="stat-label">Admissions</div><div className="stat-value">{data.admissions.admitted}</div><div className="cell-sub">{data.admissions.discharged} discharged{data.admissions.averageStay != null ? ` · avg ${data.admissions.averageStay} days` : ''}</div></div>
          </div>
          <div className="sc-grid-2">
            <div className="card card-pad"><div className="sc-card-title">Billed by service</div>
              <Bars rows={Object.entries(data.revenue.byCategory).sort((a, b) => b[1] - a[1])} label={([k]) => CHARGE_CATEGORIES[k] || k} value={([, v]) => v} format={money} /></div>
            <div className="card card-pad"><div className="sc-card-title">Collected by method</div>
              <Bars rows={Object.entries(data.revenue.byMethod)} label={([k, v]) => `${PAYMENT_METHODS[k] || k} (${v.n})`} value={([, v]) => v.amount} format={money} />
              <div className="sc-kv" style={{ marginTop: 10 }}><span>Owed by patients now</span><div className="sc-owing">{money(data.revenue.outstanding)}</div></div>
            </div>
          </div>
          <div className="sc-grid-2">
            <div className="card card-pad"><div className="sc-card-title">Visits by clinic</div><Bars rows={data.visits.byDepartment} label={(r) => r.department} value={(r) => r.n} /></div>
            <div className="card card-pad"><div className="sc-card-title">Patients seen by doctor</div><Bars rows={data.visits.byDoctor} label={(r) => r.name} value={(r) => r.n} /></div>
          </div>
          <div className="sc-grid-2">
            <div className="card card-pad"><div className="sc-card-title">Top diagnoses</div><Bars rows={data.diagnoses} label={(r) => `${r.text}${r.code ? ` (${r.code})` : ''}`} value={(r) => r.n} /></div>
            <div className="card card-pad"><div className="sc-card-title">Visit types</div><Bars rows={Object.entries(data.visits.byType)} label={([k]) => VISIT_TYPES[k] || k} value={([, v]) => v} /></div>
          </div>
          <div className="sc-grid-2">
            <div className="card card-pad"><div className="sc-card-title">Most requested lab tests</div><Bars rows={data.lab} label={(r) => r.name} value={(r) => r.n} /></div>
            <div className="card card-pad"><div className="sc-card-title">Most dispensed drugs</div><Bars rows={data.drugs} label={(r) => r.name} value={(r) => r.qty} format={(v) => v.toLocaleString()} /></div>
          </div>
          <div className="sc-grid-2">
            <div className="card card-pad"><div className="sc-card-title">HMO share billed</div><Bars rows={data.revenue.hmo} label={(r) => `${r.hmo} (${r.bills})`} value={(r) => r.amount} format={money} /></div>
            <div className="card card-pad"><div className="sc-card-title">Discharge outcomes</div><Bars rows={Object.entries(data.admissions.byOutcome)} label={([k]) => OUTCOMES[k] || k} value={([, v]) => v} /></div>
          </div>
        </>
      )}
    </div>
  );
}
