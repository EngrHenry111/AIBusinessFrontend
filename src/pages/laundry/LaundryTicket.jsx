import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiLoader4Line, RiPrinterLine, RiPriceTag3Line, RiWhatsappLine, RiMailSendLine, RiArrowRightLine,
  RiForbidLine, RiPhoneLine, RiFlashlightLine,
} from 'react-icons/ri';
import { laundryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { money, fmtDate, fmtDateTime, errText, waLink, telLink, MANAGERS } from '../services/svc';
import PaymentBox from '../services/PaymentBox';
import Modal from '../services/Modal';
import { ReadyNotice } from './LaundryBoard';
import { readyMessage, receivedMessage } from './laundryText';
import '../services/svc.css';
import './Laundry.css';

const STEPS = ['received', 'washing', 'ready', 'collected'];
const NEXT = { received: ['washing', 'Start washing'], washing: ['ready', 'Mark ready'], ready: ['collected', 'Customer collected'] };
const BACK = { washing: ['received', 'Back to received'], ready: ['washing', 'Back to washing'] };

export default function LaundryTicket() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, company } = useAuth();
  const isManager = MANAGERS.includes(user?.role);
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(null); // 'receipt' | 'tags'
  const [notify, setNotify] = useState(null);
  const [owing, setOwing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const justCreated = params.get('new') === '1';

  const load = useCallback(async () => {
    try {
      const { data } = await laundryService.get(id);
      setO(data.data);
    } catch (err) { setError(errText(err, 'Could not load this ticket.')); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!printing) return undefined;
    const t = setTimeout(() => { window.print(); setPrinting(null); }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  const move = async (to, allowBalance = false) => {
    setBusy(true);
    try {
      const { data } = await laundryService.setStatus(o.id, to, allowBalance);
      setO({ ...data.data, business: o.business });
      setOwing(false);
      if (to === 'ready') {
        toast.success(data.emailed ? 'Marked ready. Customer emailed.' : 'Marked ready.');
        if (data.data.customer.phone) setNotify(data.data);
      } else toast.success(data.data.statusLabel);
    } catch (err) {
      if (err?.response?.status === 409 && to === 'collected') setOwing(true);
      else toast.error(errText(err, 'Could not update the ticket.'));
    } finally { setBusy(false); }
  };

  const pay = async (p) => {
    const { data } = await laundryService.pay(o.id, p);
    setO({ ...data.data, business: o.business });
  };

  const email = async () => {
    try { await laundryService.notify(o.id); toast.success('Email sent.'); load(); } catch (err) { toast.error(errText(err, 'Could not send the email.')); }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p><Link to="/laundry" className="btn btn-secondary">Back to board</Link></div></div>;
  if (!o) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div></div>;

  const step = STEPS.indexOf(o.status);
  const next = NEXT[o.status];
  const back = BACK[o.status];
  const closed = ['collected', 'cancelled'].includes(o.status);

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/laundry" className="svc-back"><RiArrowLeftLine /> Laundry board</Link>
        <div className="svc-head">
          <div>
            <h1>{o.ticketNumber} <span className={`svc-badge ${o.status}`}>{o.statusLabel}</span>{o.express && <span className="svc-badge express"><RiFlashlightLine /> Express</span>}</h1>
            <p>{o.customer.name} · taken in {fmtDateTime(o.createdAt)}{o.createdByName ? ` by ${o.createdByName}` : ''}</p>
          </div>
          <div className="svc-head-actions">
            <button className="btn btn-secondary" onClick={() => setPrinting('receipt')}><RiPrinterLine /> Receipt</button>
            <button className="btn btn-secondary" onClick={() => setPrinting('tags')}><RiPriceTag3Line /> Tags</button>
          </div>
        </div>
      </div>

      {justCreated && (
        <div className="ld-created">
          <strong>Ticket saved.</strong> Print the receipt for the customer and tag the clothes{o.customer.phone ? ', or send the receipt on WhatsApp' : ''}.
          <div className="svc-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setPrinting('receipt')}><RiPrinterLine /> Print receipt</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPrinting('tags')}><RiPriceTag3Line /> Print tags</button>
            {o.customer.phone && <a className="btn btn-secondary btn-sm" href={waLink(o.customer.phone, receivedMessage(o, company))} target="_blank" rel="noopener noreferrer"><RiWhatsappLine /> Send receipt</a>}
            <button className="btn btn-ghost btn-sm" onClick={() => setParams({})}>Done</button>
          </div>
        </div>
      )}

      {o.status !== 'cancelled' && (
        <ol className="ld-steps" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
              <span>{i + 1}</span>{s === 'ready' ? 'Ready' : s[0].toUpperCase() + s.slice(1)}
            </li>
          ))}
        </ol>
      )}

      <div className="svc-layout">
        <div className="svc-form">
          {!closed && (
            <div className="svc-card">
              <div className="svc-row">
                <span>{o.status === 'ready' ? `Ready since ${fmtDateTime(o.readyAt)}` : `Due ${fmtDate(o.dueAt)}`}{o.overdue && <span className="svc-badge overdue" style={{ marginLeft: 8 }}>Overdue</span>}</span>
              </div>
              {next && (
                <button className="btn btn-primary svc-big-btn" disabled={busy} onClick={() => move(next[0])}>
                  {busy ? <RiLoader4Line className="spin" /> : null} {next[1]} <RiArrowRightLine />
                </button>
              )}
              <div className="svc-actions">
                {o.status === 'ready' && o.customer.phone && (
                  <a className="btn btn-secondary" href={waLink(o.customer.phone, readyMessage(o, company))} target="_blank" rel="noopener noreferrer"><RiWhatsappLine /> Tell customer</a>
                )}
                {o.status === 'ready' && o.customer.email && (
                  <button className="btn btn-secondary" onClick={email}><RiMailSendLine /> {o.readyNotifiedAt ? 'Email again' : 'Email customer'}</button>
                )}
                {back && <button className="btn btn-ghost" disabled={busy} onClick={() => move(back[0])}>{back[1]}</button>}
              </div>
              {o.readyNotifiedAt && <p className="svc-muted" style={{ margin: 0 }}>Ready email sent {fmtDateTime(o.readyNotifiedAt)}.</p>}
            </div>
          )}

          <div className="svc-card">
            <h3>Items <small>{o.pieces ? `${o.pieces} pieces` : ''}</small></h3>
            <table className="ld-table">
              <thead><tr><th>Item</th><th>Service</th><th>Qty</th><th>Amount</th></tr></thead>
              <tbody>
                {o.items.map((i, n) => (
                  <tr key={n}>
                    <td>
                      <strong>{i.item}</strong>
                      {i.description && <div className="svc-muted">{i.description}</div>}
                      {i.condition && <div className="ld-condition">⚠ {i.condition}</div>}
                    </td>
                    <td>{i.service}</td>
                    <td>{i.quantity}{i.unit === 'kg' ? ' kg' : ''}</td>
                    <td>{money(i.lineTotal, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {o.notes && <p className="svc-muted" style={{ margin: 0 }}><strong>Notes:</strong> {o.notes}</p>}
          </div>

          <div className="svc-card">
            <h3>History</h3>
            <ul className="svc-timeline">
              {[...o.timeline].reverse().map((t, i) => (
                <li key={i}><time>{fmtDateTime(t.at)}</time><span>{t.note || t.status}{t.byName ? ` · ${t.byName}` : ''}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="svc-side">
          <div className="svc-card">
            <h3>Customer</h3>
            <div><strong>{o.customer.name}</strong></div>
            {o.customer.phone && <div className="svc-actions"><a className="btn btn-ghost btn-sm" href={telLink(o.customer.phone)}><RiPhoneLine /> {o.customer.phone}</a></div>}
            {o.customer.email && <div className="svc-muted">{o.customer.email}</div>}
            {o.customer.address && <div className="svc-muted">{o.customer.address}</div>}
            {(o.pickup || o.delivery) && <div className="svc-muted">{[o.pickup && 'Picked up by us', o.delivery && 'To be delivered'].filter(Boolean).join(' · ')}</div>}
          </div>
          <PaymentBox total={o.total} paid={o.amountPaid} balance={o.balance} currency={o.currency} payments={o.payments} onPay={pay} disabled={o.status === 'cancelled'} />
          {isManager && !closed && (
            <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setCancelling(true)}><RiForbidLine /> Cancel ticket</button>
          )}
        </aside>
      </div>

      {notify && <ReadyNotice o={notify} company={company} onClose={() => setNotify(null)} />}
      {owing && (
        <Modal title="Customer still owes" onClose={() => setOwing(false)}>
          <p style={{ marginTop: 0 }}>{o.customer.name} owes <strong>{money(o.balance, o.currency)}</strong>. Record the payment in the Payment box first, or let them collect and owe.</p>
          <div className="svc-actions">
            <button className="btn btn-primary" onClick={() => setOwing(false)}>Record payment first</button>
            <button className="btn btn-secondary" onClick={() => move('collected', true)}>Collect, still owing</button>
          </div>
        </Modal>
      )}
      {cancelling && <CancelModal o={o} onClose={() => setCancelling(false)} onDone={(saved) => { setO({ ...saved, business: o.business }); setCancelling(false); }} />}

      {printing && createPortal(<div className="svc-print">{printing === 'tags' ? <Tags o={o} /> : <Receipt o={o} />}</div>, document.body)}
    </div>
  );
}

function CancelModal({ o, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) { toast.error('Say why the ticket is being cancelled.'); return; }
    setBusy(true);
    try {
      const { data } = await laundryService.cancel(o.id, reason.trim());
      toast.success(`${o.ticketNumber} cancelled`);
      onDone(data.data);
    } catch (err) { toast.error(errText(err, 'Could not cancel.')); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Cancel ${o.ticketNumber}?`} onClose={onClose}>
      <div className="svc-form">
        <label className="svc-field">Reason
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer took the clothes back" />
        </label>
        {o.amountPaid > 0 && <p className="svc-muted" style={{ margin: 0 }}>{money(o.amountPaid, o.currency)} was paid on this ticket. Refund it outside the app if needed.</p>}
        <div className="svc-actions">
          <button className="btn btn-danger" disabled={busy} onClick={submit}>{busy ? <RiLoader4Line className="spin" /> : null} Cancel ticket</button>
          <button className="btn btn-secondary" onClick={onClose}>Keep it</button>
        </div>
      </div>
    </Modal>
  );
}

function Receipt({ o }) {
  const b = o.business || {};
  return (
    <div className="ld-receipt">
      <div className="ld-r-biz">{b.name}</div>
      {(b.address || b.phone) && <div className="ld-r-small">{[b.address, b.phone].filter(Boolean).join(' · ')}</div>}
      <div className="ld-r-ticket">{o.ticketNumber}</div>
      <div className="ld-r-row"><span>Customer</span><span>{o.customer.name}</span></div>
      {o.customer.phone && <div className="ld-r-row"><span>Phone</span><span>{o.customer.phone}</span></div>}
      <div className="ld-r-row"><span>Received</span><span>{fmtDateTime(o.createdAt)}</span></div>
      <div className="ld-r-row"><strong>Ready by</strong><strong>{fmtDate(o.dueAt)}{o.express ? ' (EXPRESS)' : ''}</strong></div>
      <table>
        <tbody>
          {o.items.map((i, n) => (
            <tr key={n}>
              <td>{i.quantity}{i.unit === 'kg' ? 'kg' : '×'} {i.item}<div className="ld-r-small">{i.service}{i.description ? ` · ${i.description}` : ''}</div>{i.condition && <div className="ld-r-small">Noted: {i.condition}</div>}</td>
              <td>{money(i.lineTotal, o.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {o.expressCharge > 0 && <div className="ld-r-row"><span>Express</span><span>{money(o.expressCharge, o.currency)}</span></div>}
      {o.pickupFee > 0 && <div className="ld-r-row"><span>Pickup</span><span>{money(o.pickupFee, o.currency)}</span></div>}
      {o.deliveryFee > 0 && <div className="ld-r-row"><span>Delivery</span><span>{money(o.deliveryFee, o.currency)}</span></div>}
      {o.discount > 0 && <div className="ld-r-row"><span>Discount</span><span>-{money(o.discount, o.currency)}</span></div>}
      <div className="ld-r-row ld-r-total"><span>TOTAL</span><span>{money(o.total, o.currency)}</span></div>
      <div className="ld-r-row"><span>Paid</span><span>{money(o.amountPaid, o.currency)}</span></div>
      <div className="ld-r-row ld-r-total"><span>BALANCE</span><span>{money(o.balance, o.currency)}</span></div>
      <p className="ld-r-small" style={{ marginTop: 10, textAlign: 'center' }}>{o.pieces ? `${o.pieces} pieces. ` : ''}Bring this receipt when you come to collect. Thank you!</p>
    </div>
  );
}

// One tag per piece: pin or staple it to the garment.
function Tags({ o }) {
  const tags = [];
  for (const i of o.items) {
    const n = i.unit === 'kg' ? 1 : Math.round(i.quantity) * (i.unit === 'pair' ? 1 : 1);
    for (let k = 0; k < n; k += 1) tags.push({ item: i.item, service: i.service, kg: i.unit === 'kg' ? i.quantity : null });
  }
  return (
    <div className="ld-tags">
      {tags.map((t, n) => (
        <div key={n} className="ld-tag">
          <div className="ld-tag-no">{o.ticketNumber}</div>
          <div className="ld-tag-count">{n + 1} of {tags.length}</div>
          <div className="ld-tag-name">{o.customer.name}</div>
          <div className="ld-tag-item">{t.item}{t.kg ? ` (${t.kg}kg)` : ''}</div>
          <div className="ld-tag-svc">{t.service}{o.express ? ' · EXPRESS' : ''}</div>
          <div className="ld-tag-due">Due {fmtDate(o.dueAt)}</div>
        </div>
      ))}
    </div>
  );
}
