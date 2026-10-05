import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiPieChartLine, RiLoader4Line, RiPrinterLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, PAYMENT_METHODS, BILL_STATUS, money, fmtDate, fmtDateTime, errMsg } from './schoolConstants';
import './School.css';

const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function TermReport() {
  const [settings, setSettings] = useState(null);
  const [q, setQ] = useState(null); // { session, term, from, to }
  const [data, setData] = useState(null);

  useEffect(() => {
    schoolService.getSettings().then(({ data: r }) => {
      setSettings(r.data);
      setQ({ session: r.data.currentSession, term: r.data.currentTerm, from: '', to: '' });
    }).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => {
    if (!q) return;
    setData(null);
    schoolService.termReport({ session: q.session, term: q.term, from: q.from || undefined, to: q.to || undefined })
      .then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [q]);

  if (!q) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const y = Number(settings.currentSession.slice(0, 4));
  const sessions = [0, 1, 2].map((i) => `${y - i}/${y - i + 1}`);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row sc-no-print">
        <div>
          <h1><RiPieChartLine style={{ verticalAlign: '-3px' }} /> Term report</h1>
          <p>Fees billed, collected and owed, plus the term's cash in against expenses and payroll.</p>
        </div>
        <div className="sc-actions">
          <select className="form-input form-select" value={q.session} onChange={(e) => setQ({ ...q, session: e.target.value })} aria-label="Session">{sessions.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="form-input form-select" value={q.term} onChange={(e) => setQ({ ...q, term: e.target.value })} aria-label="Term">{Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn btn-primary" disabled={!data} onClick={() => window.print()}><RiPrinterLine /> Print</button>
        </div>
      </div>

      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
        <>
          {!data.hasWindow && (
            <div className="card card-pad sc-no-print" style={{ marginBottom: 16 }}>
              <div className="sc-note warn" style={{ marginBottom: 12 }}>
                To include cash in, expenses and payroll, give the term's dates — set them in <Link to="/school/settings">School settings</Link> for the current term, or pick them here.
              </div>
              <div className="sc-actions">
                <label className="form-label" style={{ margin: 0 }}>From</label>
                <input className="form-input" type="date" style={{ width: 'auto' }} value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} />
                <label className="form-label" style={{ margin: 0 }}>To</label>
                <input className="form-input" type="date" style={{ width: 'auto' }} value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} />
              </div>
            </div>
          )}
          <Report data={data} />
        </>
      )}
    </div>
  );
}

