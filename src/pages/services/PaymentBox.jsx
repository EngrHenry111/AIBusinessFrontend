import { useState } from 'react';
import toast from 'react-hot-toast';
import { RiLoader4Line } from 'react-icons/ri';
import { PAY_METHODS, PAY_LABEL, money, fmtDateTime, errText } from './svc';

// Balance, payment history and "record a payment" for a ticket or a job.
export default function PaymentBox({ total, paid, balance, currency, payments, onPay, disabled }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount || balance);
    if (!(n > 0)) return;
    setBusy(true);
    try {
      await onPay({ amount: n, method });
      setAmount('');
      toast.success(`${money(n, currency)} recorded`);
    } catch (err) {
      toast.error(errText(err, 'Could not record the payment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="svc-card">
      <h3>Payment</h3>
      <div className="svc-row"><span>Total</span><strong>{money(total, currency)}</strong></div>
      <div className="svc-row"><span>Paid</span><span>{money(paid, currency)}</span></div>
      <div className={`svc-row svc-balance ${balance > 0 ? 'owing' : 'clear'}`}>
        <span>Balance</span><strong>{balance > 0 ? money(balance, currency) : 'Fully paid'}</strong>
      </div>
      {payments.length > 0 && (
        <ul className="svc-payments">
          {payments.map((p, i) => (
            <li key={i}>
              <span>{fmtDateTime(p.at)} · {PAY_LABEL[p.method] || p.method}{p.byName ? ` · ${p.byName}` : ''}</span>
              <span>{money(p.amount, currency)}</span>
            </li>
          ))}
        </ul>
      )}
      {balance > 0 && !disabled && (
        <form className="svc-pay-form" onSubmit={submit}>
          <input type="number" inputMode="decimal" min="0" step="any" placeholder={String(balance)} value={amount}
            onChange={(e) => setAmount(e.target.value)} aria-label="Amount paid" />
          <div className="svc-seg" role="radiogroup" aria-label="Payment method">
            {PAY_METHODS.map((m) => (
              <button type="button" key={m.id} role="radio" aria-checked={method === m.id} className={method === m.id ? 'active' : ''} onClick={() => setMethod(m.id)}>{m.label}</button>
            ))}
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <RiLoader4Line className="spin" /> : null} Record {money(Number(amount || balance), currency)}
          </button>
        </form>
      )}
    </div>
  );
}
