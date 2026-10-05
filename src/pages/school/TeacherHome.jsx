import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RiGraduationCapLine, RiCalendarCheckLine, RiFileList3Line, RiTimeLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { TERMS } from './schoolConstants';
import './School.css';

// Home screen for teachers: their classes, what to do for each, and
// today's lessons.
export default function TeacherHome({ me }) {
  const { user } = useAuth();
  const [week, setWeek] = useState(null);
  useEffect(() => { schoolService.teacherTimetable('me').then(({ data }) => setWeek(data.data)).catch(() => setWeek(null)); }, []);

  const day = new Date().getDay(); // 0 Sun … 6 Sat
  const today = week ? week.slots.filter((s) => s.day === day).sort((a, b) => a.period - b.period) : [];

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiGraduationCapLine style={{ verticalAlign: '-3px' }} /> Welcome, {user?.name?.split(' ')[0] || 'teacher'}</h1>
          <p>{week ? `${week.session} · ${TERMS[week.term]} · ` : ''}{me.teaching.length} class{me.teaching.length === 1 ? '' : 'es'}</p>
        </div>
        <Link to="/school/timetable" className="btn btn-secondary"><RiTimeLine /> My timetable</Link>
      </div>

      {me.teaching.length === 0 ? (
        <div className="sc-note warn">You're not assigned to any class yet. Ask the school admin to make you a class teacher or subject teacher on the Classes page.</div>
      ) : (
        <div className="sc-grid-main">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {me.teaching.map((c) => (
              <div key={c._id} className="card card-pad">
                <div className="sc-card-title" style={{ marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 16, textTransform: 'none', letterSpacing: 0 }}>{c.name}</span>
                  {c.classTeacher && <span className="badge badge-brand">Class teacher</span>}
                </div>
                <div className="sc-actions" style={{ marginTop: 8 }}>
                  <Link to={`/school/attendance?classId=${c._id}`} className="btn btn-secondary btn-sm"><RiCalendarCheckLine /> Take register</Link>
                  {c.subjects.map((sub) => (
                    <Link key={sub} to={`/school/results?classId=${c._id}&subject=${encodeURIComponent(sub)}`} className="btn btn-ghost btn-sm"><RiFileList3Line /> {sub}</Link>
                  ))}
                  <Link to={`/school/students?classId=${c._id}`} className="btn btn-ghost btn-sm">Students</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <div className="sc-card-title">Today</div>
            {day === 0 || day === 6 ? <p className="cell-sub">No lessons at the weekend.</p>
              : !week ? <p className="cell-sub">No timetable yet.</p>
                : today.length === 0 ? <p className="cell-sub">No lessons today.</p> : (
                  <ul className="sc-list">
                    {today.map((s) => (
                      <li key={`${s.period}`}>
                        <span><span className="sc-strong">{s.className}</span><span className="cell-sub">{s.subject}</span></span>
                        <span className="cell-sub" style={{ margin: 0 }}>{week.periods[s.period]?.start}–{week.periods[s.period]?.end}</span>
                      </li>
                    ))}
                  </ul>
                )}
          </div>
        </div>
      )}
    </div>
  );
}
