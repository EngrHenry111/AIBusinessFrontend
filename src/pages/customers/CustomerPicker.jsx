import { useState, useEffect, useRef } from 'react';
import { customerService } from '../../services';
import { RiSearchLine, RiUserStarLine } from 'react-icons/ri';
import './Customers.css';

/**
 * Searchable customer dropdown. Calls onSelect with { name, email, phone, address }.
 * Free-typing is still allowed on the underlying name field of the parent form —
 * this only assists with picking an existing customer.
 */
export default function CustomerPicker({ onSelect, placeholder = 'Search existing customers…' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await customerService.getAll({ search: q, status: 'active', limit: 8 });
        if (alive) { setResults(data.data); setOpen(true); }
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="form-group" ref={boxRef} style={{ position: 'relative' }}>
      <label className="form-label">Customer lookup</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--bg-card)' }}>
        <RiSearchLine style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)', fontSize: 14 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', maxHeight: 260, overflowY: 'auto',
        }}>
          {loading && <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Searching…</div>}
          {!loading && results.length === 0 && <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>No matching customers</div>}
          {results.map((c) => (
            <div key={c._id}
              onClick={() => { onSelect({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setQ(''); setResults([]); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer' }}
              onMouseDown={(e) => e.preventDefault()}>
              <span className="avatar-circle" style={{ width: 28, height: 28, fontSize: 11 }}>
                {(c.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || c.phone || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
