import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storefrontService, subscriptionPlanService } from '../../services';
import { RiArrowLeftLine, RiBox3Line, RiCheckLine, RiGroupLine } from 'react-icons/ri';
import './Store.css';
import './SubscriptionPlans.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const INTERVAL_LABEL = { daily: 'day', weekly: 'week', biweekly: '2 weeks', monthly: 'month', quarterly: 'quarter' };

function PlanCard({ plan, slug }) {
  const [expanded, setExpanded] = useState(false);
  const savings = plan.originalPrice > plan.price ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100) : 0;

  return (
    <div className="sp-card">
      <div className="sp-card-img">
        {plan.image ? <img src={plan.image} alt={plan.name} /> : <RiBox3Line />}
        <span className="sp-interval-badge">Every {INTERVAL_LABEL[plan.interval] || plan.interval}</span>
      </div>
      <div className="sp-card-body">
        <h3>{plan.name}</h3>
        {plan.description && <p className="sp-desc">{plan.description}</p>}

        <div className="sp-price-row">
          <span className="sp-price">{naira(plan.price)}</span>
          <span className="sp-price-period">/{INTERVAL_LABEL[plan.interval] || plan.interval}</span>
          {plan.originalPrice > plan.price && <span className="sp-price-original">{naira(plan.originalPrice)}</span>}
          {savings > 0 && <span className="sp-save-badge">Save {savings}%</span>}
        </div>

        {plan.trialDays > 0 && <div className="sp-trial-note">First {plan.trialDays} day{plan.trialDays > 1 ? 's' : ''} free-ish — your first box ships now, next charge waits {plan.trialDays} extra days</div>}

        <ul className="sp-items">
          {(expanded ? plan.items : plan.items.slice(0, 3)).map((it, i) => (
            <li key={i}>{it.quantity}× {it.name}</li>
          ))}
        </ul>
        {plan.items.length > 3 && (
          <button type="button" className="sp-expand-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `+${plan.items.length - 3} more items`}
          </button>
        )}

        {plan.perks.length > 0 && (
          <ul className="sp-perks">
            {plan.perks.map((p, i) => <li key={i}><RiCheckLine /> {p}</li>)}
          </ul>
        )}

        <div className="sp-subscriber-count"><RiGroupLine /> {plan.subscriberCount} subscriber{plan.subscriberCount === 1 ? '' : 's'}</div>

        {plan.soldOut ? (
          <button className="sf-btn" disabled>Fully Subscribed</button>
        ) : (
          <Link to={`/store/${slug}/subscribe/${plan._id}`} className="sf-btn sp-subscribe-btn">Subscribe Now</Link>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storefrontService.getStore(slug).then(({ data }) => setStore(data.data.store)).catch(() => {});
    subscriptionPlanService.getPublic(slug)
      .then(({ data }) => setPlans(data.data || []))
      .finally(() => setLoading(false));
  }, [slug]);

  const brand = store?.settings?.primaryColor || '#7c3aed';

  return (
    <div className="sf sp-page" style={{ '--sf-brand': brand }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand" style={{ fontSize: '1rem' }}>
            <RiArrowLeftLine /> Back to {store?.name || 'store'}
          </Link>
        </div>
      </header>

      <div className="sf-page sp-layout">
        <div className="sp-intro">
          <h1>Subscribe &amp; Save</h1>
          <p className="muted">Get your favourites delivered automatically, on your schedule.</p>
        </div>

        {loading ? (
          <div className="sp-loading">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="sp-empty">
            <RiBox3Line />
            <h3>No subscription plans yet</h3>
            <p className="muted">{store?.name || 'This store'} hasn't set up any subscription boxes right now — check back soon.</p>
          </div>
        ) : (
          <div className="sp-grid">
            {plans.map((p) => <PlanCard key={p._id} plan={p} slug={slug} />)}
          </div>
        )}
      </div>
    </div>
  );
}
