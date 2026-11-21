import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiShirtLine, RiAddLine, RiSearchLine, RiLoader4Line, RiRefreshLine, RiArrowRightLine, RiWhatsappLine, RiPriceTag3Line } from 'react-icons/ri';
import { laundryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { money, fmtDate, errText, waLink } from '../services/svc';
import { readyMessage } from './laundryText';
import Modal from '../services/Modal';
import '../services/svc.css';
import './Laundry.css';

const COLUMNS = [
  { id: 'received', label: 'Received', next: 'washing', nextLabel: 'Start washing' },
  { id: 'washing', label: 'Washing', next: 'ready', nextLabel: 'Mark ready' },
  { id: 'ready', label: 'Ready for pickup', next: 'collected', nextLabel: 'Collected' },
];
const VIEWS = [
  { id: 'active', label: 'In the shop' },
  { id: 'overdue', label: 'Overdue', count: 'overdue' },
  { id: 'ready', label: 'Ready', count: 'ready' },
  { id: 'uncollected', label: 'Not collected', count: 'uncollected' },
  { id: 'owing', label: 'Owing', count: 'owing' },
  { id: 'collected', label: 'Collected' },
  { id: 'all', label: 'All' },
];

export default function LaundryBoard() {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('active');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(null);
  const [notify, setNotify] = useState(null); // ticket just marked ready

  const load = useCallback(async (q = search) => {
    setError('');
    try {
      const { data: res } = await laundryService.list({ status: q ? 'all' : view, search: q || undefined });
      setData(res.data);
    } catch (err) { setError(errText(err, 'Could not load tickets.')); }
  }, [view, search]);
  useEffect(() => { setData(null); load(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (o, to) => {
    setMoving(o.id);
    try {
      let res;
      try {
        res = await laundryService.setStatus(o.id, to);
      } catch (err) {
        if (err?.response?.status === 409 && to === 'collected' && o.balance > 0) {
          // eslint-disable-next-line no-alert
          if (!window.confirm(`${o.customer.name} still owes ${money(o.balance, o.currency)}.\n\nOK: let them collect and owe.\nCancel: go back and record the payment first.`)) {
            navigate(`/laundry/${o.id}`);
            return;
          }
          res = await laundryService.setStatus(o.id, to, true);
        } else throw err;
      }
      const saved = res.data.data;
      if (to === 'ready') {
        toast.success(res.data.emailed ? `${o.ticketNumber} is ready. Customer emailed.` : `${o.ticketNumber} is ready.`);
        if (saved.customer.phone) setNotify(saved);
      } else toast.success(`${o.ticketNumber}: ${saved.statusLabel}`);
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not update that ticket.'));
    } finally {
      setMoving(null);
    }
  };

  const c = data?.counts;
  const board = view === 'active' && !search;

  return (
    <div className="svc-page fade-in">
      <div className="svc-head">
        <div>
          <h1><RiShirtLine /> Laundry Board</h1>
          <p>Every ticket from the counter to collection.</p>
        </div>
        <div className="svc-head-actions">
          <Link to="/laundry/prices" className="btn btn-secondary"><RiPriceTag3Line /> Price list</Link>
          <Link to="/laundry/new" className="btn btn-primary"><RiAddLine /> New ticket</Link>
        </div>
      </div>

      {c && (
        <div className="svc-stats">
          <button className="svc-stat" onClick={() => setView('active')}><span>In the shop</span><strong>{c.received + c.washing}</strong></button>
          <button className="svc-stat good" onClick={() => setView('ready')}><span>Ready for pickup</span><strong>{c.ready}</strong></button>
          <div className="svc-stat"><span>Due today</span><strong>{c.dueToday}</strong></div>
          <button className={`svc-stat ${c.overdue ? 'bad' : ''}`} onClick={() => setView('overdue')}><span>Overdue</span><strong>{c.overdue}</strong></button>
          <button className={`svc-stat ${c.uncollected ? 'warn' : ''}`} onClick={() => setView('uncollected')}><span>Not collected ({data.uncollectedDays}+ days)</span><strong>{c.uncollected}</strong></button>
          <button className={`svc-stat ${c.owed ? 'warn' : ''}`} onClick={() => setView('owing')}><span>Customers owe</span><strong>{money(c.owed, company?.defaultCurrency)}</strong></button>
          <div className="svc-stat good"><span>Taken today</span><strong>{money(c.paidToday, company?.defaultCurrency)}</strong></div>
        </div>
      )}

      <div className="svc-toolbar">
        <div className="svc-tabs">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id && !search ? 'active' : ''} onClick={() => { setSearch(''); setView(v.id); }}>
              {v.label}{v.count && c?.[v.count] ? <span className="n">{c[v.count]}</span> : null}
            </button>
          ))}
        </div>
        <label className="svc-search">
          <RiSearchLine />
          <input placeholder="Ticket no., name or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tickets" />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => load()} aria-label="Refresh"><RiRefreshLine /></button>
      </div>

      {error ? (
        <div className="svc-state"><p>{error}</p><button className="btn btn-secondary" onClick={() => load()}>Try again</button></div>
      ) : !data ? (
        <div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div>
      ) : board ? (
        <div className="ld-board">
          {COLUMNS.map((col) => {
            const list = data.orders.filter((o) => o.status === col.id);
            return (
              <section key={col.id} className={`ld-col ld-col-${col.id}`}>
                <h2>{col.label} <span>{list.length}</span></h2>
                {list.length === 0 ? <p className="svc-muted ld-empty">Nothing here.</p> : list.map((o) => (
                  <TicketCard key={o.id} o={o} action={col} busy={moving === o.id} onMove={move} />
                ))}
              </section>
            );
          })}
        </div>
      ) : data.orders.length === 0 ? (
        <div className="svc-state">
          <p>{search ? `No ticket matches “${search}”.` : 'No tickets here.'}</p>
          {!search && view === 'active' && <Link to="/laundry/new" className="btn btn-primary"><RiAddLine /> Take in the first ticket</Link>}
        </div>
      ) : (
        <div className="ld-list">
          {data.orders.map((o) => <TicketCard key={o.id} o={o} action={COLUMNS.find((x) => x.id === o.status)} busy={moving === o.id} onMove={move} wide />)}
        </div>
      )}

      {notify && <ReadyNotice o={notify} company={company} onClose={() => setNotify(null)} />}
    </div>
  );
}

