import { TERMS, fmtDate } from './schoolConstants';

// The printable report card — staff page and parent portal both render this.
export default function ReportCardDoc({ data, comments = data.comments }) {
  const { school, student, summary } = data;
  const examMax = 100 - data.caMax;
  return (
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
        {data.nextTermBegins && <div><span>Next term begins:</span> <b>{fmtDate(data.nextTermBegins)}</b></div>}
      </div>
      <div className="table-wrapper" style={{ border: 0 }}>
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
      </div>
      <p style={{ fontSize: 12, color: '#475569', marginTop: 10 }}>
        Grading: {[...data.gradingScale].sort((a, b) => b.min - a.min).map((g) => `${g.grade} (${g.min}+) ${g.remark}`).join(' · ')}
      </p>
      <div className="sc-doc-foot">
        <div><b>Class teacher{data.class.teacher ? ` (${data.class.teacher})` : ''}:</b><div style={{ minHeight: 36, whiteSpace: 'pre-wrap' }}>{comments?.teacher}</div><div className="sc-doc-sign">Signature</div></div>
        <div><b>Principal / Head teacher:</b><div style={{ minHeight: 36, whiteSpace: 'pre-wrap' }}>{comments?.principal}</div><div className="sc-doc-sign">Signature &amp; stamp</div></div>
      </div>
    </div>
  );
}
