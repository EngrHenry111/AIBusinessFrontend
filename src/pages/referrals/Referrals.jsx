import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { referralService, paymentSettingsService } from '../../services';
import {
  RiGiftLine, RiFileCopyLine, RiWhatsappLine, RiLoader4Line, RiBankLine,
  RiCalendarCheckLine, RiCloseLine, RiTimeLine, RiTeamLine, RiWallet3Line,
  RiCheckLine, RiUserAddLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Referrals.css';

const PLAN_NAMES = { starter: 'Starter', professional: 'Professional', business: 'Business', enterprise: 'Enterprise', trial: 'Free trial' };
const PLAN_PRICES = { starter: 4900, professional: 14900, business: 34900 };

const naira = (n) => `₦${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const errMsg = (err, fallback) => err.response?.data?.message || fallback;

const PAYOUT_BADGE = { requested: ['warning', 'Waiting'], paid: ['success', 'Paid'], rejected: ['danger', 'Rejected'] };

export default function Referrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await referralService.get();
      setData(res.data);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load referrals'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="rf-loading"><RiLoader4Line className="spin" /></div>;
  if (!data) return null;

  const pct = Math.round(data.rate * 100);
  const { balance } = data;
  const canWithdraw = balance.balance >= data.minWithdrawal && !data.openWithdrawal;
  const shareText = `I run my business on BizlyAI: sales, invoices, stock, staff and an AI assistant in one place. Start your free trial here: ${data.link}`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  };

  const claim = async (e) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const { data: res } = await referralService.claim(claimCode);
      toast.success(res.message);
      setClaimCode('');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Could not add that code'));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="rf-page fade-in">
      <div className="page-header">
        <h1><RiGiftLine /> Referrals</h1>
        <p>Earn {pct}% of every payment from businesses you refer, every month they stay subscribed.</p>
      </div>

      <div className="card rf-share">
        <div className="rf-share-text">
          <h3>Your referral link</h3>
          <p>Share it with other business owners. When they subscribe, you earn {pct}% of what they pay, by card or transfer, monthly or yearly.</p>
        </div>
        <div className="rf-link-row">
          <input className="form-input rf-link" value={data.link} readOnly onFocus={(e) => e.target.select()} aria-label="Referral link" />
          <button type="button" className="btn btn-primary" onClick={() => copy(data.link, 'Link')}><RiFileCopyLine /> Copy</button>
          <a className="btn btn-secondary rf-wa" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
            <RiWhatsappLine /> Share
          </a>
        </div>
        <div className="rf-code">
          Code: <strong>{data.code}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(data.code, 'Code')}><RiFileCopyLine /></button>
        </div>
      </div>

      <div className="rf-stats">
        <div className="stat-card rf-stat rf-stat-main">
          <div className="rf-stat-label"><RiWallet3Line /> Available balance</div>
          <div className="rf-stat-value">{naira(balance.balance)}</div>
          <div className="rf-stat-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={!canWithdraw} onClick={() => setShowWithdraw(true)}>
              <RiBankLine /> Withdraw
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={balance.balance <= 0} onClick={() => setShowCredit(true)}>
              <RiCalendarCheckLine /> Pay my plan
            </button>
          </div>
          <div className="rf-stat-sub">
            {data.openWithdrawal ? 'A withdrawal is waiting to be paid.' : `Withdraw from ${naira(data.minWithdrawal)}, or use any amount on your own plan.`}
          </div>
        </div>
        <div className="stat-card rf-stat">
          <div className="rf-stat-label"><RiTimeLine /> On hold</div>
          <div className="rf-stat-value">{naira(balance.pending)}</div>
          <div className="rf-stat-sub">Earnings unlock {data.holdDays} days after each payment</div>
        </div>
        <div className="stat-card rf-stat">
          <div className="rf-stat-label"><RiGiftLine /> Total earned</div>
          <div className="rf-stat-value">{naira(balance.totalEarned)}</div>
          <div className="rf-stat-sub">{naira(balance.spent)} withdrawn or used</div>
        </div>
        <div className="stat-card rf-stat">
          <div className="rf-stat-label"><RiTeamLine /> Paying referrals</div>
          <div className="rf-stat-value">{data.payingCount} <span className="rf-of">of {data.referred.length}</span></div>
          <div className="rf-stat-sub">Businesses that signed up with your link</div>
        </div>
      </div>

      {data.canClaim && (
        <form className="card rf-claim" onSubmit={claim}>
          <RiUserAddLine className="rf-claim-icon" />
          <div className="rf-claim-text">
            <strong>Did someone refer you?</strong>
            <span>Add their code now. It can be added before your first payment, within 30 days of signing up.</span>
          </div>
          <input className="form-input" placeholder="Referral code" value={claimCode} onChange={(e) => setClaimCode(e.target.value.toUpperCase())} maxLength={20} required />
          <button type="submit" className={`btn btn-secondary ${claiming ? 'btn-loading' : ''}`} disabled={claiming}>Add code</button>
        </form>
      )}
      {data.referredBy && <p className="rf-note">You joined through {data.referredBy.companyName}&apos;s referral.</p>}

      <section className="card rf-section">
        <h3>Businesses you referred</h3>
        {data.referred.length === 0 ? (
          <div className="rf-empty">No one has signed up with your link yet. Share it on WhatsApp or with other business owners you know.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Business</th><th>Joined</th><th>Plan</th><th>Status</th><th className="rf-num">You earned</th></tr></thead>
              <tbody>
                {data.referred.map((c) => (
                  <tr key={c._id}>
                    <td>{c.companyName}</td>
                    <td>{fmtDate(c.joinedAt)}</td>
                    <td>{PLAN_NAMES[c.plan] || c.plan}</td>
                    <td>{c.paying ? <span className="badge badge-success">Paying</span> : <span className="badge badge-neutral">{c.plan === 'trial' ? 'On trial' : 'Not paying'}</span>}</td>
                    <td className="rf-num">{naira(c.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card rf-section">
        <h3>Earnings</h3>
        {data.earnings.length === 0 ? (
          <div className="rf-empty">You earn {pct}% each time a business you referred pays for BizlyAI.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Date</th><th>From</th><th>Their payment</th><th className="rf-num">You earned</th><th>Status</th></tr></thead>
              <tbody>
                {data.earnings.map((e) => (
                  <tr key={e._id}>
                    <td>{fmtDate(e.createdAt)}</td>
                    <td>{e.companyName}<span className="cell-sub">{PLAN_NAMES[e.plan] || e.plan}{e.billingCycle === 'annual' ? ', yearly' : ''}</span></td>
                    <td>{naira(e.paymentAmount)}</td>
                    <td className="rf-num">{naira(e.amount)}</td>
                    <td>
                      {e.status === 'reversed' ? <span className="badge badge-danger">Reversed</span>
                        : e.available ? <span className="badge badge-success">Available</span>
                          : <span className="badge badge-warning">On hold until {fmtDate(e.availableAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.payouts.length > 0 && (
        <section className="card rf-section">
          <h3>Withdrawals and plan payments</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th className="rf-num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {data.payouts.map((p) => {
                  const [tone, label] = p.type === 'credit' ? ['success', 'Done'] : PAYOUT_BADGE[p.status];
                  return (
                    <tr key={p._id}>
                      <td>{fmtDate(p.createdAt)}</td>
                      <td>
                        {p.type === 'credit' ? `A month of ${PLAN_NAMES[p.plan] || p.plan}` : 'Bank withdrawal'}
                        {p.bank && <span className="cell-sub">{p.bank.accountName}, {p.bank.bankName} {p.bank.accountNumber}</span>}
                        {p.note && p.status === 'rejected' && <span className="cell-sub">{p.note}</span>}
                      </td>
                      <td className="rf-num">{naira(p.amount)}</td>
                      <td><span className={`badge badge-${tone}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card rf-section rf-how">
        <h3>How it works</h3>
        <ol>
          <li>Share your link. Anyone who signs up with it is linked to you.</li>
          <li>They try BizlyAI free. You earn when they start paying, not during the trial.</li>
          <li>You get {pct}% of every payment they make, monthly or yearly, for as long as they stay subscribed.</li>
          <li>Each earning unlocks {data.holdDays} days after their payment. Withdraw to your bank from {naira(data.minWithdrawal)}, or pay for a month of your own plan with any balance.</li>
        </ol>
        <p className="rf-fine">Referring your own business, or accounts you control, is not allowed, and earnings from it are reversed. Full rules: <Link to="/terms">Terms, section 8</Link>.</p>
      </section>

      {showWithdraw && <WithdrawModal data={data} onClose={() => setShowWithdraw(false)} onDone={() => { setShowWithdraw(false); load(); }} />}
      {showCredit && <CreditModal data={data} onClose={() => setShowCredit(false)} onDone={() => { setShowCredit(false); load(); }} />}
    </div>
  );
}