// One ticket on the board: who, what, when it is due, what is owed, and
// the button that moves it to the next step.
function TicketCard({ o, action, busy, onMove, wide }) {
  const pieces = o.pieces || o.items.length;
  return (
    <article className={`ld-ticket ${o.overdue ? 'is-overdue' : ''}`}>
      <Link to={`/laundry/${o.id}`} className="ld-ticket-main">
        <div className="ld-ticket-top">
          <strong>{o.ticketNumber}</strong>
          {wide ? <span className={`svc-badge ${o.status}`}>{o.statusLabel}</span> : <strong>{money(o.total, o.currency)}</strong>}
        </div>
        <span className="ld-ticket-name">{o.customer.name}</span>
        <span className="svc-muted">
          {pieces} {o.pieces ? `piece${pieces === 1 ? '' : 's'}` : `item${pieces === 1 ? '' : 's'}`}
          {' · '}{o.status === 'collected' ? `collected ${fmtDate(o.collectedAt)}` : o.status === 'ready' ? `ready ${fmtDate(o.readyAt)}` : `due ${fmtDate(o.dueAt)}`}
          {wide && ` · ${money(o.total, o.currency)}`}
        </span>
        {(o.express || o.overdue || o.balance > 0 || o.delivery) && (
          <span className="ld-ticket-tags">
            {o.express && <span className="svc-badge express">Express</span>}
            {o.overdue && <span className="svc-badge overdue">Overdue</span>}
            {o.delivery && <span className="svc-badge">Delivery</span>}
            {o.balance > 0 && <span className="svc-badge owing">Owes {money(o.balance, o.currency)}</span>}
          </span>
        )}
      </Link>
      {action?.next && (
        <div className="ld-ticket-actions">
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onMove(o, action.next)}>
            {busy ? <RiLoader4Line className="spin" /> : null} {action.nextLabel} <RiArrowRightLine />
          </button>
          {o.status === 'ready' && o.customer.phone && (
            <a className="btn btn-ghost btn-sm" href={waLink(o.customer.phone, '')} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${o.customer.name}`}><RiWhatsappLine /></a>
          )}
        </div>
      )}
    </article>
  );
}

// After "Mark ready": one tap to tell the customer on WhatsApp.
export function ReadyNotice({ o, company, onClose }) {
  return (
    <Modal title={`${o.ticketNumber} is ready`} onClose={onClose}>
      <p className="svc-muted" style={{ marginTop: 0 }}>Let {o.customer.name} know their clothes are ready{o.balance > 0 ? ` and that they owe ${money(o.balance, o.currency)}` : ''}.</p>
      <pre className="ld-msg">{readyMessage(o, company)}</pre>
      <div className="svc-actions">
        <a className="btn btn-primary" href={waLink(o.customer.phone, readyMessage(o, company))} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          <RiWhatsappLine /> Send on WhatsApp
        </a>
        <button className="btn btn-secondary" onClick={onClose}>Not now</button>
      </div>
    </Modal>
  );
}
