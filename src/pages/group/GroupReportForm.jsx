import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiAddLine, RiDeleteBinLine, RiSendPlaneLine, RiSaveLine, RiLoader4Line, RiGasStationLine, RiShoppingCartLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, todayYmd, FUEL_LABELS } from './groupUtils';
import './Group.css';

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
const emptyPump = (i, price = '') => ({ pump: `Pump ${i + 1}`, product: 'PMS', openingMeter: '', closingMeter: '', pricePerLitre: price });
const emptyItem = () => ({ description: '', quantity: '', unit: 'pcs', unitPrice: '' });
const usesPumps = (branch, dept) => branch?.businessLine === 'filling_station' && /forecourt|pump/i.test(dept || '');

export default function GroupReportForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = Boolean(id);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    branchId: params.get('branchId') || '', department: '', reportDate: todayYmd(),
    pumps: [], items: [emptyItem()], expenses: [],
    collections: { cash: '', pos: '', transfer: '', credit: '' }, notes: '',
  });
  const [mode, setMode] = useState('items');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await groupService.getBranches();
        const list = (data.data || []).filter((b) => b.status === 'active');
        setBranches(list);
        if (editing) {
          const { data: r } = await groupService.getReport(id);
          const rep = r.data;
          setForm({
            branchId: rep.branchId, department: rep.department, reportDate: rep.reportDate.slice(0, 10),
            pumps: rep.pumps, items: rep.items.length ? rep.items : [emptyItem()], expenses: rep.expenses,
            collections: rep.collections, notes: rep.notes || '',
          });
          setMode(rep.pumps.length ? 'pumps' : 'items');
        } else if (!params.get('branchId') && list.length === 1) {
          setForm((f) => ({ ...f, branchId: list[0]._id }));
        }
      } catch (e) {
        toast.error(e.response?.data?.message || 'Could not load the form');
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const branch = branches.find((b) => b._id === form.branchId);

  // Picking a forecourt department switches to pump readings, prefilled with the branch's pump prices.
  function chooseDepartment(dept) {
    const pumps = usesPumps(branch, dept);
    setMode(pumps ? 'pumps' : 'items');
    setForm((f) => ({
      ...f,
      department: dept,
      pumps: pumps && !f.pumps.length ? Array.from({ length: 4 }, (_, i) => emptyPump(i, branch?.fuelPrices?.PMS || '')) : f.pumps,
    }));
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (list, i, k, v) => setForm((f) => {
    const rows = [...f[list]];
    rows[i] = { ...rows[i], [k]: v };
    if (list === 'pumps' && k === 'product') rows[i].pricePerLitre = branch?.fuelPrices?.[v] || rows[i].pricePerLitre;
    return { ...f, [list]: rows };
  });
  const addLine = (list, row) => setForm((f) => ({ ...f, [list]: [...f[list], row] }));
  const removeLine = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }));

  const calc = useMemo(() => {
    const pumps = mode === 'pumps' ? form.pumps : [];
    const items = mode === 'items' ? form.items : [];
    const litres = pumps.reduce((s, p) => s + Math.max(0, num(p.closingMeter) - num(p.openingMeter)), 0);
    const expected = pumps.reduce((s, p) => s + Math.max(0, num(p.closingMeter) - num(p.openingMeter)) * num(p.pricePerLitre), 0)
      + items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
    const c = form.collections;
    const collected = num(c.cash) + num(c.pos) + num(c.transfer) + num(c.credit);
    const expenses = form.expenses.reduce((s, e) => s + num(e.amount), 0);
    return { litres, expected, collected, expenses, variance: collected + expenses - expected };
  }, [form, mode]);

  async function save(submit) {
    if (!form.branchId || !form.department) { toast.error('Choose the branch and department'); return; }
    const pumps = mode === 'pumps'
      ? form.pumps.filter((p) => p.closingMeter !== '' && p.openingMeter !== '').map((p) => ({
        pump: p.pump, product: p.product, openingMeter: num(p.openingMeter), closingMeter: num(p.closingMeter), pricePerLitre: num(p.pricePerLitre),
      }))
      : [];
    if (pumps.some((p) => p.closingMeter < p.openingMeter)) { toast.error('A closing meter is lower than its opening meter'); return; }
    const items = mode === 'items'
      ? form.items.filter((it) => it.description.trim() && it.quantity !== '').map((it) => ({
        description: it.description.trim(), quantity: num(it.quantity), unit: it.unit || 'pcs', unitPrice: num(it.unitPrice),
      }))
      : [];
    if (!pumps.length && !items.length) { toast.error(mode === 'pumps' ? 'Enter at least one pump reading' : 'Add at least one item sold'); return; }
    if (submit && !window.confirm(calc.variance < -1000
      ? `This report is SHORT by ${naira(Math.abs(calc.variance))}. Submit it for approval anyway?`
      : 'Submit this report for approval? You cannot edit it unless it is sent back.')) return;

    const payload = {
      branchId: form.branchId, department: form.department, reportDate: form.reportDate, pumps, items,
      expenses: form.expenses.filter((e) => e.description.trim() && e.amount !== '').map((e) => ({ description: e.description.trim(), amount: num(e.amount) })),
      collections: Object.fromEntries(Object.entries(form.collections).map(([k, v]) => [k, num(v)])),
      notes: form.notes, submit,
    };
    setSaving(true);
    try {
      const { data } = editing ? await groupService.updateReport(id, payload) : await groupService.createReport(payload);
      toast.success(submit ? 'Report submitted for approval' : 'Draft saved');
      navigate(`/group/reports/${data.data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the report');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;

  if (!branches.length) {
    return (
      <div className="grp-page"><div className="card grp-empty-hero">
        <h2>No branch assigned to you</h2>
        <p>Ask the owner to add you to a branch (as manager, department head or staff) before filing reports.</p>
      </div></div>
    );
  }

  const verdict = Math.abs(calc.variance) < 1000 ? 'ok' : calc.variance < 0 ? 'short' : 'over';

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <h1>{editing ? 'Edit report' : 'New daily sales report'}</h1>
        <p className="muted">Record today's sales and the money collected. Any shortage is worked out automatically.</p>
      </div>

      <div className="card card-pad">
        <div className="grp-form-grid">
          <div className="form-group">
            <label className="form-label">Branch</label>
            <select className="form-select" value={form.branchId} disabled={editing}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value, department: '', pumps: [] }))}>
              <option value="">Select branch…</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={(e) => chooseDepartment(e.target.value)} disabled={!branch}>
              <option value="">Select department…</option>
              {branch?.departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Report date</label>
            <input type="date" className="form-input" value={form.reportDate} max={todayYmd()} onChange={(e) => set('reportDate', e.target.value)} />
          </div>
        </div>
        {branch && (
          <div className="grp-row" style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 13 }}>Record as:</span>
            <button className={`btn btn-sm ${mode === 'pumps' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setMode('pumps'); if (!form.pumps.length) set('pumps', Array.from({ length: 4 }, (_, i) => emptyPump(i, branch?.fuelPrices?.PMS || ''))); }}>
              <RiGasStationLine /> Pump meter readings
            </button>
            <button className={`btn btn-sm ${mode === 'items' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('items')}>
              <RiShoppingCartLine /> Items sold
            </button>
          </div>
        )}
      </div>

      {mode === 'pumps' ? (
        <div className="card card-pad">
          <div className="grp-card-title"><RiGasStationLine /> Pump meter readings</div>
          <div className="table-wrapper">
            <table className="grp-lines">
              <thead><tr><th>Pump</th><th>Product</th><th>Opening meter</th><th>Closing meter</th><th>Price / L</th><th style={{ textAlign: 'right' }}>Litres</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
              <tbody>
                {form.pumps.map((p, i) => {
                  const litres = Math.max(0, num(p.closingMeter) - num(p.openingMeter));
                  return (
                    <tr key={i}>
                      <td><input className="form-input" value={p.pump} onChange={(e) => setLine('pumps', i, 'pump', e.target.value)} style={{ width: 90 }} /></td>
                      <td>
                        <select className="form-select" value={p.product} onChange={(e) => setLine('pumps', i, 'product', e.target.value)}>
                          {Object.entries(FUEL_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                        </select>
                      </td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.openingMeter} onChange={(e) => setLine('pumps', i, 'openingMeter', e.target.value)} /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.closingMeter} onChange={(e) => setLine('pumps', i, 'closingMeter', e.target.value)} /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.pricePerLitre} onChange={(e) => setLine('pumps', i, 'pricePerLitre', e.target.value)} style={{ width: 100 }} /></td>
                      <td className="calc">{litres.toLocaleString()}</td>
                      <td className="calc">{naira(litres * num(p.pricePerLitre))}</td>
                      <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine('pumps', i)} aria-label="Remove pump"><RiDeleteBinLine /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => addLine('pumps', emptyPump(form.pumps.length, branch?.fuelPrices?.PMS || ''))}><RiAddLine /> Add pump</button>
        </div>
      ) : (
        <div className="card card-pad">
          <div className="grp-card-title"><RiShoppingCartLine /> Items sold</div>
          <div className="table-wrapper">
            <table className="grp-lines">
              <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit price</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td><input className="form-input" placeholder="e.g. Dangote Cement 50kg" value={it.description} onChange={(e) => setLine('items', i, 'description', e.target.value)} style={{ minWidth: 200 }} /></td>
                    <td><input type="number" inputMode="decimal" className="form-input" value={it.quantity} onChange={(e) => setLine('items', i, 'quantity', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input className="form-input" value={it.unit} onChange={(e) => setLine('items', i, 'unit', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input type="number" inputMode="decimal" className="form-input" value={it.unitPrice} onChange={(e) => setLine('items', i, 'unitPrice', e.target.value)} style={{ width: 120 }} /></td>
                    <td className="calc">{naira(num(it.quantity) * num(it.unitPrice))}</td>
                    <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine('items', i)} aria-label="Remove item"><RiDeleteBinLine /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => addLine('items', emptyItem())}><RiAddLine /> Add item</button>
        </div>
      )}

      <div className="grp-grid-2">
        <div className="card card-pad">
          <div className="grp-card-title">Money collected</div>
          <div className="grp-form-grid">
            {[['cash', 'Cash'], ['pos', 'POS'], ['transfer', 'Bank transfer'], ['credit', 'Credit sales']].map(([k, l]) => (
              <div className="form-group" key={k}>
                <label className="form-label">{l} (₦)</label>
                <input type="number" inputMode="decimal" className="form-input" value={form.collections[k]}
                  onChange={(e) => set('collections', { ...form.collections, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="grp-card-title" style={{ marginTop: 12 }}>Expenses paid from sales</div>
          {form.expenses.map((e, i) => (
            <div key={i} className="grp-row" style={{ marginBottom: 8, flexWrap: 'nowrap' }}>
              <input className="form-input" placeholder="e.g. Generator diesel" value={e.description} onChange={(ev) => setLine('expenses', i, 'description', ev.target.value)} />
              <input type="number" inputMode="decimal" className="form-input" placeholder="₦" value={e.amount} onChange={(ev) => setLine('expenses', i, 'amount', ev.target.value)} style={{ width: 140 }} />
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine('expenses', i)} aria-label="Remove expense"><RiDeleteBinLine /></button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => addLine('expenses', { description: '', amount: '' })}><RiAddLine /> Add expense</button>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Notes for the approver</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything unusual today: power outage, price change, pump fault…" />
          </div>
        </div>

        <div className="card card-pad">
          <div className="grp-card-title">Reconciliation</div>
          <div className="grp-recon">
            {calc.litres > 0 && <div><div className="l">Litres sold</div><div className="v">{calc.litres.toLocaleString()} L</div></div>}
            <div><div className="l">Expected sales</div><div className="v">{naira(calc.expected)}</div></div>
            <div><div className="l">Collected</div><div className="v">{naira(calc.collected)}</div></div>
            <div><div className="l">Expenses</div><div className="v">{naira(calc.expenses)}</div></div>
            <div className={`verdict ${verdict}`}>
              <div className="l">{verdict === 'ok' ? 'Balanced' : verdict === 'short' ? 'Shortage' : 'Surplus'}</div>
              <div className={`v ${verdict === 'short' ? 'grp-neg' : verdict === 'over' ? '' : 'grp-pos'}`}>{naira(Math.abs(calc.variance))}</div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Collected + expenses should equal expected sales. A shortage is flagged to the branch manager and the owner.
          </p>
        </div>
      </div>

      <div className="grp-sticky-actions">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button className="btn btn-secondary" onClick={() => save(false)} disabled={saving}><RiSaveLine /> Save draft</button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
          {saving ? <RiLoader4Line className="spin" /> : <RiSendPlaneLine />} Submit for approval
        </button>
      </div>
    </div>
  );
}
