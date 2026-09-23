import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services';
import {
  RiBuilding2Line, RiUserLine, RiBarChartLine, RiShieldLine,
  RiLoader4Line, RiSearchLine, RiCheckLine, RiCloseLine,
  RiFileTextLine, RiRobot2Line, RiArrowUpLine, RiArrowDownLine,
  RiMoneyDollarCircleLine, RiPulseLine, RiRefreshLine, RiMailSendLine,
  RiDatabase2Line, RiServerLine, RiCpuLine, RiTimeLine, RiEyeLine,
  RiSearchEyeLine, RiStore2Line, RiStarFill, RiStarLine, RiExternalLinkLine,
  RiShoppingBag3Line,
} from 'react-icons/ri';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import './Admin.css';

const PLAN_COLORS = {
  trial: '#94a3b8', starter: '#6366f1', professional: '#8b5cf6',
  business: '#f59e0b', enterprise: '#10b981',
};
const PLAN_ORDER = ['trial', 'starter', 'professional', 'business', 'enterprise'];
const TABS = [
  { id: 'overview', label: 'Overview', icon: RiBarChartLine },
  { id: 'companies', label: 'Companies', icon: RiBuilding2Line },
  { id: 'users', label: 'Users', icon: RiUserLine },
  { id: 'revenue', label: 'Revenue', icon: RiMoneyDollarCircleLine },
  { id: 'marketplace', label: 'Marketplace', icon: RiStore2Line },
  { id: 'system', label: 'System', icon: RiPulseLine },
];
const STORE_URL = (slug) => `https://bislyai.com/store/${slug}`;

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const fmtMoney = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtBytes = (b) => {
  if (!b) return '0 B';
  const k = 1024, u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(k)));
  return `${(b / k ** i).toFixed(1)} ${u[i]}`;
};
const fmtUptime = (s) => {
  if (!s) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const statusBadge = (s) =>
  s === 'active' ? 'success' : s === 'suspended' ? 'danger' : s === 'expired' ? 'warning' : 'neutral';

const chartTooltip = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
};

