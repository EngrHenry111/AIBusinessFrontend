import { useState, useEffect, useCallback } from 'react';
import { loyaltyService } from '../../services';
import toast from 'react-hot-toast';
import {
  RiAwardLine, RiSearchLine, RiCloseLine, RiHistoryLine,
  RiGiftLine, RiTrophyLine,
} from 'react-icons/ri';
import LoyaltySetup from './LoyaltySetup';
import './Loyalty.css';

const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#e5e4e2' };
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  );
}

function TierBadge({ tier }) {
  return <span className="tier-badge" style={{ '--tier-color': TIER_COLORS[tier] || '#94a3b8' }}>{tier}</span>;
}

export default function Loyalty() {
  const [program, setProgram] = useState(undefined); // undefined = loading, null = not configured
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('overview');
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await loyaltyService.getProgram();
      setProgram(data.data || null);
    } catch {
      setProgram(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!program) return;
    loyaltyService.getStats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, [program]);

  async function toggleEnabled(enabled) {
    setToggling(true);
    try {
      const { data } = await loyaltyService.setupProgram({ enabled });
      setProgram(data.data);
      toast.success(enabled ? 'Loyalty program is now live' : 'Loyalty program paused');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally {
      setToggling(false);
    }
  }

  if (program === undefined) {
    return (
      <div className="loyalty-page">
        <div className="page-header"><h1>Loyalty &amp; Rewards</h1></div>
        <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="loyalty-page fade-in">
        <div className="page-header">
          <h1><RiAwardLine style={{ verticalAlign: '-3px' }} /> Loyalty &amp; Rewards</h1>
          <p>Turn one-time buyers into repeat customers with points and tier rewards.</p>
        </div>
        <LoyaltySetup onComplete={setProgram} />
      </div>
    );
  }

  return (
    <div className="loyalty-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiAwardLine style={{ verticalAlign: '-3px' }} /> {program.name}</h1>
          <p>Reward repeat customers with points and discounts.</p>
        </div>
        <div className="loyalty-enable">
          <span className={program.enabled ? 'ls-on' : 'ls-off'}>{program.enabled ? 'Active' : 'Paused'}</span>
          <Switch checked={program.enabled} onChange={toggleEnabled} disabled={toggling} />
        </div>
      </div>

      {stats && (
        <div className="loyalty-stats">
          <div className="loyalty-stat">
            <span className="ls-num">{stats.totalMembers.toLocaleString()}</span>
            <span className="ls-label">Members Enrolled</span>
          </div>
          <div className="loyalty-stat">
            <span className="ls-num">{stats.pointsIssuedThisMonth.toLocaleString()}</span>
            <span className="ls-label">Points Issued This Month</span>
          </div>
          <div className="loyalty-stat">
            <span className="ls-num">{stats.pointsRedeemedThisMonth.toLocaleString()}</span>
            <span className="ls-label">Points Redeemed This Month</span>
          </div>
          <div className="loyalty-stat">
            <span className="ls-num">{naira(stats.estimatedDiscountGiven)}</span>
            <span className="ls-label">Discount Given This Month</span>
          </div>
        </div>
      )}

      <div className="loyalty-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>Customers</button>
        <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}>Leaderboard</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {tab === 'overview' && <OverviewTab program={program} />}
      {tab === 'customers' && <CustomersTab program={program} />}
      {tab === 'leaderboard' && <LeaderboardTab />}
      {tab === 'settings' && <SettingsTab program={program} onSaved={setProgram} />}
    </div>
  );
}

