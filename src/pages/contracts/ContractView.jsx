import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contractService } from '../../services';
import toast from 'react-hot-toast';
import {
  RiFileTextLine, RiEditLine, RiMailSendLine, RiDownloadLine, RiFileCopyLine,
  RiDeleteBinLine, RiSaveLine, RiCloseLine, RiCheckLine, RiTimeLine, RiArrowLeftLine,
} from 'react-icons/ri';
import './Contracts.css';

const TYPE_LABELS = {
  service_agreement: 'Service Agreement', employment: 'Employment Contract', nda: 'NDA (Non-Disclosure)',
  vendor: 'Vendor Agreement', freelance: 'Freelance Contract', partnership: 'Partnership Agreement',
  lease: 'Lease Agreement', sale_of_goods: 'Sale of Goods Agreement', consulting: 'Consulting Agreement',
  retainer: 'Retainer Agreement', custom: 'Custom Contract',
};
const STATUS_COLORS = { draft: 'neutral', sent: 'info', signed: 'success', expired: 'danger', cancelled: 'neutral' };
const money = (n, cur) => `${cur || 'NGN'} ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, [id]);

  function load() {
    setLoading(true);
    contractService.getOne(id)
      .then(({ data }) => { setContract(data.data); setContent(data.data.content); setTitle(data.data.title); })
      .catch(() => toast.error('Could not load contract'))
      .finally(() => setLoading(false));
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const { data } = await contractService.update(id, { title, content });
      setContract(data.data);
      setEditing(false);
      toast.success('Contract updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!contract.parties?.party2?.email) return toast.error('Party 2 has no email address on file.');
    setSending(true);
    try {
      const { data } = await contractService.send(id);
      setContract(data.data);
      toast.success(`Sent to ${contract.parties.party2.email}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send contract');
    } finally {
      setSending(false);
    }
  }

  async function handleDuplicate() {
    try {
      const { data } = await contractService.duplicate(id);
      toast.success('Duplicated as a new draft');
      navigate(`/contracts/${data.data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to duplicate');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${contract.title}"? This cannot be undone.`)) return;
    try {
      await contractService.delete(id);
      toast.success('Contract deleted');
      navigate('/contracts');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  }

  if (loading) {
    return (
      <div className="contracts-page">
        <div className="page-header"><h1>Contract</h1></div>
        <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
      </div>
    );
  }
  if (!contract) return null;

  const p1 = contract.parties?.party1 || {};
  const p2 = contract.parties?.party2 || {};

  return (
    <div className="contracts-page fade-in">
      <button className="btn btn-ghost" onClick={() => navigate('/contracts')} style={{ marginBottom: 12 }}>
        <RiArrowLeftLine /> Back to Contracts
      </button>

      <div className="page-header page-header-row">
        <div>
          <h1><RiFileTextLine style={{ verticalAlign: '-3px' }} /> {contract.title}</h1>
          <p>{TYPE_LABELS[contract.type] || contract.type} · <span className={`badge badge-${STATUS_COLORS[contract.status]}`}>{contract.status}</span></p>
        </div>
        <div className="contract-view-actions">
          {!editing && <button className="btn btn-secondary" onClick={() => setEditing(true)}><RiEditLine /> Edit</button>}
          <button className="btn btn-secondary" disabled={sending} onClick={handleSend}><RiMailSendLine /> {sending ? 'Sending…' : 'Send'}</button>
          <a className="btn btn-secondary" href={contractService.getPDF(id)} target="_blank" rel="noreferrer"><RiDownloadLine /> Download</a>
          <button className="btn btn-secondary" onClick={handleDuplicate}><RiFileCopyLine /> Duplicate</button>
          {contract.status === 'draft' && <button className="btn btn-ghost" onClick={handleDelete}><RiDeleteBinLine /> Delete</button>}
        </div>
      </div>

      <div className="contract-view-grid">
        <div className="card card-pad">
          <h3>Parties</h3>
          <div className="contract-parties-grid">
            <div>
              <h4>Party 1</h4>
              <p><strong>{p1.name}</strong></p>
              <p className="contract-hint">{p1.role}</p>
              {p1.address && <p className="contract-hint">{p1.address}</p>}
            </div>
            <div>
              <h4>Party 2</h4>
              <p><strong>{p2.name}</strong></p>
              <p className="contract-hint">{p2.role}</p>
              {p2.email && <p className="contract-hint">{p2.email}</p>}
              {p2.phone && <p className="contract-hint">{p2.phone}</p>}
              {p2.address && <p className="contract-hint">{p2.address}</p>}
            </div>
          </div>
          {contract.terms?.value ? (
            <div className="contract-summary-row"><span>Contract Value</span><strong>{money(contract.terms.value, contract.terms.currency)}</strong></div>
          ) : null}
          {contract.terms?.startDate && <div className="contract-summary-row"><span>Start Date</span><strong>{fmtDate(contract.terms.startDate)}</strong></div>}
          {contract.terms?.endDate && <div className="contract-summary-row"><span>End Date</span><strong>{fmtDate(contract.terms.endDate)}</strong></div>}

          {(contract.linkedInvoiceId || contract.linkedLeadId) && (
            <div className="contract-linked">
              <h4>Linked</h4>
              {contract.linkedInvoiceId && <Link to="/invoices" className="contract-link">View linked invoice →</Link>}
              {contract.linkedLeadId && <Link to={`/leads/${contract.linkedLeadId}`} className="contract-link">View linked lead →</Link>}
            </div>
          )}

          <h3 style={{ marginTop: 20 }}>Timeline</h3>
          <div className="contract-timeline">
            <div className="contract-timeline-step done"><RiCheckLine /><span>Created {fmtDate(contract.createdAt)}</span></div>
            <div className={`contract-timeline-step ${contract.sentAt ? 'done' : ''}`}>
              {contract.sentAt ? <RiCheckLine /> : <RiTimeLine />}<span>{contract.sentAt ? `Sent ${fmtDate(contract.sentAt)}` : 'Not sent yet'}</span>
            </div>
            <div className={`contract-timeline-step ${contract.signedAt ? 'done' : ''}`}>
              {contract.signedAt ? <RiCheckLine /> : <RiTimeLine />}<span>{contract.signedAt ? `Signed ${fmtDate(contract.signedAt)}` : 'Not signed yet'}</span>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="contract-editor-header">
            <h3>Contract Content</h3>
            {editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(false); setContent(contract.content); setTitle(contract.title); }}><RiCloseLine /></button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveEdits}><RiSaveLine /> {saving ? 'Saving…' : 'Save'}</button>
              </div>
            ) : (
              <span className="contract-hint">{contract.aiGenerated ? 'AI-generated' : 'Manually edited'}</span>
            )}
          </div>
          {editing ? (
            <>
              <label className="ce-field"><span>Title</span><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <textarea className="contract-editor" value={content} onChange={(e) => setContent(e.target.value)} rows={26} />
            </>
          ) : (
            <div className="contract-preview"><pre>{contract.content}</pre></div>
          )}
        </div>
      </div>
    </div>
  );
}
