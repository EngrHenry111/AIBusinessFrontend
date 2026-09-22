// Tiny localStorage-backed wishlist, one per store slug. Mirrors cart.js.
// Store-customer accounts (a synced, cross-device wishlist) are a Phase 2
// feature — this is the honest Phase 1 version: it works, but only on this
// device/browser.
const key = (slug) => `bizly_store_wishlist_${slug}`;

export function readWishlist(slug) {
  try {
    const raw = localStorage.getItem(key(slug));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeWishlist(slug, ids) {
  try { localStorage.setItem(key(slug), JSON.stringify(ids)); } catch { /* ignore */ }
  return ids;
}

export function isWishlisted(slug, productId) {
  return readWishlist(slug).includes(productId);
}

export function toggleWishlist(slug, productId) {
  const list = readWishlist(slug);
  const next = list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId];
  return writeWishlist(slug, next);
}
