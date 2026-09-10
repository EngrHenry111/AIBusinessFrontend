import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { whatsappService, productService } from '../../services';
import {
  RiDashboardLine, RiRobot2Line, RiFileTextLine, RiUserLine,
  RiCalendarLine, RiMoneyDollarCircleLine, RiBarChartLine,
  RiTeamLine, RiSettings4Line, RiMenuFoldLine, RiMenuUnfoldLine,
  RiShoppingBagLine, RiVideoLine, RiMegaphoneLine, RiBriefcaseLine,
  RiQuestionLine, RiFileChartLine, RiBookOpenLine, RiLogoutBoxLine,
  RiWhatsappLine, RiShieldLine, RiHistoryLine, RiStore2Line, RiUserStarLine, RiStoreLine
} from 'react-icons/ri';
import './Sidebar.css';

const NAV_ITEMS = [
  { label: 'Overview', icon: RiDashboardLine, path: '/dashboard' },
  { label: 'AI Assistant', icon: RiRobot2Line, path: '/chat' },
  { label: 'Knowledge', icon: RiBookOpenLine, path: '/knowledge' },
  { label: 'AI Agents', icon: RiRobot2Line, path: '/agents' },
  { type: 'divider', label: 'Business' },
  { label: 'Leads', icon: RiUserLine, path: '/leads' },
  { label: 'Customers', icon: RiUserStarLine, path: '/customers' },
  { label: 'Meetings', icon: RiVideoLine, path: '/meetings' },
  { label: 'Invoices', icon: RiMoneyDollarCircleLine, path: '/invoices' },
  { label: 'Expenses', icon: RiMoneyDollarCircleLine, path: '/expenses' },
  { label: 'Orders', icon: RiShoppingBagLine, path: '/orders' },
  { label: 'Products', icon: RiStore2Line, path: '/products' },
  { label: 'Appointments', icon: RiCalendarLine, path: '/appointments' },
  { label: 'Social Media', icon: RiMegaphoneLine, path: '/social' },
  { label: 'Reports', icon: RiFileChartLine, path: '/reports' },
  { type: 'divider', label: 'Workspace' },
  { label: 'My Store', icon: RiStoreLine, path: '/settings/store' },
  { label: 'Analytics', icon: RiBarChartLine, path: '/analytics' },
  { label: 'Team', icon: RiTeamLine, path: '/team' },
  { label: 'WhatsApp', icon: RiWhatsappLine, path: '/whatsapp' },
  { label: 'Settings', icon: RiSettings4Line, path: '/settings' },
  { label: 'Activity Log', icon: RiHistoryLine, path: '/settings/audit-log', roles: ['company_owner', 'manager', 'super_admin'] },
  { type: 'divider', label: 'Platform', adminOnly: true },
  { label: 'Super Admin', icon: RiShieldLine, path: '/admin', adminOnly: true },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const [waNeedsHuman, setWaNeedsHuman] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);

  // Poll for WhatsApp conversations waiting on a human
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await whatsappService.getConversations({ filter: 'human' });
        if (alive) setWaNeedsHuman(data.counts?.human || 0);
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, 45000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // Poll for out-of-stock product count (sidebar badge)
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await productService.getAll({ limit: 1 });
        if (alive) setOutOfStock(data.stats?.outOfStock || 0);
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const storeNeedsSetup = Boolean(company) && !company?.paymentSettings?.isPaymentSetup;

  const badgeFor = (item) => {
    if (item.path === '/whatsapp') return waNeedsHuman > 0 ? waNeedsHuman : null;
    if (item.path === '/products') return outOfStock > 0 ? outOfStock : null;
    if (item.path === '/settings/store') return storeNeedsSetup ? 'Setup' : null;
    return item.badge;
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <RiBriefcaseLine />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">BusinessAI</span>
              {company && <span className="brand-company">{company.name}</span>}
            </div>
          )}
        </div>
        <button className="sidebar-toggle btn btn-ghost btn-icon" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <RiMenuUnfoldLine /> : <RiMenuFoldLine />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          if (item.adminOnly && user?.role !== 'super_admin') return null;
          if (item.roles && !item.roles.includes(user?.role)) return null;
          if (item.type === 'divider') {
            return (
              <div key={idx} className="nav-divider">
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onClose && onClose()}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {badgeFor(item) ? (
                <span className={`nav-badge ${collapsed ? 'nav-badge-dot' : ''}`}>
                  {collapsed ? '' : badgeFor(item)}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user?.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role?.replace('_', ' ')}</span>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={logout} title="Log out">
              <RiLogoutBoxLine />
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-icon sidebar-logout" onClick={logout} title="Log out">
            <RiLogoutBoxLine />
          </button>
        )}
      </div>
    </aside>
  );
}
