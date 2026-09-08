import { useState } from 'react';
import { productService } from '../../services';
import toast from 'react-hot-toast';
import './Products.css';

const TYPES = [
  { key: 'restock', label: '+ Restock', sign: 1 },
  { key: 'return', label: '+ Return', sign: 1 },
  { key: 'sale', label: '- Sold', sign: -1 },
  { key: 'damage', label: '- Damaged', sign: -1 },
  { key: 'lost', label: '- Lost', sign: -1 },
  { key: 'correction', label: '± Correction', sign: 1 },
];

export default function StockModal({ product, onClose, onSaved }) {
  const [type, setType] = useState('restock');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const current = product.stock?.quantity ?? 0;
  const sign = TYPES.find((t) => t.key === type)?.sign ?? 1;
  const delta = sign * Math.abs(Number(qty) || 0);
  const next = Math.max(0, current + delta);

  async function save() {
    if (!qty || Number(qty) <= 0) return toast.error('Enter a quantity');
    setSaving(true);
    try {
      const { data } = await productService.adjustStock(product._id, {
        adjustment: delta, reason: type, note,
      });
      toast.success('Stock updated');
      onSaved?.(data.data.product);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Adjust Stock</h3>
        <p className="pm-sub">{product.name} · currently {current} {product.unit || 'unit'}{current === 1 ? '' : 's'}</p>

        <label className="form-label">Adjustment type</label>
        <div className="adj-type-grid">
          {TYPES.map((t) => (
            <button key={t.key} className={type === t.key ? 'active' : ''} onClick={() => setType(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input className="form-input" type="number" min="1" value={qty}
            onChange={(e) => setQty(e.target.value)} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Reason / notes (optional)</label>
          <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. New shipment from supplier" />
        </div>

        <div className="stock-preview">
          Stock will change from <strong>{current}</strong> to <strong>{next}</strong>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