function Report({ data }) {
  const { fees, cashflow: cf, enrolment: en } = data;
  return (
    <div className="sc-doc">
      <div className="sc-doc-head">
        {data.school.logo && <img src={data.school.logo} alt="" />}
        <div>
          <h2>{data.school.schoolName}</h2>
          <div className="sub">{data.school.address}</div>
        </div>
      </div>
      <p className="sc-doc-title">Term report — {TERMS[data.term]}, {data.session}</p>
      <p style={{ fontSize: 12, color: '#475569', marginTop: -8 }}>Prepared {fmtDateTime(data.generatedAt)}{cf && ` · cash flow ${fmtDate(cf.from)} – ${fmtDate(cf.to)}`}</p>

      <div className="sc-report-grid">
        <div>
          <h3>Fees position</h3>
          <table>
            <tbody>
              <tr><td>Fees billed (gross)</td><td className="num">{money(fees.gross)}</td></tr>
              <tr><td>Less discounts</td><td className="num">−{money(fees.discounts)}</td></tr>
              <tr><td>Less waivers / scholarships</td><td className="num">−{money(fees.waived)}</td></tr>
              <tr><th>Net fees due</th><th className="num">{money(fees.netBilled)}</th></tr>
              <tr><td>Collected</td><td className="num">{money(fees.collected)}</td></tr>
              <tr><th>Outstanding</th><th className="num">{money(fees.outstanding)}</th></tr>
              {fees.credit > 0 && <tr><td>Overpaid (credit to parents)</td><td className="num">{money(fees.credit)}</td></tr>}
              <tr><th>Collection rate</th><th className="num">{fees.collectionRate == null ? '—' : `${fees.collectionRate}%`}</th></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#475569' }}>{fees.bills} bills to {fees.students} students · {Object.entries(fees.byStatus).map(([k, v]) => `${v.count} ${BILL_STATUS[k]?.label.toLowerCase() || k}`).join(', ')}</p>
        </div>

        <div>
          <h3>Cash flow</h3>
          {!cf ? <p style={{ fontSize: 13, color: '#475569' }}>Term dates not set — see the note above.</p> : (
            <table>
              <tbody>
                <tr><td>Fees for this term</td><td className="num">{money(cf.feesThisTerm)}</td></tr>
                <tr><td>Arrears from earlier terms</td><td className="num">{money(cf.arrearsRecovered)}</td></tr>
                <tr><th>Total cash in</th><th className="num">{money(cf.totalIn)}</th></tr>
                <tr><td>Expenses</td><td className="num">−{money(cf.expenses)}</td></tr>
                <tr><td>Payroll (net pay)</td><td className="num">−{money(cf.payroll)}</td></tr>
                <tr><th>Net position</th><th className="num" style={{ color: cf.net < 0 ? '#b91c1c' : '#047857' }}>{cf.net < 0 ? '−' : ''}{money(Math.abs(cf.net))}</th></tr>
              </tbody>
            </table>
          )}
          {cf?.otherCurrencyExpenses > 0 && <p style={{ fontSize: 12, color: '#475569' }}>{cf.otherCurrencyExpenses} expense(s) in other currencies are not included.</p>}
        </div>
      </div>

      <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>By class</h3>
      <table style={{ marginBottom: 16 }}>
        <thead><tr><th>Class</th><th className="num">Students</th><th className="num">Fully paid</th><th className="num">Due</th><th className="num">Collected</th><th className="num">Outstanding</th><th className="num">Rate</th></tr></thead>
        <tbody>
          {fees.byClass.map((c) => (
            <tr key={c._id || 'none'}>
              <td>{c.name || 'No class'}</td><td className="num">{c.students}</td><td className="num">{c.paid}</td><td className="num">{money(c.billed)}</td>
              <td className="num">{money(c.collected)}</td><td className="num">{money(c.outstanding)}</td><td className="num">{c.billed ? `${Math.round((c.collected / c.billed) * 100)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sc-report-grid">
        <div>
          <h3>Billed by fee item</h3>
          <table><tbody>{fees.byItem.map((i) => <tr key={i._id}><td>{i._id}</td><td className="num">{money(i.billed)}</td></tr>)}</tbody></table>
        </div>
        <div>
          <h3>This term's fees by payment method</h3>
          <table><tbody>{fees.byMethod.length ? fees.byMethod.map((m) => <tr key={m._id}><td>{PAYMENT_METHODS[m._id] || m._id} ({m.count})</td><td className="num">{money(m.amount)}</td></tr>) : <tr><td>No payments yet</td><td /></tr>}</tbody></table>
          <h3 style={{ marginTop: 12 }}>Collected by month</h3>
          <table><tbody>{fees.byMonth.map((m) => <tr key={m._id}><td>{monthName(m._id)}</td><td className="num">{money(m.amount)}</td></tr>)}</tbody></table>
        </div>
      </div>

      {cf && (
        <div className="sc-report-grid">
          <div>
            <h3>Expenses by category</h3>
            <table><tbody>{cf.expensesByCategory.length ? cf.expensesByCategory.map((e) => <tr key={e.category}><td>{cap(e.category)} ({e.count})</td><td className="num">{money(e.amount)}</td></tr>) : <tr><td>None recorded</td><td /></tr>}</tbody></table>
          </div>
          <div>
            <h3>Payroll runs</h3>
            <table><tbody>{cf.payrollRuns.length ? cf.payrollRuns.map((p) => <tr key={`${p.year}-${p.month}`}><td>{monthName(`${p.year}-${String(p.month).padStart(2, '0')}`)} · {p.status}</td><td className="num">{money(p.net)}</td></tr>) : <tr><td>None recorded</td><td /></tr>}</tbody></table>
          </div>
        </div>
      )}

      <div className="sc-report-grid">
        <div>
          <h3>Largest outstanding balances</h3>
          <table>
            <tbody>
              {fees.topDebtors.length ? fees.topDebtors.map((d) => <tr key={d._id}><td>{d.name} <span style={{ color: '#475569' }}>({d.className || '—'})</span></td><td className="num">{money(d.balance)}</td></tr>) : <tr><td>Nobody owes for this term</td><td /></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Enrolment</h3>
          <table>
            <tbody>
              <tr><td>Active students now</td><td className="num">{en.active}</td></tr>
              {en.joined != null && <tr><td>Joined during the term</td><td className="num">{en.joined}</td></tr>}
              {Object.entries(en.left).map(([k, v]) => <tr key={k}><td>{cap(k)} during the term</td><td className="num">{v}</td></tr>)}
              {Object.keys(en.applications).length > 0 && <tr><td>Applications received</td><td className="num">{Object.values(en.applications).reduce((s, n) => s + n, 0)}</td></tr>}
              {en.applications.enrolled > 0 && <tr><td>…of which enrolled</td><td className="num">{en.applications.enrolled}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sc-doc-foot"><div /><div><div className="sc-doc-sign">Proprietor / Bursar</div></div></div>
    </div>
  );
}
