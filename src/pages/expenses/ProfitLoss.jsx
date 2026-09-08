import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseService } from '../../services';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  RiArrowLeftLine, RiArrowUpLine, RiArrowDownLine, RiDownloadLine, RiPrinterLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { CATEGORY_MAP, naira } from './categories';
import './Expenses.css';

const iso = (d) => d.toISOString().slice(0, 10);

function presetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  switch (preset) {
    case 'this_month': return { startDate: iso(new Date(y, m, 1)), endDate: iso(new Date(y, m + 1, 0)) };
    case 'last_month': return { startDate: iso(new Date(y, m - 1, 1)), endDate: iso(new Date(y, m, 0)) };
    case 'this_quarter': return { startDate: iso(new Date(y, q * 3, 1)), endDate: iso(new Date(y, q * 3 + 3, 0)) };
    case 'this_year': return { startDate: iso(new Date(y, 0, 1)), endDate: iso(new Date(y, 11, 31)) };
    default: return {};
  }
}

const PRESETS = [
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['this_quarter', 'This Quarter'],
  ['this_year', 'This Year'],
  ['custom', 'Custom'],
];

function Change({ value }) {
  const up = value >= 0;
  return (
    <span className={`chg ${up ? 'up' : 'down'}`}>
      {up ? <RiArrowUpLine /> : <RiArrowDownLine />} {Math.abs(value)}%
    </span>
  );
}

export default function ProfitLoss() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('this_month');
  const [custom, setCustom] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => (
    preset === 'custom'
      ? (custom.startDate && custom.endDate ? custom : null)
      : presetRange(preset)
  ), [preset, custom]);

  useEffect(() => {
    if (!params) return;
    setLoading(true);
    expenseService.getProfitLoss(params)
      .then(({ data: r }) => setData(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [params]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ['Profit & Loss Report'],
      ['Period', `${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}`],
      [],
      ['REVENUE', 'Amount'],
      ['Invoice payments', data.revenue.invoices],
      ['Order revenue', data.revenue.orders],
      ['Total revenue', data.revenue.total],
      [],
      ['EXPENSES', 'Amount', 'Count'],
      ...data.expenses.breakdown.map((c) => [CATEGORY_MAP[c.category]?.label || c.category, c.total, c.count]),
      ['Total expenses', data.expenses.total],
      [],
      ['Net profit', data.netProfit],
      ['Profit margin', `${data.profitMargin}%`],
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `profit-loss-${iso(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const profitable = data && data.netProfit >= 0;
  const revTotal = data?.revenue.total || 0;
  const expTotal = data?.expenses.total || 0;

  return (
    <div className="pnl-page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
          <RiArrowLeftLine /> Back to expenses
        </button>
        <div className="page-header-row">
          <div><h1>Profit &amp; Loss Report</h1></div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={exportCSV}><RiDownloadLine /> Export CSV</button>
            <button className="btn btn-secondary" onClick={() => window.print()}><RiPrinterLine /> Export PDF</button>
          </div>
        </div>
      </div>

      <div className="exp-toolbar">
        {PRESETS.map(([key, label]) => (
          <button key={key}
            className={`btn btn-sm ${preset === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreset(key)}>
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <>
            <input type="date" value={custom.startDate} onChange={(e) => setCustom((c) => ({ ...c, startDate: e.target.value }))} />
            <input type="date" value={custom.endDate} onChange={(e) => setCustom((c) => ({ ...c, endDate: e.target.value }))} />
          </>
        )}
      </div>

      {loading || !data ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
      ) : (
        <>
          <div className="sum-cards">
            <div className="sum-card"><div className="sc-label">Total Revenue</div><div className="sc-value pos">{naira(data.revenue.total)}</div></div>
            <div className="sum-card"><div className="sc-label">Total Expenses</div><div className="sc-value neg">{naira(data.expenses.total)}</div></div>
            <div className="sum-card"><div className="sc-label">Gross Profit</div><div className={`sc-value ${profitable ? 'pos' : 'neg'}`}>{naira(data.netProfit)}</div></div>
            <div className="sum-card">
              <div className="sc-label">Profit Margin</div>
              <div className={`sc-value ${data.profitMargin >= 0 ? 'pos' : 'neg'}`}>{data.profitMargin}%</div>
              <div className="sc-sub"><Change value={data.comparison.profitChange} /> vs previous</div>
            </div>
          </div>

          <div className="pnl-compare">
            <span>vs previous period:</span>
            <span>Revenue <Change value={data.comparison.revenueChange} /></span>
            <span>Expenses <Change value={data.comparison.expenseChange} /></span>
            <span>Profit <Change value={data.comparison.profitChange} /></span>
          </div>

          <div className="pnl-section">
            <h3>Revenue Breakdown</h3>
            <table className="pnl-table">
              <thead><tr><th>Source</th><th className="num">Amount</th><th className="num">%</th></tr></thead>
              <tbody>
                <tr><td>Invoice payments</td><td className="num">{naira(data.revenue.invoices)}</td><td className="num">{revTotal ? Math.round((data.revenue.invoices / revTotal) * 100) : 0}%</td></tr>
                <tr><td>Order revenue</td><td className="num">{naira(data.revenue.orders)}</td><td className="num">{revTotal ? Math.round((data.revenue.orders / revTotal) * 100) : 0}%</td></tr>
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{naira(data.revenue.total)}</td><td className="num">100%</td></tr></tfoot>
            </table>
          </div>

          <div className="pnl-section">
            <h3>Expense Breakdown</h3>
            <table className="pnl-table">
              <thead><tr><th>Category</th><th className="num">Amount</th><th className="num">%</th><th className="num">Count</th></tr></thead>
              <tbody>
                {data.expenses.breakdown.length === 0 && (
                  <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No expenses in this period.</td></tr>
                )}
                {data.expenses.breakdown.map((c) => (
                  <tr key={c.category}>
                    <td><span className={`cat-badge cat-${c.category}`}>{CATEGORY_MAP[c.category]?.label || c.category}</span></td>
                    <td className="num">{naira(c.total)}</td>
                    <td className="num">{c.percentage}%</td>
                    <td className="num">{c.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{naira(expTotal)}</td><td className="num">100%</td><td className="num" /></tr></tfoot>
            </table>
          </div>

          <div className="pnl-section">
            <h3>Revenue vs Expenses — last 6 months</h3>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => naira(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line dataKey="profit" name="Profit" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="net-profit-final">
            <div className="sc-label">Net Profit</div>
            <div className={`npf-amount ${profitable ? 'pos' : 'neg'}`}>{naira(data.netProfit)}</div>
            <div className="npf-msg">
              {profitable
                ? 'Your business is profitable this period 🎉'
                : "You're spending more than you earn this period ⚠️"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
