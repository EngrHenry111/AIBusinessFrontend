import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../services';
import {
  RiSearchLine, RiSunLine, RiMoonLine, RiNotification3Line,
  RiMenuLine, RiSettings4Line, RiLogoutBoxLine, RiUserLine,
  RiAlertLine, RiCheckLine, RiInformationLine, RiCloseLine
} from 'react-icons/ri';
import './TopBar.css';

const NOTIF_ICONS = { warning: RiAlertLine, success: RiCheckLine, info: RiInformationLine };
const NOTIF_COLORS = { warning: '#f59e0b', success: '#10b981', info: '#6366f1' };

export default function TopBar({ onMenuToggle }) {
  const { user, company, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      const { data } = await notificationService.getAll();
      setNotifications(data.data || []);
      setUnreadMsg(data.unreadMessages || 0);
    } catch {}
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search)}`);
      setSearch('');
    }
  };

  const totalNotifs = notifications.length + unreadMsg;
  const fmtTime = (dt) => {
    const diff = (Date.now() - new Date(dt)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon topbar-menu" onClick={onMenuToggle}>
          <RiMenuLine />
        </button>
        <form className="topbar-search" onSubmit={handleSearch}>
          <RiSearchLine className="search-icon" />
          <input
            id="global-search"
            type="text"
            placeholder="Search everything..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <kbd className="search-kbd">⌘K</kbd>
        </form>
      </div>

      <div className="topbar-right">
        <button className="btn btn-ghost btn-icon" onClick={toggle} title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? <RiSunLine /> : <RiMoonLine />}
        </button>

        {/* Notifications */}
        <div className="notif-wrapper" ref={notifRef}>
          <button className="btn btn-ghost btn-icon topbar-notif"
            onClick={() => setShowNotifs(v => !v)} title="Notifications">
            <RiNotification3Line />
            {totalNotifs > 0 && <span className="notif-count">{totalNotifs > 9 ? '9+' : totalNotifs}</span>}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                {totalNotifs > 0 && <span className="notif-badge">{totalNotifs}</span>}
              </div>

              {unreadMsg > 0 && (
                <button className="notif-item" onClick={() => { navigate('/messages'); setShowNotifs(false); }}>
                  <div className="notif-icon" style={{ background: '#6366f118', color: '#6366f1' }}>💬</div>
                  <div className="notif-body">
                    <div className="notif-title">{unreadMsg} unread message{unreadMsg > 1 ? 's' : ''}</div>
                    <div className="notif-sub">Click to view messages</div>
                  </div>
                </button>
              )}

              {notifications.length === 0 && unreadMsg === 0 ? (
                <div className="notif-empty">
                  <RiCheckLine style={{ fontSize: 24, color: '#10b981' }} />
                  <p>All caught up!</p>
                </div>
              ) : (
                notifications.slice(0, 8).map(n => {
                  const Icon = NOTIF_ICONS[n.type] || RiInformationLine;
                  const color = NOTIF_COLORS[n.type] || '#6366f1';
                  return (
                    <button key={n.id} className="notif-item"
                      onClick={() => { navigate(n.url); setShowNotifs(false); }}>
                      <div className="notif-icon" style={{ background: `${color}18`, color }}>
                        <Icon />
                      </div>
                      <div className="notif-body">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-sub">{n.message}</div>
                        <div className="notif-time">{fmtTime(n.time)}</div>
                      </div>
                    </button>
                  );
                })
              )}

              <div className="notif-footer">
                <button onClick={() => setShowNotifs(false)}>
                  <RiCloseLine /> Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="user-menu-wrapper" ref={menuRef}>
          <button className="topbar-avatar" onClick={() => setShowUserMenu(v => !v)}>
            <div className="avatar-circle">
              {user?.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{user?.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div className="avatar-info">
              <span className="avatar-name">{user?.name}</span>
              <span className="avatar-company">{company?.name || company?.companyName}</span>
            </div>
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                <RiUserLine /> Profile
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                <RiSettings4Line /> Settings
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/billing'); setShowUserMenu(false); }}>
                💳 Billing
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={logout}>
                <RiLogoutBoxLine /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
