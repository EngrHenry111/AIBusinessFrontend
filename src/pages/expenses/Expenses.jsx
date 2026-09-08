import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseService } from '../../services';
import {
  RiAddLine, RiSearchLine, RiWallet3Line, RiFileList3Line, RiEdit2Line,
  RiDeleteBinLine, RiFileTextLine, RiPieChartLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import ExpenseForm from './ExpenseForm';
import { EXPENSE_CATEGORIES, CATEGORY_MAP, PAYMENT_METHODS, naira } from './categories';
import './Expenses.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function Expenses() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ total: 0, count: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // expense obj | 'new' | null

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await expenseService.getAll({
        search: search || undefined, category: category || undefined,
        paymentMethod: paymentMethod || undefined,
        from: from || undefined, to: to || undefined, limit: 200,
      });
      setExpenses(data.data);
      setTotals(data.totals);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [search, category, paymentMethod, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { expenseService.getSummary().then(({ data }) => setSummary(data.data)).catch(() => {}); }, []);

  const refreshSummary = () => expenseService.getSummary().then(({ data }) => setSummary(data.data)).catch(() => {});

  async function handleDelete(exp) {
    if (!confirm(`Delete "${exp.title}"? This cannot be undone.`)) return;
    try {
      await expenseService.delete(exp._id);
      toast.success('Expense deleted');
      load(); refreshSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  const net = summary ? summary.grossProfit : 0;

  return (
    <div className="expenses-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Expenses</h1>
            <p>
              This month: <strong>{naira(summary?.totalExpenses)}</strong>
              {' · '}{summary?.expenseCount ?? 0} expenses
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/expenses/profit-loss')}>
              <RiPieChartLine /> View P&amp;L Report
            </button>
            <button className="btn btn-primary" onClick={() => setEditing('new')}><RiAddLine /> Add Expense</button>
          </div>
        </div>
      </div>

      <div className="sum-cards">
        <div className="sum-card">
          <div className="sc-label">Total Expenses</div>
          <div className="sc-value">{naira(summary?.totalExpenses)}</div>
          <div className="sc-sub">this month</div>
        </div>
        <div className="sum-card">
          <div className="sc-label">Total Revenue</div>
          <div className="sc-value">{naira(summary?.totalRevenue)}</div>
          <div className="sc-sub">paid invoices + orders</div>
        </div>
        <div className="sum-card">
          <div className="sc-label">Net Profit</div>
          <div className={`sc-value ${net >= 0 ? 'pos' : 'neg'}`}>{naira(net)}</div>
          <div className="sc-sub">revenue − expenses</div>
        </div>
        <div className="sum-card">
          <div className="sc-label">Profit Margin</div>
          <div className={`sc-value ${(summary?.profitMargin ?? 0) >= 0 ? 'pos' : 'neg'}`}>
            {summary ? `${summary.profitMargin}%` : '—'}
          </div>
        </div>
      </div>

      <div className="exp-toolbar">
        <div className="search-bar">
          <RiSearchLine />
          <input placeholder="Search title or vendor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><RiWallet3Line /></div>
          <h3>No expenses recorded</h3>
          <p>Track what your business spends to see your true profit.</p>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><RiAddLine /> Add Expense</button>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="exp-table">
              <thead>
                <tr>
                  <th>Date</th><th>Title</th><th>Category</th><th className="hide-sm">Method</th>
                  <th>Amount</th><th className="hide-sm">Receipt</th><th className="hide-sm">Added by</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const cat = CATEGORY_MAP[e.category] || CATEGORY_MAP.other;
                  const method = PAYMENT_METHODS.find((m) => m.key === e.paymentMethod);
                  return (
                    <tr key={e._id}>
                      <td>{fmtDate(e.date)}</td>
                      <td>
                        <div className="exp-title">{e.title}</div>
                        {e.vendor && <div className="exp-vendor">{e.vendor}</div>}
                      </td>
                      <td><span className={`cat-badge cat-${e.category}`}>{cat.label}</span></td>
                      <td className="hide-sm">{method?.label || e.paymentMethod}</td>
                      <td className="amount">{e.currency === 'NGN' ? naira(e.amount) : `${e.currency} ${Number(e.amount).toLocaleString()}`}</td>
                      <td className="hide-sm">
                        {e.receipt
                          ? <a href={e.receipt} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm" title="View receipt"><RiFileTextLine /></a>
                          : <span className="exp-vendor">—</span>}
                      </td>
                      <td className="hide-sm exp-vendor">{e.createdBy?.name || '—'}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setEditing(e)}><RiEdit2Line /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDelete(e)}><RiDeleteBinLine /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="exp-totals-bar">
            <span><RiFileList3Line /> Showing {expenses.length} expense{expenses.length === 1 ? '' : 's'}</span>
            <span>Total: <strong>{naira(totals.total)}</strong></span>
          </div>
        </>
      )}

      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); refreshSummary(); }}
        />
      )}
    </div>
  );
}
