import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiPrinterLine, RiLoader4Line, RiSaveLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import ReportCardDoc from './ReportCardDoc';
import { TERMS, errMsg } from './schoolConstants';
import './School.css';

export default function ReportCard() {
  const { studentId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({ teacher: '', principal: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(null); setError('');
    schoolService.reportCard(studentId, { session: params.get('session') || undefined, term: params.get('term') || undefined })
      .then(({ data: r }) => { setData(r.data); setComments(r.data.comments); setDirty(false); })
      .catch((e) => setError(errMsg(e)));
  }, [studentId, params]);

  async function saveComments() {
    setSaving(true);
    try {
      await schoolService.saveReportComments(studentId, { session: data.session, term: data.term, teacherComment: comments.teacher, principalComment: comments.principal });
      toast.success('Comments saved'); setDirty(false);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }

  if (error) return <div className="school-page"><button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button><div className="sc-note warn" style={{ marginTop: 12 }}>{error}</div></div>;
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const set = (k, v) => { setComments((c) => ({ ...c, [k]: v })); setDirty(true); };

  return (
    <div className="school-page fade-in">
      <div className="sc-actions sc-no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button>
        <div className="sc-actions">
          {data.published
            ? <span className="badge badge-success"><RiEyeLine /> Parents can see this</span>
            : <span className="badge badge-neutral" title="Publish the class's results from Results → Broadsheet"><RiEyeOffLine /> Not yet published to parents</span>}
          <select className="form-input form-select" value={data.term} onChange={(e) => setParams({ session: data.session, term: e.target.value })} aria-label="Term">
            {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!data.summary}><RiPrinterLine /> Print</button>
        </div>
      </div>
      {!data.summary ? <div className="sc-note warn">No scores recorded for {data.student.name} in {data.session} {TERMS[data.term]}.</div> : (
        <>
          <div className="card card-pad sc-no-print" style={{ marginBottom: 16 }}>
            <div className="sc-card-title">
              <span>Comments</span>
              <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={saveComments}><RiSaveLine /> {saving ? 'Saving…' : dirty ? 'Save comments' : 'Saved'}</button>
            </div>
            <div className="form-grid-2">
              <textarea className="form-input form-textarea" rows={2} maxLength={1000} placeholder="Class teacher's comment" value={comments.teacher} onChange={(e) => set('teacher', e.target.value)} />
              <textarea className="form-input form-textarea" rows={2} maxLength={1000} placeholder="Principal's / head teacher's comment" value={comments.principal} onChange={(e) => set('principal', e.target.value)} />
            </div>
          </div>
          <ReportCardDoc data={data} comments={comments} />
        </>
      )}
    </div>
  );
}
