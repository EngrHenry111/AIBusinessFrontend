import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { whatsappService, productService, widgetService, loyaltyService, contractService, procurementService, groupService } from '../../services';
import {
  RiDashboardLine, RiRobot2Line, RiFileTextLine, RiUserLine,
  RiCalendarLine, RiMoneyDollarCircleLine, RiBarChartLine,
  RiTeamLine, RiSettings4Line, RiMenuFoldLine, RiMenuUnfoldLine,
  RiShoppingBagLine, RiVideoLine, RiMegaphoneLine, RiBriefcaseLine,
  RiQuestionLine, RiFileChartLine, RiBookOpenLine, RiLogoutBoxLine,
  RiWhatsappLine, RiShieldLine, RiHistoryLine, RiStore2Line, RiUserStarLine, RiStoreLine,
  RiChat3Line, RiCodeLine, RiContactsLine, RiAwardLine, RiGovernmentLine, RiBankCardLine,
  RiGroupLine, RiScales3Line, RiCalendarEventLine, RiGraduationCapLine, RiUserAddLine,
  RiCalendarCheckLine, RiFileList3Line, RiBook2Line, RiTimeLine, RiUserSettingsLine, RiPieChartLine,
  RiBuilding2Line, RiRadarLine, RiFileCheckLine, RiClipboardLine, RiArchiveLine, RiHandCoinLine, RiLineChartLine, RiBankCard2Line,
  RiArrowDownSLine, RiHospitalLine, RiUserHeartLine, RiListOrdered, RiTestTubeLine, RiCapsuleLine, RiHotelBedLine,
} from 'react-icons/ri';
import useSchoolMe from '../../pages/school/useSchoolMe';
import useHospitalMe from '../../pages/hospital/useHospitalMe';
import { useGroupAccess } from '../../pages/group/GroupGate';
import './Sidebar.css';

