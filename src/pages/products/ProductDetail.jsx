import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { productService } from '../../services';
import { RiArrowLeftLine, RiEdit2Line, RiExchangeFundsLine, RiStore2Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import StockModal from './StockModal';
import './Products.css';

const money = (n, cur = 'NGN') => {
  const sym = cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showStock, setShowStock] = useState(false);

  const load = () => {
    setLoading(true);
    productService.getOne(id)
      .then(({ data }) => setProduct(data.data))
      .catch(() => { toast.error('Product not found'); navigate('/products'); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <div className="skeleton" style={{ height: 420, borderRadius: 14, margin: 16 }} />;
  if (!product) return null;

  const s = product.stock || {};
  const stockCls = !s.trackStock ? 'in' : s.quantity <= 0 ? 'out' : s.quantity <= (s.lowStockThreshold ?? 5) ? 'low' : 'in';
  const images = product.images || [];

  return (
    <div className="products-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
          <RiArrowLeftLine /> Back to products
        </button>
        <div className="page-header-row">
          <div>
            <h1>{product.name}</h1>
            <p><span className="chip sku">{product.sku}</span> {product.category && <span className="chip">{product.category}</span>}</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowStock(true)}><RiExchangeFundsLine /> Adjust Stock</button>
            <button className="btn btn-primary" onClick={() => navigate(`/products/${id}/edit`)}><RiEdit2Line /> Edit</button>
          </div>
        </div>
      </div>

      <div className="pd-layout">
        {/* Gallery */}
        <div className="pd-gallery">
          {images.length > 0 ? (
            <>
              <img className="pd-main-img" src={images[activeImg]} alt={product.name} onClick={() => setLightbox(true)} />
              {images.length > 1 && (
                <div className="pd-thumbs">
                  {images.map((url, i) => (
                    <img key={url} src={url} alt="" className={i === activeImg ? 'active' : ''} onClick={() => setActiveImg(i)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="pd-main-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiStore2Line size={48} color="var(--text-muted)" />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{money(product.price, product.currency)}</span>
              <span className={`badge badge-${product.status === 'active' ? 'success' : product.status === 'out_of_stock' ? 'danger' : 'neutral'}`}>
                {product.status.replace('_', ' ')}
              </span>
            </div>
            {product.costPrice != null && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Cost {money(product.costPrice, product.currency)} · margin {money(product.price - product.costPrice, product.currency)}
              </p>
            )}
            {product.description && <p style={{ marginTop: 12 }}>{product.description}</p>}
            {product.tags?.length > 0 && (
              <div className="product-card-badges" style={{ marginTop: 12 }}>
                {product.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {product.unit && <span>Unit: {product.unit}</span>}
              {product.weight != null && <span>Weight: {product.weight}</span>}
            </div>
          </div>

          {/* Stock */}
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Stock</h3>
            <div className={`stock-indicator ${stockCls}`} style={{ fontSize: 15 }}>
              {s.trackStock ? `${s.quantity} ${product.unit || 'unit'}${s.quantity === 1 ? '' : 's'} in stock` : 'Stock not tracked'}
            </div>
            {s.trackStock && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Low stock alert at {s.lowStockThreshold} · {s.allowOutOfStock ? 'backorders allowed' : 'no backorders'}</p>}

            <h4 style={{ margin: '16px 0 8px', fontSize: 13 }}>Stock history</h4>
            {product.stockHistory?.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="product-table">
                  <thead><tr><th>Date</th><th>Change</th><th>Reason</th><th>New qty</th><th>By</th></tr></thead>
                  <tbody>
                    {product.stockHistory.map((l) => (
                      <tr key={l._id}>
                        <td>{fmtDate(l.createdAt)}</td>
                        <td style={{ color: l.adjustment >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                          {l.adjustment >= 0 ? '+' : ''}{l.adjustment}
                        </td>
                        <td>{l.reason}{l.note ? ` — ${l.note}` : ''}</td>
                        <td>{l.newQuantity}</td>
                        <td>{l.createdBy?.name || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No stock movements yet.</p>}
          </div>

          {/* Sales */}
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Sales</h3>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <div><div className="ps-label">Total sold</div><div style={{ fontSize: 22, fontWeight: 700 }}>{product.sales?.totalSold ?? 0}</div></div>
              <div><div className="ps-label">Revenue</div><div style={{ fontSize: 22, fontWeight: 700 }}>{money(product.sales?.revenue, product.currency)}</div></div>
              <div><div className="ps-label">Orders</div><div style={{ fontSize: 22, fontWeight: 700 }}>{product.sales?.orders?.length ?? 0}</div></div>
            </div>
            {product.sales?.orders?.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="product-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {product.sales.orders.map((o) => (
                      <tr key={o._id}>
                        <td><Link to="/orders">{o.orderNumber}</Link></td>
                        <td>{o.customer || '—'}</td>
                        <td>{o.quantity}</td>
                        <td><span className="badge badge-neutral">{o.status}</span></td>
                        <td>{fmtDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="pd-lightbox" onClick={() => setLightbox(false)}>
          <img src={images[activeImg]} alt={product.name} />
        </div>
      )}
      {showStock && (
        <StockModal product={product} onClose={() => setShowStock(false)} onSaved={() => load()} />
      )}
    </div>
  );
}
