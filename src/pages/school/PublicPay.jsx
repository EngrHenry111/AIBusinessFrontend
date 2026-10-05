import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  RiCheckboxCircleLine, RiLoader4Line, RiLockLine, RiLogoutBoxLine, RiPrinterLine, RiArrowLeftLine,
} from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, PAYMENT_METHODS, BILL_STATUS, money, fmtDate, fmtDateTime, errMsg } from './schoolConstants';
import { PublicHeader } from './PublicApply';
import ReportCardDoc from './ReportCardDoc';
import './School.css';

// Bank transfers / USSD can sit in "pending" for a while — keep checking.
const POLL_MS = 4000;
const POLL_MAX = 45;

// The parent's session survives a reload / the Paystack round trip, but
// only in this tab. Storage can be unavailable (private mode) — that's fine.
const store = {
  get: (slug) => { try { return JSON.parse(sessionStorage.getItem(`school-parent:${slug}`) || 'null'); } catch { return null; } },
  set: (slug, v) => { try { if (v) sessionStorage.setItem(`school-parent:${slug}`, JSON.stringify(v)); else sessionStorage.removeItem(`school-parent:${slug}`); } catch { /* ignore */ } },
};

const expired = (e) => e?.response?.data?.code === 'PORTAL_EXPIRED';

// Parent portal: fees (pay online), published report cards and attendance
// for every child registered with the parent's phone/email.
export default function ParentPortal() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [school, setSchool] = useState(null);
  const [error, setError] = useState('');
  const [session, setSession] = useState(() => store.get(slug)); // { token, guardianName, children }
  const [notice, setNotice] = useState(params.get('payment') === 'cancelled' ? 'Payment was cancelled. You can try again.' : '');

  useEffect(() => {
    schoolService.publicSchool(slug).then(({ data }) => { setSchool(data.data); document.title = `Parent portal — ${data.data.schoolName}`; })
      .catch((e) => setError(errMsg(e, 'School not found')));
  }, [slug]);

  const signIn = (s) => { store.set(slug, s); setSession(s); setNotice(''); };
  const signOut = useCallback((msg = '') => { store.set(slug, null); setSession(null); setNotice(msg); }, [slug]);
  const onError = useCallback((e) => { if (expired(e)) signOut('Your session has ended. Please sign in again.'); }, [signOut]);

  if (error) return <div className="sc-public"><div className="sc-public-inner"><div className="card"><h2>School not found</h2><p>{error}</p></div></div></div>;
  if (!school) return <div className="sc-loading" style={{ minHeight: '100vh' }}><RiLoader4Line className="spin" /></div>;

  return (
    <div className="sc-public school-page">
      <div className="sc-public-inner" style={{ maxWidth: 860 }}>
        <div className="sc-no-print"><PublicHeader school={school} /></div>
        {reference ? (
          <div className="card"><Verify slug={slug} reference={reference} onDone={() => setParams({})} /></div>
        ) : !session ? (
          <div className="card"><SignIn slug={slug} notice={notice} onSignedIn={signIn} /></div>
        ) : (
          <Portal slug={slug} school={school} session={session} setSession={signIn} onSignOut={() => signOut()} onError={onError} notice={notice} />
        )}
        <p className="cell-sub sc-no-print" style={{ textAlign: 'center', marginTop: 16 }}><RiLockLine style={{ verticalAlign: '-2px' }} /> Payments are processed securely by Paystack and go directly to the school.</p>
      </div>
    </div>
  );
}

