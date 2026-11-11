import { useState, useEffect, useCallback } from 'react';
import {
  RiLoader4Line, RiRefreshLine, RiAlertLine, RiExternalLinkLine, RiSearchLine, RiCloseLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { adminService } from '../../services';

// Numbers on BizlyAI's own WhatsApp Business Account, assigned to businesses
// by a super admin. The business never handles a Meta token.

const STATUS_BADGE = { CONNECTED: 'success', PENDING: 'warning', FLAGGED: 'danger', RESTRICTED: 'danger', BANNED: 'danger', DISCONNECTED: 'danger' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const words = (s) => String(s || '').toLowerCase().replace(/_/g, ' ');

export default function WhatsAppTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null); // phone number id being assigned
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await adminService.getWhatsapp();
      setData(res.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load WhatsApp numbers'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Business search for the number being assigned.
  useEffect(() => {
    if (!assigning) return undefined;
    const t = setTimeout(async () => {
      try {
        const { data: res } = await adminService.getCompanies({ search: search || undefined, limit: 8 });
        setMatches(res.data || []);
      } catch { setMatches([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [assigning, search]);

  async function connect(number, company) {
    const sameNumber = number.company && String(number.company._id) === String(company._id);
    const question = sameNumber
      ? `Move ${company.companyName} onto the BizlyAI platform token?\n\nSame number and chats; their own token is removed and nothing expires for them any more.`
      : `Connect ${number.displayPhone} to ${company.companyName}?\n\nTheir AI starts answering this number. If they already have WhatsApp connected, this replaces it.`;
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      const { data: res } = await adminService.connectWhatsapp(company._id, number.id);
      toast.success(res.message);
      setAssigning(null); setSearch('');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not connect'); }
    finally { setBusy(false); }
  }

  async function disconnect(number) {
    if (!window.confirm(`Disconnect ${number.displayPhone} from ${number.company.companyName}?\n\nTheir AI stops answering it. The number stays on the BizlyAI account.`)) return;
    setBusy(true);
    try {
      const { data: res } = await adminService.disconnectWhatsapp(number.company._id);
      toast.success(res.message);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not disconnect'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="admin-empty"><RiLoader4Line className="spin" /></div>;
  if (!data) return <div className="admin-empty">No data available</div>;

  const { setup, numbers, selfConnected } = data;
  const ready = setup.tokenSet && setup.wabaSet;
  const daysLeft = setup.tokenExpiresAt ? Math.ceil((new Date(setup.tokenExpiresAt) - Date.now()) / 86400000) : null;
  const tokenText = setup.tokenValid === false ? 'Not working'
    : setup.tokenValid ? (setup.tokenExpiresAt ? `${daysLeft} days left` : 'Never expires') : 'Unknown';

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Numbers on BizlyAI&apos;s own WhatsApp Business Account. Assign one to a business and its AI answers that number. The business never touches Meta.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
      </div>

      {!ready && (
        <div className="card card-pad wa-admin-setup">
          <h3><RiAlertLine /> One-time setup</h3>
          <ol>
            <li>In Meta Business Settings → <strong>Users → System users</strong>, add an <em>Admin</em> system user. Under <strong>Assign assets</strong>, give it the <strong>Bizly AI</strong> app and your WhatsApp account (full control).</li>
            <li>Click <strong>Generate new token</strong>: app <strong>Bizly AI</strong>, expiry <strong>Never</strong>, permissions <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>.</li>
            <li>On Render, open the backend service → <strong>Environment</strong>, add <code>WHATSAPP_PLATFORM_TOKEN</code> (the token) and <code>WHATSAPP_PLATFORM_WABA_ID</code> (your WhatsApp Business Account ID), then save.</li>
          </ol>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Missing: {[!setup.tokenSet && 'WHATSAPP_PLATFORM_TOKEN', !setup.wabaSet && 'WHATSAPP_PLATFORM_WABA_ID'].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {ready && (
        <div className="admin-stats-grid">
          <div className="admin-stat card">
            <div className="as-label">Platform token</div>
            <div className="as-value" style={{ fontSize: 18, color: setup.tokenValid === false ? 'var(--color-danger)' : undefined }}>{tokenText}</div>
            <div className="as-sub">{setup.tokenExpiresAt ? `Expires ${fmtDate(setup.tokenExpiresAt)}` : 'WHATSAPP_PLATFORM_TOKEN'}</div>
          </div>
          <div className="admin-stat card">
            <div className="as-label">Numbers on the account</div>
            <div className="as-value">{numbers.length}</div>
            <div className="as-sub">WABA {setup.wabaId}</div>
          </div>
          <div className="admin-stat card">
            <div className="as-label">Assigned to businesses</div>
            <div className="as-value">{numbers.filter((n) => n.company).length}</div>
            <div className="as-sub">{selfConnected.length} more use their own Meta app</div>
          </div>
        </div>
      )}

      {setup.error && <div className="card card-pad wa-admin-error"><RiAlertLine /> {setup.error}</div>}
      {ready && !setup.webhookReady && (
        <div className="card card-pad wa-admin-error"><RiAlertLine /> WHATSAPP_VERIFY_TOKEN or META_APP_SECRET is missing, so incoming messages won&apos;t arrive.</div>
      )}

      {ready && (
        <div className="card">
          <div className="card-header-row">
            <h3>Numbers</h3>
            <a className="btn btn-ghost btn-sm" href={`https://business.facebook.com/wa/manage/phone-numbers/?waba_id=${setup.wabaId}`} target="_blank" rel="noopener noreferrer">
              Add a number in Meta <RiExternalLinkLine />
            </a>
          </div>
          {numbers.length === 0 ? (
            <div className="admin-empty">No numbers yet. Add the client&apos;s number in Meta&apos;s WhatsApp Manager (Meta texts them a code), then press Refresh.</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Number</th><th>Meta status</th><th>Business</th><th /></tr></thead>
                <tbody>
                  {numbers.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <strong>{n.displayPhone}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {n.verifiedName}{n.nameStatus && n.nameStatus !== 'APPROVED' ? ` · name ${words(n.nameStatus)}` : ''}
                        </div>
                        <div className="muted mono" style={{ fontSize: 11 }}>ID {n.id}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${STATUS_BADGE[n.status] || 'neutral'}`}>{words(n.status) || 'unknown'}</span>
                        {n.quality && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Quality {words(n.quality)}</div>}
                      </td>
                      <td>
                        {n.company ? (
                          <>
                            <strong>{n.company.companyName}</strong>
                            {n.company.needsReconnect && <div style={{ color: 'var(--color-danger)', fontSize: 12 }}>Replies stopped</div>}
                            {!n.company.managed && <div className="muted" style={{ fontSize: 12 }}>Uses their own token</div>}
                          </>
                        ) : <span className="muted">Not assigned</span>}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {n.company?.managed && (
                          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => disconnect(n)}>Disconnect</button>
                        )}
                        {n.company && !n.company.managed && (
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => connect(n, n.company)} title="Replies use the platform token from now on; their own token is removed.">
                            Switch to BizlyAI token
                          </button>
                        )}
                        {!n.company && assigning !== n.id && (
                          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => { setAssigning(n.id); setSearch(''); setMatches([]); }}>
                            Connect to a business
                          </button>
                        )}
                        {assigning === n.id && (
                          <div className="wa-admin-picker">
                            <div className="admin-search">
                              <RiSearchLine />
                              <input autoFocus placeholder="Search business name" value={search} onChange={(e) => setSearch(e.target.value)} />
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAssigning(null)} aria-label="Cancel"><RiCloseLine /></button>
                            </div>
                            <ul>
                              {matches.map((c) => (
                                <li key={c._id}>
                                  <button type="button" disabled={busy} onClick={() => connect(n, c)}>
                                    <strong>{c.companyName}</strong>
                                    {c.storeSlug && <span className="muted">{c.storeSlug}</span>}
                                  </button>
                                </li>
                              ))}
                              {!matches.length && <li className="muted wa-admin-none">No matches</li>}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selfConnected.length > 0 && (
        <div className="card">
          <div className="card-header-row"><h3>Connected with their own Meta app</h3></div>
          <div className="table-wrapper">
            <table className="table compact">
              <thead><tr><th>Business</th><th>Number</th><th>Status</th></tr></thead>
              <tbody>
                {selfConnected.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.companyName}</strong></td>
                    <td>{c.displayPhone || <span className="mono">{c.phoneNumberId}</span>}</td>
                    <td>{c.needsReconnect ? <span className="badge badge-danger">Token stopped</span> : <span className="badge badge-success">Working</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
