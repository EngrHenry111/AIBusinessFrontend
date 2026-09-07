import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiCheckLine, RiLoader4Line, RiShieldCheckLine, RiTimeLine, RiArrowUpLine,
  RiMoneyDollarCircleLine, RiAlertLine, RiBankCardLine, RiRefreshLine,
  RiCloseCircleLine, RiCheckboxCircleLine, RiRepeatLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Billing.css';

const PLAN_COLORS = {
  trial: '#94a3b8', starter: '#6366f1', professional: '#8b5cf6',
  business: '#f59e0b', enterprise: '#10b981',
};

const PLAN_FEATURES = {
  starter: ['5 team members', '500 documents', '2,000 AI questions/month', 'All business modules', 'Email support'],
  professional: ['25 team members', '2,000 documents', '10,000 AI questions/month', 'All business modules', 'Priority support', 'Analytics & Reports'],
  business: ['100 team members', '10,000 documents', '50,000 AI questions/month', 'All business modules', 'Dedicated support', 'Custom AI settings', 'API access'],
};

const STATUS_BADGE = {
  active: { label: 'Active', cls: 'success' },
  cancelled: { label: 'Cancelled', cls: 'neutral' },
  past_due: { label: 'Past Due', cls: 'danger' },
  expired: { label: 'Expired', cls: 'danger' },
  inactive: { label: 'Inactive', cls: 'neutral' },
};

export default function Billing() {
  const { company } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeTab, setActiveTab] = useState('plans');

  const currentPlan = subscription?.plan || company?.plan || 'trial';
  const status = subscription?.status || company?.subscription?.status || 'active';
  const isSubscribed = Boolean(subscription?.subscribed);
  const isPaidPlan = currentPlan !== 'trial' && currentPlan !== 'enterprise';

  useEffect(() => {
    loadData();
    const payment = searchParams.get('payment');
    const reference = searchParams.get('reference');
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
      if (subRes.data.data?.billingCycle) setBillingCycle(subRes.data.data.billingCycle);
    } catch { toast.error('Failed to load billing data'); }
    finally { setLoading(false); }
  }

  async function handleSubscribe(planId) {
    setPaying(planId);
    try {
      const { data } = await paymentService.subscribe(planId, billingCycle);
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the subscription');
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

  async function handleCancel() {
    if (!confirm(`Cancel your ${currentPlan} subscription?\n\nYou keep full access until ${fmtDate(subscription?.currentPeriodEnd || company?.subscription?.currentPeriodEnd)}. It will not renew after that.`)) return;
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
                <RiTimeLine /> {status === 'cancelled' ? 'Access until' : 'Next payment'} {fmtDate(nextPayment)}
              </div>
            )}
          </div>
        </div>
        <div className="cp-right">
          {currentPlan === 'trial' && (
            <div className="trial-notice"><RiAlertLine /> Free trial — subscribe to unlock all features</div>
          )}
          {isPaidPlan && status === 'active' && (
            <button className="btn btn-secondary" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <RiLoader4Line className="spin" /> : <RiCloseCircleLine />} Cancel Subscription
            </button>
          )}
          {isPaidPlan && status === 'cancelled' && (
            <button className="btn btn-primary" onClick={() => handleSubscribe(currentPlan)} disabled={paying === currentPlan}>
              {paying === currentPlan ? <RiLoader4Line className="spin" /> : <RiRepeatLine />} Resubscribe
            </button>
          )}
        </div>
      </div>

      {/* Subscription info card */}
      {isSubscribed && (
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
      {isPaidPlan && status === 'active' && (
        <div className="card cancel-section">
          <div>
            <strong>Cancel subscription</strong>
            <p>You will keep access until <strong>{fmtDate(nextPayment)}</strong>. It won't renew after that, and you can resubscribe anytime.</p>
          </div>
          <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <RiLoader4Line className="spin" /> : <RiCloseCircleLine />} Cancel
          </button>
        </div>
      )}
      {isPaidPlan && status === 'cancelled' && (
        <div className="card cancel-confirmed">
          <RiCheckboxCircleLine />
          <div>
            <strong>Subscription cancelled</strong>
            <p>Your {currentPlan} plan stays active until <strong>{fmtDate(nextPayment)}</strong>. No further charges will be made.</p>
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

          {loading ? (
            <div className="billing-loading"><RiLoader4Line className="spin" /> Loading plans...</div>
          ) : (
            <div className="plans-grid">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
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
                          Billed {billingCycle}, cancel anytime
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
                      className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'} plan-btn`}
                      style={!isCurrent ? { background: color, borderColor: color } : {}}
                      onClick={() => !isCurrent && handleSubscribe(plan.id)}
                      disabled={isCurrent || paying === plan.id}
                    >
                      {paying === plan.id ? <RiLoader4Line className="spin" />
                        : isCurrent ? (isSubscribed ? 'Manage Subscription' : 'Current Plan')
                        : <><RiArrowUpLine /> Subscribe to {plan.name}</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="payment-security">
            <RiShieldCheckLine style={{ color: '#10b981' }} />
            <span>Recurring billing is handled securely by <strong>Paystack</strong>. Your card is charged automatically each {billingCycle === 'annual' ? 'year' : 'month'} until you cancel.</span>
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
