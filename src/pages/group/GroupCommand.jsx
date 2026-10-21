import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  RiRadarLine, RiSparkling2Line, RiAlarmWarningLine, RiRefreshLine, RiGasStationLine, RiBuilding2Line,
  RiCheckDoubleLine, RiTimeLine, RiErrorWarningLine, RiFileCheckLine,
  RiLoader4Line, RiArrowRightSLine, RiUserLine,
} from 'react-icons/ri';
import { groupService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { naira, nairaShort, LINE_LABELS, LINE_SHORT, LINE_COLORS, isOwner } from './groupUtils';
import './Group.css';

const RANGES = [{ d: 1, l: 'Today' }, { d: 7, l: '7 days' }, { d: 30, l: '30 days' }];
const ALERT_ICON = { shortage: RiAlarmWarningLine, missing: RiTimeLine, rejected: RiErrorWarningLine, target: RiErrorWarningLine, attendant: RiUserLine, meter: RiGasStationLine };

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(iv); }, []);
  return now;
}

export default function GroupCommand() {
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const now = useClock();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState(null);
  const [briefing, setBriefing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    groupService.overview({ days })
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load group overview'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);
  // Live: refresh every 60s while the page is open.
  useEffect(() => { const iv = setInterval(load, 60000); return () => clearInterval(iv); }, [load]);

  async function runBrief() {
    setBriefing(true);
    try {
      const { data: r } = await groupService.aiBrief({ days });
      setBrief(r.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'AI briefing failed');
    } finally {
      setBriefing(false);
    }
  }

  async function approveAllPending() {
    setBusy(true);
    try {
      const { data: r } = await groupService.getReports({ awaiting: 'me', limit: 500 });
      const ids = (r.data || []).map((x) => x._id);
      if (!ids.length) { toast('Nothing waiting for you'); return; }
      if (!window.confirm(`Give final approval to all ${ids.length} pending reports? They will enter the approved sales ledger.`)) return;
      const { data: b } = await groupService.bulkApprove(ids);
      toast.success(`${b.data.approved} reports approved and posted to the ledger`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Bulk approval failed');
    } finally { setBusy(false); }
  }

  if (loading && !data) {
    return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;
  }

  const k = data?.kpis || {};
  const hasBranches = (data?.perBranch?.length || 0) > 0;

  if (!hasBranches) {
    return (
      <div className="grp-page fade-in">
        <div className="card grp-empty-hero">
          <RiRadarLine style={{ fontSize: 44, color: 'var(--color-brand)' }} />
          <h2>Group Command Center</h2>
          <p>
            Watch every filling station, outlet and department in one place. Each department files its daily sales report,
            the branch manager checks it, you give the final approval, and only then does it enter the approved sales ledger.
          </p>
          <div className="grp-row" style={{ justifyContent: 'center' }}>
            <Link to="/group/branches" className="btn btn-primary"><RiBuilding2Line /> Add your first branch</Link>
          </div>
        </div>
      </div>
    );
  }

  const varianceTone = k.variance < 0 ? 'bad' : 'good';
  const pieData = (data.byLine || []).map((l) => ({ name: LINE_LABELS[l.line], value: l.sales, color: LINE_COLORS[l.line] }));
  const lines = (data.byLine || []).map((l) => l.line);

  return (
    <div className="grp-page fade-in">
      {/* ── Hero ── */}
      <section className="grp-hero">
        <div className="grp-hero-top">
          <div>
            <span className="grp-live"><span className="grp-live-dot" /> Live · {now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
            <h1>{company?.companyName || 'Group'} Command Center</h1>
            <p>{k.branches} branches · {k.branchesReportedToday} reported today · {k.pendingApprovals} reports awaiting approval</p>
            <div className="grp-row" style={{ marginTop: 14 }}>
              <div className="grp-range">
                {RANGES.map((r) => (
                  <button key={r.d} className={days === r.d ? 'on' : ''} onClick={() => setDays(r.d)}>{r.l}</button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh"><RiRefreshLine className={loading ? 'spin' : ''} /></button>
            </div>
          </div>
          <div className="grp-hero-today">
            <div className="l">Sales reported today</div>
            <div className="v">{naira(k.todaySales)}</div>
          </div>
        </div>

        <div className="grp-kpis">
          <div className="grp-kpi"><div className="l">Total sales ({days === 1 ? 'today' : `${days}d`})</div><div className="v">{nairaShort(k.sales)}</div><div className="s">{naira(k.sales)}</div></div>
          <div className="grp-kpi good"><div className="l"><RiFileCheckLine /> Approved & posted</div><div className="v">{nairaShort(k.approvedSales)}</div><div className="s">{k.sales ? Math.round((k.approvedSales / k.sales) * 100) : 0}% of reported sales</div></div>
          <div className="grp-kpi"><div className="l">Cash collected</div><div className="v">{nairaShort(k.collected)}</div><div className="s">Cash, POS, transfer & credit</div></div>
          <div className={`grp-kpi ${varianceTone}`}><div className="l"><RiAlarmWarningLine /> Cash shortages</div><div className="v">{nairaShort(k.shortages)}</div><div className="s">Net variance {nairaShort(k.variance)}</div></div>
          {k.litres > 0 && <div className="grp-kpi"><div className="l"><RiGasStationLine /> Fuel sold</div><div className="v">{Math.round(k.litres).toLocaleString()} L</div><div className="s">Across all pumps</div></div>}
          <div className="grp-kpi"><div className="l"><RiTimeLine /> Awaiting approval</div><div className="v">{k.pendingApprovals}</div><div className="s">
            {k.pendingApprovals > 0 && isOwner(user)
              ? <button className="btn btn-ghost btn-sm" style={{ padding: 0, color: '#a5b4fc' }} onClick={() => navigate('/group/reports?tab=awaiting')}>Review now <RiArrowRightSLine /></button>
              : 'All caught up'}
          </div></div>
        </div>
      </section>

      {/* ── AI brief + alerts ── */}
      <div className="grp-grid-2">
        <div className="card card-pad grp-ai">
          <div className="grp-card-title">
            <RiSparkling2Line /> AI Operations Brief
            <span className="grp-spacer" />
            <button className="btn btn-primary btn-sm" onClick={runBrief} disabled={briefing}>
              {briefing ? <><RiLoader4Line className="spin" /> Analysing…</> : <><RiSparkling2Line /> {brief ? 'Refresh brief' : 'Generate brief'}</>}
            </button>
          </div>
          {brief
            ? <div className="grp-ai-text">{brief.brief}</div>
            : <div className="grp-ai-empty">Get a plain-English summary of every branch: who is leading, where cash is short, which reports are stuck, and what to do about it today.</div>}
        </div>

        <div className="card card-pad">
          <div className="grp-card-title"><RiAlarmWarningLine /> Needs attention <span className="grp-spacer" /><span className="badge badge-danger">{data.alerts.length}</span></div>
          <div className="grp-alerts">
            {data.alerts.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No issues. Every branch is balanced and reporting.</div>}
            {data.alerts.map((a, i) => {
              const Icon = ALERT_ICON[a.type] || RiErrorWarningLine;
              return (
                <div key={i} className={`grp-alert ${a.severity} ${a.reportId ? 'clickable' : ''}`}
                  onClick={() => a.reportId && navigate(`/group/reports/${a.reportId}`)}>
                  <Icon style={{ color: a.severity === 'high' ? 'var(--color-danger)' : a.severity === 'medium' ? 'var(--color-warning)' : 'var(--color-info)' }} />
                  <span>{a.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Branch pulse ── */}
      <div>
        <div className="grp-row" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Branch performance</h3>
          <span className="grp-spacer" />
          {isOwner(user) && k.pendingApprovals > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={approveAllPending} disabled={busy}><RiCheckDoubleLine /> Approve all pending</button>
          )}
        </div>
        <div className="grp-branches">
          {data.perBranch.map((b) => {
            const ach = b.achievement;
            const tone = ach === null ? '' : ach >= 100 ? '' : ach >= 80 ? 'mid' : 'low';
            return (
              <div key={b._id} className="card grp-branch" style={{ '--line-color': LINE_COLORS[b.businessLine] }}
                onClick={() => navigate(`/group/reports?branchId=${b._id}`)}>
                <div className="grp-branch-head">
                  <div>
                    <div className="grp-branch-name">{b.name}</div>
                    <div className="grp-branch-city">{b.city || '—'} · {LINE_SHORT[b.businessLine]}</div>
                  </div>
                  {b.pending > 0 && <span className="badge badge-warning">{b.pending} pending</span>}
                </div>
                <div className="grp-branch-sales">{nairaShort(b.sales)}</div>
                {ach !== null && (
                  <>
                    <div className={`grp-bar ${tone}`}><span style={{ width: `${Math.min(ach, 100)}%` }} /></div>
                    <div className="grp-branch-meta"><span>{ach}% of target</span><span>Target {nairaShort(b.target)}</span></div>
                  </>
                )}
                <div className="grp-branch-meta">
                  <span className={b.variance < -1000 ? 'grp-neg' : 'grp-pos'}>
                    {b.variance < -1000 ? `Short ${nairaShort(Math.abs(b.variance))}` : 'Cash balanced'}
                  </span>
                  {b.litres > 0 && <span>{Math.round(b.litres).toLocaleString()} L</span>}
                </div>
                <div className="grp-branch-meta">
                  <span>Today: {b.departmentsReportedToday}/{b.departmentsTotal} departments</span>
                  <span className="grp-dots">
                    {Array.from({ length: b.departmentsTotal }).map((_, i) => <span key={i} className={i < b.departmentsReportedToday ? 'on' : ''} />)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Attendant watch ── */}
      {data.attendants?.length > 0 && (
        <div className="card card-pad">
          <div className="grp-card-title"><RiUserLine /> Attendant watch <span className="grp-spacer" /><span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>Most short first</span></div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Attendant</th><th>Branch</th><th style={{ textAlign: 'right' }}>Shifts</th><th style={{ textAlign: 'right' }}>Sales handled</th>
                  <th style={{ textAlign: 'right' }}>Short shifts</th><th style={{ textAlign: 'right' }}>Net short / over</th><th style={{ textAlign: 'right' }}>Meter gaps</th>
                </tr>
              </thead>
              <tbody>
                {data.attendants.slice(0, 10).map((a) => (
                  <tr key={`${a.name}|${a.branch}`}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td className="muted">{a.branch}</td>
                    <td className="grp-num" style={{ textAlign: 'right' }}>{a.shifts}</td>
                    <td className="grp-num" style={{ textAlign: 'right' }}>{nairaShort(a.sales)}</td>
                    <td className="grp-num" style={{ textAlign: 'right' }}>
                      {a.shortShifts > 0 ? <span className={a.shortShifts >= 3 ? 'badge badge-danger' : 'badge badge-warning'}>{a.shortShifts} of {a.shifts}</span> : '—'}
                    </td>
                    <td className={`grp-num ${a.variance < -1000 ? 'grp-neg' : 'grp-pos'}`} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {Math.abs(a.variance) < 1000 ? 'Balanced' : naira(a.variance)}
                    </td>
                    <td className={`grp-num ${a.meterGapLitres >= 1 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{a.meterGapLitres >= 1 ? `${Math.round(a.meterGapLitres).toLocaleString()} L` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grp-grid-2">
        <div className="card card-pad">
          <div className="grp-card-title">Daily sales by business line</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.trend} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                {lines.map((l) => (
                  <linearGradient key={l} id={`g-${l}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LINE_COLORS[l]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={LINE_COLORS[l]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={nairaShort} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={64} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n) => [naira(v), LINE_LABELS[n] || n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              {lines.map((l) => (
                <Area key={l} type="monotone" dataKey={l} stackId="1" stroke={LINE_COLORS[l]} strokeWidth={2} fill={`url(#g-${l})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="grp-card-title">Sales mix</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                {pieData.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip formatter={(v) => naira(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          {pieData.map((p) => (
            <div key={p.name} className="grp-row" style={{ fontSize: 13, marginTop: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
              <span>{p.name}</span><span className="grp-spacer" />
              <strong className="grp-num">{nairaShort(p.value)}</strong>
              <span className="muted">{k.sales ? Math.round((p.value / k.sales) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
