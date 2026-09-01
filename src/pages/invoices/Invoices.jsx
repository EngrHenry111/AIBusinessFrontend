import { useState, useEffect } from 'react';
import { invoiceService } from '../../services';
import {
  RiAddLine, RiMoneyDollarCircleLine, RiRobot2Line, RiDeleteBinLine,
  RiCalendarLine, RiLoader4Line, RiArrowDownSLine, RiArrowUpSLine,
  RiMailLine, RiAlertLine, RiCheckLine, RiTimeLine, RiDownloadLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Invoices.css';

const STATUS_COLORS = {
  draft:'neutral', sent:'info', viewed:'info', partial:'warning',
  paid:'success', overdue:'danger', cancelled:'neutral'
};

const EMPTY_FORM = {
  customer: { name:'', email:'', phone:'', address:'' },
  items: [{ description:'', quantity:1, unitPrice:0, total:0 }],
  dueAt:'', notes:'', currency:'USD',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);
  const [draftingReminder, setDraftingReminder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadInvoices(); }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const { data } = await invoiceService.getAll({ status: statusFilter || undefined });
      setInvoices(data.data);
      setStats(data.stats || []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }

  function updateItem(idx, field, value) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[idx].total = (Number(items[idx].quantity) * Number(items[idx].unitPrice));
    }
    setForm(p => ({ ...p, items }));
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { description:'', quantity:1, unitPrice:0, total:0 }] }));
  }

  function removeItem(idx) {
    setForm(p => ({ ...p, items: p.items.filter((_,i) => i !== idx) }));
  }

  const subtotal = form.items.reduce((s, i) => s + Number(i.total || 0), 0);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await invoiceService.create({
        ...form,
        subtotal,
        total: subtotal,
      });
      setInvoices(prev => [data.data, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success(`Invoice ${data.data.invoiceNumber} created`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleStatusChange(id, status) {
    try {
      const { data } = await invoiceService.update(id, { status });
      setInvoices(prev => prev.map(inv => inv._id === id ? data.data : inv));
    } catch { toast.error('Failed to update'); }
  }

  async function handleDraftReminder(inv) {
    setDraftingReminder(inv._id);
    try {
      const { data } = await invoiceService.draftReminder(inv._id);
      setInvoices(prev => prev.map(i => i._id === inv._id ? data.data.invoice : i));
      setExpanded(inv._id);
      toast.success('AI reminder drafted');
    } catch { toast.error('Failed to draft reminder'); }
    finally { setDraftingReminder(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice?')) return;
    try {
      await invoiceService.delete(id);
      setInvoices(prev => prev.filter(i => i._id !== id));
      toast.success('Invoice deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const fmtMoney = (n, cur='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency:cur}).format(n||0);

  const daysOverdue = (dueAt) => {
    const diff = Math.floor((Date.now() - new Date(dueAt)) / (1000*60*60*24));
    return diff;
  };

  const totalOutstanding = invoices
    .filter(i => ['sent','viewed','partial','overdue'].includes(i.status))
    .reduce((s,i) => s + (i.total||0), 0);
  const totalPaid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.total||0),0);

  return (
    <div className="invoices-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Invoices</h1><p>{invoices.length} invoices · AI-powered payment reminders</p></div>
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}><RiAddLine /> New Invoice</button>
        </div>
      </div>

      {/* Stats */}
      <div className="invoice-stats">
        <div className="invoice-stat-card">
          <span className="stat-label">Outstanding</span>
          <span className="stat-value danger">{fmtMoney(totalOutstanding)}</span>
        </div>
        <div className="invoice-stat-card">
          <span className="stat-label">Paid</span>
          <span className="stat-value success">{fmtMoney(totalPaid)}</span>
        </div>
        <div className="invoice-stat-card">
          <span className="stat-label">Total Invoices</span>
          <span className="stat-value">{invoices.length}</span>
        </div>
        <div className="invoice-stat-card">
          <span className="stat-label">Overdue</span>
          <span className="stat-value danger">
            {invoices.filter(i=>i.status==='overdue'||(['sent','viewed'].includes(i.status)&&new Date(i.dueAt)<new Date())).length}
          </span>
        </div>
      </div>

      {/* Status filter */}
      <div className="status-filters">
        {['','draft','sent','viewed','partial','paid','overdue','cancelled'].map(s => (
          <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}>
            {s===''?'All':s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>New Invoice</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Customer Name *</label>
                <input className="form-input" value={form.customer.name}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,name:e.target.value}}))} required /></div>
              <div className="form-group"><label className="form-label">Customer Email</label>
                <input className="form-input" type="email" value={form.customer.email}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,email:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">Due Date *</label>
                <input className="form-input" type="date" value={form.dueAt}
                  onChange={e=>setForm(p=>({...p,dueAt:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Currency</label>
                <select className="form-input form-select" value={form.currency}
                  onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  <option value="USD">USD</option><option value="EUR">EUR</option>
                  <option value="GBP">GBP</option><option value="NGN">NGN</option>
                </select></div>
            </div>

            {/* Line Items */}
            <div style={{marginTop:16}}>
              <label className="form-label" style={{marginBottom:8,display:'block'}}>Line Items</label>
              <div className="items-table">
                <div className="items-header">
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span><span></span>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <input className="form-input" placeholder="Description" value={item.description}
                      onChange={e=>updateItem(idx,'description',e.target.value)} />
                    <input className="form-input" type="number" min="1" value={item.quantity}
                      onChange={e=>updateItem(idx,'quantity',e.target.value)} />
                    <input className="form-input" type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={e=>updateItem(idx,'unitPrice',e.target.value)} />
                    <span className="item-total">{fmtMoney(item.total, form.currency)}</span>
                    {form.items.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={()=>removeItem(idx)}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} style={{marginTop:8}}>
                <RiAddLine /> Add Item
              </button>
              <div className="invoice-subtotal">
                Total: <strong>{fmtMoney(subtotal, form.currency)}</strong>
              </div>
            </div>

            <div className="form-group" style={{marginTop:12}}>
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Payment terms, bank details..." />
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="submit" className="btn btn-primary">Create Invoice</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice List */}
      {loading ? Array(4).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:76,marginBottom:10,borderRadius:12}} />) :
      invoices.length===0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiMoneyDollarCircleLine /></div>
          <h3>No invoices yet</h3>
          <p>Create your first invoice to start tracking payments.</p>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}><RiAddLine /> New Invoice</button>
        </div>
      ) : (
        <div className="invoices-list">
          {invoices.map(inv => {
            const overdue = ['sent','viewed','partial'].includes(inv.status) && new Date(inv.dueAt) < new Date();
            const days = overdue ? daysOverdue(inv.dueAt) : 0;
            return (
              <div key={inv._id} className={`invoice-card card ${overdue?'overdue-card':''}`}>
                <div className="invoice-header" onClick={()=>setExpanded(expanded===inv._id?null:inv._id)}>
                  <div className="invoice-num">
                    <span className="inv-number">{inv.invoiceNumber}</span>
                    <span className="inv-customer">{inv.customer?.name}</span>
                  </div>
                  <div className="invoice-dates">
                    <span><RiCalendarLine /> Due: {fmt(inv.dueAt)}</span>
                    {overdue && <span className="overdue-tag"><RiAlertLine /> {days}d overdue</span>}
                  </div>
                  <div className="invoice-amount">{fmtMoney(inv.total, inv.currency)}</div>
                  <div className="invoice-actions" onClick={e=>e.stopPropagation()}>
                    <select className="status-select" value={inv.status}
                      onChange={e=>handleStatusChange(inv._id,e.target.value)}>
                      {['draft','sent','viewed','partial','paid','overdue','cancelled'].map(s=>(
                        <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                      ))}
                    </select>
                    <span className={`badge badge-${STATUS_COLORS[inv.status]||'neutral'}`}>{inv.status}</span>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={()=>handleDraftReminder(inv)} disabled={draftingReminder===inv._id} title="AI Draft Reminder">
                      {draftingReminder===inv._id ? <RiLoader4Line className="spin" /> : <RiRobot2Line />}
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(inv._id)} title="Delete">
                      <RiDeleteBinLine />
                    </button>
                    {expanded===inv._id ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                  </div>
                </div>

                {expanded===inv._id && (
                  <div className="invoice-expanded">
                    {/* Line items */}
                    {inv.items?.length > 0 && (
                      <div className="inv-items">
                        <h4>Line Items</h4>
                        <table className="table">
                          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                          <tbody>
                            {inv.items.map((item,i)=>(
                              <tr key={i}>
                                <td>{item.description}</td>
                                <td>{item.quantity}</td>
                                <td>{fmtMoney(item.unitPrice, inv.currency)}</td>
                                <td><strong>{fmtMoney(item.total, inv.currency)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="inv-total-row">
                          <span>Total</span>
                          <strong>{fmtMoney(inv.total, inv.currency)}</strong>
                        </div>
                      </div>
                    )}

                    {inv.notes && <p className="inv-notes">{inv.notes}</p>}

                    {/* AI Reminder */}
                    {inv.ai?.reminderDraft && (
                      <div className="ai-reminder">
                        <div className="ai-reminder-header">
                          <RiRobot2Line /><span>AI Payment Reminder Draft</span>
                          <span className="reminder-hint">Copy and send via email</span>
                        </div>
                        <pre className="reminder-text">{inv.ai.reminderDraft}</pre>
                      </div>
                    )}

                    {!inv.ai?.reminderDraft && (
                      <button className={`btn btn-secondary btn-sm ${draftingReminder===inv._id?'btn-loading':''}`}
                        onClick={()=>handleDraftReminder(inv)} disabled={draftingReminder===inv._id}>
                        {!draftingReminder && <><RiRobot2Line /> Draft AI Payment Reminder</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