const NAV_ITEMS = [
  { label: 'Overview', icon: RiDashboardLine, path: '/dashboard' },
  { label: 'AI Assistant', icon: RiRobot2Line, path: '/chat' },
  { label: 'Knowledge', icon: RiBookOpenLine, path: '/knowledge' },
  { label: 'AI Agents', icon: RiRobot2Line, path: '/agents' },
  // Multi-branch group operations — owner command center + department reports.
  { type: 'divider', label: 'Group Operations' },
  { label: 'Command Center', icon: RiRadarLine, path: '/group', roles: ['company_owner', 'super_admin'], enterprise: true },
  { label: 'Daily Reports', icon: RiClipboardLine, path: '/group/reports', enterprise: true },
  { label: 'Approved Sales', icon: RiFileCheckLine, path: '/group/ledger', enterprise: true },
  { label: 'Inventory', icon: RiArchiveLine, path: '/group/stock', enterprise: true },
  { label: 'Credit Customers', icon: RiHandCoinLine, path: '/group/credit', enterprise: true },
  { label: 'POS Settlement', icon: RiBankCard2Line, path: '/group/pos', enterprise: true },
  { label: 'Profit', icon: RiLineChartLine, path: '/group/profit', roles: ['company_owner', 'super_admin'], enterprise: true },
  { label: 'Branches', icon: RiBuilding2Line, path: '/group/branches', roles: ['company_owner', 'super_admin'], enterprise: true },
  // Legal practice — shown to companies whose industry is "legal".
  { type: 'divider', label: 'Legal Practice', legalOnly: true },
  { label: 'Matters', icon: RiScales3Line, path: '/matters', legalOnly: true },
  { label: 'Court Calendar', icon: RiCalendarEventLine, path: '/matters/calendar', legalOnly: true },
  // School management — shown to companies whose industry is "education".
  { type: 'divider', label: 'School', schoolOnly: true },
  // schoolRoles: which school roles see the item (admin/bursar/teacher).
  { label: 'School Overview', icon: RiGraduationCapLine, path: '/school', schoolOnly: true },
  { label: 'Admissions', icon: RiUserAddLine, path: '/school/admissions', schoolOnly: true, schoolRoles: ['admin'] },
  { label: 'Students', icon: RiTeamLine, path: '/school/students', schoolOnly: true },
  { label: 'Classes', icon: RiBook2Line, path: '/school/classes', schoolOnly: true, schoolRoles: ['admin'] },
  { label: 'School Fees', icon: RiMoneyDollarCircleLine, path: '/school/fees', schoolOnly: true, schoolRoles: ['admin', 'bursar'] },
  { label: 'Attendance', icon: RiCalendarCheckLine, path: '/school/attendance', schoolOnly: true, schoolRoles: ['admin', 'teacher'] },
  { label: 'Results', icon: RiFileList3Line, path: '/school/results', schoolOnly: true, schoolRoles: ['admin', 'teacher'] },
  { label: 'Timetable', icon: RiTimeLine, path: '/school/timetable', schoolOnly: true },
  { label: 'School Staff', icon: RiUserSettingsLine, path: '/school/staff', schoolOnly: true, schoolRoles: ['admin'] },
  { label: 'Term Report', icon: RiPieChartLine, path: '/school/report', schoolOnly: true, schoolManagerOnly: true },
  // Hospital management — shown to companies whose industry is "healthcare".
  // hospitalRoles: which hospital roles see the item (admin always does).
  { type: 'divider', label: 'Hospital', healthOnly: true },
  { label: 'Hospital Overview', icon: RiHospitalLine, path: '/hospital', healthOnly: true },
  { label: 'Patients', icon: RiUserHeartLine, path: '/hospital/patients', healthOnly: true },
  { label: 'Queue', icon: RiListOrdered, path: '/hospital/queue', healthOnly: true, hospitalRoles: ['doctor', 'nurse', 'records', 'cashier'] },
  { label: 'Appointments', icon: RiCalendarLine, path: '/hospital/appointments', healthOnly: true, hospitalRoles: ['doctor', 'nurse', 'records', 'cashier'] },
  { label: 'Laboratory', icon: RiTestTubeLine, path: '/hospital/lab', healthOnly: true, hospitalRoles: ['doctor', 'nurse', 'lab'] },
  { label: 'Pharmacy', icon: RiCapsuleLine, path: '/hospital/pharmacy', healthOnly: true, hospitalRoles: ['doctor', 'nurse', 'pharmacist'] },
  { label: 'Wards', icon: RiHotelBedLine, path: '/hospital/wards', healthOnly: true, hospitalRoles: ['doctor', 'nurse', 'records', 'cashier'] },
  { label: 'Hospital Billing', icon: RiMoneyDollarCircleLine, path: '/hospital/billing', healthOnly: true, hospitalRoles: ['cashier'] },
  { label: 'Hospital Staff', icon: RiUserSettingsLine, path: '/hospital/staff', healthOnly: true, hospitalRoles: [] },
  { label: 'Hospital Settings', icon: RiSettings4Line, path: '/hospital/settings', healthOnly: true, hospitalRoles: [] },
  { label: 'Hospital Report', icon: RiPieChartLine, path: '/hospital/report', healthOnly: true, hospitalManagerOnly: true },
  { type: 'divider', label: 'Business' },
  { label: 'Leads', icon: RiUserLine, path: '/leads' },
  { label: 'Customers', icon: RiUserStarLine, path: '/customers' },
  { label: 'Meetings', icon: RiVideoLine, path: '/meetings' },
  { label: 'Invoices', icon: RiMoneyDollarCircleLine, path: '/invoices' },
  { label: 'e-Procurement', icon: RiGovernmentLine, path: '/procurement', businessPlanOnly: true },
  { label: 'Contracts', icon: RiFileTextLine, path: '/contracts' },
  { label: 'Expenses', icon: RiMoneyDollarCircleLine, path: '/expenses' },
  { label: 'Payroll', icon: RiMoneyDollarCircleLine, path: '/payroll', roles: ['company_owner', 'manager', 'super_admin'] },
  { label: 'Loyalty', icon: RiAwardLine, path: '/loyalty' },
  { label: 'Group Buying', icon: RiGroupLine, path: '/group-buys' },
  { label: 'Orders', icon: RiShoppingBagLine, path: '/orders' },
  { label: 'Products', icon: RiStore2Line, path: '/products' },
  { label: 'Appointments', icon: RiCalendarLine, path: '/appointments' },
  { label: 'Social Media', icon: RiMegaphoneLine, path: '/social' },
  { label: 'Reports', icon: RiFileChartLine, path: '/reports' },
  { type: 'divider', label: 'Workspace' },
  { label: 'My Store', icon: RiStoreLine, path: '/settings/store' },
  { label: 'My Card', icon: RiContactsLine, path: '/settings/card' },
  { label: 'Billing', icon: RiBankCardLine, path: '/billing' },
  { label: 'Analytics', icon: RiBarChartLine, path: '/analytics' },
  { label: 'Team', icon: RiTeamLine, path: '/team' },
  { label: 'WhatsApp', icon: RiWhatsappLine, path: '/whatsapp' },
  { label: 'Chat Inbox', icon: RiChat3Line, path: '/widget-inbox' },
  { label: 'Widget Settings', icon: RiCodeLine, path: '/widget-settings' },
  { label: 'Settings', icon: RiSettings4Line, path: '/settings' },
  { label: 'Activity Log', icon: RiHistoryLine, path: '/settings/audit-log', roles: ['company_owner', 'manager', 'super_admin'] },
  { type: 'divider', label: 'Platform', adminOnly: true },
  { label: 'Super Admin', icon: RiShieldLine, path: '/admin', adminOnly: true },
];

