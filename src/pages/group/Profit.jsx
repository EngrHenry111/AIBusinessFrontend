import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { RiLineChartLine, RiLoader4Line, RiErrorWarningLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira, nairaShort, todayYmd, fuelLabel, LINE_COLORS } from './groupUtils';
import './Group.css';

const minusDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const PRESETS = [
  { l: '7 days', from: () => minusDays(todayYmd(), 6), to: todayYmd },
  { l: '30 days', from: () => minusDays(todayYmd(), 29), to: todayYmd },
  { l: 'This month', from: () => `${todayYmd().slice(0, 7)}-01`, to: todayYmd },
  { l: '90 days', from: () => minusDays(todayYmd(), 89), to: todayYmd },
];

export default function Profit() {
  const [preset, setPreset] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const p = PRESETS[preset];
    groupService.profit({ from: p.from(), to: p.to() })
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load profit'))
      .finally(() => setLoading(false));
  }, [preset]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};
  return (
    <div className="grp-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiLineChartLine style={{ verticalAlign: '-3px' }} /> Profit</h1>
            <p className="muted">What each branch actually makes: selling price minus cost price, then minus expenses.</p>
          </div>
          <div className="admin-tabs" style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 10, padding: 4 }}>
            {PRESETS.map((p, i) => (
              <button key={p.l} className="btn btn-sm" onClick={() => setPreset(i)}
                style={{ background: preset === i ? 'var(--bg-card)' : 'transparent', boxShadow: preset === i ? 'var(--shadow-sm)' : 'none', color: preset === i ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.l}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data ? <div style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div> : (
        <>
          {t.linesWithoutCost > 0 && (
            <div className="grp-alert medium">
              <RiErrorWarningLine style={{ color: 'var(--color-warning)' }} />
              <span>{t.linesWithoutCost} sales lines have no cost price, so their profit is overstated. Set fuel cost prices under <Link to="/group/branches">Branches</Link> and item costs under <Link to="/group/stock">Inventory</Link>. New sales will use them.</span>
            </div>
          )}
          <div className="card card-pad">
            <div className="grp-recon">
              <div><div className="l">Sales</div><div className="v">{naira(t.sales)}</div></div>
              <div><div className="l">Cost of sales</div><div className="v">{naira(t.cost)}</div></div>
              <div className="verdict ok"><div className="l">Gross profit · {t.margin}%</div><div className="v grp-pos">{naira(t.grossProfit)}</div></div>
              <div><div className="l">Expenses</div><div className="v">{naira(t.expenses)}</div></div>
              <div className={t.netProfit < 0 ? 'verdict short' : 'verdict ok'}><div className="l">Net profit</div><div className={`v ${t.netProfit < 0 ? 'grp-neg' : 'grp-pos'}`}>{naira(t.netProfit)}</div></div>
            </div>
          </div>

          <div className="grp-grid-2">
            <div className="card card-pad">
              <div className="grp-card-title">Net profit by branch</div>
              <ResponsiveContainer width="100%" height={Math.max(160, (data?.branches.length || 1) * 44)}>
                <BarChart data={data?.branches || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={nairaShort} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip formatter={(v) => naira(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="netProfit" name="Net profit" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={22}>
                    {(data?.branches || []).map((b) => <Cell key={b._id} fill={b.netProfit < 0 ? '#ef4444' : LINE_COLORS[b.businessLine]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card card-pad">
              <div className="grp-card-title">Fuel margin</div>
              {!data?.fuel.length ? <p className="muted" style={{ fontSize: 13 }}>No fuel sold in this period.</p> : data.fuel.map((f) => (
                <div key={f.product} className="grp-person" style={{ marginBottom: 8 }}>
                  <div className="grp-person-name">{fuelLabel(f.product)}</div>
                  <div className="muted">{Math.round(f.litres).toLocaleString()} L · sales {nairaShort(f.sales)} · cost {nairaShort(f.cost)}</div>
                  <div className="grp-pos" style={{ fontWeight: 700 }}>{naira(f.perLitre)} per litre · {f.margin}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="grp-card-title">Branches</div>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Branch</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Gross profit</th><th style={{ textAlign: 'right' }}>Margin</th><th style={{ textAlign: 'right' }}>Per litre</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Net profit</th></tr></thead>
                <tbody>
                  {(data?.branches || []).map((b) => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 600 }}>{b.name}{b.linesWithoutCost > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }} title="Some sales have no cost price">cost missing</span>}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.sales)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.cost)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.grossProfit)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{b.margin}%</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{b.marginPerLitre === null ? '—' : naira(b.marginPerLitre)}</td>
                      <td className="grp-num" style={{ textAlign: 'right' }}>{naira(b.expenses)}</td>
                      <td className={`grp-num ${b.netProfit < 0 ? 'grp-neg' : 'grp-pos'}`} style={{ textAlign: 'right', fontWeight: 700 }}>{naira(b.netProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data?.goods.length > 0 && (
            <div className="card card-pad">
              <div className="grp-card-title">Goods: most profitable items</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Sold</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Gross profit</th><th style={{ textAlign: 'right' }}>Margin</th></tr></thead>
                  <tbody>
                    {data.goods.map((g) => (
                      <tr key={`${g.description}|${g.unit}`}>
                        <td>{g.description}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{g.quantity.toLocaleString()} {g.unit}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(g.sales)}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{naira(g.grossProfit)}</td>
                        <td className="grp-num" style={{ textAlign: 'right' }}>{g.cost ? `${g.margin}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
