import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService } from '../../services';
import {
  RiShoppingCart2Line, RiSearchLine, RiStore2Line, RiCloseLine, RiAddLine, RiSubtractLine,
} from 'react-icons/ri';
import {
  readCart, writeCart, cartCount, cartTotal, addToCart, setQty, removeItem,
} from './cart';
import './Store.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

function stockLabel(p) {
  if (!p.stock?.trackStock) return { cls: 'in', text: 'In Stock' };
  if (p.stock.quantity <= 0) return { cls: 'out', text: p.stock.allowOutOfStock ? 'Backorder' : 'Out of Stock' };
  if (p.stock.quantity <= (p.stock.lowStockThreshold ?? 5)) return { cls: 'low', text: `Only ${p.stock.quantity} left` };
  return { cls: 'in', text: 'In Stock' };
}

export default function Store() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState(() => readCart(slug));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    storefrontService.getStore(slug)
      .then(({ data: r }) => { if (alive) setData(r.data); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Store not found'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  const store = data?.store;

  useEffect(() => {
    if (store?.name) document.title = `${store.name} — Online Store`;
  }, [store]);

  const products = useMemo(() => {
    let list = data?.products || [];
    if (category) list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    return list;
  }, [data, category, search]);

  const sync = useCallback((next) => { setCart(next); writeCart(slug, next); }, [slug]);

  const handleAdd = (p) => {
    sync(addToCart(slug, p));
    setDrawerOpen(true);
  };

  const brand = store?.settings?.primaryColor || '#6366f1';
  const canBuy = store?.acceptsPayments;

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
          <div className="sf-brand">
            {store.logo ? <img src={store.logo} alt="" /> : <RiStore2Line />}
            <span>{store.name}</span>
          </div>
          <button className="sf-cart-btn" onClick={() => setDrawerOpen(true)}>
            <RiShoppingCart2Line />
            Cart
            {cartCount(cart) > 0 && <span className="sf-cart-badge">{cartCount(cart)}</span>}
          </button>
        </div>
      </header>

      {store.settings.banner && <img className="sf-banner" src={store.settings.banner} alt="" />}

      <div className="sf-container">
        <div className="sf-intro">
          <h1>{store.name}</h1>
          {store.settings.description && <p>{store.settings.description}</p>}
        </div>

        <div className="sf-toolbar">
          <div className="sf-search">
            <RiSearchLine />
            <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {(data.categories || []).length > 0 && (
          <div className="sf-cats">
            <button className={`sf-cat ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
            {data.categories.map((c) => (
              <button key={c} className={`sf-cat ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="sf-empty">
            <div style={{ fontSize: '2.6rem' }}>📦</div>
            <h3>No products available yet</h3>
            <p>Check back soon.</p>
          </div>
        ) : (
          <div className="sf-grid">
            {products.map((p) => {
              const st = stockLabel(p);
              const soldOut = p.stock?.trackStock && p.stock.quantity <= 0 && !p.stock.allowOutOfStock;
              return (
                <div key={p._id} className="sf-card">
                  <div className="sf-card-img">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : <span className="ph"><RiStore2Line /></span>}
                  </div>
                  <div className="sf-card-body">
                    <div className="sf-card-name">{p.name}</div>
                    {p.description && <div className="sf-card-desc">{p.description}</div>}
                    <div className="sf-card-price">{naira(p.price)}</div>
                    <div className={`sf-stock ${st.cls}`}>{st.text}</div>
                    <button className="sf-add" disabled={soldOut || !canBuy} onClick={() => handleAdd(p)}>
                      {soldOut ? 'Sold Out' : !canBuy ? 'Not available' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              {store.contact?.address && <span>{store.contact.address}</span>}
              {store.contact?.website && <a href={store.contact.website} target="_blank" rel="noreferrer">{store.contact.website}</a>}
            </div>
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
            <div key={i.productId} className="sf-line">
              {i.image ? <img src={i.image} alt="" /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f1f5f9' }} />}
              <div className="sf-line-info">
                <div className="sf-line-name">{i.name}</div>
                <div className="sf-line-price">{naira(i.price)} each</div>
                <div className="sf-qty">
                  <button onClick={() => sync(setQty(slug, i.productId, i.quantity - 1))}><RiSubtractLine /></button>
                  <span>{i.quantity}</span>
                  <button onClick={() => sync(setQty(slug, i.productId, i.quantity + 1))} disabled={i.max != null && i.quantity >= i.max}><RiAddLine /></button>
                </div>
                <br />
                <button className="sf-line-rm" onClick={() => sync(removeItem(slug, i.productId))}>Remove</button>
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
