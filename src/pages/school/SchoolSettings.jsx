import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiSettings3Line, RiLoader4Line, RiFileCopyLine, RiExternalLinkLine, RiAddLine, RiCloseLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Field } from './SchoolForms';
import { TERMS, toInputDate, errMsg, publicLink } from './schoolConstants';
import './School.css';

export default function SchoolSettings() {
  const { company } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    schoolService.getSettings().then(({ data }) => setForm({ ...data.data, termStart: toInputDate(data.data.termStart), termEnd: toInputDate(data.data.termEnd), nextTermBegins: toInputDate(data.data.nextTermBegins) }))
      .catch((e) => toast.error(errMsg(e)));
  }, []);
  if (!form) return <div className="sc-loading"><RiLoader4Line className="spin" /></div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const paymentsReady = Boolean(company?.paymentSettings?.isPaymentSetup);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await schoolService.updateSettings({
        ...form, caMax: Number(form.caMax), minimumOnlinePayment: Number(form.minimumOnlinePayment) || 0,
        termStart: form.termStart || null, termEnd: form.termEnd || null, nextTermBegins: form.nextTermBegins || null,
        gradingScale: form.gradingScale.map((g) => ({ ...g, min: Number(g.min) })),
      });
      setForm({ ...data.data, termStart: toInputDate(data.data.termStart), termEnd: toInputDate(data.data.termEnd), nextTermBegins: toInputDate(data.data.nextTermBegins) });
      toast.success('School settings saved');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  }

  const links = [['Online admission form', 'apply'], ['Parent portal (fees, results, attendance)', 'portal']];
  const rem = form.reminders || {};
  const setRem = (k, v) => set('reminders', { ...rem, [k]: v });

  return (
    <form className="school-page fade-in" onSubmit={save}>
      <div className="page-header page-header-row">
        <div>
          <h1><RiSettings3Line style={{ verticalAlign: '-3px' }} /> School settings</h1>
          <p>Your school's details, the current session and term, grading and the public pages for parents.</p>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>

      <div className="sc-grid-2">
        <div className="card card-pad">
          <div className="sc-card-title">Academic calendar</div>
          <div className="form-grid-2">
            <Field label="Current session"><input className="form-input" pattern="\d{4}/\d{4}" placeholder="2026/2027" value={form.currentSession} onChange={(e) => set('currentSession', e.target.value)} /></Field>
            <Field label="Current term">
              <select className="form-input form-select" value={form.currentTerm} onChange={(e) => set('currentTerm', e.target.value)}>
                {Object.entries(TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Term starts"><input className="form-input" type="date" value={form.termStart} onChange={(e) => set('termStart', e.target.value)} /></Field>
            <Field label="Term ends"><input className="form-input" type="date" value={form.termEnd} onChange={(e) => set('termEnd', e.target.value)} /></Field>
            <Field label="Next term begins" hint="(printed on report cards)"><input className="form-input" type="date" value={form.nextTermBegins || ''} onChange={(e) => set('nextTermBegins', e.target.value)} /></Field>
          </div>
          <p className="cell-sub">Moving to a new term? Change it here, then create that term's fee structures and generate bills. At the end of a session, promote classes from the Students page.</p>
        </div>

        <div className="card card-pad">
          <div className="sc-card-title">Parent pages</div>
          <div className="sc-links">
            {links.map(([label, page]) => (
              <div key={page}>
                <label className="form-label">{label}</label>
                <div className="sc-link-box">
                  <code>{publicLink(form.slug, page)}</code>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(publicLink(form.slug, page)); toast.success('Link copied'); }}><RiFileCopyLine /></button>
                  <a className="btn btn-ghost btn-sm" href={`/schools/${form.slug}/${page}`} target="_blank" rel="noreferrer" aria-label="Open"><RiExternalLinkLine /></a>
                </div>
              </div>
            ))}
            <Field label="Link name"><input className="form-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
            <label className="sc-check"><input type="checkbox" checked={form.admissionsOpen} onChange={(e) => set('admissionsOpen', e.target.checked)} /> Accept online applications</label>
            <label className="sc-check"><input type="checkbox" checked={form.onlinePaymentsEnabled} onChange={(e) => set('onlinePaymentsEnabled', e.target.checked)} /> Let parents pay fees online</label>
            {form.onlinePaymentsEnabled && !paymentsReady && (
              <div className="sc-note warn">Online payments need your school's bank account connected. Set it up under <Link to="/settings/store">Store settings → Payments</Link>; money goes straight to that account.</div>
            )}
            <Field label="Minimum online part-payment (₦)"><input className="form-input" type="number" min="0" value={form.minimumOnlinePayment} onChange={(e) => set('minimumOnlinePayment', e.target.value)} /></Field>
          </div>
        </div>

        <div className="card card-pad">
          <div className="sc-card-title">School details (receipts, report cards, emails)</div>
          <div className="form-grid-2">
            <Field label="School name" span><input className="form-input" value={form.schoolName || ''} onChange={(e) => set('schoolName', e.target.value)} /></Field>
            <Field label="Motto" span><input className="form-input" value={form.motto || ''} onChange={(e) => set('motto', e.target.value)} /></Field>
            <Field label="Address" span><input className="form-input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><input className="form-input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Logo URL" span><input className="form-input" placeholder="https://…" value={form.logo || ''} onChange={(e) => set('logo', e.target.value)} /></Field>
            <Field label="Admission number prefix" hint={`(e.g. ${form.admissionNumberPrefix || 'STU'}/${new Date().getFullYear()}/0001)`}><input className="form-input" maxLength={12} value={form.admissionNumberPrefix || ''} onChange={(e) => set('admissionNumberPrefix', e.target.value.toUpperCase())} /></Field>
          </div>
        </div>

        <div className="card card-pad">
          <div className="sc-card-title">Fee reminders</div>
          <label className="sc-check"><input type="checkbox" checked={Boolean(rem.autoEnabled)} onChange={(e) => setRem('autoEnabled', e.target.checked)} /> Remind parents automatically (every morning at 9am)</label>
          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <Field label="Start reminding" hint="(days before the due date)"><input className="form-input" type="number" min="0" max="60" disabled={!rem.autoEnabled} value={rem.daysBeforeDue ?? 3} onChange={(e) => setRem('daysBeforeDue', e.target.value)} /></Field>
            <Field label="Then repeat every" hint="(days, until paid)"><input className="form-input" type="number" min="1" max="60" disabled={!rem.autoEnabled} value={rem.repeatEveryDays ?? 7} onChange={(e) => setRem('repeatEveryDays', e.target.value)} /></Field>
          </div>
          <label className="form-label" style={{ marginTop: 12 }}>Send automatic reminders by</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label className="sc-check"><input type="checkbox" disabled={!rem.autoEnabled} checked={rem.email !== false} onChange={(e) => setRem('email', e.target.checked)} /> Email</label>
            <label className="sc-check"><input type="checkbox" disabled={!rem.autoEnabled} checked={rem.sms !== false} onChange={(e) => setRem('sms', e.target.checked)} /> SMS</label>
            <label className="sc-check"><input type="checkbox" disabled={!rem.autoEnabled} checked={Boolean(rem.whatsapp)} onChange={(e) => setRem('whatsapp', e.target.checked)} /> WhatsApp <span className="form-hint">(when connected)</span></label>
          </div>
          <p className="cell-sub">Only bills with a due date are chased automatically. You can always remind parents yourself from Fees → Debtors.</p>
        </div>

        <div className="card card-pad">
          <div className="sc-card-title">Scores &amp; grading</div>
          <div className="form-grid-2" style={{ marginBottom: 12 }}>
            <Field label="CA out of"><input className="form-input" type="number" min="0" max="100" value={form.caMax} onChange={(e) => set('caMax', e.target.value)} /></Field>
            <Field label="Exam out of"><input className="form-input" value={100 - (Number(form.caMax) || 0)} disabled /></Field>
          </div>
          <label className="form-label">Grades <span className="form-hint">(minimum total for each grade)</span></label>
          {form.gradingScale.map((g, i) => (
            <div key={i} className="sc-item-row" style={{ gridTemplateColumns: '70px 90px 1fr auto' }}>
              <input className="form-input" value={g.grade} aria-label="Grade" onChange={(e) => set('gradingScale', form.gradingScale.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)))} />
              <input className="form-input" type="number" min="0" max="100" value={g.min} aria-label="Minimum" onChange={(e) => set('gradingScale', form.gradingScale.map((x, j) => (j === i ? { ...x, min: e.target.value } : x)))} />
              <input className="form-input" value={g.remark} aria-label="Remark" onChange={(e) => set('gradingScale', form.gradingScale.map((x, j) => (j === i ? { ...x, remark: e.target.value } : x)))} />
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove grade" onClick={() => set('gradingScale', form.gradingScale.filter((_, j) => j !== i))}><RiCloseLine /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('gradingScale', [...form.gradingScale, { grade: '', min: 0, remark: '' }])}><RiAddLine /> Add grade</button>
        </div>
      </div>
    </form>
  );
}