const Spinner = () => (
  <div className="admin-loading"><RiLoader4Line className="spin" /></div>
);

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState('overview');

  if (isLoading) return <Spinner />;
  if (!user || user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="admin-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiShieldLine style={{ color: '#ef4444' }} /> Super Admin</h1>
            <p>Live platform data across every company and user</p>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'companies' && <CompaniesTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'revenue' && <RevenueTab />}
      {tab === 'marketplace' && <MarketplaceTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([adminService.getStats(), adminService.getRevenue()]);
      setStats(s.data.data);
      setRevenue(r.data.data);
    } catch { toast.error('Failed to load platform stats'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!stats) return <div className="admin-empty">No data available</div>;

  const companyGrowth = stats.totalCompanies
    ? Math.round((stats.newCompaniesThisMonth / stats.totalCompanies) * 100)
    : 0;
  const userGrowth = stats.totalUsers
    ? Math.round((stats.newUsersThisMonth / stats.totalUsers) * 100)
    : 0;

  const cards = [
    { label: 'Total Companies', value: fmtNum(stats.totalCompanies), icon: RiBuilding2Line, color: '#6366f1', delta: companyGrowth, deltaLabel: 'this month' },
    { label: 'Monthly Revenue (MRR)', value: fmtMoney(stats.mrr), icon: RiMoneyDollarCircleLine, color: '#10b981', sub: `${fmtMoney(stats.totalRevenue)} all-time` },
    { label: 'Total Users', value: fmtNum(stats.totalUsers), icon: RiUserLine, color: '#8b5cf6', delta: userGrowth, deltaLabel: 'this month' },
    { label: 'Active Subscriptions', value: fmtNum(stats.activeSubscriptions), icon: RiCheckLine, color: '#f59e0b', sub: `${stats.suspendedCompanies} suspended` },
    { label: 'Documents Processed', value: fmtNum(stats.totalDocuments), icon: RiFileTextLine, color: '#06b6d4' },
    { label: 'AI Conversations', value: fmtNum(stats.totalChats), icon: RiRobot2Line, color: '#ec4899', sub: `${fmtNum(stats.totalAIMessages)} messages` },
  ];

  const planData = PLAN_ORDER
    .map((p) => ({ name: cap(p), plan: p, count: stats.planBreakdown?.[p] || 0 }))
    .filter((d) => d.count > 0);

  return (
    <>
      <div className="admin-toolbar">
        <div />
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
      </div>

      <div className="admin-stats-grid">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="admin-stat card">
              <div className="as-top">
                <div className="as-icon" style={{ background: `${c.color}18`, color: c.color }}><Icon /></div>
                {c.delta != null && (
                  <span className={`as-delta ${c.delta >= 0 ? 'up' : 'down'}`}>
                    {c.delta >= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}{Math.abs(c.delta)}%
                  </span>
                )}
              </div>
              <div className="as-value">{c.value}</div>
              <div className="as-label">{c.label}</div>
              {c.sub && <div className="as-sub">{c.sub}</div>}
              {c.delta != null && c.deltaLabel && <div className="as-sub">+{c.delta}% {c.deltaLabel}</div>}
            </div>
          );
        })}
      </div>

      <div className="admin-charts">
        <div className="card card-pad">
          <h3>Plan Breakdown</h3>
          {planData.length === 0 ? <div className="chart-empty">No companies yet</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={planData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="count" name="Companies" radius={[6, 6, 0, 0]}>
                  {planData.map((d) => <Cell key={d.plan} fill={PLAN_COLORS[d.plan]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card card-pad">
          <h3>Revenue Trend <span className="muted">· last 6 months</span></h3>
          {!revenue?.trend?.some((t) => t.revenue > 0) ? (
            <div className="chart-empty">No revenue recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenue.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`)} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-brand)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="admin-split">
        <div className="card">
          <div className="card-header-row"><h3>Recent Signups</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Company</th><th>Owner</th><th>Plan</th><th>Joined</th></tr></thead>
              <tbody>
                {stats.recentSignups?.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.companyName}</strong></td>
                    <td className="cell-sub">{c.owner?.name}<br /><span>{c.owner?.email}</span></td>
                    <td><PlanTag plan={c.plan} /></td>
                    <td className="muted">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
                {!stats.recentSignups?.length && <tr><td colSpan={4} className="muted">No signups yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Recent Activity</h3></div>
          <div className="activity-feed">
            {stats.recentActivity?.map((a) => (
              <div key={a._id} className="activity-row">
                <div className={`activity-dot ${a.status === 'failure' ? 'fail' : 'ok'}`} />
                <div className="activity-body">
                  <span className="activity-action">{a.action}</span>
                  <span className="activity-desc">{a.description || '—'}</span>
                  <span className="activity-meta">
                    {a.user?.name || 'system'}{a.company ? ` · ${a.company}` : ''} · {fmtDateTime(a.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {!stats.recentActivity?.length && <div className="muted" style={{ padding: 16 }}>No activity yet</div>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Companies ───────────────────────── */
function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getCompanies({
        search: search || undefined, plan: planFilter || undefined, status: statusFilter || undefined, limit: 100,
      });
      setCompanies(data.data);
    } catch { toast.error('Failed to load companies'); }
    finally { setLoading(false); }
  }, [search, planFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changePlan(id, plan) {
    try {
      await adminService.updatePlan(id, plan);
      toast.success('Plan updated');
      setCompanies((prev) => prev.map((c) => (c._id === id ? { ...c, plan } : c)));
    } catch { toast.error('Failed to update plan'); }
  }

  async function toggleSuspend(c) {
    const suspending = c.status !== 'suspended';
    if (!window.confirm(`${suspending ? 'Suspend' : 'Reactivate'} ${c.companyName}?`)) return;
    try {
      await (suspending ? adminService.suspendCompany(c._id) : adminService.activateCompany(c._id));
      toast.success(suspending ? 'Company suspended' : 'Company reactivated');
      setCompanies((prev) => prev.map((x) => (x._id === c._id ? { ...x, status: suspending ? 'suspended' : 'active' } : x)));
    } catch { toast.error('Action failed'); }
  }

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <RiSearchLine />
          <input placeholder="Search companies…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="admin-select" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="">All plans</option>
          {PLAN_ORDER.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
        </select>
        <div className="status-filters">
          {['', 'active', 'suspended'].map((s) => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === '' ? 'All' : cap(s)}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /></button>
      </div>

      <div className="card">
        {loading ? <Spinner /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th><th>Owner</th><th>Plan</th><th>Status</th>
                  <th>Users</th><th>Docs</th><th>Revenue</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <button className="link-btn" onClick={() => setDetailId(c._id)}><strong>{c.companyName}</strong></button>
                    </td>
                    <td className="cell-sub">{c.owner?.name}<br /><span>{c.owner?.email}</span></td>
                    <td>
                      <select className="plan-select" value={c.plan} onChange={(e) => changePlan(c._id, e.target.value)}
                        style={{ color: PLAN_COLORS[c.plan] }}>
                        {PLAN_ORDER.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge badge-${statusBadge(c.status)}`}>{c.status}</span></td>
                    <td>{fmtNum(c.usersCount)}</td>
                    <td>{fmtNum(c.docsCount)}</td>
                    <td>{c.revenue ? fmtMoney(c.revenue) : '—'}</td>
                    <td className="muted">{fmtDate(c.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => setDetailId(c._id)}><RiEyeLine /></button>
                        <button className={`btn btn-sm ${c.status === 'suspended' ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => toggleSuspend(c)}>
                          {c.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!companies.length && <tr><td colSpan={9} className="muted">No companies match</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId && <CompanyDetail id={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}

function CompanyDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getCompany(id)
      .then(({ data }) => setData(data.data))
      .catch(() => toast.error('Failed to load company'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{loading ? 'Loading…' : data?.company?.companyName}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          {loading ? <Spinner /> : !data ? <div className="muted">Not found</div> : (
            <>
              <div className="detail-grid">
                <Detail label="Owner" value={`${data.company.owner?.name || '—'}`} sub={data.company.owner?.email} />
                <Detail label="Plan" value={<PlanTag plan={data.company.subscription?.plan} />} />
                <Detail label="Status" value={<span className={`badge badge-${statusBadge(data.company.status)}`}>{data.company.status}</span>} />
                <Detail label="Industry" value={data.company.industry || '—'} />
                <Detail label="Joined" value={fmtDate(data.company.createdAt)} />
                <Detail label="Renews" value={fmtDate(data.company.subscription?.currentPeriodEnd)} />
                <Detail label="Team" value={fmtNum(data.stats.teamCount)} />
                <Detail label="Documents" value={fmtNum(data.stats.documentsCount)} />
                <Detail label="AI Chats" value={fmtNum(data.stats.chatsCount)} />
                <Detail label="AI Messages" value={fmtNum(data.stats.aiMessagesCount)} />
                <Detail label="Team Messages" value={fmtNum(data.stats.messagesCount)} />
                <Detail label="Revenue" value={fmtMoney(data.stats.totalRevenue)} />
              </div>

              <h4 className="detail-heading">Team ({data.team.length})</h4>
              <div className="table-wrapper">
                <table className="table compact">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th></tr></thead>
                  <tbody>
                    {data.team.map((u) => (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong></td>
                        <td className="muted">{u.email}</td>
                        <td>{u.role?.replace('_', ' ')}</td>
                        <td><span className={`badge badge-${statusBadge(u.status)}`}>{u.status}</span></td>
                        <td className="muted">{u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="detail-heading">Documents ({data.stats.documentsCount})</h4>
              <div className="table-wrapper">
                <table className="table compact">
                  <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th><th>Uploaded</th></tr></thead>
                  <tbody>
                    {data.documents.slice(0, 25).map((d) => (
                      <tr key={d._id}>
                        <td>{d.name || d.originalName}</td>
                        <td className="muted">{d.fileType}</td>
                        <td className="muted">{fmtBytes(d.fileSize)}</td>
                        <td><span className={`badge badge-${d.status === 'ready' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}`}>{d.status}</span></td>
                        <td className="muted">{fmtDate(d.createdAt)}</td>
                      </tr>
                    ))}
                    {!data.documents.length && <tr><td colSpan={5} className="muted">No documents</td></tr>}
                  </tbody>
                </table>
              </div>

              <h4 className="detail-heading">Payment History ({data.payments.length})</h4>
              <div className="table-wrapper">
                <table className="table compact">
                  <thead><tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p._id}>
                        <td className="muted mono">{p.reference}</td>
                        <td>{cap(p.plan)}</td>
                        <td>{fmtMoney(p.amount)}</td>
                        <td><span className={`badge badge-${p.status === 'success' ? 'success' : 'danger'}`}>{p.status}</span></td>
                        <td className="muted">{fmtDate(p.paidAt)}</td>
                      </tr>
                    ))}
                    {!data.payments.length && <tr><td colSpan={5} className="muted">No payments</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Detail = ({ label, value, sub }) => (
  <div className="detail-item">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value}</span>
    {sub && <span className="detail-sub">{sub}</span>}
  </div>
);

const PlanTag = ({ plan }) => (
  <span className="plan-tag" style={{ background: `${PLAN_COLORS[plan] || '#94a3b8'}18`, color: PLAN_COLORS[plan] || '#94a3b8' }}>
    {cap(plan || 'trial')}
  </span>
);

/* ───────────────────────── Users ───────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getUsers({ search: search || undefined, role: role || undefined, limit: 100 });
      setUsers(data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, role]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <RiSearchLine />
          <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="admin-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {['super_admin', 'company_owner', 'manager', 'employee', 'customer'].map((r) => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /></button>
      </div>

      <div className="card">
        {loading ? <Spinner /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Status</th><th>Last Login</th><th>Logins</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td className="muted">{u.email}</td>
                    <td><span className="badge badge-neutral">{u.role?.replace('_', ' ')}</span></td>
                    <td>{u.company || <span className="muted">—</span>}</td>
                    <td><span className={`badge badge-${statusBadge(u.status)}`}>{u.status}</span></td>
                    <td className="muted">{u.lastLogin ? fmtDateTime(u.lastLogin) : 'Never'}</td>
                    <td>{fmtNum(u.loginCount)}</td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={7} className="muted">No users match</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ───────────────────────── Revenue ───────────────────────── */
function RevenueTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getRevenue();
      setData(res.data.data);
    } catch { toast.error('Failed to load revenue'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendBroadcast(e) {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await adminService.broadcast(broadcast);
      toast.success(`Sent to ${data.data.sent}/${data.data.recipients} owners`);
      setBroadcast({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally { setSending(false); }
  }

  if (loading) return <Spinner />;
  if (!data) return <div className="admin-empty">No data available</div>;

  const planData = data.revenueByPlan.filter((p) => p.revenue > 0);

  return (
    <>
      <div className="admin-stats-grid three">
        <div className="admin-stat card">
          <div className="as-icon" style={{ background: '#10b98118', color: '#10b981' }}><RiMoneyDollarCircleLine /></div>
          <div className="as-value">{fmtMoney(data.totalRevenue)}</div>
          <div className="as-label">Total Revenue (all time)</div>
          <div className="as-sub">{fmtNum(data.totalTransactions)} transactions</div>
        </div>
        <div className="admin-stat card">
          <div className="as-icon" style={{ background: '#6366f118', color: '#6366f1' }}><RiPulseLine /></div>
          <div className="as-value">{fmtMoney(data.mrr)}</div>
          <div className="as-label">Monthly Recurring Revenue</div>
          <div className="as-sub">{fmtNum(data.activeSubscriptions)} active subscriptions</div>
        </div>
        <div className="admin-stat card">
          <div className="as-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}><RiBarChartLine /></div>
          <div className="as-value">{fmtMoney(data.revenueThisMonth)}</div>
          <div className="as-label">Revenue This Month</div>
        </div>
      </div>

      <div className="admin-charts">
        <div className="card card-pad">
          <h3>Revenue Trend <span className="muted">· last 6 months</span></h3>
          {!data.trend?.some((t) => t.revenue > 0) ? <div className="chart-empty">No revenue recorded yet</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.trend} barSize={38}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`)} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => fmtMoney(v)} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="var(--color-brand)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card card-pad">
          <h3>Revenue by Plan</h3>
          {planData.length === 0 ? <div className="chart-empty">No revenue by plan yet</div> : (
            <div className="plan-breakdown">
              {planData.map((p) => {
                const max = Math.max(...planData.map((x) => x.revenue));
                return (
                  <div key={p.plan} className="plan-row">
                    <div className="plan-dot" style={{ background: PLAN_COLORS[p.plan] }} />
                    <span className="plan-name">{cap(p.plan)}</span>
                    <div className="plan-bar-track">
                      <div className="plan-bar-fill" style={{ width: `${(p.revenue / max) * 100}%`, background: PLAN_COLORS[p.plan] }} />
                    </div>
                    <span className="plan-count">{fmtMoney(p.revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Transaction History</h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Reference</th><th>Company</th><th>Plan</th><th>Cycle</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {data.recentTransactions.map((t) => (
                <tr key={t._id}>
                  <td className="muted mono">{t.reference}</td>
                  <td>{t.company || '—'}</td>
                  <td><PlanTag plan={t.plan} /></td>
                  <td className="muted">{t.billingCycle}</td>
                  <td><strong>{fmtMoney(t.amount)}</strong></td>
                  <td><span className={`badge badge-${t.status === 'success' ? 'success' : 'danger'}`}>{t.status}</span></td>
                  <td className="muted">{fmtDateTime(t.paidAt)}</td>
                </tr>
              ))}
              {!data.recentTransactions.length && <tr><td colSpan={7} className="muted">No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <h3><RiMailSendLine /> Broadcast to all company owners</h3>
        <form className="broadcast-form" onSubmit={sendBroadcast}>
          <input className="form-input" placeholder="Subject" value={broadcast.subject} required
            onChange={(e) => setBroadcast((p) => ({ ...p, subject: e.target.value }))} />
          <textarea className="form-input" placeholder="Message to every company owner…" rows={4} required
            value={broadcast.message} onChange={(e) => setBroadcast((p) => ({ ...p, message: e.target.value }))} />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? <RiLoader4Line className="spin" /> : <RiMailSendLine />} Send broadcast
          </button>
        </form>
      </div>
    </>
  );
}

/* ───────────────────────── Marketplace ───────────────────────── */
function MarketplaceTab() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ord] = await Promise.all([
        adminService.getMarketplaceOverview(),
        adminService.getMarketplaceOrders({ limit: 20 }),
      ]);
      setData(ov.data.data);
      setOrders(ord.data);
    } catch { toast.error('Failed to load marketplace data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFeature(store) {
    try {
      const { data: r } = await adminService.featureStore(store._id);
      toast.success(r.data.isFeatured ? `${store.companyName} is now featured` : `${store.companyName} unfeatured`);
      await load();
    } catch { toast.error('Failed to update feature status'); }
  }

  async function toggleSuspend(store) {
    const suspending = !store.isSuspended;
    if (!window.confirm(`${suspending ? 'Suspend' : 'Reactivate'} "${store.companyName}" on the marketplace? ${suspending ? 'Their store link and central listing will both stop working — their BizlyAI account stays active.' : ''}`)) return;
    try {
      await adminService.suspendStore(store._id);
      toast.success(suspending ? `${store.companyName} suspended` : `${store.companyName} reactivated`);
      await load();
    } catch { toast.error('Action failed'); }
  }

  if (loading) return <Spinner />;
  if (!data) return <div className="admin-empty">No data available</div>;

  const cards = [
    { label: 'Total Stores', value: fmtNum(data.totalStores), icon: RiStore2Line, color: '#6366f1', sub: `${data.activeStores} active` },
    { label: 'Marketplace Orders', value: fmtNum(data.totalMarketplaceOrders), icon: RiShoppingBag3Line, color: '#8b5cf6' },
    { label: 'Total GMV', value: fmtMoney(data.totalMarketplaceRevenue), icon: RiMoneyDollarCircleLine, color: '#10b981' },
    { label: 'BizlyAI Commission', value: fmtMoney(data.totalCommission), icon: RiBarChartLine, color: '#f59e0b', sub: `${data.newStoresThisMonth} new store(s) this month` },
  ];

  return (
    <>
      <div className="admin-toolbar">
        <div />
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
      </div>

      <div className="admin-stats-grid">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="admin-stat card">
              <div className="as-icon" style={{ background: `${c.color}18`, color: c.color }}><Icon /></div>
              <div className="as-value">{c.value}</div>
              <div className="as-label">{c.label}</div>
              {c.sub && <div className="as-sub">{c.sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="admin-charts">
        <div className="card card-pad">
          <h3>Daily Commission <span className="muted">· last 14 days</span></h3>
          {!data.dailyCommission?.some((d) => d.commission > 0) ? (
            <div className="chart-empty">No commission earned in this window</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailyCommission} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`)} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => fmtMoney(v)} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="commission" name="Commission" radius={[4, 4, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Top Earning Stores</h3></div>
          <div className="table-wrapper">
            <table className="table compact">
              <thead><tr><th>Store</th><th>Orders</th><th>Revenue</th><th>Commission</th></tr></thead>
              <tbody>
                {data.topSellingStores.map((s) => (
                  <tr key={s._id}>
                    <td><strong>{s.companyName}</strong></td>
                    <td>{fmtNum(s.ordersCount)}</td>
                    <td>{fmtMoney(s.revenue)}</td>
                    <td className="muted">{fmtMoney(s.commission)}</td>
                  </tr>
                ))}
                {!data.topSellingStores.length && <tr><td colSpan={4} className="muted">No marketplace sales yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Stores ({data.stores.length})</h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Store</th><th>Owner</th><th>Products</th><th>Orders</th><th>Revenue</th>
                <th>Commission</th><th>Featured</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.stores.map((s) => (
                <tr key={s._id}>
                  <td>
                    <a href={STORE_URL(s.storeSlug)} target="_blank" rel="noreferrer" className="link-btn">
                      <strong>{s.companyName}</strong> <RiExternalLinkLine style={{ fontSize: 12 }} />
                    </a>
                  </td>
                  <td className="cell-sub">{s.owner?.name}<br /><span>{s.owner?.email}</span></td>
                  <td>{fmtNum(s.productsCount)}</td>
                  <td>{fmtNum(s.ordersCount)}</td>
                  <td>{s.revenue ? fmtMoney(s.revenue) : '—'}</td>
                  <td className="muted">{s.commission ? fmtMoney(s.commission) : '—'} <span className="muted">({s.commissionPercent}%)</span></td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleFeature(s)} title={s.isFeatured ? 'Unfeature' : 'Feature'}>
                      {s.isFeatured ? <RiStarFill style={{ color: '#f59e0b' }} /> : <RiStarLine />}
                    </button>
                  </td>
                  <td>
                    {s.isSuspended ? <span className="badge badge-danger">Suspended</span>
                      : s.listed ? <span className="badge badge-success">Listed</span>
                      : <span className="badge badge-neutral">Disabled</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className={`btn btn-sm ${s.isSuspended ? 'btn-secondary' : 'btn-danger'}`} onClick={() => toggleSuspend(s)}>
                        {s.isSuspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.stores.length && <tr><td colSpan={9} className="muted">No stores yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Recent Marketplace Transactions <span className="muted">· total commission {fmtMoney(orders?.totalCommission || 0)}</span></h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Order</th><th>Store</th><th>Customer</th><th>Total</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders?.data.map((o) => (
                <tr key={o._id}>
                  <td className="muted mono">{o.orderNumber}</td>
                  <td>{o.company?.name || '—'}</td>
                  <td className="muted">{o.customer || '—'}</td>
                  <td><strong>{fmtMoney(o.total)}</strong></td>
                  <td className="muted">{fmtMoney(o.commission)}</td>
                  <td><span className={`badge badge-${statusBadge(o.status === 'delivered' ? 'active' : o.status)}`}>{o.status}</span></td>
                  <td className="muted">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
              {!orders?.data?.length && <tr><td colSpan={7} className="muted">No marketplace orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── System ───────────────────────── */
function SystemTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getHealth();
      setData(res.data.data);
    } catch { toast.error('Failed to load system health'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!data) return <div className="admin-empty">No data available</div>;

  const heapPct = data.memory.heapTotal ? Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100) : 0;
  const sysPct = data.memory.systemTotal
    ? Math.round(((data.memory.systemTotal - data.memory.systemFree) / data.memory.systemTotal) * 100)
    : 0;

  return (
    <>
      <div className="admin-toolbar">
        <div />
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat card">
          <div className="as-top">
            <div className="as-icon" style={{ background: '#10b98118', color: '#10b981' }}><RiDatabase2Line /></div>
            <span className={`health-pill ${data.database.healthy ? 'ok' : 'fail'}`}>{data.database.status}</span>
          </div>
          <div className="as-value">{data.database.healthy ? 'Connected' : 'Down'}</div>
          <div className="as-label">MongoDB</div>
          <div className="as-sub">{data.database.host || '—'}{data.database.name ? ` / ${data.database.name}` : ''}</div>
        </div>

        <div className="admin-stat card">
          <div className="as-top">
            <div className="as-icon" style={{ background: '#6366f118', color: '#6366f1' }}><RiServerLine /></div>
            <span className={`health-pill ${data.embeddingService.healthy ? 'ok' : 'fail'}`}>{data.embeddingService.status}</span>
          </div>
          <div className="as-value">{data.embeddingService.healthy ? 'Operational' : 'Unavailable'}</div>
          <div className="as-label">Embedding Service</div>
          <div className="as-sub">{data.embeddingService.url || '—'}</div>
        </div>

        <div className="admin-stat card">
          <div className="as-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}><RiTimeLine /></div>
          <div className="as-value">{fmtUptime(data.server.uptimeSeconds)}</div>
          <div className="as-label">Server Uptime</div>
          <div className="as-sub">Node {data.server.nodeVersion} · {data.server.environment}</div>
        </div>

        <div className="admin-stat card">
          <div className="as-icon" style={{ background: '#8b5cf618', color: '#8b5cf6' }}><RiCpuLine /></div>
          <div className="as-value">{fmtBytes(data.memory.heapUsed)}</div>
          <div className="as-label">Heap Used ({heapPct}%)</div>
          <div className="as-sub">RSS {fmtBytes(data.memory.rss)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Memory</h3>
        <div className="usage-row">
          <div className="usage-label"><span>Node heap</span><span>{fmtBytes(data.memory.heapUsed)} / {fmtBytes(data.memory.heapTotal)}</span></div>
          <div className="usage-track"><div className="usage-fill" style={{ width: `${heapPct}%`, background: heapPct > 85 ? 'var(--color-danger)' : 'var(--color-brand)' }} /></div>
        </div>
        <div className="usage-row">
          <div className="usage-label"><span>System memory</span><span>{fmtBytes(data.memory.systemTotal - data.memory.systemFree)} / {fmtBytes(data.memory.systemTotal)}</span></div>
          <div className="usage-track"><div className="usage-fill" style={{ width: `${sysPct}%`, background: sysPct > 85 ? 'var(--color-danger)' : 'var(--color-success)' }} /></div>
        </div>
      </div>

      <OrderReconciliationCard />

      <div className="card">
        <div className="card-header-row"><h3>Error Logs <span className="muted">· last 20 failures</span></h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Action</th><th>Description</th><th>User</th><th>Company</th><th>When</th></tr></thead>
            <tbody>
              {data.errorLogs.map((l) => (
                <tr key={l._id}>
                  <td><span className="badge badge-danger">{l.action}</span></td>
                  <td className="cell-sub">{l.description || '—'}</td>
                  <td className="muted">{l.user || 'system'}</td>
                  <td className="muted">{l.company || '—'}</td>
                  <td className="muted">{fmtDateTime(l.timestamp)}</td>
                </tr>
              ))}
              {!data.errorLogs.length && <tr><td colSpan={5} className="muted">No errors logged 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────── Storefront order recovery (reconciliation) ───────────────
 * Finds and creates any storefront order Paystack confirmed as paid but that
 * never made it onto the Orders page — a missed webhook, or a customer who
 * paid by bank transfer/USSD and never returned to the success page. The
 * same job also runs automatically every 15 minutes over a rolling 3-hour
 * window; this lets an admin re-run it on demand over a much wider window
 * to backfill orders from before that job existed, or from longer ago than
 * its rolling window covers. Always safe to run — it never creates a
 * duplicate order for a payment reference that's already been fulfilled. */
function OrderReconciliationCard() {
  const [days, setDays] = useState(30);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const { data } = await adminService.reconcileOrders(days);
      setResult(data);
      toast.success(data.created > 0 ? `Recovered ${data.created} missing order(s)` : 'No missing orders found in that window');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reconciliation failed — check Render logs, it may still be running');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card card-pad">
      <h3><RiSearchEyeLine /> Storefront Order Recovery</h3>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14, fontSize: 13 }}>
        Asks Paystack for every payment it confirmed as successful and creates any storefront order still
        missing from the Orders page. Works regardless of a merchant's subaccount verification status —
        that only affects when Paystack pays them out, not whether their order exists here.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Look back
          <input type="number" min={1} max={180} value={days}
            onChange={(e) => setDays(Math.min(180, Math.max(1, Number(e.target.value) || 1)))}
            className="form-input" style={{ width: 68 }} />
          days
        </label>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={running}>
          {running ? <RiLoader4Line className="spin" /> : <RiRefreshLine />} {running ? 'Scanning…' : 'Run Reconciliation'}
        </button>
        {running && <span className="muted" style={{ fontSize: 12 }}>Calling Paystack live — a wide window can take a little while.</span>}
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            <MiniStat label="Transactions scanned" value={fmtNum(result.scanned)} />
            <MiniStat label="Storefront payments" value={fmtNum(result.candidates)} />
            <MiniStat label="Orders recovered" value={fmtNum(result.created)} color={result.created > 0 ? '#10b981' : undefined} />
            <MiniStat label="Already existed" value={fmtNum(result.skipped)} />
          </div>

          {result.createdOrders?.length > 0 && (
            <div className="table-wrapper">
              <table className="table compact">
                <thead><tr><th>Order</th><th>Reference</th><th>Company ID</th><th>Total</th></tr></thead>
                <tbody>
                  {result.createdOrders.map((o) => (
                    <tr key={o.reference}>
                      <td><strong>{o.orderNumber}</strong></td>
                      <td className="muted mono">{o.reference}</td>
                      <td className="muted mono">{o.companyId}</td>
                      <td>{fmtMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {result.errors.map((e, i) => (
                <div key={i} className="badge badge-danger" style={{ display: 'block', marginBottom: 4, whiteSpace: 'normal' }}>
                  {e.reference || 'general'}: {e.message}
                </div>
              ))}
            </div>
          )}

          {!result.createdOrders?.length && !result.errors?.length && (
            <p className="muted" style={{ fontSize: 13 }}>Nothing missing in that window — every successful storefront payment already has an order.</p>
          )}
        </div>
      )}
    </div>
  );
}

const MiniStat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
  </div>
);
