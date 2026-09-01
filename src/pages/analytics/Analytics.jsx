import { useState, useEffect } from 'react';
import { analyticsService } from '../../services';
import {
  RiBarChartLine, RiRobot2Line, RiUserLine, RiFileTextLine,
  RiMoneyDollarCircleLine, RiArrowUpLine, RiArrowDownLine,
  RiRefreshLine, RiThumbUpLine, RiThumbDownLine, RiCalendarLine
} from 'react-icons/ri';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import './Analytics.css';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getInsights(),
      ]);
      setMetrics(mRes.data.data);
      setInsights(iRes.data.data.recommendations || []);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }

  const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n||0);

  // Build pie data from lead pipeline
  const leadPieData = metrics ? Object.entries(metrics.leads?.pipeline || {}).map(([status, d]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: d.count || 0,
  })).filter(d => d.value > 0) : [];

  // Build invoice bar data
  const invoiceBarData = metrics ? Object.entries(metrics.invoices?.byStatus || {}).map(([status, d]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    amount: d.total || 0,
    count: d.count || 0,
  })) : [];

  const StatCard = ({ label, value, icon: Icon, color, sub, loading: l }) => (
    <div className="analytics-stat-card card">
      <div className="asc-top">
        <span className="asc-label">{label}</span>
        <div className="asc-icon" style={{ background:`${color}18`, color }}><Icon /></div>
      </div>
      <div className="asc-value">
        {l ? <div className="skeleton" style={{height:32,width:80}} /> : (value ?? '—')}
      </div>
      {sub && !l && <div className="asc-sub">{sub}</div>}
    </div>
  );

  return (
    <div className="analytics-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Analytics</h1><p>Business performance overview</p></div>
          <button className="btn btn-secondary" onClick={loadData}><RiRefreshLine /> Refresh</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="analytics-kpi-grid">
        <StatCard label="Documents" icon={RiFileTextLine} color="#6366f1" loading={loading}
          value={metrics?.overview?.documents?.total}
          sub={`${metrics?.overview?.documents?.thisMonth || 0} this month`} />
        <StatCard label="Conversations" icon={RiRobot2Line} color="#10b981" loading={loading}
          value={metrics?.overview?.conversations?.total}
          sub={`${metrics?.overview?.conversations?.thisMonth || 0} this month`} />
        <StatCard label="Questions Asked" icon={RiRobot2Line} color="#f59e0b" loading={loading}
          value={metrics?.overview?.questionsAsked} />
        <StatCard label="Agent Executions" icon={RiRobot2Line} color="#8b5cf6" loading={loading}
          value={metrics?.overview?.agentExecutions} />
        <StatCard label="Outstanding" icon={RiMoneyDollarCircleLine} color="#ef4444" loading={loading}
          value={fmtMoney(metrics?.invoices?.outstanding)}
          sub={`${metrics?.invoices?.overdue || 0} overdue`} />
        <StatCard label="Upcoming Appts" icon={RiCalendarLine} color="#06b6d4" loading={loading}
          value={metrics?.appointments?.upcoming} />
      </div>

      {/* AI Quality */}
      <div className="card card-pad ai-quality-section">
        <h3>AI Quality Metrics</h3>
        {loading ? <div className="skeleton" style={{height:80}} /> : (
          <div className="ai-quality-grid">
            <div className="aq-item">
              <span className="aq-label">Avg Confidence</span>
              <span className="aq-value" style={{color:'var(--color-brand)'}}>
                {metrics?.ai?.avgConfidence ? `${metrics.ai.avgConfidence}%` : '—'}
              </span>
              <div className="confidence-bar">
                <div className="confidence-fill confidence-high"
                  style={{width:`${metrics?.ai?.avgConfidence||0}%`}} />
              </div>
            </div>
            <div className="aq-item">
              <span className="aq-label">Satisfaction Rate</span>
              <span className="aq-value" style={{color:'var(--color-success)'}}>
                {metrics?.ai?.satisfactionRate != null ? `${metrics.ai.satisfactionRate}%` : '—'}
              </span>
            </div>
            <div className="aq-item">
              <RiThumbUpLine style={{color:'var(--color-success)',fontSize:20}} />
              <span className="aq-label">Helpful</span>
              <span className="aq-value">{metrics?.ai?.thumbsUp || 0}</span>
            </div>
            <div className="aq-item">
              <RiThumbDownLine style={{color:'var(--color-danger)',fontSize:20}} />
              <span className="aq-label">Not helpful</span>
              <span className="aq-value">{metrics?.ai?.thumbsDown || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="analytics-charts">
        {/* Lead pipeline pie */}
        <div className="card card-pad">
          <h3>Lead Pipeline</h3>
          {loading ? <div className="skeleton" style={{height:220}} /> :
          leadPieData.length === 0 ? (
            <div className="chart-empty">No lead data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={leadPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}>
                  {leadPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:13}} />
                <Legend wrapperStyle={{fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="lead-stats">
            <div className="lead-stat">
              <span>Total Pipeline Value</span>
              <strong>{fmtMoney(metrics?.leads?.totalValue)}</strong>
            </div>
            <div className="lead-stat">
              <span>New This Month</span>
              <strong>{metrics?.leads?.newThisMonth || 0}</strong>
            </div>
          </div>
        </div>

        {/* Invoice bar chart */}
        <div className="card card-pad">
          <h3>Invoice Status</h3>
          {loading ? <div className="skeleton" style={{height:220}} /> :
          invoiceBarData.length === 0 ? (
            <div className="chart-empty">No invoice data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invoiceBarData} barSize={32}>
                <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:13}}
                  formatter={v => fmtMoney(v)} />
                <Bar dataKey="amount" name="Amount" radius={[6,6,0,0]}>
                  {invoiceBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="card card-pad">
          <h3><RiRobot2Line /> AI Recommendations</h3>
          <div className="insights-list">
            {insights.map((rec, i) => (
              <div key={i} className={`insight-row priority-${rec.priority}`}>
                <div className={`insight-dot ${rec.type}`} />
                <div className="insight-content">
                  <span>{rec.message}</span>
                  {rec.action && (
                    <a href={rec.action} className="insight-link">View →</a>
                  )}
                </div>
                <span className={`badge badge-${rec.priority==='high'?'danger':rec.priority==='medium'?'warning':'info'}`}>
                  {rec.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription usage */}
      {metrics?.subscription && (
        <div className="card card-pad">
          <h3>Plan Usage — {metrics.subscription.plan?.charAt(0).toUpperCase() + metrics.subscription.plan?.slice(1)}</h3>
          <div className="usage-bars">
            {[
              { label:'Documents', used: metrics.subscription.usage?.documentsCount||0, max: metrics.subscription.limits?.maxDocuments||100 },
              { label:'Questions / month', used: metrics.subscription.usage?.questionsAsked||0, max: metrics.subscription.limits?.maxQuestionsPerMonth||500 },
            ].map(item => {
              const pct = Math.min(100, Math.round((item.used/item.max)*100));
              return (
                <div key={item.label} className="usage-row">
                  <div className="usage-label">
                    <span>{item.label}</span>
                    <span>{item.used} / {item.max}</span>
                  </div>
                  <div className="usage-track">
                    <div className="usage-fill" style={{
                      width:`${pct}%`,
                      background: pct>80?'var(--color-danger)':pct>60?'var(--color-warning)':'var(--color-brand)'
                    }} />
                  </div>
                  <span className="usage-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
