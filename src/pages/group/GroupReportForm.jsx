import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiDeleteBinLine, RiSendPlaneLine, RiSaveLine, RiLoader4Line, RiGasStationLine, RiShoppingCartLine,
  RiTimeLine, RiUserLine, RiBankLine, RiErrorWarningLine,
} from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, todayYmd, FUEL_LABELS } from './groupUtils';
import './Group.css';

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
const emptyItem = () => ({ description: '', quantity: '', unit: 'pcs', unitPrice: '' });
const emptyTransfer = (nozzle = '') => ({ sender: '', bank: '', reference: '', nozzle, amount: '' });
const usesPumps = (branch, dept) => branch?.businessLine === 'filling_station' && /forecourt|pump/i.test(dept || '');

// One editable row per nozzle. Opening is prefilled from the previous shift's
// closing on the same nozzle; `prev` keeps that value so we can flag edits.
const nozzleRow = (n, price, prev) => ({
  pump: n.pump, nozzle: n.code, product: n.product,
  openingMeter: prev?.closing ?? '', closingMeter: '', pumpTest: '', pricePerLitre: price ?? '',
  cash: '', pos: '', transfer: '', prev: prev || null,
});
const manualRow = (i, price = '') => ({
  pump: `Pump ${i + 1}`, nozzle: '', product: 'PMS', openingMeter: '', closingMeter: '', pumpTest: '', pricePerLitre: price,
  cash: '', pos: '', transfer: '', prev: null,
});