const OPEN_SECTION_KEY = 'sidebar.openSection';
const EXACT_PATHS = ['/matters', '/school', '/group', '/hospital'];

// The section whose item best matches the current URL (longest path wins,
// so /group/reports beats /group, and /hospital/visits/123 falls back to
// /hospital's section).
function sectionForPath(sections, pathname) {
  let best = null;
  let bestLen = -1;
  for (const s of sections) {
    for (const item of s.items) {
      const hit = pathname === item.path || pathname.startsWith(`${item.path}/`);
      if (hit && item.path.length > bestLen) { best = s.label; bestLen = item.path.length; }
    }
  }
  return best;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const { user, company, logout } = useAuth();
  const schoolMe = useSchoolMe(company?.industry === 'education');
  const hospitalMe = useHospitalMe(company?.industry === 'healthcare');
  const location = useLocation();
  const [waNeedsHuman, setWaNeedsHuman] = useState(0);
  const [widgetNeedsHuman, setWidgetNeedsHuman] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);
  const [loyaltyMembers, setLoyaltyMembers] = useState(0);
  const [draftContracts, setDraftContracts] = useState(0);
  const [pendingRequisitions, setPendingRequisitions] = useState(0);
  const [groupAwaiting, setGroupAwaiting] = useState(0);
  const groupAccess = useGroupAccess();
  const groupLocked = groupAccess && !groupAccess.allowed;
  const [openSection, setOpenSection] = useState(() => {
    try { return localStorage.getItem(OPEN_SECTION_KEY); } catch { return null; }
  });
  const toggleSection = (label) => {
    const next = openSection === label ? null : label;
    setOpenSection(next);
    try { if (next) localStorage.setItem(OPEN_SECTION_KEY, next); else localStorage.removeItem(OPEN_SECTION_KEY); } catch { /* ignore */ }
  };

  // Poll for branch reports waiting on this user's approval (only when the plan includes it)
  useEffect(() => {
    if (!groupAccess?.allowed) return undefined;
    let alive = true;
    const check = async () => {
      try {
        const { data } = await groupService.getReports({ awaiting: 'me', limit: 500 });
        if (alive) setGroupAwaiting(data.data?.length || 0);
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [groupAccess?.allowed]);

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

  // Poll for widget chat conversations waiting on a human
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await widgetService.getConversations({ filter: 'needs_human' });
        if (alive) setWidgetNeedsHuman(data.counts?.needsHuman || 0);
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

  // Poll for enrolled loyalty members (badge only shows once the program has members)
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await loyaltyService.getCustomers({ minimumPoints: 1, limit: 1 });
        if (alive) setLoyaltyMembers(data.pagination?.total || 0);
      } catch { /* program likely not set up yet — ignore */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // Poll for draft contracts awaiting review/sending
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await contractService.getAll({ status: 'draft', limit: 1 });
        if (alive) setDraftContracts(data.pagination?.total || 0);
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const isBusinessPlan = company?.subscription?.plan === 'business';

  // Poll for procurement requisitions awaiting approval (Business plan only)
  useEffect(() => {
    if (!isBusinessPlan) return;
    let alive = true;
    const check = async () => {
      try {
        const { data } = await procurementService.getAll({ status: 'pending_approval', limit: 1 });
        if (alive) setPendingRequisitions(data.pagination?.total || 0);
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [isBusinessPlan]);

  const storeNeedsSetup = Boolean(company) && !company?.paymentSettings?.isPaymentSetup;

  // "New" badge for 7 days after the Digital Business Card feature launched —
  // shown to every user (not gated on account age), since the point is to
  // announce a feature that just shipped, not one they just signed up for.
  const CARD_FEATURE_LAUNCHED_AT = new Date('2026-09-21T00:00:00Z').getTime();
  const isNewFeature = (Date.now() - CARD_FEATURE_LAUNCHED_AT) / 86400000 <= 7;

  const badgeFor = (item) => {
    if (item.path === '/whatsapp') return waNeedsHuman > 0 ? waNeedsHuman : null;
    if (item.path === '/widget-inbox') return widgetNeedsHuman > 0 ? widgetNeedsHuman : null;
    if (item.path === '/products') return outOfStock > 0 ? outOfStock : null;
    if (item.path === '/settings/store') return storeNeedsSetup ? 'Setup' : null;
    if (item.path === '/settings/card') return isNewFeature ? 'New' : null;
    if (item.path === '/loyalty') return loyaltyMembers > 0 ? loyaltyMembers : null;
    if (item.path === '/contracts') return draftContracts > 0 ? draftContracts : null;
    if (item.path === '/procurement') return pendingRequisitions > 0 ? pendingRequisitions : null;
    if (item.enterprise && groupLocked) return 'Enterprise';
    if (item.path === '/group/reports') return groupAwaiting > 0 ? groupAwaiting : null;
    return item.badge;
  };

  const visible = (item) => {
    if (item.adminOnly && user?.role !== 'super_admin') return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.businessPlanOnly && !isBusinessPlan && user?.role !== 'super_admin') return false;
    if (item.legalOnly && company?.industry !== 'legal') return false;
    if (item.schoolOnly && company?.industry !== 'education') return false;
    if (item.schoolRoles && schoolMe && !item.schoolRoles.includes(schoolMe.role)) return false;
    if (item.schoolManagerOnly && schoolMe && !schoolMe.manager) return false;
    if (item.healthOnly && company?.industry !== 'healthcare') return false;
    if (item.hospitalRoles && hospitalMe && hospitalMe.role !== 'admin' && !item.hospitalRoles.includes(hospitalMe.role)) return false;
    if (item.hospitalManagerOnly && hospitalMe && !hospitalMe.manager) return false;
    return true;
  };

  // Split the flat list into the always-visible top items and the sections
  // that follow each divider; sections with nothing visible are dropped.
  const top = [];
  const allSections = [];
  for (const item of NAV_ITEMS) {
    if (!visible(item)) continue;
    if (item.type === 'divider') allSections.push({ label: item.label, items: [] });
    else if (allSections.length) allSections[allSections.length - 1].items.push(item);
    else top.push(item);
  }
  const sections = allSections.filter((s) => s.items.length);

  // Opening a page (link, bookmark, back button) opens its section.
  const activeSection = sectionForPath(sections, location.pathname);
  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection]);

  // Sum of a closed section's counts, so waiting work isn't hidden.
  const sectionBadge = (section) => {
    const badges = section.items.map(badgeFor).filter(Boolean);
    const total = badges.filter((b) => typeof b === 'number').reduce((a, b) => a + b, 0);
    if (total) return total;
    return badges.includes('Enterprise') && badges.every((b) => b === 'Enterprise') ? 'Enterprise' : null;
  };

  const renderItem = (item) => {
    const Icon = item.icon;
    const badge = badgeFor(item);
    return (
      <NavLink
        key={item.path}
        end={EXACT_PATHS.includes(item.path)}
        to={item.path}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        onClick={() => onClose && onClose()}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="nav-icon" />
        {!collapsed && <span className="nav-label">{item.label}</span>}
        {badge ? (
          <span className={`nav-badge ${collapsed ? 'nav-badge-dot' : ''} ${badge === 'Enterprise' ? 'nav-badge-plan' : ''}`}>
            {collapsed ? '' : badge}
          </span>
        ) : null}
      </NavLink>
    );
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

      {/* Navigation — top items always shown; each section opens and closes
          from its heading, one at a time, so the menu stays short. */}
      <nav className="sidebar-nav">
        {top.map(renderItem)}
        {sections.map((section) => {
          if (collapsed) {
            return (
              <div key={section.label}>
                <div className="nav-divider" />
                {section.items.map(renderItem)}
              </div>
            );
          }
          const open = openSection === section.label;
          const badge = sectionBadge(section);
          return (
            <div key={section.label} className={`nav-section ${open ? 'open' : ''}`}>
              <button
                type="button"
                className="nav-section-toggle"
                aria-expanded={open}
                onClick={() => toggleSection(section.label)}
              >
                <span>{section.label}</span>
                {!open && badge ? <span className={`nav-badge ${badge === 'Enterprise' ? 'nav-badge-plan' : ''}`}>{badge}</span> : null}
                <RiArrowDownSLine className="nav-section-chevron" />
              </button>
              {open && <div className="nav-section-items">{section.items.map(renderItem)}</div>}
            </div>
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
