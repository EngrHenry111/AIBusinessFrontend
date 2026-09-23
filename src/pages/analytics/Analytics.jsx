import { useState, useEffect, useCallback, useMemo } from 'react';
import { advancedAnalyticsService } from '../../services';
import toast from 'react-hot-toast';
import {
  RiBarChartLine, RiMoneyDollarCircleLine, RiUserLine, RiFlashlightLine,
  RiFileTextLine, RiShoppingBagLine, RiRobot2Line, RiRefreshLine,
  RiDownloadLine, RiTeamLine,
} from 'react-icons/ri';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import KPICard from '../../components/analytics/KPICard';
import GaugeChart from '../../components/analytics/GaugeChart';
import FunnelChart from '../../components/analytics/FunnelChart';
import './Analytics.css';

const PERIODS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '1y', label: '1 Year' },
];
const TABS = [
  { id: 'overview', label: 'Overview', icon: RiBarChartLine },
  { id: 'revenue', label: 'Revenue', icon: RiMoneyDollarCircleLine },
  { id: 'customers', label: 'Customers', icon: RiUserLine },
  { id: 'products', label: 'Products', icon: RiShoppingBagLine },
  { id: 'leads', label: 'Leads', icon: RiFlashlightLine },
  { id: 'financial', label: 'Financial', icon: RiFileTextLine },
  { id: 'operational', label: 'Operational', icon: RiTeamLine },
];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const nairaCompact = (n) => (Math.abs(n) >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n || 0}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');
const chartTooltip = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' };

