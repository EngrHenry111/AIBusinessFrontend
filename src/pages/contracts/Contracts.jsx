import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractService } from '../../services';
import toast from 'react-hot-toast';
import {
  RiFileTextLine, RiAddLine, RiSearchLine, RiEyeLine, RiMailSendLine,
  RiDownloadLine, RiDeleteBinLine, RiLoader4Line,
} from 'react-icons/ri';
import './Contracts.css';

const TYPE_LABELS = {
  service_agreement: 'Service Agreement', employment: 'Employment', nda: 'NDA', vendor: 'Vendor',
  freelance: 'Freelance', partnership: 'Partnership', lease: 'Lease', sale_of_goods: 'Sale of Goods',
  consulting: 'Consulting', retainer: 'Retainer', custom: 'Custom',
};
const TYPE_COLORS = {
  service_agreement: 'brand', employment: 'info', nda: 'danger', vendor: 'warning', freelance: 'success',
  partnership: 'info', lease: 'warning', sale_of_goods: 'brand', consulting: 'success', retainer: 'info', custom: 'neutral',
};
const STATUS_COLORS = { draft: 'neutral', sent: 'info', signed: 'success', expired: 'danger', cancelled: 'neutral' };
const money = (n, cur) => `${cur || 'NGN'} ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    contractService.getAll({ search: search || undefined, type: typeFilter || undefined, status: statusFilter || undefined, sort })
      .then(({ data }) => setContracts(data.data || []))
      .catch(() => toast.error('Failed to load contracts'))
      .finally(() => setLoading(false));
  }, [search, typeFilter, statusFilter, sort]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const counts = useMemo(() => ({
    total: contracts.length,
    draft: contracts.filter((c) => c.status === 'draft').length,
    sent: contracts.filter((c) => c.status === 'sent').length,
    signed: contracts.filter((c) => c.status === 'signed').length,
  }), [contracts]);

  async function handleSend(c) {
    if (!c.parties?.party2?.email) return toast.error('Party 2 has no email address on file.');
    setSendingId(c._id);
    try {
      await contractService.send(c._id);
      toast.success(`Sent to ${c.parties.party2.email}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send contract');
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    setDeletingId(c._id);
    try {
      await contractService.delete(c._id);
      toast.success('Contract deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete contract');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="contracts-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiFileTextLine style={{ verticalAlign: '-3px' }} /> Contracts</h1>
          <p>Generate professional contracts with AI, in minutes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/contracts/new')}>
          <RiAddLine /> Generate Contract
        </button>
      </div>

      <div className="contract-stats">
        <div className="contract-stat"><span className="cst-num">{counts.total}</span><span className="cst-label">Total</span></div>
        <div className="contract-stat"><span className="cst-num">{counts.draft}</span><span className="cst-label">Draft</span></div>
        <div className="contract-stat"><span className="cst-num">{counts.sent}</span><span className="cst-label">Sent</span></div>
        <div className="contract-stat"><span className="cst-num">{counts.signed}</span><span className="cst-label">Signed</span></div>
      </div>

      <div className="card card-pad">
        <div className="contract-filters">
          <div className="contract-search">
            <RiSearchLine />
            <input placeholder="Search by title or party name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="-terms.value">Highest value</option>
          </select>
        </div>

        <div className="contract-table-wrap">
          <table className="contract-table">
            <thead>
              <tr><th>Title</th><th>Type</th><th>Parties</th><th>Value</th><th>Status</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="contract-hint">Loading…</td></tr>}
              {!loading && contracts.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <RiFileTextLine className="empty-state-icon" />
                    <h3>No contracts yet</h3>
                    <p>Generate your first AI-drafted contract in a couple of minutes.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/contracts/new')}><RiAddLine /> Generate Contract</button>
                  </div>
                </td></tr>
              )}
              {contracts.map((c) => (
                <tr key={c._id} className="contract-row" onClick={() => navigate(`/contracts/${c._id}`)}>
                  <td><strong>{c.title}</strong></td>
                  <td><span className={`badge badge-${TYPE_COLORS[c.type] || 'neutral'}`}>{TYPE_LABELS[c.type] || c.type}</span></td>
                  <td className="contract-parties">
                    <span>{c.parties?.party1?.name || '—'}</span>
                    <span className="contract-vs">vs</span>
                    <span>{c.parties?.party2?.name || '—'}</span>
                  </td>
                  <td>{c.terms?.value ? money(c.terms.value, c.terms.currency) : '—'}</td>
                  <td><span className={`badge badge-${STATUS_COLORS[c.status] || 'neutral'}`}>{c.status}</span></td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="contract-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => navigate(`/contracts/${c._id}`)}><RiEyeLine /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Send" disabled={sendingId === c._id} onClick={() => handleSend(c)}>
                        {sendingId === c._id ? <RiLoader4Line className="spin" /> : <RiMailSendLine />}
                      </button>
                      <a className="btn btn-ghost btn-icon btn-sm" title="Download" href={contractService.getPDF(c._id)} target="_blank" rel="noreferrer">
                        <RiDownloadLine />
                      </a>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" disabled={deletingId === c._id} onClick={() => handleDelete(c)}>
                        {deletingId === c._id ? <RiLoader4Line className="spin" /> : <RiDeleteBinLine />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
