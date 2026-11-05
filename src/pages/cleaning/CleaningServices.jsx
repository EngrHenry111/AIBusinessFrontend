import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine, RiLoader4Line, RiSaveLine, RiListSettingsLine } from 'react-icons/ri';
import { cleaningService } from '../../services';
import { errText } from '../services/svc';
import '../services/svc.css';
import './Cleaning.css';

let k = 0;
const key = () => { k += 1; return k; };

export default function CleaningServices() {
  const [services, setServices] = useState(null);
  const [extras, setExtras] = useState([]);
  const [transportFee, setTransportFee] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apply = (d) => {
    setServices(d.services.map((s) => ({ ...s, key: key(), checklistText: s.checklist.join('\n') })));
    setExtras(d.extras.map((e) => ({ ...e, key: key() })));
    setTransportFee(d.transportFee || 0);
  };
  useEffect(() => { cleaningService.settings().then(({ data }) => apply(data.data)).catch((err) => setError(errText(err, 'Could not load services.'))); }, []);

  const touch = (fn) => { fn(); setDirty(true); };
  const setSvc = (kk, patch) => touch(() => setServices((p) => p.map((s) => (s.key === kk ? { ...s, ...patch } : s))));
  const setExtra = (kk, patch) => touch(() => setExtras((p) => p.map((e) => (e.key === kk ? { ...e, ...patch } : e))));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await cleaningService.saveSettings({
        services: services.map((s) => ({ ...s, checklist: s.checklistText.split('\n').map((t) => t.trim()).filter(Boolean) })),
        extras: extras.filter((e) => e.name.trim()),
        transportFee: Number(transportFee) || 0,
      });
      apply(data.data);
      setDirty(false);
      toast.success('Saved');
    } catch (err) { toast.error(errText(err, 'Could not save.')); } finally { setBusy(false); }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p></div></div>;
  if (!services) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div></div>;

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/cleaning" className="svc-back"><RiArrowLeftLine /> Schedule</Link>
        <div className="svc-head">
          <div><h1><RiListSettingsLine /> Services & prices</h1><p>Price = base + per bedroom + per bathroom + extras + transport. The checklist is what the team ticks off on site.</p></div>
          <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? <RiLoader4Line className="spin" /> : <RiSaveLine />} Save changes</button>
        </div>
      </div>

      <div className="cl-svc-grid">
        {services.map((s) => (
          <div key={s.key} className={`svc-card ${s.active ? '' : 'cl-off'}`}>
            <div className="svc-row">
              <input className="svc-input cl-svc-name" value={s.name} onChange={(e) => setSvc(s.key, { name: e.target.value })} aria-label="Service name" />
              <button className="ld-remove" onClick={() => { if (services.length > 1) touch(() => setServices((p) => p.filter((x) => x.key !== s.key))); }} aria-label={`Remove ${s.name}`}><RiDeleteBinLine /></button>
            </div>
            <input className="svc-input" value={s.description} placeholder="Short description" onChange={(e) => setSvc(s.key, { description: e.target.value })} />
            <div className="svc-grid2 svc-form">
              <label className="svc-field">Base price<input type="number" min="0" value={s.basePrice} onChange={(e) => setSvc(s.key, { basePrice: e.target.value })} /></label>
              <label className="svc-field">Hours<input type="number" min="0.5" step="0.5" value={s.hours} onChange={(e) => setSvc(s.key, { hours: e.target.value })} /></label>
              <label className="svc-field">Per bedroom<input type="number" min="0" value={s.perBedroom} onChange={(e) => setSvc(s.key, { perBedroom: e.target.value })} /></label>
              <label className="svc-field">Per bathroom<input type="number" min="0" value={s.perBathroom} onChange={(e) => setSvc(s.key, { perBathroom: e.target.value })} /></label>
            </div>
            <label className="svc-field svc-form">Checklist <small>one task per line</small>
              <textarea rows={6} value={s.checklistText} onChange={(e) => setSvc(s.key, { checklistText: e.target.value })} />
            </label>
            <label className="svc-check"><input type="checkbox" checked={s.active} onChange={(e) => setSvc(s.key, { active: e.target.checked })} /> Offered</label>
          </div>
        ))}
        <button className="cl-add-svc" onClick={() => touch(() => setServices((p) => [...p, { key: key(), name: 'New service', description: '', basePrice: 0, perBedroom: 0, perBathroom: 0, hours: 3, checklistText: '', active: true }]))}>
          <RiAddLine /> Add a service
        </button>
      </div>

      <div className="svc-card">
        <h3>Extras</h3>
        {extras.map((e) => (
          <div key={e.key} className="cl-extra-row">
            <input className="svc-input" value={e.name} placeholder="e.g. Inside fridge" onChange={(ev) => setExtra(e.key, { name: ev.target.value })} aria-label="Extra name" />
            <input className="svc-input cl-small" type="number" min="0" value={e.price} onChange={(ev) => setExtra(e.key, { price: ev.target.value })} aria-label={`${e.name} price`} />
            <button className="ld-remove" onClick={() => touch(() => setExtras((p) => p.filter((x) => x.key !== e.key)))} aria-label={`Remove ${e.name}`}><RiDeleteBinLine /></button>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => touch(() => setExtras((p) => [...p, { key: key(), name: '', price: 0 }]))}><RiAddLine /> Add extra</button>
      </div>

      <div className="svc-card">
        <h3>Transport</h3>
        <label className="svc-row"><span>Added to every job</span><input className="svc-input cl-small" type="number" min="0" value={transportFee} onChange={(e) => touch(() => setTransportFee(e.target.value))} /></label>
      </div>
    </div>
  );
}
