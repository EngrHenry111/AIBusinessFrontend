import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
  RiBuilding2Line, RiUserLine, RiBarChartLine, RiShieldLine,
  RiLoader4Line, RiSearchLine, RiCheckLine, RiCloseLine,
  RiFileTextLine, RiRobot2Line, RiArrowUpLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Admin.css';

const PLAN_COLORS = { trial:'#94a3b8', starter:'#6366f1', professional:'#8b5cf6', business:'#f59e0b', enterprise:'#10b981' };

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (tab === 'companies') loadCompanies(); }, [tab, search, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await adminService.getStats();
      setStats(data.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  }

  async function loadCompanies() {
    try {
      const { data } = await adminService.getCompanies({ search, status: statusFilter });
      setCompanies(data.data);
    } catch {}
  }

  async function handleSuspend(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    if (!confirm(`${action === 'suspend' ? 'Suspend' : 'Reactivate'} this company?`)) return;
    try {
      await (action === 'suspend' ? adminService.suspendCompany(id) : adminService.activateCompany(id));
      toast.success(`Company ${action}d`);
      loadCompanies();
    } catch { toast.error('Failed'); }
  }

  async function handleChangePlan(id, plan) {
    try {
      await adminService.updatePlan(id, plan);
      toast.success('Plan updated');
      loadCompanies();
    } catch { toast.error('Failed'); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="admin-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiShieldLine style={{ color: '#ef4444' }} /> Super Admin</h1>
            <p>Manage all companies and users on EngrHenryTech BusinessAI</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {['overview', 'companies', 'users'].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        loading ? <div className="admin-loading"><RiLoader4Line className="spin" /></div> :
        <>
          <div className="admin-stats-grid">
            {[
              { label: 'Total Companies', value: stats?.totalCompanies, icon: RiBuilding2Line, color: '#6366f1' },
              { label: 'Active Companies', value: stats?.activeCompanies, icon: RiCheckLine, color: '#10b981' },
              { label: 'Total Users', value: stats?.totalUsers, icon: RiUserLine, color: '#8b5cf6' },
              { label: 'Total Documents', value: stats?.totalDocs, icon: RiFileTextLine, color: '#f59e0b' },
              { label: 'Total Chats', value: stats?.totalChats, icon: RiRobot2Line, color: '#06b6d4' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="admin-stat card">
                  <div className="as-icon" style={{ background: `${s.color}18`, color: s.color }}><Icon /></div>
                  <div className="as-value">{s.value ?? '—'}</div>
                  <div className="as-label">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Plan breakdown */}
          <div className="card card-pad">
            <h3>Subscription Plans</h3>
            <div className="plan-breakdown">
              {stats?.planBreakdown && Object.entries(stats.planBreakdown).map(([plan, count]) => (
                <div key={plan} className="plan-row">
                  <div className="plan-dot" style={{ background: PLAN_COLORS[plan] || '#94a3b8' }} />
                  <span className="plan-name">{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                  <div className="plan-bar-track">
                    <div className="plan-bar-fill" style={{
                      width: `${Math.round((count / (stats.totalCompanies || 1)) * 100)}%`,
                      background: PLAN_COLORS[plan] || '#94a3b8',
                    }} />
                  </div>
                  <span className="plan-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent companies */}
          <div className="card">
            <div className="card-header-row">
              <h3>Recent Signups</h3>
            </div>
            <table className="table">
              <thead><tr><th>Company</th><th>Owner</th><th>Plan</th><th>Joined</th></tr></thead>
              <tbody>
                {stats?.recentCompanies?.map(c => (
                  <tr key={c._id}>
                    <td><strong>{c.companyName}</strong></td>
                    <td>{c.owner?.name} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.owner?.email}</span></td>
                    <td><span className="badge" style={{ background: `${PLAN_COLORS[c.subscription?.plan]}18`, color: PLAN_COLORS[c.subscription?.plan] }}>{c.subscription?.plan || 'trial'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Companies */}
      {tab === 'companies' && (
        <>
          <div className="admin-toolbar">
            <div className="admin-search">
              <RiSearchLine />
              <input placeholder="Search companies..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="status-filters">
              {['', 'active', 'suspended'].map(s => (
                <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr><th>Company</th><th>Owner</th><th>Plan</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c._id}>
                    <td><strong>{c.companyName}</strong></td>
                    <td style={{ fontSize: 13 }}>{c.owner?.name}<br /><span style={{ color: 'var(--text-muted)' }}>{c.owner?.email}</span></td>
                    <td>
                      <select className="plan-select" value={c.subscription?.plan || 'trial'}
                        onChange={e => handleChangePlan(c._id, e.target.value)}>
                        {['trial', 'starter', 'professional', 'business', 'enterprise'].map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td><span className={`badge badge-${c.status === 'active' ? 'success' : c.status === 'suspended' ? 'danger' : 'neutral'}`}>{c.status}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt(c.createdAt)}</td>
                    <td>
                      <button className={`btn btn-sm ${c.status === 'suspended' ? 'btn-secondary' : 'btn-danger'}`}
                        onClick={() => handleSuspend(c._id, c.status)}>
                        {c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Users */}
      {tab === 'users' && <UsersTab />}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getUsers().then(({ data }) => setUsers(data.data)).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return loading ? <div className="admin-loading"><RiLoader4Line className="spin" /></div> : (
    <div className="card">
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td><strong>{u.name}</strong></td>
              <td style={{ fontSize: 13 }}>{u.email}</td>
              <td><span className="badge badge-neutral">{u.role?.replace('_', ' ')}</span></td>
              <td><span className={`badge badge-${u.status === 'active' ? 'success' : 'neutral'}`}>{u.status}</span></td>
              <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
