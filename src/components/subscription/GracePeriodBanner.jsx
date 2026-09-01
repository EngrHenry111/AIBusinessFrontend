import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiAlertLine, RiCloseLine, RiArrowRightLine } from 'react-icons/ri';
import './GracePeriodBanner.css';

export default function GracePeriodBanner() {
  const { subscriptionState, graceDays, company } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (subscriptionState !== 'grace') return null;

  const plan = company?.subscription?.plan || 'plan';
  const endDate = company?.subscription?.currentPeriodEnd
    ? new Date(company.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      })
    : '';

  const isUrgent = graceDays <= 2;

  return (
    <div className={`grace-banner ${isUrgent ? 'urgent' : 'warning'}`}>
      <div className="grace-banner-inner">
        <div className="grace-banner-left">
          <RiAlertLine className="grace-icon" />
          <div className="grace-text">
            <strong>
              {isUrgent
                ? `⚠️ Last ${graceDays} day${graceDays === 1 ? '' : 's'}! `
                : `Your ${plan} subscription expired on ${endDate}. `}
            </strong>
            <span>
              {graceDays === 0
                ? 'Your account will be suspended today. Renew now to keep access.'
                : `You have ${graceDays} day${graceDays === 1 ? '' : 's'} left before your workspace is suspended.`}
            </span>
          </div>
        </div>
        <div className="grace-banner-right">
          <button
            className="grace-renew-btn"
            onClick={() => navigate('/billing')}
          >
            Renew Now <RiArrowRightLine />
          </button>
          <button
            className="grace-dismiss"
            onClick={() => setDismissed(true)}
            title="Dismiss (will reappear on next login)"
          >
            <RiCloseLine />
          </button>
        </div>
      </div>
    </div>
  );
}
