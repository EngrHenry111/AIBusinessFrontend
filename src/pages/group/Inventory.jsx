import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiArchiveLine, RiAddLine, RiLoader4Line, RiCloseLine, RiInboxArchiveLine, RiExchangeLine, RiScales2Line, RiHistoryLine, RiEditLine,
} from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, nairaShort, fmtDateTime } from './groupUtils';
import './Group.css';

const MOVE_LABELS = {
  opening: 'Opening stock', receive: 'Received', sale: 'Sold', sale_reversal: 'Sale returned', adjust: 'Adjusted',
  transfer_in: 'Transfer in', transfer_out: 'Transfer out', count: 'Stock count',
};
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 820 : 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>{title}</h2><button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default function Inventory() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { kind, item }
  const [form, setForm] = useState({});
  const [moves, setMoves] = useState(null);
  const [counts, setCounts] = useState({});
  const [countResult, setCountResult] = useState(null);

  useEffect(() => {
    groupService.getBranches().then(({ data }) => {
      const list = (data.data || []).filter((b) => b.status === 'active');
      setBranches(list);
      const firstStore = list.find((b) => b.businessLine !== 'filling_station') || list[0];
      if (firstStore) setBranchId(firstStore._id);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    groupService.getStock(branchId ? { branchId } : {})
      .then(({ data }) => { setItems(data.data || []); setSummary(data.summary || {}); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load stock'))
      .finally(() => setLoading(false));
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  const open = (kind, item = null, init = {}) => { setForm(init); setModal({ kind, item }); };
  const close = () => { setModal(null); setForm({}); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const branch = branches.find((b) => b._id === branchId);

  async function run(fn, success) {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(success || r?.data?.message || 'Saved');
      close();
      load();
      return r;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong');
      return null;
    } finally { setBusy(false); }
  }

  async function showHistory(item) {
    setMoves({ item, list: null });
    try {
      const { data } = await groupService.stockMoves({ itemId: item._id, limit: 200 });
      setMoves({ item, list: data.data || [] });
    } catch { setMoves({ item, list: [] }); }
  }

  async function submitCount() {
    const list = Object.entries(counts).filter(([, v]) => v !== '' && v != null).map(([itemId, countedQty]) => ({ itemId, countedQty }));
    if (!list.length) { toast.error('Enter at least one counted quantity'); return; }
    setBusy(true);
    try {
      const { data } = await groupService.countStock({ branchId, counts: list, note: form.note });
      setCountResult(data.data);
      setCounts({});
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the count');
    } finally { setBusy(false); }
  }

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiArchiveLine style={{ verticalAlign: '-3px' }} /> Inventory</h1>
            <p className="muted">Stock at each branch. Items sold on daily reports come off automatically; deliveries, transfers and counts are recorded here.</p>
          </div>
          <div className="grp-row">
            <button className="btn btn-secondary" disabled={!branchId || !items.length} onClick={() => { setCounts({}); open('count'); }}><RiScales2Line /> Stock count</button>
            <button className="btn btn-primary" disabled={!branchId} onClick={() => open('add', null, { unit: 'pcs' })}><RiAddLine /> Add item</button>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="grp-filters">
          <select className="form-input form-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className="grp-recon" style={{ marginBottom: 16 }}>
          <div><div className="l">Items</div><div className="v">{summary.items || 0}</div></div>
          <div><div className="l">Stock value (at cost)</div><div className="v">{nairaShort(summary.stockValue)}</div></div>
          <div className={summary.lowStock ? 'verdict short' : ''}><div className="l">Low stock</div><div className={`v ${summary.lowStock ? 'grp-neg' : ''}`}>{summary.lowStock || 0}</div></div>
          <div className={summary.outOfStock ? 'verdict short' : ''}><div className="l">Out of stock</div><div className={`v ${summary.outOfStock ? 'grp-neg' : ''}`}>{summary.outOfStock || 0}</div></div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>
        ) : !items.length ? (
          <p className="muted" style={{ textAlign: 'center', padding: 30 }}>{branchId ? 'No stock items yet. Add the items this branch sells.' : 'Choose a branch to add stock.'}</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>{!branchId && <th>Branch</th>}
                  <th style={{ textAlign: 'right' }}>In stock</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Margin</th><th style={{ textAlign: 'right' }}>Value</th><th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const margin = it.sellingPrice ? Math.round(((it.sellingPrice - it.costPrice) / it.sellingPrice) * 1000) / 10 : null;
                  return (
                    <tr key={it._id}>
                      <td><div style={{ fontWeight: 600 }}>{it.name}</div>{it.sku && <div className="muted grp-mono">{it.sku}</div>}</td>
                      {!branchId && <td className="muted">{it.branchName}</td>}
                      <td className="grp-num" style={{ textAlign: 'right' }}>
                        <span className={it.quantity <= 0 ? 'grp-neg' : ''} style={{ fontWeight: 600 }}>{it.quantity.toLocaleString()}</span> <span className="muted">{it.unit}</span>
                        {it.low && <div><span className={`badge ${it.quantity <= 0 ? 'badge-danger' : 'badge-warning'}`}>{it.quantity <= 0 ? 'Out' : 'Low'}</span></div>}
                      </td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(it.costPrice)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(it.sellingPrice)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{margin === null ? '—' : `${margin}%`}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(it.stockValue)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" title="Receive delivery" onClick={() => open('receive', it, { unitCost: it.costPrice })}><RiInboxArchiveLine /> Receive</button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Transfer to another branch" onClick={() => open('transfer', it)}><RiExchangeLine /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Adjust" onClick={() => open('adjust', it)}><RiScales2Line /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => open('edit', it, { ...it })}><RiEditLine /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="History" onClick={() => showHistory(it)}><RiHistoryLine /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.kind === 'add' && (
        <Modal title={`Add stock item · ${branch?.name || ''}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => groupService.createStock({ ...form, branchId }), 'Item added')}>Add item</button>
        </>}>
          <div className="grp-form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Item name</label><input className="form-input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dangote Cement 50kg" /></div>
            <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit || ''} onChange={(e) => set('unit', e.target.value)} placeholder="bags, lengths, sheets…" /></div>
            <div className="form-group"><label className="form-label">Department</label>
              <select className="form-input form-select" value={form.department || ''} onChange={(e) => set('department', e.target.value)}>
                <option value="">—</option>{branch?.departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Cost price (₦)</label><input type="number" className="form-input" value={form.costPrice || ''} onChange={(e) => set('costPrice', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Selling price (₦)</label><input type="number" className="form-input" value={form.sellingPrice || ''} onChange={(e) => set('sellingPrice', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Opening quantity</label><input type="number" className="form-input" value={form.openingQty || ''} onChange={(e) => set('openingQty', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Reorder when at or below</label><input type="number" className="form-input" value={form.reorderLevel || ''} onChange={(e) => set('reorderLevel', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">SKU / code (optional)</label><input className="form-input" value={form.sku || ''} onChange={(e) => set('sku', e.target.value)} /></div>
          </div>
        </Modal>
      )}

      {modal?.kind === 'edit' && (
        <Modal title={`Edit · ${modal.item.name}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => groupService.updateStock(modal.item._id, form), 'Item updated')}>Save</button>
        </>}>
          <div className="grp-form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Item name</label><input className="form-input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit || ''} onChange={(e) => set('unit', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Cost price (₦)</label><input type="number" className="form-input" value={form.costPrice ?? ''} onChange={(e) => set('costPrice', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Selling price (₦)</label><input type="number" className="form-input" value={form.sellingPrice ?? ''} onChange={(e) => set('sellingPrice', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Reorder level</label><input type="number" className="form-input" value={form.reorderLevel ?? ''} onChange={(e) => set('reorderLevel', e.target.value)} /></div>
          </div>
          <label className="grp-row" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={form.active !== false} onChange={(e) => set('active', e.target.checked)} /> Active (untick to hide an item you no longer sell)</label>
          <p className="muted" style={{ fontSize: 12 }}>Quantity can only change through receiving, sales, transfers, adjustments or a stock count, so every change is on record.</p>
        </Modal>
      )}

      {modal?.kind === 'receive' && (
        <Modal title={`Receive delivery · ${modal.item.name}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => groupService.receiveStock(modal.item._id, form), 'Delivery recorded')}>Record delivery</button>
        </>}>
          <div className="grp-form-grid">
            <div className="form-group"><label className="form-label">Quantity received ({modal.item.unit})</label><input type="number" className="form-input" value={form.qty || ''} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
            <div className="form-group"><label className="form-label">Cost per {modal.item.unit} (₦)</label><input type="number" className="form-input" value={form.unitCost ?? ''} onChange={(e) => set('unitCost', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Supplier</label><input className="form-input" value={form.supplier || ''} onChange={(e) => set('supplier', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Waybill / invoice no.</label><input className="form-input" value={form.reference || ''} onChange={(e) => set('reference', e.target.value)} /></div>
          </div>
          {num(form.qty) > 0 && <p className="muted" style={{ fontSize: 13 }}>Value: <strong>{naira(num(form.qty) * num(form.unitCost))}</strong>. The item's cost price becomes the weighted average of old and new stock.</p>}
        </Modal>
      )}

      {modal?.kind === 'adjust' && (
        <Modal title={`Adjust · ${modal.item.name}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => groupService.adjustStock(modal.item._id, form), 'Stock adjusted')}>Save adjustment</button>
        </>}>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Currently {modal.item.quantity.toLocaleString()} {modal.item.unit}. Use a minus sign to remove (e.g. -3 for damaged bags).</p>
          <div className="grp-form-grid">
            <div className="form-group"><label className="form-label">Add / remove</label><input type="number" className="form-input" value={form.qty || ''} onChange={(e) => set('qty', e.target.value)} placeholder="-3" autoFocus /></div>
            <div className="form-group"><label className="form-label">Reason</label><input className="form-input" value={form.reason || ''} onChange={(e) => set('reason', e.target.value)} placeholder="Damaged, expired, returned…" /></div>
          </div>
        </Modal>
      )}

      {modal?.kind === 'transfer' && (
        <Modal title={`Transfer · ${modal.item.name}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => groupService.transferStock(modal.item._id, form))}>Transfer</button>
        </>}>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{modal.item.quantity.toLocaleString()} {modal.item.unit} available at {modal.item.branchName || branch?.name}.</p>
          <div className="grp-form-grid">
            <div className="form-group"><label className="form-label">To branch</label>
              <select className="form-input form-select" value={form.toBranchId || ''} onChange={(e) => set('toBranchId', e.target.value)}>
                <option value="">Select…</option>{branches.filter((b) => b._id !== modal.item.branchId).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Quantity ({modal.item.unit})</label><input type="number" className="form-input" value={form.qty || ''} onChange={(e) => set('qty', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Note (driver, truck no.)</label><input className="form-input" value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></div>
          </div>
        </Modal>
      )}

      {modal?.kind === 'count' && (
        <Modal wide title={`Stock count · ${branch?.name || ''}`} onClose={close} footer={<>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submitCount}>{busy ? <RiLoader4Line className="spin" /> : null} Save count</button>
        </>}>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Count what is physically on the shelf and in the yard. Leave an item empty if you didn't count it. Differences are recorded with their value.</p>
          <div className="table-wrapper">
            <table className="grp-lines">
              <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Books say</th><th>Counted</th><th style={{ textAlign: 'right' }}>Difference</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
              <tbody>
                {items.map((it) => {
                  const v = counts[it._id];
                  const diff = v === undefined || v === '' ? null : num(v) - it.quantity;
                  return (
                    <tr key={it._id}>
                      <td>{it.name}</td>
                      <td className="calc">{it.quantity.toLocaleString()} {it.unit}</td>
                      <td><input type="number" className="form-input" style={{ width: 110 }} value={v ?? ''} onChange={(e) => setCounts((c) => ({ ...c, [it._id]: e.target.value }))} /></td>
                      <td className={`calc ${diff < 0 ? 'grp-neg' : ''}`}>{diff === null ? '—' : diff === 0 ? 'Matches' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}</td>
                      <td className={`calc ${diff < 0 ? 'grp-neg' : ''}`}>{diff ? naira(diff * it.costPrice) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Counted by / note</label><input className="form-input" value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Month-end count by Ade and Bisi" /></div>
        </Modal>
      )}

      {countResult && (
        <Modal title="Stock count saved" onClose={() => setCountResult(null)} footer={<button className="btn btn-primary" onClick={() => setCountResult(null)}>Done</button>}>
          <div className={`grp-alert ${countResult.lossValue < 0 ? 'high' : ''}`} style={{ marginBottom: 12 }}>
            {countResult.lossValue < 0 ? <>Missing stock worth <strong>{naira(Math.abs(countResult.lossValue))}</strong> at cost.</> : 'No stock is missing.'}
          </div>
          {countResult.results.filter((r) => r.difference).map((r) => (
            <div key={r.itemId} className="grp-row" style={{ fontSize: 13, padding: '4px 0' }}>
              <span>{r.name}</span><span className="grp-spacer" />
              <span className={r.difference < 0 ? 'grp-neg' : ''}>{r.difference > 0 ? '+' : ''}{r.difference} {r.unit} · {naira(r.value)}</span>
            </div>
          ))}
        </Modal>
      )}

      {moves && (
        <Modal wide title={`History · ${moves.item.name}`} onClose={() => setMoves(null)}>
          {!moves.list ? <div style={{ textAlign: 'center', fontSize: 24 }}><RiLoader4Line className="spin" /></div> : !moves.list.length ? <p className="muted">No movements yet.</p> : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>When</th><th>What</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Balance</th><th>Details</th></tr></thead>
                <tbody>
                  {moves.list.map((m) => (
                    <tr key={m._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDateTime(m.date)}</td>
                      <td>{MOVE_LABELS[m.type] || m.type}</td>
                      <td className={`grp-num ${m.qty < 0 ? 'grp-neg' : 'grp-pos'}`} style={{ textAlign: 'right' }}>{m.qty > 0 ? '+' : ''}{m.qty.toLocaleString()}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{m.balanceAfter?.toLocaleString()}</td>
                      <td style={{ fontSize: 12 }} className="muted">{[m.supplier, m.reference, m.note, m.type === 'count' ? `books ${m.systemQty}, counted ${m.countedQty}` : '', m.byName].filter(Boolean).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
