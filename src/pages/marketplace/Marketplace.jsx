import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { marketplaceService } from '../../services';
import {
  RiSearchLine, RiStore2Line, RiStarFill, RiShieldCheckFill, RiMapPin2Line,
  RiShirtLine, RiRestaurantLine, RiTvLine, RiHeartsLine, RiHomeGearLine,
  RiCustomerService2Line, RiPlantLine, RiMoreLine,
} from 'react-icons/ri';
import './Marketplace.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const CATEGORY_ICONS = {
  Fashion: RiShirtLine, Food: RiRestaurantLine, Electronics: RiTvLine, Beauty: RiHeartsLine,
  Home: RiHomeGearLine, Services: RiCustomerService2Line, Agriculture: RiPlantLine, Other: RiMoreLine,
};
const NG_STATES = [
  'Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Enugu', 'Delta', 'Anambra', 'Ogun', 'Edo', 'Plateau',
];

function Stars({ value }) {
  const full = Math.round(value || 0);
  return (
    <span className="mk-stars">
      {[1, 2, 3, 4, 5].map((n) => <RiStarFill key={n} className={n <= full ? 'on' : 'off'} />)}
    </span>
  );
}

function StoreCard({ store }) {
  const Icon = CATEGORY_ICONS[store.category] || RiMoreLine;
  return (
    <Link to={`/store/${store.storeSlug}`} className="mk-store-card">
      <div className="mk-store-banner">
        {store.banner ? <img src={store.banner} alt="" /> : <div className="mk-store-banner-ph"><RiStore2Line /></div>}
      </div>
      <div className="mk-store-body">
        <div className="mk-store-head">
          <div className="mk-store-logo">{store.logo ? <img src={store.logo} alt="" /> : <RiStore2Line />}</div>
          <div>
            <div className="mk-store-name">{store.storeName} {store.isVerified && <RiShieldCheckFill className="mk-verified" title="Verified store" />}</div>
            {store.location && <div className="mk-store-location"><RiMapPin2Line /> {store.location}</div>}
          </div>
        </div>
        <span className="mk-cat-badge"><Icon /> {store.category}</span>
        {store.reviewCount > 0 ? (
          <div className="mk-store-rating"><Stars value={store.rating} /> <span>{store.rating.toFixed(1)} ({store.reviewCount})</span></div>
        ) : <div className="mk-store-rating"><span className="mk-no-rating">No reviews yet</span></div>}
        <div className="mk-store-products">{store.productCount} product{store.productCount === 1 ? '' : 's'}</div>
        <span className="mk-shop-btn">Shop Now</span>
      </div>
    </Link>
  );
}

export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState('featured');

  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState(null);
  const [productResults, setProductResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'BizlyAI Marketplace — Shop Nigerian Businesses'; }, []);

  useEffect(() => {
    marketplaceService.getFeatured().then(({ data }) => setFeatured(data.data)).catch(() => setFeatured([]));
    marketplaceService.getCategories().then(({ data }) => setCategories(data.data)).catch(() => setCategories([]));
  }, []);

  const loadStores = useCallback(() => {
    setLoading(true);
    marketplaceService.getStores({ category: category || undefined, location: location || undefined, search: search || undefined, verified: verifiedOnly || undefined, sort, limit: 24 })
      .then(({ data }) => setStores(data.data))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [category, location, search, verifiedOnly, sort]);

  useEffect(() => {
    const t = setTimeout(loadStores, 300);
    return () => clearTimeout(t);
  }, [loadStores]);

  useEffect(() => {
    if (!search.trim()) { setProductResults(null); return; }
    const t = setTimeout(() => {
      marketplaceService.search(search.trim()).then(({ data }) => setProductResults(data.data)).catch(() => setProductResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function submitSearch(e) {
    e.preventDefault();
    setParams(search ? { q: search } : {});
  }

  function pickCategory(cat) {
    setCategory(category === cat ? '' : cat);
  }

  return (
    <div className="mk">
      <header className="mk-header">
        <Link to="/" className="mk-brand"><RiStore2Line /> BizlyAI Market</Link>
      </header>

      <section className="mk-hero">
        <h1>Shop from hundreds of Nigerian businesses</h1>
        <p>Discover trusted local stores, all in one place.</p>
        <form className="mk-search" onSubmit={submitSearch}>
          <RiSearchLine />
          <input placeholder="Search products or stores…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </section>

      <div className="mk-container">
        <div className="mk-cat-grid">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.category] || RiMoreLine;
            return (
              <button key={c.category} className={`mk-cat-tile ${category === c.category ? 'active' : ''}`} onClick={() => pickCategory(c.category)}>
                <Icon />
                <span>{c.category}</span>
                <small>{c.storeCount} store{c.storeCount === 1 ? '' : 's'}</small>
              </button>
            );
          })}
        </div>

        {productResults !== null && (
          <section className="mk-section">
            <h2>Products matching "{search}"</h2>
            {productResults.length === 0 ? (
              <p className="mk-hint">No products found. Try a different search.</p>
            ) : (
              <div className="mk-product-grid">
                {productResults.map((p) => (
                  <Link key={p._id} to={`/store/${p.store.slug}/product/${p._id}`} className="mk-product-card">
                    <div className="mk-product-img">{p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <RiStore2Line />}</div>
                    <div className="mk-product-body">
                      <div className="mk-product-name">{p.name}</div>
                      <div className="mk-product-price">{naira(p.effectivePrice)}</div>
                      <div className="mk-product-store"><RiStore2Line /> {p.store.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {!search && featured?.length > 0 && (
          <section className="mk-section">
            <h2>Featured Stores</h2>
            <div className="mk-store-grid mk-store-grid-featured">
              {featured.map((s) => <StoreCard key={s.storeSlug} store={s} />)}
            </div>
          </section>
        )}

        <section className="mk-section">
          <div className="mk-section-head">
            <h2>All Stores</h2>
            <div className="mk-filters-inline">
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">All locations</option>
                {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="mk-verified-toggle">
                <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified only
              </label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="mk-hint">Loading stores…</p>
          ) : stores?.length === 0 ? (
            <div className="mk-empty"><RiStore2Line /><h3>No stores found</h3><p>Try a different category or location.</p></div>
          ) : (
            <div className="mk-store-grid">
              {stores?.map((s) => <StoreCard key={s.storeSlug} store={s} />)}
            </div>
          )}
        </section>
      </div>

      <footer className="mk-footer">
        Powered by <a href="https://bislyai.com" target="_blank" rel="noreferrer">BizlyAI</a>
      </footer>
    </div>
  );
}
