import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiCheckLine, RiLoader4Line, RiShieldCheckLine,
  RiTimeLine, RiArrowUpLine, RiMoneyDollarCircleLine,
  RiAlertLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Billing.css';

const PLAN_COLORS = {
  trial: '#94a3b8',
  starter: '#6366f1',
  professional: '#8b5cf6',
  business: '#f59e0b',
  enterprise: '#10b981',
};

const PLAN_FEATURES = {
  starter: [
    '5 team members',
    '500 documents',
    '2,000 AI questions/month',
    'All business modules',
    'Email support',
  ],
  professional: [
    '25 team members',
    '2,000 documents',
    '10,000 AI questions/month',
    'All business modules',
    'Priority support',
    'Analytics & Reports',
  ],
  business: [
    '100 team members',
    '10,000 documents',
    '50,000 AI questions/month',
    'All business modules',
    'Dedicated support',
    'Custom AI settings',
    'API access',
  ],
};

export default function Billing() {
  const { company, updateCompany } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeTab, setActiveTab] = useState('plans');

  const currentPlan = company?.plan || 'trial';

  useEffect(() => {
    loadData();
    // Handle return from Paystack
    const payment = searchParams.get('payment');
    const reference = searchParams.get('reference');
    if (payment === 'success' && reference) {
      verifyPayment(reference);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, historyRes] = await Promise.all([
        paymentService.getPlans(),
        paymentService.getHistory(),
      ]);
      setPlans(plansRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch { toast.error('Failed to load billing data'); }
    finally { setLoading(false); }
  }

  async function handleUpgrade(planId) {
    setPaying(planId);
    try {
      const { data } = await paymentService.initialize(planId, billingCycle);
      // Redirect to Paystack checkout
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed');
      setPaying(null);
    }
  }

  async function verifyPayment(reference) {
    try {
      const { data } = await paymentService.verify(reference);
      toast.success(`🎉 ${data.message}`);
      loadData();
    } catch {
      toast.error('Could not verify payment. Contact support if charge was made.');
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return;
    try {
      await paymentService.cancel();
      toast.success('Subscription cancelled');
      loadData();
    } catch { toast.error('Failed to cancel'); }
  }

  const fmtMoney = (n) => `₦${Number(n).toLocaleString()}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="billing-page fade-in">
      <div className="page-header">
        <h1>Billing & Subscription</h1>
        <p>Manage your plan and payment history</p>
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
            </div>
            {company?.subscription?.currentPeriodEnd && (
              <div className="cp-expiry">
                <RiTimeLine /> Renews {fmtDate(company.subscription.currentPeriodEnd)}
              </div>
            )}
          </div>
        </div>
        <div className="cp-right">
          {currentPlan === 'trial' && (
            <div className="trial-notice">
              <RiAlertLine /> Free trial — upgrade to unlock all features
            </div>
          )}
          {currentPlan !== 'trial' && currentPlan !== 'enterprise' && (
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="billing-tabs">
        <button className={`billing-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>
          Upgrade Plan
        </button>
        <button className={`billing-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          Payment History
        </button>
      </div>

      {/* Plans tab */}
      {activeTab === 'plans' && (
        <>
          {/* Billing cycle toggle */}
          <div className="cycle-toggle">
            <button className={`cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}>Monthly</button>
            <button className={`cycle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}>
              Annual
              <span className="save-badge">Save up to 20%</span>
            </button>
          </div>

          {loading ? (
            <div className="billing-loading"><RiLoader4Line className="spin" /> Loading plans...</div>
          ) : (
            <div className="plans-grid">
              {plans.map(plan => {
                const isCurrent = currentPlan === plan.id;
                const isDowngrade = ['starter', 'trial'].includes(currentPlan) && plan.id === 'starter' && currentPlan !== 'trial';
                const price = billingCycle === 'annual' ? plan.annualDisplay : plan.monthlyDisplay;
                const color = PLAN_COLORS[plan.id] || '#6366f1';
                const features = PLAN_FEATURES[plan.id] || [];

                return (
                  <div key={plan.id} className={`plan-card card ${isCurrent ? 'current' : ''} ${plan.id === 'professional' ? 'popular' : ''}`}
                    style={plan.id === 'professional' ? { borderColor: color } : {}}>
                    {plan.id === 'professional' && <div className="popular-badge">Most Popular</div>}
                    <div className="plan-header">
                      <div className="plan-icon" style={{ background: `${color}18`, color }}><RiShieldCheckLine /></div>
                      <div>
                        <div className="plan-name">{plan.name}</div>
                        <div className="plan-price">
                          {price}
                          <span className="plan-period">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                        </div>
                        {billingCycle === 'annual' && plan.savings > 0 && (
                          <div className="plan-savings">Save {plan.savings}% vs monthly</div>
                        )}
                      </div>
                    </div>

                    <ul className="plan-features">
                      {features.map((f, i) => (
                        <li key={i}><RiCheckLine style={{ color }} /> {f}</li>
                      ))}
                    </ul>

                    <button
                      className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'} plan-btn`}
                      style={!isCurrent ? { background: color, borderColor: color } : {}}
                      onClick={() => !isCurrent && handleUpgrade(plan.id)}
                      disabled={isCurrent || paying === plan.id}
                    >
                      {paying === plan.id ? (
                        <RiLoader4Line className="spin" />
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : (
                        <><RiArrowUpLine /> Upgrade to {plan.name}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Security note */}
          <div className="payment-security">
            <RiShieldCheckLine style={{ color: '#10b981' }} />
            <span>Payments are processed securely via <strong>Paystack</strong>. We accept cards, bank transfer, and USSD.</span>
          </div>
        </>
      )}

      {/* History tab */}
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
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx, i) => (
                  <tr key={i}>
                    <td>{fmtDate(tx.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.reference}</td>
                    <td><strong>{fmtMoney(tx.amount)}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{tx.channel}</td>
                    <td>
                      <span className={`badge badge-${tx.status === 'success' ? 'success' : 'danger'}`}>
                        {tx.status}
                      </span>
                    </td>
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
