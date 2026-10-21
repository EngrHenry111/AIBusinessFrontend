import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiBuilding2Line, RiAddLine, RiEditLine, RiDeleteBinLine, RiCloseLine, RiLoader4Line, RiMapPinLine, RiUserStarLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, LINE_LABELS, LINE_COLORS, FUEL_LABELS } from './groupUtils';
import './Group.css';

const DEFAULT_DEPTS = {
  filling_station: ['Forecourt (Pumps)', 'Lubricants & Shop', 'Gas (LPG)'],
  building_materials: ['Cement & Blocks', 'Iron Rods & Steel', 'Roofing & Finishing', 'Plumbing & Electrical'],
  general: ['Sales'],
};
const DEFAULT_SHIFTS = [
  { name: 'Morning', start: '06:00', end: '12:00' },
  { name: 'Afternoon', start: '12:00', end: '18:00' },
  { name: 'Evening', start: '18:00', end: '22:00' },
];
const makeNozzles = (pumps, perPump, dieselPumps) => Array.from({ length: pumps }).flatMap((_, pi) => Array.from({ length: perPump }).map((__, ni) => ({
  code: `P${pi + 1}-N${ni + 1}`, pump: `Pump ${pi + 1}`, product: pi >= pumps - dieselPumps ? 'AGO' : 'PMS',
})));
const blank = () => ({
  name: '', code: '', businessLine: 'filling_station', address: '', city: '', state: '',
  dailySalesTarget: '', fuelPrices: { PMS: '', AGO: '', DPK: '' }, managerId: '', staff: [],
  departments: DEFAULT_DEPTS.filling_station.map((name) => ({ name, headId: '' })), status: 'active',
  shifts: DEFAULT_SHIFTS.map((x) => ({ ...x })), nozzles: makeNozzles(4, 2, 1), dutyStaff: [],
});
const refId = (v) => (v && typeof v === 'object' ? v._id : v || '');

