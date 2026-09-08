import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auditService, userService } from '../../services';
import {
  RiHistoryLine, RiSearchLine, RiDownloadLine, RiFilterOffLine,
  RiArrowLeftSLine, RiArrowRightSLine, RiLoader4Line,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './AuditLog.css';

const PER_PAGE = 20;

const ACTION_TYPES = [
  ['', 'All actions'],
  ['auth', 'Auth (login / logout)'],
  ['document', 'Documents'],
  ['lead', 'Leads'],
  ['invoice', 'Invoices'],
  ['order', 'Orders'],
  ['appointment', 'Appointments'],
  ['team', 'Team'],
  ['settings', 'Settings'],
  ['billing', 'Billing'],
  ['whatsapp', 'WhatsApp'],
];

function actionColor(action = '', status) {
  const a = action.toLowerCase();
  if (status === 'failure' || /(delete|logout|remove|suspend|fail|disable|cancel|reject)/.test(a)) return 'red';
  if (/(update|edit|resend|role|plan|change|rename)/.test(a)) return 'yellow';
  if (/(view|download|export|initialize|list|read)/.test(a)) return 'blue';
  if (/(login|create|upload|paid|invite|enable|verif|register|import|add)/.test(a)) return 'green';
  return 'grey';
}

const fmtTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const maskIp = (ip) => {
  if (!ip) return '—';
  const p = String(ip).split('.');
  return p.length === 4 ? `xxx.xxx.x.${p[3]}` : `••••${String(ip).slice(-4)}`;
};

const EMPTY_FILTERS = { search: '', userId: '', action: '', startDate: '', endDate: '' };

export default function AuditLog() {
  const { user, isLoading } = useAuth();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const searchTimer = useRef(null);

  const canView = user && ['company_owner', 'manager', 'super_admin'].includes(user.role);

  useEffect(() => {
    userService.getTeam().then(({ data }) => setTeam(data.data || [])).catch(() => {});
  }, []);

  // Debounce the search box
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await auditService.getLogs({
        page,
        limit: PER_PAGE,
        search: debouncedSearch || undefined,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setLogs(data.logs || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch {
      toast.error('Failed to load the activity log');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.userId, filters.action, filters.startDate, filters.endDate]);

  useEffect(() => { if (canView) load(); }, [load, canView]);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); if (k !== 'search') setPage(1); };
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setDebouncedSearch(''); setPage(1); };
  const hasFilters = filters.search || filters.userId || filters.action || filters.startDate || filters.endDate;

  async function exportCsv() {
    setExporting(true);
    try {
      const { data } = await auditService.exportCSV({
        search: debouncedSearch || undefined,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizlyai-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) return <div className="al-loading"><RiLoader4Line className="spin" /></div>;
  if (!canView) return <Navigate to="/settings" replace />;

  const total = pagination.total || 0;
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div className="al-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiHistoryLine /> Activity Log</h1>
            <p>Track all actions taken by your team</p>
          </div>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? <RiLoader4Line className="spin" /> : <RiDownloadLine />} Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="al-filters card">
        <div className="al-search">
          <RiSearchLine />
          <input placeholder="Search descriptions…" value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)} />
        </div>

        <select value={filters.userId} onChange={(e) => setFilter('userId', e.target.value)}>
          <option value="">All team members</option>
          {team.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>

        <select value={filters.action} onChange={(e) => setFilter('action', e.target.value)}>
          {ACTION_TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>

        <div className="al-dates">
          <input type="date" value={filters.startDate} max={filters.endDate || undefined}
            onChange={(e) => setFilter('startDate', e.target.value)} />
          <span>→</span>
          <input type="date" value={filters.endDate} min={filters.startDate || undefined}
            onChange={(e) => setFilter('endDate', e.target.value)} />
        </div>

        {hasFilters && (
          <button className="al-clear" onClick={clearFilters}><RiFilterOffLine /> Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card al-table-card">
        {loading ? (
          <div className="al-loading"><RiLoader4Line className="spin" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiHistoryLine /></div>
            <h3>No activity yet</h3>
            <p>Activity will appear here as your team uses the platform.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table al-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Action</th><th>Description</th><th>IP Address</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td className="al-time">{fmtTime(l.timestamp)}</td>
                    <td>
                      <span className="al-user">
                        <span className="al-avatar">
                          {l.user?.avatar
                            ? <img src={l.user.avatar} alt={l.user.name} />
                            : <span>{(l.user?.name || 'S')[0].toUpperCase()}</span>}
                        </span>
                        {l.user?.name || 'System'}
                      </span>
                    </td>
                    <td><span className={`al-badge ${actionColor(l.action, l.status)}`}>{l.action}</span></td>
                    <td className="al-desc">{l.description || '—'}</td>
                    <td className="al-ip">{maskIp(l.ip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="al-pagination">
            <span>Showing {from}–{to} of {total} entries</span>
            <div className="al-pager">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                <RiArrowLeftSLine /> Previous
              </button>
              <button disabled={page >= pagination.pages || loading} onClick={() => setPage((p) => p + 1)}>
                Next <RiArrowRightSLine />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
