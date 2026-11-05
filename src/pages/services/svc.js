// Helpers shared by the Laundry and Cleaning pages.

export const errText = (err, fallback) => err?.response?.data?.message
  || (err?.response?.status === 0 ? 'No connection. Check your internet and try again.' : fallback);

export function money(n, currency = 'NGN') {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
}

const TZ = 'Africa/Lagos';
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '');
export const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export const lagosDateOf = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
export const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00+01:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
};
// "2026-11-05" + "09:30" in Lagos time → ISO string.
export const lagosISO = (ymd, hm) => new Date(`${ymd}T${hm || '09:00'}:00+01:00`).toISOString();

// WhatsApp link to a Nigerian number (0803… → 234803…), or to no one.
export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) d = `234${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
export const telLink = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
export const mapLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const PAY_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'pos_terminal', label: 'POS' },
];
export const PAY_LABEL = { cash: 'Cash', transfer: 'Transfer', pos_terminal: 'POS' };
export const MANAGERS = ['company_owner', 'manager', 'super_admin'];
