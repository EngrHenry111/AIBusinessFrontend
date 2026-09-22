// Store-customer session token, one per store slug — a shopper can be
// logged into several different stores' accounts at once in the same
// browser. Mirrors cart.js/wishlist.js's per-slug localStorage convention.
const key = (slug) => `bizly_store_token_${slug}`;

export function getStoreToken(slug) {
  try { return localStorage.getItem(key(slug)); } catch { return null; }
}

export function setStoreToken(slug, token) {
  try { localStorage.setItem(key(slug), token); } catch { /* private mode / quota — ignore */ }
}

export function clearStoreToken(slug) {
  try { localStorage.removeItem(key(slug)); } catch { /* ignore */ }
}
