import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storefrontService, storeCustomerService } from '../../services';
import {
  RiArrowLeftLine, RiHeartLine, RiHeartFill, RiStarFill, RiWhatsappLine,
  RiFacebookBoxLine, RiShareForwardLine, RiCheckboxCircleFill, RiStore2Line, RiFlashlightLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { readCart, writeCart, addToCart } from './cart';
import { isWishlisted, toggleWishlist } from './wishlist';
import { getStoreToken } from './storeAuth';
import './Store.css';
import './ProductPage.css';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

function useCountdown(endsAt) {
  const [left, setLeft] = useState(() => (endsAt ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : 0));
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

function Stars({ value, size }) {
  const full = Math.round(value || 0);
  return (
    <span className="sf-stars" style={size ? { fontSize: size } : undefined}>
      {[1, 2, 3, 4, 5].map((n) => <RiStarFill key={n} className={n <= full ? 'on' : 'off'} />)}
    </span>
  );
}

export default function ProductPage() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainImage, setMainImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { groupName: value }
  const [qty, setQty2] = useState(1);
  const [tab, setTab] = useState('description');
  const [wished, setWished] = useState(false);
  const [reviewForm, setReviewForm] = useState({ customerName: '', customerEmail: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [recs, setRecs] = useState({ youMayAlsoLike: [], frequentlyBoughtTogether: [] });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    storefrontService.getProduct(slug, productId)
      .then(({ data }) => { if (alive) { setProduct(data.data); setWished(isWishlisted(slug, productId)); } })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Product not found'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug, productId]);

  useEffect(() => {
    let alive = true;
    storefrontService.getRecommendations(slug, productId)
      .then(({ data }) => { if (alive) setRecs(data.data); })
      .catch(() => { if (alive) setRecs({ youMayAlsoLike: [], frequentlyBoughtTogether: [] }); });
    return () => { alive = false; };
  }, [slug, productId]);

  useEffect(() => {
    if (product?.name) document.title = `${product.name} — Store`;
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    const group = product.variants[0]; // pricing/stock is driven by the first variant group in this pass
    const value = selectedOptions[group.name];
    if (!value) return null;
    const option = group.options.find((o) => o.value === value);
    return option ? { groupName: group.name, value, price: option.price, stock: option.inStock ? undefined : 0, inStock: option.inStock } : null;
  }, [product, selectedOptions]);

  // Called unconditionally (before the early returns below) — the Rules of
  // Hooks don't allow a hook call to appear only on some renders.
  const { left: flashLeft, label: flashLabel } = useCountdown(product?.isFlashSale ? product.flashSaleEndsAt : null);

  if (loading) return <div className="sf"><div className="sf-loading">Loading product…</div></div>;
  if (error || !product) {
    return (
      <div className="sf">
        <div className="sf-empty" style={{ paddingTop: 100 }}>
          <h3>Product not found</h3>
          <p>{error}</p>
          <Link to={`/store/${slug}`} className="sf-btn sf-btn-ghost" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }}>Back to store</Link>
        </div>
      </div>
    );
  }

  const price = selectedVariant?.price ?? product.effectivePrice;
  const requiresVariant = product.variants?.length > 0;
  const variantChosen = !requiresVariant || Boolean(selectedOptions[product.variants[0].name]);
  const variantOutOfStock = selectedVariant && selectedVariant.inStock === false;

  const stockOk = !product.stock.trackStock || product.stock.quantity > 0 || product.stock.allowOutOfStock;
  const canAdd = variantChosen && !variantOutOfStock && stockOk;

  function handleAddToCart() {
    const items = readCart(slug);
    const cartVariant = selectedVariant ? { groupName: selectedVariant.groupName, value: selectedVariant.value, price: selectedVariant.price, stock: undefined } : null;
    writeCart(slug, addToCart(slug, product, qty, cartVariant));
    toast.success('Added to cart');
  }

  function handleAddAllToCart() {
    addToCart(slug, product, 1, null);
    recs.frequentlyBoughtTogether.forEach((p) => addToCart(slug, p, 1, null));
    toast.success('Added all to cart');
  }

  function handleToggleWish() {
    const nowWishlisted = toggleWishlist(slug, productId).includes(productId);
    setWished(nowWishlisted);
    const token = getStoreToken(slug);
    if (token) {
      (nowWishlisted ? storeCustomerService.addToWishlist : storeCustomerService.removeFromWishlist)(slug, token, productId).catch(() => {});
    }
  }

  const shareUrl = `${window.location.origin}/store/${slug}/product/${productId}`;
  const waMessage = encodeURIComponent(`Hi, I'm interested in "${product.name}" (${naira(price)}) — ${shareUrl}`);
  const waOrderMessage = encodeURIComponent(`Hi, I'd like to order "${product.name}"${selectedVariant ? ` (${selectedVariant.groupName}: ${selectedVariant.value})` : ''}, quantity ${qty}. ${naira(price * qty)} total.`);

  async function submitReview(e) {
    e.preventDefault();
    if (!reviewForm.customerEmail.trim() || !reviewForm.customerName.trim()) return toast.error('Name and email are required.');
    setSubmittingReview(true);
    try {
      await storefrontService.addReview(slug, productId, reviewForm);
      toast.success('Thanks for your review!');
      setReviewForm({ customerName: '', customerEmail: '', rating: 5, comment: '' });
      const { data } = await storefrontService.getProduct(slug, productId);
      setProduct(data.data);
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Could not submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = product.reviews.filter((r) => Math.round(r.rating) === star).length;
    const pct = product.reviews.length ? Math.round((count / product.reviews.length) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div className="sf" style={{ '--sf-brand': product.primaryColor || '#6366f1' }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <button className="sf-nav-link pp-back" onClick={() => navigate(`/store/${slug}`)}><RiArrowLeftLine /> Back to store</button>
        </div>
      </header>

      <div className="sf-container pp-wrap">
        <div className="pp-gallery">
          <div className="pp-main-img">
            {product.images?.[mainImage] ? <img src={product.images[mainImage]} alt={product.name} /> : <span className="ph"><RiStore2Line /></span>}
            {product.isFlashSale && <span className="sf-badge-sale"><RiFlashlightLine /> SALE</span>}
          </div>
          {product.images?.length > 1 && (
            <div className="pp-thumbs">
              {product.images.map((img, i) => (
                <button key={i} className={`pp-thumb ${i === mainImage ? 'active' : ''}`} onClick={() => setMainImage(i)}>
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pp-info">
          <h1>{product.name}</h1>
          {product.ratings?.count > 0 && (
            <div className="sf-card-rating"><Stars value={product.ratings.average} /> <span>{product.ratings.average.toFixed(1)} · {product.ratings.count} reviews</span></div>
          )}

          <div className="pp-price-row">
            <span className="pp-price">{naira(price)}</span>
            {product.isFlashSale && price < product.price && <span className="sf-price-was">{naira(product.price)}</span>}
          </div>
          {product.isFlashSale && flashLeft > 0 && (
            <div className="sf-hero-countdown pp-countdown"><RiFlashlightLine /> Sale ends in <strong>{flashLabel}</strong></div>
          )}

          {product.variants?.map((group) => (
            <div key={group.name} className="pp-variant-group">
              <label>{group.name}</label>
              <div className="pp-variant-options">
                {group.options.map((o) => (
                  <button
                    key={o.value}
                    className={`pp-variant-opt ${selectedOptions[group.name] === o.value ? 'active' : ''} ${!o.inStock ? 'disabled' : ''}`}
                    disabled={!o.inStock}
                    onClick={() => setSelectedOptions((s) => ({ ...s, [group.name]: o.value }))}
                  >
                    {o.value}{!o.inStock ? ' (Out)' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pp-qty-row">
            <label>Quantity</label>
            <div className="sf-qty">
              <button onClick={() => setQty2((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty2((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className={`sf-stock ${stockOk ? (product.stock.quantity <= 5 && product.stock.trackStock ? 'low' : 'in') : 'out'}`}>
            {product.stock.trackStock ? (stockOk ? `${product.stock.quantity} in stock` : 'Out of Stock') : 'In Stock'}
          </div>

          <button className="sf-add pp-add-btn" disabled={!canAdd} onClick={handleAddToCart}>
            {requiresVariant && !variantChosen ? 'Select an option' : canAdd ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <div className="pp-secondary-actions">
            <button className="sf-btn-ghost pp-wish-btn" onClick={handleToggleWish}>
              {wished ? <RiHeartFill className="wished" /> : <RiHeartLine />} {wished ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
            <a className="sf-btn-ghost pp-wa-btn" href={`https://api.whatsapp.com/send?text=${waOrderMessage}`} target="_blank" rel="noreferrer">
              <RiWhatsappLine /> Order via WhatsApp
            </a>
          </div>

          <div className="pp-share">
            <span>Share:</span>
            <a href={`https://api.whatsapp.com/send?text=${waMessage}`} target="_blank" rel="noreferrer" title="Share on WhatsApp"><RiWhatsappLine /></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" title="Share on Facebook"><RiFacebookBoxLine /></a>
            <button onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success('Link copied'); }} title="Copy link"><RiShareForwardLine /></button>
          </div>
        </div>
      </div>

      <div className="sf-container pp-tabs-wrap">
        <div className="pp-tabs">
          <button className={tab === 'description' ? 'active' : ''} onClick={() => setTab('description')}>Description</button>
          <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Reviews ({product.ratings.count})</button>
          <button className={tab === 'shipping' ? 'active' : ''} onClick={() => setTab('shipping')}>Shipping Policy</button>
        </div>

        {tab === 'description' && (
          <div className="pp-tab-content">
            <p>{product.description || 'No description provided.'}</p>
            {product.tags?.length > 0 && (
              <div className="pp-tags">{product.tags.map((t) => <span key={t} className="pp-tag">{t}</span>)}</div>
            )}
          </div>
        )}

        {tab === 'shipping' && (
          <div className="pp-tab-content">
            <p>Delivery timelines and fees are set by the seller and shown at checkout based on your delivery state. Contact the store directly with any shipping questions.</p>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="pp-tab-content pp-reviews">
            <div className="pp-reviews-summary">
              <div className="pp-reviews-avg">
                <strong>{product.ratings.average.toFixed(1)}</strong>
                <Stars value={product.ratings.average} />
                <span>{product.ratings.count} review{product.ratings.count === 1 ? '' : 's'}</span>
              </div>
              <div className="pp-reviews-bars">
                {ratingBreakdown.map((b) => (
                  <div key={b.star} className="pp-reviews-bar-row">
                    <span>{b.star}★</span>
                    <div className="pp-reviews-bar"><div style={{ width: `${b.pct}%` }} /></div>
                    <span>{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-reviews-list">
              {product.reviews.length === 0 && <p className="pp-no-reviews">No reviews yet — be the first!</p>}
              {product.reviews.map((r, i) => (
                <div key={i} className="pp-review">
                  <div className="pp-review-head">
                    <strong>{r.customerName}</strong>
                    {r.verified && <span className="pp-verified"><RiCheckboxCircleFill /> Verified Purchase</span>}
                  </div>
                  <Stars value={r.rating} />
                  {r.comment && <p>{r.comment}</p>}
                  <span className="pp-review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            <form className="pp-review-form" onSubmit={submitReview}>
              <h4>Write a Review</h4>
              <p className="pp-review-hint">Only customers who've ordered this product can leave a review.</p>
              <div className="sf-field"><label>Your Name</label><input value={reviewForm.customerName} onChange={(e) => setReviewForm((f) => ({ ...f, customerName: e.target.value }))} /></div>
              <div className="sf-field"><label>Your Email (used to verify your order)</label><input type="email" value={reviewForm.customerEmail} onChange={(e) => setReviewForm((f) => ({ ...f, customerEmail: e.target.value }))} /></div>
              <div className="sf-field">
                <label>Rating</label>
                <div className="pp-rating-input">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}>
                      <RiStarFill className={n <= reviewForm.rating ? 'on' : 'off'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="sf-field"><label>Comment</label><textarea rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} /></div>
              <button className="sf-btn" style={{ width: 'auto', padding: '10px 24px' }} disabled={submittingReview}>{submittingReview ? 'Submitting…' : 'Submit Review'}</button>
            </form>
          </div>
        )}
      </div>

      {recs.frequentlyBoughtTogether.length > 0 && (
        <div className="sf-container sf-row-section">
          <div className="sf-row-head"><h2>Frequently Bought Together</h2></div>
          <div className="pp-fbt-row">
            {[product, ...recs.frequentlyBoughtTogether].map((fp, i) => (
              <div key={fp._id} className="pp-fbt-item">
                {i > 0 && <span className="pp-fbt-plus">+</span>}
                <Link to={i === 0 ? '#' : `/store/${slug}/product/${fp._id}`} className="sf-card pp-related-card" onClick={(e) => i === 0 && e.preventDefault()}>
                  <div className="sf-card-img">{fp.images?.[0] ? <img src={fp.images[0]} alt={fp.name} /> : <span className="ph"><RiStore2Line /></span>}</div>
                  <div className="sf-card-body">
                    <div className="sf-card-name">{fp.name}</div>
                    <div className="sf-card-price">{naira(fp.effectivePrice)}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="pp-fbt-foot">
            <span>Combined price: <strong>{naira([product, ...recs.frequentlyBoughtTogether].reduce((s, p) => s + p.effectivePrice, 0))}</strong></span>
            <button className="sf-btn" style={{ width: 'auto', padding: '10px 22px' }} onClick={handleAddAllToCart}>Add All to Cart</button>
          </div>
        </div>
      )}

      {recs.youMayAlsoLike.length > 0 && (
        <div className="sf-container sf-row-section">
          <div className="sf-row-head"><h2>You may also like</h2></div>
          <div className="sf-hscroll">
            {recs.youMayAlsoLike.map((rp) => (
              <div key={rp._id} className="sf-hscroll-item">
                <Link to={`/store/${slug}/product/${rp._id}`} className="sf-card pp-related-card">
                  <div className="sf-card-img">{rp.images?.[0] ? <img src={rp.images[0]} alt={rp.name} /> : <span className="ph"><RiStore2Line /></span>}</div>
                  <div className="sf-card-body">
                    <div className="sf-card-name">{rp.name}</div>
                    <div className="sf-card-price">{naira(rp.effectivePrice)}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