/* ── Tab: Overview ────────────────────────────────────────────────────── */
function OverviewTab({ program }) {
  const [recent, setRecent] = useState(null);
  const [top, setTop] = useState(null);

  useEffect(() => {
    loyaltyService.getCustomers({ limit: 50 }).then(({ data }) => {
      const sorted = [...(data.data || [])].sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));
      setRecent(sorted.slice(0, 6));
    }).catch(() => setRecent([]));
    loyaltyService.getLeaderboard().then(({ data }) => setTop((data.data || []).slice(0, 5))).catch(() => setTop([]));
  }, []);

  const tiers = program.tiers?.length ? program.tiers : [];

  return (
    <div className="loyalty-grid">
      <div className="card card-pad">
        <h3>Program Settings</h3>
        <div className="loyalty-summary">
          <div><span>Earning rate</span><strong>{program.pointsPerNaira} point(s) per ₦1 spent</strong></div>
          <div><span>Redemption value</span><strong>₦{program.nairaPerPoint} per point</strong></div>
          <div><span>Minimum redemption</span><strong>{program.minimumRedemption} points</strong></div>
          <div><span>Max points per order</span><strong>{program.maxPointsPerOrder ? `${program.maxPointsPerOrder.toLocaleString()} points` : 'No limit'}</strong></div>
          <div><span>Points expire after</span><strong>{program.expiryDays} days</strong></div>
          <div><span>Welcome bonus</span><strong>{program.welcomePoints} points</strong></div>
          <div><span>Referral bonus</span><strong>{program.referralPoints} points</strong></div>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Tier Breakdown</h3>
        <div className="tier-list">
          {tiers.map((t) => (
            <div key={t.name} className="tier-row" style={{ '--tier-color': t.badgeColor || TIER_COLORS[t.name] }}>
              <span className="tier-dot" />
              <div className="tier-row-text">
                <strong>{t.name}</strong>
                <span>{t.minimumPoints.toLocaleString()}+ points{t.discountPercent ? ` · ${t.discountPercent}% off` : ''}</span>
                {t.benefits && <p>{t.benefits}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <h3>Recently Active Members</h3>
        {recent === null && <p className="loyalty-hint">Loading…</p>}
        {recent?.length === 0 && <p className="loyalty-hint">No activity yet.</p>}
        {recent?.map((c) => (
          <div key={c._id} className="activity-row">
            <div>
              <strong>{c.customerName}</strong>
              <span className="loyalty-hint">{fmtDate(c.lastActivityAt)}</span>
            </div>
            <TierBadge tier={c.tier} />
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <h3>Top Customers</h3>
        {top === null && <p className="loyalty-hint">Loading…</p>}
        {top?.length === 0 && <p className="loyalty-hint">No members yet.</p>}
        {top?.map((c, i) => (
          <div key={c._id} className="activity-row">
            <div>
              <strong>#{i + 1} {c.customerName}</strong>
              <span className="loyalty-hint">{c.currentPoints.toLocaleString()} points</span>
            </div>
            <TierBadge tier={c.tier} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Customers ───────────────────────────────────────────────────── */
function CustomersTab() {
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [awardFor, setAwardFor] = useState(null);

  const load = useCallback(() => {
    loyaltyService.getCustomers({ search: search || undefined, tier: tierFilter || undefined, limit: 100 })
      .then(({ data }) => setCustomers(data.data || []))
      .catch(() => setCustomers([]));
  }, [search, tierFilter]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="card card-pad">
      <div className="loyalty-filters">
        <div className="loyalty-search">
          <RiSearchLine />
          <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          <option value="">All tiers</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>
      </div>

      <div className="loyalty-table-wrap">
        <table className="loyalty-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Points</th><th>Tier</th><th>Last Activity</th><th /></tr>
          </thead>
          <tbody>
            {customers === null && <tr><td colSpan={6} className="loyalty-hint">Loading…</td></tr>}
            {customers?.length === 0 && <tr><td colSpan={6} className="loyalty-hint">No members yet.</td></tr>}
            {customers?.map((c) => (
              <tr key={c._id}>
                <td><button className="loyalty-link" onClick={() => setDetailId(c._id)}>{c.customerName}</button></td>
                <td>{c.customerEmail}</td>
                <td>{c.currentPoints.toLocaleString()}</td>
                <td><TierBadge tier={c.tier} /></td>
                <td>{fmtDate(c.lastActivityAt)}</td>
                <td><button className="btn btn-secondary" onClick={() => setAwardFor(c)}><RiGiftLine /> Award</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailId && <CustomerDetailModal id={detailId} onClose={() => setDetailId(null)} />}
      {awardFor && <AwardPointsModal customer={awardFor} onClose={() => setAwardFor(null)} onAwarded={load} />}
    </div>
  );
}

function CustomerDetailModal({ id, onClose }) {
  const [record, setRecord] = useState(null);

  useEffect(() => {
    loyaltyService.getCustomer(id).then(({ data }) => setRecord(data.data)).catch(() => setRecord(null));
  }, [id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><RiHistoryLine style={{ verticalAlign: '-3px' }} /> Points History</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          {!record && <p className="loyalty-hint">Loading…</p>}
          {record && (
            <>
              <div className="loyalty-detail-head">
                <div>
                  <strong>{record.customerName}</strong>
                  <p className="loyalty-hint">{record.customerEmail}</p>
                </div>
                <TierBadge tier={record.tier} />
              </div>
              <div className="loyalty-summary" style={{ marginBottom: 16 }}>
                <div><span>Current balance</span><strong>{record.currentPoints.toLocaleString()} pts</strong></div>
                <div><span>Total earned</span><strong>{record.totalPointsEarned.toLocaleString()} pts</strong></div>
                <div><span>Total redeemed</span><strong>{record.totalRedeemed.toLocaleString()} pts</strong></div>
              </div>
              <div className="loyalty-tx-list">
                {[...record.transactions].reverse().map((tx, i) => (
                  <div key={i} className={`loyalty-tx loyalty-tx-${tx.points >= 0 ? 'up' : 'down'}`}>
                    <div>
                      <strong>{tx.description || tx.type}</strong>
                      <span className="loyalty-hint">{fmtDate(tx.createdAt)}</span>
                    </div>
                    <span className="loyalty-tx-points">{tx.points >= 0 ? '+' : ''}{tx.points}</span>
                  </div>
                ))}
                {record.transactions.length === 0 && <p className="loyalty-hint">No transactions yet.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AwardPointsModal({ customer, onClose, onAwarded }) {
  const [points, setPoints] = useState(50);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!points || points <= 0) return toast.error('Enter a positive points value');
    setSaving(true);
    try {
      await loyaltyService.awardPoints({ customerId: customer._id, points: Number(points), description });
      toast.success(`Awarded ${points} points to ${customer.customerName}`);
      onAwarded();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to award points');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3><RiGiftLine style={{ verticalAlign: '-3px' }} /> Award Bonus Points</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><RiCloseLine /></button>
        </div>
        <div className="modal-body">
          <p className="loyalty-hint" style={{ marginBottom: 12 }}>Awarding points to <strong>{customer.customerName}</strong></p>
          <label className="ce-field" style={{ marginBottom: 12 }}>
            <span>Points</span>
            <input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} />
          </label>
          <label className="ce-field">
            <span>Reason (optional)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Birthday bonus" />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Awarding…' : 'Award Points'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Leaderboard ─────────────────────────────────────────────────── */
const MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardTab() {
  const [top, setTop] = useState(null);

  useEffect(() => {
    loyaltyService.getLeaderboard().then(({ data }) => setTop(data.data || [])).catch(() => setTop([]));
  }, []);

  if (top === null) return <div className="card card-pad"><p className="loyalty-hint">Loading leaderboard…</p></div>;
  if (top.length === 0) return <div className="empty-state"><RiTrophyLine className="empty-state-icon" /><h3>No members yet</h3><p>Once customers start earning points, your top spenders will show up here.</p></div>;

  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  // Podium order: 2nd, 1st, 3rd — the classic centred-winner layout.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="card card-pad">
      <div className="podium">
        {podiumOrder.map((c) => {
          const rank = top.indexOf(c);
          return (
            <div key={c._id} className={`podium-slot podium-rank-${rank + 1}`} style={{ animationDelay: `${rank * 0.1}s` }}>
              <span className="podium-medal">{MEDALS[rank]}</span>
              <span className="podium-name">{c.customerName}</span>
              <span className="podium-points">{c.currentPoints.toLocaleString()} pts</span>
              <TierBadge tier={c.tier} />
            </div>
          );
        })}
      </div>

      <div className="leaderboard-list">
        {rest.map((c, i) => (
          <div key={c._id} className="leaderboard-row" style={{ animationDelay: `${(i + 3) * 0.05}s` }}>
            <span className="leaderboard-rank">#{i + 4}</span>
            <div className="leaderboard-name">
              <strong>{c.customerName}</strong>
              <span className="loyalty-hint">{c.customerEmail}</span>
            </div>
            <TierBadge tier={c.tier} />
            <span className="leaderboard-points">{c.currentPoints.toLocaleString()} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Settings ────────────────────────────────────────────────────── */
function SettingsTab({ program, onSaved }) {
  const [name, setName] = useState(program.name || '');
  const [pointsPerNaira, setPointsPerNaira] = useState(program.pointsPerNaira);
  const [nairaPerPoint, setNairaPerPoint] = useState(program.nairaPerPoint);
  const [minimumRedemption, setMinimumRedemption] = useState(program.minimumRedemption);
  const [maxPointsPerOrder, setMaxPointsPerOrder] = useState(program.maxPointsPerOrder ?? '');
  const [expiryDays, setExpiryDays] = useState(program.expiryDays);
  const [welcomePoints, setWelcomePoints] = useState(program.welcomePoints);
  const [referralPoints, setReferralPoints] = useState(program.referralPoints);
  const [tiers, setTiers] = useState((program.tiers || []).map((t) => ({ ...t })));
  const [saving, setSaving] = useState(false);

  const updateTier = (i, patch) => setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  async function save() {
    setSaving(true);
    try {
      const { data } = await loyaltyService.setupProgram({
        name, pointsPerNaira: Number(pointsPerNaira), nairaPerPoint: Number(nairaPerPoint),
        minimumRedemption: Number(minimumRedemption), expiryDays: Number(expiryDays),
        maxPointsPerOrder: maxPointsPerOrder === '' ? null : Number(maxPointsPerOrder),
        welcomePoints: Number(welcomePoints), referralPoints: Number(referralPoints),
        tiers: tiers.map((t) => ({ ...t, minimumPoints: Number(t.minimumPoints), discountPercent: Number(t.discountPercent) })),
      });
      onSaved(data.data);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad loyalty-settings">
      <div className="loyalty-settings-grid">
        <label className="ce-field">
          <span>Program name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </label>
        <label className="ce-field">
          <span>Points per ₦1 spent</span>
          <input type="number" step="0.1" min={0} value={pointsPerNaira} onChange={(e) => setPointsPerNaira(e.target.value)} />
        </label>
        <label className="ce-field">
          <span>₦ value per point</span>
          <input type="number" step="0.01" min={0} value={nairaPerPoint} onChange={(e) => setNairaPerPoint(e.target.value)} />
        </label>
        <label className="ce-field">
          <span>Minimum redemption (points)</span>
          <input type="number" min={0} value={minimumRedemption} onChange={(e) => setMinimumRedemption(e.target.value)} />
        </label>
        <label className="ce-field">
          <span>Max points per order (optional)</span>
          <input type="number" min={0} value={maxPointsPerOrder} onChange={(e) => setMaxPointsPerOrder(e.target.value)} placeholder="No limit" />
        </label>
        <label className="ce-field">
          <span>Points expire after (days)</span>
          <input type="number" min={0} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
        </label>
        <label className="ce-field">
          <span>Welcome bonus (points)</span>
          <input type="number" min={0} value={welcomePoints} onChange={(e) => setWelcomePoints(e.target.value)} />
        </label>
        <label className="ce-field">
          <span>Referral bonus (points)</span>
          <input type="number" min={0} value={referralPoints} onChange={(e) => setReferralPoints(e.target.value)} />
        </label>
      </div>

      <h3 style={{ marginTop: 24 }}>Tiers</h3>
      <div className="tier-edit-list">
        {tiers.map((t, i) => (
          <div key={t.name} className="tier-edit-row" style={{ '--tier-color': t.badgeColor }}>
            <span className="tier-dot" />
            <strong className="tier-edit-name">{t.name}</strong>
            <label>
              <span>Min. points</span>
              <input type="number" min={0} value={t.minimumPoints} onChange={(e) => updateTier(i, { minimumPoints: e.target.value })} />
            </label>
            <label>
              <span>Discount %</span>
              <input type="number" min={0} max={100} value={t.discountPercent} onChange={(e) => updateTier(i, { discountPercent: e.target.value })} />
            </label>
            <label className="tier-edit-benefits">
              <span>Benefits</span>
              <input value={t.benefits || ''} onChange={(e) => updateTier(i, { benefits: e.target.value })} />
            </label>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
