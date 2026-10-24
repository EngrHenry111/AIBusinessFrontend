import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiTestTubeLine, RiSearchLine, RiAddLine, RiLoader4Line, RiDeleteBinLine, RiDownload2Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { Modal, Field, PatientPicker, LabOrderModal } from './HospitalForms';
import { LAB_STATUS, money, fmtDateTime, fullName, sexAge, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const TABS = [['pending', 'To do'], ['completed', 'Results ready'], ['all', 'All requests'], ['tests', 'Test menu']];

export default function Lab() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'pending';
  const me = useHospitalMe();
  const [counts, setCounts] = useState({});
  const setTab = (t) => setParams(t === 'pending' ? {} : { tab: t });
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiTestTubeLine style={{ verticalAlign: '-3px' }} /> Laboratory</h1>
          <p>Requests from doctors and walk-ins. Collect the sample, enter results, and the doctor sees them straight away. <span className="sc-live">Live</span></p>
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        {TABS.filter(([k]) => k !== 'tests' || can.lab(me)).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {l}{k === 'pending' && counts.pending ? <span className="sc-tab-count">{counts.pending}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'tests' ? <TestMenu /> : <Requests status={tab} onCounts={setCounts} />}
    </div>
  );
}

function Requests({ status, onCounts }) {
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [walkIn, setWalkIn] = useState(null); // null | 'pick' | patient

  const load = useCallback(async () => {
    try {
      const { data } = await hospitalService.getLabRequests({ status, search: search || undefined });
      setRows(data.data);
      onCounts({ pending: (data.counts.requested || 0) + (data.counts.collected || 0) });
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [status, search, onCounts]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useHospitalLive(load, ['lab', 'payment']);

  async function collect(r) {
    try { await hospitalService.collectSample(r._id); toast.success('Sample collected'); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input placeholder="Search patient, hospital no. or lab no.…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {can.orderLab(me) && <button className="btn btn-primary" onClick={() => setWalkIn('pick')}><RiAddLine /> Walk-in request</button>}
      </div>
      {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><RiTestTubeLine /></div><h3>{status === 'pending' ? 'Nothing waiting' : 'No requests'}</h3><p>Doctors' lab orders appear here automatically.</p></div>
      ) : (
        <div className="table-wrapper"><table className="table">
          <thead><tr><th>Requested</th><th>Patient</th><th>Tests</th><th>By</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r._id} className="sc-row" onClick={() => navigate(`/hospital/lab/${r._id}`)}>
              <td>{fmtDateTime(r.createdAt)}<span className="cell-sub">{r.labNumber}</span></td>
              <td><span className="sc-strong">{fullName(r.patientId)}</span><span className="cell-sub">{r.patientId?.hospitalNumber} · {sexAge(r.patientId)}</span></td>
              <td>{r.tests.map((t) => t.name).join(', ')}{r.priority === 'urgent' && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Urgent</span>}</td>
              <td>{r.source === 'walk_in' ? 'Walk-in' : r.requestedBy?.name || '—'}</td>
              <td><span className={`badge badge-${LAB_STATUS[r.status]?.badge}`}>{LAB_STATUS[r.status]?.label}</span>{r.verifiedAt && <span className="cell-sub">Verified</span>}</td>
              <td className="num" onClick={(e) => e.stopPropagation()}>
                {r.status === 'requested' && can.lab(me) && <button className="btn btn-secondary btn-sm" onClick={() => collect(r)}>Collect sample</button>}
                {r.status === 'collected' && can.lab(me) && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/hospital/lab/${r._id}`)}>Enter results</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {walkIn === 'pick' && (
        <Modal title="Walk-in lab request" size="sc-modal-sm" onClose={() => setWalkIn(null)}>
          <p className="cell-sub" style={{ marginTop: 0 }}>Find the patient (register them first if they are new).</p>
          <PatientPicker onPick={(p) => setWalkIn(p)} />
        </Modal>
      )}
      {walkIn && walkIn !== 'pick' && <LabOrderModal patientId={walkIn._id} onClose={() => setWalkIn(null)} onDone={(r) => { setWalkIn(null); navigate(`/hospital/lab/${r._id}`); }} />}
    </div>
  );
}

function TestMenu() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    try { const { data } = await hospitalService.getLabTests({ active: 'all' }); setTests(data.data); } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load, ['lab-tests']);

  async function seed() {
    try {
      const { data } = await hospitalService.seedLabTests();
      toast.success(data.data.added ? `${data.data.added} common tests added. Check the prices.` : 'All common tests are already on your menu');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  }
  const shown = tests.filter((t) => !search || `${t.name} ${t.code} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input placeholder="Search tests…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <button className="btn btn-secondary" onClick={seed}><RiDownload2Line /> Add common tests</button>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><RiAddLine /> New test</button>
      </div>
      {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : tests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiTestTubeLine /></div><h3>No tests yet</h3>
          <p>Start with about 28 common tests (MP, FBC, Widal, E/U/Cr, LFT…) with normal ranges, then set your prices.</p>
          <button className="btn btn-primary" onClick={seed}>Add common tests</button>
        </div>
      ) : (
        <div className="table-wrapper"><table className="table">
          <thead><tr><th>Test</th><th>Category</th><th>Sample</th><th>Result lines</th><th className="num">Price</th></tr></thead>
          <tbody>{shown.map((t) => (
            <tr key={t._id} className="sc-row" onClick={() => setEditing(t)} style={t.active ? undefined : { opacity: 0.55 }}>
              <td><span className="sc-strong">{t.name}</span><span className="cell-sub">{t.code}{!t.active ? ' · not offered' : ''}</span></td>
              <td>{t.category}</td><td>{t.sampleType || '—'}</td><td>{t.parameters.length}</td><td className="num">{money(t.price)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {editing && <TestModal test={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TestModal({ test, onClose, onDone }) {
  const [form, setForm] = useState({
    name: test?.name || '', code: test?.code || '', category: test?.category || 'Haematology', sampleType: test?.sampleType || '',
    price: test?.price ?? '', turnaroundHours: test?.turnaroundHours ?? '', active: test?.active ?? true,
    parameters: test?.parameters?.length ? test.parameters.map((x) => ({ ...x })) : [{ name: '', unit: '', refLow: '', refHigh: '', refText: '' }],
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setParam = (i, k, v) => set('parameters', form.parameters.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, price: Number(form.price) || 0, turnaroundHours: form.turnaroundHours === '' ? undefined : Number(form.turnaroundHours) };
      if (test) await hospitalService.updateLabTest(test._id, payload); else await hospitalService.createLabTest(payload);
      toast.success('Test saved');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Remove ${test.name} from the menu?`)) return;
    try { await hospitalService.deleteLabTest(test._id); toast.success('Removed'); onDone(); } catch (err) { toast.error(errMsg(err)); }
  }
  return (
    <Modal title={test ? `Edit ${test.name}` : 'New lab test'} onClose={onClose} onSubmit={submit}
      footer={<>{test && <button type="button" className="btn btn-ghost" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={remove}>Remove</button>}<button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save</button></>}>
      <div className="form-grid-3">
        <Field label="Name *" span><input className="form-input" required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Code"><input className="form-input" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} /></Field>
        <Field label="Category">
          <input className="form-input" list="hp-lab-cats" value={form.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="hp-lab-cats">{['Haematology', 'Chemistry', 'Microbiology', 'Parasitology', 'Serology', 'Radiology', 'Histology'].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Sample"><input className="form-input" placeholder="Blood (EDTA)" value={form.sampleType} onChange={(e) => set('sampleType', e.target.value)} /></Field>
        <Field label="Price (₦)"><input className="form-input" type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Ready in" hint="(hours)"><input className="form-input" type="number" min="0" value={form.turnaroundHours} onChange={(e) => set('turnaroundHours', e.target.value)} /></Field>
        <label className="sc-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Offered</label>
      </div>
      <div className="sc-card-title" style={{ marginTop: 14 }}>Result lines <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Low/high ranges flag results automatically.</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {form.parameters.map((x, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr auto', gap: 6 }}>
            <input className="form-input" aria-label="Line name" placeholder="Haemoglobin" value={x.name} onChange={(e) => setParam(i, 'name', e.target.value)} />
            <input className="form-input" aria-label="Unit" placeholder="g/dL" value={x.unit || ''} onChange={(e) => setParam(i, 'unit', e.target.value)} />
            <input className="form-input" aria-label="Low" placeholder="Low" type="number" step="any" value={x.refLow ?? ''} onChange={(e) => setParam(i, 'refLow', e.target.value)} />
            <input className="form-input" aria-label="High" placeholder="High" type="number" step="any" value={x.refHigh ?? ''} onChange={(e) => setParam(i, 'refHigh', e.target.value)} />
            <input className="form-input" aria-label="Normal (text)" placeholder="or: Negative" value={x.refText || ''} onChange={(e) => setParam(i, 'refText', e.target.value)} />
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove line" onClick={() => set('parameters', form.parameters.filter((_, j) => j !== i))}><RiDeleteBinLine /></button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('parameters', [...form.parameters, { name: '', unit: '', refLow: '', refHigh: '', refText: '' }])}><RiAddLine /> Add line</button>
      </div>
    </Modal>
  );
}
