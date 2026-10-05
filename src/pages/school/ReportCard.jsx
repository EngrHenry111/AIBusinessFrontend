import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiPrinterLine, RiLoader4Line } from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, fmtDate, errMsg } from './schoolConstants';
import './School.css';

export default function ReportCard() {
  const { studentId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({ teacher: '', principal: '' });

  useEffect(() => {
    setData(null); setError('');
    schoolService.reportCard(studentId, { session: params.get('session') || undefined, term: params.get('term') || undefined })
      .then(({ data: r }) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [studentId, params]);

  if (error) return <div className="school-page"><button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button><div className="sc-note warn" style={{ marginTop: 12 }}>{error}</div></div>;
  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const { school, student, summary } = data;
  const examMax = 100 - data.caMax;

  return (
    <div className="school-page fade-in">
      <div className="sc-actions sc-no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><RiArrowLeftLine /> Back</button>
        <div className="sc-actions">
          <select className="form-input form-select" value={data.term} onChange={(e) => setParams({ session: data.session, term: e.target.value })} aria-label="Term">
            {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!summary}><RiPrinterLine /> Print</button>
        </div>
      </div>
      {!summary ? <div className="sc-note warn">No scores recorded for {student.name} in {data.session} {TERMS[data.term]}.</div> : (
        <>
          <div className="card card-pad sc-no-print" style={{ marginBottom: 16 }}>
            <div className="sc-card-title">Comments (printed on the card)</div>
            <div className="form-grid-2">
              <textarea className="form-input form-textarea" rows={2} placeholder="Class teacher's comment" value={comments.teacher} onChange={(e) => setComments({ ...comments, teacher: e.target.value })} />
              <textarea className="form-input form-textarea" rows={2} placeholder="Principal's / head teacher's comment" value={comments.principal} onChange={(e) => setComments({ ...comments, principal: e.target.value })} />
            </div>
          </div>
          <div className="sc-doc">
            <div className="sc-doc-head">
              {school.logo && <img src={school.logo} alt="" />}
              <div>
                <h2>{school.schoolName}</h2>
                {school.motto && <div className="sub"><i>{school.motto}</i></div>}
                <div className="sub">{[school.address, school.phone, school.email].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <p className="sc-doc-title">Student report card — {TERMS[data.term]}, {data.session}</p>
            <div className="sc-doc-meta">
              <div><span>Name:</span> <b>{student.name}</b></div>
              <div><span>Admission no.:</span> {student.admissionNumber}</div>
              <div><span>Class:</span> {data.class.name}</div>
              <div><span>Gender:</span> {student.gender ? (student.gender === 'male' ? 'Male' : 'Female') : '—'}</div>
              <div><span>Position:</span> <b>{summary.position}</b> out of {summary.classSize}</div>
              <div><span>Average:</span> <b>{summary.average}%</b> ({summary.grade.grade} — {summary.grade.remark})</div>
              <div><span>Attendance:</span> {data.attendance.present} present, {data.attendance.absent} absent</div>
              {student.dateOfBirth && <div><span>Date of birth:</span> {fmtDate(student.dateOfBirth)}</div>}
            </div>
            <table>
              <thead>
                <tr><th>Subject</th><th className="num">CA ({data.caMax})</th><th className="num">Exam ({examMax})</th><th className="num">Total (100)</th><th>Grade</th><th>Remark</th><th className="num">Class avg</th><th className="num">Highest</th></tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject}>
                    <td>{s.subject}</td><td className="num">{s.ca}</td><td className="num">{s.exam}</td><td className="num"><b>{s.total}</b></td>
                    <td>{s.grade}</td><td>{s.remark}</td><td className="num">{s.classStats?.average ?? '—'}</td><td className="num">{s.classStats?.highest ?? '—'}</td>
                  </tr>
                ))}
                <tr><th>Total</th><th /><th /><th className="num">{summary.total}</th><th colSpan={4}>{summary.subjects} subject(s)</th></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 10 }}>
              Grading: {[...data.gradingScale].sort((a, b) => b.min - a.min).map((g) => `${g.grade} (${g.min}+) ${g.remark}`).join(' · ')}
            </p>
            <div className="sc-doc-foot">
              <div><b>Class teacher{data.class.teacher ? ` (${data.class.teacher})` : ''}:</b><div style={{ minHeight: 36 }}>{comments.teacher}</div><div className="sc-doc-sign">Signature</div></div>
              <div><b>Principal / Head teacher:</b><div style={{ minHeight: 36 }}>{comments.principal}</div><div className="sc-doc-sign">Signature &amp; stamp</div></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
