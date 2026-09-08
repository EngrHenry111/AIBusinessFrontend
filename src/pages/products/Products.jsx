import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productService } from '../../services';
import {
  RiAddLine, RiStore2Line, RiSearchLine, RiGridFill, RiListUnordered,
  RiEdit2Line, RiDeleteBinLine, RiExchangeFundsLine, RiDownloadLine, RiAlertLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import StockModal from './StockModal';
import './Products.css';

const money = (n, cur = 'NGN') => {
  const sym = cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
};

function stockState(p) {
  if (!p.stock?.trackStock) return { cls: 'in', label: 'In Stock' };
  if (p.stock.quantity <= 0) return { cls: 'out', label: 'Out of Stock' };
  if (p.stock.quantity <= (p.stock.lowStockThreshold ?? 5)) return { cls: 'low', label: `Low · ${p.stock.quantity}` };
  return { cls: 'in', label: `In Stock · ${p.stock.quantity}` };
}

export default function Products() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('productsView') || 'grid');
  const [stockTarget, setStockTarget] = useState(null);

  const [search, setSearch] = useState('');
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'createdAt';

  const setParam = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productService.getAll({
        search: search || undefined, category: category || undefined,
        status: status || undefined, sort, limit: 100,
      });
      setProducts(data.data);
      setStats(data.stats || {});
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, category, status, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productService.getCategories().then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  useEffect(() => { localStorage.setItem('productsView', view); }, [view]);

  async function handleDelete(p) {
    if (!confirm(`Archive "${p.name}"? It will be hidden but its order history is kept.`)) return;
    try {
      await productService.delete(p._id);
      toast.success('Product archived');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive');
    }
  }

  function exportCSV() {
    const rows = [
      ['Name', 'SKU', 'Category', 'Price', 'Cost', 'Currency', 'Stock', 'Low Threshold', 'Status', 'Sold'],
      ...products.map((p) => [
        p.name, p.sku, p.category || '', p.price, p.costPrice || '', p.currency || 'NGN',
        p.stock?.quantity ?? 0, p.stock?.lowStockThreshold ?? '', p.status, p.sold || 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const STAT_CELLS = [
    { key: '', label: 'Total', value: stats.total },
    { key: 'active', label: 'Active', value: stats.active },
    { key: 'out_of_stock', label: 'Out of Stock', value: stats.outOfStock, tone: 'danger' },
    { key: 'low_stock', label: 'Low Stock', value: stats.lowStock, tone: 'warning' },
  ];

  return (
    <div className="products-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Products &amp; Inventory</h1>
            <p>{stats.total ?? 0} products · manage your catalogue and stock levels</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={exportCSV}><RiDownloadLine /> Export</button>
            <button className="btn btn-primary" onClick={() => navigate('/products/new')}><RiAddLine /> Add Product</button>
          </div>
        </div>
      </div>

      <div className="product-stats">
        {STAT_CELLS.map((c) => (
          <div key={c.label}
            className={`product-stat ${c.tone || ''} ${status === c.key ? 'active' : ''}`}
            onClick={() => setParam('status', status === c.key ? '' : c.key)}>
            <div className="ps-label">{c.label}</div>
            <div className="ps-value">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      {status !== 'low_stock' && stats.lowStock > 0 && (
        <div className="low-stock-banner" onClick={() => setParam('status', 'low_stock')}>
          <RiAlertLine />
          {stats.lowStock} product{stats.lowStock > 1 ? 's are' : ' is'} running low on stock — click to review
        </div>
      )}

      <div className="products-toolbar">
        <div className="search-bar">
          <RiSearchLine />
          <input placeholder="Search name, SKU or description…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={category} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          <option value="createdAt">Newest</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>
        <div className="view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><RiGridFill /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><RiListUnordered /></button>
        </div>
      </div>

      {loading ? (
        <div className="product-grid">
          {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 14 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiStore2Line /></div>
          <h3>No products found</h3>
          <p>Add your first product to start tracking inventory and answering customer questions.</p>
          <button className="btn btn-primary" onClick={() => navigate('/products/new')}><RiAddLine /> Add Product</button>
        </div>
      ) : view === 'grid' ? (
        <div className="product-grid">
          {products.map((p) => {
            const st = stockState(p);
            return (
              <div key={p._id} className="product-card">
                <div className="product-thumb" onClick={() => navigate(`/products/${p._id}`)}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} loading="lazy" />
                    : <span className="placeholder"><RiStore2Line /></span>}
                </div>
                <div className="product-card-body">
                  <div className="product-card-name" onClick={() => navigate(`/products/${p._id}`)}>{p.name}</div>
                  <div className="product-card-badges">
                    <span className="chip sku">{p.sku}</span>
                    {p.category && <span className="chip">{p.category}</span>}
                  </div>
                  <div className="product-card-price">{money(p.price, p.currency)}</div>
                  <div className={`stock-indicator ${st.cls}`}>{st.label}</div>
                  <div className="product-card-actions">
                    <button className="btn btn-secondary" onClick={() => navigate(`/products/${p._id}/edit`)}><RiEdit2Line /></button>
                    <button className="btn btn-secondary" onClick={() => setStockTarget(p)}><RiExchangeFundsLine /></button>
                    <button className="btn btn-ghost" onClick={() => handleDelete(p)}><RiDeleteBinLine /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="product-table">
            <thead>
              <tr><th></th><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const st = stockState(p);
                return (
                  <tr key={p._id}>
                    <td>
                      {p.images?.[0]
                        ? <img className="row-thumb" src={p.images[0]} alt="" loading="lazy" />
                        : <div className="row-thumb" />}
                    </td>
                    <td><a role="button" onClick={() => navigate(`/products/${p._id}`)} style={{ cursor: 'pointer', fontWeight: 500 }}>{p.name}</a></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.sku}</td>
                    <td>{p.category || '—'}</td>
                    <td>{money(p.price, p.currency)}</td>
                    <td><span className={`stock-indicator ${st.cls}`}>{st.label}</span></td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'success' : p.status === 'out_of_stock' ? 'danger' : 'neutral'}`}>{p.status.replace('_', ' ')}</span></td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/products/${p._id}/edit`)}><RiEdit2Line /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setStockTarget(p)}><RiExchangeFundsLine /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p)}><RiDeleteBinLine /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {stockTarget && (
        <StockModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onSaved={(updated) => setProducts((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))}
        />
      )}
    </div>
  );
}
