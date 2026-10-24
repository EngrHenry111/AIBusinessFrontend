import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiHotelBedLine, RiAddLine, RiLoader4Line, RiSettings3Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { Modal, Field, AdmitModal } from './HospitalForms';
import { WARD_TYPES, BED_STATUS, money, fmtDate, fullName, sexAge, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

export default function Wards() {
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [tab, setTab] = useState('beds');
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [admStatus, setAdmStatus] = useState('admitted');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const [w, a] = await Promise.all([hospitalService.getWards(), hospitalService.getAdmissions({ status: admStatus })]);
      setWards(w.data.data); setAdmissions(a.data.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [admStatus]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['wards']);

  async function setBed(ward, bed, status) {
    try { await hospitalService.updateBed(ward._id, bed._id, { status }); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  const total = wards.reduce((s, w) => s + w.beds.length, 0);
  const occupied = wards.reduce((s, w) => s + w.occupied, 0);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiHotelBedLine style={{ verticalAlign: '-3px' }} /> Wards</h1>
          <p>{occupied} of {total} beds occupied. <span className="sc-live">Live</span></p>
        </div>
        <div className="sc-actions">
          {can.admin(me) && <button className="btn btn-secondary" onClick={() => setModal('ward')}><RiAddLine /> Add ward</button>}
          {can.consult(me) && <button className="btn btn-primary" onClick={() => setModal('admit')}><RiHotelBedLine /> Admit patient</button>}
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'beds'} className={`sc-tab ${tab === 'beds' ? 'active' : ''}`} onClick={() => setTab('beds')}>Bed board</button>
        <button role="tab" aria-selected={tab === 'list'} className={`sc-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Admissions<span className="sc-tab-count">{admStatus === 'admitted' ? admissions.length : ''}</span></button>
      </div>

      {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : tab === 'beds' ? (
        wards.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon"><RiHotelBedLine /></div><h3>No wards yet</h3><p>Add each ward with its number of beds and daily bed charge.</p>
            {can.admin(me) && <button className="btn btn-primary" onClick={() => setModal('ward')}>Add ward</button>}</div></div>
        ) : wards.map((w) => (
          <div key={w._id} className="card card-pad" style={{ marginBottom: 16, opacity: w.active === false ? 0.6 : 1 }}>
            <div className="sc-card-title">
              <span>{w.name} · {WARD_TYPES[w.type]} · {w.occupied}/{w.beds.length} occupied · {money(w.dailyRate)}/day{w.active === false ? ' · closed' : ''}</span>
              {can.admin(me) && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ ward: w })}><RiSettings3Line /> Edit</button>}
            </div>
            <div className="hp-beds">
              {w.beds.map((b) => (
                <button key={b._id} type="button" className={`hp-bed ${b.status}`}
                  onClick={() => (b.admission ? navigate(`/hospital/admissions/${b.admission._id}`) : null)}
                  style={b.admission ? undefined : { cursor: 'default' }}>
                  <span className="label">{b.label}</span>
                  {b.admission ? (
                    <>
                      <span className="sc-strong" style={{ fontSize: 13 }}>{fullName(b.admission.patientId)}</span>
                      <span className="cell-sub">{sexAge(b.admission.patientId)} · since {fmtDate(b.admission.admittedAt)}</span>
                    </>
                  ) : (
                    <>
                      <span className={`badge badge-${BED_STATUS[b.status].badge}`} style={{ alignSelf: 'flex-start' }}>{BED_STATUS[b.status].label}</span>
                      {can.ward(me) && b.status !== 'available' && <span role="button" tabIndex={0} className="cell-sub" style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setBed(w, b, 'available')} onKeyDown={(e) => e.key === 'Enter' && setBed(w, b, 'available')}>Mark ready</span>}
                      {can.ward(me) && b.status === 'available' && <span role="button" tabIndex={0} className="cell-sub" style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setBed(w, b, 'maintenance')} onKeyDown={(e) => e.key === 'Enter' && setBed(w, b, 'maintenance')}>Take out of use</span>}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="card">
          <div className="sc-filters">
            <select className="form-input form-select" aria-label="Show" value={admStatus} onChange={(e) => setAdmStatus(e.target.value)}>
              <option value="admitted">On the ward now</option><option value="discharged">Discharged</option><option value="all">All</option>
            </select>
          </div>
          {admissions.length === 0 ? <p className="cell-sub card-pad">No admissions.</p> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Patient</th><th>Ward / bed</th><th>Admitted</th><th>Diagnosis</th><th>Doctor</th><th className="num">Days · bed charge</th></tr></thead>
              <tbody>{admissions.map((a) => (
                <tr key={a._id} className="sc-row" onClick={() => navigate(`/hospital/admissions/${a._id}`)}>
                  <td><span className="sc-strong">{fullName(a.patientId)}</span><span className="cell-sub">{a.patientId?.hospitalNumber} · {a.admissionNumber}</span></td>
                  <td>{a.wardId?.name}<span className="cell-sub">{a.bedLabel}</span></td>
                  <td>{fmtDate(a.admittedAt)}{a.status === 'discharged' && <span className="cell-sub">Out {fmtDate(a.discharge?.at)}</span>}</td>
                  <td>{a.diagnosis || '—'}</td>
                  <td>{a.doctorId?.name || '—'}</td>
                  <td className="num">{a.estimate.days} · {money(a.estimate.amount)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {(modal === 'ward' || modal?.ward) && <WardModal ward={modal?.ward} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'admit' && <AdmitModal onClose={() => setModal(null)} onDone={(a) => navigate(`/hospital/admissions/${a._id}`)} />}
    </div>
  );
}

function WardModal({ ward, onClose, onDone }) {
  const [form, setForm] = useState({ name: ward?.name || '', type: ward?.type || 'general', dailyRate: ward?.dailyRate ?? '', bedCount: 10, bedPrefix: 'Bed ', addBeds: '', active: ward?.active ?? true });
  const [remove, setRemove] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (ward) await hospitalService.updateWard(ward._id, { name: form.name, type: form.type, dailyRate: Number(form.dailyRate) || 0, active: form.active, addBeds: Number(form.addBeds) || 0, bedPrefix: form.bedPrefix, removeBedIds: [...remove] });
      else await hospitalService.createWard({ ...form, dailyRate: Number(form.dailyRate) || 0 });
      toast.success('Ward saved');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  async function del() {
    if (!window.confirm(`Remove ${ward.name}?`)) return;
    try { await hospitalService.deleteWard(ward._id); toast.success('Ward removed'); onDone(); } catch (err) { toast.error(errMsg(err)); }
  }
  return (
    <Modal title={ward ? `Edit ${ward.name}` : 'Add ward'} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<>{ward && <button type="button" className="btn btn-ghost" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={del}>Remove ward</button>}<button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save</button></>}>
      <div className="form-grid-2">
        <Field label="Ward name *" span><input className="form-input" required placeholder="Male Medical Ward" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type">
          <select className="form-input form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(WARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Bed charge per day (₦)"><input className="form-input" type="number" min="0" value={form.dailyRate} onChange={(e) => set('dailyRate', e.target.value)} /></Field>
        {ward ? (
          <>
            <Field label="Add beds"><input className="form-input" type="number" min="0" value={form.addBeds} onChange={(e) => set('addBeds', e.target.value)} /></Field>
            <Field label="Bed name starts with"><input className="form-input" value={form.bedPrefix} onChange={(e) => set('bedPrefix', e.target.value)} /></Field>
            <label className="sc-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Open for admissions</label>
            <Field label="Remove free beds" span>
              <div className="sc-chips">
                {ward.beds.filter((b) => b.status !== 'occupied').map((b) => (
                  <label key={b._id} className="sc-check"><input type="checkbox" checked={remove.has(b._id)} onChange={() => setRemove((r) => { const n = new Set(r); if (n.has(b._id)) n.delete(b._id); else n.add(b._id); return n; })} /> {b.label}</label>
                ))}
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label="Number of beds"><input className="form-input" type="number" min="0" max="200" value={form.bedCount} onChange={(e) => set('bedCount', e.target.value)} /></Field>
            <Field label="Bed name starts with" hint="(Bed 1, Bed 2…)"><input className="form-input" value={form.bedPrefix} onChange={(e) => set('bedPrefix', e.target.value)} /></Field>
          </>
        )}
      </div>
    </Modal>
  );
}
