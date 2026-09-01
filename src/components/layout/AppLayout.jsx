import { useState } from 'react';
import { Navigate, useLocation, useNavigate as useNavigate_ } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import GracePeriodBanner from '../subscription/GracePeriodBanner';
import './AppLayout.css';

// Pages accessible even when subscription is expired
const ALLOWED_EXPIRED = ['/billing', '/settings', '/messages'];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { subscriptionState } = useAuth();
  const location = useLocation();

  // Soft block — expired subscription
  const isExpired = subscriptionState === 'expired' || subscriptionState === 'suspended';
  const isAllowedPage = ALLOWED_EXPIRED.some(p => location.pathname.startsWith(p));

  if (isExpired && !isAllowedPage) {
    return (
      <div className="app-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} mobileOpen={mobileOpen} />
        <main className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
          <TopBar onMenuToggle={() => setMobileOpen(v => !v)} />
          <div className="app-content">
            {/* Import lazily to avoid circular deps */}
            <SubscriptionExpiredInline />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
      />

      <main className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar onMenuToggle={() => setMobileOpen(v => !v)} />
        {/* Grace period warning banner — shown 7 days before suspension */}
        <GracePeriodBanner />
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}

// Inline expired component to avoid circular imports
function SubscriptionExpiredInline() {
  const { company, logout } = useAuth();
  const navigate = useNavigate_();
  const plan = company?.subscription?.plan || 'plan';
  const endDate = company?.subscription?.currentPeriodEnd
    ? new Date(company.subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'recently';

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24 }}>
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16,
        padding:'48px 40px', maxWidth:520, width:'100%', textAlign:'center',
        boxShadow:'var(--shadow-xl)'
      }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#fee2e2', color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>⚠️</div>
        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Your Subscription Has Expired</h1>
        <p style={{ color:'var(--text-muted)', marginBottom:20 }}>
          Your <strong>{plan}</strong> plan ended on <strong>{endDate}</strong>
        </p>
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
          🛡️ Your data is completely safe and will be restored immediately after payment
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
          <button className="btn btn-primary" style={{ padding:'14px', fontSize:15, justifyContent:'center' }}
            onClick={() => navigate('/billing')}>
            💳 Renew Subscription →
          </button>
          <a href="mailto:henryengrakpan@gmail.com?subject=Subscription Help"
            className="btn btn-secondary" style={{ justifyContent:'center' }}>
            📞 Contact Support
          </a>
        </div>
        <div style={{ marginBottom:20, textAlign:'left' }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>What you'll get back instantly:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {['📄 Documents & AI Chat','👤 Leads & CRM','💰 Invoices','📦 Orders','📅 Appointments','👥 Team Access','📊 Analytics','🤖 AI Agents'].map((f,i) => (
              <div key={i} style={{ fontSize:12, padding:'6px 10px', background:'var(--bg-secondary)', borderRadius:6, color:'var(--text-secondary)' }}>{f}</div>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:13, color:'var(--text-muted)', width:'100%', justifyContent:'center' }} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
