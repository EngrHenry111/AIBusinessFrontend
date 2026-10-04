export const PRACTICE_AREAS = {
  litigation: 'Litigation',
  corporate: 'Corporate',
  commercial: 'Commercial',
  property: 'Property / Real estate',
  family: 'Family',
  criminal: 'Criminal',
  employment: 'Employment',
  intellectual_property: 'Intellectual property',
  tax: 'Tax',
  banking_finance: 'Banking & finance',
  energy: 'Energy & natural resources',
  immigration: 'Immigration',
  arbitration: 'Arbitration / ADR',
  probate_estates: 'Probate & estates',
  regulatory: 'Regulatory & compliance',
  other: 'Other',
};

export const MATTER_STATUS = {
  open: { label: 'Open', badge: 'success' },
  pending: { label: 'Pending', badge: 'warning' },
  on_hold: { label: 'On hold', badge: 'neutral' },
  closed: { label: 'Closed', badge: 'info' },
};

export const BILLING_METHODS = {
  hourly: 'Hourly',
  flat_fee: 'Flat fee',
  contingency: 'Contingency',
  retainer: 'Retainer',
  pro_bono: 'Pro bono',
};

export const KEY_DATE_TYPES = {
  hearing: 'Hearing',
  filing_deadline: 'Filing deadline',
  limitation: 'Limitation date',
  judgment: 'Judgment',
  meeting: 'Meeting',
  other: 'Other',
};

export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

export function money(n, currency = 'NGN') {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

export const hours = (minutes) => `${(Number(minutes || 0) / 60).toFixed(2)}h`;

export function fmtDate(d, withTime = false) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(d) {
  const ms = new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function relativeDay(d) {
  const n = daysUntil(d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}
