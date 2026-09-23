// A persistent per-store session id, used to key an abandoned cart so it can
// be recovered later via a "?recover=<id>" link — same localStorage pattern
// as cart.js/storeAuth.js, just keyed by session instead of cart contents.
const key = (slug) => `bizly_cart_session_${slug}`;

export function getCartSessionId(slug) {
  try {
    let id = localStorage.getItem(key(slug));
    if (!id) {
      id = `cs_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
      localStorage.setItem(key(slug), id);
    }
    return id;
  } catch {
    return `cs_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
  }
}