function SignIn({ slug, notice, onSignedIn }) {
  const [creds, setCreds] = useState({ admissionNumber: '', contact: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await schoolService.portalLogin(slug, creds);
      onSignedIn({ ...data.data, contact: creds.contact.includes('@') ? creds.contact : '' });
    } catch (e2) { setErr(errMsg(e2, 'Could not sign you in.')); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>Parent portal</h2>
      <p className="cell-sub">Pay school fees and see report cards and attendance. Sign in with any of your children's admission numbers and the phone number or email you gave the school — you'll see all your children.</p>
      {notice && <div className="sc-note warn" style={{ marginTop: 12 }}>{notice}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <div className="form-group"><label className="form-label">Admission number</label><input className="form-input" required autoComplete="off" placeholder="e.g. STU/2026/0001" value={creds.admissionNumber} onChange={(e) => setCreds({ ...creds, admissionNumber: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Parent's phone number or email</label><input className="form-input" required value={creds.contact} onChange={(e) => setCreds({ ...creds, contact: e.target.value })} /></div>
      </div>
      {err && <div className="sc-note warn" style={{ marginTop: 16 }}>{err}</div>}
      <button className="btn btn-primary btn-lg" style={{ marginTop: 20, width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function Portal({ slug, school, session, setSession, onSignOut, onError, notice }) {
  const [childId, setChildId] = useState(session.children[0]?._id);
  const [tab, setTab] = useState('fees');
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setDetail(null);
    schoolService.portalChild(slug, session.token, childId).then(({ data }) => setDetail(data.data)).catch(onError);
    // Refresh balances on the child switcher too.
    schoolService.portalChildren(slug, session.token).then(({ data }) => setSession({ ...session, children: data.data })).catch(() => {});
  }, [slug, session.token, childId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="card card-pad sc-no-print" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="sc-strong">Welcome{session.guardianName ? `, ${session.guardianName}` : ''}</div>
          <span className="cell-sub">{session.children.length} child{session.children.length === 1 ? '' : 'ren'} at {school.schoolName}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSignOut}><RiLogoutBoxLine /> Sign out</button>
      </div>
      {notice && <div className="sc-note warn sc-no-print" style={{ marginBottom: 12 }}>{notice}</div>}

      {session.children.length > 1 && (
        <div className="sc-chips sc-no-print" style={{ marginBottom: 16 }}>
          {session.children.map((c) => (
            <button key={c._id} type="button" className={`sc-chip ${c._id === childId ? 'on' : ''}`} onClick={() => { setChildId(c._id); setTab('fees'); }}>
              {c.firstName}{c.className && ` · ${c.className}`}{c.outstanding > 0 && ` · owes ${money(c.outstanding)}`}
            </button>
          ))}
        </div>
      )}

      {!detail ? <div className="card"><div className="sc-loading"><RiLoader4Line className="spin" /></div></div> : (
        <>
          <div className="card card-pad sc-no-print" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>{detail.student.name}</h2>
            <span className="cell-sub">{detail.student.admissionNumber}{detail.student.className && ` · ${detail.student.className}`}</span>
            <div className="sc-tabs" role="tablist" style={{ marginTop: 16, marginBottom: 0 }}>
              {[['fees', `Fees${detail.outstanding > 0 ? ` (${money(detail.outstanding)})` : ''}`], ['results', 'Results'], ['attendance', 'Attendance'], ['timetable', 'Timetable & exams']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={`sc-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          {tab === 'fees' && <FeesTab slug={slug} school={school} session={session} detail={detail} onError={onError} />}
          {tab === 'results' && <ResultsTab slug={slug} session={session} detail={detail} onError={onError} />}
          {tab === 'attendance' && <AttendanceTab detail={detail} />}
          {tab === 'timetable' && <ScheduleTab slug={slug} session={session} detail={detail} onError={onError} />}
        </>
      )}
    </>
  );
}

function FeesTab({ slug, school, session, detail, onError }) {
  const open = detail.bills.filter((b) => ['unpaid', 'partial'].includes(b.status) && b.balance > 0);
  const [billId, setBillId] = useState(open[0]?._id || '');
  const [amount, setAmount] = useState(open[0] ? String(open[0].balance) : '');
  const [email, setEmail] = useState(session.contact || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bill = open.find((b) => b._id === billId);
  const min = bill ? Math.min(bill.balance, school.minimumOnlinePayment || 0) : 0;

  async function pay(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await schoolService.portalPay(slug, session.token, { studentId: detail.student._id, billId, amount: Number(amount), email });
      window.location.href = data.data.authorizationUrl;
    } catch (e2) { onError(e2); setErr(errMsg(e2, 'Could not start the payment.')); setBusy(false); }
  }

  return (
    <div className="card card-pad">
      {open.length === 0 ? <div className="sc-note ok">No outstanding fees for {detail.student.name.split(' ')[1] || 'this child'}. Thank you!</div> : (
        <form onSubmit={pay}>
          <div className="sc-section" style={{ marginTop: 0 }}>Outstanding — {money(detail.outstanding)}</div>
          {open.map((b) => (
            <label key={b._id} className={`sc-bill-option ${billId === b._id ? 'on' : ''}`}>
              <input type="radio" name="bill" checked={billId === b._id} onChange={() => { setBillId(b._id); setAmount(String(b.balance)); }} />
              <div>
                <div className="sc-strong">{b.title}</div>
                <span className="cell-sub">{b.session} {TERMS[b.term]}{b.dueDate && ` · due ${fmtDate(b.dueDate)}`}</span>
                <span className="cell-sub">{b.items.map((i) => `${i.name} ${money(i.amount)}`).join(' · ')}{b.discount > 0 && ` · discount −${money(b.discount)}`}</span>
                {b.amountPaid > 0 && <span className="cell-sub">Paid so far: {money(b.amountPaid)}</span>}
              </div>
              <b className="sc-owing">{money(b.balance)}</b>
            </label>
          ))}
          {!school.onlinePayments ? (
            <div className="sc-note warn" style={{ marginTop: 16 }}>Online payment isn't available for this school yet. Please pay at the school's bursary.</div>
          ) : bill && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Amount to pay (₦)</label>
                  <input className="form-input" type="number" required min={min} max={bill.balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <span className="form-hint">Full balance or a part payment{min ? ` (at least ${money(min)})` : ''}.</span>
                </div>
                <div className="form-group"><label className="form-label">Email for your receipt</label><input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              {err && <div className="sc-note warn">{err}</div>}
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy || !(Number(amount) > 0)}>{busy ? 'Redirecting to Paystack…' : `Pay ${money(amount)}`}</button>
            </div>
          )}
        </form>
      )}

      {detail.payments.length > 0 && (
        <>
          <div className="sc-section">Payment history</div>
          <ul className="sc-list">
            {detail.payments.map((p) => (
              <li key={p._id}><span>{p.receiptNumber}<span className="cell-sub">{fmtDateTime(p.paidAt)} · {PAYMENT_METHODS[p.method]}</span></span><b>{money(p.amount)}</b></li>
            ))}
          </ul>
        </>
      )}
      {detail.bills.some((b) => !open.includes(b)) && (
        <>
          <div className="sc-section">Settled bills</div>
          <ul className="sc-list">
            {detail.bills.filter((b) => !open.includes(b)).map((b) => (
              <li key={b._id}><span>{b.title}<span className="cell-sub">{b.session} {TERMS[b.term]}</span></span><span className={`badge badge-${BILL_STATUS[b.status]?.badge}`}>{BILL_STATUS[b.status]?.label}</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ResultsTab({ slug, session, detail, onError }) {
  const [open, setOpen] = useState(null); // { session, term }
  const [card, setCard] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setCard(null); setErr('');
    schoolService.portalReportCard(slug, session.token, detail.student._id, open)
      .then(({ data }) => setCard(data.data))
      .catch((e) => { onError(e); setErr(errMsg(e)); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (open) {
    return (
      <>
        <div className="sc-actions sc-no-print" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={() => setOpen(null)}><RiArrowLeftLine /> All results</button>
          <button className="btn btn-primary" disabled={!card} onClick={() => window.print()}><RiPrinterLine /> Print / save as PDF</button>
        </div>
        {err ? <div className="sc-note warn">{err}</div> : !card ? <div className="card"><div className="sc-loading"><RiLoader4Line className="spin" /></div></div> : <ReportCardDoc data={card} />}
      </>
    );
  }
  return (
    <div className="card card-pad">
      {detail.results.length === 0 ? <p className="cell-sub" style={{ margin: 0 }}>No results have been released yet. You'll be notified when report cards are ready.</p> : (
        <ul className="sc-list">
          {detail.results.map((r) => (
            <li key={`${r.session}-${r.term}`}>
              <span><span className="sc-strong">{TERMS[r.term]} {r.session}</span><span className="cell-sub">{r.className}</span></span>
              <button className="btn btn-secondary btn-sm" onClick={() => setOpen({ session: r.session, term: r.term })}>View report card</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function ScheduleTab({ slug, session, detail, onError }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    schoolService.portalSchedule(slug, session.token, detail.student._id).then(({ data: r }) => setData(r.data)).catch((e) => { onError(e); setData({ periods: [], slots: [], exams: [] }); });
  }, [detail.student._id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <div className="card"><div className="sc-loading"><RiLoader4Line className="spin" /></div></div>;
  const at = Object.fromEntries(data.slots.map((x) => [`${x.day}:${x.period}`, x]));
  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="sc-card-title">Upcoming exams</div>
        {data.exams.length === 0 ? <p className="cell-sub" style={{ margin: 0 }}>No exams scheduled yet.</p> : (
          <ul className="sc-list">
            {data.exams.map((x) => (
              <li key={x._id}>
                <span><span className="sc-strong">{x.subject}</span><span className="cell-sub">{x.venue || ''}</span></span>
                <span style={{ textAlign: 'right' }}>{fmtDate(`${x.date}T12:00:00`)}<span className="cell-sub">{x.start}–{x.end}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card card-pad">
        <div className="sc-card-title">Class timetable</div>
        {data.slots.length === 0 ? <p className="cell-sub" style={{ margin: 0 }}>The timetable hasn't been published yet.</p> : (
          <div className="table-wrapper" style={{ border: 0 }}>
            <table className="sc-tt">
              <thead><tr><th>Time</th>{WEEKDAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
              <tbody>
                {data.periods.map((p, i) => (
                  <tr key={i} className={p.isBreak ? 'brk' : ''}>
                    <th>{p.start}<span className="cell-sub" style={{ marginTop: 0 }}>{p.end}</span></th>
                    {p.isBreak ? <td colSpan={5} className="brk-cell">{p.label}</td> : WEEKDAYS.map((_, d) => {
                      const x = at[`${d + 1}:${i}`];
                      return <td key={d}>{x && <><div className="sc-strong">{x.subject}</div>{x.teacherName && <span className="cell-sub">{x.teacherName}</span>}</>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AttendanceTab({ detail }) {
  const a = detail.attendance;
  const attended = a.present + a.late;
  const marked = attended + a.absent + a.excused;
  return (
    <div className="card card-pad">
      <div className="sc-card-title">{a.session} · {TERMS[a.term]}</div>
      {!marked ? <p className="cell-sub" style={{ margin: 0 }}>No attendance has been recorded this term yet.</p> : (
        <>
          <div className="stat-value">{Math.round((attended / marked) * 100)}%</div>
          <div className="sc-progress"><div style={{ width: `${(attended / marked) * 100}%` }} /></div>
          <div className="sc-summary">
            <div><span>Present</span><b>{a.present}</b></div>
            <div><span>Late</span><b>{a.late}</b></div>
            <div><span>Absent</span><b className={a.absent ? 'sc-owing' : ''}>{a.absent}</b></div>
            {a.excused > 0 && <div><span>Excused</span><b>{a.excused}</b></div>}
          </div>
        </>
      )}
    </div>
  );
}

function Verify({ slug, reference, onDone }) {
  const [state, setState] = useState('verifying');
  const [receipt, setReceipt] = useState(null);
  const [msg, setMsg] = useState('');
  const tries = useRef(0);

  useEffect(() => {
    let timer;
    let alive = true;
    const check = async () => {
      try {
        const { data } = await schoolService.publicVerify(slug, reference);
        if (!alive) return;
        if (data.data.state === 'ok') { setReceipt(data.data.receipt); setState('ok'); }
        else if (data.data.state === 'pending' && tries.current < POLL_MAX) { tries.current += 1; setState('pending'); timer = setTimeout(check, POLL_MS); }
        else { setState('failed'); setMsg(data.data.message || 'We could not confirm this payment yet. If you were debited, the school will see it once the bank settles — keep your Paystack reference.'); }
      } catch (e) { if (alive) { setState('failed'); setMsg(errMsg(e, 'Could not confirm the payment.')); } }
    };
    check();
    return () => { alive = false; clearTimeout(timer); };
  }, [slug, reference]);

  if (state === 'verifying' || state === 'pending') {
    return <div className="sc-done"><RiLoader4Line className="spin" style={{ color: 'var(--color-brand)' }} /><h2>{state === 'pending' ? 'Waiting for your bank…' : 'Confirming your payment…'}</h2><p className="cell-sub">Please don't close this page.</p></div>;
  }
  if (state === 'failed') {
    return <div className="sc-done"><h2>Payment not confirmed</h2><p>{msg}</p><p className="cell-sub">Reference: {reference}</p><button className="btn btn-primary" onClick={onDone}>Back to the portal</button></div>;
  }
  return (
    <div className="sc-done">
      <RiCheckboxCircleLine />
      <h2>Payment successful</h2>
      <p><b>{money(receipt.amount)}</b> received for <b>{receipt.student}</b> ({receipt.admissionNumber}).</p>
      <div className="sc-summary" style={{ textAlign: 'left', maxWidth: 380, margin: '16px auto' }}>
        <div><span>Receipt</span><b>{receipt.receiptNumber}</b></div>
        <div><span>For</span><span>{receipt.bill?.title} · {receipt.bill?.session} {TERMS[receipt.bill?.term]}</span></div>
        <div><span>Date</span><span>{fmtDateTime(receipt.paidAt)}</span></div>
        <div className="grand"><span>Balance remaining</span><span>{money(Math.max(0, receipt.bill?.balance))}</span></div>
      </div>
      <p className="cell-sub">A receipt has been emailed to you. The school's records are already updated.</p>
      <Link to={`/schools/${slug}/portal`} className="btn btn-secondary" onClick={onDone}>Back to the portal</Link>
    </div>
  );
}
