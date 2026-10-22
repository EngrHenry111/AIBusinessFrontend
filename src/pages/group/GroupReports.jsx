import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiClipboardLine, RiAddLine, RiCheckDoubleLine, RiLoader4Line, RiCheckLine, RiCloseLine, RiTimeLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { naira, fmtDate, STATUS_META, isOwner } from './groupUtils';
import './Group.css';

export function ApprovalPipeline({ report }) {
  const steps = report.approvals?.length ? report.approvals : [];
  if (report.status === 'draft') return <span className="muted">Not submitted</span>;
  return (
    <div className="grp-pipeline">
      {steps.map((s, i) => {
        const current = s.status === 'pending'
          && ((s.level === 'branch_manager' && report.status === 'pending_branch') || (s.level === 'owner' && report.status === 'pending_owner'));
        const cls = s.status === 'approved' ? 'done' : s.status === 'rejected' ? 'rejected' : current ? 'current' : '';
        const Icon = s.status === 'approved' ? RiCheckLine : s.status === 'rejected' ? RiCloseLine : RiTimeLine;
        return (
          <span key={s.level} className="grp-row" style={{ gap: 6 }}>
            <span className={`grp-step ${cls}`} title={s.byName ? `${s.byName}` : ''}><Icon /> {s.level === 'owner' ? 'Owner' : 'Branch Mgr'}</span>
            {i < steps.length - 1 && <span className="muted">→</span>}
          </span>
        );
      })}
      <span className="muted">→</span>
      <span className={`grp-step ${report.status === 'approved' ? 'done' : ''}`}>Ledger</span>
    </div>
  );
}

export default function GroupReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const [branches, setBranches] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const filters = {
    branchId: params.get('branchId') || '',
    status: params.get('status') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
  };

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    groupService.getBranches().then(({ data }) => setBranches(data.data || [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    const q = { ...filters, limit: 300 };
    Object.keys(q).forEach((k) => { if (!q[k]) delete q[k]; });
    if (tab === 'awaiting') q.awaiting = 'me';
    groupService.getReports(q)
      .then(({ data }) => setReports(data.data || []))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load reports'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.branchId, filters.status, filters.from, filters.to]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => reports.filter((r) => r.status !== 'rejected').reduce((t, r) => ({
    sales: t.sales + (r.totals?.expectedSales || 0),
    variance: t.variance + (r.totals?.variance || 0),
  }), { sales: 0, variance: 0 }), [reports]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectable = reports.filter((r) => r.status.startsWith('pending'));

  async function bulkApprove() {
    if (!selected.size) return;
    if (!window.confirm(`Give final approval to ${selected.size} report(s)? They will be posted to the approved sales ledger.`)) return;
    setBusy(true);
    try {
      const { data } = await groupService.bulkApprove([...selected]);
      toast.success(`${data.data.approved} report(s) approved`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Bulk approval failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiClipboardLine style={{ verticalAlign: '-3px' }} /> Daily Department Reports</h1>
            <p className="muted">Each department reports its sales. The branch manager checks it, then the owner gives final approval.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/group/reports/new')} disabled={!branches.length}>
            <RiAddLine /> New report
          </button>
        </div>
      </div>

      <div className="admin-tabs" style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['all', 'All reports'], ['awaiting', 'Awaiting my approval']].map(([k, l]) => (
          <button key={k} className="btn btn-sm" onClick={() => setParam('tab', k === 'all' ? '' : k)}
            style={{ background: tab === k ? 'var(--bg-card)' : 'transparent', boxShadow: tab === k ? 'var(--shadow-sm)' : 'none', color: tab === k ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {l}
          </button>
        ))}
      </div>

      <div className="card card-pad">
        <div className="grp-filters">
          <select className="form-input form-select" value={filters.branchId} onChange={(e) => setParam('branchId', e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          {tab === 'all' && (
            <select className="form-input form-select" value={filters.status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Any status</option>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          )}
          <input type="date" className="form-input" value={filters.from} onChange={(e) => setParam('from', e.target.value)} title="From" />
          <input type="date" className="form-input" value={filters.to} onChange={(e) => setParam('to', e.target.value)} title="To" />
          <span className="grp-spacer" />
          <span className="muted" style={{ fontSize: 13 }}>
            {reports.length} reports · <strong className="grp-num" style={{ color: 'var(--text-primary)' }}>{naira(totals.sales)}</strong>
            {totals.variance < -1000 && <> · <span className="grp-neg">short {naira(Math.abs(totals.variance))}</span></>}
          </span>
          {isOwner(user) && selected.size > 0 && (
            <button className="btn btn-primary btn-sm" onClick={bulkApprove} disabled={busy}><RiCheckDoubleLine /> Approve {selected.size}</button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 28 }}><RiLoader4Line className="spin" /></div>
        ) : reports.length === 0 ? (
          <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
            <p className="muted">{tab === 'awaiting' ? 'Nothing is waiting for your approval.' : 'No reports match these filters.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {isOwner(user) && (
                    <th style={{ width: 32 }}>
                      <input type="checkbox" aria-label="Select all pending"
                        checked={selectable.length > 0 && selected.size === selectable.length}
                        onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map((r) => r._id)) : new Set())} />
                    </th>
                  )}
                  <th>Date</th><th>Branch / Department</th><th>Reference</th>
                  <th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Variance</th>
                  <th>Approval</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const meta = STATUS_META[r.status] || {};
                  return (
                    <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/group/reports/${r._id}`)}>
                      {isOwner(user) && (
                        <td onClick={(e) => e.stopPropagation()}>
                          {r.status.startsWith('pending') && <input type="checkbox" checked={selected.has(r._id)} onChange={() => toggle(r._id)} aria-label="Select report" />}
                        </td>
                      )}
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.reportDate)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.branchName}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {r.department}{r.shift?.name ? ` · ${r.shift.name}${r.shift.start ? ` ${r.shift.start}–${r.shift.end}` : ''}` : ''}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {(r.attendants?.length || r.attendantName) ? <>On duty: <strong style={{ color: 'var(--text-secondary)' }}>{(r.attendants?.length ? r.attendants : [r.attendantName]).join(', ')}</strong>{r.onDuty?.length ? ` +${r.onDuty.length}` : ''} · </> : null}
                          by {r.preparedByName || '—'}
                        </div>
                        {r.totals?.meterGapLitres >= 1 && <div className="grp-neg" style={{ fontSize: 11 }}>Meter gap {Math.round(r.totals.meterGapLitres).toLocaleString()} L</div>}
                      </td>
                      <td className="grp-mono">{r.ledgerNumber || r.referenceNumber}</td>
                      <td className="grp-num" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(r.totals?.expectedSales)}</td>
                      <td className={`grp-num ${r.totals?.variance < -1000 ? 'grp-neg' : ''}`} style={{ textAlign: 'right' }}>
                        {Math.abs(r.totals?.variance || 0) < 1000 ? 'Balanced' : naira(r.totals.variance)}
                      </td>
                      <td><ApprovalPipeline report={r} /></td>
                      <td><span className={`badge badge-${meta.badge}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