// Flattens a simple array of objects into a CSV file and triggers a download.
function exportCSV(rows, filename) {
  if (!rows?.length) { toast.error('Nothing to export for this tab yet.'); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Empty = ({ text = 'No data for this period' }) => <div className="chart-empty">{text}</div>;

export default function Analytics() {
  const [period, setPeriod] = useState('30d');
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ revenue: null, customers: null, products: null, leads: null, financial: null, operational: null });
  const [loading, setLoading] = useState({});
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const fetchers = useMemo(() => ({
    revenue: advancedAnalyticsService.getRevenue,
    customers: advancedAnalyticsService.getCustomers,
    products: advancedAnalyticsService.getProducts,
    leads: advancedAnalyticsService.getLeads,
    financial: advancedAnalyticsService.getFinancial,
    operational: advancedAnalyticsService.getOperational,
  }), []);

  const load = useCallback((key) => {
    setLoading((l) => ({ ...l, [key]: true }));
    return fetchers[key]({ period })
      .then(({ data: r }) => setData((d) => ({ ...d, [key]: r.data })))
      .catch(() => toast.error(`Failed to load ${key} analytics`))
      .finally(() => setLoading((l) => ({ ...l, [key]: false })));
  }, [fetchers, period]);

  // Overview needs revenue + financial + customers + leads regardless of the
  // active tab; other tabs load lazily the first time they're opened.
  useEffect(() => {
    setData({ revenue: null, customers: null, products: null, leads: null, financial: null, operational: null });
    Promise.all([load('revenue'), load('financial'), load('customers'), load('leads')]);
    if (tab === 'products') load('products');
    if (tab === 'operational') load('operational');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    if (!data[tab] && !loading[tab]) load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function loadInsights(force) {
    setInsightsLoading(true);
    advancedAnalyticsService.getInsights()
      .then(({ data: r }) => setInsights(r.data))
      .catch(() => toast.error('Failed to generate AI insights'))
      .finally(() => setInsightsLoading(false));
  }
  useEffect(() => { loadInsights(); }, []);

  function handleExport() {
    const map = {
      overview: [data.revenue?.revenueByDay, 'overview_revenue.csv'],
      revenue: [data.revenue?.revenueByProduct, 'revenue_by_product.csv'],
      customers: [data.customers?.topCustomers, 'top_customers.csv'],
      products: [data.products?.topSellingProducts, 'top_products.csv'],
      leads: [data.leads?.topPerformingLeads, 'top_leads.csv'],
      financial: [data.financial?.revenueVsExpenses, 'revenue_vs_expenses.csv'],
      operational: [data.operational?.teamProductivity, 'team_productivity.csv'],
    };
    const [rows, filename] = map[tab] || [null, 'export.csv'];
    exportCSV(rows, filename);
  }

  return (
    <div className="analytics-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1><RiBarChartLine style={{ verticalAlign: '-3px' }} /> Analytics &amp; Insights</h1><p>Deep business performance and AI-powered recommendations</p></div>
          <div className="analytics-header-actions">
            <div className="analytics-period-selector">
              {PERIODS.map((p) => <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><RiDownloadLine /> Export CSV</button>
          </div>
        </div>
      </div>

      <AIInsightsBanner insights={insights} loading={insightsLoading} onRefresh={() => loadInsights(true)} />

      <div className="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><Icon /> {t.label}</button>;
        })}
      </div>

      {tab === 'overview' && <OverviewTab data={data} loading={loading} />}
      {tab === 'revenue' && <RevenueTab d={data.revenue} loading={loading.revenue} />}
      {tab === 'customers' && <CustomersTab d={data.customers} loading={loading.customers} />}
      {tab === 'products' && <ProductsTab d={data.products} loading={loading.products} />}
      {tab === 'leads' && <LeadsTab d={data.leads} loading={loading.leads} />}
      {tab === 'financial' && <FinancialTab d={data.financial} loading={loading.financial} />}
      {tab === 'operational' && <OperationalTab d={data.operational} loading={loading.operational} />}
    </div>
  );
}

function AIInsightsBanner({ insights, loading, onRefresh }) {
  return (
    <div className="ai-insights-banner">
      <div className="ai-insights-head">
        <h3><RiRobot2Line /> AI Business Insights</h3>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={loading}><RiRefreshLine className={loading ? 'spin' : ''} /> Refresh</button>
      </div>
      {loading ? (
        <div className="ai-insights-grid">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
      ) : !insights?.recommendations?.length ? (
        <p className="chart-empty">No insights yet — refresh once you have some business activity.</p>
      ) : (
        <div className="ai-insights-grid">
          {insights.recommendations.map((r, i) => (
            <div key={i} className="ai-insight-card">
              <span className={`priority-badge priority-${r.priority?.toLowerCase()}`}>{r.priority}</span>
              <h4>{r.title}</h4>
              {r.action && <p><strong>Action:</strong> {r.action}</p>}
              {r.impact && <p className="ai-insight-impact"><strong>Impact:</strong> {r.impact}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */
function OverviewTab({ data, loading }) {
  const { revenue, financial, customers, leads } = data;
  const busy = loading.revenue || loading.financial || loading.customers || loading.leads;
  if (busy && !revenue) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;

  const sparkline = (revenue?.revenueByDay || []).slice(-14).map((d) => ({ value: d.amount }));

  return (
    <>
      <div className="analytics-kpi-grid">
        <KPICard label="Total Revenue" value={naira(revenue?.totalRevenue)} change={revenue?.revenueGrowth} sparkline={sparkline} color="#10b981" />
        <KPICard label="Net Profit" value={naira(financial?.netProfit)} sub={`${financial?.profitMargin ?? 0}% margin`} color="#6366f1" />
        <KPICard label="Total Customers" value={customers?.totalCustomers ?? '—'} change={customers?.customerGrowth} color="#8b5cf6" />
        <KPICard label="Conversion Rate" value={`${leads?.conversionRate ?? 0}%`} sub={`${leads?.totalLeads ?? 0} leads`} color="#f59e0b" />
        <KPICard label="Outstanding Invoices" value={naira(financial?.outstandingInvoices)} sub={`${naira(financial?.overdueAmount)} overdue`} color="#ef4444" />
        <KPICard label="Orders This Period" value={revenue?.averageOrderValue ? naira(revenue.averageOrderValue) : '—'} sub="Avg order value" color="#06b6d4" />
      </div>

      <div className="analytics-charts">
        <div className="card card-pad">
          <h3>Revenue Trend</h3>
          {!revenue?.revenueByDay?.some((d) => d.amount > 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenue.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} labelFormatter={fmtDate} />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card card-pad">
          <h3>Revenue vs Expenses <span className="muted">· 6 months</span></h3>
          {!financial?.revenueVsExpenses?.some((m) => m.revenue || m.expenses) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={financial.revenueVsExpenses} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="analytics-quick-stats">
        <div className="qs-item"><span>Average Order Value</span><strong>{naira(revenue?.averageOrderValue)}</strong></div>
        <div className="qs-item"><span>Repeat Purchase Rate</span><strong>{customers?.repeatPurchaseRate ?? 0}%</strong></div>
        <div className="qs-item"><span>Customer Lifetime Value</span><strong>{naira(customers?.averageLifetimeValue)}</strong></div>
        <div className="qs-item"><span>Pipeline Value</span><strong>{naira(leads?.pipelineValue)}</strong></div>
      </div>
    </>
  );
}

/* ───────────────────────── Revenue ───────────────────────── */
function RevenueTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  const sourcePie = [
    { name: 'Store Orders', value: d.revenueBySource.storeOrders },
    { name: 'Invoices', value: d.revenueBySource.invoices },
    { name: 'Manual', value: d.revenueBySource.manual },
  ].filter((x) => x.value > 0);

  return (
    <>
      <div className="analytics-hero-card card card-pad">
        <div>
          <span className="muted">Total Revenue</span>
          <div className="hero-value">{naira(d.totalRevenue)}</div>
          <span className={`kpi-change ${d.revenueGrowth >= 0 ? 'up' : 'down'}`}>{d.revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(d.revenueGrowth)}% vs previous period</span>
        </div>
        <div className="hero-side">
          <div><span className="muted">Projected next 30 days</span><strong>{naira(d.projectedRevenue)}</strong></div>
          <div><span className="muted">Top revenue day</span><strong>{d.topRevenueDay?.date ? `${fmtDate(d.topRevenueDay.date)} — ${naira(d.topRevenueDay.amount)}` : '—'}</strong></div>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="card card-pad">
          <h3>Revenue by Source</h3>
          {sourcePie.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sourcePie} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {sourcePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card card-pad">
          <h3>Revenue by Day</h3>
          {!d.revenueByDay?.some((r) => r.amount > 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={d.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} labelFormatter={fmtDate} />
                <Line type="monotone" dataKey="amount" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <h3>Revenue by Product <span className="muted">· top 10</span></h3>
        {!d.revenueByProduct?.length ? <Empty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.revenueByProduct.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

/* ───────────────────────── Customers ───────────────────────── */
function CustomersTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  const acqPie = Object.entries(d.acquisitionBySource || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).filter((x) => x.value > 0);

  return (
    <>
      <div className="analytics-kpi-grid three">
        <KPICard label="Total Customers" value={d.totalCustomers} color="#6366f1" />
        <KPICard label="New Customers" value={d.newCustomers} change={d.customerGrowth} color="#10b981" />
        <KPICard label="Returning Customers" value={d.returningCustomers} sub={`${d.repeatPurchaseRate}% repeat rate`} color="#8b5cf6" />
      </div>

      <div className="analytics-charts">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Retention</h3>
          <GaugeChart value={100 - d.churnRate} label="Retention Rate" />
          <p className="muted" style={{ marginTop: 10 }}>{d.churnRate}% churn rate</p>
        </div>
        <div className="card card-pad">
          <h3>Acquisition Source</h3>
          {acqPie.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={acqPie} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {acqPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Top Customers</h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Name</th><th>Total Spent</th><th>Orders</th><th>Last Order</th><th>Tier</th></tr></thead>
            <tbody>
              {d.topCustomers.map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.name}</strong></td>
                  <td>{naira(c.totalSpent)}</td>
                  <td>{c.orderCount}</td>
                  <td className="muted">{fmtDate(c.lastOrderDate)}</td>
                  <td><span className={`badge badge-${{ Platinum: 'brand', Gold: 'warning', Silver: 'neutral', Bronze: 'neutral' }[c.tier]}`}>{c.tier}</span></td>
                </tr>
              ))}
              {!d.topCustomers.length && <tr><td colSpan={5} className="muted">No customers yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {d.customersByLocation?.length > 0 && (
        <div className="card card-pad">
          <h3>Customers by Location</h3>
          <div className="location-list">
            {d.customersByLocation.map((l, i) => (
              <div key={i} className="location-row"><span>{l.city || '—'}{l.state ? `, ${l.state}` : ''}</span><strong>{l.count}</strong></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Products ───────────────────────── */
function ProductsTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  return (
    <>
      <div className="analytics-kpi-grid four">
        <KPICard label="Inventory Value" value={naira(d.totalInventoryValue)} color="#6366f1" />
        <KPICard label="Active Products" value={d.activeProducts} sub={`${d.totalProducts} total`} color="#10b981" />
        <KPICard label="Low Stock" value={d.lowStock} color="#f59e0b" />
        <KPICard label="Out of Stock" value={d.outOfStock} color="#ef4444" />
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Top Selling Products</h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th></th><th>Name</th><th>Units Sold</th><th>Revenue</th><th>Stock</th></tr></thead>
            <tbody>
              {d.topSellingProducts.map((p, i) => (
                <tr key={i}>
                  <td>{p.image ? <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-hover)' }} />}</td>
                  <td><strong>{p.name}</strong><br /><span className="muted" style={{ fontSize: 12 }}>{p.category || '—'}</span></td>
                  <td>{p.sold}</td>
                  <td>{naira(p.revenue)}</td>
                  <td className="muted">{p.stock ?? '—'}</td>
                </tr>
              ))}
              {!d.topSellingProducts.length && <tr><td colSpan={5} className="muted">No sales yet this period</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Category Breakdown</h3>
        {!d.categoryBreakdown?.length ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.categoryBreakdown} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="analytics-charts">
        <div className="card">
          <div className="card-header-row"><h3>Slow Moving Products</h3></div>
          <div className="table-wrapper">
            <table className="table compact">
              <thead><tr><th>Name</th><th>Stock</th><th>Last Sold</th><th>Days in Stock</th></tr></thead>
              <tbody>
                {d.slowMovingProducts.map((p, i) => (
                  <tr key={i}><td>{p.name}</td><td>{p.stock}</td><td className="muted">{p.lastSoldAt ? fmtDate(p.lastSoldAt) : 'Never'}</td><td className="muted">{p.daysInStock}d</td></tr>
                ))}
                {!d.slowMovingProducts.length && <tr><td colSpan={4} className="muted">Nothing slow-moving right now</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header-row"><h3>Stock Alerts</h3></div>
          <div className="table-wrapper">
            <table className="table compact">
              <thead><tr><th>Name</th><th>Stock</th><th>Threshold</th><th>Status</th></tr></thead>
              <tbody>
                {d.stockAlerts.map((p, i) => (
                  <tr key={i}><td>{p.name}</td><td>{p.stock}</td><td className="muted">{p.threshold}</td><td><span className={`badge badge-${p.status === 'out' ? 'danger' : 'warning'}`}>{p.status === 'out' ? 'Out of Stock' : 'Low Stock'}</span></td></tr>
                ))}
                {!d.stockAlerts.length && <tr><td colSpan={4} className="muted">No stock alerts</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Leads ───────────────────────── */
const FUNNEL_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'won'];
function LeadsTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  const funnelStages = FUNNEL_ORDER.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), count: d.leadsByStatus[s] || 0 }));
  const sourcePie = (d.leadsBySource || []).map((s) => ({ name: s.source, value: s.count }));

  return (
    <>
      <div className="analytics-hero-card card card-pad">
        <div><span className="muted">Pipeline Value</span><div className="hero-value">{naira(d.pipelineValue)}</div></div>
        <div className="hero-side">
          <div><span className="muted">Win Rate</span><strong>{d.winRate}%</strong></div>
          <div><span className="muted">Avg. Time to Convert</span><strong>{d.averageTimeToConvert}d</strong></div>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Conversion Funnel</h3>
        <FunnelChart stages={funnelStages} />
      </div>

      <div className="analytics-charts">
        <div className="card card-pad">
          <h3>Leads by Source</h3>
          {sourcePie.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourcePie} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {sourcePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Win Rate</h3>
          <GaugeChart value={d.winRate} label={`Avg Score: ${d.averageLeadScore}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Top Leads by Score</h3></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Name</th><th>Score</th><th>Value</th></tr></thead>
            <tbody>
              {d.topPerformingLeads.map((l, i) => <tr key={i}><td><strong>{l.name}</strong></td><td>{l.score}</td><td>{naira(l.value)}</td></tr>)}
              {!d.topPerformingLeads.length && <tr><td colSpan={3} className="muted">No leads yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Financial ───────────────────────── */
function FinancialTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  const expensePie = (d.expenseBreakdown || []).map((e) => ({ name: e.category, value: e.amount }));

  return (
    <>
      <div className="analytics-kpi-grid three">
        <KPICard label="Revenue" value={naira(d.revenue)} color="#10b981" />
        <KPICard label="Expenses" value={naira(d.expenses)} color="#ef4444" />
        <KPICard label="Net Profit" value={naira(d.netProfit)} color="#6366f1" />
      </div>

      <div className="analytics-charts">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Profit Margin</h3>
          <GaugeChart value={d.profitMargin} goodAbove={20} okAbove={5} />
        </div>
        <div className="card card-pad">
          <h3>Expense Breakdown</h3>
          {expensePie.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensePie} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {expensePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <h3>Cash Flow <span className="muted">· 6 months</span></h3>
        {!d.cashFlow?.some((m) => m.inflow || m.outflow) ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.cashFlow} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={nairaCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltip} formatter={(v) => naira(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="inflow" name="Inflow" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="analytics-quick-stats">
        <div className="qs-item"><span>Outstanding Invoices</span><strong>{naira(d.outstandingInvoices)}</strong></div>
        <div className="qs-item"><span>Overdue Amount</span><strong style={{ color: 'var(--color-danger)' }}>{naira(d.overdueAmount)}</strong></div>
        <div className="qs-item"><span>Est. Tax Liability</span><strong>{naira(d.taxLiability)}</strong></div>
        <div className="qs-item"><span>Gross Profit</span><strong>{naira(d.grossProfit)}</strong></div>
      </div>

      <div className="card">
        <div className="card-header-row"><h3>Revenue vs Expenses (Monthly)</h3></div>
        <div className="table-wrapper">
          <table className="table compact">
            <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead>
            <tbody>
              {d.revenueVsExpenses.map((m, i) => <tr key={i}><td>{m.month}</td><td>{naira(m.revenue)}</td><td>{naira(m.expenses)}</td><td style={{ color: m.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{naira(m.profit)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Operational ───────────────────────── */
function OperationalTab({ d, loading }) {
  if (loading && !d) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />;
  if (!d) return <Empty />;

  return (
    <>
      <div className="analytics-charts three">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Appointments</h3>
          <GaugeChart value={d.appointments.completionRate} size={120} label="Completion Rate" />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Busiest: {d.appointments.busiestDay || '—'} @ {d.appointments.busiestTime || '—'}</p>
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Orders</h3>
          <GaugeChart value={d.orders.deliverySuccessRate} size={120} label="Delivery Success" />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Avg. {d.orders.averageDeliveryDays}d to deliver</p>
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ alignSelf: 'flex-start' }}>Invoices</h3>
          <GaugeChart value={d.invoices.collectionRate} size={120} label="Collection Rate" />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Avg. {d.invoices.averagePaymentDays}d to pay</p>
        </div>
      </div>

      {d.teamProductivity?.length > 0 && (
        <div className="card">
          <div className="card-header-row"><h3><RiTeamLine /> Team Productivity</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Member</th><th>Role</th><th>Tasks Completed</th><th>Leads Handled</th></tr></thead>
              <tbody>
                {d.teamProductivity.map((t, i) => <tr key={i}><td><strong>{t.member}</strong></td><td className="muted">{t.role?.replace('_', ' ')}</td><td>{t.tasksCompleted}</td><td>{t.leadsHandled}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
