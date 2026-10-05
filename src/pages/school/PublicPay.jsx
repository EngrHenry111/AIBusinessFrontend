import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { RiCheckboxCircleLine, RiLoader4Line, RiLockLine } from 'react-icons/ri';
import { schoolService } from '../../services';
import { TERMS, money, fmtDate, fmtDateTime, errMsg } from './schoolConstants';
import { PublicHeader } from './PublicApply';
import './School.css';

// Bank transfers / USSD can sit in "pending" for a while — keep checking.
const POLL_MS = 4000;
const POLL_MAX = 45;

export default function PublicPay() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [school, setSchool] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    schoolService.publicSchool(slug).then(({ data }) => { setSchool(data.data); document.title = `Pay school fees — ${data.data.schoolName}`; })
      .catch((e) => setError(errMsg(e, 'School not found')));
  }, [slug]);

  if (error) return <div className="sc-public"><div className="sc-public-inner"><div className="card"><h2>School not found</h2><p>{error}</p></div></div></div>;
  if (!school) return <div className="sc-loading" style={{ minHeight: '100vh' }}><RiLoader4Line className="spin" /></div>;

  return (
    <div className="sc-public school-page">
      <div className="sc-public-inner">
        <PublicHeader school={school} />
        <div className="card">
          {reference
            ? <Verify slug={slug} reference={reference} onAgain={() => setParams({})} />
            : <PayForm slug={slug} school={school} cancelled={params.get('payment') === 'cancelled'} />}
        </div>
        <p className="cell-sub" style={{ textAlign: 'center', marginTop: 16 }}><RiLockLine style={{ verticalAlign: '-2px' }} /> Payments are processed securely by Paystack and go directly to the school.</p>
      </div>
    </div>
  );
}

function PayForm({ slug, school, cancelled }) {
  const [creds, setCreds] = useState({ admissionNumber: '', contact: '' });
  const [account, setAccount] = useState(null);
  const [billId, setBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(cancelled ? 'Payment was cancelled. You can try again below.' : '');
  const bill = account?.bills.find((b) => b._id === billId);

  async function lookup(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await schoolService.publicLookup(slug, creds);
      setAccount(data.data);
      const first = data.data.bills[0];
      if (first) { setBillId(first._id); setAmount(String(first.balance)); }
      if (creds.contact.includes('@')) setEmail(creds.contact);
    } catch (e2) { setErr(errMsg(e2, 'Could not find the student.')); }
    finally { setBusy(false); }
  }

  async function pay(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await schoolService.publicPay(slug, { ...creds, billId, amount: Number(amount), email });
      window.location.href = data.data.authorizationUrl;
    } catch (e2) { setErr(errMsg(e2, 'Could not start the payment.')); setBusy(false); }
  }

  if (!account) {
    return (
      <form onSubmit={lookup}>
        <h2 style={{ marginTop: 0 }}>Pay school fees</h2>
        <p className="cell-sub">Enter your child's admission number and the phone number or email you gave the school.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <div className="form-group"><label className="form-label">Admission number</label><input className="form-input" required placeholder="e.g. STU/2026/0001" value={creds.admissionNumber} onChange={(e) => setCreds({ ...creds, admissionNumber: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Parent's phone number or email</label><input className="form-input" required value={creds.contact} onChange={(e) => setCreds({ ...creds, contact: e.target.value })} /></div>
        </div>
        {err && <div className="sc-note warn" style={{ marginTop: 16 }}>{err}</div>}
        <button className="btn btn-primary btn-lg" style={{ marginTop: 20, width: '100%' }} disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
      </form>
    );
  }

  return (
    <form onSubmit={pay}>
      <h2 style={{ marginTop: 0 }}>{account.student.name}</h2>
      <p className="cell-sub">{account.student.admissionNumber}{account.student.className && ` · ${account.student.className}`} · <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAccount(null)}>Not you?</button></p>

      {account.bills.length === 0 ? (
        <div className="sc-note ok" style={{ marginTop: 16 }}>There are no outstanding fees for this student. Thank you!</div>
      ) : (
        <>
          <div className="sc-section">Outstanding fees — {money(account.outstanding)}</div>
          {account.bills.map((b) => (
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
                  <input className="form-input" type="number" required min={Math.min(bill.balance, school.minimumOnlinePayment || 0)} max={bill.balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <span className="form-hint">Full balance or a part payment{school.minimumOnlinePayment ? ` (at least ${money(Math.min(bill.balance, school.minimumOnlinePayment))})` : ''}.</span>
                </div>
                <div className="form-group"><label className="form-label">Email for your receipt</label><input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              {err && <div className="sc-note warn">{err}</div>}
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy || !(Number(amount) > 0)}>{busy ? 'Redirecting to Paystack…' : `Pay ${money(amount)}`}</button>
            </div>
          )}
        </>
      )}

      {account.payments.length > 0 && (
        <>
          <div className="sc-section">Recent payments</div>
          <ul className="sc-list">
            {account.payments.map((p) => <li key={p.receiptNumber}><span>{p.receiptNumber}<span className="cell-sub">{fmtDateTime(p.paidAt)}</span></span><b>{money(p.amount)}</b></li>)}
          </ul>
        </>
      )}
    </form>
  );
}

function Verify({ slug, reference, onAgain }) {
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
    return <div className="sc-done"><h2>Payment not confirmed</h2><p>{msg}</p><p className="cell-sub">Reference: {reference}</p><button className="btn btn-primary" onClick={onAgain}>Back to fees</button></div>;
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
      <Link to={`/schools/${slug}/pay`} className="btn btn-secondary" onClick={onAgain}>Make another payment</Link>
    </div>
  );
}
