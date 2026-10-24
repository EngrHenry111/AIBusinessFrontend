import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiSettings3Line, RiLoader4Line, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalMe from './useHospitalMe';
import { Field } from './HospitalForms';
import { CHARGE_CATEGORIES, money, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const TABS = [['details', 'Hospital details'], ['services', 'Prices'], ['hmos', 'HMOs'], ['clinics', 'Clinics'], ['rules', 'Payment rules']];
const SERVICE_CATS = ['registration', 'consultation', 'nursing', 'procedure', 'other'];

export default function HospitalSettings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'details';
  const me = useHospitalMe();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { hospitalService.getSettings().then(({ data }) => setForm(data.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!form) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setRow = (k, i, sub, v) => set(k, form[k].map((r, j) => (j === i ? { ...r, [sub]: v } : r)));
  const readOnly = !me?.manager;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await hospitalService.updateSettings({
        ...form,
        services: form.services.map((s) => ({ ...s, price: Number(s.price) || 0 })),
        hmos: form.hmos.map((h) => ({ ...h, coverPercent: Number(h.coverPercent) || 0 })),
      });
      setForm(data.data);
      toast.success('Settings saved');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  }

  return (
    <form className="school-page fade-in" onSubmit={save}>
      <div className="page-header page-header-row">
        <div>
          <h1><RiSettings3Line style={{ verticalAlign: '-3px' }} /> Hospital settings</h1>
          <p>{readOnly ? 'Only the owner or a manager can change these.' : 'Your details, price list, HMOs, clinics and payment rules.'}</p>
        </div>
        {!readOnly && <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>}
      </div>
      <div className="sc-tabs" role="tablist">
        {TABS.map(([k, l]) => <button type="button" key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setParams(k === 'details' ? {} : { tab: k })}>{l}</button>)}
      </div>

      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
        {tab === 'details' && (
          <div className="card card-pad" style={{ maxWidth: 760 }}>
            <div className="sc-card-title">Printed on receipts, invoices, lab reports and discharge summaries</div>
            <div className="form-grid-2">
              <Field label="Hospital name" span><input className="form-input" value={form.hospitalName || ''} onChange={(e) => set('hospitalName', e.target.value)} /></Field>
              <Field label="Address" span><input className="form-input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><input className="form-input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Logo URL" span><input className="form-input" placeholder="https://…" value={form.logo || ''} onChange={(e) => set('logo', e.target.value)} /></Field>
              <Field label="Hospital number prefix" hint={`(e.g. ${form.patientNumberPrefix || 'PT'}/${new Date().getFullYear()}/00001)`}><input className="form-input" maxLength={12} value={form.patientNumberPrefix || ''} onChange={(e) => set('patientNumberPrefix', e.target.value.toUpperCase())} /></Field>
            </div>
          </div>
        )}

        {tab === 'services' && (
          <div className="card card-pad">
            <div className="sc-card-title"><span>Price list</span><span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Consultation fees are chosen at check-in. Lab tests are priced on the lab's test menu, and drugs in pharmacy stock.</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.services.map((s, i) => (
                <div key={s._id || i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" aria-label="Service" value={s.name} onChange={(e) => setRow('services', i, 'name', e.target.value)} />
                  <select className="form-input form-select" aria-label="Type" value={s.category} onChange={(e) => setRow('services', i, 'category', e.target.value)}>
                    {SERVICE_CATS.map((c) => <option key={c} value={c}>{CHARGE_CATEGORIES[c]}</option>)}
                  </select>
                  <input className="form-input" aria-label="Price" type="number" min="0" value={s.price} onChange={(e) => setRow('services', i, 'price', e.target.value)} />
                  <label className="sc-check"><input type="checkbox" checked={s.active !== false} onChange={(e) => setRow('services', i, 'active', e.target.checked)} /> On</label>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => set('services', form.services.filter((_, j) => j !== i))}><RiDeleteBinLine /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('services', [...form.services, { name: '', category: 'procedure', price: 0, active: true }])}><RiAddLine /> Add service</button>
            </div>
            <label className="sc-check" style={{ marginTop: 16 }}><input type="checkbox" checked={form.chargeRegistration} onChange={(e) => set('chargeRegistration', e.target.checked)} /> Charge the registration / card fee when a new patient is registered{(() => { const r = form.services.find((s) => s.category === 'registration' && s.active !== false); return r ? ` (${money(r.price)})` : ''; })()}</label>
          </div>
        )}

        {tab === 'hmos' && (
          <div className="card card-pad" style={{ maxWidth: 860 }}>
            <div className="sc-card-title"><span>HMOs you accept</span><span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Cover % is the share of each bill the HMO pays. The patient pays the rest.</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.hmos.length === 0 && <p className="cell-sub">No HMOs yet. Add the ones your patients use (Hygeia, AXA Mansard, Reliance, NHIA…).</p>}
              {form.hmos.map((h, i) => (
                <div key={h._id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1.2fr 1.4fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" aria-label="HMO name" placeholder="HMO name" value={h.name} onChange={(e) => setRow('hmos', i, 'name', e.target.value)} />
                  <input className="form-input" aria-label="Cover percent" type="number" min="0" max="100" value={h.coverPercent} onChange={(e) => setRow('hmos', i, 'coverPercent', e.target.value)} />
                  <input className="form-input" aria-label="Phone" placeholder="Phone" value={h.phone || ''} onChange={(e) => setRow('hmos', i, 'phone', e.target.value)} />
                  <input className="form-input" aria-label="Claims email" placeholder="Claims email" value={h.email || ''} onChange={(e) => setRow('hmos', i, 'email', e.target.value)} />
                  <label className="sc-check"><input type="checkbox" checked={h.active !== false} onChange={(e) => setRow('hmos', i, 'active', e.target.checked)} /> On</label>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => set('hmos', form.hmos.filter((_, j) => j !== i))}><RiDeleteBinLine /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('hmos', [...form.hmos, { name: '', coverPercent: 100, active: true }])}><RiAddLine /> Add HMO</button>
            </div>
          </div>
        )}

        {tab === 'clinics' && (
          <div className="card card-pad" style={{ maxWidth: 620 }}>
            <div className="sc-card-title">Clinics / departments patients check in to</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.departments.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" aria-label="Clinic" value={d} onChange={(e) => set('departments', form.departments.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => set('departments', form.departments.filter((_, j) => j !== i))}><RiDeleteBinLine /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('departments', [...form.departments, ''])}><RiAddLine /> Add clinic</button>
            </div>
          </div>
        )}

        {tab === 'rules' && (
          <div className="card card-pad" style={{ maxWidth: 680 }}>
            <div className="sc-card-title">Pay before service</div>
            <label className="sc-check"><input type="checkbox" checked={form.payBeforeLab} onChange={(e) => set('payBeforeLab', e.target.checked)} /> The lab takes a sample only after the patient has paid</label>
            <label className="sc-check" style={{ marginTop: 8 }}><input type="checkbox" checked={form.payBeforePharmacy} onChange={(e) => set('payBeforePharmacy', e.target.checked)} /> The pharmacy dispenses only after the patient has paid</label>
            <p className="cell-sub">These rules don't apply to admitted patients: they settle their bill at discharge. HMO patients only need to pay their own share.</p>
          </div>
        )}
      </fieldset>
    </form>
  );
}
