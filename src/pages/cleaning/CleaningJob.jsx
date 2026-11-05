import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiLoader4Line, RiMapPinLine, RiPhoneLine, RiWhatsappLine, RiCameraLine, RiCheckboxCircleFill,
  RiCheckboxBlankCircleLine, RiPrinterLine, RiEditLine, RiForbidLine, RiRepeatLine, RiTeamLine, RiArrowRightLine, RiKey2Line,
} from 'react-icons/ri';
import { cleaningService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { money, fmtDate, fmtTime, fmtDateTime, errText, waLink, telLink, mapLink, lagosDateOf, lagosISO, MANAGERS } from '../services/svc';
import PaymentBox from '../services/PaymentBox';
import Modal from '../services/Modal';
import '../services/svc.css';
import './Cleaning.css';

const NEXT = {
  scheduled: [['on_the_way', 'We are on the way'], ['in_progress', 'Start cleaning']],
  on_the_way: [['in_progress', 'Arrived: start cleaning']],
  in_progress: [['completed', 'Job completed']],
};

const onTheWayText = (j, company) => `Hello ${j.customer.name}, this is ${company?.companyName || 'your cleaning team'}. ${j.team.map((t) => t.name).join(', ') || 'Our team'} ${j.team.length > 1 ? 'are' : 'is'} on the way for your ${j.service.toLowerCase()} at ${j.address}. See you soon!`;
const doneText = (j, company) => [
  `Hello ${j.customer.name}, your ${j.service.toLowerCase()} is done. Thank you for choosing ${company?.companyName || 'us'}!`,
  j.balance > 0 ? `Balance to pay: ${money(j.balance, j.currency)}.` : 'Your bill is fully paid.',
  j.recurrence !== 'none' ? 'Your next visit is already booked. We will remind you before then.' : 'We would love to clean for you again. Just reply to book.',
].join('\n');

export default function CleaningJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const isManager = MANAGERS.includes(user?.role);
  const [j, setJ] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone] = useState(null);
  const [printing, setPrinting] = useState(false);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  const load = useCallback(async () => {
    try { const { data } = await cleaningService.get(id); setJ(data.data); } catch (err) { setError(errText(err, 'Could not load this job.')); }
  }, [id]);
  useEffect(() => { setJ(null); load(); }, [load]);
  useEffect(() => {
    if (!printing) return undefined;
    const t = setTimeout(() => { window.print(); setPrinting(false); }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  const keep = (saved) => setJ((prev) => ({ ...saved, business: prev?.business }));

  const move = async (to) => {
    if (to === 'completed' && j.progress.done < j.progress.total) {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`${j.progress.total - j.progress.done} checklist task(s) are not ticked. Complete the job anyway?`)) return;
    }
    setBusy(true);
    try {
      const { data } = await cleaningService.setStatus(j.id, to);
      keep(data.data);
      if (to === 'completed') setDone({ job: data.data, next: data.nextJob });
      else toast.success(data.emailed ? `${data.data.statusLabel}. Customer emailed.` : data.data.statusLabel);
    } catch (err) { toast.error(errText(err, 'Could not update the job.')); } finally { setBusy(false); }
  };

  const toggle = async (i) => {
    const t = j.checklist[i];
    setJ((p) => ({ ...p, checklist: p.checklist.map((x, n) => (n === i ? { ...x, done: !x.done } : x)) }));
    try { const { data } = await cleaningService.toggleTask(j.id, i, !t.done); keep(data.data); } catch (err) { toast.error(errText(err, 'Could not save that.')); load(); }
  };

  const upload = async (kind, files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 10).forEach((f) => fd.append('photos', f));
    fd.append('kind', kind);
    setUploading(kind);
    try { const { data } = await cleaningService.addPhotos(j.id, fd); keep(data.data); toast.success('Photos added'); } catch (err) { toast.error(errText(err, 'Could not upload the photos.')); } finally { setUploading(''); }
  };

  if (error) return <div className="svc-page"><div className="svc-state"><p>{error}</p><Link to="/cleaning" className="btn btn-secondary">Back to schedule</Link></div></div>;
  if (!j) return <div className="svc-page"><div className="svc-state"><RiLoader4Line className="spin" /> Loading…</div></div>;

  const active = !['completed', 'cancelled'].includes(j.status);
  const photos = (kind) => j.photos.filter((p) => p.kind === kind);

  return (
    <div className="svc-page fade-in">
      <div>
        <Link to="/cleaning" className="svc-back"><RiArrowLeftLine /> Schedule</Link>
        <div className="svc-head">
          <div>
            <h1>{j.jobNumber} <span className={`svc-badge ${j.status}`}>{j.statusLabel}</span>{j.recurrence !== 'none' && <span className="svc-badge"><RiRepeatLine /> {j.recurrence === 'biweekly' ? 'every 2 weeks' : j.recurrence}</span>}</h1>
            <p>{j.service} · {fmtDate(j.scheduledAt)}, {fmtTime(j.scheduledAt)}–{fmtTime(j.endsAt)}</p>
          </div>
          <div className="svc-head-actions">
            <button className="btn btn-secondary" onClick={() => setPrinting(true)}><RiPrinterLine /> Job sheet</button>
            {isManager && active && <button className="btn btn-secondary" onClick={() => setEditing(true)}><RiEditLine /> Edit</button>}
          </div>
        </div>
      </div>

      <div className="svc-layout">
        <div className="svc-form">
          {active && (
            <div className="svc-card">
              {NEXT[j.status].map(([to, label], n) => (
                <button key={to} className={`btn ${n === 0 ? 'btn-primary' : 'btn-secondary'} svc-big-btn`} disabled={busy} onClick={() => move(to)}>
                  {busy && n === 0 ? <RiLoader4Line className="spin" /> : null} {label} <RiArrowRightLine />
                </button>
              ))}
              {j.status === 'scheduled' && j.customer.phone && (
                <a className="btn btn-ghost" href={waLink(j.customer.phone, onTheWayText(j, company))} target="_blank" rel="noopener noreferrer"><RiWhatsappLine /> Tell the customer you're coming</a>
              )}
            </div>
          )}
          {j.status === 'cancelled' && <div className="svc-card"><strong>Cancelled</strong><span className="svc-muted">{j.cancelReason}</span></div>}
          {j.status === 'completed' && (
            <div className="svc-card">
              <div className="svc-row"><span>Completed {fmtDateTime(j.completedAt)}</span></div>
              <div className="svc-actions">
                {j.customer.phone && <a className="btn btn-secondary" href={waLink(j.customer.phone, doneText(j, company))} target="_blank" rel="noopener noreferrer"><RiWhatsappLine /> Thank the customer</a>}
                {j.nextJobId && <Link className="btn btn-secondary" to={`/cleaning/jobs/${j.nextJobId}`}><RiRepeatLine /> Next visit</Link>}
              </div>
            </div>
          )}

          <div className="svc-card">
            <h3>Where</h3>
            <div><strong>{j.address}</strong>{j.area && <span className="svc-muted"> · {j.area}</span>}</div>
            {j.landmark && <div className="svc-muted">Landmark: {j.landmark}</div>}
            {j.accessNotes && <div className="cl-access"><RiKey2Line /> {j.accessNotes}</div>}
            <div className="svc-muted">{j.property.type}{j.property.bedrooms ? ` · ${j.property.bedrooms} bedroom${j.property.bedrooms === 1 ? '' : 's'}` : ''}{j.property.bathrooms ? ` · ${j.property.bathrooms} bathroom${j.property.bathrooms === 1 ? '' : 's'}` : ''}</div>
            <div className="svc-actions">
              <a className="btn btn-secondary" href={mapLink(`${j.address}${j.area ? `, ${j.area}` : ''}`)} target="_blank" rel="noopener noreferrer"><RiMapPinLine /> Directions</a>
              {j.customer.phone && <a className="btn btn-secondary" href={telLink(j.customer.phone)}><RiPhoneLine /> Call customer</a>}
              {j.customer.phone && <a className="btn btn-secondary" href={waLink(j.customer.phone, '')} target="_blank" rel="noopener noreferrer"><RiWhatsappLine /> WhatsApp</a>}
            </div>
          </div>

          <div className="svc-card">
            <h3>Checklist <small>{j.progress.done} of {j.progress.total} done</small></h3>
            <div className="cl-progress"><span style={{ width: `${j.progress.total ? (j.progress.done / j.progress.total) * 100 : 0}%` }} /></div>
            <ul className="cl-checklist">
              {j.checklist.map((t, i) => (
                <li key={i}>
                  <button disabled={!active} className={t.done ? 'done' : ''} onClick={() => toggle(i)} aria-pressed={t.done}>
                    {t.done ? <RiCheckboxCircleFill /> : <RiCheckboxBlankCircleLine />}
                    <span>{t.task}</span>
                    {t.done && t.doneBy && <small>{t.doneBy}</small>}
                  </button>
                </li>
              ))}
            </ul>
            {j.extras.length > 0 && <p className="svc-muted" style={{ margin: 0 }}>Extras: {j.extras.map((e) => `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`).join(', ')}</p>}
            {j.notes && <p className="cl-notes"><strong>Notes:</strong> {j.notes}</p>}
          </div>

          <div className="svc-card">
            <h3>Photos <small>proof of work for the customer</small></h3>
            {['before', 'after'].map((kind) => (
              <div key={kind} className="cl-photos">
                <div className="svc-row">
                  <strong style={{ textTransform: 'capitalize' }}>{kind}</strong>
                  {j.status !== 'cancelled' && (
                    <>
                      <input ref={kind === 'before' ? beforeRef : afterRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { upload(kind, e.target.files); e.target.value = ''; }} />
                      <button className="btn btn-secondary btn-sm" disabled={Boolean(uploading)} onClick={() => (kind === 'before' ? beforeRef : afterRef).current?.click()}>
                        {uploading === kind ? <RiLoader4Line className="spin" /> : <RiCameraLine />} Add {kind} photos
                      </button>
                    </>
                  )}
                </div>
                {photos(kind).length === 0 ? <p className="svc-muted" style={{ margin: 0 }}>None yet.</p> : (
                  <div className="cl-photo-grid">
                    {photos(kind).map((p, n) => <a key={n} href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={`${kind} ${n + 1}`} loading="lazy" /></a>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="svc-card">
            <h3>History</h3>
            <ul className="svc-timeline">
              {[...j.timeline].reverse().map((t, i) => <li key={i}><time>{fmtDateTime(t.at)}</time><span>{t.note || t.status.replace(/_/g, ' ')}{t.byName ? ` · ${t.byName}` : ''}</span></li>)}
            </ul>
          </div>
        </div>

        <aside className="svc-side">
          <div className="svc-card">
            <h3>Customer</h3>
            <strong>{j.customer.name}</strong>
            {j.customer.phone && <span className="svc-muted">{j.customer.phone}</span>}
            {j.customer.email && <span className="svc-muted">{j.customer.email}</span>}
          </div>
          <div className="svc-card">
            <h3><RiTeamLine /> Team</h3>
            {j.team.length ? j.team.map((t) => <span key={t.userId || t.name}>{t.name}</span>) : <span className="svc-muted">No one assigned yet.</span>}
          </div>
          <div className="svc-card">
            <h3>Price</h3>
            <div className="svc-row"><span>{j.service}</span><span>{money(j.price.base, j.currency)}</span></div>
            {j.price.rooms > 0 && <div className="svc-row"><span>Rooms</span><span>{money(j.price.rooms, j.currency)}</span></div>}
            {j.price.extras > 0 && <div className="svc-row"><span>Extras</span><span>{money(j.price.extras, j.currency)}</span></div>}
            {j.price.transport > 0 && <div className="svc-row"><span>Transport</span><span>{money(j.price.transport, j.currency)}</span></div>}
            {j.price.discount > 0 && <div className="svc-row"><span>Discount</span><span>-{money(j.price.discount, j.currency)}</span></div>}
          </div>
          <PaymentBox total={j.price.total} paid={j.amountPaid} balance={j.balance} currency={j.currency} payments={j.payments}
            onPay={async (p) => { const { data } = await cleaningService.pay(j.id, p); keep(data.data); }} disabled={j.status === 'cancelled'} />
          {isManager && ['scheduled', 'on_the_way'].includes(j.status) && (
            <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setCancelling(true)}><RiForbidLine /> Cancel visit</button>
          )}
        </aside>
      </div>

      {done && (
        <Modal title="Job completed 🎉" onClose={() => setDone(null)}>
          <p style={{ marginTop: 0 }}>{done.job.balance > 0 ? <>The customer still owes <strong>{money(done.job.balance, done.job.currency)}</strong>. Record it in the Payment box when they pay.</> : 'Fully paid.'}</p>
          {done.next && <p className="svc-muted">Next visit booked: <strong>{fmtDate(done.next.scheduledAt)}, {fmtTime(done.next.scheduledAt)}</strong> ({done.next.jobNumber}).</p>}
          <div className="svc-actions">
            {done.job.customer.phone && <a className="btn btn-primary" href={waLink(done.job.customer.phone, doneText(done.job, company))} target="_blank" rel="noopener noreferrer" onClick={() => setDone(null)}><RiWhatsappLine /> Thank the customer</a>}
            <button className="btn btn-secondary" onClick={() => setDone(null)}>Close</button>
          </div>
        </Modal>
      )}
      {editing && <EditModal j={j} onClose={() => setEditing(false)} onSaved={(saved) => { keep(saved); setEditing(false); }} />}
      {cancelling && <CancelModal j={j} onClose={() => setCancelling(false)} onDone={(saved, next) => { keep(saved); setCancelling(false); if (next) toast.success(`Next visit kept: ${fmtDate(next.scheduledAt)}`); navigate('/cleaning'); }} />}
      {printing && createPortal(<div className="svc-print"><JobSheet j={j} /></div>, document.body)}
    </div>
  );
}

function EditModal({ j, onClose, onSaved }) {
  const [team, setTeam] = useState([]);
  const [picked, setPicked] = useState(j.team.map((t) => t.userId).filter(Boolean));
  const [date, setDate] = useState(lagosDateOf(j.scheduledAt));
  const [time, setTime] = useState(fmtTime(j.scheduledAt));
  const [hours, setHours] = useState(j.hours);
  const [discount, setDiscount] = useState(j.price.discount || '');
  const [notes, setNotes] = useState(j.notes);
  const [busy, setBusy] = useState(false);
  useEffect(() => { cleaningService.team().then(({ data }) => setTeam(data.data)).catch(() => {}); }, []);
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await cleaningService.update(j.id, { scheduledAt: lagosISO(date, time), hours: Number(hours), team: picked, discount: Number(discount) || 0, notes });
      for (const w of data.warnings || []) toast(w, { icon: '⚠️', duration: 7000 });
      toast.success('Saved');
      onSaved(data.data);
    } catch (err) { toast.error(errText(err, 'Could not save.')); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Edit ${j.jobNumber}`} onClose={onClose}>
      <div className="svc-form">
        <div className="svc-grid3">
          <label className="svc-field">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="svc-field">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="svc-field">Hours<input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        </div>
        <span className="svc-field">Team</span>
        <div className="cl-people">
          {team.map((t) => (
            <button type="button" key={t.id} className={picked.includes(t.id) ? 'active' : ''} onClick={() => setPicked((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))}>{t.name}</button>
          ))}
        </div>
        <label className="svc-field">Discount<input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <label className="svc-field">Notes for the team<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="svc-actions">
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? <RiLoader4Line className="spin" /> : null} Save</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function CancelModal({ j, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [stop, setStop] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) { toast.error('Say why the visit is cancelled.'); return; }
    setBusy(true);
    try {
      const { data } = await cleaningService.cancel(j.id, reason.trim(), stop);
      toast.success(`${j.jobNumber} cancelled`);
      onDone(data.data, data.nextJob);
    } catch (err) { toast.error(errText(err, 'Could not cancel.')); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Cancel ${j.jobNumber}?`} onClose={onClose}>
      <div className="svc-form">
        <label className="svc-field">Reason<input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer travelling" /></label>
        {j.recurrence !== 'none' && (
          <label className="svc-check"><input type="checkbox" checked={stop} onChange={(e) => setStop(e.target.checked)} /> Stop the repeating booking too (otherwise only this visit is skipped)</label>
        )}
        <div className="svc-actions">
          <button className="btn btn-danger" disabled={busy} onClick={submit}>{busy ? <RiLoader4Line className="spin" /> : null} Cancel visit</button>
          <button className="btn btn-secondary" onClick={onClose}>Keep it</button>
        </div>
      </div>
    </Modal>
  );
}

function JobSheet({ j }) {
  const b = j.business || {};
  return (
    <div className="cl-sheet">
      <div className="cl-sheet-head"><strong>{b.name}</strong><span>{b.phone}</span></div>
      <h2>{j.jobNumber}: {j.service}</h2>
      <p><strong>{fmtDate(j.scheduledAt)}, {fmtTime(j.scheduledAt)}–{fmtTime(j.endsAt)}</strong></p>
      <table>
        <tbody>
          <tr><td>Customer</td><td>{j.customer.name} · {j.customer.phone}</td></tr>
          <tr><td>Address</td><td>{j.address}{j.area ? `, ${j.area}` : ''}{j.landmark ? ` (landmark: ${j.landmark})` : ''}</td></tr>
          {j.accessNotes && <tr><td>Access</td><td>{j.accessNotes}</td></tr>}
          <tr><td>Property</td><td>{j.property.type}, {j.property.bedrooms} bed, {j.property.bathrooms} bath</td></tr>
          <tr><td>Team</td><td>{j.team.map((t) => t.name).join(', ') || '—'}</td></tr>
          <tr><td>To collect</td><td>{j.balance > 0 ? money(j.balance, j.currency) : 'Paid'}</td></tr>
        </tbody>
      </table>
      <h3>Checklist</h3>
      <ul>{j.checklist.map((t, i) => <li key={i}>☐ {t.task}</li>)}</ul>
      {j.notes && <p><strong>Notes:</strong> {j.notes}</p>}
      <div className="cl-sheet-sign"><span>Customer signature: ____________________</span><span>Time finished: ________</span></div>
    </div>
  );
}
