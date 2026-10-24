import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiLoader4Line, RiPrinterLine, RiCheckLine, RiShieldCheckLine, RiCloseLine } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { Allergies } from './HospitalForms';
import { LAB_STATUS, money, fmtDateTime, fullName, sexAge, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const range = (x) => {
  if (x.refText) return x.refText;
  if (x.refLow == null && x.refHigh == null) return '';
  return `${x.refLow ?? ''}–${x.refHigh ?? ''}`;
};
const flagOf = (v, x) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  if (x.refLow != null && n < x.refLow) return 'L';
  if (x.refHigh != null && n > x.refHigh) return 'H';
  return '';
};

export default function LabRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [tests, setTests] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (keep) => {
    try {
      const { data: r } = await hospitalService.getLabRequest(id);
      setData(r.data);
      if (!keep) { setTests(r.data.request.tests.map((t) => ({ ...t, results: t.results.map((x) => ({ ...x })) }))); setDirty(false); }
    } catch (e) { toast.error(errMsg(e)); navigate('/hospital/lab'); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useHospitalLive((evt) => { if (evt.requestId === id || evt.kind === 'payment') load(dirty); }, ['lab', 'payment']);
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;

  const { request: r, bill, payBeforeLab, hospital } = data;
  const p = r.patientId;
  const editable = can.lab(me) && r.status === 'collected' && !r.verifiedAt;
  const setValue = (ti, li, v) => { setTests((ts) => ts.map((t, i) => (i === ti ? { ...t, results: t.results.map((x, j) => (j === li ? { ...x, value: v } : x)) } : t))); setDirty(true); };
  const setComment = (ti, v) => { setTests((ts) => ts.map((t, i) => (i === ti ? { ...t, comment: v } : t))); setDirty(true); };

  async function save(complete) {
    setBusy(true);
    try {
      await hospitalService.saveLabResults(id, { complete, tests: tests.map((t) => ({ _id: t._id, comment: t.comment, results: t.results.map((x) => ({ name: x.name, value: x.value })) })) });
      toast.success(complete ? 'Results sent to the doctor' : 'Saved');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function act(fn, msg, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try { const { data: res } = await fn(id); toast.success(res.data?.refundDue ? `${msg}. Refund due: ${money(res.data.refundDue)}` : msg); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  const unpaid = payBeforeLab && !r.admissionId && bill && bill.balance > 0;

  return (
    <div className="school-page fade-in">
      <div className="sc-actions sc-no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button>
        <div className="sc-actions">
          {r.status === 'requested' && can.lab(me) && <button className="btn btn-primary" disabled={unpaid} title={unpaid ? 'Payment needed first' : undefined} onClick={() => act(hospitalService.collectSample, 'Sample collected')}>Collect sample</button>}
          {editable && <button className="btn btn-secondary" disabled={busy || !dirty} onClick={() => save(false)}>{dirty ? 'Save draft' : 'Saved'}</button>}
          {editable && <button className="btn btn-primary" disabled={busy} onClick={() => save(true)}><RiCheckLine /> Complete & send</button>}
          {r.status === 'completed' && !r.verifiedAt && can.lab(me) && <button className="btn btn-secondary" onClick={() => act(hospitalService.verifyLabRequest, 'Results verified')}><RiShieldCheckLine /> Verify</button>}
          {['requested', 'collected'].includes(r.status) && can.orderLab(me) && <button className="btn btn-ghost" onClick={() => act(hospitalService.cancelLabRequest, 'Request cancelled', 'Cancel this request? The charge comes off the bill.')}><RiCloseLine /> Cancel</button>}
          {r.status === 'completed' && <button className="btn btn-primary" onClick={() => window.print()}><RiPrinterLine /> Print</button>}
        </div>
      </div>

      {unpaid && r.status === 'requested' && (
        <div className="sc-note warn sc-no-print" style={{ marginBottom: 12 }}>Payment needed before the sample is taken: bill <Link to={`/hospital/bills/${bill._id}`}>{bill.billNumber}</Link> has {money(bill.balance)} to pay.</div>
      )}

      <div className="sc-doc">
        <div className="sc-doc-head">
          {hospital.logo && <img src={hospital.logo} alt="" />}
          <div><h2>{hospital.hospitalName}</h2><div className="sub">{[hospital.address, hospital.phone, hospital.email].filter(Boolean).join(' · ')}</div></div>
        </div>
        <p className="sc-doc-title">Laboratory report</p>
        <div className="sc-doc-meta">
          <div><span>Patient:</span> <b>{fullName(p)}</b></div>
          <div><span>Hospital no.:</span> {p.hospitalNumber}</div>
          <div><span>Sex / age:</span> {sexAge(p) || '—'}</div>
          <div><span>Lab no.:</span> {r.labNumber}</div>
          <div><span>Requested by:</span> {r.source === 'walk_in' ? 'Walk-in' : r.requestedBy?.name || '—'} · {fmtDateTime(r.createdAt)}</div>
          <div><span>Sample collected:</span> {r.collectedAt ? fmtDateTime(r.collectedAt) : '—'}</div>
          {r.clinicalNotes && <div style={{ gridColumn: '1 / -1' }}><span>Clinical notes:</span> {r.clinicalNotes}</div>}
          <div className="sc-no-print"><span>Status:</span> <span className={`badge badge-${LAB_STATUS[r.status]?.badge}`}>{LAB_STATUS[r.status]?.label}</span>{r.priority === 'urgent' && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Urgent</span>}</div>
          <div className="sc-no-print"><Allergies patient={p} /></div>
        </div>
        {tests.map((t, ti) => (
          <div key={t._id} style={{ marginBottom: 16 }}>
            <table>
              <thead><tr><th colSpan={4}>{t.name}{t.sampleType ? <span style={{ fontWeight: 400 }}> · {t.sampleType}</span> : ''}</th></tr>
                <tr><th style={{ width: '38%' }}>Test</th><th>Result</th><th>Unit</th><th>Normal range</th></tr></thead>
              <tbody>
                {t.results.map((x, li) => {
                  const f = flagOf(x.value, x);
                  return (
                    <tr key={x.name}>
                      <td>{x.name}</td>
                      <td>{editable ? <input className="form-input" aria-label={x.name} value={x.value || ''} onChange={(e) => setValue(ti, li, e.target.value)} style={{ padding: '4px 8px' }} /> : <b>{x.value || '—'}</b>}
                        {f && <span className={`hp-flag ${f}`}>{f}</span>}</td>
                      <td>{x.unit}</td>
                      <td>{range(x)}</td>
                    </tr>
                  );
                })}
                <tr><td>Comment</td><td colSpan={3}>{editable ? <input className="form-input" value={t.comment || ''} onChange={(e) => setComment(ti, e.target.value)} style={{ padding: '4px 8px' }} /> : t.comment || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        ))}
        <div className="sc-doc-foot">
          <div><div className="sc-doc-sign">Result by: {r.completedBy?.name || '—'}{r.completedAt ? ` · ${fmtDateTime(r.completedAt)}` : ''}</div></div>
          <div><div className="sc-doc-sign">Verified by: {r.verifiedBy?.name || '—'}{r.verifiedAt ? ` · ${fmtDateTime(r.verifiedAt)}` : ''}</div></div>
        </div>
      </div>
    </div>
  );
}
