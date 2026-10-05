import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RiCheckboxCircleLine, RiLoader4Line } from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, errMsg } from './schoolConstants';
import './School.css';

export function PublicHeader({ school }) {
  return (
    <div className="sc-public-head">
      {school.logo && <img src={school.logo} alt="" />}
      <h1>{school.schoolName}</h1>
      {school.motto && <p><i>{school.motto}</i></p>}
      <p>{[school.address, school.phone].filter(Boolean).join(' · ')}</p>
    </div>
  );
}

const EMPTY = { firstName: '', lastName: '', otherNames: '', gender: '', dateOfBirth: '', classAppliedFor: '', previousSchool: '', medicalNotes: '', guardian: { name: '', relationship: '', phone: '', email: '', address: '', occupation: '' }, website: '' };

export default function PublicApply() {
  const { slug } = useParams();
  const [school, setSchool] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    schoolService.publicSchool(slug).then(({ data }) => { setSchool(data.data); document.title = `Apply — ${data.data.schoolName}`; })
      .catch((e) => setError(errMsg(e, 'School not found')));
  }, [slug]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setG = (k, v) => setForm((f) => ({ ...f, guardian: { ...f.guardian, [k]: v } }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setSubmitErr('');
    try {
      const { data } = await schoolService.publicApply(slug, { ...form, dateOfBirth: form.dateOfBirth || undefined, classAppliedFor: form.classAppliedFor || undefined });
      setDone(data.data.applicationNumber);
      window.scrollTo(0, 0);
    } catch (err) { setSubmitErr(errMsg(err, 'Could not submit the application. Please try again.')); }
    finally { setBusy(false); }
  }

  if (error) return <div className="sc-public"><div className="sc-public-inner"><div className="card"><h2>School not found</h2><p>{error}</p></div></div></div>;
  if (!school) return <div className="sc-loading" style={{ minHeight: '100vh' }}><RiLoader4Line className="spin" /></div>;

  return (
    <div className="sc-public school-page">
      <div className="sc-public-inner">
        <PublicHeader school={school} />
        <div className="card">
          {done ? (
            <div className="sc-done">
              <RiCheckboxCircleLine />
              <h2>Application received</h2>
              <p>Your application number is <b>{done}</b>. Please keep it — the school will contact you about the next steps{form.guardian.email ? ', and a confirmation has been emailed to you' : ''}.</p>
              {school.onlinePayments && <p className="cell-sub">Once your child is enrolled you can pay fees online at <Link to={`/schools/${slug}/pay`}>the fee payment page</Link>.</p>}
            </div>
          ) : !school.admissionsOpen ? (
            <div className="sc-done"><h2>Admissions are closed</h2><p>{school.schoolName} is not taking online applications right now. Please contact the school{school.phone ? ` on ${school.phone}` : ''}.</p></div>
          ) : (
            <form onSubmit={submit}>
              <h2 style={{ marginTop: 0 }}>Admission application</h2>
              <p className="cell-sub">{school.currentSession} session · {TERMS[school.currentTerm]}. Fields marked * are required.</p>
              <input className="sc-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => set('website', e.target.value)} />

              <div className="sc-section">The child</div>
              <div className="form-grid-3">
                <div className="form-group"><label className="form-label">Surname *</label><input className="form-input" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">First name *</label><input className="form-input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Other names</label><input className="form-input" value={form.otherNames} onChange={(e) => set('otherNames', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Gender *</label>
                  <select className="form-input form-select" required value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select>
                </div>
                <div className="form-group"><label className="form-label">Date of birth *</label><input className="form-input" type="date" required value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Class applying for *</label>
                  <select className="form-input form-select" required value={form.classAppliedFor} onChange={(e) => set('classAppliedFor', e.target.value)}>
                    <option value="">— Choose —</option>
                    {school.classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid-2" style={{ marginTop: 12 }}>
                <div className="form-group"><label className="form-label">Previous school</label><input className="form-input" value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Medical conditions / allergies</label><input className="form-input" value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)} /></div>
              </div>

              <div className="sc-section">Parent / guardian</div>
              <div className="form-grid-2">
                <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" required value={form.guardian.name} onChange={(e) => setG('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Relationship to child</label><input className="form-input" placeholder="Father, Mother, Guardian…" value={form.guardian.relationship} onChange={(e) => setG('relationship', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone number *</label><input className="form-input" type="tel" required value={form.guardian.phone} onChange={(e) => setG('phone', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.guardian.email} onChange={(e) => setG('email', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Occupation</label><input className="form-input" value={form.guardian.occupation} onChange={(e) => setG('occupation', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Home address *</label><input className="form-input" required value={form.guardian.address} onChange={(e) => setG('address', e.target.value)} /></div>
              </div>

              {submitErr && <div className="sc-note warn" style={{ marginTop: 16 }}>{submitErr}</div>}
              <button className="btn btn-primary btn-lg" style={{ marginTop: 20, width: '100%' }} disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
