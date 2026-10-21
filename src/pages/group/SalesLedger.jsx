import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { RiFileCheckLine, RiPrinterLine, RiDownloadLine, RiLoader4Line, RiShieldCheckLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { naira, fmtDate, todayYmd, LINE_SHORT } from './groupUtils';
import './Group.css';

const minusDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

export default function SalesLedger() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const [from, setFrom] = useState(minusDays(todayYmd(), 6));
  const [to, setTo] = useState(todayYmd());
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { groupService.getBranches().then(({ data: r }) => setBranches(r.data || [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    groupService.ledger({ from, to, branchId: branchId || undefined })
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load the ledger'))
      .finally(() => setLoading(false));
  }, [from, to, branchId]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!data?.entries.length) return;
    const rows = data.entries.map((e) => ({
      'Ledger No': e.ledgerNumber, Date: e.reportDate.slice(0, 10), Branch: e.branchName, Department: e.department,
      Shift: e.shift?.name ? `${e.shift.name} ${e.shift.start || ''}-${e.shift.end || ''}` : '', Attendant: e.attendantName || '',
      Reference: e.referenceNumber, 'Litres': e.totals.litres || '', 'Sales (NGN)': e.totals.expectedSales,
      'Collected (NGN)': e.totals.collected, 'Expenses (NGN)': e.totals.expenses, 'Variance (NGN)': e.totals.variance,
      'Branch approval': e.approvals?.find((a) => a.level === 'branch_manager')?.byName || '',
      'Final approval': e.approvals?.find((a) => a.level === 'owner')?.byName || '',
    }));
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `approved-sales_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const T = data?.totals || {};

  return (
    <div className="grp-page fade-in">
      <div className="page-header grp-no-print">
        <div className="page-header-row">
          <div>
            <h1><RiFileCheckLine style={{ verticalAlign: '-3px' }} /> Approved Sales Ledger</h1>
            <p className="muted">Only reports with final owner approval appear here. This is the official sales record.</p>
          </div>
          <div className="grp-row">
            <button className="btn btn-secondary" onClick={exportCsv} disabled={!data?.entries.length}><RiDownloadLine /> Excel / CSV</button>
            <button className="btn btn-primary" onClick={() => window.print()} disabled={!data?.entries.length}><RiPrinterLine /> Print / PDF</button>
          </div>
        </div>
      </div>

      <div className="card card-pad grp-no-print">
        <div className="grp-filters" style={{ marginBottom: 0 }}>
          <label className="muted" style={{ fontSize: 13 }}>From</label>
          <input type="date" className="form-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <label className="muted" style={{ fontSize: 13 }}>To</label>
          <input type="date" className="form-input" value={to} min={from} max={todayYmd()} onChange={(e) => setTo(e.target.value)} />
          <select className="form-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>
      ) : (
        <div className="card grp-doc">
          <div className="grp-doc-head">
            <div>
              <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{company?.companyName}</div>
              <h2>Approved Sales Statement</h2>
              <div className="muted" style={{ fontSize: 13 }}>{fmtDate(data.period.from)} to {fmtDate(data.period.to)}{branchId && ` · ${branches.find((b) => b._id === branchId)?.name}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="grp-doc-stamp"><RiShieldCheckLine /> Owner approved</span>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Generated {new Date().toLocaleString('en-NG')}</div>
            </div>
          </div>

          <div className="grp-recon" style={{ marginBottom: 24 }}>
            <div><div className="l">Approved sales</div><div className="v">{naira(T.sales)}</div></div>
            <div><div className="l">Collected</div><div className="v">{naira(T.collected)}</div></div>
            <div><div className="l">Expenses</div><div className="v">{naira(T.expenses)}</div></div>
            <div className={`verdict ${T.variance < -1000 ? 'short' : 'ok'}`}><div className="l">Net variance</div><div className={`v ${T.variance < -1000 ? 'grp-neg' : ''}`}>{naira(T.variance)}</div></div>
            {T.litres > 0 && <div><div className="l">Fuel sold</div><div className="v">{Math.round(T.litres).toLocaleString()} L</div></div>}
          </div>

          {data.entries.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: 30 }}>No approved sales in this period yet.</p>
          ) : (
            <>
              <h3 style={{ fontSize: 15 }}>Summary by branch</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Branch</th><th>Line</th><th style={{ textAlign: 'right' }}>Reports</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Collected</th><th style={{ textAlign: 'right' }}>Variance</th></tr></thead>
                  <tbody>
                    {data.byBranch.map((b) => (
                      <tr key={b.branch}>
                        <td style={{ fontWeight: 600 }}>{b.branch}</td><td>{LINE_SHORT[b.businessLine]}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{b.count}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.sales)}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.collected)}</td>
                        <td className={`grp-num ${b.variance < -1000 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{naira(b.variance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>Total</td><td className="grp-num" style={{ textAlign: 'right' }}>{T.count}</td><td className="grp-num" style={{ textAlign: 'right' }}>{naira(T.sales)}</td><td className="grp-num" style={{ textAlign: 'right' }}>{naira(T.collected)}</td><td className="grp-num" style={{ textAlign: 'right' }}>{naira(T.variance)}</td></tr></tfoot>
                </table>
              </div>

              <h3 style={{ fontSize: 15, marginTop: 28 }}>Ledger entries</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Ledger No</th><th>Date</th><th>Branch / Department</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Variance</th><th>Approved by</th></tr></thead>
                  <tbody>
                    {data.entries.map((e) => (
                      <tr key={e._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/group/reports/${e._id}`)}>
                        <td className="grp-mono">{e.ledgerNumber}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.reportDate)}</td>
                        <td>{e.branchName}<div className="muted" style={{ fontSize: 12 }}>{e.attendantName ? `${e.attendantName} · ${e.shift?.name || ''} shift` : e.department}</div></td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(e.totals.expectedSales)}</td>
                        <td className={`grp-num ${e.totals.variance < -1000 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{Math.abs(e.totals.variance) < 1000 ? '—' : naira(e.totals.variance)}</td>
                        <td style={{ fontSize: 12 }}>
                          {e.approvals?.filter((a) => a.status === 'approved').map((a) => (
                            <div key={a.level}>{a.level === 'owner' ? 'Owner' : 'Branch'}: {a.byName}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="grp-doc-sign">
            <div>Prepared by (Accounts)</div>
            <div>Verified by (Internal Audit)</div>
            <div>Approved by (Group Owner)</div>
          </div>
        </div>
      )}
    </div>
  );
}
