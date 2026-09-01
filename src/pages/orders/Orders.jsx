import { useState, useEffect } from 'react';
import { orderService } from '../../services';
import {
  RiAddLine, RiShoppingBagLine, RiDeleteBinLine, RiSearchLine,
  RiArrowDownSLine, RiArrowUpSLine, RiTruckLine, RiCheckLine,
  RiTimeLine, RiMapPinLine, RiLoader4Line, RiRobot2Line
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Orders.css';

const STATUS_COLORS = {
  pending:'neutral', confirmed:'info', processing:'warning',
  shipped:'info', delivered:'success', cancelled:'neutral', refunded:'warning'
};

const STATUS_STEPS = ['pending','confirmed','processing','shipped','delivered'];

const EMPTY_FORM = {
  customer: { name:'', email:'', phone:'' },
  items: [{ name:'', quantity:1, price:0, sku:'' }],
  shippingAddress: { street:'', city:'', state:'', country:'', zip:'' },
  trackingNumber:'', carrier:'', currency:'USD',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [trackingId, setTrackingId] = useState(null);

  useEffect(() => { loadOrders(); }, [statusFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const { data } = await orderService.getAll({ status: statusFilter || undefined, search: search || undefined });
      setOrders(data.data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }

  function updateItem(idx, field, value) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm(p => ({ ...p, items }));
  }

  const total = form.items.reduce((s,i) => s + (Number(i.quantity||0) * Number(i.price||0)), 0);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const { data } = await orderService.create({ ...form, total });
      setOrders(prev => [data.data, ...prev]);
      setShowForm(false); setForm(EMPTY_FORM);
      toast.success(`Order ${data.data.orderNumber} created`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleStatusChange(id, status) {
    try {
      const { data } = await orderService.update(id, { status });
      setOrders(prev => prev.map(o => o._id === id ? data.data : o));
      toast.success('Status updated');
    } catch { toast.error('Failed to update'); }
  }

  async function handleAddTracking(id, trackingNumber, carrier) {
    try {
      const { data } = await orderService.update(id, { trackingNumber, carrier });
      setOrders(prev => prev.map(o => o._id === id ? data.data : o));
      setTrackingId(null);
      toast.success('Tracking updated');
    } catch { toast.error('Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this order?')) return;
    try {
      await orderService.delete(id);
      setOrders(prev => prev.filter(o => o._id !== id));
      toast.success('Order deleted');
    } catch { toast.error('Failed'); }
  }

  const fmtMoney = (n, cur='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency:cur}).format(n||0);
  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  const currentStep = (status) => STATUS_STEPS.indexOf(status);

  return (
    <div className="orders-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>Orders</h1><p>{orders.length} orders · Track and manage customer orders</p></div>
          <button className="btn btn-primary" onClick={() => setShowForm(v=>!v)}><RiAddLine /> New Order</button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="orders-toolbar">
        <div className="search-bar">
          <RiSearchLine />
          <input placeholder="Search by order number or customer..." value={search}
            onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadOrders()} />
        </div>
        <div className="status-filters">
          {['','pending','confirmed','processing','shipped','delivered','cancelled'].map(s=>(
            <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}>
              {s===''?'All':s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>New Order</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid-3">
              <div className="form-group"><label className="form-label">Customer Name *</label>
                <input className="form-input" value={form.customer.name}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,name:e.target.value}}))} required /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.customer.email}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,email:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={form.customer.phone}
                  onChange={e=>setForm(p=>({...p,customer:{...p.customer,phone:e.target.value}}))} /></div>
            </div>

            <div style={{marginTop:16}}>
              <label className="form-label" style={{marginBottom:8,display:'block'}}>Order Items</label>
              <div className="order-items-header"><span>Item Name</span><span>SKU</span><span>Qty</span><span>Price</span><span></span></div>
              {form.items.map((item,idx)=>(
                <div key={idx} className="order-item-row">
                  <input className="form-input" placeholder="Item name" value={item.name}
                    onChange={e=>updateItem(idx,'name',e.target.value)} />
                  <input className="form-input" placeholder="SKU" value={item.sku}
                    onChange={e=>updateItem(idx,'sku',e.target.value)} />
                  <input className="form-input" type="number" min="1" value={item.quantity}
                    onChange={e=>updateItem(idx,'quantity',e.target.value)} />
                  <input className="form-input" type="number" min="0" step="0.01" value={item.price}
                    onChange={e=>updateItem(idx,'price',e.target.value)} />
                  {form.items.length>1 && (
                    <button type="button" className="btn btn-ghost btn-icon btn-sm"
                      onClick={()=>setForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))}>×</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" style={{marginTop:8}}
                onClick={()=>setForm(p=>({...p,items:[...p.items,{name:'',quantity:1,price:0,sku:''}]}))}>
                <RiAddLine /> Add Item
              </button>
              <div style={{textAlign:'right',marginTop:10,fontSize:15,color:'var(--text-secondary)'}}>
                Total: <strong>{fmtMoney(total, form.currency)}</strong>
              </div>
            </div>

            <div className="form-grid-2" style={{marginTop:16}}>
              <div className="form-group"><label className="form-label">Street Address</label>
                <input className="form-input" value={form.shippingAddress.street}
                  onChange={e=>setForm(p=>({...p,shippingAddress:{...p.shippingAddress,street:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">City</label>
                <input className="form-input" value={form.shippingAddress.city}
                  onChange={e=>setForm(p=>({...p,shippingAddress:{...p.shippingAddress,city:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">Country</label>
                <input className="form-input" value={form.shippingAddress.country}
                  onChange={e=>setForm(p=>({...p,shippingAddress:{...p.shippingAddress,country:e.target.value}}))} /></div>
              <div className="form-group"><label className="form-label">Currency</label>
                <select className="form-input form-select" value={form.currency}
                  onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  <option value="USD">USD</option><option value="EUR">EUR</option>
                  <option value="GBP">GBP</option><option value="NGN">NGN</option>
                </select></div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="submit" className="btn btn-primary">Create Order</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Orders List */}
      {loading ? Array(4).fill(0).map((_,i)=><div key={i} className="skeleton" style={{height:80,marginBottom:10,borderRadius:12}} />) :
      orders.length===0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiShoppingBagLine /></div>
          <h3>No orders yet</h3>
          <p>Create your first order to start tracking customer purchases.</p>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}><RiAddLine /> New Order</button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order._id} className="order-card card">
              <div className="order-header" onClick={()=>setExpanded(expanded===order._id?null:order._id)}>
                <div className="order-num">
                  <span className="order-number">{order.orderNumber}</span>
                  <span className="order-customer">{order.customer?.name}</span>
                </div>

                {/* Progress steps */}
                <div className="order-progress">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} className={`progress-step ${i<=currentStep(order.status)?'done':''} ${order.status==='cancelled'?'cancelled':''}`}>
                      <div className="step-dot">{i<currentStep(order.status)?<RiCheckLine />:i+1}</div>
                      <span className="step-label">{step.charAt(0).toUpperCase()+step.slice(1)}</span>
                      {i<STATUS_STEPS.length-1 && <div className="step-line" />}
                    </div>
                  ))}
                </div>

                <div className="order-meta">
                  <span className="order-total">{fmtMoney(order.total, order.currency)}</span>
                  {order.trackingNumber && <span className="tracking-num"><RiTruckLine /> {order.trackingNumber}</span>}
                </div>

                <div className="order-actions" onClick={e=>e.stopPropagation()}>
                  <select className="status-select" value={order.status}
                    onChange={e=>handleStatusChange(order._id,e.target.value)}>
                    {['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s=>(
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                  <span className={`badge badge-${STATUS_COLORS[order.status]||'neutral'}`}>{order.status}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(order._id)} title="Delete">
                    <RiDeleteBinLine />
                  </button>
                  {expanded===order._id?<RiArrowUpSLine />:<RiArrowDownSLine />}
                </div>
              </div>

              {expanded===order._id && (
                <div className="order-expanded">
                  {/* Items */}
                  {order.items?.length>0 && (
                    <div className="order-items-detail">
                      <h4>Items</h4>
                      <table className="table">
                        <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>
                          {order.items.map((item,i)=>(
                            <tr key={i}>
                              <td>{item.name}</td><td>{item.sku||'—'}</td>
                              <td>{item.quantity}</td>
                              <td>{fmtMoney(item.price,order.currency)}</td>
                              <td><strong>{fmtMoney(item.quantity*item.price,order.currency)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Shipping + Tracking */}
                  <div className="order-shipping">
                    {order.shippingAddress?.street && (
                      <div className="shipping-address">
                        <h4><RiMapPinLine /> Shipping Address</h4>
                        <p>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.country}</p>
                      </div>
                    )}

                    {trackingId===order._id ? (
                      <TrackingForm orderId={order._id} onSave={handleAddTracking} onCancel={()=>setTrackingId(null)} />
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={()=>setTrackingId(order._id)}>
                        <RiTruckLine /> {order.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
                      </button>
                    )}
                  </div>

                  {/* Timeline */}
                  {order.timeline?.length>0 && (
                    <div className="order-timeline">
                      <h4><RiTimeLine /> Timeline</h4>
                      <div className="timeline-list">
                        {[...order.timeline].reverse().map((entry,i)=>(
                          <div key={i} className="timeline-entry">
                            <div className="timeline-dot" />
                            <div className="timeline-content">
                              <span className="timeline-status">{entry.status}</span>
                              {entry.description && <span className="timeline-desc">{entry.description}</span>}
                              <span className="timeline-time">{fmt(entry.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackingForm({ orderId, onSave, onCancel }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  return (
    <div className="tracking-form">
      <input className="form-input" placeholder="Tracking number" value={trackingNumber}
        onChange={e=>setTrackingNumber(e.target.value)} />
      <input className="form-input" placeholder="Carrier (DHL, UPS, FedEx...)" value={carrier}
        onChange={e=>setCarrier(e.target.value)} />
      <div style={{display:'flex',gap:6}}>
        <button className="btn btn-primary btn-sm" onClick={()=>onSave(orderId,trackingNumber,carrier)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
