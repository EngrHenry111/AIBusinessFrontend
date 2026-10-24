import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiCapsuleLine, RiSearchLine, RiAddLine, RiLoader4Line, RiInboxArchiveLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { Modal, Field, Allergies, PatientPicker, PrescribeModal } from './HospitalForms';
import { RX_STATUS, DRUG_FORMS, money, fmtDate, fmtDateTime, fullName, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

export default function Pharmacy() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'rx';
  const rxId = params.get('rx');
  const me = useHospitalMe();
  const setTab = (t) => setParams(t === 'rx' ? {} : { tab: t });
  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiCapsuleLine style={{ verticalAlign: '-3px' }} /> Pharmacy</h1>
          <p>Price each prescription against stock, collect payment, then dispense. Stock goes out oldest-expiry first. <span className="sc-live">Live</span></p>
        </div>
      </div>
      <div className="sc-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'rx'} className={`sc-tab ${tab === 'rx' ? 'active' : ''}`} onClick={() => setTab('rx')}>Prescriptions</button>
        <button role="tab" aria-selected={tab === 'stock'} className={`sc-tab ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Drug stock</button>
      </div>
      {tab === 'stock' ? <Stock canEdit={can.pharmacy(me)} /> : <Prescriptions />}
      {rxId && <RxModal id={rxId} onClose={() => { const p = new URLSearchParams(params); p.delete('rx'); setParams(p); }} />}
    </div>
  );
}

function Prescriptions() {
  const [params, setParams] = useSearchParams();
  const me = useHospitalMe();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [counter, setCounter] = useState(null);
  const load = useCallback(async () => {
    try {
      const { data } = await hospitalService.getPrescriptions({ status, search: search || undefined });
      setRows(data.data); setCounts(data.counts);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [status, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useHospitalLive(load, ['pharmacy', 'payment', 'bills']);
  const open = (id) => { const p = new URLSearchParams(params); p.set('rx', id); setParams(p); };

  return (
    <div className="card">
      <div className="sc-filters">
        <select className="form-input form-select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">To do ({(counts.pending || 0) + (counts.billed || 0)})</option>
          <option value="dispensed">Dispensed</option><option value="cancelled">Cancelled</option><option value="all">All</option>
        </select>
        <div className="sc-search"><RiSearchLine /><input placeholder="Search patient or Rx no.…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {can.pharmacy(me) && <button className="btn btn-primary" onClick={() => setCounter('pick')}><RiAddLine /> Counter sale</button>}
      </div>
      {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><RiCapsuleLine /></div><h3>Nothing here</h3><p>Doctors' prescriptions appear here as soon as they are written.</p></div>
      ) : (
        <div className="table-wrapper"><table className="table">
          <thead><tr><th>Written</th><th>Patient</th><th>Drugs</th><th>Bill</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r._id} className="sc-row" onClick={() => open(r._id)}>
              <td>{fmtDateTime(r.createdAt)}<span className="cell-sub">{r.rxNumber}{r.source === 'counter' ? ' · counter' : ''}</span></td>
              <td><span className="sc-strong">{fullName(r.patientId)}</span><span className="cell-sub">{r.patientId?.hospitalNumber}</span>{r.patientId?.allergies?.length > 0 && <span className="cell-sub sc-owing">Allergies: {r.patientId.allergies.join(', ')}</span>}</td>
              <td>{r.items.map((i) => i.drugName).join(', ')}</td>
              <td>{r.bill ? (r.bill.balance > 0 ? <span className="sc-owing">Owes {money(r.bill.balance)}</span> : <span className="badge badge-success">Paid</span>) : <span className="cell-sub">—</span>}</td>
              <td><span className={`badge badge-${RX_STATUS[r.status]?.badge}`}>{RX_STATUS[r.status]?.label}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {counter === 'pick' && (
        <Modal title="Counter sale" size="sc-modal-sm" onClose={() => setCounter(null)}>
          <p className="cell-sub" style={{ marginTop: 0 }}>Find the customer's patient record (register them first if new).</p>
          <PatientPicker onPick={setCounter} />
        </Modal>
      )}
      {counter && counter !== 'pick' && <PrescribeModal patientId={counter._id} patient={counter} onClose={() => setCounter(null)} onDone={(rx) => { setCounter(null); open(rx._id); }} />}
    </div>
  );
}

// Price → (pay) → dispense.
function RxModal({ id, onClose }) {
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [lines, setLines] = useState({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data: r } = await hospitalService.getPrescription(id);
      setData(r.data);
      setLines(Object.fromEntries(r.data.prescription.items.map((it) => [it._id, {
        itemId: it.itemId || r.data.suggestions[it._id]?.[0]?._id || '', quantity: it.quantity || '', notAvailable: it.status === 'not_available',
      }])));
    } catch (e) { toast.error(errMsg(e)); onClose(); }
  }, [id, onClose]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive((evt) => { if (evt.prescriptionId === id || evt.kind === 'payment') load(); }, ['pharmacy', 'payment']);
  if (!data) return <Modal title="Prescription" onClose={onClose}><div className="sc-loading"><RiLoader4Line className="spin" /></div></Modal>;

  const { prescription: rx, bill, payBeforePharmacy, suggestions } = data;
  const editable = can.pharmacy(me) && ['pending', 'billed'].includes(rx.status);
  const setLine = (lid, k, v) => setLines((l) => ({ ...l, [lid]: { ...l[lid], [k]: v } }));
  const mustPay = payBeforePharmacy && !rx.admissionId && bill && bill.balance > 0;

  async function price() {
    setBusy(true);
    try {
      await hospitalService.billPrescription(id, rx.items.map((it) => ({ _id: it._id, ...lines[it._id], quantity: Number(lines[it._id].quantity) || 0 })));
      toast.success('Priced and added to the bill');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function dispense() {
    setBusy(true);
    try { await hospitalService.dispense(id); toast.success('Dispensed'); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!window.confirm('Cancel this prescription? Its charges come off the bill.')) return;
    try { const { data: r } = await hospitalService.cancelPrescription(id); toast.success(r.data.refundDue ? `Cancelled. Refund due: ${money(r.data.refundDue)}` : 'Cancelled'); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <Modal title={`${rx.rxNumber} · ${fullName(rx.patientId)}`} onClose={onClose}
      footer={<>
        {['pending', 'billed'].includes(rx.status) && can.prescribe(me) && <button type="button" className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={cancel}>Cancel prescription</button>}
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        {editable && <button type="button" className="btn btn-secondary" disabled={busy} onClick={price}>{rx.status === 'billed' ? 'Re-price' : 'Price & add to bill'}</button>}
        {rx.status === 'billed' && can.pharmacy(me) && <button type="button" className="btn btn-primary" disabled={busy || mustPay} title={mustPay ? 'Payment needed first' : undefined} onClick={dispense}>Dispense</button>}
      </>}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span className={`badge badge-${RX_STATUS[rx.status]?.badge}`}>{RX_STATUS[rx.status]?.label}</span>
        <span className="cell-sub" style={{ display: 'inline' }}>{rx.patientId.hospitalNumber} · by {rx.prescribedBy?.name || '—'} · {fmtDateTime(rx.createdAt)}</span>
        <Allergies patient={rx.patientId} />
      </div>
      {rx.notes && <div className="sc-note" style={{ marginBottom: 10 }}>{rx.notes}</div>}
      <div className="table-wrapper"><table className="table">
        <thead><tr><th>Prescribed</th><th>Give from stock</th><th>Qty</th><th className="num">Amount</th></tr></thead>
        <tbody>{rx.items.map((it) => {
          const l = lines[it._id] || {};
          const opts = suggestions[it._id] || [];
          const chosen = opts.find((o) => o._id === l.itemId);
          return (
            <tr key={it._id}>
              <td><span className="sc-strong">{it.drugName}</span><span className="cell-sub">{[it.dose, it.frequency, it.route, it.duration && `× ${it.duration}`].filter(Boolean).join(' ')}{it.instructions ? ` · ${it.instructions}` : ''}</span></td>
              <td>
                {editable ? (
                  <>
                    <select className="form-input form-select" aria-label="Stock item" disabled={l.notAvailable} value={l.itemId} onChange={(e) => setLine(it._id, 'itemId', e.target.value)}>
                      <option value="">— Choose —</option>
                      {opts.map((o) => <option key={o._id} value={o._id}>{o.name} {o.strength} ({o.form}) · {o.stock} {o.unit} · {money(o.sellingPrice)}</option>)}
                    </select>
                    {!opts.length && <span className="cell-sub">No match in stock. <Link to="/hospital/pharmacy?tab=stock">Add it</Link> or mark not available.</span>}
                    <label className="sc-check"><input type="checkbox" checked={l.notAvailable} onChange={(e) => setLine(it._id, 'notAvailable', e.target.checked)} /> Not available (buy outside)</label>
                  </>
                ) : it.status === 'not_available' ? <span className="cell-sub">Not available</span> : (chosen ? `${chosen.name} ${chosen.strength || ''}` : '✓')}
              </td>
              <td>{editable ? <input className="form-input" type="number" min="1" aria-label="Quantity" disabled={l.notAvailable} value={l.quantity} onChange={(e) => setLine(it._id, 'quantity', e.target.value)} style={{ maxWidth: 90 }} /> : it.quantity}</td>
              <td className="num">{it.amount ? money(it.amount) : chosen && !l.notAvailable && l.quantity ? <span className="cell-sub">{money(chosen.sellingPrice * l.quantity)}</span> : '—'}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      {bill && (
        <div className={`sc-note ${mustPay ? 'warn' : ''}`} style={{ marginTop: 10 }}>
          Bill <Link to={`/hospital/bills/${bill._id}`}>{bill.billNumber}</Link>: {bill.balance > 0 ? `${money(bill.balance)} still to pay` : 'paid'}{bill.hmo?.name ? ` (${bill.hmo.name})` : ''}.
          {mustPay && ' The cashier must collect payment before you dispense.'}
        </div>
      )}
      {rx.status === 'dispensed' && <p className="cell-sub">Dispensed by {rx.dispensedBy?.name} · {fmtDateTime(rx.dispensedAt)}</p>}
    </Modal>
  );
}

function Stock({ canEdit }) {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(params.get('filter') || '');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    try { const { data } = await hospitalService.getDrugs({ filter: filter || undefined, search: search || undefined }); setRows(data.data); } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [filter, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useHospitalLive(load, ['pharmacy']);
  const value = rows.reduce((s, r) => s + (r.value || 0), 0);

  return (
    <div className="card">
      <div className="sc-filters">
        <div className="sc-search"><RiSearchLine /><input placeholder="Search drugs…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="form-input form-select" aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All drugs</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="expiring">Expiring in 60 days</option>
        </select>
        {canEdit && <button className="btn btn-primary" onClick={() => setModal('new')}><RiAddLine /> Add drug</button>}
      </div>
      {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : rows.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><RiCapsuleLine /></div><h3>No drugs</h3><p>Add the drugs and consumables you stock, with batch numbers and expiry dates.</p></div>
      ) : (
        <>
          <div className="table-wrapper"><table className="table">
            <thead><tr><th>Drug</th><th>Form</th><th className="num">In stock</th><th>Next expiry</th><th className="num">Price</th>{canEdit && <th />}</tr></thead>
            <tbody>{rows.map((d) => {
              const soon = d.nextExpiry && new Date(d.nextExpiry) < new Date(Date.now() + 60 * 86400000);
              return (
                <tr key={d._id} className={canEdit ? 'sc-row' : ''} onClick={() => canEdit && setModal({ edit: d })}>
                  <td><span className="sc-strong">{d.name} {d.strength}</span><span className="cell-sub">{d.genericName}{!d.active ? ' · inactive' : ''}</span></td>
                  <td>{d.form}<span className="cell-sub">per {d.unit}</span></td>
                  <td className="num">{d.low ? <span className="sc-owing">{d.stock}</span> : d.stock}<span className="cell-sub">reorder at {d.reorderLevel}</span>{d.expiredQty > 0 && <span className="cell-sub sc-owing">{d.expiredQty} expired</span>}</td>
                  <td>{d.nextExpiry ? <span className={soon ? 'sc-owing' : ''}>{fmtDate(d.nextExpiry)}</span> : '—'}</td>
                  <td className="num">{money(d.sellingPrice)}</td>
                  {canEdit && <td className="num" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal({ receive: d })}><RiInboxArchiveLine /> Receive</button>{' '}
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ card: d })}>Stock card</button>
                  </td>}
                </tr>
              );
            })}</tbody>
          </table></div>
          <div className="sc-table-foot"><span>{rows.length} item(s) · stock value at cost {money(value)}</span></div>
        </>
      )}
      {(modal === 'new' || modal?.edit) && <DrugModal drug={modal?.edit} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal?.receive && <ReceiveModal drug={modal.receive} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal?.card && <StockCardModal drug={modal.card} onClose={() => setModal(null)} onChanged={load} />}
    </div>
  );
}

function DrugModal({ drug, onClose, onDone }) {
  const [form, setForm] = useState({
    name: drug?.name || '', genericName: drug?.genericName || '', form: drug?.form || 'tablet', strength: drug?.strength || '', unit: drug?.unit || 'tab',
    sellingPrice: drug?.sellingPrice ?? '', costPrice: drug?.costPrice ?? '', reorderLevel: drug?.reorderLevel ?? 10, active: drug?.active ?? true,
    openingStock: '', batchNo: '', expiresAt: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (drug) await hospitalService.updateDrug(drug._id, form); else await hospitalService.createDrug(form);
      toast.success('Drug saved');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={drug ? `Edit ${drug.name}` : 'Add drug'} onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save</button></>}>
      <div className="form-grid-3">
        <Field label="Name *"><input className="form-input" required placeholder="Coartem" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Generic name"><input className="form-input" placeholder="Artemether/lumefantrine" value={form.genericName} onChange={(e) => set('genericName', e.target.value)} /></Field>
        <Field label="Strength"><input className="form-input" placeholder="80/480mg" value={form.strength} onChange={(e) => set('strength', e.target.value)} /></Field>
        <Field label="Form">
          <select className="form-input form-select" value={form.form} onChange={(e) => set('form', e.target.value)}>{DRUG_FORMS.map((f) => <option key={f}>{f}</option>)}</select>
        </Field>
        <Field label="Sold per" hint="(tab, bottle, vial…)"><input className="form-input" value={form.unit} onChange={(e) => set('unit', e.target.value)} /></Field>
        <Field label="Reorder at"><input className="form-input" type="number" min="0" value={form.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)} /></Field>
        <Field label="Selling price (₦)"><input className="form-input" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} /></Field>
        <Field label="Cost price (₦)"><input className="form-input" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} /></Field>
        {drug && <label className="sc-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> In use</label>}
        {!drug && (
          <>
            <Field label="Opening stock"><input className="form-input" type="number" min="0" value={form.openingStock} onChange={(e) => set('openingStock', e.target.value)} /></Field>
            <Field label="Batch no."><input className="form-input" value={form.batchNo} onChange={(e) => set('batchNo', e.target.value)} /></Field>
            <Field label="Expiry date"><input className="form-input" type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
          </>
        )}
      </div>
    </Modal>
  );
}

function ReceiveModal({ drug, onClose, onDone }) {
  const [form, setForm] = useState({ quantity: '', batchNo: '', expiresAt: '', unitCost: drug.costPrice || '', supplier: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await hospitalService.receiveDrug(drug._id, form); toast.success(`${form.quantity} ${drug.unit} received`); onDone(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Receive stock · ${drug.name} ${drug.strength || ''}`} size="sc-modal-sm" onClose={onClose} onSubmit={submit}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>Receive</button></>}>
      <div className="form-grid-2">
        <Field label={`Quantity (${drug.unit})`}><input className="form-input" type="number" min="1" required value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
        <Field label="Expiry date"><input className="form-input" type="date" required value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
        <Field label="Batch no."><input className="form-input" value={form.batchNo} onChange={(e) => set('batchNo', e.target.value)} /></Field>
        <Field label="Cost per unit (₦)"><input className="form-input" type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => set('unitCost', e.target.value)} /></Field>
        <Field label="Supplier" span><input className="form-input" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const MOVE_LABEL = { received: 'Received', dispensed: 'Dispensed', returned: 'Returned', adjusted: 'Adjusted', expired: 'Expired (written off)', damaged: 'Damaged (written off)' };

