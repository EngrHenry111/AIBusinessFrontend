import { useState, useEffect, useCallback, Fragment } from 'react';
import toast from 'react-hot-toast';
import { RiBankCard2Line, RiAddLine, RiLoader4Line, RiCloseLine, RiDeleteBinLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, fmtDate, todayYmd } from './groupUtils';
import './Group.css';

const STATUS = {
  matched: { label: 'Matched', badge: 'success' },
  short: { label: 'Short settled', badge: 'danger' },
  over: { label: 'Over settled', badge: 'info' },
  unsettled: { label: 'Not settled', badge: 'danger' },
  pending: { label: 'Awaiting bank', badge: 'warning' },
};
const minusDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

export default function PosSettlement() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState(minusDays(todayYmd(), 13));
  const [to, setTo] = useState(todayYmd());
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { groupService.getBranches().then(({ data: r }) => setBranches((r.data || []).filter((b) => b.status === 'active'))).catch(() => {}); }, []);
  const load = useCallback(() => {
    groupService.posList({ from, to, branchId: branchId || undefined })
      .then(({ data: r }) => setData(r))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load POS settlements'));
  }, [from, to, branchId]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const formBranch = branches.find((b) => b._id === form?.branchId);

  async function save() {
    setBusy(true);
    try {
      await groupService.posCreate(form);
      toast.success('Settlement recorded');
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setBusy(false); }
  }
  async function remove(id) {
    if (!window.confirm('Delete this settlement entry?')) return;
    try { await groupService.posDelete(id); toast.success('Deleted'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Could not delete'); }
  }

  const t = data?.totals || {};
  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiBankCard2Line style={{ verticalAlign: '-3px' }} /> POS Settlement</h1>
            <p className="muted">Check that the bank actually paid every naira taken on POS. Record each settlement from the bank statement or alert.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setForm({ branchId: branchId || branches[0]?._id || '', date: minusDays(todayYmd(), 1), settledOn: todayYmd() })}><RiAddLine /> Record settlement</button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="grp-filters">
          <select className="form-input form-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <input type="date" className="form-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="form-input" value={to} min={from} max={todayYmd()} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="grp-recon">
          <div><div className="l">POS recorded on reports</div><div className="v">{naira(t.recorded)}</div></div>
          <div><div className="l">Settled by banks</div><div className="v">{naira(t.settled)}</div></div>
          <div><div className="l">Bank charges</div><div className="v">{naira(t.charges)}</div></div>
          <div className={t.unsettled > 0 ? 'verdict short' : ''}><div className="l">Not settled yet</div><div className={`v ${t.unsettled > 0 ? 'grp-neg' : ''}`}>{naira(t.unsettled)}</div></div>
          <div className={t.short > 0 ? 'verdict short' : ''}><div className="l">Short settled</div><div className={`v ${t.short > 0 ? 'grp-neg' : ''}`}>{naira(t.short)}</div></div>
        </div>
      </div>

      <div className="card card-pad">
        {!data ? <div style={{ textAlign: 'center', fontSize: 26 }}><RiLoader4Line className="spin" /></div> : !data.data.length ? <p className="muted" style={{ textAlign: 'center', padding: 30 }}>No POS sales or settlements in this period.</p> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th /><th>Trading day</th><th>Branch</th><th style={{ textAlign: 'right' }}>POS recorded</th><th style={{ textAlign: 'right' }}>Settled + charges</th><th style={{ textAlign: 'right' }}>Difference</th><th>Status</th></tr></thead>
              <tbody>
                {data.data.map((r) => {
                  const k = `${r.branchId}|${r.date}`;
                  const s = STATUS[r.status];
                  return (
                    <Fragment key={k}>
                      <tr style={{ cursor: r.settlements.length ? 'pointer' : 'default' }} onClick={() => r.settlements.length && setOpen((o) => ({ ...o, [k]: !o[k] }))}>
                        <td style={{ width: 24 }}>{r.settlements.length ? (open[k] ? <RiArrowDownSLine /> : <RiArrowRightSLine />) : null}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                        <td>{r.branchName}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(r.recorded)}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{r.settlements.length ? naira(r.settled + r.charges) : '—'}</td>
                        <td className={`grp-num ${r.difference < -100 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>{r.settlements.length ? naira(r.difference) : '—'}</td>
                        <td><span className={`badge badge-${s.badge}`}>{s.label}</span></td>
                      </tr>
                      {open[k] && r.settlements.map((x) => (
                        <tr key={x._id} style={{ background: 'var(--bg-secondary)' }}>
                          <td />
                          <td colSpan={2} style={{ fontSize: 12 }}>{[x.terminalId && `Terminal ${x.terminalId}`, x.bank, x.reference, x.settledOn && `paid ${fmtDate(x.settledOn)}`].filter(Boolean).join(' · ') || 'Settlement'}</td>
                          <td />
                          <td className="grp-num" style={{ textAlign: 'right', fontSize: 12 }}>{naira(x.settledAmount)}{x.charges ? ` + ${naira(x.charges)} charges` : ''}</td>
                          <td colSpan={2} style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(x._id)} aria-label="Delete settlement"><RiDeleteBinLine /></button></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Record POS settlement</h2><button className="btn btn-ghost btn-icon" onClick={() => setForm(null)} aria-label="Close"><RiCloseLine /></button></div>
            <div className="modal-body">
              <div className="grp-form-grid">
                <div className="form-group"><label className="form-label">Branch</label>
                  <select className="form-input form-select" value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
                </div>
                <div className="form-group"><label className="form-label">Trading day (when sales happened)</label><input type="date" className="form-input" value={form.date} max={todayYmd()} onChange={(e) => set('date', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Terminal</label>
                  {formBranch?.posTerminals?.length ? (
                    <select className="form-input form-select" value={form.terminalId || ''} onChange={(e) => {
                      const term = formBranch.posTerminals.find((x) => x.terminalId === e.target.value);
                      setForm((f) => ({ ...f, terminalId: e.target.value, bank: term?.bank || f.bank }));
                    }}>
                      <option value="">All terminals</option>{formBranch.posTerminals.map((x) => <option key={x.terminalId} value={x.terminalId}>{x.label || x.terminalId}{x.bank ? ` · ${x.bank}` : ''}</option>)}
                    </select>
                  ) : <input className="form-input" value={form.terminalId || ''} onChange={(e) => set('terminalId', e.target.value)} placeholder="Terminal ID (optional)" />}
                </div>
                <div className="form-group"><label className="form-label">Bank</label><input className="form-input" value={form.bank || ''} onChange={(e) => set('bank', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Amount settled (₦)</label><input type="number" className="form-input" value={form.settledAmount || ''} onChange={(e) => set('settledAmount', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Charges deducted (₦)</label><input type="number" className="form-input" value={form.charges || ''} onChange={(e) => set('charges', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Paid into account on</label><input type="date" className="form-input" value={form.settledOn || ''} onChange={(e) => set('settledOn', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Reference</label><input className="form-input" value={form.reference || ''} onChange={(e) => set('reference', e.target.value)} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
