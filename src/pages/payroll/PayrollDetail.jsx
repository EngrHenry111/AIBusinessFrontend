import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { payrollService } from '../../services';
import {
  RiArrowLeftLine, RiMoneyDollarCircleLine, RiCheckDoubleLine, RiLoader4Line,
  RiFileDownloadLine, RiCheckLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Payroll.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAll, setBusyAll] = useState(false);
  const [busyEmp, setBusyEmp] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await payrollService.getOne(id);
      setPayroll(data.data);
    } catch {
      toast.error('Payroll not found');
      navigate('/payroll');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function markAllPaid() {
    if (!window.confirm('Mark every remaining employee as paid? This records the salary expense automatically.')) return;
    setBusyAll(true);
    try {
      const { data } = await payrollService.markPaid(id);
      setPayroll(data.data);
      toast.success('Payroll marked as paid');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark paid');
    } finally {
      setBusyAll(false);
    }
  }

  async function markEmployeePaid(empId) {
    setBusyEmp(empId);
    try {
      const { data } = await payrollService.markEmployeePaid(id, empId);
      setPayroll(data.data);
      toast.success('Marked as paid');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark paid');
    } finally {
      setBusyEmp(null);
    }
  }

  if (loading || !payroll) {
    return (
      <div className="payroll-page fade-in">
        <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
      </div>
    );
  }

  const monthLabel = `${MONTHS[payroll.month - 1]} ${payroll.year}`;
  const allPaid = payroll.status === 'paid';

  return (
    <div className="payroll-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/payroll" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}><RiArrowLeftLine /> Back to Payroll</Link>
            <h1><RiMoneyDollarCircleLine style={{ verticalAlign: '-3px', color: 'var(--color-brand)' }} /> {monthLabel}</h1>
            <p><span className={`pr-status ${payroll.status}`}>{payroll.status}</span> {payroll.paidAt && ` · Paid ${new Date(payroll.paidAt).toLocaleDateString()}`}</p>
          </div>
          {!allPaid && (
            <button className="btn btn-primary" disabled={busyAll} onClick={markAllPaid}>
              {busyAll ? <RiLoader4Line className="spin" /> : <RiCheckDoubleLine />} Mark All Paid
            </button>
          )}
        </div>
      </div>

      <div className="pr-summary">
        <div className="pr-summary-card"><div className="s-label">Staff</div><div className="s-value">{payroll.employees.length}</div></div>
        <div className="pr-summary-card"><div className="s-label">Gross</div><div className="s-value">{naira(payroll.totalGross)}</div></div>
        <div className="pr-summary-card"><div className="s-label">Deductions</div><div className="s-value">{naira(payroll.totalDeductions)}</div></div>
        <div className="pr-summary-card net"><div className="s-label">Net Payroll</div><div className="s-value">{naira(payroll.totalNet)}</div></div>
      </div>

      <div className="card">
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th className="amt">Gross</th><th className="amt">Tax</th>
                <th className="amt">Pension</th><th className="amt">Other</th><th className="amt">Net</th>
                <th>Bank</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payroll.employees.map((e) => (
                <tr key={e._id}>
                  <td><strong>{e.name}</strong>{e.email && <span className="pr-sub">{e.email}</span>}</td>
                  <td className="muted">{e.role || '—'}</td>
                  <td className="amt">{naira(e.grossSalary)}</td>
                  <td className="amt deduction">-{naira(e.deductions.tax)}</td>
                  <td className="amt deduction">-{naira(e.deductions.pension)}</td>
                  <td className="amt deduction">{e.deductions.other ? `-${naira(e.deductions.other)}` : '—'}</td>
                  <td className="amt"><strong>{naira(e.netSalary)}</strong></td>
                  <td className="muted">{e.bankName ? `${e.bankName}` : '—'}{e.accountNumber && <span className="pr-sub">{e.accountNumber}</span>}</td>
                  <td><span className={`pr-status ${e.status}`}>{e.status}</span></td>
                  <td>
                    <div className="pr-row-actions">
                      {e.status !== 'paid' && (
                        <button className="btn btn-sm btn-primary" disabled={busyEmp === e._id} onClick={() => markEmployeePaid(e._id)} title="Mark this employee paid">
                          {busyEmp === e._id ? <RiLoader4Line className="spin" /> : <RiCheckLine />}
                        </button>
                      )}
                      <a className="btn btn-sm btn-secondary" href={payrollService.payslipUrl(payroll._id, e._id)} target="_blank" rel="noreferrer" title="Generate payslip">
                        <RiFileDownloadLine />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="pr-total-row">
                <td colSpan={2}>Total</td>
                <td className="amt">{naira(payroll.totalGross)}</td>
                <td className="amt" colSpan={3}>-{naira(payroll.totalDeductions)}</td>
                <td className="amt">{naira(payroll.totalNet)}</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