function WithdrawModal({ data, onClose, onDone }) {
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({
    bankCode: data.lastBank?.bankCode || '',
    accountNumber: data.lastBank?.accountNumber || '',
    amount: String(Math.floor(data.balance.balance)),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paymentSettingsService.getBanks().then(({ data: res }) => setBanks(res.data || [])).catch(() => toast.error('Could not load the bank list'));
  }, []);

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const amount = Number(form.amount);
  const valid = form.bankCode && /^\d{10}$/.test(form.accountNumber) && amount >= data.minWithdrawal && amount <= data.balance.balance;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const bank = banks.find((b) => b.code === form.bankCode);
      const { data: res } = await referralService.withdraw({ ...form, amount, bankName: bank?.name || data.lastBank?.bankName });
      toast.success(res.message);
      onDone();
    } catch (err) {
      toast.error(errMsg(err, 'Withdrawal failed'));
    } finally {
      setSaving(false);
    }
  };

  // Portalled: the page's fade-in transform would trap a fixed overlay.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal rf-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Withdraw to bank</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body rf-modal-body">
          <p className="rf-modal-lead">Available: <strong>{naira(data.balance.balance)}</strong>. We check the account name with your bank, and the money is usually sent within 3 working days.</p>
          <div className="form-group">
            <label className="form-label">Bank</label>
            <select className="form-input form-select" value={form.bankCode} onChange={(e) => f('bankCode', e.target.value)} required>
              <option value="">Select your bank</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account number</label>
            <input className="form-input" inputMode="numeric" maxLength={10} value={form.accountNumber} onChange={(e) => f('accountNumber', e.target.value.replace(/\D/g, ''))} placeholder="10 digits" required />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₦)</label>
            <input className="form-input" type="number" min={data.minWithdrawal} max={Math.floor(data.balance.balance)} value={form.amount} onChange={(e) => f('amount', e.target.value)} required />
            <span className="form-hint">Minimum {naira(data.minWithdrawal)}</span>
          </div>
        </div>
        <div className="modal-footer rf-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={!valid || saving}><RiCheckLine /> Request withdrawal</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function CreditModal({ data, onClose, onDone }) {
  const running = data.runningPlan;
  const [plan, setPlan] = useState(running || 'starter');
  const [saving, setSaving] = useState(false);
  const price = running ? data.monthPrice : PLAN_PRICES[plan];
  const enough = data.balance.balance >= price;

  const submit = async () => {
    setSaving(true);
    try {
      const { data: res } = await referralService.useBalance(running ? undefined : plan);
      toast.success(`${res.message} Paid up to ${fmtDate(res.data.currentPeriodEnd)}.`);
      onDone();
    } catch (err) {
      toast.error(errMsg(err, 'Could not pay from your balance'));
    } finally {
      setSaving(false);
    }
  };

  // Portalled: the page's fade-in transform would trap a fixed overlay.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pay a month from your balance</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        <div className="modal-body rf-modal-body">
          {running ? (
            <p className="rf-modal-lead">One month of <strong>{PLAN_NAMES[running]}</strong> costs <strong>{naira(price)}</strong>. It is added on top of the days you have left. Nothing is charged to your card.</p>
          ) : (
            <>
              <p className="rf-modal-lead">You don&apos;t have a paid plan running. Choose one and a month starts today.</p>
              <div className="rf-plan-pick">
                {Object.entries(PLAN_PRICES).map(([key, value]) => (
                  <label key={key} className={`rf-plan-opt ${plan === key ? 'active' : ''}`}>
                    <input type="radio" name="plan" value={key} checked={plan === key} onChange={() => setPlan(key)} />
                    <span>{PLAN_NAMES[key]}</span>
                    <strong>{naira(value)}</strong>
                  </label>
                ))}
              </div>
            </>
          )}
          <p className={`rf-modal-balance ${enough ? '' : 'short'}`}>
            Your available balance: <strong>{naira(data.balance.balance)}</strong>
            {!enough && ` (${naira(price - data.balance.balance)} short)`}
          </p>
        </div>
        <div className="modal-footer rf-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={!enough || saving} onClick={submit}>
            <RiCalendarCheckLine /> Pay {naira(price)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
