import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { procurementService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiGovernmentLine, RiAddLine, RiSearchLine, RiEyeLine, RiDownloadLine,
  RiCheckLine, RiTimeLine, RiCloseLine, RiFileChartLine,
} from 'react-icons/ri';
import VendorRegister from './VendorRegister';
import BudgetManager from './BudgetManager';
import './Procurement.css';

export const TYPE_LABELS = {
  purchase_requisition: 'Purchase Requisition', request_for_quotation: 'Request for Quotation',
  purchase_order: 'Purchase Order', contract_award: 'Contract Award',
  goods_receipt: 'Goods Receipt', payment_voucher: 'Payment Voucher',
};
export const STATUS_COLORS = { draft: 'neutral', pending_approval: 'warning', approved: 'success', rejected: 'danger', cancelled: 'neutral', completed: 'brand' };
export const PRIORITY_COLORS = { urgent: 'danger', high: 'warning', medium: 'info', low: 'success' };
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function ApprovalProgress({ chain, currentApprovalLevel }) {
  if (!chain?.length) return <span className="muted">—</span>;
  return (
    <div className="approval-progress">
      {chain.map((s, i) => {
        const icon = s.status === 'approved' ? <RiCheckLine /> : s.status === 'rejected' ? <RiCloseLine /> : <RiTimeLine />;
        const cls = s.status === 'approved' ? 'ap-done' : s.status === 'rejected' ? 'ap-rejected' : s.order === currentApprovalLevel ? 'ap-current' : 'ap-pending';
        return (
          <span key={i} className="ap-step-wrap">
            <span className={`ap-step ${cls}`} title={`${s.approverRole}: ${s.status}`}>{icon} {s.approverRole.split(' ')[0]}</span>
            {i < chain.length - 1 && <span className="ap-arrow">→</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function Procurement() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const [tab, setTab] = useState('requisitions');
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [budgets, setBudgets] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    procurementService.getAll({
      search: search || undefined, type: typeFilter || undefined, status: statusFilter || undefined,
      department: deptFilter || undefined, limit: 100,
    })
      .then(({ data }) => setRequisitions(data.data || []))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load requisitions'))
      .finally(() => setLoading(false));
  }, [search, typeFilter, statusFilter, deptFilter]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { procurementService.getBudgets().then(({ data }) => setBudgets(data.data)).catch(() => {}); }, []);

  const stats = useMemo(() => {
    const total = requisitions.length;
    const pending = requisitions.filter((r) => r.status === 'pending_approval').length;
    const approved = requisitions.filter((r) => ['approved', 'completed'].includes(r.status)).length;
    const utilization = budgets.length
      ? Math.round(budgets.reduce((s, b) => s + (b.totalBudget ? (b.allocated / b.totalBudget) * 100 : 0), 0) / budgets.length)
      : 0;
    return { total, pending, approved, utilization };
  }, [requisitions, budgets]);

  const departments = useMemo(() => [...new Set(requisitions.map((r) => r.department).filter(Boolean))], [requisitions]);

  if (company && company.subscription?.plan !== 'business' && company.role !== 'super_admin') {
    return (
      <div className="procurement-page fade-in">
        <div className="upgrade-card card card-pad">
          <RiGovernmentLine style={{ fontSize: 40, color: 'var(--color-brand)' }} />
          <h2>e-Procurement is a Business Plan feature</h2>
          <p>Government-grade procurement management — requisitions, sequential approvals, vendor register, budget control and audit-ready reporting.</p>
          <Link to="/settings/billing" className="btn btn-primary">Upgrade to Business Plan</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="procurement-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiGovernmentLine style={{ verticalAlign: '-3px' }} /> e-Procurement</h1>
            <p>Government-grade procurement management</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/procurement/new')}><RiAddLine /> New Requisition</button>
        </div>
      </div>

      <div className="procurement-stats">
        <div className="proc-stat"><span className="ps-num">{stats.total}</span><span className="ps-label">Total Requisitions</span></div>
        <div className="proc-stat"><span className="ps-num">{stats.pending}</span><span className="ps-label">Pending Approval</span></div>
        <div className="proc-stat"><span className="ps-num">{stats.approved}</span><span className="ps-label">Approved</span></div>
        <div className="proc-stat"><span className="ps-num">{stats.utilization}%</span><span className="ps-label">Budget Utilized</span></div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'requisitions' ? 'active' : ''}`} onClick={() => setTab('requisitions')}>Requisitions</button>
        <button className={`admin-tab ${tab === 'vendors' ? 'active' : ''}`} onClick={() => setTab('vendors')}>Vendors</button>
        <button className={`admin-tab ${tab === 'budgets' ? 'active' : ''}`} onClick={() => setTab('budgets')}>Budgets</button>
        <button className={`admin-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</button>
      </div>

      {tab === 'requisitions' && (
        <div className="card card-pad">
          <div className="contract-filters">
            <div className="contract-search"><RiSearchLine /><input placeholder="Search by reference or title…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            {departments.length > 0 && (
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th><th>Title</th><th>Type</th><th>Department</th><th>Value</th>
                  <th>Priority</th><th>Approval Progress</th><th>Status</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={10} className="muted">Loading…</td></tr>}
                {!loading && requisitions.length === 0 && (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <RiGovernmentLine className="empty-state-icon" />
                      <h3>No requisitions yet</h3>
                      <p>Create your first purchase requisition to get started.</p>
                      <button className="btn btn-primary" onClick={() => navigate('/procurement/new')}><RiAddLine /> New Requisition</button>
                    </div>
                  </td></tr>
                )}
                {requisitions.map((r) => (
                  <tr key={r._id} className="contract-row" onClick={() => navigate(`/procurement/${r._id}`)}>
                    <td className="mono">{r.referenceNumber}</td>
                    <td><strong>{r.title}</strong></td>
                    <td><span className="badge badge-neutral">{TYPE_LABELS[r.type] || r.type}</span></td>
                    <td className="muted">{r.department || '—'}</td>
                    <td>{naira(r.estimatedTotal)}</td>
                    <td><span className={`badge badge-${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                    <td onClick={(e) => e.stopPropagation()}><ApprovalProgress chain={r.approvalChain} currentApprovalLevel={r.currentApprovalLevel} /></td>
                    <td><span className={`badge badge-${STATUS_COLORS[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                    <td className="muted">{fmtDate(r.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => navigate(`/procurement/${r._id}`)}><RiEyeLine /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vendors' && <VendorRegister />}
      {tab === 'budgets' && <BudgetManager budgets={budgets} onReload={() => procurementService.getBudgets().then(({ data }) => setBudgets(data.data))} />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

function ReportsTab() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    procurementService.getReports().then(({ data }) => setReport(data.data)).catch(() => toast.error('Failed to load report')).finally(() => setLoading(false));
  }, []);

  async function exportCSV() {
    try {
      const { data } = await procurementService.getReports({ format: 'csv' });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'procurement-report.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to export CSV'); }
  }

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />;
  if (!report) return null;

  return (
    <>
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3><RiFileChartLine /> Procurement Activity Report</h3>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}><RiDownloadLine /> Export CSV</button>
      </div>

      <div className="proc-report-grid">
        <div className="card card-pad">
          <h4>By Status</h4>
          {report.activity.byStatus.map((s) => (
            <div key={s._id} className="proc-report-row"><span>{s._id?.replace('_', ' ')}</span><span>{s.count} · {naira(s.value)}</span></div>
          ))}
        </div>
        <div className="card card-pad">
          <h4>By Type</h4>
          {report.activity.byType.map((s) => (
            <div key={s._id} className="proc-report-row"><span>{TYPE_LABELS[s._id] || s._id}</span><span>{s.count} · {naira(s.value)}</span></div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Budget Utilization</h3></div>
        <div className="table-wrapper">
          <table className="table compact">
            <thead><tr><th>Code</th><th>Department</th><th>Total</th><th>Allocated</th><th>Spent</th><th>Available</th><th>Utilization</th></tr></thead>
            <tbody>
              {report.budgetUtilization.map((b, i) => (
                <tr key={i}>
                  <td className="mono">{b.code}</td><td>{b.department || '—'}</td><td>{naira(b.totalBudget)}</td>
                  <td>{naira(b.allocated)}</td><td>{naira(b.spent)}</td><td>{naira(b.available)}</td>
                  <td><span className={`badge badge-${b.utilizationPercent >= 80 ? 'danger' : 'success'}`}>{b.utilizationPercent}%</span></td>
                </tr>
              ))}
              {!report.budgetUtilization.length && <tr><td colSpan={7} className="muted">No budget lines yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Vendor Performance</h3></div>
        <div className="table-wrapper">
          <table className="table compact">
            <thead><tr><th>Vendor</th><th>Rating</th><th>Orders</th><th>Total Value</th><th>Status</th></tr></thead>
            <tbody>
              {report.vendorPerformance.map((v) => (
                <tr key={v._id}>
                  <td>{v.name}</td><td>{v.rating || '—'}★</td><td>{v.totalOrders}</td><td>{naira(v.totalValue)}</td>
                  <td>{v.blacklisted ? <span className="badge badge-danger">Blacklisted</span> : v.isPrequalified ? <span className="badge badge-success">Prequalified</span> : <span className="badge badge-neutral">Standard</span>}</td>
                </tr>
              ))}
              {!report.vendorPerformance.length && <tr><td colSpan={5} className="muted">No vendors yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
