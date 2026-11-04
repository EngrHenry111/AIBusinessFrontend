import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiShoppingCart2Line, RiSearchLine, RiAddLine, RiSubtractLine, RiDeleteBinLine, RiCloseLine,
  RiPrinterLine, RiWhatsappLine, RiLoader4Line, RiRefreshLine, RiUserAddLine, RiCheckLine,
  RiBarChartBoxLine, RiArrowUpSLine, RiForbidLine,
} from 'react-icons/ri';
import { posService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import './QuickSale.css';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'pos_terminal', label: 'POS' },
  { id: 'credit', label: 'Credit' },
];
const MANAGERS = ['company_owner', 'manager', 'super_admin'];
const CART_KEY = 'bizly-pos-cart';

const errText = (err, fallback) => err?.response?.data?.message
  || (err?.response?.status === 0 ? 'No connection. Check your internet and press Complete sale again. It will not be charged twice.' : fallback);
const newRef = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
const lagosToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
const lineKey = (l) => `${l.productId}|${l.option || ''}`;

function useMoney(currency = 'NGN') {
  return useCallback((n) => {
    const v = Number(n || 0);
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
    } catch {
      return `${currency} ${v.toLocaleString()}`;
    }
  }, [currency]);
}

// Phones get the cart as a bottom drawer; wider screens as a side panel.
const PHONE_QUERY = '(max-width: 900px)';
function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

// Fixed-position layers go on <body>: the page wrapper keeps a transform
// from its fade-in, which would otherwise pin them to the page, not the screen.
const toBody = (node) => createPortal(node, document.body);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
    if (saved && Array.isArray(saved.lines)) return saved;
  } catch { /* storage blocked or bad data */ }
  return null;
}

// A WhatsApp-ready text version of the receipt.
function receiptText(sale, money) {
  const lines = [
    sale.business?.name || '',
    `Receipt ${sale.number}`,
    new Date(sale.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }),
    '',
    ...sale.items.map((i) => `${i.quantity} x ${i.name}${i.variant ? ` (${i.variant})` : ''}  ${money(i.lineTotal)}`),
    '',
    ...(sale.discount ? [`Subtotal: ${money(sale.subtotal)}`, `Discount: -${money(sale.discount)}`] : []),
    `TOTAL: ${money(sale.total)}`,
    `Paid by: ${sale.paymentLabel}${sale.paymentStatus === 'unpaid' ? ' (to be paid)' : ''}`,
    ...(sale.change ? [`Cash: ${money(sale.amountTendered)}  Change: ${money(sale.change)}`] : []),
    '',
    'Thank you for your patronage!',
  ];
  return lines.join('\n');
}

const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0') && d.length === 11) return `234${d.slice(1)}`;
  return d;
};

export default function QuickSale() {
  const { user, company } = useAuth();
  const isManager = MANAGERS.includes(user?.role);
  const money = useMoney(company?.defaultCurrency || 'NGN');
  const [tab, setTab] = useState('sell');

  return (
    <div className="qs-page fade-in">
      <div className="qs-head">
        <div>
          <h1><RiShoppingCart2Line /> Quick Sale</h1>
          <p>Sell at the counter. Prices fill in by themselves and stock goes down with every sale.</p>
        </div>
        <div className="qs-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'sell'} className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>
            <RiShoppingCart2Line /> Sell
          </button>
          <button role="tab" aria-selected={tab === 'today'} className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
            <RiBarChartBoxLine /> {isManager ? 'Sales' : 'My sales'}
          </button>
        </div>
      </div>
      {tab === 'sell' ? <SellTab money={money} /> : <SalesTab money={money} isManager={isManager} />}
    </div>
  );
}

