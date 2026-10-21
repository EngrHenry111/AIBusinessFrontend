export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

// ₦1.25B / ₦345.8M / ₦92.4K — for tiles and chart axes.
export const nairaShort = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}₦${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}₦${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}₦${(a / 1e3).toFixed(1)}K`;
  return `${sign}₦${Math.round(a)}`;
};

export const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—');
export const fmtDateTime = (d) => (d
  ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');
export const todayYmd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

export const LINE_LABELS = {
  filling_station: 'Filling Stations',
  building_materials: 'Building Materials',
  general: 'Other Businesses',
};
export const LINE_SHORT = { filling_station: 'Fuel', building_materials: 'Building', general: 'General' };
export const LINE_COLORS = { filling_station: '#f59e0b', building_materials: '#6366f1', general: '#10b981' };

export const STATUS_META = {
  draft: { label: 'Draft', badge: 'neutral' },
  pending_branch: { label: 'Awaiting Branch Manager', badge: 'warning' },
  pending_owner: { label: 'Awaiting Owner', badge: 'info' },
  approved: { label: 'Approved', badge: 'success' },
  rejected: { label: 'Sent Back', badge: 'danger' },
};

export const isOwner = (user) => ['company_owner', 'super_admin'].includes(user?.role);

// Nigerian industry codes, with the everyday name alongside.
export const FUEL_LABELS = {
  PMS: 'PMS (Petrol)',
  AGO: 'AGO (Diesel)',
  DPK: 'DPK (Kerosene)',
  LPG: 'LPG (Cooking Gas)',
};
export const fuelLabel = (code) => FUEL_LABELS[code] || code;
