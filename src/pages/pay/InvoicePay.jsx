import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RiLoader4Line, RiCheckboxCircleFill, RiErrorWarningLine, RiBankLine, RiSecurePaymentLine, RiFileCopyLine } from 'react-icons/ri';
import { payService } from '../../services';
import BrandMark from '../../components/brand/BrandMark';
import './InvoicePay.css';

const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: '₵', KES: 'KSh ', ZAR: 'R' };
const money = (n, cur = 'NGN') => `${SYMBOLS[cur] || `${cur} `}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const errText = (e, fallback) => e?.response?.data?.message || fallback;

// The page a customer opens from an invoice email, SMS or shared link.
export default function InvoicePay() {
  const { token } = useParams();
  const [params, setParams] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');
  const [state, setState] = useState(reference ? 'verifying' : 'idle'); // idle | starting | verifying | paid | failed
  const [notice, setNotice] = useState(params.get('payment') === 'cancelled' ? 'Payment cancelled. You can try again whenever you are ready.' : '');
  const [email, setEmail] = useState('');

  useEffect(() => {
    payService.get(token)
      .then(({ data }) => { setInv(data.data); document.title = `Invoice ${data.data.invoiceNumber} · ${data.data.business.name}`; })
      .catch((e) => setError(errText(e, 'This payment link could not be opened.')));
  }, [token]);

  // Back from Paystack: confirm with the server before saying anything.
  const verify = useCallback(async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const { data } = await payService.verify(token, reference);
        const r = data.data;
        if (r.state === 'paid') { setInv(r.invoice); setState('paid'); return; }
        if (r.state === 'failed') { setState('failed'); setNotice(r.message); return; }
      } catch (e) { setState('failed'); setNotice(errText(e, 'We could not confirm this payment.')); return; }
      await new Promise((res) => setTimeout(res, 3000)); // eslint-disable-line no-await-in-loop
    }
    setState('failed');
    setNotice('Your bank is still processing this payment. If you were charged, it will show here shortly. Please don’t pay twice.');
  }, [token, reference]);
  useEffect(() => { if (reference) verify(); }, [reference, verify]);

  async function pay(e) {
    e.preventDefault();
    setState('starting');
    setNotice('');
    try {
      const { data } = await payService.start(token, { email: email.trim() || undefined });
      window.location.assign(data.data.authorizationUrl);
    } catch (err) {
      setState('idle');
      setNotice(errText(err, 'Could not start the payment. Please try again.'));
    }
  }

  function tryAgain() {
    params.delete('reference'); params.delete('trxref');
    setParams(params, { replace: true });
    setState('idle');
  }

  if (error) {
    return (
      <Shell>
        <div className="ip-card ip-center">
          <RiErrorWarningLine className="ip-big warn" />
          <h1>Link not available</h1>
          <p className="ip-muted">{error} Please contact the business that sent you this invoice.</p>
        </div>
      </Shell>
    );
  }
  if (!inv) return <Shell><div className="ip-card ip-center"><RiLoader4Line className="spin ip-big" /></div></Shell>;

  const cur = inv.currency;
  const settled = inv.balance <= 0 || inv.status === 'paid';
  const overdue = !settled && inv.dueAt && new Date(inv.dueAt) < new Date();
  const bank = inv.business.bank;

  return (
    <Shell business={inv.business}>
      {state === 'paid' && (
        <div className="ip-banner ok"><RiCheckboxCircleFill /><span>Payment received. Thank you! {inv.balance > 0 ? `${money(inv.balance, cur)} is still due.` : 'This invoice is now fully paid.'}</span></div>
      )}
      {state === 'verifying' && <div className="ip-banner"><RiLoader4Line className="spin" /><span>Confirming your payment…</span></div>}
      {notice && <div className={`ip-banner ${state === 'failed' ? 'bad' : ''}`}><span>{notice}{state === 'failed' && <> <button type="button" className="ip-link" onClick={tryAgain}>Try again</button></>}</span></div>}

      <div className="ip-card">
        <div className="ip-head">
          <div>
            <span className="ip-eyebrow">Invoice</span>
            <h1>{inv.invoiceNumber}</h1>
            <p className="ip-muted">For {inv.customerName} · issued {day(inv.issuedAt)}</p>
          </div>
          <span className={`ip-status ${settled ? 'paid' : overdue ? 'overdue' : ''}`}>{settled ? 'Paid' : overdue ? 'Overdue' : `Due ${day(inv.dueAt)}`}</span>
        </div>

        <div className="ip-amount">
          <span>{settled ? 'Total paid' : inv.amountPaid > 0 ? 'Balance due' : 'Amount due'}</span>
          <strong>{money(settled ? inv.total : inv.balance, cur)}</strong>
          {!settled && inv.amountPaid > 0 && <small>{money(inv.amountPaid, cur)} of {money(inv.total, cur)} already paid</small>}
        </div>

        {!settled && inv.canPayOnline && (
          <form className="ip-pay" onSubmit={pay}>
            <label htmlFor="ip-email">Email for your receipt</label>
            <input id="ip-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="ip-btn" disabled={state === 'starting' || state === 'verifying'}>
              {state === 'starting' ? <><RiLoader4Line className="spin" /> Opening Paystack…</> : <><RiSecurePaymentLine /> Pay {money(inv.balance, cur)}</>}
            </button>
            <p className="ip-muted ip-small">Card, bank transfer or USSD, secured by Paystack. Paid straight to {inv.business.name}.</p>
          </form>
        )}

        {!settled && bank && (
          <div className="ip-bank">
            <div className="ip-bank-title"><RiBankLine /> {inv.canPayOnline ? 'Or pay by bank transfer' : 'Pay by bank transfer'}</div>
            <Row label="Bank" value={bank.bankName} />
            <Row label="Account name" value={bank.accountName} />
            <Row label="Account number" value={bank.accountNumber} copy />
            <Row label="Reference" value={inv.invoiceNumber} copy />
            <p className="ip-muted ip-small">A transfer is marked as paid once {inv.business.name} confirms it.</p>
          </div>
        )}
        {!settled && !inv.canPayOnline && !bank && (
          <p className="ip-muted">Please contact {inv.business.name} for payment details{inv.business.phone ? ` on ${inv.business.phone}` : ''}.</p>
        )}

        <table className="ip-items">
          <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}><td>{it.description}</td><td className="num">{it.quantity}</td><td className="num">{money(it.total, cur)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            {inv.tax > 0 && <tr><td colSpan={2}>Tax</td><td className="num">{money(inv.tax, cur)}</td></tr>}
            {inv.discount > 0 && <tr><td colSpan={2}>Discount</td><td className="num">-{money(inv.discount, cur)}</td></tr>}
            <tr className="grand"><td colSpan={2}>Total</td><td className="num">{money(inv.total, cur)}</td></tr>
          </tfoot>
        </table>
        {inv.notes && <p className="ip-notes">{inv.notes}</p>}
      </div>
    </Shell>
  );
}

function Row({ label, value, copy }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ip-row">
      <span>{label}</span>
      <strong>{value || '—'}
        {copy && value && (
          <button type="button" className="ip-copy" aria-label={`Copy ${label}`} onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
            {done ? 'Copied' : <RiFileCopyLine />}
          </button>
        )}
      </strong>
    </div>
  );
}

function Shell({ business, children }) {
  return (
    <div className="ip-page">
      <header className="ip-top">
        {business?.logo ? <img src={business.logo} alt="" className="ip-logo" /> : null}
        <div>
          <div className="ip-biz">{business?.name || 'Invoice'}</div>
          {business && <div className="ip-muted ip-small">{[business.phone, business.email].filter(Boolean).join(' · ')}</div>}
        </div>
      </header>
      <main className="ip-main">{children}</main>
      <footer className="ip-foot"><BrandMark size={18} /> Invoicing by BizlyAI</footer>
    </div>
  );
}
