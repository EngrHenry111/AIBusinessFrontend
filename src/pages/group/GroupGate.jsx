import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RiVipCrownLine, RiLoader4Line, RiCheckLine, RiTimeLine } from 'react-icons/ri';
import { groupService } from '../../services';
import { naira } from './groupUtils';
import './Group.css';

// One shared request per page load — the sidebar and every gated page ask.
let accessPromise = null;
export function loadGroupAccess(force = false) {
  if (force || !accessPromise) {
    accessPromise = groupService.access().then(({ data }) => data.data).catch(() => ({ allowed: true, reason: null }));
  }
  return accessPromise;
}

export function useGroupAccess() {
  const [access, setAccess] = useState(null);
  useEffect(() => {
    let alive = true;
    loadGroupAccess().then((a) => { if (alive) setAccess(a); });
    return () => { alive = false; };
  }, []);
  return access;
}

const INCLUDED = [
  'Unlimited branches: filling stations, outlets, warehouses',
  'Shift sheets per attendant, per nozzle, with meter handover checks',
  'Two-step approvals and the approved sales ledger',
  'Instant shortage and meter-gap alerts',
  'Inventory, stock counts and transfers between branches',
  'Credit customers with aging and payment reminders',
  'Profit per branch and margin per litre',
  'POS settlement check, nightly summary and monthly PDF report',
];

function UpgradeScreen({ access }) {
  const q = access.quote || {};
  const expired = access.reason === 'expired';
  return (
    <div className="grp-page fade-in">
      <div className="card grp-upgrade">
        <div className="grp-upgrade-badge"><RiVipCrownLine /> ENTERPRISE</div>
        <h2>{expired ? 'Your Enterprise plan has expired' : 'Run every branch from one place'}</h2>
        <p className="muted">
          {expired
            ? 'Renew to unlock Group Operations again. Everything you recorded is still here.'
            : 'Group Operations is part of the Enterprise plan, built for businesses with more than one branch.'}
        </p>
        <div className="grp-upgrade-price">
          {naira(q.monthly)}<span>/month</span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Includes {q.includedBranches} branches · {naira(q.perBranch)}/month for each extra branch
          {q.branches > q.includedBranches && <> · you have <strong>{q.branches}</strong> branches</>}
          {' '}· or {naira(q.annual)}/year (2 months free)
        </div>
        <ul className="grp-upgrade-list">
          {INCLUDED.map((f) => <li key={f}><RiCheckLine /> {f}</li>)}
        </ul>
        <Link to="/billing" className="btn btn-primary btn-lg">{expired ? 'Renew Enterprise' : 'Upgrade to Enterprise'}</Link>
      </div>
    </div>
  );
}

// Wraps every Group Operations page: shows the upgrade screen when the plan
// doesn't include it, and a slim notice during a trial or near renewal.
export default function GroupGate({ children }) {
  const access = useGroupAccess();
  if (!access) {
    return <div className="grp-page" style={{ padding: 60, textAlign: 'center', fontSize: 28, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>;
  }
  if (!access.allowed) return <UpgradeScreen access={access} />;

  const daysLeft = access.plan === 'enterprise' && access.periodEnd
    ? Math.ceil((new Date(access.periodEnd) - Date.now()) / 86400000) : null;
  return (
    <>
      {access.trial && (
        <div className="grp-plan-note grp-no-print">
          <RiVipCrownLine /> You're using Group Operations free during your trial. It continues on Enterprise from {naira(access.quote?.monthly)}/month.
          <Link to="/billing">See Enterprise</Link>
        </div>
      )}
      {daysLeft !== null && daysLeft <= 7 && (
        <div className="grp-plan-note warn grp-no-print">
          <RiTimeLine /> Your Enterprise plan {daysLeft > 0 ? `ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'has ended'}. Renew to avoid losing access.
          <Link to="/billing">Renew now</Link>
        </div>
      )}
      {children}
    </>
  );
}
