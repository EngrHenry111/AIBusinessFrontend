import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { customerService, portalService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiArrowLeftLine, RiEdit2Line, RiMailSendLine, RiUserStarLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Customers.css';

const money = (n, cur = 'NGN') => {
  const sym = cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
};
const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const TABS = ['Overview', 'Orders', 'Invoices', 'Appointments', 'Activity'];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    customerService.getOne(id)
      .then(({ data }) => setCustomer(data.data))
      .catch(() => { toast.error('Customer not found'); navigate('/customers'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function sendPortalLink() {
    if (!customer.email) return toast.error('This customer has no email address');
    const companyId = company?._id || company?.id;
    setSending(true);
    try {
      await portalService.requestAccess(customer.email, companyId);
      toast.success(`Portal link sent to ${customer.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send portal link');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 420, borderRadius: 14, margin: 16 }} />;
  if (!customer) return null;

  const cur = customer.orders?.[0]?.currency || customer.invoices?.[0]?.currency || 'NGN';

  return (
    <div className="customers-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customers')}>
          <RiArrowLeftLine /> Back to customers
        </button>
        <div className="cd-header">
          <span className="avatar-circle lg">{initials(customer.name)}</span>
          <div className="cd-id">
            <h1>{customer.name}</h1>
            <div className="cd-contact">
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span>{customer.phone}</span>}
              {customer.company && <span>{customer.company}</span>}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <span className={`badge badge-${customer.status === 'active' ? 'success' : 'neutral'}`}>{customer.status}</span>
              <span className="badge badge-neutral">{customer.type}</span>
              {customer.convertedFromLead && <span className="badge badge-info">converted lead</span>}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={sendPortalLink} disabled={sending}>
              <RiMailSendLine /> {sending ? 'Sending…' : 'Send Portal Link'}
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/customers/${id}/edit`)}>
              <RiEdit2Line /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="cd-stats">
        <div className="cust-stat"><div className="cs-label">Total Orders</div><div className="cs-value">{customer.totalOrders || customer.orders?.length || 0}</div></div>
        <div className="cust-stat"><div className="cs-label">Total Spent</div><div className="cs-value">{money(customer.totalSpent, cur)}</div></div>
        <div className="cust-stat"><div className="cs-label">Average Order</div><div className="cs-value">{money(customer.avgOrder, cur)}</div></div>
        <div className="cust-stat"><div className="cs-label">Last Order</div><div className="cs-value" style={{ fontSize: 16 }}>{fmtDate(customer.lastOrderAt)}</div></div>
      </div>

      <div className="cd-tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Contact Information</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 14, margin: 0 }}>
              <dt className="muted">Email</dt><dd style={{ margin: 0 }}>{customer.email || '—'}</dd>
              <dt className="muted">Phone</dt><dd style={{ margin: 0 }}>{customer.phone || '—'}</dd>
              <dt className="muted">Company</dt><dd style={{ margin: 0 }}>{customer.company || '—'}</dd>
              <dt className="muted">Address</dt><dd style={{ margin: 0 }}>{[customer.address, customer.city, customer.state].filter(Boolean).join(', ') || '—'}</dd>
              <dt className="muted">Added</dt><dd style={{ margin: 0 }}>{fmtDate(customer.createdAt)}{customer.createdBy?.name ? ` by ${customer.createdBy.name}` : ''}</dd>
            </dl>
          </div>
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Notes</h3>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: customer.notes ? 'inherit' : 'var(--text-muted)' }}>
              {customer.notes || 'No notes yet.'}
            </p>
            {customer.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {customer.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Orders' && (
        <TableCard
          empty="No orders from this customer yet."
          head={['Order', 'Date', 'Items', 'Total', 'Status']}
          rows={(customer.orders || []).map((o) => [
            <Link to="/orders" key="l">{o.orderNumber}</Link>,
            fmtDate(o.createdAt),
            (o.items || []).reduce((s, it) => s + (it.quantity || 0), 0),
            money(o.total, o.currency),
            <span className="badge badge-neutral" key="s">{o.status}</span>,
          ])}
        />
      )}

      {tab === 'Invoices' && (
        <TableCard
          empty="No invoices for this customer yet."
          head={['Invoice', 'Issued', 'Due', 'Amount', 'Status']}
          rows={(customer.invoices || []).map((i) => [
            <Link to="/invoices" key="l">{i.invoiceNumber}</Link>,
            fmtDate(i.issuedAt || i.createdAt),
            fmtDate(i.dueAt),
            money(i.total, i.currency),
            <span className="badge badge-neutral" key="s">{i.status}</span>,
          ])}
        />
      )}

      {tab === 'Appointments' && (
        <TableCard
          empty="No appointments with this customer yet."
          head={['Title', 'When', 'Duration', 'Status']}
          rows={(customer.appointments || []).map((a) => [
            a.title || 'Appointment',
            fmtDateTime(a.scheduledAt),
            a.duration ? `${a.duration} min` : '—',
            <span className="badge badge-neutral" key="s">{a.status}</span>,
          ])}
        />
      )}

      {tab === 'Activity' && (
        <div className="card card-pad">
          {customer.activity?.length ? (
            <div className="timeline-list">
              {customer.activity.map((e, i) => (
                <div className="tl-entry" key={i}>
                  <div className="tl-dot" />
                  <div className="tl-body">
                    <span>
                      <strong style={{ textTransform: 'capitalize' }}>{e.type}</strong> — {e.label}
                      {e.meta ? ` (${e.meta})` : ''}
                      {e.amount != null ? ` · ${money(e.amount, e.currency)}` : ''}
                    </span>
                    <span className="tl-time">{fmtDateTime(e.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No recorded activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TableCard({ head, rows, empty }) {
  if (!rows.length) {
    return <div className="card card-pad"><p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>{empty}</p></div>;
  }
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="cust-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
