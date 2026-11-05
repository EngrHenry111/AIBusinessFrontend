import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiSearchLine, RiDeleteBinLine, RiAddLine, RiSubtractLine, RiLoader4Line, RiCheckLine, RiFlashlightLine } from 'react-icons/ri';
import { laundryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { money, errText, PAY_METHODS, lagosToday, addDays, lagosISO, MANAGERS } from '../services/svc';
import Modal from '../services/Modal';
import '../services/svc.css';
import './Laundry.css';

let lineSeq = 0;

export default function LaundryNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [matches, setMatches] = useState([]);
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [picking, setPicking] = useState(null);
  const [express, setExpress] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [discount, setDiscount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [deposit, setDeposit] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef(null);

  useEffect(() => {
    laundryService.settings().then(({ data }) => setCfg(data.data)).catch((err) => setError(errText(err, 'Could not load the price list.')));
  }, []);

  // Returning customer: fill in from their last ticket.
  useEffect(() => {
    const digits = customer.phone.replace(/\D/g, '');
    if (digits.length < 5) { setMatches([]); return undefined; }
    const t = setTimeout(() => {
      laundryService.findCustomer(digits).then(({ data }) => setMatches(data.data.filter((m) => m.phone !== customer.phone || m.name !== customer.name))).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [customer.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const currency = cfg?.currency || 'NGN';
  const items = useMemo(() => (cfg?.items || []).filter((i) => i.active), [cfg]);
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))], [items]);
  const shown = items.filter((i) => (!category || i.category === category) && (!search || i.name.toLowerCase().includes(search.toLowerCase())));
  const offered = (item) => (cfg?.services || []).filter((s) => item.prices[s] != null);

  const addLine = (item, service) => {
    setLines((prev) => {
      const found = prev.find((l) => l.item === item.name && l.service === service && !l.description && !l.condition);
      if (found && item.unit !== 'kg') return prev.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      lineSeq += 1;
      return [...prev, { key: lineSeq, item: item.name, service, unit: item.unit, price: item.prices[service], quantity: 1, description: '', condition: '' }];
    });
    setPicking(null);
  };
  const tapItem = (item) => {
    const svcs = offered(item);
    if (svcs.length === 1) addLine(item, svcs[0]);
    else if (svcs.length) setPicking(item);
  };
  const setLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  const subtotal = lines.reduce((t, l) => t + l.price * (Number(l.quantity) || 0), 0);
  const expressCharge = express ? Math.round(subtotal * (cfg?.expressPercent || 0)) / 100 : 0;
  const fees = (pickup ? cfg?.pickupFee || 0 : 0) + (delivery ? cfg?.deliveryFee || 0 : 0);
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal + expressCharge + fees);
  const total = Math.round((subtotal + expressCharge + fees - disc) * 100) / 100;
  const pieces = lines.reduce((t, l) => t + (l.unit === 'kg' ? 0 : (Number(l.quantity) || 0) * (l.unit === 'pair' ? 2 : 1)), 0);
  const defaultDue = cfg ? addDays(lagosToday(), express ? cfg.expressDays : cfg.turnaroundDays) : '';

  const save = async () => {
    if (!customer.name.trim() || !customer.phone.trim()) { toast.error('Add the customer\'s name and phone.'); phoneRef.current?.focus(); return; }
    if (!lines.length) { toast.error('Add at least one item.'); return; }
    if ((pickup || delivery) && !customer.address.trim()) { toast.error('Add the address for pickup or delivery.'); return; }
    if (Number(deposit) > total) { toast.error('The deposit is more than the bill.'); return; }
    setBusy(true);
    try {
      const { data } = await laundryService.create({
        customer,
        items: lines.map((l) => ({ item: l.item, service: l.service, quantity: Number(l.quantity), description: l.description, condition: l.condition })),
        express, pickup, delivery, discount: disc || undefined, notes,
        dueAt: dueDay && dueDay !== defaultDue ? lagosISO(dueDay, '17:00') : undefined,
        payment: Number(deposit) > 0 ? { amount: Number(deposit), method } : undefined,
      });
      toast.success(`Ticket ${data.data.ticketNumber} saved`);
      navigate(`/laundry/${data.data.id}?new=1`);
    } catch (err) {
      toast.error(errText(err, 'Could not save the ticket.'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p></div></div>;
  if (!cfg) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading price list…</div></div>;

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/laundry" className="svc-back"><RiArrowLeftLine /> Laundry board</Link>
        <div className="svc-head"><div><h1>New ticket</h1><p>Take in a customer's clothes. Prices come from your price list.</p></div></div>
      </div>

      <div className="svc-layout">
        <div className="svc-form">
          <div className="svc-card">
            <h3>Customer</h3>
            <div className="svc-grid2">
              <label className="svc-field">Phone *
                <input ref={phoneRef} autoFocus inputMode="tel" placeholder="0803 000 0000" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </label>
              <label className="svc-field">Name *
                <input placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </label>
            </div>
            {matches.length > 0 && (
              <div className="ld-matches">
                <span className="svc-muted">Returning customer?</span>
                {matches.map((m) => (
                  <button key={m.phone} type="button" onClick={() => { setCustomer({ name: m.name, phone: m.phone, email: m.email || '', address: m.address || '' }); setMatches([]); }}>
                    {m.name} · {m.phone}
                  </button>
                ))}
              </div>
            )}
            <div className="svc-grid2">
              <label className="svc-field">Email <small>(gets a "ready" email)</small>
                <input inputMode="email" placeholder="optional" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </label>
              <label className="svc-field">Address <small>{pickup || delivery ? '(needed for pickup/delivery)' : '(optional)'}</small>
                <input placeholder="House address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="svc-card">
            <h3>Add items <small>tap an item, then choose the service</small></h3>
            <label className="svc-search">
              <RiSearchLine />
              <input placeholder="Search: shirt, agbada, duvet…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search price list" />
            </label>
            {categories.length > 1 && (
              <div className="svc-tabs">
                <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>All</button>
                {categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
              </div>
            )}
            <div className="ld-items">
              {shown.map((i) => {
                const svcs = offered(i);
                const from = Math.min(...svcs.map((s) => i.prices[s]));
                return (
                  <button key={i.id} className="ld-item" onClick={() => tapItem(i)} disabled={!svcs.length}>
                    <span className="ld-item-name">{i.name}</span>
                    <span className="ld-item-price">{svcs.length ? `${svcs.length > 1 ? 'from ' : ''}${money(from, currency)}${i.unit === 'kg' ? '/kg' : ''}` : 'no price set'}</span>
                  </button>
                );
              })}
              {shown.length === 0 && <p className="svc-muted">Nothing matches. Add it on the <Link to="/laundry/prices">price list</Link>.</p>}
            </div>
          </div>

          {lines.length > 0 && (
            <div className="svc-card">
              <h3>On this ticket <small>{pieces} piece{pieces === 1 ? '' : 's'}</small></h3>
              <ul className="ld-lines">
                {lines.map((l) => (
                  <li key={l.key}>
                    <div className="ld-line-top">
                      <div><strong>{l.item}</strong> <span className="svc-muted">· {l.service} · {money(l.price, currency)}{l.unit === 'kg' ? '/kg' : ''}</span></div>
                      <button className="ld-remove" onClick={() => removeLine(l.key)} aria-label={`Remove ${l.item}`}><RiDeleteBinLine /></button>
                    </div>
                    <div className="ld-line-row">
                      <div className="ld-stepper">
                        {l.unit !== 'kg' && <button onClick={() => setLine(l.key, { quantity: Math.max(1, l.quantity - 1) })} aria-label="One less"><RiSubtractLine /></button>}
                        <input type="number" inputMode="decimal" min={l.unit === 'kg' ? 0.1 : 1} step={l.unit === 'kg' ? 0.1 : 1} value={l.quantity}
                          onChange={(e) => setLine(l.key, { quantity: e.target.value })} aria-label={`Quantity of ${l.item}`} />
                        {l.unit !== 'kg' ? <button onClick={() => setLine(l.key, { quantity: Number(l.quantity) + 1 })} aria-label="One more"><RiAddLine /></button> : <span className="ld-unit">kg</span>}
                      </div>
                      <strong>{money(l.price * (Number(l.quantity) || 0), currency)}</strong>
                    </div>
                    <div className="svc-grid2">
                      <input className="svc-input" placeholder="Colour / brand, e.g. white, Zara" value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} />
                      <input className="svc-input" placeholder="Stains or damage seen now" value={l.condition} onChange={(e) => setLine(l.key, { condition: e.target.value })} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="svc-muted" style={{ margin: 0 }}>Note any stains, tears or missing buttons now. They print on the receipt, so nobody can say the shop caused them.</p>
            </div>
          )}
        </div>

        <aside className="svc-side">
          <div className="svc-card">
            <h3>Options</h3>
            <label className="svc-check"><input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} /> <RiFlashlightLine /> Express (+{cfg.expressPercent}%)</label>
            <label className="svc-check"><input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} /> We picked it up {cfg.pickupFee ? `(+${money(cfg.pickupFee, currency)})` : ''}</label>
            <label className="svc-check"><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /> Deliver when ready {cfg.deliveryFee ? `(+${money(cfg.deliveryFee, currency)})` : ''}</label>
            <label className="svc-field">Ready by
              <input type="date" value={dueDay || defaultDue} min={lagosToday()} onChange={(e) => setDueDay(e.target.value)} />
            </label>
            <label className="svc-field">Notes <small>(optional)</small>
              <textarea rows={2} placeholder="e.g. no starch on the blue shirt" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div className="svc-card">
            <h3>Bill</h3>
            <div className="svc-row"><span>Items</span><span>{money(subtotal, currency)}</span></div>
            {express && <div className="svc-row"><span>Express</span><span>{money(expressCharge, currency)}</span></div>}
            {fees > 0 && <div className="svc-row"><span>Pickup / delivery</span><span>{money(fees, currency)}</span></div>}
            <label className="svc-row"><span>Discount{!MANAGERS.includes(user?.role) ? ' (max 20%)' : ''}</span>
              <input className="svc-input ld-small" type="number" inputMode="decimal" min="0" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <div className="svc-row ld-total"><span>Total</span><strong>{money(total, currency)}</strong></div>
            <label className="svc-row"><span>Paid now</span>
              <input className="svc-input ld-small" type="number" inputMode="decimal" min="0" placeholder="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </label>
            {Number(deposit) > 0 && (
              <div className="svc-seg">
                {PAY_METHODS.map((m) => <button key={m.id} type="button" className={method === m.id ? 'active' : ''} onClick={() => setMethod(m.id)}>{m.label}</button>)}
              </div>
            )}
            <div className="svc-row"><span>Balance on collection</span><strong>{money(Math.max(0, total - (Number(deposit) || 0)), currency)}</strong></div>
            <button className="btn btn-primary svc-big-btn" disabled={busy || !lines.length} onClick={save}>
              {busy ? <RiLoader4Line className="spin" /> : <RiCheckLine />} Save ticket {lines.length > 0 && `· ${money(total, currency)}`}
            </button>
          </div>
        </aside>
      </div>

      {picking && (
        <Modal title={picking.name} onClose={() => setPicking(null)}>
          <div className="ld-services">
            {offered(picking).map((s) => (
              <button key={s} onClick={() => addLine(picking, s)}>
                <span>{s}</span><strong>{money(picking.prices[s], currency)}{picking.unit === 'kg' ? '/kg' : ''}</strong>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
