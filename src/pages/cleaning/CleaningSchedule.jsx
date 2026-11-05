import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RiCalendarScheduleLine, RiAddLine, RiArrowLeftSLine, RiArrowRightSLine, RiLoader4Line, RiMapPinLine, RiTeamLine, RiRepeatLine, RiListSettingsLine } from 'react-icons/ri';
import { cleaningService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { money, fmtTime, errText, lagosToday, addDays, lagosDateOf, MANAGERS } from '../services/svc';
import '../services/svc.css';
import './Cleaning.css';

const dayName = (ymd, opts) => new Date(`${ymd}T12:00:00+01:00`).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', ...opts });

export default function CleaningSchedule() {
  const { user, company } = useAuth();
  const isManager = MANAGERS.includes(user?.role);
  const [start, setStart] = useState(lagosToday());
  const [day, setDay] = useState(lagosToday());
  const [cleaner, setCleaner] = useState('');
  const [team, setTeam] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  useEffect(() => { if (isManager) cleaningService.team().then(({ data: r }) => setTeam(r.data)).catch(() => {}); }, [isManager]);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: r } = await cleaningService.list({ from: days[0], to: days[6], cleaner: cleaner || undefined });
      setData(r.data);
    } catch (err) { setError(errText(err, 'Could not load the schedule.')); }
  }, [days, cleaner]);
  useEffect(() => { setData(null); load(); }, [load]);

  const byDay = useMemo(() => {
    const m = new Map(days.map((d) => [d, []]));
    for (const j of data?.jobs || []) m.get(lagosDateOf(j.scheduledAt))?.push(j);
    return m;
  }, [data, days]);
  const list = byDay.get(day) || [];
  const shiftWeek = (n) => { const next = addDays(start, n); setStart(next); setDay(next); };
  const s = data?.summary;
  const currency = company?.defaultCurrency || 'NGN';

  return (
    <div className="svc-page fade-in">
      <div className="svc-head">
        <div>
          <h1><RiCalendarScheduleLine /> {isManager ? 'Cleaning Schedule' : 'My Jobs'}</h1>
          <p>{isManager ? 'Every visit, who is going, and what is owed.' : 'Your cleaning jobs. Tap one to start it.'}</p>
        </div>
        {isManager && (
          <div className="svc-head-actions">
            <Link to="/cleaning/services" className="btn btn-secondary"><RiListSettingsLine /> Services & prices</Link>
            <Link to="/cleaning/new" className="btn btn-primary"><RiAddLine /> Book a clean</Link>
          </div>
        )}
      </div>

      {s && (
        <div className="svc-stats">
          <div className="svc-stat"><span>Jobs this week</span><strong>{s.jobs}</strong></div>
          <div className="svc-stat good"><span>Completed</span><strong>{s.completed}</strong></div>
          {isManager && <div className="svc-stat"><span>Booked value</span><strong>{money(s.value, currency)}</strong></div>}
          {isManager && <div className="svc-stat good"><span>Collected</span><strong>{money(s.collected, currency)}</strong></div>}
          {isManager && <div className={`svc-stat ${s.owedAfterCompletion ? 'warn' : ''}`}><span>Owed on finished jobs</span><strong>{money(s.owedAfterCompletion, currency)}</strong></div>}
        </div>
      )}

      <div className="cl-week">
        <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(-7)} aria-label="Previous week"><RiArrowLeftSLine /></button>
        <div className="cl-days">
          {days.map((d) => {
            const n = (byDay.get(d) || []).filter((j) => j.status !== 'cancelled').length;
            return (
              <button key={d} className={`${d === day ? 'active' : ''} ${d === lagosToday() ? 'today' : ''}`} onClick={() => setDay(d)}>
                <span>{dayName(d, { weekday: 'short' })}</span>
                <strong>{dayName(d, { day: 'numeric' })}</strong>
                <em>{n ? `${n} job${n === 1 ? '' : 's'}` : '—'}</em>
              </button>
            );
          })}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(7)} aria-label="Next week"><RiArrowRightSLine /></button>
        {start !== lagosToday() && <button className="btn btn-secondary btn-sm" onClick={() => { setStart(lagosToday()); setDay(lagosToday()); }}>Today</button>}
        {isManager && team.length > 0 && (
          <select className="svc-input cl-filter" value={cleaner} onChange={(e) => setCleaner(e.target.value)} aria-label="Filter by cleaner">
            <option value="">Everyone</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <h2 className="cl-dayhead">{dayName(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      {error ? (
        <div className="svc-state"><p>{error}</p><button className="btn btn-secondary" onClick={load}>Try again</button></div>
      ) : !data ? (
        <div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div>
      ) : list.length === 0 ? (
        <div className="svc-state">
          <p>No jobs on this day.</p>
          {isManager && <Link to={`/cleaning/new?date=${day}`} className="btn btn-primary"><RiAddLine /> Book one</Link>}
        </div>
      ) : (
        <div className="cl-jobs">
          {list.map((j) => (
            <Link key={j.id} to={`/cleaning/jobs/${j.id}`} className={`cl-job ${j.status}`}>
              <div className="cl-job-time">
                <strong>{fmtTime(j.scheduledAt)}</strong>
                <span>{j.hours}h</span>
              </div>
              <div className="cl-job-body">
                <div className="cl-job-top">
                  <strong>{j.customer.name}</strong>
                  <span className={`svc-badge ${j.status}`}>{j.statusLabel}</span>
                </div>
                <div className="cl-job-svc">{j.service} · {j.property.bedrooms ? `${j.property.bedrooms} bed, ` : ''}{j.property.bathrooms ? `${j.property.bathrooms} bath ` : ''}{j.property.type}</div>
                <div className="svc-muted"><RiMapPinLine /> {j.area ? `${j.area} · ` : ''}{j.address}</div>
                <div className="cl-job-foot">
                  <span className="svc-muted"><RiTeamLine /> {j.team.map((t) => t.name).join(', ') || <em>No one assigned</em>}</span>
                  {j.recurrence !== 'none' && <span className="svc-badge"><RiRepeatLine /> {j.recurrence === 'biweekly' ? 'every 2 weeks' : j.recurrence}</span>}
                  {j.status === 'in_progress' && <span className="svc-badge in_progress">{j.progress.done}/{j.progress.total} tasks</span>}
                  {isManager && j.balance > 0 && (j.status === 'completed' || j.amountPaid > 0) && <span className="svc-badge owing">Owes {money(j.balance, j.currency)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
