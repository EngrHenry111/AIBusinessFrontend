// Lead sources. The last four are filled in automatically by the backend
// (utils/leadCapture) — they can't be picked by hand when adding a lead.
export const SOURCE_LABELS = {
  website: 'Website', referral: 'Referral', social: 'Social', email: 'Email',
  cold_call: 'Cold call', event: 'Event', other: 'Other',
  chat_widget: 'Website chat', whatsapp: 'WhatsApp', telegram: 'Telegram', store: 'Online store', business_card: 'Business card',
};
export const MANUAL_SOURCES = ['website', 'referral', 'social', 'email', 'cold_call', 'event', 'other'];
export const AUTO_SOURCES = ['chat_widget', 'whatsapp', 'telegram', 'store', 'business_card'];
export const sourceLabel = (s) => SOURCE_LABELS[s] || SOURCE_LABELS.other;

// Pipeline stages in the words a shop owner uses. (Stored values stay the same.)
export const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
export const STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Interested', proposal: 'Proposal sent',
  negotiation: 'Ready to buy', won: 'Won', lost: 'Lost', converted: 'Converted',
};
export const stageLabel = (s) => STAGE_LABELS[s] || s;
// What the AI read from a chat (Conversation.sales.stage).
export const BUYING_SIGNAL = {
  browsing: 'Just browsing', interested: 'Interested', ready_to_buy: 'Ready to buy',
  ordered: 'Says they ordered', not_interested: 'Not interested', support: 'Needs help with an order',
};

export const formatMoney = (n, currency = 'NGN') => (currency === 'NGN'
  ? `₦${Number(n || 0).toLocaleString()}`
  : `${currency} ${Number(n || 0).toLocaleString()}`);
