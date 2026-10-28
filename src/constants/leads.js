// Lead sources. The last four are filled in automatically by the backend
// (utils/leadCapture) — they can't be picked by hand when adding a lead.
export const SOURCE_LABELS = {
  website: 'Website', referral: 'Referral', social: 'Social', email: 'Email',
  cold_call: 'Cold call', event: 'Event', other: 'Other',
  chat_widget: 'Website chat', whatsapp: 'WhatsApp', store: 'Online store', business_card: 'Business card',
};
export const MANUAL_SOURCES = ['website', 'referral', 'social', 'email', 'cold_call', 'event', 'other'];
export const AUTO_SOURCES = ['chat_widget', 'whatsapp', 'store', 'business_card'];
export const sourceLabel = (s) => SOURCE_LABELS[s] || SOURCE_LABELS.other;

export const formatMoney = (n, currency = 'NGN') => (currency === 'NGN'
  ? `₦${Number(n || 0).toLocaleString()}`
  : `${currency} ${Number(n || 0).toLocaleString()}`);
