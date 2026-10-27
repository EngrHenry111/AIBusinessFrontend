import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiCheckLine, RiLoader4Line, RiShieldCheckLine, RiTimeLine, RiArrowUpLine,
  RiMoneyDollarCircleLine, RiAlertLine, RiBankCardLine, RiRefreshLine,
  RiCloseCircleLine, RiCheckboxCircleLine, RiRepeatLine, RiWhatsappLine,
  RiVipCrownLine, RiBankLine, RiPlayCircleLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Billing.css';

const PLAN_COLORS = {
  trial: '#94a3b8', starter: '#6366f1', professional: '#8b5cf6',
  business: '#f59e0b', enterprise: '#10b981',
};

const ENTERPRISE_GOLD = '#ffd700';

const PLAN_FEATURES = {
  starter: ['5 team members', '500 documents', '2,000 AI questions/month', 'All business modules', 'AI chat widget (your store only)', 'Email support'],
  professional: ['25 team members', '2,000 documents', '10,000 AI questions/month', 'All business modules', 'AI chat widget on 1 external website', 'Priority support', 'Analytics & Reports'],
  business: ['100 team members', '10,000 documents', '50,000 AI questions/month', 'All business modules', 'AI chat widget on unlimited websites', 'Dedicated support', 'Custom AI settings', 'API access'],
};

const ENTERPRISE_FEATURES = [
  'Group Operations: run every branch from one dashboard', 'Shift sheets per attendant & nozzle, meter checks',
  'Two-step approvals + approved sales ledger', 'Inventory, credit customers, POS settlement',
  'Profit per branch, nightly summary, monthly PDF',
  'Unlimited team members', 'Unlimited documents', 'Unlimited AI questions',
  'All business modules', 'AI chat widget — unlimited websites', 'e-Procurement module',
  'White-label options', 'Dedicated account manager', 'Custom AI training',
  'API access + webhooks', 'SLA guarantee (99.9% uptime)', 'Priority 24/7 support',
  'Custom integrations', 'Government compliance package', 'On-premise deployment option',
];

const WHATSAPP_ENTERPRISE_URL = `https://wa.me/2349028361165?text=${encodeURIComponent("I'm interested in BizlyAI Enterprise plan")}`;

const STATUS_BADGE = {
  active: { label: 'Active', cls: 'success' },
  cancelled: { label: 'Cancelled', cls: 'neutral' },
  past_due: { label: 'Past Due', cls: 'danger' },
  expired: { label: 'Expired', cls: 'danger' },
  inactive: { label: 'Inactive', cls: 'neutral' },
};

