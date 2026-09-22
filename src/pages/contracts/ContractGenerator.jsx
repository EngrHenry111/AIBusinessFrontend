import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { contractService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import CustomerPicker from '../customers/CustomerPicker';
import toast from 'react-hot-toast';
import {
  RiFileList3Line, RiUserSettingsLine, RiFileShieldLine, RiStore2Line, RiComputerLine,
  RiShakeHandsLine, RiHomeLine, RiArchiveLine, RiBriefcase4Line, RiMoneyDollarBoxLine, RiEditLine,
  RiArrowLeftLine, RiArrowRightLine, RiRobot2Line, RiRefreshLine, RiSaveLine, RiMailSendLine,
  RiDownloadLine, RiAddLine, RiCloseLine, RiCheckLine,
} from 'react-icons/ri';
import './Contracts.css';

const TYPES = [
  { value: 'service_agreement', label: 'Service Agreement', icon: RiFileList3Line, roles: ['Service Provider', 'Client'] },
  { value: 'employment', label: 'Employment Contract', icon: RiUserSettingsLine, roles: ['Employer', 'Employee'] },
  { value: 'nda', label: 'NDA (Non-Disclosure)', icon: RiFileShieldLine, roles: ['Disclosing Party', 'Receiving Party'] },
  { value: 'vendor', label: 'Vendor Agreement', icon: RiStore2Line, roles: ['Company', 'Vendor'] },
  { value: 'freelance', label: 'Freelance Contract', icon: RiComputerLine, roles: ['Client', 'Freelancer'] },
  { value: 'partnership', label: 'Partnership Agreement', icon: RiShakeHandsLine, roles: ['Company', 'Partner'] },
  { value: 'lease', label: 'Lease Agreement', icon: RiHomeLine, roles: ['Landlord', 'Tenant'] },
  { value: 'sale_of_goods', label: 'Sale of Goods', icon: RiArchiveLine, roles: ['Seller', 'Buyer'] },
  { value: 'consulting', label: 'Consulting Agreement', icon: RiBriefcase4Line, roles: ['Company', 'Consultant'] },
  { value: 'retainer', label: 'Retainer Agreement', icon: RiMoneyDollarBoxLine, roles: ['Company', 'Client'] },
  { value: 'custom', label: 'Custom Contract', icon: RiEditLine, roles: ['Party 1', 'Party 2'] },
];
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'XOF', 'CAD', 'AUD'];
const STEPS = ['Contract Type', 'Parties', 'Terms', 'Generate', 'Review & Save'];

const EMPTY_PARTY2 = { name: '', email: '', phone: '', address: '', role: '' };
const EMPTY_TERMS = { startDate: '', endDate: '', value: '', currency: 'NGN', paymentTerms: '', deliverables: '', governingLaw: 'Federal Republic of Nigeria' };

