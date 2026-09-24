import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storefrontService, storeCustomerService, subscriptionPlanService } from '../../services';
import {
  RiShoppingCart2Line, RiSearchLine, RiStore2Line, RiCloseLine, RiAddLine, RiSubtractLine,
  RiHeartLine, RiHeartFill, RiStarFill, RiFlashlightLine, RiMapPin2Line, RiUserLine,
} from 'react-icons/ri';
import {
  readCart, writeCart, cartCount, cartTotal, addToCart, setQty, removeItem,
} from './cart';
import { readWishlist, toggleWishlist } from './wishlist';
import { getStoreToken } from './storeAuth';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

function stockLabel(p) {
  if (!p.stock?.trackStock) return { cls: 'in', text: 'In Stock' };
  if (p.stock.quantity <= 0) return { cls: 'out', text: p.stock.allowOutOfStock ? 'Backorder' : 'Out of Stock' };
  if (p.stock.quantity <= (p.stock.lowStockThreshold ?? 5)) return { cls: 'low', text: `Only ${p.stock.quantity} left` };
  return { cls: 'in', text: 'In Stock' };
}

function useCountdown(endsAt) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()));
  useEffect(() => {
    if (!endsAt) return;
    const iv = setInterval(() => setLeft(Math.max(0, new Date(endsAt).getTime() - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
}

function Stars({ value }) {
  const full = Math.round(value || 0);
  return (
    <span className="sf-stars">
      {[1, 2, 3, 4, 5].map((n) => <RiStarFill key={n} className={n <= full ? 'on' : 'off'} />)}
    </span>
  );
}

function ProductCard({ p, slug, canBuy, onAdd, wished, onToggleWish, navigate }) {
  const st = stockLabel(p);
  const soldOut = p.stock?.trackStock && p.stock.quantity <= 0 && !p.stock.allowOutOfStock;
  const hasVariants = p.variants?.length > 0;
  const open = () => navigate(`/store/${slug}/product/${p._id}`);

  return (
    <div className="sf-card">
      <div className="sf-card-img" onClick={open} role="button" tabIndex={0}>
        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : <span className="ph"><RiStore2Line /></span>}
        {p.isFlashSale && <span className="sf-badge-sale"><RiFlashlightLine /> SALE</span>}
        <button className="sf-wish-btn" onClick={(e) => { e.stopPropagation(); onToggleWish(p._id); }} title="Wishlist">
          {wished ? <RiHeartFill className="wished" /> : <RiHeartLine />}
        </button>
      </div>
      <div className="sf-card-body">
        <div className="sf-card-name" onClick={open} role="button" tabIndex={0}>{p.name}</div>
        {p.ratings?.count > 0 && (
          <div className="sf-card-rating"><Stars value={p.ratings.average} /> <span>{p.ratings.average.toFixed(1)} · {p.ratings.count} reviews</span></div>
        )}
        <div className="sf-card-price">
          {naira(p.effectivePrice)}
          {p.isFlashSale && p.effectivePrice < p.price && <span className="sf-price-was">{naira(p.price)}</span>}
        </div>
        <div className={`sf-stock ${st.cls}`}>{st.text}</div>
        {hasVariants ? (
          <button className="sf-add" disabled={soldOut || !canBuy} onClick={open}>Select Options</button>
        ) : (
          <button className="sf-add" disabled={soldOut || !canBuy} onClick={() => onAdd(p)}>
            {soldOut ? 'Sold Out' : !canBuy ? 'Not available' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
}

function ProductRow({ title, icon, products, slug, canBuy, onAdd, wishlist, onToggleWish, navigate, countdown }) {
  if (!products?.length) return null;
  return (
    <div className="sf-row-section">
      <div className="sf-row-head">
        <h2>{icon} {title}</h2>
        {countdown != null && <span className="sf-countdown">Ends in {countdown}</span>}
      </div>
      <div className="sf-hscroll">
        {products.map((p) => (
          <div key={p._id} className="sf-hscroll-item">
            <ProductCard p={p} slug={slug} canBuy={canBuy} onAdd={onAdd} wished={wishlist.includes(p._id)} onToggleWish={onToggleWish} navigate={navigate} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Store() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [flashSale, setFlashSale] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [cart, setCart] = useState(() => readCart(slug));
  const [wishlist, setWishlist] = useState(() => readWishlist(slug));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    storefrontService.getStore(slug)
      .then(({ data: r }) => { if (alive) setData(r.data); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Store not found'); })
      .finally(() => { if (alive) setLoading(false); });
    subscriptionPlanService.getPublic(slug)
      .then(({ data: r }) => { if (alive) setSubscriptionPlans(r.data || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  const store = data?.store;

  useEffect(() => {
    if (store?.name) document.title = `${store.name} — Online Store`;
  }, [store]);

  // "?recover=<sessionId>" — arrives from an abandoned-cart reminder email.
  // Restore the saved cart, let the shopper know, and open the drawer.
  useEffect(() => {
    const recoverId = searchParams.get('recover');
    if (!recoverId || !store) return;
    storefrontService.recoverCart(slug, recoverId)
      .then(({ data }) => {
        const items = data.data.items || [];
        if (items.length === 0) return;
        setCart(items);
        writeCart(slug, items);
        setDrawerOpen(true);
        toast.success('Your saved cart has been restored!');
      })
      .catch(() => {})
      .finally(() => {
        searchParams.delete('recover');
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, slug]);

  // Every store page automatically gets the AI chat widget — injected once
  // the store (and its slug, the widget's `data-company`) is known. Guarded
  // against re-injecting for the same store on remount within the same tab.
  useEffect(() => {
    if (!store?.slug) return;
    if (window.__bizlyaiWidgetSlug === store.slug) return;
    document.getElementById('bizlyai-widget')?.remove();
    document.querySelector('script[data-bizlyai-widget]')?.remove();
    window.__bizlyaiWidgetSlug = store.slug;

    const script = document.createElement('script');
    script.src = 'https://bislyai.com/widget.js';
    script.setAttribute('data-company', store.slug);
    script.setAttribute('data-position', 'bottom-left');
    script.setAttribute('data-bizlyai-widget', 'true');
    script.async = true;
    document.body.appendChild(script);
  }, [store?.slug]);

  // Showcase rows — fetched once, independent of the active filters below.
  useEffect(() => {
    if (!store) return;
    storefrontService.getProducts(slug, { flashSale: true, limit: 8 }).then(({ data: r }) => setFlashSale(r.data)).catch(() => {});
    storefrontService.getProducts(slug, { featured: true, limit: 8 }).then(({ data: r }) => setFeatured(r.data)).catch(() => {});
    storefrontService.getProducts(slug, { sort: 'popular', limit: 8 }).then(({ data: r }) => setBestSellers(r.data)).catch(() => {});
  }, [store, slug]);

  // Main filtered/sorted grid — server-side, debounced on text/number filters.
  useEffect(() => {
    if (!store) return;
    setProductsLoading(true);
    const t = setTimeout(() => {
      storefrontService.getProducts(slug, {
        search: search || undefined, category: category || undefined, sort,
        minPrice: priceMin || undefined, maxPrice: priceMax || undefined,
        minRating: minRating || undefined, inStockOnly: inStockOnly || undefined,
        limit: 24,
      }).then(({ data: r }) => setProducts(r.data)).catch(() => setProducts([])).finally(() => setProductsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [store, slug, search, category, sort, priceMin, priceMax, minRating, inStockOnly]);

  const sync = useCallback((next) => { setCart(next); writeCart(slug, next); }, [slug]);
  const handleAdd = (p) => { sync(addToCart(slug, p)); setDrawerOpen(true); };
  const storeToken = getStoreToken(slug);
  const handleToggleWish = (productId) => {
    const next = toggleWishlist(slug, productId);
    setWishlist(next);
    // Logged-in shoppers get a synced wishlist too — best-effort, the
    // localStorage copy (source of truth for guests) is already updated.
    if (storeToken) {
      const nowWishlisted = next.includes(productId);
      (nowWishlisted ? storeCustomerService.addToWishlist : storeCustomerService.removeFromWishlist)(slug, storeToken, productId).catch(() => {});
    }
  };

  const brand = store?.settings?.primaryColor || '#6366f1';
  const canBuy = store?.acceptsPayments;
  const flashEndsAt = flashSale.find((p) => p.flashSaleEndsAt)?.flashSaleEndsAt;
  const { left: countdownLeft, label: countdownLabel } = useCountdown(flashEndsAt);
  const filtersActive = Boolean(search || category || priceMin || priceMax || minRating || inStockOnly || sort !== 'newest');

  if (loading) return <div className="sf"><div className="sf-loading">Loading store…</div></div>;
  if (error || !store) {
    return (
      <div className="sf">
        <div className="sf-empty" style={{ paddingTop: 120 }}>
          <div style={{ fontSize: '3rem' }}>🛒</div>
          <h3>Store unavailable</h3>
          <p>{error || 'This store does not exist or is not open yet.'}</p>
          <Link to="/" className="sf-btn sf-btn-ghost" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', marginTop: 12 }}>Go to BizlyAI</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sf" style={{ '--sf-brand': brand }}>
      {store.settings.announcement && <div className="sf-announce">{store.settings.announcement}</div>}

      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to={`/store/${slug}`} className="sf-brand">
            {store.logo ? <img src={store.logo} alt="" /> : <RiStore2Line />}
            <span>{store.name}</span>
          </Link>
          <div className="sf-nav-search">
            <RiSearchLine />
            <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="sf-nav-actions">
            {store.giftCardSettings?.enabled && <Link to={`/store/${slug}/gift-card`} className="sf-nav-link">Gift Cards</Link>}
            {subscriptionPlans.length > 0 && <Link to={`/store/${slug}/subscriptions`} className="sf-nav-link">Subscriptions</Link>}
            <Link to={`/store/${slug}/track`} className="sf-nav-link">Track Order</Link>
            <Link
              to={storeToken ? `/store/${slug}/account?tab=wishlist` : `/store/${slug}/login?redirect=${encodeURIComponent(`/store/${slug}/account?tab=wishlist`)}`}
              className="sf-cart-btn" title="Wishlist"
            >
              {wishlist.length > 0 ? <RiHeartFill className="wished" /> : <RiHeartLine />}
              {wishlist.length > 0 && <span className="sf-cart-badge">{wishlist.length}</span>}
            </Link>
            <Link to={storeToken ? `/store/${slug}/account` : `/store/${slug}/login`} className="sf-cart-btn" title="My Account">
              <RiUserLine />
            </Link>
            <button className="sf-cart-btn" onClick={() => setDrawerOpen(true)}>
              <RiShoppingCart2Line />
              {cartCount(cart) > 0 && <span className="sf-cart-badge">{cartCount(cart)}</span>}
            </button>
          </div>
        </div>
      </header>

      {store.settings.banner && (
        <div className="sf-hero">
          <img className="sf-banner" src={store.settings.banner} alt="" />
          {flashSale.length > 0 && countdownLeft > 0 && (
            <div className="sf-hero-countdown">
              <RiFlashlightLine /> Flash Sale ends in <strong>{countdownLabel}</strong>
            </div>
          )}
        </div>
      )}

      <div className="sf-container">
        <div className="sf-intro">
          <h1>{store.name}</h1>
          {store.settings.description && <p>{store.settings.description}</p>}
        </div>

        {subscriptionPlans.length > 0 && !filtersActive && (
          <Link to={`/store/${slug}/subscriptions`} className="sf-giftcard-banner">
            <span>📦 Subscribe &amp; Save — Get automatic deliveries and save up to 15%</span>
            <span className="sf-giftcard-banner-cta">See Plans →</span>
          </Link>
        )}

        {store.giftCardSettings?.enabled && !filtersActive && (
          <Link to={`/store/${slug}/gift-card`} className="sf-giftcard-banner">
            <span>🎁 Give the gift of {store.name}! Buy a gift card from {naira(store.giftCardSettings.minAmount)}</span>
            <span className="sf-giftcard-banner-cta">Buy Gift Card →</span>
          </Link>
        )}

        {!filtersActive && (
          <>
            <ProductRow title="Flash Sales" icon="⚡" products={flashSale} slug={slug} canBuy={canBuy} onAdd={handleAdd} wishlist={wishlist} onToggleWish={handleToggleWish} navigate={navigate} countdown={flashSale.length && countdownLeft > 0 ? countdownLabel : null} />
            <ProductRow title="Featured Products" icon="⭐" products={featured} slug={slug} canBuy={canBuy} onAdd={handleAdd} wishlist={wishlist} onToggleWish={handleToggleWish} navigate={navigate} />
            <ProductRow title="Best Sellers" icon="🔥" products={bestSellers} slug={slug} canBuy={canBuy} onAdd={handleAdd} wishlist={wishlist} onToggleWish={handleToggleWish} navigate={navigate} />
          </>
        )}

        {(data.categories || []).length > 0 && (
          <div className="sf-cats">
            <button className={`sf-cat ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
            {data.categories.map((c) => (
              <button key={c} className={`sf-cat ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        )}

        <div className="sf-shop-layout">
          <button className="sf-filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>Filters {filtersOpen ? '▲' : '▼'}</button>
          <aside className={`sf-filters ${filtersOpen ? 'open' : ''}`}>
            <h3>Filters</h3>
            <div className="sf-filter-group">
              <label>Price Range</label>
              <div className="sf-price-inputs">
                <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
                <span>–</span>
                <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
              </div>
            </div>
            <div className="sf-filter-group">
              <label>Minimum Rating</label>
              <div className="sf-rating-filter">
                {[4, 3, 2, 1].map((r) => (
                  <button key={r} className={minRating === r ? 'active' : ''} onClick={() => setMinRating(minRating === r ? 0 : r)}>
                    <Stars value={r} /> &amp; up
                  </button>
                ))}
              </div>
            </div>
            <label className="sf-filter-toggle-row">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> In stock only
            </label>
            <div className="sf-filter-group">
              <label>Sort By</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </aside>

          <div className="sf-shop-main">
            {productsLoading ? (
              <div className="sf-loading">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="sf-empty">
                <div style={{ fontSize: '2.6rem' }}>📦</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="sf-grid">
                {products.map((p) => (
                  <ProductCard key={p._id} p={p} slug={slug} canBuy={canBuy} onAdd={handleAdd} wished={wishlist.includes(p._id)} onToggleWish={handleToggleWish} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(store.contact?.phone || store.contact?.email || store.contact?.address || store.contact?.website) && (
        <footer className="sf-footer">
          <div className="sf-container sf-footer-inner">
            <div className="sf-footer-brand">
              {store.logo ? <img src={store.logo} alt="" /> : <RiStore2Line />}
              <span>{store.name}</span>
            </div>
            <div className="sf-footer-contact">
              {store.contact?.phone && <span>{store.contact.phone}</span>}
              {store.contact?.email && <span>{store.contact.email}</span>}
              {store.contact?.address && <span><RiMapPin2Line /> {store.contact.address}</span>}
              {store.contact?.website && <a href={store.contact.website} target="_blank" rel="noreferrer">{store.contact.website}</a>}
            </div>
            <div className="sf-footer-powered">Powered by <a href="https://bislyai.com" target="_blank" rel="noreferrer">BizlyAI</a></div>
          </div>
        </footer>
      )}

      {/* Cart drawer */}
      <div className={`sf-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`sf-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="sf-drawer-head">
          <h3>Your Cart ({cartCount(cart)})</h3>
          <button className="sf-cart-btn" style={{ padding: 6, border: 0 }} onClick={() => setDrawerOpen(false)}><RiCloseLine /></button>
        </div>
        <div className="sf-drawer-body">
          {cart.length === 0 ? (
            <p style={{ color: 'var(--sf-muted)', textAlign: 'center', padding: '40px 0' }}>Your cart is empty.</p>
          ) : cart.map((i) => (
            <div key={`${i.productId}-${i.variantValue || ''}`} className="sf-line">
              {i.image ? <img src={i.image} alt="" /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f1f5f9' }} />}
              <div className="sf-line-info">
                <div className="sf-line-name">{i.name}</div>
                {i.variantLabel && <div className="sf-line-variant">{i.variantLabel}</div>}
                <div className="sf-line-price">{naira(i.price)} each</div>
                <div className="sf-qty">
                  <button onClick={() => sync(setQty(slug, i.productId, i.quantity - 1, i.variantValue))}><RiSubtractLine /></button>
                  <span>{i.quantity}</span>
                  <button onClick={() => sync(setQty(slug, i.productId, i.quantity + 1, i.variantValue))} disabled={i.max != null && i.quantity >= i.max}><RiAddLine /></button>
                </div>
                <br />
                <button className="sf-line-rm" onClick={() => sync(removeItem(slug, i.productId, i.variantValue))}>Remove</button>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{naira(i.price * i.quantity)}</div>
            </div>
          ))}
        </div>
        <div className="sf-drawer-foot">
          <div className="sf-subtotal"><span>Subtotal</span><span>{naira(cartTotal(cart))}</span></div>
          <button className="sf-btn" disabled={cart.length === 0} onClick={() => navigate(`/store/${slug}/checkout`)}>
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}
