import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiCheckLine, RiCloseLine, RiEditLine, RiSendPlaneLine, RiLoader4Line, RiAlarmWarningLine, RiPrinterLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, fmtDate, fmtDateTime, STATUS_META, fuelLabel } from './groupUtils';
import { ApprovalPipeline } from './GroupReports';
import './Group.css';

export default function GroupReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [perms, setPerms] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    groupService.getReport(id)
      .then(({ data }) => { setReport(data.data); setPerms(data.permissions || {}); })
      .catch((e) => { toast.error(e.response?.data?.message || 'Report not found'); navigate('/group/reports'); });
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);

  async function act(kind) {
    if (kind === 'reject' && !comment.trim()) { toast.error('Write what needs fixing before sending it back'); return; }
    setBusy(true);
    try {
      if (kind === 'approve') await groupService.approveReport(id, comment);
      else if (kind === 'reject') await groupService.rejectReport(id, comment);
      else await groupService.submitReport(id);
      toast.success(kind === 'approve' ? 'Approved' : kind === 'reject' ? 'Sent back for correction' : 'Submitted');
      setComment('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setBusy(false); }
  }

  if (!report) return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;

  const t = report.totals || {};
  const meta = STATUS_META[report.status] || {};
  const short = t.variance < -1000;
  const isFinalStep = report.status === 'pending_owner';

  return (
    <div className="grp-page fade-in">
      <div className="grp-row grp-no-print">
        <Link to="/group/reports" className="btn btn-ghost btn-sm"><RiArrowLeftLine /> All reports</Link>
        <span className="grp-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><RiPrinterLine /> Print</button>
        {perms.canEdit && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/group/reports/${id}/edit`)}><RiEditLine /> Edit</button>}
        {perms.canEdit && report.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => act('submit')} disabled={busy}><RiSendPlaneLine /> Submit</button>}
      </div>

      <div className="card card-pad">
        <div className="grp-row" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="grp-mono muted">{report.referenceNumber}{report.ledgerNumber && <> · Ledger <strong style={{ color: 'var(--color-success)' }}>{report.ledgerNumber}</strong></>}</div>
            <h1 style={{ margin: '4px 0', fontSize: 22 }}>{report.branchName} · {report.department}</h1>
            <div className="muted" style={{ fontSize: 13 }}>{fmtDate(report.reportDate)} · prepared by {report.preparedByName || '—'}</div>
          </div>
          <span className="grp-spacer" />
          <span className={`badge badge-${meta.badge}`} style={{ fontSize: 13 }}>{meta.label}</span>
        </div>
        <div style={{ marginTop: 14 }}><ApprovalPipeline report={report} /></div>
        {short && (
          <div className="grp-alert high" style={{ marginTop: 14 }}>
            <RiAlarmWarningLine style={{ color: 'var(--color-danger)' }} />
            <span>Cash is short by <strong>{naira(Math.abs(t.variance))}</strong>. Money collected plus expenses is less than the expected sales.</span>
          </div>
        )}
      </div>

      <div className="grp-grid-2">
        <div className="card card-pad">
          {report.pumps?.length > 0 && (
            <>
              <div className="grp-card-title">Pump readings</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Pump</th><th>Product</th><th style={{ textAlign: 'right' }}>Opening</th><th style={{ textAlign: 'right' }}>Closing</th><th style={{ textAlign: 'right' }}>Litres</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {report.pumps.map((p, i) => (
                      <tr key={i}>
                        <td>{p.pump}</td><td>{fuelLabel(p.product)}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{p.openingMeter.toLocaleString()}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{p.closingMeter.toLocaleString()}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{p.litres.toLocaleString()}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(p.pricePerLitre)}</td>
                        <td className="grp-num" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {report.items?.length > 0 && (
            <>
              <div className="grp-card-title">Items sold</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit price</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {report.items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.description}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{it.quantity.toLocaleString()} {it.unit}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(it.unitPrice)}</td>
                        <td className="grp-num" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {report.expenses?.length > 0 && (
            <>
              <div className="grp-card-title" style={{ marginTop: 16 }}>Expenses</div>
              {report.expenses.map((e, i) => (
                <div key={i} className="grp-row" style={{ fontSize: 13, padding: '4px 0' }}><span>{e.description}</span><span className="grp-spacer" /><span className="grp-num">{naira(e.amount)}</span></div>
              ))}
            </>
          )}
          {report.notes && <><div className="grp-card-title" style={{ marginTop: 16 }}>Notes</div><p style={{ fontSize: 14, margin: 0 }}>{report.notes}</p></>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card card-pad">
            <div className="grp-card-title">Reconciliation</div>
            <div className="grp-recon">
              {t.litres > 0 && <div><div className="l">Litres</div><div className="v">{t.litres.toLocaleString()} L</div></div>}
              <div><div className="l">Expected</div><div className="v">{naira(t.expectedSales)}</div></div>
              <div><div className="l">Cash</div><div className="v">{naira(report.collections?.cash)}</div></div>
              <div><div className="l">POS</div><div className="v">{naira(report.collections?.pos)}</div></div>
              <div><div className="l">Transfer</div><div className="v">{naira(report.collections?.transfer)}</div></div>
              {report.collections?.credit > 0 && <div><div className="l">Credit</div><div className="v">{naira(report.collections.credit)}</div></div>}
              <div><div className="l">Expenses</div><div className="v">{naira(t.expenses)}</div></div>
              <div className={`verdict ${short ? 'short' : 'ok'}`}>
                <div className="l">{short ? 'Shortage' : t.variance > 1000 ? 'Surplus' : 'Balanced'}</div>
                <div className={`v ${short ? 'grp-neg' : 'grp-pos'}`}>{naira(Math.abs(t.variance))}</div>
              </div>
            </div>
          </div>

          {perms.canApprove && (
            <div className="card card-pad grp-ai grp-no-print">
              <div className="grp-card-title">{isFinalStep ? 'Final approval' : 'Branch manager review'}</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                {isFinalStep
                  ? 'Approving posts this report to the approved sales ledger with a permanent ledger number.'
                  : 'Approving sends this report to the owner for final approval.'}
              </p>
              <textarea className="form-textarea" rows={3} placeholder="Comment (required if sending back)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="grp-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-danger" onClick={() => act('reject')} disabled={busy}><RiCloseLine /> Send back</button>
                <button className="btn btn-primary" onClick={() => act('approve')} disabled={busy}><RiCheckLine /> {isFinalStep ? 'Approve & post' : 'Approve'}</button>
              </div>
            </div>
          )}

          <div className="card card-pad">
            <div className="grp-card-title">Audit trail</div>
            <ul className="grp-timeline">
              {(report.trail || []).map((e, i) => (
                <li key={i}>
                  <span className={`dot ${e.action.startsWith('rejected') ? 'rej' : e.action.startsWith('approved') ? 'ok' : ''}`} />
                  <div>
                    <div><strong>{e.byName || 'System'}</strong> {e.action}</div>
                    {e.comment && <div className="muted">“{e.comment}”</div>}
                    <div className="muted" style={{ fontSize: 12 }}>{fmtDateTime(e.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
