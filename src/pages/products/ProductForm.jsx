import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productService } from '../../services';
import { RiArrowLeftLine, RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Products.css';

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

const EMPTY = {
  name: '', description: '', category: '', sku: '', tags: '',
  price: '', costPrice: '', currency: 'NGN', unit: '',
  stock: { quantity: 0, lowStockThreshold: 5, trackStock: true, allowOutOfStock: false },
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [existingImages, setExistingImages] = useState([]); // urls (edit mode)
  const [pendingFiles, setPendingFiles] = useState([]);     // File[]
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    productService.getCategories().then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    productService.getOne(id).then(({ data }) => {
      const p = data.data;
      setForm({
        name: p.name || '', description: p.description || '', category: p.category || '',
        sku: p.sku || '', tags: (p.tags || []).join(', '),
        price: p.price ?? '', costPrice: p.costPrice ?? '', currency: p.currency || 'NGN', unit: p.unit || '',
        stock: {
          quantity: p.stock?.quantity ?? 0,
          lowStockThreshold: p.stock?.lowStockThreshold ?? 5,
          trackStock: p.stock?.trackStock ?? true,
          allowOutOfStock: p.stock?.allowOutOfStock ?? false,
        },
      });
      setExistingImages(p.images || []);
    }).catch(() => {
      toast.error('Product not found');
      navigate('/products');
    }).finally(() => setLoading(false));
  }, [id, editing, navigate]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setStock = (k, v) => setForm((p) => ({ ...p, stock: { ...p.stock, [k]: v } }));

  const totalImages = existingImages.length + pendingFiles.length;

  function addFiles(list) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const room = 5 - totalImages;
    if (room <= 0) return toast.error('Maximum 5 images');
    setPendingFiles((prev) => [...prev, ...files.slice(0, room)]);
  }

  async function submit(stay) {
    if (!form.name.trim() || form.price === '') return toast.error('Name and selling price are required');
    setSaving(true);
    try {
      let productId = id;

      if (editing) {
        await productService.update(id, {
          name: form.name, description: form.description, category: form.category,
          sku: form.sku, tags: form.tags,
          price: Number(form.price), costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
          currency: form.currency, unit: form.unit,
          stock: {
            quantity: Number(form.stock.quantity),
            lowStockThreshold: Number(form.stock.lowStockThreshold),
            trackStock: form.stock.trackStock,
            allowOutOfStock: form.stock.allowOutOfStock,
          },
          images: existingImages,
        });
      } else {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('category', form.category);
        if (form.sku.trim()) fd.append('sku', form.sku.trim());
        fd.append('tags', form.tags);
        fd.append('price', Number(form.price));
        if (form.costPrice !== '') fd.append('costPrice', Number(form.costPrice));
        fd.append('currency', form.currency);
        fd.append('unit', form.unit);
        fd.append('stock', JSON.stringify({
          quantity: Number(form.stock.quantity),
          lowStockThreshold: Number(form.stock.lowStockThreshold),
          trackStock: form.stock.trackStock,
          allowOutOfStock: form.stock.allowOutOfStock,
        }));
        pendingFiles.forEach((f) => fd.append('images', f));
        const { data } = await productService.create(fd);
        productId = data.data._id;
      }

      // Upload any new images added while editing
      if (editing && pendingFiles.length) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append('images', f));
        await productService.uploadImages(productId, fd);
      }

      toast.success(editing ? 'Product updated' : 'Product created');
      setPendingFiles([]);
      if (stay) {
        navigate(`/products/${productId}/edit`, { replace: true });
      } else {
        navigate('/products');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 14, margin: 16 }} />;

  return (
    <div className="products-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
          <RiArrowLeftLine /> Back to products
        </button>
        <h1>{editing ? 'Edit Product' : 'Add Product'}</h1>
      </div>

      <div className="card card-pad" style={{ maxWidth: 780 }}>
        {/* Basic info */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description}
              onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-input" list="cat-list" value={form.category}
                onChange={(e) => set('category', e.target.value)} placeholder="Type or pick" />
              <datalist id="cat-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">SKU {editing ? '' : '(auto-generated if blank)'}</label>
              <input className="form-input" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" value={form.tags} onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. bestseller, summer" />
          </div>
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h3>Pricing</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Selling Price *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price}
                onChange={(e) => set('price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input form-select" value={form.currency}
                onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit} onChange={(e) => set('unit', e.target.value)}
                placeholder="e.g. piece, kg, litre" />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="form-section">
          <h3>Images <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({totalImages}/5 — first is the main image)</span></h3>
          <div className="img-uploader"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
            {existingImages.map((url, i) => (
              <div className="img-preview" key={url}>
                <img src={url} alt="" />
                {i === 0 && <span className="main-tag">Main</span>}
                <button type="button" className="rm"
                  onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}><RiCloseLine /></button>
              </div>
            ))}
            {pendingFiles.map((f, i) => (
              <div className="img-preview" key={i}>
                <img src={URL.createObjectURL(f)} alt="" />
                {existingImages.length === 0 && i === 0 && <span className="main-tag">Main</span>}
                <button type="button" className="rm"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, x) => x !== i))}><RiCloseLine /></button>
              </div>
            ))}
            {totalImages < 5 && (
              <div className={`img-drop ${drag ? 'drag' : ''}`} onClick={() => fileRef.current?.click()}>
                <RiImageAddLine size={20} />
                <span>Upload / drop</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
        </div>

        {/* Inventory */}
        <div className="form-section">
          <h3>Inventory</h3>
          <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.stock.trackStock}
              onChange={(e) => setStock('trackStock', e.target.checked)} />
            Track stock for this product
          </label>
          {form.stock.trackStock && (
            <div className="form-grid-2" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">{editing ? 'Current quantity' : 'Starting quantity'}</label>
                <input className="form-input" type="number" min="0" value={form.stock.quantity}
                  onChange={(e) => setStock('quantity', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Low stock threshold</label>
                <input className="form-input" type="number" min="0" value={form.stock.lowStockThreshold}
                  onChange={(e) => setStock('lowStockThreshold', e.target.value)} />
              </div>
            </div>
          )}
          <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginTop: 8 }}>
            <input type="checkbox" checked={form.stock.allowOutOfStock}
              onChange={(e) => setStock('allowOutOfStock', e.target.checked)} />
            Allow orders when out of stock (backorder)
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={saving} onClick={() => submit(false)}>
            {saving ? 'Saving…' : 'Save Product'}
          </button>
          <button className="btn btn-secondary" disabled={saving} onClick={() => submit(true)}>
            Save &amp; Continue Editing
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/products')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