// ── Selling ─────────────────────────────────────────────────────────────────
function SellTab({ money }) {
  const saved = useMemo(loadCart, []);
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lines, setLines] = useState(saved?.lines || []);
  const [discount, setDiscount] = useState(saved?.discount || '');
  const [method, setMethod] = useState(saved?.method || 'cash');
  const [tendered, setTendered] = useState('');
  const [customer, setCustomer] = useState(saved?.customer || { name: '', phone: '', email: '' });
  const [showCustomer, setShowCustomer] = useState(Boolean(saved?.customer?.name || saved?.customer?.phone));
  const [clientRef, setClientRef] = useState(saved?.clientRef || newRef());
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [picking, setPicking] = useState(null); // product whose option is being chosen
  const [cartOpen, setCartOpen] = useState(false); // phones
  const searchRef = useRef(null);
  const isPhone = useIsPhone();

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await posService.products();
      setProducts(data.data);
    } catch (err) {
      setLoadError(errText(err, 'Could not load your products.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Keep the cart if the page is refreshed mid-sale.
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ lines, discount, method, customer, clientRef })); } catch { /* ignore */ }
  }, [lines, discount, method, customer, clientRef]);

  const byId = useMemo(() => new Map((products || []).map((p) => [p.id, p])), [products]);
  const categories = useMemo(() => [...new Set((products || []).map((p) => p.category).filter(Boolean))].sort(), [products]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => (!category || p.category === category)
      && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase() === q || p.sku.toLowerCase().includes(q)));
  }, [products, search, category]);

  const inCart = (productId) => lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.quantity, 0);
  const available = (p) => (p.stock === null || p.canOversell ? Infinity : p.stock - inCart(p.id));

  const add = (p, option) => {
    if (p.options.length && option === undefined) { setPicking(p); return; }
    if (available(p) <= 0) { toast.error(p.stock > 0 ? `Only ${p.stock} ${p.name} in stock.` : `${p.name} is out of stock.`); return; }
    const opt = option ? p.options.find((o) => o.label === option) : null;
    const price = opt?.price != null ? opt.price : p.price;
    setLines((prev) => {
      const key = lineKey({ productId: p.id, option });
      const found = prev.find((l) => lineKey(l) === key);
      if (found) return prev.map((l) => (lineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { productId: p.id, option: option || '', name: p.name, price, quantity: 1 }];
    });
    setPicking(null);
  };

  const setQty = (key, qty) => {
    setLines((prev) => prev.flatMap((l) => {
      if (lineKey(l) !== key) return [l];
      const n = Math.max(0, Number(qty) || 0);
      if (!n) return [];
      const p = byId.get(l.productId);
      if (p && p.stock !== null && !p.canOversell) {
        const others = inCart(p.id) - l.quantity;
        if (n + others > p.stock) {
          toast.error(`Only ${p.stock} ${p.name} in stock.`);
          return [{ ...l, quantity: Math.max(1, p.stock - others) }];
        }
      }
      return [{ ...l, quantity: n }];
    }));
  };

  // Enter in the search box: an exact code (barcode scanner) or a single
  // match goes straight into the cart.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = (products || []).find((p) => p.sku && p.sku.toLowerCase() === q);
    const pick = exact || (shown.length === 1 ? shown[0] : null);
    if (pick) { add(pick); setSearch(''); }
  };

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const total = Math.round((subtotal - disc) * 100) / 100;
  const cash = Number(tendered) || 0;
  const change = method === 'cash' && tendered !== '' ? cash - total : null;
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const quickCash = useMemo(() => {
    if (!total) return [];
    const ups = [500, 1000, 5000, 10000].map((step) => Math.ceil(total / step) * step);
    return [...new Set([total, ...ups])].filter((v) => v >= total).slice(0, 4);
  }, [total]);

  const reset = () => {
    setLines([]); setDiscount(''); setTendered(''); setMethod('cash');
    setCustomer({ name: '', phone: '', email: '' }); setShowCustomer(false);
    setClientRef(newRef()); setCartOpen(false);
  };

  const complete = async () => {
    if (!lines.length || busy) return;
    if (method === 'credit' && (!customer.name.trim() || !customer.phone.trim())) {
      setShowCustomer(true);
      toast.error('For a credit sale, add the customer\'s name and phone.');
      return;
    }
    if (change !== null && change < 0) { toast.error('The cash received is less than the total.'); return; }
    setBusy(true);
    try {
      const { data } = await posService.sell({
        clientRef,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, ...(l.option && { option: l.option }) })),
        paymentMethod: method,
        discount: disc || undefined,
        amountTendered: method === 'cash' && tendered !== '' ? cash : undefined,
        customer: showCustomer ? customer : undefined,
      });
      const sale = data.data;
      // Take the sold quantities off the list here; a quiet reload confirms.
      setProducts((prev) => prev && prev.map((p) => {
        const sold = lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0);
        return sold && p.stock !== null ? { ...p, stock: Math.max(0, p.stock - sold) } : p;
      }));
      reset();
      setReceipt(sale);
      load();
    } catch (err) {
      toast.error(errText(err, 'The sale did not go through. Please try again.'));
      if (err?.response?.status === 409 || err?.response?.status === 400) load();
    } finally {
      setBusy(false);
    }
  };

  const cart = (
    <div className="qs-cart-inner">
      <div className="qs-cart-head">
        <h2>Current sale {count > 0 && <span className="qs-count">{count}</span>}</h2>
        {lines.length > 0 && <button className="qs-link" onClick={() => { if (window.confirm('Clear this sale?')) reset(); }}>Clear</button>}
        <button className="qs-cart-close" onClick={() => setCartOpen(false)} aria-label="Close"><RiCloseLine /></button>
      </div>

      {lines.length === 0 ? (
        <div className="qs-empty-cart">
          <RiShoppingCart2Line />
          <p>Tap a product to add it.</p>
        </div>
      ) : (
        <ul className="qs-lines">
          {lines.map((l) => {
            const key = lineKey(l);
            return (
              <li key={key} className="qs-line">
                <div className="qs-line-info">
                  <span className="qs-line-name">{l.name}</span>
                  {l.option && <span className="qs-line-opt">{l.option}</span>}
                  <span className="qs-line-price">{money(l.price)} each</span>
                </div>
                <div className="qs-stepper">
                  <button onClick={() => setQty(key, l.quantity - 1)} aria-label={`One less ${l.name}`}><RiSubtractLine /></button>
                  <input type="number" inputMode="decimal" min="0" value={l.quantity} onChange={(e) => setQty(key, e.target.value)} aria-label={`Quantity of ${l.name}`} />
                  <button onClick={() => setQty(key, l.quantity + 1)} aria-label={`One more ${l.name}`}><RiAddLine /></button>
                </div>
                <span className="qs-line-total">{money(l.price * l.quantity)}</span>
                <button className="qs-line-remove" onClick={() => setQty(key, 0)} aria-label={`Remove ${l.name}`}><RiDeleteBinLine /></button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="qs-checkout">
        <div className="qs-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <label className="qs-row qs-discount">
          <span>Discount</span>
          <input type="number" inputMode="decimal" min="0" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <div className="qs-row qs-total"><span>Total</span><span>{money(total)}</span></div>

        <div className="qs-methods" role="radiogroup" aria-label="Payment method">
          {METHODS.map((m) => (
            <button key={m.id} role="radio" aria-checked={method === m.id} className={method === m.id ? 'active' : ''} onClick={() => setMethod(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {method === 'cash' && total > 0 && (
          <div className="qs-cash">
            <label>
              <span>Cash received</span>
              <input type="number" inputMode="decimal" min="0" placeholder={String(total)} value={tendered} onChange={(e) => setTendered(e.target.value)} />
            </label>
            <div className="qs-quick">
              {quickCash.map((v) => <button key={v} onClick={() => setTendered(String(v))}>{money(v)}</button>)}
            </div>
            {change !== null && (
              <div className={`qs-change ${change < 0 ? 'short' : ''}`}>
                {change < 0 ? <>Short by <strong>{money(-change)}</strong></> : <>Change: <strong>{money(change)}</strong></>}
              </div>
            )}
          </div>
        )}
        {method === 'credit' && <p className="qs-note">Credit: the customer pays later. Their name and phone are needed.</p>}

        {!showCustomer ? (
          <button className="qs-link qs-add-customer" onClick={() => setShowCustomer(true)}><RiUserAddLine /> {method === 'credit' ? 'Add customer (needed for credit)' : 'Add customer (optional)'}</button>
        ) : (
          <div className="qs-customer">
            <input placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <input placeholder="Phone" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <input placeholder="Email (for loyalty points)" inputMode="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </div>
        )}

        <button className="btn btn-primary qs-complete" disabled={!lines.length || busy} onClick={complete}>
          {busy ? <><RiLoader4Line className="spin" /> Saving…</> : <><RiCheckLine /> Complete sale {lines.length > 0 && `· ${money(total)}`}</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="qs-sell">
      <section className="qs-catalog">
        <div className="qs-search">
          <RiSearchLine />
          <input
            ref={searchRef}
            autoFocus
            placeholder="Search products or scan a code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            aria-label="Search products"
          />
          {search && <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} aria-label="Clear search"><RiCloseLine /></button>}
        </div>
        {categories.length > 1 && (
          <div className="qs-cats">
            <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>All</button>
            {categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
        )}

        {loadError ? (
          <div className="qs-state">
            <p>{loadError}</p>
            <button className="btn btn-secondary" onClick={load}><RiRefreshLine /> Try again</button>
          </div>
        ) : !products ? (
          <div className="qs-state"><RiLoader4Line className="spin" /> Loading products…</div>
        ) : products.length === 0 ? (
          <div className="qs-state">
            <p>You have no products yet. Add them once, with their prices, and they show up here.</p>
            <Link to="/products/new" className="btn btn-primary"><RiAddLine /> Add a product</Link>
          </div>
        ) : shown.length === 0 ? (
          <div className="qs-state"><p>No product matches “{search}”.</p></div>
        ) : (
          <div className="qs-grid">
            {shown.map((p) => {
              const left = available(p);
              const out = left <= 0;
              const low = p.stock !== null && !out && p.stock <= 5;
              return (
                <button key={p.id} className={`qs-product ${out ? 'out' : ''}`} onClick={() => add(p)} disabled={out && !p.options.length}>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="qs-initial" aria-hidden="true">{p.name.slice(0, 1).toUpperCase()}</span>}
                  <span className="qs-p-name">{p.name}</span>
                  <span className="qs-p-price">{money(p.price)}{p.options.length > 0 && <small> · options</small>}</span>
                  {p.stock !== null && (
                    <span className={`qs-p-stock ${out ? 'out' : low ? 'low' : ''}`}>
                      {out ? 'Out of stock' : `${p.stock} left`}
                    </span>
                  )}
                  {inCart(p.id) > 0 && <span className="qs-p-incart">{inCart(p.id)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!isPhone && <aside className="qs-cart">{cart}</aside>}
      {isPhone && toBody(
        <>
          <aside className={`qs-cart qs-cart-phone ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}>{cart}</aside>
          {cartOpen && <div className="qs-scrim" onClick={() => setCartOpen(false)} />}
          {lines.length > 0 && !cartOpen && (
            <button className="qs-cart-bar" onClick={() => setCartOpen(true)}>
              <span><RiShoppingCart2Line /> {count} item{count === 1 ? '' : 's'}</span>
              <strong>{money(total)}</strong>
              <span className="qs-cart-bar-go">View sale <RiArrowUpSLine /></span>
            </button>
          )}
        </>,
      )}

      {picking && (
        <Modal onClose={() => setPicking(null)} title={`Choose: ${picking.name}`}>
          <div className="qs-options">
            {picking.options.map((o) => (
              <button key={o.label} onClick={() => add(picking, o.label)}>
                <span>{o.label}</span>
                <strong>{money(o.price != null ? o.price : picking.price)}</strong>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {receipt && (
        <ReceiptModal sale={receipt} money={money} onClose={() => { setReceipt(null); searchRef.current?.focus(); }} nextLabel="New sale" />
      )}
    </div>
  );
}

// ── Day's sales ─────────────────────────────────────────────────────────────
function SalesTab({ money, isManager }) {
  const [date, setDate] = useState(lagosToday());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await posService.sales({ date });
      setData(res.data);
    } catch (err) {
      setError(errText(err, 'Could not load sales.'));
    }
  }, [date]);
  useEffect(() => { setData(null); load(); }, [load]);

  const openSale = async (id) => {
    try {
      const { data: res } = await posService.sale(id);
      setOpen(res.data);
    } catch (err) { toast.error(errText(err, 'Could not open that sale.')); }
  };

  const voidSale = async (sale) => {
    const reason = window.prompt(`Cancel sale ${sale.number} (${money(sale.total)})? Its stock goes back on the shelf.\n\nWhy is it being cancelled?`);
    if (reason === null) return;
    if (!reason.trim()) { toast.error('Say why the sale is being cancelled.'); return; }
    try {
      const { data: res } = await posService.voidSale(sale.id, reason.trim());
      toast.success(`Sale ${sale.number} cancelled.`);
      setOpen(res.data);
      load();
    } catch (err) { toast.error(errText(err, 'Could not cancel that sale.')); }
  };

  const t = data?.totals;
  return (
    <div className="qs-sales">
      <div className="qs-sales-bar">
        <label>
          <span>Day</span>
          <input type="date" value={date} max={lagosToday()} onChange={(e) => setDate(e.target.value || lagosToday())} />
        </label>
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
        {data && <span className="qs-scope">{data.scope === 'mine' ? 'Showing your sales' : 'Showing everyone\'s sales'}</span>}
      </div>

      {error ? (
        <div className="qs-state"><p>{error}</p><button className="btn btn-secondary" onClick={load}>Try again</button></div>
      ) : !data ? (
        <div className="qs-state"><RiLoader4Line className="spin" /> Loading…</div>
      ) : (
        <>
          <div className="qs-stats">
            <div className="qs-stat main"><span>Total sales</span><strong>{money(t.sales)}</strong></div>
            <div className="qs-stat"><span>Customers</span><strong>{t.count}</strong></div>
            <div className="qs-stat"><span>Items sold</span><strong>{t.items}</strong></div>
            <div className="qs-stat"><span>Owed (credit)</span><strong className={t.owed ? 'warn' : ''}>{money(t.owed)}</strong></div>
          </div>

          <div className="qs-breakdowns">
            <div className="qs-card">
              <h3>By payment method</h3>
              {METHODS.map((m) => (
                <div key={m.id} className="qs-row"><span>{m.label}</span><span>{money(data.byMethod[m.id])}</span></div>
              ))}
              {t.discount > 0 && <div className="qs-row muted"><span>Discounts given</span><span>{money(t.discount)}</span></div>}
            </div>
            {isManager && (
              <div className="qs-card">
                <h3>By salesperson</h3>
                {data.bySeller.length === 0 ? <p className="muted">No sales yet.</p> : data.bySeller.map((s) => (
                  <div key={s.id} className="qs-row"><span>{s.name} <small className="muted">· {s.count} sale{s.count === 1 ? '' : 's'}</small></span><span>{money(s.total)}</span></div>
                ))}
              </div>
            )}
          </div>

          <div className="qs-card">
            <h3>Sales {t.voided > 0 && <small className="muted">({t.voided} cancelled)</small>}</h3>
            {data.sales.length === 0 ? (
              <p className="muted">No sales on this day.</p>
            ) : (
              <ul className="qs-sale-list">
                {data.sales.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => openSale(s.id)} className={s.voided ? 'voided' : ''}>
                      <span className="qs-sale-num">{s.number}</span>
                      <span className="qs-sale-time">{new Date(s.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="qs-sale-who">{s.customer?.name && s.customer.name !== 'Walk-in customer' ? s.customer.name : `${s.items.reduce((n, i) => n + i.quantity, 0)} item(s)`}{isManager && s.soldBy ? ` · ${s.soldBy}` : ''}</span>
                      <span className={`qs-badge ${s.voided ? 'void' : s.paymentStatus === 'unpaid' ? 'owed' : ''}`}>{s.voided ? 'Cancelled' : s.paymentLabel}</span>
                      <span className="qs-sale-total">{money(s.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {open && (
        <ReceiptModal
          sale={open}
          money={money}
          onClose={() => setOpen(null)}
          nextLabel="Close"
          extra={isManager && !open.voided ? <button className="btn btn-ghost qs-void" onClick={() => voidSale(open)}><RiForbidLine /> Cancel sale</button> : null}
        />
      )}
    </div>
  );
}

// ── Receipt ─────────────────────────────────────────────────────────────────
function ReceiptModal({ sale, money, onClose, nextLabel, extra }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const share = () => {
    const text = encodeURIComponent(receiptText(sale, money));
    const to = waNumber(sale.customer?.phone);
    window.open(`https://wa.me/${to}?text=${text}`, '_blank', 'noopener');
  };
  return (
    <Modal onClose={onClose} title={sale.voided ? 'Cancelled sale' : 'Sale complete'} wide>
      <div className="qs-receipt" id="qs-receipt">
        {sale.business?.logo && <img src={sale.business.logo} alt="" className="qs-r-logo" />}
        <div className="qs-r-biz">{sale.business?.name}</div>
        {(sale.business?.address || sale.business?.phone) && (
          <div className="qs-r-small">{[sale.business.address, sale.business.phone].filter(Boolean).join(' · ')}</div>
        )}
        <div className="qs-r-meta">
          <span>Receipt {sale.number}</span>
          <span>{new Date(sale.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        {sale.voided && <div className="qs-r-void">CANCELLED{sale.voidReason ? `: ${sale.voidReason}` : ''}</div>}
        <table>
          <tbody>
            {sale.items.map((i, n) => (
              <tr key={n}>
                <td>{i.quantity} × {i.name}{i.variant && <small> ({i.variant})</small>}<div className="qs-r-small">{money(i.price)} each</div></td>
                <td>{money(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sale.discount > 0 && (
          <>
            <div className="qs-r-row"><span>Subtotal</span><span>{money(sale.subtotal)}</span></div>
            <div className="qs-r-row"><span>Discount</span><span>-{money(sale.discount)}</span></div>
          </>
        )}
        <div className="qs-r-row qs-r-total"><span>TOTAL</span><span>{money(sale.total)}</span></div>
        <div className="qs-r-row"><span>Paid by</span><span>{sale.paymentLabel}{sale.paymentStatus === 'unpaid' ? ' (to be paid)' : ''}</span></div>
        {sale.change != null && sale.amountTendered != null && (
          <>
            <div className="qs-r-row"><span>Cash received</span><span>{money(sale.amountTendered)}</span></div>
            <div className="qs-r-row"><span>Change</span><span>{money(sale.change)}</span></div>
          </>
        )}
        {sale.customer?.name && sale.customer.name !== 'Walk-in customer' && <div className="qs-r-row"><span>Customer</span><span>{sale.customer.name}</span></div>}
        {sale.soldBy && <div className="qs-r-row"><span>Served by</span><span>{sale.soldBy}</span></div>}
        <div className="qs-r-thanks">Thank you for your patronage!</div>
      </div>
      {!sale.voided && sale.change > 0 && <div className="qs-big-change">Give change: <strong>{money(sale.change)}</strong></div>}
      <div className="qs-receipt-actions">
        <button className="btn btn-secondary" onClick={() => window.print()}><RiPrinterLine /> Print</button>
        <button className="btn btn-secondary" onClick={share}><RiWhatsappLine /> WhatsApp</button>
        {extra}
        <button ref={closeRef} className="btn btn-primary" onClick={onClose}>{nextLabel}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return toBody(
    <div className="qs-modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="qs-modal-scrim" onClick={onClose} />
      <div className={`qs-modal ${wide ? 'wide' : ''}`}>
        <div className="qs-modal-head">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
