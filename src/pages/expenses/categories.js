import {
  RiHome4Line, RiTeamLine, RiFlashlightLine, RiArchiveLine, RiMegaphoneLine,
  RiCarLine, RiToolsLine, RiHammerLine, RiGovernmentLine, RiShieldCheckLine,
  RiCodeSSlashLine, RiRestaurantLine, RiFilmLine, RiMoreLine,
} from 'react-icons/ri';

export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent', icon: RiHome4Line },
  { key: 'salaries', label: 'Salaries', icon: RiTeamLine },
  { key: 'utilities', label: 'Utilities', icon: RiFlashlightLine },
  { key: 'supplies', label: 'Supplies', icon: RiArchiveLine },
  { key: 'marketing', label: 'Marketing', icon: RiMegaphoneLine },
  { key: 'transport', label: 'Transport', icon: RiCarLine },
  { key: 'equipment', label: 'Equipment', icon: RiToolsLine },
  { key: 'maintenance', label: 'Maintenance', icon: RiHammerLine },
  { key: 'taxes', label: 'Taxes', icon: RiGovernmentLine },
  { key: 'insurance', label: 'Insurance', icon: RiShieldCheckLine },
  { key: 'software', label: 'Software', icon: RiCodeSSlashLine },
  { key: 'food', label: 'Food', icon: RiRestaurantLine },
  { key: 'entertainment', label: 'Entertainment', icon: RiFilmLine },
  { key: 'other', label: 'Other', icon: RiMoreLine },
];

export const CATEGORY_MAP = EXPENSE_CATEGORIES.reduce((a, c) => { a[c.key] = c; return a; }, {});

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'card', label: 'Card' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'other', label: 'Other' },
];

export const naira = (n) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
