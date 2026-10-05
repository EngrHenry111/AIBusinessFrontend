import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  RiGraduationCapLine, RiMoneyDollarCircleLine, RiUserAddLine, RiCalendarCheckLine,
  RiLoader4Line, RiSettings3Line, RiAddLine,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import useSchoolLive from './useSchoolLive';
import useSchoolMe from './useSchoolMe';
import TeacherHome from './TeacherHome';
import { TERMS, APPLICATION_STATUS, money, fmtDateTime, fullName, errMsg } from './schoolConstants';
import './School.css';

const shortMoney = (n) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `₦${Math.round(n / 1e3)}k` : `₦${n}`);

// Teachers get their own home; everyone else the school dashboard.
export default function SchoolHome() {
  const me = useSchoolMe();
  if (!me) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;
  return me.role === 'teacher' ? <TeacherHome me={me} /> : <SchoolDashboard />;
}

function SchoolDashboard() {
  const [data, setData] = useState(null);
  const [flashId, setFlashId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await schoolService.dashboard();
      setData(res.data);
    } catch (e) { toast.error(errMsg(e, 'Failed to load the school dashboard')); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSchoolLive((evt) => {
    if (evt.kind === 'payment' && evt.paymentId) setFlashId(evt.paymentId);
    load();
  });

  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;

  const { students, admissions, fees, attendance, settings } = data;
  const pct = fees.expected ? Math.round((fees.collected / fees.expected) * 100) : 0;
  const pending = (admissions.byStatus.submitted || 0) + (admissions.byStatus.under_review || 0) + (admissions.byStatus.interview || 0);
  const attRate = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null;
  const maxClass = Math.max(1, ...students.byClass.map((c) => c.capacity || c.count));

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiGraduationCapLine style={{ verticalAlign: '-3px' }} /> {settings.schoolName || 'School'}</h1>
          <p>{settings.currentSession} · {TERMS[settings.currentTerm]} <span className="sc-live" style={{ marginLeft: 10 }}>Live</span></p>
        </div>
        <div className="sc-actions">
          <Link to="/school/settings" className="btn btn-secondary"><RiSettings3Line /> Settings</Link>
          <Link to="/school/fees?record=1" className="btn btn-primary"><RiAddLine /> Record payment</Link>
        </div>
      </div>

      {students.byClass.length === 0 && (
        <div className="sc-note warn" style={{ marginBottom: 16 }}>
          Start by <Link to="/school/classes">creating your classes</Link>, then add students or <Link to="/school/students?import=1">import them from a spreadsheet</Link>, and set up <Link to="/school/fees">this term's fees</Link>.
        </div>
      )}

      <div className="sc-stats">
        <div className="stat-card">
          <div className="stat-label"><RiGraduationCapLine /> Active students</div>
          <div className="stat-value">{students.total.toLocaleString()}</div>
          <div className="cell-sub">{students.byGender.male || 0} boys · {students.byGender.female || 0} girls</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><RiMoneyDollarCircleLine /> Fees collected this term</div>
          <div className="stat-value">{money(fees.collected)}</div>
          <div className="sc-progress" aria-label={`${pct}% of expected fees collected`}><div style={{ width: `${Math.min(100, pct)}%` }} /></div>
          <div className="cell-sub">{pct}% of {money(fees.expected)} · <span className="sc-owing">{money(fees.outstanding)}</span> outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><RiUserAddLine /> Applications to review</div>
          <div className="stat-value">{pending}</div>
          <div className="cell-sub">{admissions.byStatus.admitted || 0} admitted, awaiting enrolment</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><RiCalendarCheckLine /> Attendance today</div>
          <div className="stat-value">{attRate == null ? '—' : `${attRate}%`}</div>
          <div className="cell-sub">{attendance.total ? `${attendance.present} present · ${attendance.absent} absent` : 'No registers taken yet today'}</div>
        </div>
      </div>

      <div className="sc-grid-main">
        <div className="card card-pad">
          <div className="sc-card-title">
            <span>Fees collected — last 30 days</span>
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>Today: <b style={{ color: 'var(--text-primary)' }}>{money(fees.today.amount)}</b> ({fees.today.count})</span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fees.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-tertiary)' }}
                  formatter={(v) => [money(v), 'Collected']}
                  labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}
                />
                <Bar dataKey="amount" fill="var(--color-brand)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="sc-card-title"><span>Latest payments</span><Link to="/school/fees?tab=payments">All</Link></div>
          {fees.recentPayments.length === 0 ? <p className="cell-sub">No payments yet.</p> : (
            <ul className="sc-list">
              {fees.recentPayments.map((p) => (
                <li key={p._id} className={flashId === p._id ? 'sc-flash' : ''}>
                  <div>
                    <Link to={`/school/students/${p.studentId?._id}`} className="sc-strong">{fullName(p.studentId)}</Link>
                    <span className="cell-sub">{fmtDateTime(p.paidAt)}{p.method === 'online' && ' · online'}</span>
                  </div>
                  <Link to={`/school/receipts/${p._id}`} className="sc-strong">{money(p.amount)}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sc-grid-2">
        <div className="card card-pad">
          <div className="sc-card-title"><span>Students by class</span><Link to="/school/classes">Manage classes</Link></div>
          {students.byClass.length === 0 ? <p className="cell-sub">No classes yet.</p> : (
            <div className="sc-bars">
              {students.byClass.map((c) => (
                <Link key={c._id} to={`/school/students?classId=${c._id}`} className="sc-bar-row" style={{ color: 'inherit' }}>
                  <span className="truncate">{c.name}</span>
                  <div className="sc-progress"><div style={{ width: `${(c.count / maxClass) * 100}%` }} /></div>
                  <span className="num">{c.count}{c.capacity ? <span className="cell-sub" style={{ display: 'inline' }}>/{c.capacity}</span> : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="sc-card-title"><span>New applications</span><Link to="/school/admissions">Admissions</Link></div>
          {admissions.recent.length === 0 ? <p className="cell-sub">No applications waiting. Share your <Link to="/school/settings">online admission form</Link> with parents.</p> : (
            <ul className="sc-list">
              {admissions.recent.map((a) => (
                <li key={a._id}>
                  <div>
                    <Link to={`/school/admissions?open=${a._id}`} className="sc-strong">{a.lastName} {a.firstName}</Link>
                    <span className="cell-sub">{a.applicationNumber} · {a.classAppliedFor?.name || 'Class not chosen'}{a.source === 'online' && ' · online'}</span>
                  </div>
                  <span className={`badge badge-${APPLICATION_STATUS[a.status]?.badge}`}>{APPLICATION_STATUS[a.status]?.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
