import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RiFileList3Line, RiShoppingBag3Line, RiCalendarEventLine, RiDownloadLine,
  RiLogoutBoxRLine, RiLoader4Line, RiInboxLine, RiTimeLine, RiMapPinLine, RiVideoLine,
  RiBankLine, RiMailLine, RiPhoneLine, RiStore2Line,
} from 'react-icons/ri';
import { portalService } from '../../services';
import './Portal.css';

const PT_TOKEN = 'portalToken';
const PT_EMAIL = 'portalEmail';

function PortalMark() {
  return (
    <span className="pt-logo">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="ptMarkP" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#ptMarkP)" />
        <path d="M11 8h7.5a4.5 4.5 0 0 1 1.2 8.8A4.8 4.8 0 0 1 18.2 26H11V8Zm4 3.4v4.2h3.1a2.1 2.1 0 0 0 0-4.2H15Zm0 7.2v4.4h3.1a2.2 2.2 0 0 0 0-4.4H15Z" fill="#fff" />
      </svg>
      Bizly<b>AI</b>
    </span>
  );
}

const money = (n, cur) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(n || 0);
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const dayTime = (d) => (d ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const TABS = [
  { id: 'invoices', label: 'Invoices', icon: RiFileList3Line },
  { id: 'orders', label: 'Orders', icon: RiShoppingBag3Line },
  { id: 'appointments', label: 'Appointments', icon: RiCalendarEventLine },
];

export default function Portal() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [status, setStatus] = useState('init'); // init | loading | ready
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('invoices');
  const token = () => localStorage.getItem(PT_TOKEN);

  const logout = useCallback((to = '/portal/login') => {
    localStorage.removeItem(PT_TOKEN);
    localStorage.removeItem(PT_EMAIL);
    navigate(to, { replace: true });
  }, [navigate]);

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await portalService.getData(token());
      setData(res.data.data);
      localStorage.setItem(PT_EMAIL, res.data.data.email);
      setStatus('ready');
    } catch {
      logout();
    }
  }, [logout]);

  // Handle ?token=xxx → verify → store → clean URL → load
  useEffect(() => {
    document.title = 'Your Documents · BizlyAI';
    const urlToken = params.get('token');

    if (urlToken) {
      (async () => {
        setStatus('loading');
        try {
          const res = await portalService.verifyToken(urlToken);
          localStorage.setItem(PT_TOKEN, res.data.token);
          if (res.data.email) localStorage.setItem(PT_EMAIL, res.data.email);
          setParams({}, { replace: true });
          loadData();
        } catch {
          logout('/portal/login?expired=1');
        }
      })();
      return;
    }

    if (!token()) {
      navigate('/portal/login', { replace: true });
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status !== 'ready' || !data) {
    return (
      <div className="pt">
        <div className="pt-loading"><RiLoader4Line className="pt-spin" /> Loading your documents…</div>
      </div>
    );
  }

  const email = data.email || localStorage.getItem(PT_EMAIL) || '';
  // Older tokens may still return `company` as a plain name string.
  const business = typeof data.company === 'string' ? { name: data.company } : (data.company || {});
  const counts = {
    invoices: data.invoices.length,
    orders: data.orders.length,
    appointments: data.appointments.length,
  };

  return (
    <div className="pt">
      <header className="pt-header">
        <div className="pt-header-inner">
          {business.logo ? (
            <span className="pt-biz-brand">
              <img className="pt-biz-logo" src={business.logo} alt={business.name} />
              <span className="pt-biz-name">{business.name}</span>
            </span>
          ) : (
            <span className="pt-biz-brand">
              <RiStore2Line className="pt-biz-fallback-icon" />
              <span className="pt-biz-name">{business.name || 'Your provider'}</span>
            </span>
          )}
          <div className="pt-header-right">
            <span className="pt-email" title={email}>{email}</span>
            <button className="pt-logout" onClick={() => logout()}>
              <RiLogoutBoxRLine /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="pt-main">
        <div className="pt-greeting">
          <h1>Your Documents</h1>
          <p>{business.tagline || `Shared with you by ${business.name || 'your provider'}`}</p>
        </div>

        {(business.contact?.email || business.contact?.phone || business.contact?.address || business.bankDetails) && (
          <div className="pt-biz-info">
            {(business.contact?.email || business.contact?.phone || business.contact?.address) && (
              <div className="pt-biz-contact">
                {business.contact?.phone && <span><RiPhoneLine /> {business.contact.phone}</span>}
                {business.contact?.email && <span><RiMailLine /> {business.contact.email}</span>}
                {business.contact?.address && <span><RiMapPinLine /> {business.contact.address}</span>}
              </div>
            )}
            {business.bankDetails && (
              <div className="pt-bank-box">
                <div className="pt-bank-title"><RiBankLine /> Bank details for manual payment</div>
                <div className="pt-bank-grid">
                  <span>Bank</span><strong>{business.bankDetails.bankName || '—'}</strong>
                  <span>Account Name</span><strong>{business.bankDetails.accountName || '—'}</strong>
                  <span>Account Number</span><strong>{business.bankDetails.accountNumber || '—'}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`pt-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon /> <span>{t.label}</span>
                {counts[t.id] > 0 && <span className="pt-tab-count">{counts[t.id]}</span>}
              </button>
            );
          })}
        </div>

        {/* Invoices */}
        {tab === 'invoices' && (
          <div className="pt-panel">
            {data.invoices.length === 0 ? (
              <Empty label="No invoices yet" />
            ) : (
              <div className="pt-table-wrap">
                <table className="pt-table">
                  <thead>
                    <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td className="pt-num">{inv.invoiceNumber}</td>
                        <td>{day(inv.issuedAt)}</td>
                        <td>{money(inv.total, inv.currency)}</td>
                        <td><span className={`pt-badge ${inv.status}`}>{inv.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="pt-dl"
                            onClick={() => window.open(portalService.invoicePdfUrl(inv._id, token()), '_blank', 'noopener')}
                          >
                            <RiDownloadLine /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <div className="pt-panel">
            {data.orders.length === 0 ? (
              <Empty label="No orders yet" />
            ) : (
              <div className="pt-table-wrap">
                <table className="pt-table">
                  <thead>
                    <tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o._id}>
                        <td className="pt-num">{o.orderNumber}</td>
                        <td>{day(o.createdAt)}</td>
                        <td>{o.itemsCount} {o.itemsCount === 1 ? 'item' : 'items'}</td>
                        <td>{money(o.total, o.currency)}</td>
                        <td><span className={`pt-badge ${o.status}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Appointments */}
        {tab === 'appointments' && (
          <div className="pt-panel">
            {data.appointments.length === 0 ? (
              <Empty label="No appointments yet" />
            ) : (
              <div className="pt-appts">
                {data.appointments.map((a) => (
                  <div key={a._id} className="pt-appt">
                    <span className="pt-appt-title">{a.title}</span>
                    <span className="pt-appt-when"><RiTimeLine /> {dayTime(a.scheduledAt)}</span>
                    {a.isVirtual ? (
                      <span className="pt-appt-meta"><RiVideoLine /> {a.meetingLink ? <a href={a.meetingLink} target="_blank" rel="noreferrer">Join online</a> : 'Online'}</span>
                    ) : a.location ? (
                      <span className="pt-appt-meta"><RiMapPinLine /> {a.location}</span>
                    ) : null}
                    <span className={`pt-badge ${a.status}`}>{a.status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="pt-footer">
        <PortalMark /> <span>Secure customer portal</span>
      </footer>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="pt-empty">
      <RiInboxLine />
      <p>{label}</p>
    </div>
  );
}
