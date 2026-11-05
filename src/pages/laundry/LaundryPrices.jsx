import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine, RiLoader4Line, RiSaveLine, RiPriceTag3Line, RiSearchLine } from 'react-icons/ri';
import { laundryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { errText, MANAGERS } from '../services/svc';
import '../services/svc.css';
import './Laundry.css';

let keySeq = 0;
const withKeys = (items) => items.map((i) => { keySeq += 1; return { ...i, key: keySeq }; });

export default function LaundryPrices() {
  const { user } = useAuth();
  const canEdit = MANAGERS.includes(user?.role);
  const [cfg, setCfg] = useState(null);
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    laundryService.settings().then(({ data }) => {
      setCfg(data.data); setItems(withKeys(data.data.items)); setServices(data.data.services);
    }).catch((err) => setError(errText(err, 'Could not load the price list.')));
  }, []);

  const touch = (fn) => { fn(); setDirty(true); };
  const setItem = (key, patch) => touch(() => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i))));
  const setPrice = (key, svc, v) => touch(() => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, prices: { ...i.prices, [svc]: v === '' ? undefined : v } } : i))));
  const setOpt = (k, v) => touch(() => setCfg((c) => ({ ...c, [k]: v })));
  const shown = useMemo(() => items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || '').toLowerCase().includes(search.toLowerCase())), [items, search]);

  const addService = () => {
    const name = newService.trim();
    if (!name) return;
    if (services.some((s) => s.toLowerCase() === name.toLowerCase())) { toast.error('That service is already there.'); return; }
    touch(() => setServices((s) => [...s, name]));
    setNewService('');
  };
  const removeService = (svc) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remove "${svc}" and all its prices?`)) return;
    touch(() => { setServices((s) => s.filter((x) => x !== svc)); setItems((prev) => prev.map((i) => { const p = { ...i.prices }; delete p[svc]; return { ...i, prices: p }; })); });
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        services,
        items: items.filter((i) => i.name.trim()).map((i) => ({ name: i.name, category: i.category, unit: i.unit, active: i.active, prices: Object.fromEntries(Object.entries(i.prices).filter(([, v]) => v !== undefined && v !== '' && v !== null)) })),
        expressPercent: Number(cfg.expressPercent), turnaroundDays: Number(cfg.turnaroundDays), expressDays: Number(cfg.expressDays),
        pickupFee: Number(cfg.pickupFee) || 0, deliveryFee: Number(cfg.deliveryFee) || 0, uncollectedDays: Number(cfg.uncollectedDays) || 30,
      };
      const { data } = await laundryService.saveSettings(payload);
      setCfg((c) => ({ ...c, ...data.data })); setItems(withKeys(data.data.items)); setServices(data.data.services);
      setDirty(false);
      toast.success('Price list saved');
    } catch (err) { toast.error(errText(err, 'Could not save.')); } finally { setBusy(false); }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p></div></div>;
  if (!cfg) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div></div>;

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/laundry" className="svc-back"><RiArrowLeftLine /> Laundry board</Link>
        <div className="svc-head">
          <div><h1><RiPriceTag3Line /> Price list</h1><p>What you charge for each item and service. Leave a price empty if you don't offer that service for the item.</p></div>
          {canEdit && <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? <RiLoader4Line className="spin" /> : <RiSaveLine />} Save changes</button>}
        </div>
      </div>
      {!canEdit && <div className="svc-card"><p className="svc-muted" style={{ margin: 0 }}>Only owners and managers can change prices.</p></div>}

      <div className="svc-card">
        <h3>Turnaround and fees</h3>
        <div className="svc-grid3 svc-form">
          <label className="svc-field">Normal ready in (days)<input type="number" min="0" disabled={!canEdit} value={cfg.turnaroundDays} onChange={(e) => setOpt('turnaroundDays', e.target.value)} /></label>
          <label className="svc-field">Express ready in (days)<input type="number" min="0" disabled={!canEdit} value={cfg.expressDays} onChange={(e) => setOpt('expressDays', e.target.value)} /></label>
          <label className="svc-field">Express extra (%)<input type="number" min="0" disabled={!canEdit} value={cfg.expressPercent} onChange={(e) => setOpt('expressPercent', e.target.value)} /></label>
          <label className="svc-field">Pickup fee<input type="number" min="0" disabled={!canEdit} value={cfg.pickupFee} onChange={(e) => setOpt('pickupFee', e.target.value)} /></label>
          <label className="svc-field">Delivery fee<input type="number" min="0" disabled={!canEdit} value={cfg.deliveryFee} onChange={(e) => setOpt('deliveryFee', e.target.value)} /></label>
          <label className="svc-field">Flag as "not collected" after (days)<input type="number" min="1" disabled={!canEdit} value={cfg.uncollectedDays} onChange={(e) => setOpt('uncollectedDays', e.target.value)} /></label>
        </div>
      </div>

      <div className="svc-card">
        <h3>Services</h3>
        <div className="ld-chips">
          {services.map((s) => (
            <span key={s} className="ld-chip">{s}{canEdit && services.length > 1 && <button onClick={() => removeService(s)} aria-label={`Remove ${s}`}>×</button>}</span>
          ))}
          {canEdit && (
            <span className="ld-chip-add">
              <input placeholder="Add a service, e.g. Steam press" value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addService(); }} />
              <button className="btn btn-secondary btn-sm" onClick={addService}><RiAddLine /> Add</button>
            </span>
          )}
        </div>
      </div>

      <div className="svc-card">
        <div className="svc-toolbar">
          <h3 style={{ flex: 1 }}>Items <small>{items.length}</small></h3>
          <label className="svc-search" style={{ maxWidth: 280 }}><RiSearchLine /><input placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => { keySeq += 1; touch(() => setItems((p) => [{ key: keySeq, name: '', category: '', unit: 'piece', prices: {}, active: true }, ...p])); setSearch(''); }}><RiAddLine /> Add item</button>}
        </div>
        <div className="ld-price-wrap">
          <table className="ld-price-table">
            <thead>
              <tr>
                <th>Item</th><th>Category</th><th>Unit</th>
                {services.map((s) => <th key={s}>{s}</th>)}
                <th>On</th>{canEdit && <th aria-label="Remove" />}
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.key} className={i.active ? '' : 'off'}>
                  <td><input value={i.name} disabled={!canEdit} placeholder="Item name" onChange={(e) => setItem(i.key, { name: e.target.value })} aria-label="Item name" /></td>
                  <td><input value={i.category} disabled={!canEdit} placeholder="—" onChange={(e) => setItem(i.key, { category: e.target.value })} aria-label="Category" /></td>
                  <td>
                    <select value={i.unit} disabled={!canEdit} onChange={(e) => setItem(i.key, { unit: e.target.value })} aria-label="Unit">
                      <option value="piece">piece</option><option value="pair">pair</option><option value="set">set</option><option value="kg">kg</option>
                    </select>
                  </td>
                  {services.map((s) => (
                    <td key={s}><input type="number" min="0" inputMode="decimal" disabled={!canEdit} value={i.prices[s] ?? ''} placeholder="—" onChange={(e) => setPrice(i.key, s, e.target.value)} aria-label={`${i.name} ${s} price`} /></td>
                  ))}
                  <td><input type="checkbox" disabled={!canEdit} checked={i.active} onChange={(e) => setItem(i.key, { active: e.target.checked })} aria-label="Offered" /></td>
                  {canEdit && <td><button className="ld-remove" onClick={() => touch(() => setItems((p) => p.filter((x) => x.key !== i.key)))} aria-label={`Remove ${i.name}`}><RiDeleteBinLine /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {canEdit && dirty && (
        <div className="ld-savebar">
          <span>You have unsaved changes.</span>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? <RiLoader4Line className="spin" /> : <RiSaveLine />} Save changes</button>
        </div>
      )}
    </div>
  );
}
