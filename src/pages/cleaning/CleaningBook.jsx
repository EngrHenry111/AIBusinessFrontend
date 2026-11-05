import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiCheckLine, RiAddLine, RiSubtractLine } from 'react-icons/ri';
import { cleaningService } from '../../services';
import { money, errText, lagosToday, lagosISO } from '../services/svc';
import '../services/svc.css';
import './Cleaning.css';

const PROPERTY = [['flat', 'Flat'], ['duplex', 'Duplex'], ['bungalow', 'Bungalow'], ['terrace', 'Terrace'], ['office', 'Office'], ['shop', 'Shop'], ['other', 'Other']];
const REPEAT = [['none', 'One-off'], ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month']];

export default function CleaningBook() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [cfg, setCfg] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    name: '', phone: '', email: '', address: '', area: '', landmark: '', accessNotes: '',
    type: 'flat', bedrooms: 2, bathrooms: 2, service: '', date: params.get('date') || lagosToday(), time: '09:00', hours: '',
    recurrence: 'none', discount: '', notes: '',
  });
  const [extras, setExtras] = useState({}); // name -> quantity
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([cleaningService.settings(), cleaningService.team()])
      .then(([s, t]) => {
        setCfg(s.data.data); setTeam(t.data.data);
        const first = s.data.data.services.find((x) => x.active);
        if (first) setF((p) => ({ ...p, service: first.name }));
      })
      .catch((err) => setError(errText(err, 'Could not load your services.')));
  }, []);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const svc = cfg?.services.find((x) => x.name === f.service);
  const currency = cfg?.currency || 'NGN';
  const price = useMemo(() => {
    if (!svc) return null;
    const rooms = (Number(f.bedrooms) || 0) * svc.perBedroom + (Number(f.bathrooms) || 0) * svc.perBathroom;
    const ex = Object.entries(extras).reduce((t, [name, q]) => t + (cfg.extras.find((e) => e.name === name)?.price || 0) * q, 0);
    const gross = svc.basePrice + rooms + ex + (cfg.transportFee || 0);
    const disc = Math.min(Math.max(0, Number(f.discount) || 0), gross);
    return { base: svc.basePrice, rooms, extras: ex, transport: cfg.transportFee || 0, discount: disc, total: gross - disc };
  }, [svc, f.bedrooms, f.bathrooms, f.discount, extras, cfg]);

  const toggleExtra = (name) => setExtras((p) => { const n = { ...p }; if (n[name]) delete n[name]; else n[name] = 1; return n; });
  const extraQty = (name, d) => setExtras((p) => ({ ...p, [name]: Math.max(1, (p[name] || 1) + d) }));
  const togglePerson = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim()) { toast.error('Add the customer\'s name and phone.'); return; }
    if (!f.address.trim()) { toast.error('Add the address.'); return; }
    setBusy(true);
    try {
      const { data } = await cleaningService.create({
        customer: { name: f.name, phone: f.phone, email: f.email },
        address: f.address, area: f.area, landmark: f.landmark, accessNotes: f.accessNotes,
        property: { type: f.type, bedrooms: Number(f.bedrooms) || 0, bathrooms: Number(f.bathrooms) || 0 },
        service: f.service, extras: Object.entries(extras).map(([name, quantity]) => ({ name, quantity })),
        scheduledAt: lagosISO(f.date, f.time), hours: f.hours ? Number(f.hours) : undefined,
        team: picked, recurrence: f.recurrence, discount: Number(f.discount) || undefined, notes: f.notes,
      });
      toast.success(`${data.data.jobNumber} booked`);
      for (const w of data.warnings || []) toast(w, { icon: '⚠️', duration: 7000 });
      navigate(`/cleaning/jobs/${data.data.id}`);
    } catch (err) { toast.error(errText(err, 'Could not book the job.')); } finally { setBusy(false); }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p></div></div>;
  if (!cfg) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div></div>;

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/cleaning" className="svc-back"><RiArrowLeftLine /> Schedule</Link>
        <div className="svc-head"><div><h1>Book a clean</h1><p>The price is worked out from your services and prices.</p></div></div>
      </div>
      <form className="svc-layout" onSubmit={save}>
        <div className="svc-form">
          <div className="svc-card">
            <h3>Customer</h3>
            <div className="svc-grid2">
              <label className="svc-field">Name *<input autoFocus value={f.name} onChange={set('name')} placeholder="e.g. Mrs Okafor" /></label>
              <label className="svc-field">Phone *<input inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0803 000 0000" /></label>
            </div>
            <label className="svc-field">Email <small>(gets an "on the way" email)</small><input inputMode="email" value={f.email} onChange={set('email')} placeholder="optional" /></label>
          </div>

          <div className="svc-card">
            <h3>Where</h3>
            <label className="svc-field">Address *<input value={f.address} onChange={set('address')} placeholder="House number, street" /></label>
            <div className="svc-grid2">
              <label className="svc-field">Area<input value={f.area} onChange={set('area')} placeholder="e.g. Lekki Phase 1" /></label>
              <label className="svc-field">Landmark<input value={f.landmark} onChange={set('landmark')} placeholder="e.g. opposite Shoprite" /></label>
            </div>
            <label className="svc-field">Access notes <small>gate code, who opens, pets</small><input value={f.accessNotes} onChange={set('accessNotes')} placeholder="e.g. Call the gateman, Sule" /></label>
            <div className="svc-grid3">
              <label className="svc-field">Property<select value={f.type} onChange={set('type')}>{PROPERTY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="svc-field">Bedrooms<input type="number" min="0" value={f.bedrooms} onChange={set('bedrooms')} /></label>
              <label className="svc-field">Bathrooms / toilets<input type="number" min="0" value={f.bathrooms} onChange={set('bathrooms')} /></label>
            </div>
          </div>

          <div className="svc-card">
            <h3>What</h3>
            <div className="cl-services">
              {cfg.services.filter((x) => x.active).map((x) => (
                <button type="button" key={x.id} className={f.service === x.name ? 'active' : ''} onClick={() => setF((p) => ({ ...p, service: x.name }))}>
                  <strong>{x.name}</strong>
                  <span>{money(x.basePrice, currency)}{x.perBedroom ? ` + ${money(x.perBedroom, currency)}/bedroom` : ''}</span>
                  <small>about {x.hours}h</small>
                </button>
              ))}
            </div>
            {cfg.extras.length > 0 && (
              <>
                <span className="svc-field">Extras</span>
                <div className="cl-extras">
                  {cfg.extras.map((x) => (
                    <div key={x.name} className={`cl-extra ${extras[x.name] ? 'on' : ''}`}>
                      <label className="svc-check"><input type="checkbox" checked={Boolean(extras[x.name])} onChange={() => toggleExtra(x.name)} /> {x.name} <span className="svc-muted">{money(x.price, currency)}</span></label>
                      {extras[x.name] && (
                        <span className="cl-qty">
                          <button type="button" onClick={() => extraQty(x.name, -1)} aria-label="Fewer"><RiSubtractLine /></button>
                          {extras[x.name]}
                          <button type="button" onClick={() => extraQty(x.name, 1)} aria-label="More"><RiAddLine /></button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="svc-card">
            <h3>When and who</h3>
            <div className="svc-grid3">
              <label className="svc-field">Date<input type="date" min={lagosToday()} value={f.date} onChange={set('date')} /></label>
              <label className="svc-field">Start time<input type="time" value={f.time} onChange={set('time')} /></label>
              <label className="svc-field">Hours <small>default {svc?.hours || 3}</small><input type="number" min="0.5" step="0.5" value={f.hours} placeholder={String(svc?.hours || 3)} onChange={set('hours')} /></label>
            </div>
            <label className="svc-field">Repeat
              <div className="svc-seg">{REPEAT.map(([v, l]) => <button type="button" key={v} className={f.recurrence === v ? 'active' : ''} onClick={() => setF((p) => ({ ...p, recurrence: v }))}>{l}</button>)}</div>
            </label>
            {f.recurrence !== 'none' && <p className="svc-muted" style={{ margin: 0 }}>When a visit is completed, the next one is booked automatically with the same team.</p>}
            <span className="svc-field">Team</span>
            {team.length === 0 ? (
              <p className="svc-muted" style={{ margin: 0 }}>No staff yet. <Link to="/team">Add your cleaners</Link> (they don't need a login).</p>
            ) : (
              <div className="cl-people">
                {team.map((t) => (
                  <button type="button" key={t.id} className={picked.includes(t.id) ? 'active' : ''} onClick={() => togglePerson(t.id)}>
                    {picked.includes(t.id) && <RiCheckLine />} {t.name}
                  </button>
                ))}
              </div>
            )}
            <label className="svc-field">Notes for the team<textarea value={f.notes} onChange={set('notes')} placeholder="e.g. bring the ladder for the high windows" /></label>
          </div>
        </div>

        <aside className="svc-side">
          <div className="svc-card">
            <h3>Price</h3>
            {price && (
              <>
                <div className="svc-row"><span>{f.service}</span><span>{money(price.base, currency)}</span></div>
                {price.rooms > 0 && <div className="svc-row"><span>{f.bedrooms} bed / {f.bathrooms} bath</span><span>{money(price.rooms, currency)}</span></div>}
                {price.extras > 0 && <div className="svc-row"><span>Extras</span><span>{money(price.extras, currency)}</span></div>}
                {price.transport > 0 && <div className="svc-row"><span>Transport</span><span>{money(price.transport, currency)}</span></div>}
                <label className="svc-row"><span>Discount</span><input className="svc-input cl-small" type="number" min="0" placeholder="0" value={f.discount} onChange={set('discount')} /></label>
                <div className="svc-row cl-total"><span>Total</span><strong>{money(price.total, currency)}</strong></div>
              </>
            )}
            <button className="btn btn-primary svc-big-btn" disabled={busy}>{busy ? <RiLoader4Line className="spin" /> : <RiCheckLine />} Book {price ? money(price.total, currency) : ''}</button>
          </div>
        </aside>
      </form>
    </div>
  );
}
