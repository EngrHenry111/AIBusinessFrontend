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

// A cart line is keyed by productId + variant (if any) — the same product in
// two different variants is two separate lines, same as any real cart.
const lineKey = (i) => `${i.productId}::${i.variantValue || ''}`;

export function addToCart(slug, product, qty = 1, variant = null) {
  const items = readCart(slug);
  // variant is { groupName, value, price, stock } when the shopper picked one
  const price = variant?.price ?? product.effectivePrice ?? product.price;
  const stock = variant?.stock;
  const max = stock != null
    ? stock
    : (product.stock?.trackStock && !product.stock?.allowOutOfStock ? product.stock.quantity : Infinity);

  const key = `${product._id}::${variant?.value || ''}`;
  const idx = items.findIndex((i) => lineKey(i) === key);
  if (idx >= 0) {
    items[idx].quantity = Math.min(max, items[idx].quantity + qty);
  } else {
    items.push({
      productId: product._id,
      name: product.name,
      price,
      image: product.images?.[0] || null,
      quantity: Math.min(max, qty),
      max: Number.isFinite(max) ? max : null,
      variantGroup: variant?.groupName || undefined,
      variantValue: variant?.value || undefined,
      variantLabel: variant ? `${variant.groupName}: ${variant.value}` : undefined,
    });
  }
  return writeCart(slug, items);
}

export function setQty(slug, productId, quantity, variantValue) {
  const items = readCart(slug)
    .map((i) => (i.productId === productId && (i.variantValue || '') === (variantValue || '')
      ? { ...i, quantity: Math.max(0, Math.min(i.max ?? Infinity, quantity)) }
      : i))
    .filter((i) => i.quantity > 0);
  return writeCart(slug, items);
}

export function removeItem(slug, productId, variantValue) {
  return writeCart(slug, readCart(slug).filter((i) => !(i.productId === productId && (i.variantValue || '') === (variantValue || ''))));
}
