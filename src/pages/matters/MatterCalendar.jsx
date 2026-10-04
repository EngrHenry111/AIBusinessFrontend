import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiCalendarEventLine, RiLoader4Line, RiAlertLine } from 'react-icons/ri';
import { matterService } from '../../services';
import { KEY_DATE_TYPES, relativeDay, daysUntil } from './matterConstants';
import './Matters.css';

// Every open matter's hearings, filing deadlines and limitation dates on
// one list, grouped by day — the firm's cause list.
export default function MatterCalendar() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    matterService.calendar(days)
      .then(({ data }) => setRows(data.data))
      .catch(() => toast.error('Failed to load calendar'))
      .finally(() => setLoading(false));
  }, [days]);

  const groups = rows.reduce((acc, r) => {
    const key = new Date(r.keyDate.date).toDateString();
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="matters-page fade-in">
      <Link to="/matters" className="mt-back"><RiArrowLeftLine /> All matters</Link>
      <div className="page-header page-header-row">
        <div>
          <h1><RiCalendarEventLine style={{ verticalAlign: '-3px' }} /> Court calendar</h1>
          <p>Hearings, filing deadlines and limitation dates across all open matters.</p>
        </div>
        <select className="form-input form-select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Range">
          <option value={7}>Next 7 days</option>
          <option value={30}>Next 30 days</option>
          <option value={90}>Next 90 days</option>
          <option value={365}>Next 12 months</option>
        </select>
      </div>

      {loading ? <div className="mt-loading"><RiLoader4Line className="spin" /> Loading…</div> : rows.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Nothing scheduled</h3><p>Add hearings and deadlines on a matter's Key dates tab, and they'll show up here.</p></div></div>
      ) : (
        <div className="mt-stack">
          {Object.entries(groups).map(([day, items]) => {
            const n = daysUntil(items[0].keyDate.date);
            return (
              <div key={day} className="card card-pad">
                <h3 className={`mt-card-title ${n <= 1 ? 'mt-soon' : ''}`}>
                  {n <= 1 && <RiAlertLine />} {new Date(items[0].keyDate.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="cell-sub" style={{ display: 'inline', marginLeft: 8 }}>{relativeDay(items[0].keyDate.date)}</span>
                </h3>
                <ul className="mt-dates">
                  {items.map((r) => (
                    <li key={r.keyDate._id} className="mt-date">
                      <div className="mt-date-when">
                        <strong>{new Date(r.keyDate.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</strong>
                      </div>
                      <div className="mt-date-body">
                        <div><span className="badge badge-neutral">{KEY_DATE_TYPES[r.keyDate.type]}</span> <strong>{r.keyDate.title}</strong></div>
                        <div className="cell-sub">
                          <Link to={`/matters/${r._id}`}>{r.matterNumber} — {r.title}</Link>
                          {r.client?.name && ` · ${r.client.name}`}
                          {r.court?.suitNumber && ` · ${r.court.suitNumber}`}
                        </div>
                        {(r.keyDate.location || r.court?.name) && <div className="cell-sub">{r.keyDate.location || r.court.name}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