export default function Billing() {
  const { company, user } = useAuth();
  const userIsOwner = ['company_owner', 'super_admin'].includes(user?.role);
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  // card: Paystack charges a saved card each period. transfer: the owner
  // pays each period by bank transfer/USSD and gets reminders.
  const [payMethod, setPayMethod] = useState('card');
  const [resuming, setResuming] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [entQuote, setEntQuote] = useState(null);

  const currentPlan = subscription?.plan || company?.plan || 'trial';
  const status = subscription?.status || company?.subscription?.status || 'active';
  const isSubscribed = Boolean(subscription?.subscribed);
  const isPaidPlan = currentPlan !== 'trial' && currentPlan !== 'enterprise';
  const paysByTransfer = subscription?.paymentMethod === 'transfer';
  const canResume = Boolean(subscription?.canResume);
  // Cancelled with no paid days left, expired, or a failed renewal: the
  // current plan has to be paid for again before it can be used.
  const planEnded = ['expired', 'past_due'].includes(status) || (status === 'cancelled' && !canResume);

  useEffect(() => {
    loadData();
    const payment = searchParams.get('payment');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (payment === 'success' && reference) verifyPayment(reference);
    else if (payment === 'success') setTimeout(loadData, 2500); // subscription webhook lag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, historyRes, subRes] = await Promise.all([
        paymentService.getPlans(),
        paymentService.getHistory(),
        paymentService.getSubscription().catch(() => ({ data: { data: null } })),
      ]);
      setPlans(plansRes.data.data);
      setHistory(historyRes.data.data || []);
      setSubscription(subRes.data.data || null);
      paymentService.enterpriseQuote().then(({ data: q }) => setEntQuote(q.data)).catch(() => {});
      if (subRes.data.data?.billingCycle) setBillingCycle(subRes.data.data.billingCycle);
      if (subRes.data.data?.paymentMethod) setPayMethod(subRes.data.data.paymentMethod);
    } catch { toast.error('Failed to load billing data'); }
    finally { setLoading(false); }
  }

  async function handleSubscribe(planId, method = payMethod) {
    setPaying(planId);
    try {
      const { data } = method === 'transfer'
        ? await paymentService.initialize(planId, billingCycle, 'transfer')
        : await paymentService.subscribe(planId, billingCycle);
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the subscription');
      setPaying(null);
    }
  }

  // Enterprise is a one-off Paystack checkout priced by branch count (worked
  // out on the server). Paying again before the period ends extends it.
  async function payEnterprise() {
    setPaying('enterprise');
    try {
      const { data } = await paymentService.initialize('enterprise', billingCycle, payMethod === 'transfer' ? 'transfer' : undefined);
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the payment');
      setPaying(null);
    }
  }

  async function verifyPayment(reference) {
    try {
      const { data } = await paymentService.verify(reference);
      toast.success(`🎉 ${data.message}`);
    } catch {
      toast.error('Could not verify payment. Contact support if a charge was made.');
    } finally {
      loadData();
    }
  }

  async function handleResume() {
    setResuming(true);
    try {
      await paymentService.resume();
      toast.success(paysByTransfer ? 'Subscription resumed. We will remind you before the next payment.' : 'Subscription resumed. Your card renews it on the next payment date.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resume');
    } finally {
      setResuming(false);
    }
  }

  async function handleCancel() {
    const until = fmtDate(subscription?.currentPeriodEnd || company?.subscription?.currentPeriodEnd);
    if (!confirm(paysByTransfer
      ? `Cancel your ${currentPlan} subscription?\n\nYou keep full access until ${until}. We will stop sending payment reminders. You can resume before then, or subscribe again any time.`
      : `Cancel your ${currentPlan} subscription?\n\nYour card will not be charged again. You keep full access until ${until}, and can resume before then or subscribe again any time.`)) return;
    setCancelling(true);
    try {
      await paymentService.cancelSubscription();
      toast.success('Subscription cancelled — access continues until your period ends');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  const nextPayment = subscription?.nextPaymentDate || subscription?.currentPeriodEnd || company?.subscription?.currentPeriodEnd;
  const badge = STATUS_BADGE[status] || STATUS_BADGE.active;

  return (
    <div className="billing-page fade-in">
      <div className="page-header">
        <h1>Billing &amp; Subscription</h1>
        <p>Manage your plan, payment method and billing history</p>
      </div>

      {/* Current plan banner */}
      <div className="current-plan-card card">
        <div className="cp-left">
          <div className="cp-badge" style={{ background: `${PLAN_COLORS[currentPlan]}20`, color: PLAN_COLORS[currentPlan] }}>
            {currentPlan.toUpperCase()}
          </div>
          <div>
            <div className="cp-title">Current Plan</div>
            <div className="cp-name" style={{ color: PLAN_COLORS[currentPlan] }}>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              {isPaidPlan && <span className={`badge badge-${badge.cls}`} style={{ marginLeft: 10, verticalAlign: 'middle' }}>{badge.label}</span>}
            </div>
            {nextPayment && (
              <div className="cp-expiry">
                <RiTimeLine /> {planEnded ? 'Ended' : status === 'cancelled' ? 'Access until' : paysByTransfer ? 'Paid until' : 'Next payment'} {fmtDate(nextPayment)}
              </div>
            )}
            {isPaidPlan && subscription?.paymentMethod && !planEnded && (
              <div className="cp-expiry">
                {paysByTransfer ? <><RiBankLine /> Pays by bank transfer</> : <><RiBankCardLine /> Card, renews automatically</>}
              </div>
            )}
          </div>
        </div>
        <div className="cp-right">
          {currentPlan === 'trial' && (
            <div className="trial-notice"><RiAlertLine /> Free trial — subscribe to unlock all features</div>
          )}
          {isPaidPlan && status === 'active' && paysByTransfer && userIsOwner && (
            <button className="btn btn-primary" onClick={() => handleSubscribe(currentPlan, 'transfer')} disabled={paying === currentPlan}>
              {paying === currentPlan ? <RiLoader4Line className="spin" /> : <RiBankLine />} Pay next {billingCycle === 'annual' ? 'year' : 'month'}
            </button>
          )}
          {isPaidPlan && status === 'active' && userIsOwner && (
            <button className="btn btn-secondary" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <RiLoader4Line className="spin" /> : <RiCloseCircleLine />} Cancel Subscription
            </button>
          )}
          {isPaidPlan && canResume && userIsOwner && (
            <button className="btn btn-primary" onClick={handleResume} disabled={resuming}>
              {resuming ? <RiLoader4Line className="spin" /> : <RiPlayCircleLine />} Resume subscription
            </button>
          )}
          {isPaidPlan && planEnded && userIsOwner && (
            <button className="btn btn-primary" onClick={() => handleSubscribe(currentPlan)} disabled={paying === currentPlan}>
              {paying === currentPlan ? <RiLoader4Line className="spin" /> : <RiRepeatLine />} Renew {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </button>
          )}
        </div>
      </div>

      {/* Subscription info card */}
      {isSubscribed && !paysByTransfer && !planEnded && (
        <div className="card sub-info-card">
          <div className="sub-info-head">
            <h3><RiRepeatLine /> Subscription</h3>
            <span className={`badge badge-${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="sub-info-grid">
            <div><span>Plan</span><strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong></div>
            <div><span>Billing cycle</span><strong style={{ textTransform: 'capitalize' }}>{subscription.billingCycle || 'monthly'}</strong></div>
            <div><span>Next payment</span><strong>{fmtDate(subscription.nextPaymentDate)}</strong></div>
            <div><span>Amount</span><strong>{subscription.amount ? fmtMoney(subscription.amount) : '—'}</strong></div>
            <div>
              <span>Payment method</span>
              <strong>
                {subscription.card?.last4
                  ? <><RiBankCardLine style={{ verticalAlign: '-2px', marginRight: 4 }} />{(subscription.card.brand || 'Card')} •••• {subscription.card.last4}</>
                  : '—'}
              </strong>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSubscribe(currentPlan)} disabled={paying === currentPlan}>
            {paying === currentPlan ? <RiLoader4Line className="spin" /> : <RiRefreshLine />} Update Payment Method
          </button>
        </div>
      )}

      {/* Cancel section */}
      {isPaidPlan && status === 'active' && userIsOwner && (
        <div className="card cancel-section">
          <div>
            <strong>Cancel subscription</strong>
            <p>You will keep access until <strong>{fmtDate(nextPayment)}</strong>. {paysByTransfer ? 'We will stop the payment reminders.' : 'Your card will not be charged again.'} You can resume before then, or subscribe again any time.</p>
          </div>
          <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <RiLoader4Line className="spin" /> : <RiCloseCircleLine />} Cancel
          </button>
        </div>
      )}
      {isPaidPlan && canResume && (
        <div className="card cancel-confirmed">
          <RiCheckboxCircleLine />
          <div>
            <strong>Subscription cancelled</strong>
            <p>Your {currentPlan} plan stays active until <strong>{fmtDate(nextPayment)}</strong>. {paysByTransfer ? 'No reminders will be sent.' : 'Your card will not be charged.'} Changed your mind? Resume now and nothing is charged today.</p>
          </div>
        </div>
      )}
      {isPaidPlan && planEnded && (
        <div className="card cancel-confirmed">
          <RiAlertLine />
          <div>
            <strong>Your {currentPlan} plan has ended</strong>
            <p>Your data is safe. Pay for a new {billingCycle === 'annual' ? 'year' : 'month'} below (card or bank transfer) to pick up where you left off.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="billing-tabs">
        <button className={`billing-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Plans</button>
        <button className={`billing-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Payment History</button>
      </div>

      {activeTab === 'plans' && (
        <>
          <div className="cycle-toggle">
            <button className={`cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`} onClick={() => setBillingCycle('monthly')}>Monthly</button>
            <button className={`cycle-btn ${billingCycle === 'annual' ? 'active' : ''}`} onClick={() => setBillingCycle('annual')}>
              Annual <span className="save-badge">Save up to 20%</span>
            </button>
          </div>
          <div className="cycle-toggle" role="radiogroup" aria-label="How do you want to pay?">
            <button className={`cycle-btn ${payMethod === 'card' ? 'active' : ''}`} role="radio" aria-checked={payMethod === 'card'} onClick={() => setPayMethod('card')}>
              <RiBankCardLine style={{ verticalAlign: '-2px' }} /> Card, renews automatically
            </button>
            <button className={`cycle-btn ${payMethod === 'transfer' ? 'active' : ''}`} role="radio" aria-checked={payMethod === 'transfer'} onClick={() => setPayMethod('transfer')}>
              <RiBankLine style={{ verticalAlign: '-2px' }} /> Bank transfer, pay each {billingCycle === 'annual' ? 'year' : 'month'}
            </button>
          </div>

          {loading ? (
            <div className="billing-loading"><RiLoader4Line className="spin" /> Loading plans...</div>
          ) : (
            <div className="plans-grid">
              {/* Enterprise has its own dedicated "Contact Sales" card below —
                  it's excluded here so it never renders with a self-serve
                  Paystack "Subscribe" button (see paymentController.js: it's
                  listed in PLANS for MRR/admin consistency, but there's no
                  real Paystack plan code behind it, so a normal subscribe
                  attempt would just fail at checkout). */}
              {plans.filter((plan) => plan.id !== 'enterprise').map((plan) => {
                const isCurrent = currentPlan === plan.id && !planEnded;
                // Transfer payers top up the current plan from its card.
                const canTopUp = isCurrent && payMethod === 'transfer' && paysByTransfer;
                const price = billingCycle === 'annual' ? plan.annualDisplay : plan.monthlyDisplay;
                const color = PLAN_COLORS[plan.id] || '#6366f1';
                const features = PLAN_FEATURES[plan.id] || [];

                return (
                  <div key={plan.id}
                    className={`plan-card card ${isCurrent ? 'current' : ''} ${plan.id === 'professional' ? 'popular' : ''}`}
                    style={plan.id === 'professional' ? { borderColor: color } : {}}>
                    {plan.id === 'professional' && <div className="popular-badge">Most Popular</div>}
                    <div className="plan-header">
                      <div className="plan-icon" style={{ background: `${color}18`, color }}><RiShieldCheckLine /></div>
                      <div>
                        <div className="plan-name">{plan.name}</div>
                        <div className="plan-price">
                          {price}<span className="plan-period">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                        </div>
                        <div className="plan-billed-note">
                          {payMethod === 'transfer' ? `Pay each ${billingCycle === 'annual' ? 'year' : 'month'} by transfer, no card needed` : `Billed ${billingCycle}, cancel anytime`}
                        </div>
                        {billingCycle === 'annual' && plan.savings > 0 && (
                          <div className="plan-savings">Save {plan.savings}% vs monthly</div>
                        )}
                      </div>
                    </div>

                    <ul className="plan-features">
                      {features.map((f, i) => <li key={i}><RiCheckLine style={{ color }} /> {f}</li>)}
                    </ul>

                    <button
                      className={`btn ${isCurrent && !canTopUp ? 'btn-secondary' : 'btn-primary'} plan-btn`}
                      style={!isCurrent || canTopUp ? { background: color, borderColor: color } : {}}
                      onClick={() => (!isCurrent || canTopUp) && handleSubscribe(plan.id)}
                      disabled={(isCurrent && !canTopUp) || paying === plan.id || !userIsOwner}
                    >
                      {paying === plan.id ? <RiLoader4Line className="spin" />
                        : canTopUp ? <><RiBankLine /> Pay next {billingCycle === 'annual' ? 'year' : 'month'}</>
                        : isCurrent ? 'Current Plan'
                        : currentPlan === plan.id ? <><RiRepeatLine /> Renew {plan.name}</>
                        : <>{payMethod === 'transfer' ? <RiBankLine /> : <RiArrowUpLine />} {payMethod === 'transfer' ? `Pay for ${plan.name} by transfer` : `Subscribe to ${plan.name}`}</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (
            <div className="enterprise-card">
              <div className="enterprise-badge"><RiVipCrownLine /> ENTERPRISE</div>
              <div className="enterprise-body">
                <div className="enterprise-info">
                  <div className="enterprise-price">
                    {fmtMoney(entQuote ? (billingCycle === 'annual' ? entQuote.annual : entQuote.monthly) : (billingCycle === 'annual' ? 999000 : 99900))}
                    <span className="plan-period">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                  </div>
                  <div className="plan-billed-note">
                    {entQuote
                      ? <>For {entQuote.branches} branch{entQuote.branches === 1 ? '' : 'es'} · includes {entQuote.includedBranches}, then {fmtMoney(entQuote.perBranch)}/mo per extra branch</>
                      : 'Priced by number of branches'}
                  </div>
                  {billingCycle === 'annual' && entQuote && <div className="plan-savings">2 months free · save {fmtMoney(entQuote.annualSavings)}</div>}
                  <p className="enterprise-note">
                    For businesses with more than one branch: filling stations, outlets, warehouses. Pay {billingCycle === 'annual' ? 'yearly' : 'monthly'}; paying early adds to the time you have left.
                  </p>
                  {currentPlan === 'enterprise' && entQuote?.current?.periodEnd && (
                    <p className="enterprise-note" style={{ fontWeight: 600 }}>
                      Paid until {fmtDate(entQuote.current.periodEnd)}{entQuote.current.paidBranches ? ` for ${entQuote.current.paidBranches} branches` : ''}.
                      {entQuote.current.paidBranches && entQuote.activeBranches > entQuote.current.paidBranches
                        ? ` You now have ${entQuote.activeBranches} branches; your next payment covers all of them.` : ''}
                    </p>
                  )}
                  {userIsOwner ? (
                    <button className="btn enterprise-btn" onClick={payEnterprise} disabled={paying === 'enterprise'}>
                      {paying === 'enterprise' ? <RiLoader4Line className="spin" /> : currentPlan === 'enterprise' ? <RiRepeatLine /> : <RiVipCrownLine />}
                      {' '}{currentPlan === 'enterprise' ? 'Renew / extend Enterprise' : 'Upgrade to Enterprise'}
                    </button>
                  ) : (
                    <p className="enterprise-note">Ask the account owner to upgrade.</p>
                  )}
                  <a className="btn btn-ghost btn-sm" href={WHATSAPP_ENTERPRISE_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 6, paddingLeft: 0 }}>
                    <RiWhatsappLine /> Talk to sales about a private deployment
                  </a>
                </div>
                <ul className="enterprise-features">
                  {ENTERPRISE_FEATURES.map((f, i) => (
                    <li key={i}><RiCheckLine /> {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="payment-security">
            <RiShieldCheckLine style={{ color: '#10b981' }} />
            <span>{payMethod === 'transfer'
              ? <>Payments are handled securely by <strong>Paystack</strong>. At checkout you get an account number to transfer to (or pay by USSD). Nothing is charged automatically: we email you 7 days and 1 day before your plan ends, and paying early adds to the time you have left.</>
              : <>Recurring billing is handled securely by <strong>Paystack</strong>. Your card is charged automatically each {billingCycle === 'annual' ? 'year' : 'month'} until you cancel.</>}</span>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="card">
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon"><RiMoneyDollarCircleLine /></div>
              <h3>No payments yet</h3>
              <p>Your payment history will appear here after your first payment.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Channel</th><th>Status</th></tr></thead>
              <tbody>
                {history.map((tx, i) => (
                  <tr key={i}>
                    <td>{fmtDate(tx.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.reference}</td>
                    <td><strong>{fmtMoney(tx.amount)}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{tx.channel}</td>
                    <td><span className={`badge badge-${tx.status === 'success' ? 'success' : 'danger'}`}>{tx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
