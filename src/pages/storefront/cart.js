// Tiny localStorage-backed cart, one per store slug.
const key = (slug) => `bizly_store_cart_${slug}`;

export function readCart(slug) {
  try {
    const raw = localStorage.getItem(key(slug));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function writeCart(slug, items) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(items));
  } catch { /* private mode / quota — ignore */ }
  return items;
}

export function clearCart(slug) {
  try { localStorage.removeItem(key(slug)); } catch { /* ignore */ }
}

export function cartCount(items) {
  return items.reduce((n, i) => n + (i.quantity || 0), 0);
}

export function cartTotal(items) {
  return items.reduce((n, i) => n + (i.price || 0) * (i.quantity || 0), 0);
}

export function addToCart(slug, product, qty = 1) {
  const items = readCart(slug);
  const idx = items.findIndex((i) => i.productId === product._id);
  const max = product.stock?.trackStock && !product.stock?.allowOutOfStock
    ? product.stock.quantity
    : Infinity;
  if (idx >= 0) {
    items[idx].quantity = Math.min(max, items[idx].quantity + qty);
  } else {
    items.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || null,
      quantity: Math.min(max, qty),
      max: Number.isFinite(max) ? max : null,
    });
  }
  return writeCart(slug, items);
}

export function setQty(slug, productId, quantity) {
  const items = readCart(slug)
    .map((i) => (i.productId === productId
      ? { ...i, quantity: Math.max(0, Math.min(i.max ?? Infinity, quantity)) }
      : i))
    .filter((i) => i.quantity > 0);
  return writeCart(slug, items);
}

export function removeItem(slug, productId) {
  return writeCart(slug, readCart(slug).filter((i) => i.productId !== productId));
}
