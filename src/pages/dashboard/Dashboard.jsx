import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiFileTextLine, RiRobot2Line, RiUserLine, RiMoneyDollarCircleLine,
  RiCalendarLine, RiArrowUpLine, RiArrowDownLine, RiRefreshLine,
  RiAlertLine, RiCheckLine, RiTimeLine
} from 'react-icons/ri';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import './Dashboard.css';

const MOCK_CHART = [
  { name: 'Mon', questions: 12, leads: 3 },
  { name: 'Tue', questions: 19, leads: 5 },
  { name: 'Wed', questions: 15, leads: 2 },
  { name: 'Thu', questions: 28, leads: 7 },
  { name: 'Fri', questions: 22, leads: 4 },
  { name: 'Sat', questions: 8, leads: 1 },
  { name: 'Sun', questions: 5, leads: 0 },
];

export default function Dashboard() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [metricsRes, insightsRes] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getInsights(),
      ]);
      setMetrics(metricsRes.data.data);
      setInsights(insightsRes.data.data.recommendations || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const StatCard = ({ label, value, icon: Icon, color, change, onClick }) => (
    <div className={`stat-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: `${color}20`, color }}>
          <Icon />
        </div>
      </div>
      <div className="stat-value">
        {loading ? <div className="skeleton" style={{ height: 32, width: 80 }} /> : value ?? '—'}
      </div>
      {change !== undefined && !loading && (
        <div className={`stat-change ${change >= 0 ? 'up' : 'down'}`}>
          {change >= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}
          <span>{Math.abs(change)}% this month</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard fade-in">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <div>
          <h1>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening with {company?.name} today.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RiRefreshLine /> Refresh
        </button>
      </div>

      {/* AI Insights Banner */}
      {insights.length > 0 && (
        <div className="insights-banner">
          <div className="insights-header">
            <RiRobot2Line />
            <span>AI Recommendations</span>
          </div>
          <div className="insights-list">
            {insights.map((rec, i) => (
              <div key={i} className={`insight-item ${rec.priority}`} onClick={() => rec.action && navigate(rec.action)}>
                <div className="insight-icon">
                  {rec.type === 'warning' ? <RiAlertLine /> : rec.type === 'success' ? <RiCheckLine /> : <RiTimeLine />}
                </div>
                <span>{rec.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="stat-grid">
        <StatCard
          label="Documents" icon={RiFileTextLine} color="#6366f1"
          value={metrics?.overview?.documents?.total}
          change={metrics?.overview?.documents?.thisMonth}
          onClick={() => navigate('/knowledge')}
        />
        <StatCard
          label="AI Conversations" icon={RiRobot2Line} color="#10b981"
          value={metrics?.overview?.conversations?.total}
          onClick={() => navigate('/chat')}
        />
        <StatCard
          label="Questions Asked" icon={RiRobot2Line} color="#f59e0b"
          value={metrics?.overview?.questionsAsked}
        />
        <StatCard
          label="Active Leads" icon={RiUserLine} color="#3b82f6"
          value={metrics?.leads?.pipeline?.new?.count ?? 0}
          onClick={() => navigate('/leads')}
        />
        <StatCard
          label="Overdue Invoices" icon={RiMoneyDollarCircleLine} color="#ef4444"
          value={metrics?.invoices?.overdue ?? 0}
          onClick={() => navigate('/invoices?status=overdue')}
        />
        <StatCard
          label="Upcoming Appointments" icon={RiCalendarLine} color="#8b5cf6"
          value={metrics?.appointments?.upcoming ?? 0}
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          label="AI Confidence" icon={RiRobot2Line} color="#06b6d4"
          value={metrics?.ai?.avgConfidence ? `${metrics.ai.avgConfidence}%` : '—'}
        />
        <StatCard
          label="Agent Executions" icon={RiRobot2Line} color="#ec4899"
          value={metrics?.overview?.agentExecutions ?? 0}
          onClick={() => navigate('/agents')}
        />
      </div>

      {/* Charts + Activity */}
      <div className="dashboard-grid">
        {/* Activity Chart */}
        <div className="card">
          <div className="card-header">
            <h3>AI Activity This Week</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_CHART}>
                <defs>
                  <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                <Area type="monotone" dataKey="questions" name="Questions" stroke="#6366f1" fill="url(#gq)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Pipeline */}
        <div className="card">
          <div className="card-header">
            <h3>Lead Pipeline</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>View all</button>
          </div>
          <div className="card-body">
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />)
            ) : (
              <div className="pipeline-bars">
                {[
                  { label: 'New', key: 'new', color: '#6366f1' },
                  { label: 'Contacted', key: 'contacted', color: '#3b82f6' },
                  { label: 'Qualified', key: 'qualified', color: '#f59e0b' },
                  { label: 'Proposal', key: 'proposal', color: '#8b5cf6' },
                  { label: 'Won', key: 'won', color: '#10b981' },
                ].map(stage => {
                  const count = metrics?.leads?.pipeline?.[stage.key]?.count || 0;
                  const max = Math.max(...Object.values(metrics?.leads?.pipeline || {}).map(s => s.count || 0), 1);
                  return (
                    <div key={stage.key} className="pipeline-row">
                      <span className="pipeline-label">{stage.label}</span>
                      <div className="pipeline-track">
                        <div className="pipeline-fill" style={{ width: `${(count / max) * 100}%`, background: stage.color }} />
                      </div>
                      <span className="pipeline-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card dashboard-activity">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="card-body">
            {loading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8 }} />)
            ) : metrics?.recentActivity?.length ? (
              <div className="activity-list">
                {metrics.recentActivity.map((log, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <span className="activity-action">{log.description || log.action}</span>
                      <span className="activity-time">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent activity yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Quality */}
        <div className="card">
          <div className="card-header">
            <h3>AI Quality Score</h3>
          </div>
          <div className="card-body ai-quality">
            {loading ? (
              <div className="skeleton" style={{ height: 100 }} />
            ) : (
              <>
                <div className="quality-score">
                  <span className="score-value">{metrics?.ai?.avgConfidence ?? '—'}</span>
                  <span className="score-label">% avg confidence</span>
                </div>
                <div className="quality-feedback">
                  <div className="feedback-row">
                    <span>👍 Helpful</span>
                    <strong>{metrics?.ai?.thumbsUp ?? 0}</strong>
                  </div>
                  <div className="feedback-row">
                    <span>👎 Not helpful</span>
                    <strong>{metrics?.ai?.thumbsDown ?? 0}</strong>
                  </div>
                  <div className="feedback-row">
                    <span>Satisfaction</span>
                    <strong>{metrics?.ai?.satisfactionRate != null ? `${metrics.ai.satisfactionRate}%` : '—'}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
