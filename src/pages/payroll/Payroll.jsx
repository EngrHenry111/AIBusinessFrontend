import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrollService } from '../../services';
import {
  RiMoneyDollarCircleLine, RiAddLine, RiUserStarLine, RiLoader4Line,
  RiCheckDoubleLine, RiFileDownloadLine, RiEditLine, RiDeleteBinLine,
  RiFileList3Line, RiEyeLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import StaffForm from './StaffForm';
import './Payroll.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const now = new Date();

export default function Payroll() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('current');
  const [staff, setStaff] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [currentPayroll, setCurrentPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [staffModal, setStaffModal] = useState(null); // null = closed, {} = add, staff obj = edit

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, payrollsRes] = await Promise.all([payrollService.getStaff(), payrollService.getAll()]);
      setStaff(staffRes.data.data);
      setPayrolls(payrollsRes.data.data);

      const thisMonth = payrollsRes.data.data.find((p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear());
      if (thisMonth) {
        const { data } = await payrollService.getOne(thisMonth._id);
        setCurrentPayroll(data.data);
      } else {
        setCurrentPayroll(null);
      }
    } catch {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generatePayroll() {
    setGenerating(true);
    try {
      const { data } = await payrollService.generate(now.getMonth() + 1, now.getFullYear());
      setCurrentPayroll(data.data);
      toast.success(`Payroll generated for ${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  }

  async function markAllPaid() {
    if (!currentPayroll || !window.confirm(`Mark all ${currentPayroll.employees.length} staff as paid for ${MONTHS[currentPayroll.month - 1]} ${currentPayroll.year}? This records a salary expense automatically.`)) return;
    setBusy(true);
    try {
      const { data } = await payrollService.markPaid(currentPayroll._id);
      setCurrentPayroll(data.data);
      toast.success('Payroll marked as paid — expense recorded');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark paid');
    } finally {
      setBusy(false);
    }
  }

  function downloadPayslips() {
    if (!currentPayroll?.employees?.length) return;
    currentPayroll.employees.forEach((emp, i) => {
      setTimeout(() => window.open(payrollService.payslipUrl(currentPayroll._id, emp._id), '_blank'), i * 250);
    });
  }

  async function downloadReport(payrollId) {
    try {
      const { data } = await payrollService.getOne(payrollId);
      const p = data.data;
      const rows = [
        ['Name', 'Role', 'Gross Salary', 'Tax', 'Pension', 'Other Deductions', 'Net Salary', 'Status'],
        ...p.employees.map((e) => [e.name, e.role || '', e.grossSalary, e.deductions.tax, e.deductions.pension, e.deductions.other, e.netSalary, e.status]),
        [],
        ['Total', '', p.totalGross, '', '', '', p.totalNet, ''],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${MONTHS[p.month - 1]}-${p.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    }
  }

  async function removeStaff(s) {
    if (!window.confirm(`Remove ${s.name} from payroll? This won't affect past payroll history.`)) return;
    try {
      await payrollService.removeStaff(s._id);
      toast.success('Staff removed');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to remove staff');
    }
  }

  const totalGross = staff.reduce((s, x) => s + x.grossSalary, 0);
  const totalDeductions = staff.reduce((s, x) => s + x.deductions.tax + x.deductions.pension + x.deductions.other, 0);
  const totalNet = staff.reduce((s, x) => s + x.netSalary, 0);

  if (loading) {
    return (
      <div className="payroll-page fade-in">
        <div className="page-header"><h1>Payroll Management</h1></div>
        <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="payroll-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiMoneyDollarCircleLine style={{ verticalAlign: '-3px', color: 'var(--color-brand)' }} /> Payroll Management</h1>
            <p>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!currentPayroll && (
              <button className="btn btn-primary" disabled={generating || !staff.length} onClick={generatePayroll}>
                {generating ? <RiLoader4Line className="spin" /> : <RiAddLine />} Generate Payroll
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setTab('staff')}><RiUserStarLine /> Manage Staff</button>
          </div>
        </div>
      </div>

      <div className="pr-summary">
        <div className="pr-summary-card"><div className="s-label">Total Staff</div><div className="s-value">{staff.length}</div></div>
        <div className="pr-summary-card"><div className="s-label">Total Monthly Salary</div><div className="s-value">{naira(totalGross)}</div></div>
        <div className="pr-summary-card"><div className="s-label">Total Deductions</div><div className="s-value">{naira(totalDeductions)}</div></div>
        <div className="pr-summary-card net"><div className="s-label">Net Payroll Amount</div><div className="s-value">{naira(totalNet)}</div></div>
      </div>

      <div className="pr-tabs">
        <button className={`pr-tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>This Month</button>
        <button className={`pr-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
        <button className={`pr-tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>Staff Salaries</button>
      </div>

      {tab === 'current' && (
        <div className="card card-pad">
          {!staff.length ? (
            <div className="pr-empty">
              <RiUserStarLine />
              <h3>No staff added yet</h3>
              <p>Add your team's salary details before generating a payroll run.</p>
              <button className="btn btn-primary" onClick={() => setTab('staff')}><RiAddLine /> Add Staff</button>
            </div>
          ) : !currentPayroll ? (
            <div className="pr-empty">
              <RiFileList3Line />
              <h3>No payroll generated for {MONTHS[now.getMonth()]} {now.getFullYear()} yet</h3>
              <p>{staff.length} active staff member{staff.length === 1 ? '' : 's'} ready — generate this month's payroll to calculate deductions and net pay.</p>
              <button className="btn btn-primary" disabled={generating} onClick={generatePayroll}>
                {generating ? <RiLoader4Line className="spin" /> : <RiAddLine />} Generate Payroll
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <span className={`pr-status ${currentPayroll.status}`}>{currentPayroll.status}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={downloadPayslips}><RiFileDownloadLine /> Download Payslips</button>
                  {currentPayroll.status !== 'paid' && (
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={markAllPaid}>
                      {busy ? <RiLoader4Line className="spin" /> : <RiCheckDoubleLine />} Mark All Paid
                    </button>
                  )}
                </div>
              </div>
              <div className="pr-table-wrap">
                <table className="pr-table">
                  <thead>
                    <tr><th>Name</th><th>Role</th><th className="amt">Gross</th><th className="amt">Tax</th><th className="amt">Pension</th><th className="amt">Net</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {currentPayroll.employees.map((e) => (
                      <tr key={e._id}>
                        <td><strong>{e.name}</strong></td>
                        <td className="muted">{e.role || '—'}</td>
                        <td className="amt">{naira(e.grossSalary)}</td>
                        <td className="amt deduction">-{naira(e.deductions.tax)}</td>
                        <td className="amt deduction">-{naira(e.deductions.pension)}</td>
                        <td className="amt"><strong>{naira(e.netSalary)}</strong></td>
                        <td><span className={`pr-status ${e.status}`}>{e.status}</span></td>
                      </tr>
                    ))}
                    <tr className="pr-total-row">
                      <td colSpan={2}>Total</td>
                      <td className="amt">{naira(currentPayroll.totalGross)}</td>
                      <td className="amt" colSpan={2}>-{naira(currentPayroll.totalDeductions)}</td>
                      <td className="amt">{naira(currentPayroll.totalNet)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/payroll/${currentPayroll._id}`)}>
                  <RiEyeLine /> View full breakdown
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {!payrolls.length ? (
            <div className="pr-empty"><RiFileList3Line /><h3>No payroll history yet</h3></div>
          ) : (
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead><tr><th>Month/Year</th><th>Staff Count</th><th className="amt">Total (Net)</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {payrolls.map((p) => (
                    <tr key={p._id}>
                      <td><strong>{MONTHS[p.month - 1]} {p.year}</strong></td>
                      <td>{p.staffCount}</td>
                      <td className="amt">{naira(p.totalNet)}</td>
                      <td><span className={`pr-status ${p.status}`}>{p.status}</span></td>
                      <td>
                        <div className="pr-row-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/payroll/${p._id}`)}><RiEyeLine /> View</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => downloadReport(p._id)}><RiFileDownloadLine /> Report</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="card">
          <div className="card-header-row" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Staff Salaries</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setStaffModal({})}><RiAddLine /> Add Staff</button>
          </div>
          {!staff.length ? (
            <div className="pr-empty"><RiUserStarLine /><h3>No staff yet</h3><p>Add your first staff member to start running payroll.</p></div>
          ) : (
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead><tr><th>Name</th><th>Role</th><th className="amt">Gross</th><th className="amt">Net</th><th>Bank Details</th><th>Actions</th></tr></thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s._id}>
                      <td><strong>{s.name}</strong>{s.email && <span className="pr-sub">{s.email}</span>}</td>
                      <td className="muted">{s.role || '—'}</td>
                      <td className="amt">{naira(s.grossSalary)}</td>
                      <td className="amt">{naira(s.netSalary)}</td>
                      <td className="muted">{s.bankName ? `${s.bankName} · ${s.accountNumber}` : '—'}</td>
                      <td>
                        <div className="pr-row-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => setStaffModal(s)}><RiEditLine /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => removeStaff(s)}><RiDeleteBinLine /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {staffModal !== null && (
        <StaffForm
          staff={staffModal._id ? staffModal : null}
          onClose={() => setStaffModal(null)}
          onSaved={() => { setStaffModal(null); load(); }}
        />
      )}
    </div>
  );
}