function StockCardModal({ drug, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [adj, setAdj] = useState({ batchId: '', quantity: '', type: 'adjusted', note: '' });
  const load = useCallback(() => hospitalService.getDrugMoves(drug._id).then(({ data: r }) => setData(r.data)).catch((e) => toast.error(errMsg(e))), [drug._id]);
  useEffect(() => { load(); }, [load]);
  async function adjust(e) {
    e.preventDefault();
    try {
      await hospitalService.adjustDrug(drug._id, { ...adj, quantity: Number(adj.quantity) });
      toast.success('Stock updated');
      setAdj({ batchId: '', quantity: '', type: 'adjusted', note: '' });
      load(); onChanged();
    } catch (err) { toast.error(errMsg(err)); }
  }
  return (
    <Modal title={`Stock card · ${drug.name} ${drug.strength || ''}`} onClose={onClose}>
      {!data ? <div className="sc-loading"><RiLoader4Line className="spin" /></div> : (
        <>
          <div className="sc-card-title">Batches</div>
          {data.item.batches.length === 0 ? <p className="cell-sub">No stock.</p> : (
            <ul className="sc-list">{data.item.batches.map((b) => (
              <li key={b._id}><div><span className="sc-strong">{b.batchNo}</span><span className="cell-sub">Expires {b.expiresAt ? fmtDate(b.expiresAt) : '—'}{b.expiresAt && new Date(b.expiresAt) < new Date() ? ' · EXPIRED' : ''}</span></div><b>{b.quantity} {data.item.unit}</b></li>
            ))}</ul>
          )}
          <form onSubmit={adjust} className="form-grid-3" style={{ marginTop: 12 }}>
            <Field label="Batch">
              <select className="form-input form-select" value={adj.batchId} onChange={(e) => setAdj({ ...adj, batchId: e.target.value })}>
                <option value="">First batch</option>{data.item.batches.map((b) => <option key={b._id} value={b._id}>{b.batchNo} ({b.quantity})</option>)}
              </select>
            </Field>
            <Field label="Change" hint="(− to remove)"><input className="form-input" type="number" required value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} /></Field>
            <Field label="Reason">
              <select className="form-input form-select" value={adj.type} onChange={(e) => setAdj({ ...adj, type: e.target.value })}>
                <option value="adjusted">Stock count correction</option><option value="expired">Expired</option><option value="damaged">Damaged</option>
              </select>
            </Field>
            <Field label="Note" span><input className="form-input" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></Field>
            <div><button className="btn btn-secondary">Update stock</button></div>
          </form>
          <div className="sc-card-title" style={{ marginTop: 16 }}>Movements</div>
          <div className="table-wrapper"><table className="table">
            <thead><tr><th>When</th><th>What</th><th className="num">Qty</th><th className="num">Balance</th><th>By</th></tr></thead>
            <tbody>{data.moves.map((m) => (
              <tr key={m._id}><td>{fmtDateTime(m.createdAt)}</td><td>{MOVE_LABEL[m.type]}{m.batchNo ? ` · ${m.batchNo}` : ''}{m.supplier ? ` · ${m.supplier}` : ''}{m.note ? ` · ${m.note}` : ''}</td>
                <td className="num">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td><td className="num">{m.balanceAfter}</td><td>{m.by?.name || '—'}</td></tr>
            ))}</tbody>
          </table></div>
        </>
      )}
    </Modal>
  );
}

