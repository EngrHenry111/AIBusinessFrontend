import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerService } from '../../services';
import {
  RiAddLine, RiUserStarLine, RiSearchLine, RiEyeLine, RiEdit2Line, RiDeleteBinLine, RiDownloadLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Customers.css';

const money = (n, cur = 'NGN') => {
  const sym = cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
};
const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function Customers() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const type = params.get('type') || '';
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'createdAt';

  const setParam = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customerService.getAll({
        search: search || undefined, type: type || undefined, status: status || undefined, sort, limit: 100,
      });
      setCustomers(data.data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, type, status, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { customerService.getStats().then(({ data }) => setStats(data.data)).catch(() => {}); }, []);

  async function handleDelete(c) {
    if (!confirm(`Archive "${c.name}"? Their order and invoice history is kept.`)) return;
    try {
      await customerService.delete(c._id);
      toast.success('Customer archived');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive');
    }
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Phone', 'Company', 'Type', 'Status', 'Total Orders', 'Total Spent', 'Last Order'],
      ...customers.map((c) => [
        c.name, c.email || '', c.phone || '', c.company || '', c.type, c.status,
        c.totalOrders || 0, c.totalSpent || 0, c.lastOrderAt ? fmtDate(c.lastOrderAt) : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const topSpender = stats?.topSpenders?.[0];

  return (
    <div className="customers-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Customers</h1>
            <p>{stats?.total ?? customers.length} customers · view profiles, orders and invoices</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={exportCSV}><RiDownloadLine /> Export CSV</button>
            <button className="btn btn-primary" onClick={() => navigate('/customers/new')}><RiAddLine /> Add Customer</button>
          </div>
        </div>
      </div>

      <div className="cust-stats">
        <div className="cust-stat"><div className="cs-label">Total</div><div className="cs-value">{stats?.total ?? 0}</div></div>
        <div className="cust-stat"><div className="cs-label">Active</div><div className="cs-value">{stats?.active ?? 0}</div></div>
        <div className="cust-stat"><div className="cs-label">New This Month</div><div className="cs-value">{stats?.newThisMonth ?? 0}</div></div>
        <div className="cust-stat">
          <div className="cs-label">Top Spender</div>
          <div className="cs-value" style={{ fontSize: 16 }}>{topSpender ? topSpender.name : '—'}</div>
          {topSpender && <div className="cs-sub">{money(topSpender.totalSpent)}</div>}
        </div>
      </div>

      <div className="customers-toolbar">
        <div className="search-bar">
          <RiSearchLine />
          <input placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </select>
        <select value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          <option value="createdAt">Date added</option>
          <option value="name">Name</option>
          <option value="totalSpent">Total spent</option>
          <option value="lastOrderAt">Last order</option>
        </select>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiUserStarLine /></div>
          <h3>No customers yet</h3>
          <p>Add a customer, or convert a lead — customers are also created automatically from orders and invoices.</p>
          <button className="btn btn-primary" onClick={() => navigate('/customers/new')}><RiAddLine /> Add Customer</button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="cust-table">
            <thead>
              <tr>
                <th>Name</th><th className="hide-sm">Contact</th><th>Type</th>
                <th>Orders</th><th>Spent</th><th className="hide-sm">Last Order</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="cust-name-cell">
                      <span className="avatar-circle">{initials(c.name)}</span>
                      <span className="nm" onClick={() => navigate(`/customers/${c._id}`)}>{c.name}</span>
                    </div>
                  </td>
                  <td className="hide-sm muted">
                    {c.email || '—'}{c.phone ? <><br />{c.phone}</> : null}
                  </td>
                  <td><span className="badge badge-neutral">{c.type}</span></td>
                  <td>{c.totalOrders || 0}</td>
                  <td>{money(c.totalSpent)}</td>
                  <td className="hide-sm">{c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—'}</td>
                  <td><span className={`badge badge-${c.status === 'active' ? 'success' : 'neutral'}`}>{c.status}</span></td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => navigate(`/customers/${c._id}`)}><RiEyeLine /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => navigate(`/customers/${c._id}/edit`)}><RiEdit2Line /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Archive" onClick={() => handleDelete(c)}><RiDeleteBinLine /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