export default function GroupReportForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = Boolean(id);
  const [branches, setBranches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [form, setForm] = useState({
    branchId: params.get('branchId') || '', department: '', reportDate: todayYmd(),
    shift: { name: '', start: '', end: '' }, attendantName: '', onDuty: [],
    pumps: [], items: [emptyItem()], expenses: [], transfers: [],
    collections: { cash: '', pos: '', transfer: '', credit: '' }, notes: '',
  });
  const [mode, setMode] = useState('items');

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, m] = await Promise.all([groupService.getBranches(), groupService.members().catch(() => ({ data: { data: [] } }))]);
        const list = (data.data || []).filter((b) => b.status === 'active');
        setBranches(list);
        setMembers(m.data.data || []);
        if (editing) {
          const { data: r } = await groupService.getReport(id);
          const rep = r.data;
          setForm({
            branchId: rep.branchId, department: rep.department, reportDate: rep.reportDate.slice(0, 10),
            shift: rep.shift?.name ? rep.shift : { name: '', start: '', end: '' }, attendantName: rep.attendantName || '', onDuty: rep.onDuty || [],
            pumps: rep.pumps.map((p) => ({ ...p, prev: p.prevClosing != null ? { closing: p.prevClosing } : null })),
            items: rep.items.length ? rep.items : [emptyItem()], expenses: rep.expenses, transfers: rep.transfers || [],
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
  const [dutyDraft, setDutyDraft] = useState('');
  // Name suggestions: this branch's duty roster first, then people with app logins.
  const dutyNames = [...new Set([
    ...(branch?.dutyStaff || []).filter((d) => d.active !== false).map((d) => d.name),
    ...members.map((m) => m.name),
  ])];
  const addOnDuty = (name) => {
    const n = String(name || '').trim();
    if (n && !form.onDuty.includes(n)) set('onDuty', [...form.onDuty, n]);
    setDutyDraft('');
  };
  const hasLayout = (branch?.nozzles?.length || 0) > 0;
  const priceFor = (product) => branch?.fuelPrices?.[product] || '';

  // Build the nozzle sheet for this branch/date/shift, opening meters taken
  // from whoever closed each nozzle last.
  async function prefillNozzles(b = branch, date = form.reportDate, shiftStart = form.shift.start) {
    if (!b?.nozzles?.length) return;
    setPrefilling(true);
    try {
      const { data } = await groupService.lastMeters(b._id, { date, shiftStart, excludeId: id });
      const last = data.data || {};
      setForm((f) => ({ ...f, pumps: b.nozzles.map((n) => nozzleRow(n, b.fuelPrices?.[n.product], last[n.code])) }));
    } catch {
      setForm((f) => ({ ...f, pumps: b.nozzles.map((n) => nozzleRow(n, b.fuelPrices?.[n.product], null)) }));
    } finally { setPrefilling(false); }
  }

  function chooseDepartment(dept) {
    const pumps = usesPumps(branch, dept);
    setMode(pumps ? 'pumps' : 'items');
    const firstShift = branch?.shifts?.[0];
    setForm((f) => ({
      ...f,
      department: dept,
      shift: pumps && !f.shift.name && firstShift ? { ...firstShift } : f.shift,
      pumps: pumps && !f.pumps.length && !hasLayout ? Array.from({ length: 4 }, (_, i) => manualRow(i, priceFor('PMS'))) : f.pumps,
    }));
    if (pumps && hasLayout && !editing) prefillNozzles(branch, form.reportDate, firstShift?.start || form.shift.start);
  }

  function chooseShift(name) {
    const s = branch?.shifts?.find((x) => x.name === name) || { name, start: '', end: '' };
    setForm((f) => ({ ...f, shift: { ...s } }));
    if (mode === 'pumps' && hasLayout && !editing) prefillNozzles(branch, form.reportDate, s.start);
  }

  function chooseDate(date) {
    setForm((f) => ({ ...f, reportDate: date }));
    if (mode === 'pumps' && hasLayout && !editing) prefillNozzles(branch, date, form.shift.start);
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (list, i, k, v) => setForm((f) => {
    const rows = [...f[list]];
    rows[i] = { ...rows[i], [k]: v };
    if (list === 'pumps' && k === 'product') rows[i].pricePerLitre = priceFor(v) || rows[i].pricePerLitre;
    return { ...f, [list]: rows };
  });
  const addLine = (list, row) => setForm((f) => ({ ...f, [list]: [...f[list], row] }));
  const removeLine = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }));

  const calc = useMemo(() => {
    const pumps = mode === 'pumps' ? form.pumps : [];
    const items = mode === 'items' ? form.items : [];
    const rows = pumps.map((p) => {
      const litres = Math.max(0, num(p.closingMeter) - num(p.openingMeter) - num(p.pumpTest));
      const amount = litres * num(p.pricePerLitre);
      const taken = num(p.cash) + num(p.pos) + num(p.transfer);
      const gap = p.prev && p.openingMeter !== '' ? num(p.openingMeter) - p.prev.closing : 0;
      return { litres, amount, taken, variance: taken - amount, gap };
    });
    const perNozzle = pumps.some((p) => num(p.cash) || num(p.pos) || num(p.transfer));
    const litres = rows.reduce((s, r) => s + r.litres, 0);
    const expected = rows.reduce((s, r) => s + r.amount, 0) + items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
    const c = form.collections;
    const cash = perNozzle ? pumps.reduce((s, p) => s + num(p.cash), 0) : num(c.cash);
    const pos = perNozzle ? pumps.reduce((s, p) => s + num(p.pos), 0) : num(c.pos);
    const transfer = perNozzle ? pumps.reduce((s, p) => s + num(p.transfer), 0) : num(c.transfer);
    const collected = cash + pos + transfer + num(c.credit);
    const expenses = form.expenses.reduce((s, e) => s + num(e.amount), 0);
    const itemisedTransfers = form.transfers.reduce((s, t) => s + num(t.amount), 0);
    return {
      rows, litres, expected, cash, pos, transfer, collected, expenses, itemisedTransfers,
      variance: collected + expenses - expected,
      gapLitres: rows.reduce((s, r) => s + Math.abs(r.gap), 0),
    };
  }, [form, mode]);

  async function save(submit) {
    if (!form.branchId || !form.department) { toast.error('Choose the branch and department'); return; }
    if (mode === 'pumps' && branch?.businessLine === 'filling_station' && !form.attendantName.trim()) {
      toast.error('Enter the attendant who was on duty for this shift'); return;
    }
    if (mode === 'pumps' && !form.shift.name) { toast.error('Choose the shift'); return; }
    const pumps = mode === 'pumps'
      ? form.pumps.filter((p) => p.closingMeter !== '' && p.openingMeter !== '').map((p) => ({
        pump: p.pump, nozzle: p.nozzle || '', product: p.product,
        openingMeter: num(p.openingMeter), closingMeter: num(p.closingMeter), pumpTest: num(p.pumpTest),
        pricePerLitre: num(p.pricePerLitre), cash: num(p.cash), pos: num(p.pos), transfer: num(p.transfer),
      }))
      : [];
    const backwards = pumps.find((p) => p.closingMeter < p.openingMeter);
    if (backwards) {
      toast.error(`${backwards.nozzle || backwards.pump}: closing meter (${backwards.closingMeter.toLocaleString()}) is lower than opening meter (${backwards.openingMeter.toLocaleString()}). Check the readings weren't swapped, and enter the full meter number, not the litres sold.`, { duration: 7000 });
      return;
    }
    const items = mode === 'items'
      ? form.items.filter((it) => it.description.trim() && it.quantity !== '').map((it) => ({
        description: it.description.trim(), quantity: num(it.quantity), unit: it.unit || 'pcs', unitPrice: num(it.unitPrice),
      }))
      : [];
    if (!pumps.length && !items.length) { toast.error(mode === 'pumps' ? 'Enter at least one nozzle reading' : 'Add at least one item sold'); return; }

    if (submit) {
      const warnings = [];
      if (calc.variance < -1000) warnings.push(`SHORT by ${naira(Math.abs(calc.variance))}`);
      if (calc.gapLitres >= 1) warnings.push(`opening meters differ from the last closing by ${calc.gapLitres.toLocaleString()} L`);
      const msg = warnings.length
        ? `This report is ${warnings.join(' and ')}. The owner and branch manager will be alerted. Submit anyway?`
        : 'Submit this report for approval? You cannot edit it unless it is sent back.';
      if (!window.confirm(msg)) return;
    }

    const payload = {
      branchId: form.branchId, department: form.department, reportDate: form.reportDate, pumps, items,
      shift: form.shift.name ? form.shift : undefined,
      attendantName: form.attendantName,
      onDuty: form.onDuty.filter((n) => n.trim() && n.trim() !== form.attendantName.trim()),
      expenses: form.expenses.filter((e) => e.description.trim() && e.amount !== '').map((e) => ({ description: e.description.trim(), amount: num(e.amount) })),
      transfers: form.transfers.filter((t) => t.amount !== '').map((t) => ({ ...t, amount: num(t.amount) })),
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
  const perNozzleMode = mode === 'pumps';
  const transferMismatch = form.transfers.length > 0 && Math.abs(calc.itemisedTransfers - calc.transfer) >= 1;

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <h1>{editing ? 'Edit report' : perNozzleMode ? 'Shift sales sheet' : 'New daily sales report'}</h1>
        <p className="muted">
          {perNozzleMode
            ? 'One sheet per attendant per shift. Record each nozzle and the money taken on it, and any shortage shows up immediately.'
            : "Record today's sales and the money collected. Any shortage is worked out automatically."}
        </p>
      </div>

      <div className="card card-pad">
        <div className="grp-form-grid">
          <div className="form-group">
            <label className="form-label">Branch</label>
            <select className="form-select" value={form.branchId} disabled={editing}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value, department: '', pumps: [], shift: { name: '', start: '', end: '' } }))}>
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
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.reportDate} max={todayYmd()} onChange={(e) => chooseDate(e.target.value)} />
          </div>
        </div>

        {branch && form.department && (
          <div className="grp-form-grid" style={{ marginTop: 4 }}>
            <div className="form-group">
              <label className="form-label"><RiTimeLine style={{ verticalAlign: '-2px' }} /> Shift{!perNozzleMode && <span className="muted"> (optional)</span>}</label>
              <select className="form-select" value={form.shift.name} onChange={(e) => chooseShift(e.target.value)}>
                <option value="">Select shift…</option>
                {(branch?.shifts || []).map((s) => <option key={s.name} value={s.name}>{s.name} ({s.start}–{s.end})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Actual start – end</label>
              <div className="grp-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                <input type="time" className="form-input" value={form.shift.start} onChange={(e) => set('shift', { ...form.shift, start: e.target.value })} />
                <span className="muted">–</span>
                <input type="time" className="form-input" value={form.shift.end} onChange={(e) => set('shift', { ...form.shift, end: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <RiUserLine style={{ verticalAlign: '-2px' }} /> {perNozzleMode ? 'Attendant on duty' : 'Sales person on duty'}
                {!perNozzleMode && <span className="muted"> (optional)</span>}
              </label>
              <input className="form-input" list="grp-attendants" value={form.attendantName}
                placeholder={perNozzleMode ? 'Who sold on these nozzles?' : 'Who made these sales?'}
                onChange={(e) => set('attendantName', e.target.value)} />
              <datalist id="grp-attendants">{dutyNames.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
          </div>
        )}

        {branch && form.department && (
          <div className="form-group" style={{ marginTop: 4 }}>
            <label className="form-label">Others on duty <span className="muted">(optional)</span></label>
            <div className="grp-row" style={{ gap: 6 }}>
              {form.onDuty.map((n) => (
                <span key={n} className="grp-shift-chip">
                  {n}
                  <button type="button" className="grp-chip-x" onClick={() => set('onDuty', form.onDuty.filter((x) => x !== n))} aria-label={`Remove ${n}`}>×</button>
                </span>
              ))}
              <input className="form-input" list="grp-attendants" placeholder="Add a name, then press Enter" value={dutyDraft}
                style={{ maxWidth: 260 }}
                onChange={(e) => setDutyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOnDuty(dutyDraft); } }}
                onBlur={() => addOnDuty(dutyDraft)} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Staff who don't use the app can still be named here. Your name is recorded automatically as the person submitting.
            </div>
          </div>
        )}

        {branch && (
          <div className="grp-row" style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 13 }}>Record as:</span>
            <button className={`btn btn-sm ${mode === 'pumps' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setMode('pumps');
                if (!form.pumps.length) {
                  if (hasLayout) prefillNozzles();
                  else set('pumps', Array.from({ length: 4 }, (_, i) => manualRow(i, priceFor('PMS'))));
                }
              }}>
              <RiGasStationLine /> Nozzle meter readings
            </button>
            <button className={`btn btn-sm ${mode === 'items' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('items')}>
              <RiShoppingCartLine /> Items sold
            </button>
          </div>
        )}
      </div>

      {perNozzleMode ? (
        <div className="card card-pad">
          <div className="grp-card-title">
            <RiGasStationLine /> Nozzles: meters & takings
            <span className="grp-spacer" />
            {hasLayout && !editing && (
              <button className="btn btn-ghost btn-sm" onClick={() => prefillNozzles()} disabled={prefilling}>
                {prefilling ? <RiLoader4Line className="spin" /> : null} Reload last closing meters
              </button>
            )}
          </div>
          {!hasLayout && (
            <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
              Tip: set this branch's nozzles under Branches, and each opening meter will be filled in from the previous shift automatically.
            </p>
          )}
          <div className="table-wrapper">
            <table className="grp-lines">
              <thead>
                <tr>
                  <th>Nozzle</th><th>Product</th><th>Opening</th><th>Closing</th><th title="Litres dispensed for calibration and poured back into the tank">Pump test (L)</th>
                  <th>Price/L</th><th style={{ textAlign: 'right' }}>Litres</th><th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Cash</th><th>POS</th><th>Transfer</th><th style={{ textAlign: 'right' }}>Short / over</th><th />
                </tr>
              </thead>
              <tbody>
                {form.pumps.map((p, i) => {
                  const r = calc.rows[i] || {};
                  const backwards = p.closingMeter !== '' && p.openingMeter !== '' && num(p.closingMeter) < num(p.openingMeter);
                  const filled = p.closingMeter !== '';
                  return (
                    <tr key={i} className={backwards ? 'grp-row-error' : ''}>
                      <td>
                        {p.nozzle
                          ? <div><strong className="grp-mono">{p.nozzle}</strong><div className="muted" style={{ fontSize: 11 }}>{p.pump}</div></div>
                          : <input className="form-input" value={p.pump} onChange={(e) => setLine('pumps', i, 'pump', e.target.value)} style={{ width: 90 }} />}
                      </td>
                      <td>
                        <select className="form-select" value={p.product} onChange={(e) => setLine('pumps', i, 'product', e.target.value)}>
                          {Object.entries(FUEL_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" inputMode="decimal" className="form-input" value={p.openingMeter}
                          onChange={(e) => setLine('pumps', i, 'openingMeter', e.target.value)}
                          style={r.gap ? { borderColor: 'var(--color-warning)' } : undefined} />
                        {p.prev && (
                          <div style={{ fontSize: 11, marginTop: 2 }} className={r.gap ? 'grp-neg' : 'muted'}
                            title={`Closed at ${p.prev.closing.toLocaleString()}${p.prev.attendant ? ` by ${p.prev.attendant}` : ''}${p.prev.shift ? ` (${p.prev.shift} shift, ${p.prev.date})` : ''}`}>
                            {r.gap ? <><RiErrorWarningLine style={{ verticalAlign: '-2px' }} /> {r.gap > 0 ? '+' : ''}{r.gap.toLocaleString()} L vs last close</> : `Last close${p.prev.attendant ? `: ${p.prev.attendant}` : ''}`}
                          </div>
                        )}
                      </td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.closingMeter} onChange={(e) => setLine('pumps', i, 'closingMeter', e.target.value)} /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.pumpTest} onChange={(e) => setLine('pumps', i, 'pumpTest', e.target.value)} style={{ width: 80 }} placeholder="0" /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.pricePerLitre} onChange={(e) => setLine('pumps', i, 'pricePerLitre', e.target.value)} style={{ width: 90 }} /></td>
                      <td className="calc">{backwards ? <span className="grp-neg">Check meters</span> : (r.litres || 0).toLocaleString()}</td>
                      <td className="calc">{naira(r.amount)}</td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.cash} onChange={(e) => setLine('pumps', i, 'cash', e.target.value)} style={{ width: 110 }} /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.pos} onChange={(e) => setLine('pumps', i, 'pos', e.target.value)} style={{ width: 110 }} /></td>
                      <td><input type="number" inputMode="decimal" className="form-input" value={p.transfer} onChange={(e) => setLine('pumps', i, 'transfer', e.target.value)} style={{ width: 110 }} /></td>
                      <td className={`calc ${filled && r.variance < -100 ? 'grp-neg' : ''}`}>
                        {!filled ? '—' : Math.abs(r.variance) < 100 ? <span className="grp-pos">Balanced</span> : naira(r.variance)}
                      </td>
                      <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine('pumps', i)} aria-label="Remove nozzle"><RiDeleteBinLine /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!hasLayout && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => addLine('pumps', manualRow(form.pumps.length, priceFor('PMS')))}><RiAddLine /> Add pump</button>
          )}
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
            Litres = closing − opening − pump test. Leave a nozzle's closing empty if it wasn't used this shift.
          </p>
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

      {perNozzleMode && (
        <div className="card card-pad">
          <div className="grp-card-title">
            <RiBankLine /> Transfer details
            <span className="grp-spacer" />
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
              Itemised {naira(calc.itemisedTransfers)} of {naira(calc.transfer)}
            </span>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>List each transfer so the manager can match it to the bank alert.</p>
          {form.transfers.map((t, i) => (
            <div key={i} className="grp-transfer-row">
              <input className="form-input" placeholder="Sender name" value={t.sender} onChange={(e) => setLine('transfers', i, 'sender', e.target.value)} />
              <input className="form-input" placeholder="Bank" value={t.bank} onChange={(e) => setLine('transfers', i, 'bank', e.target.value)} />
              <input className="form-input" placeholder="Reference / session ID" value={t.reference} onChange={(e) => setLine('transfers', i, 'reference', e.target.value)} />
              <select className="form-select" value={t.nozzle} onChange={(e) => setLine('transfers', i, 'nozzle', e.target.value)}>
                <option value="">Nozzle…</option>
                {form.pumps.map((p) => p.nozzle || p.pump).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input type="number" inputMode="decimal" className="form-input" placeholder="₦ amount" value={t.amount} onChange={(e) => setLine('transfers', i, 'amount', e.target.value)} />
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine('transfers', i)} aria-label="Remove transfer"><RiDeleteBinLine /></button>
            </div>
          ))}
          <div className="grp-row">
            <button className="btn btn-secondary btn-sm" onClick={() => addLine('transfers', emptyTransfer())}><RiAddLine /> Add transfer</button>
            {transferMismatch && (
              <span className="grp-neg" style={{ fontSize: 13 }}>
                <RiErrorWarningLine style={{ verticalAlign: '-2px' }} /> Itemised transfers don't add up to the {naira(calc.transfer)} recorded on the nozzles
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grp-grid-2">
        <div className="card card-pad">
          <div className="grp-card-title">Money collected</div>
          {perNozzleMode ? (
            <>
              <div className="grp-recon">
                <div><div className="l">Cash</div><div className="v">{naira(calc.cash)}</div></div>
                <div><div className="l">POS</div><div className="v">{naira(calc.pos)}</div></div>
                <div><div className="l">Transfer</div><div className="v">{naira(calc.transfer)}</div></div>
              </div>
              <div className="form-group" style={{ marginTop: 12, maxWidth: 260 }}>
                <label className="form-label">Credit sales (₦)</label>
                <input type="number" inputMode="decimal" className="form-input" value={form.collections.credit}
                  onChange={(e) => set('collections', { ...form.collections, credit: e.target.value })} />
              </div>
            </>
          ) : (
            <div className="grp-form-grid">
              {[['cash', 'Cash'], ['pos', 'POS'], ['transfer', 'Bank transfer'], ['credit', 'Credit sales']].map(([k, l]) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{l} (₦)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={form.collections[k]}
                    onChange={(e) => set('collections', { ...form.collections, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
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
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything unusual: power outage, price change, pump fault, meter reset…" />
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
            {calc.gapLitres >= 1 && (
              <div className="verdict short"><div className="l">Meter handover gap</div><div className="v grp-neg">{calc.gapLitres.toLocaleString()} L</div></div>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Collected + expenses should equal expected sales. Shortages and meter gaps are flagged to the branch manager and the owner.
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
