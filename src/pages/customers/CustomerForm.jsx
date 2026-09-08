import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../../services';
import { RiArrowLeftLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Customers.css';

const EMPTY = {
  name: '', email: '', phone: '', company: '',
  address: '', city: '', state: '',
  type: 'individual', status: 'active', tags: '', notes: '',
};

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    customerService.getOne(id).then(({ data }) => {
      const c = data.data;
      setForm({
        name: c.name || '', email: c.email || '', phone: c.phone || '', company: c.company || '',
        address: c.address || '', city: c.city || '', state: c.state || '',
        type: c.type || 'individual', status: c.status || 'active',
        tags: (c.tags || []).join(', '), notes: c.notes || '',
      });
    }).catch(() => {
      toast.error('Customer not found');
      navigate('/customers');
    }).finally(() => setLoading(false));
  }, [id, editing, navigate]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!form.name.trim()) return toast.error('Customer name is required');
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags };
      const res = editing
        ? await customerService.update(id, payload)
        : await customerService.create(payload);
      toast.success(editing ? 'Customer updated' : 'Customer created');
      navigate(`/customers/${res.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 14, margin: 16 }} />;

  return (
    <div className="customers-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customers')}>
          <RiArrowLeftLine /> Back to customers
        </button>
        <h1>{editing ? 'Edit Customer' : 'Add Customer'}</h1>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="form-input" value={form.company} onChange={(e) => set('company', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={(e) => set('state', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. vip, wholesale" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-input" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save Customer'}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/customers')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