function BranchModal({ initial, members, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [gen, setGen] = useState({ pumps: 4, perPump: 2, diesel: 1 });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  function changeLine(line) {
    // Swap in that line's standard departments only if the user hasn't customised them.
    const untouched = f.departments.every((d, i) => d.name === (DEFAULT_DEPTS[f.businessLine] || [])[i] && !d.headId);
    setF((x) => ({ ...x, businessLine: line, departments: untouched ? DEFAULT_DEPTS[line].map((name) => ({ name, headId: '' })) : x.departments }));
  }

  async function save() {
    if (!f.name.trim()) { toast.error('Give the branch a name'); return; }
    setSaving(true);
    const payload = {
      ...f,
      dailySalesTarget: Number(f.dailySalesTarget) || 0,
      fuelPrices: Object.fromEntries(Object.entries(f.fuelPrices || {}).map(([k, v]) => [k, Number(v) || 0])),
      managerId: f.managerId || null,
      departments: f.departments.filter((d) => d.name.trim()).map((d) => ({ ...(d._id ? { _id: d._id } : {}), name: d.name.trim(), headId: d.headId || null })),
    };
    try {
      if (f._id) await groupService.updateBranch(f._id, payload);
      else await groupService.createBranch(payload);
      toast.success(f._id ? 'Branch updated' : 'Branch added');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the branch');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{f._id ? 'Edit branch' : 'Add branch'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <div className="grp-form-grid">
            <div className="form-group"><label className="form-label">Branch name</label><input className="form-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mega Fuel – Lekki" /></div>
            <div className="form-group"><label className="form-label">Short code</label><input className="form-input" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="MFLK" maxLength={12} /></div>
            <div className="form-group">
              <label className="form-label">Business type</label>
              <select className="form-select" value={f.businessLine} onChange={(e) => changeLine(e.target.value)}>
                {Object.entries(LINE_LABELS).map(([k, l]) => <option key={k} value={k}>{l.replace(/s$/, '')}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">City</label><input className="form-input" value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">State</label><input className="form-input" value={f.state} onChange={(e) => set('state', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Daily sales target (₦)</label><input type="number" className="form-input" value={f.dailySalesTarget} onChange={(e) => set('dailySalesTarget', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>

          {f.businessLine === 'filling_station' && (
            <div className="grp-form-grid">
              {['PMS', 'AGO', 'DPK'].map((p) => (
                <div className="form-group" key={p}><label className="form-label">{FUEL_LABELS[p]} price / litre (₦)</label>
                  <input type="number" className="form-input" value={f.fuelPrices?.[p] ?? ''} onChange={(e) => set('fuelPrices', { ...f.fuelPrices, [p]: e.target.value })} /></div>
              ))}
            </div>
          )}

          <label className="form-label">Duty roster <span className="muted">(staff who sell but don't log in)</span></label>
          {f.dutyStaff.map((d, i) => (
            <div className="grp-dept-row" key={d._id || `new-${i}`} style={{ gridTemplateColumns: '1.3fr 1fr 1fr auto auto', opacity: d.active === false ? 0.55 : 1 }}>
              <input className="form-input" value={d.name} placeholder="Full name" onChange={(e) => set('dutyStaff', f.dutyStaff.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
              <input className="form-input" value={d.role} placeholder={f.businessLine === 'filling_station' ? 'Pump attendant' : 'Sales rep'} onChange={(e) => set('dutyStaff', f.dutyStaff.map((y, j) => (j === i ? { ...y, role: e.target.value } : y)))} />
              <input className="form-input" value={d.phone} placeholder="Phone (optional)" onChange={(e) => set('dutyStaff', f.dutyStaff.map((y, j) => (j === i ? { ...y, phone: e.target.value } : y)))} />
              <label className="grp-row" style={{ gap: 4, fontSize: 12, flexWrap: 'nowrap' }} title="Untick when they leave. Their name stays on past reports.">
                <input type="checkbox" checked={d.active !== false} onChange={(e) => set('dutyStaff', f.dutyStaff.map((y, j) => (j === i ? { ...y, active: e.target.checked } : y)))} /> Active
              </label>
              <button className="btn btn-ghost btn-icon" onClick={() => set('dutyStaff', f.dutyStaff.filter((_, j) => j !== i))} aria-label="Remove from roster"><RiDeleteBinLine /></button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => set('dutyStaff', [...f.dutyStaff, { name: '', role: '', phone: '', active: true }])}><RiAddLine /> Add staff</button>
          <div style={{ height: 16 }} />

          <label className="form-label">Shifts</label>
          {f.shifts.map((x, i) => (
            <div className="grp-dept-row" key={i} style={{ gridTemplateColumns: '1.2fr 1fr 1fr auto' }}>
              <input className="form-input" value={x.name} placeholder="Shift name" onChange={(e) => set('shifts', f.shifts.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
              <input type="time" className="form-input" value={x.start} onChange={(e) => set('shifts', f.shifts.map((y, j) => (j === i ? { ...y, start: e.target.value } : y)))} />
              <input type="time" className="form-input" value={x.end} onChange={(e) => set('shifts', f.shifts.map((y, j) => (j === i ? { ...y, end: e.target.value } : y)))} />
              <button className="btn btn-ghost btn-icon" onClick={() => set('shifts', f.shifts.filter((_, j) => j !== i))} aria-label="Remove shift"><RiDeleteBinLine /></button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => set('shifts', [...f.shifts, { name: 'Night', start: '22:00', end: '06:00' }])}><RiAddLine /> Add shift</button>
          <div style={{ height: 16 }} />

          {f.businessLine === 'filling_station' && (
            <>
              <label className="form-label" style={{ display: 'block' }}>Pumps & nozzles ({f.nozzles.length})</label>
              <div className="grp-row" style={{ marginBottom: 8, fontSize: 13 }}>
                <input type="number" min={1} max={40} className="form-input" style={{ width: 70 }} value={gen.pumps} onChange={(e) => setGen({ ...gen, pumps: Number(e.target.value) || 1 })} /> pumps ×
                <input type="number" min={1} max={8} className="form-input" style={{ width: 60 }} value={gen.perPump} onChange={(e) => setGen({ ...gen, perPump: Number(e.target.value) || 1 })} /> nozzles, last
                <input type="number" min={0} max={40} className="form-input" style={{ width: 60 }} value={gen.diesel} onChange={(e) => setGen({ ...gen, diesel: Number(e.target.value) || 0 })} /> diesel
                <button className="btn btn-secondary btn-sm" onClick={() => set('nozzles', makeNozzles(gen.pumps, gen.perPump, gen.diesel))}>Generate</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {f.nozzles.map((n, i) => (
                  <div className="grp-dept-row" key={i} style={{ gridTemplateColumns: '0.8fr 1fr 1.2fr auto' }}>
                    <input className="form-input grp-mono" value={n.code} onChange={(e) => set('nozzles', f.nozzles.map((y, j) => (j === i ? { ...y, code: e.target.value.toUpperCase() } : y)))} />
                    <input className="form-input" value={n.pump} onChange={(e) => set('nozzles', f.nozzles.map((y, j) => (j === i ? { ...y, pump: e.target.value } : y)))} />
                    <select className="form-select" value={n.product} onChange={(e) => set('nozzles', f.nozzles.map((y, j) => (j === i ? { ...y, product: e.target.value } : y)))}>
                      {Object.entries(FUEL_LABELS).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-icon" onClick={() => set('nozzles', f.nozzles.filter((_, j) => j !== i))} aria-label="Remove nozzle"><RiDeleteBinLine /></button>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => set('nozzles', [...f.nozzles, { code: `P${f.nozzles.length + 1}-N1`, pump: `Pump ${f.nozzles.length + 1}`, product: 'PMS' }])}><RiAddLine /> Add nozzle</button>
              <div style={{ height: 16 }} />
            </>
          )}

          <div className="form-group">
            <label className="form-label">Branch manager (first approval)</label>
            <select className="form-select" value={f.managerId} onChange={(e) => set('managerId', e.target.value)}>
              <option value="">No manager. Reports go straight to the owner.</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name} · {m.email}</option>)}
            </select>
          </div>

          <label className="form-label">Departments & heads</label>
          {f.departments.map((d, i) => (
            <div className="grp-dept-row" key={d._id || i}>
              <input className="form-input" value={d.name} placeholder="Department name"
                onChange={(e) => set('departments', f.departments.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <select className="form-select" value={d.headId || ''}
                onChange={(e) => set('departments', f.departments.map((x, j) => (j === i ? { ...x, headId: e.target.value } : x)))}>
                <option value="">No head assigned</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              <button className="btn btn-ghost btn-icon" onClick={() => set('departments', f.departments.filter((_, j) => j !== i))} aria-label="Remove department"><RiDeleteBinLine /></button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => set('departments', [...f.departments, { name: '', headId: '' }])}><RiAddLine /> Add department</button>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Other staff who can file reports here</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {members.map((m) => (
                <label key={m._id} className="grp-row" style={{ gap: 8, fontSize: 13, flexWrap: 'nowrap' }}>
                  <input type="checkbox" checked={f.staff.includes(m._id)}
                    onChange={(e) => set('staff', e.target.checked ? [...f.staff, m._id] : f.staff.filter((s) => s !== m._id))} />
                  <span className="truncate">{m.name}</span>
                </label>
              ))}
              {!members.length && <span className="muted" style={{ fontSize: 13 }}>Invite people from the Team page first.</span>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <RiLoader4Line className="spin" /> : null} Save branch</button>
        </div>
      </div>
    </div>
  );
}

export default function Branches() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([groupService.getBranches(), groupService.members()])
      .then(([b, m]) => { setBranches(b.data.data || []); setMembers(m.data.data || []); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load branches'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function edit(b) {
    setEditing({
      ...blank(), ...b,
      managerId: refId(b.managerId),
      staff: (b.staff || []).map(refId),
      departments: (b.departments || []).map((d) => ({ _id: d._id, name: d.name, headId: refId(d.headId) })),
      fuelPrices: b.fuelPrices || { PMS: '', AGO: '', DPK: '' },
      shifts: b.shifts?.length ? b.shifts.map((x) => ({ name: x.name, start: x.start, end: x.end })) : DEFAULT_SHIFTS.map((x) => ({ ...x })),
      nozzles: (b.nozzles || []).map((n) => ({ code: n.code, pump: n.pump, product: n.product })),
      dutyStaff: (b.dutyStaff || []).map((d) => ({ _id: d._id, name: d.name, role: d.role || '', phone: d.phone || '', active: d.active !== false })),
      dailySalesTarget: b.dailySalesTarget || '',
    });
  }

  async function remove(b) {
    if (!window.confirm(`Remove ${b.name}? Branches with approved sales are deactivated instead of deleted.`)) return;
    try {
      const { data } = await groupService.deleteBranch(b._id);
      toast.success(data.message || 'Removed');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not remove the branch'); }
  }

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiBuilding2Line style={{ verticalAlign: '-3px' }} /> Branches & Departments</h1>
            <p className="muted">Every station and outlet in the group, who manages it, and which departments report daily.</p>
          </div>
          <div className="grp-row">
            <button className="btn btn-primary" onClick={() => setEditing(blank())}><RiAddLine /> Add branch</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>
      ) : !branches.length ? (
        <div className="card grp-empty-hero"><RiBuilding2Line style={{ fontSize: 40, color: 'var(--color-brand)' }} /><h2>No branches yet</h2><p>Add each filling station or outlet, give it a manager, and its departments can start filing daily reports.</p></div>
      ) : (
        <div className="grp-branches">
          {branches.map((b) => (
            <div key={b._id} className="card grp-branch" style={{ '--line-color': LINE_COLORS[b.businessLine], cursor: 'default', opacity: b.status === 'inactive' ? 0.6 : 1 }}>
              <div className="grp-branch-head">
                <div>
                  <div className="grp-branch-name">{b.name} {b.code && <span className="grp-mono muted">{b.code}</span>}</div>
                  <div className="grp-branch-city"><RiMapPinLine style={{ verticalAlign: '-2px' }} /> {[b.city, b.state].filter(Boolean).join(', ') || '—'}</div>
                </div>
                <span className="badge badge-neutral">{LINE_LABELS[b.businessLine]?.replace(/s$/, '')}</span>
              </div>
              <div style={{ fontSize: 13 }}><RiUserStarLine style={{ verticalAlign: '-2px' }} /> Manager: <strong>{b.managerId?.name || 'Not assigned'}</strong></div>
              <div style={{ fontSize: 13 }} className="muted">{b.departments.map((d) => d.name).join(' · ')}</div>
              <div style={{ fontSize: 13 }}>
                {b.businessLine === 'filling_station' && <>{b.nozzles?.length || 0} nozzles · </>}
                {(b.dutyStaff || []).filter((d) => d.active !== false).length} staff on roster · {(b.shifts || []).map((x) => x.name).join(', ')}
              </div>
              {b.dailySalesTarget > 0 && <div style={{ fontSize: 13 }}>Daily target: <strong>{naira(b.dailySalesTarget)}</strong></div>}
              {b.status === 'inactive' && <span className="badge badge-neutral">Inactive</span>}
              <div className="grp-row" style={{ marginTop: 'auto' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/group/reports?branchId=${b._id}`)}>Reports</button>
                <span className="grp-spacer" />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => edit(b)} aria-label="Edit"><RiEditLine /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b)} aria-label="Remove"><RiDeleteBinLine /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <BranchModal initial={editing} members={members} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
