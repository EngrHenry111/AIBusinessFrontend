import { useState, useEffect } from 'react';
import { payrollService, paymentSettingsService } from '../../services';
import { RiCloseLine, RiCheckLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

const EMPTY = {
  name: '', email: '', phone: '', role: '', department: '',
  grossSalary: '', taxRate: 7.5, pensionRate: 8, otherDeduction: 0,
  bankCode: '', bankName: '', accountNumber: '', accountName: '',
  startDate: new Date().toISOString().slice(0, 10),
};

export default function StaffForm({ staff, onClose, onSaved }) {
  const isEdit = Boolean(staff);
  const [form, setForm] = useState(() => (staff ? {
    name: staff.name || '', email: staff.email || '', phone: staff.phone || '', role: staff.role || '', department: staff.department || '',
    grossSalary: staff.grossSalary || '', taxRate: staff.taxRate ?? 7.5, pensionRate: staff.pensionRate ?? 8,
    otherDeduction: staff.otherDeduction || 0, bankCode: staff.bankCode || '', bankName: staff.bankName || '',
    accountNumber: staff.accountNumber || '', accountName: staff.accountName || '',
    startDate: staff.startDate ? staff.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  } : EMPTY));
  const [banks, setBanks] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paymentSettingsService.getBanks().then(({ data }) => setBanks(data.data)).catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function verifyAccount() {
    if (!/^\d{10}$/.test(form.accountNumber) || !form.bankCode) {
      toast.error('Select a bank and enter a 10-digit account number');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await paymentSettingsService.verifyAccount({ accountNumber: form.accountNumber, bankCode: form.bankCode });
      const bank = banks.find((b) => b.code === form.bankCode);
      setForm((f) => ({ ...f, accountName: data.data.accountName, bankName: bank?.name || f.bankName }));
      toast.success('Account verified');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not verify that account');
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Staff name is required'); return; }
    if (!(Number(form.grossSalary) > 0)) { toast.error('Enter a gross salary'); return; }
    setSaving(true);
    try {
      const payload = { ...form, grossSalary: Number(form.grossSalary), taxRate: Number(form.taxRate), pensionRate: Number(form.pensionRate), otherDeduction: Number(form.otherDeduction) || 0 };
      if (isEdit) await payrollService.updateStaff(staff._id, payload);
      else await payrollService.addStaff(payload);
      toast.success(isEdit ? 'Staff updated' : 'Staff added to payroll');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  }

  const gross = Number(form.grossSalary) || 0;
  const tax = Math.round(gross * (Number(form.taxRate) || 0) / 100);
  const pension = Math.round(gross * (Number(form.pensionRate) || 0) / 100);
  const other = Number(form.otherDeduction) || 0;
  const net = gross - tax - pension - other;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Staff' : 'Add Staff'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Staff name *</label>
                <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone <span className="pr-hint">(for payslip SMS)</span></label>
                <input className="form-input" type="tel" placeholder="e.g. 08012345678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Role / Position</label>
                <input className="form-input" value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Sales Manager" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Sales" />
              </div>
              <div className="form-group">
                <label className="form-label">Gross salary (₦) *</label>
                <input className="form-input" type="number" min="0" value={form.grossSalary} onChange={(e) => set('grossSalary', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Start date</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tax rate % <span className="pr-hint">(PAYE, default 7.5%)</span></label>
                <input className="form-input" type="number" step="0.1" min="0" max="100" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pension rate % <span className="pr-hint">(PenCom, default 8%)</span></label>
                <input className="form-input" type="number" step="0.1" min="0" max="100" value={form.pensionRate} onChange={(e) => set('pensionRate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Other deductions (₦) <span className="pr-hint">(loan, NHF, etc.)</span></label>
                <input className="form-input" type="number" min="0" value={form.otherDeduction} onChange={(e) => set('otherDeduction', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bank</label>
              <select className="form-input form-select" value={form.bankCode}
                onChange={(e) => { set('bankCode', e.target.value); set('accountName', ''); }}>
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Account number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" inputMode="numeric" maxLength={10} value={form.accountNumber}
                  onChange={(e) => { set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10)); set('accountName', ''); }}
                  placeholder="e.g. 0123456789" />
                <button type="button" className="btn btn-secondary" disabled={verifying} onClick={verifyAccount}>
                  {verifying ? 'Checking…' : 'Verify'}
                </button>
              </div>
              {form.accountName && (
                <div className="ss-status ok" style={{ marginTop: 6 }}><RiCheckLine /> {form.accountName}</div>
              )}
            </div>

            <div className="pr-preview">
              <div className="pr-preview-row"><span>Gross Salary</span><strong>{naira(gross)}</strong></div>
              <div className="pr-preview-row deduction"><span>Tax ({form.taxRate || 0}%)</span><span>-{naira(tax)}</span></div>
              <div className="pr-preview-row deduction"><span>Pension ({form.pensionRate || 0}%)</span><span>-{naira(pension)}</span></div>
              {other > 0 && <div className="pr-preview-row deduction"><span>Other Deductions</span><span>-{naira(other)}</span></div>}
              <div className="pr-preview-row total"><span>Net Salary</span><strong>{naira(net)}</strong></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
