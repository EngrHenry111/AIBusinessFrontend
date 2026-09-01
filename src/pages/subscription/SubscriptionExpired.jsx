import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiAlertLine, RiShieldCheckLine, RiCustomerService2Line, RiArrowRightLine } from 'react-icons/ri';
import './SubscriptionExpired.css';

export default function SubscriptionExpired() {
  const { company, logout } = useAuth();
  const navigate = useNavigate();

  const plan = company?.subscription?.plan || 'Professional';
  const endDate = company?.subscription?.currentPeriodEnd
    ? new Date(company.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : 'recently';

  return (
    <div className="expired-page">
      <div className="expired-card">
        {/* Warning icon */}
        <div className="expired-icon">
          <RiAlertLine />
        </div>

        {/* Title */}
        <h1>Your Subscription Has Expired</h1>
        <p className="expired-plan">
          Your <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan ended on <strong>{endDate}</strong>
        </p>

        {/* Message */}
        <div className="expired-message">
          <p>
            Renew now to instantly restore access to all your business data,
            leads, invoices, documents, and AI tools.
          </p>
        </div>

        {/* Data safe notice */}
        <div className="data-safe-notice">
          <RiShieldCheckLine />
          <span>Your data is completely safe and will be restored immediately after payment</span>
        </div>

        {/* Actions */}
        <div className="expired-actions">
          <button
            className="btn btn-primary btn-renew"
            onClick={() => navigate('/billing')}
          >
            💳 Renew Subscription <RiArrowRightLine />
          </button>
          <a
            href="mailto:henryengrakpan@gmail.com?subject=Subscription%20Help"
            className="btn btn-secondary"
          >
            <RiCustomerService2Line /> Contact Support
          </a>
        </div>

        {/* What they'll get back */}
        <div className="expired-features">
          <h3>What you'll get back instantly:</h3>
          <div className="expired-features-grid">
            {[
              '📄 All uploaded documents',
              '💬 AI Chat & Knowledge Base',
              '👤 Leads & CRM',
              '💰 Invoices & Payments',
              '📦 Orders & Tracking',
              '📅 Appointments',
              '👥 Team Access',
              '📊 Analytics & Reports',
            ].map((f, i) => (
              <div key={i} className="expired-feature-item">{f}</div>
            ))}
          </div>
        </div>

        <button className="btn btn-ghost expired-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
