// The referral code from a ?ref= link, kept for 60 days so it still counts
// if the visitor signs up later or with Google instead of the form.
const KEY = 'bizly_ref';
const TTL = 60 * 24 * 60 * 60 * 1000;

const clean = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

export function rememberReferralCode(code) {
  const value = clean(code);
  if (!value) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: value, at: Date.now() })); } catch { /* storage blocked */ }
}

export function peekReferralCode() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.code && Date.now() - saved.at < TTL) return saved.code;
  } catch { /* storage blocked or bad JSON */ }
  return '';
}

export function takeReferralCode() {
  const code = peekReferralCode();
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  return code;
}