export default function ContractGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};
  const { company } = useAuth();

  const [step, setStep] = useState(0);
  const [type, setType] = useState('');
  const [party1Role, setParty1Role] = useState('');
  const [party2, setParty2] = useState({ ...EMPTY_PARTY2, ...prefill.party2 });
  const [terms, setTerms] = useState({ ...EMPTY_TERMS, ...prefill.terms });
  const [customClauses, setCustomClauses] = useState(['']);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  const party1 = useMemo(() => ({
    name: company?.companyName || 'Your Business',
    address: company?.profile?.address || '',
    email: company?.profile?.email || '',
    phone: company?.profile?.phone || '',
    role: party1Role,
  }), [company, party1Role]);

  function selectType(t) {
    setType(t.value);
    setParty1Role(t.roles[0]);
    setParty2((p) => ({ ...p, role: p.role || t.roles[1] }));
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  function updateClause(i, val) {
    setCustomClauses((c) => c.map((v, idx) => (idx === i ? val : v)));
  }
  function addClause() { setCustomClauses((c) => [...c, '']); }
  function removeClause(i) { setCustomClauses((c) => c.filter((_, idx) => idx !== i)); }

  async function runGenerate({ replacePrevious = false } = {}) {
    setGenerating(true);
    try {
      const payload = {
        title: title || undefined,
        type,
        parties: { party1, party2 },
        terms: { ...terms, value: terms.value ? Number(terms.value) : undefined },
        customClauses: customClauses.filter((c) => c.trim()),
        linkedInvoiceId: prefill.linkedInvoiceId,
        linkedLeadId: prefill.linkedLeadId,
      };
      const { data } = await contractService.generate(payload);

      if (replacePrevious && contract?._id && contract.status === 'draft') {
        contractService.delete(contract._id).catch(() => {});
      }

      setContract(data.data);
      setContent(data.data.content);
      setTitle(data.data.title);
      setStep(3);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not generate contract');
    } finally {
      setGenerating(false);
    }
  }

  async function persistEdits() {
    if (!contract) return null;
    const { data } = await contractService.update(contract._id, { title, content });
    setContract(data.data);
    return data.data;
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await persistEdits();
      toast.success('Saved as draft');
      navigate(`/contracts/${contract._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendToClient() {
    if (!party2.email) return toast.error('Party 2 needs an email address to send the contract.');
    setSaving(true);
    try {
      await persistEdits();
      await contractService.send(contract._id);
      toast.success(`Contract sent to ${party2.email}`);
      navigate(`/contracts/${contract._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send contract');
    } finally {
      setSaving(false);
    }
  }

  const canNextFromParties = party2.name.trim().length > 0;
  const canNextFromTerms = true;

  return (
    <div className="contracts-page fade-in">
      <div className="page-header">
        <h1><RiRobot2Line style={{ verticalAlign: '-3px' }} /> Generate Contract</h1>
        <p>AI drafts a complete, professional contract — you review and refine before sending.</p>
      </div>

      <div className="setup-steps" style={{ maxWidth: 720, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`setup-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span>{i < step ? <RiCheckLine /> : i + 1}</span>
            <label>{s}</label>
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 0 && (
        <div className="card card-pad">
          <h3>Choose a contract type</h3>
          <div className="contract-type-grid">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.value} type="button" className={`contract-type-card ${type === t.value ? 'active' : ''}`} onClick={() => selectType(t)}>
                  <Icon />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="setup-nav">
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={!type} onClick={() => setStep(1)}>Next <RiArrowRightLine /></button>
          </div>
        </div>
      )}

      {/* Step 2: Parties */}
      {step === 1 && (
        <div className="card card-pad">
          <h3>Parties</h3>
          <div className="contract-parties-grid">
            <div>
              <h4>Party 1 — Your Business</h4>
              <p className="contract-hint">Pulled from your company profile.</p>
              <label className="ce-field"><span>Name</span><input className="form-input" value={party1.name} disabled /></label>
              <label className="ce-field"><span>Address</span><input className="form-input" value={party1.address} disabled placeholder="Add an address in Settings > Company" /></label>
              <label className="ce-field"><span>Role in this contract</span><input className="form-input" value={party1Role} onChange={(e) => setParty1Role(e.target.value)} /></label>
            </div>
            <div>
              <h4>Party 2 — Other Party</h4>
              <CustomerPicker onSelect={(c) => setParty2((p) => ({ ...p, ...c }))} placeholder="Search existing customers…" />
              <label className="ce-field"><span>Name *</span><input className="form-input" value={party2.name} onChange={(e) => setParty2((p) => ({ ...p, name: e.target.value }))} /></label>
              <label className="ce-field"><span>Email</span><input className="form-input" type="email" value={party2.email} onChange={(e) => setParty2((p) => ({ ...p, email: e.target.value }))} /></label>
              <label className="ce-field"><span>Phone</span><input className="form-input" value={party2.phone} onChange={(e) => setParty2((p) => ({ ...p, phone: e.target.value }))} /></label>
              <label className="ce-field"><span>Address</span><input className="form-input" value={party2.address} onChange={(e) => setParty2((p) => ({ ...p, address: e.target.value }))} /></label>
              <label className="ce-field"><span>Role in this contract</span><input className="form-input" value={party2.role} onChange={(e) => setParty2((p) => ({ ...p, role: e.target.value }))} /></label>
            </div>
          </div>
          <div className="setup-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}><RiArrowLeftLine /> Back</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={!canNextFromParties} onClick={() => setStep(2)}>Next <RiArrowRightLine /></button>
          </div>
        </div>
      )}

      {/* Step 3: Terms */}
      {step === 2 && (
        <div className="card card-pad">
          <h3>Contract Terms</h3>
          <div className="form-grid-2">
            <label className="ce-field"><span>Start Date</span><input className="form-input" type="date" value={terms.startDate} onChange={(e) => setTerms((t) => ({ ...t, startDate: e.target.value }))} /></label>
            <label className="ce-field"><span>End Date</span><input className="form-input" type="date" value={terms.endDate} onChange={(e) => setTerms((t) => ({ ...t, endDate: e.target.value }))} /></label>
            <label className="ce-field"><span>Contract Value</span><input className="form-input" type="number" min="0" value={terms.value} onChange={(e) => setTerms((t) => ({ ...t, value: e.target.value }))} /></label>
            <label className="ce-field"><span>Currency</span>
              <select className="form-input form-select" value={terms.currency} onChange={(e) => setTerms((t) => ({ ...t, currency: e.target.value }))}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label className="ce-field"><span>Payment Terms</span><textarea className="form-input form-textarea" rows={2} value={terms.paymentTerms} onChange={(e) => setTerms((t) => ({ ...t, paymentTerms: e.target.value }))} placeholder="e.g. 50% upfront, 50% on delivery" /></label>
          <label className="ce-field"><span>Deliverables / Scope</span><textarea className="form-input form-textarea" rows={3} value={terms.deliverables} onChange={(e) => setTerms((t) => ({ ...t, deliverables: e.target.value }))} placeholder="What's being delivered under this contract" /></label>
          <label className="ce-field"><span>Governing Law</span><input className="form-input" value={terms.governingLaw} onChange={(e) => setTerms((t) => ({ ...t, governingLaw: e.target.value }))} /></label>

          <div className="ce-field" style={{ marginTop: 8 }}>
            <span>Custom Clauses</span>
            {customClauses.map((c, i) => (
              <div key={i} className="contract-clause-row">
                <input className="form-input" value={c} onChange={(e) => updateClause(i, e.target.value)} placeholder="e.g. Either party may terminate with 30 days' notice" />
                {customClauses.length > 1 && <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeClause(i)}><RiCloseLine /></button>}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addClause} style={{ marginTop: 6 }}><RiAddLine /> Add Clause</button>
          </div>

          <div className="setup-nav">
            <button className="btn btn-secondary" onClick={() => setStep(1)}><RiArrowLeftLine /> Back</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={!canNextFromTerms || generating} onClick={() => runGenerate()}>
              {generating ? 'AI is drafting your contract…' : <>Generate Contract with AI <RiRobot2Line /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generated — edit */}
      {step === 3 && contract && (
        <div className="card card-pad">
          <div className="contract-editor-header">
            <h3>Review &amp; Edit</h3>
            <span className="contract-hint">{wordCount} words</span>
          </div>
          <label className="ce-field"><span>Title</span><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <textarea className="contract-editor" value={content} onChange={(e) => setContent(e.target.value)} rows={22} />
          <div className="setup-nav">
            <button className="btn btn-secondary" onClick={() => setStep(2)}><RiArrowLeftLine /> Back to Terms</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" disabled={generating} onClick={() => runGenerate({ replacePrevious: true })}>
              <RiRefreshLine /> {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Next <RiArrowRightLine /></button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Save */}
      {step === 4 && contract && (
        <div className="card card-pad">
          <h3>Final Review</h3>
          <div className="contract-preview">
            <h4>{title}</h4>
            <pre>{content}</pre>
          </div>
          <div className="setup-nav">
            <button className="btn btn-secondary" onClick={() => setStep(3)}><RiArrowLeftLine /> Back to Edit</button>
            <div style={{ flex: 1 }} />
            <a className="btn btn-secondary" href={contractService.getPDF(contract._id)} target="_blank" rel="noreferrer"><RiDownloadLine /> Download PDF</a>
            <button className="btn btn-secondary" disabled={saving} onClick={handleSaveDraft}><RiSaveLine /> Save as Draft</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSendToClient}><RiMailSendLine /> Send to Client</button>
          </div>
        </div>
      )}
    </div>
  );
}
