import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  RiDashboardLine, RiRobot2Line, RiFileTextLine, RiUserLine,
  RiCalendarLine, RiMoneyDollarCircleLine, RiBarChartLine,
  RiTeamLine, RiSettings4Line, RiMenuFoldLine, RiMenuUnfoldLine,
  RiShoppingBagLine, RiVideoLine, RiMegaphoneLine, RiBriefcaseLine,
  RiQuestionLine, RiFileChartLine, RiBookOpenLine, RiLogoutBoxLine,
  RiWhatsappLine
} from 'react-icons/ri';
import './Sidebar.css';

const NAV_ITEMS = [
  { label: 'Overview', icon: RiDashboardLine, path: '/dashboard' },
  { label: 'AI Assistant', icon: RiRobot2Line, path: '/chat' },
  { label: 'Knowledge', icon: RiBookOpenLine, path: '/knowledge' },
  { label: 'AI Agents', icon: RiRobot2Line, path: '/agents' },
  { type: 'divider', label: 'Business' },
  { label: 'Leads', icon: RiUserLine, path: '/leads' },
  { label: 'Meetings', icon: RiVideoLine, path: '/meetings' },
  { label: 'Invoices', icon: RiMoneyDollarCircleLine, path: '/invoices' },
  { label: 'Orders', icon: RiShoppingBagLine, path: '/orders' },
  { label: 'Appointments', icon: RiCalendarLine, path: '/appointments' },
  { label: 'Social Media', icon: RiMegaphoneLine, path: '/social' },
  { label: 'Reports', icon: RiFileChartLine, path: '/reports' },
  { type: 'divider', label: 'Workspace' },
  { label: 'Analytics', icon: RiBarChartLine, path: '/analytics' },
  { label: 'Team', icon: RiTeamLine, path: '/team' },
  { label: 'WhatsApp', icon: RiWhatsappLine, path: '/whatsapp' },
  { label: 'Settings', icon: RiSettings4Line, path: '/settings' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, company, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
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
          if (item.type === 'divider') {
            return (
              <div key={idx} className="nav-divider">
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          }
          const Icon = item.icon;
          if (item.adminOnly && user?.role !== 'super_admin') return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {item.badge && !collapsed && (
                <span className="nav-badge">{item.badge}</span>
              )}
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
