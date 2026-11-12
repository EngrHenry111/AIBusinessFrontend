import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiTelegramLine, RiLoader4Line, RiLink, RiLinkUnlink, RiRefreshLine, RiInboxLine, RiArrowRightLine,
  RiErrorWarningLine, RiFileCopyLine, RiExternalLinkLine, RiCheckboxCircleLine,
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { telegramService } from '../../services';
import { connectSocket } from '../../services/socket';
import '../whatsapp/WhatsApp.css';

const MANAGERS = ['company_owner', 'manager', 'super_admin'];
const TG_BLUE = '#229ED9';

// Connecting the business's Telegram bot. Chats are answered in the shared
// Inbox, next to WhatsApp and the website chat.
export default function Telegram() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;
  const canManage = MANAGERS.includes(user?.role);

  const [tg, setTg] = useState(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await telegramService.getStatus();
      setTg(data.data);
    } catch { setTg((t) => t || { connected: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!companyId) return undefined;
    const socket = connectSocket();
    socket.on('connect', () => socket.emit('join_user', user._id));
    socket.on('telegram:status', () => load());
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  async function connect(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setSaving(true);
    try {
      const { data } = await telegramService.connect(token.trim());
      setTg(data.data);
      setToken('');
      setChanging(false);
      toast.success(data.message || 'Telegram connected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not connect the bot', { duration: 7000 });
    } finally { setSaving(false); }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect @${tg.botUsername}? Customers who write to it will no longer get answers.`)) return;
    try {
      const { data } = await telegramService.disconnect();
      setTg(data.data);
      toast.success('Telegram disconnected');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to disconnect'); }
  }

  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Link copied'); };

  const on = Boolean(tg?.connected);
  const formOpen = canManage && (!on || tg.needsReconnect || changing);

  return (
    <div className="wa-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiTelegramLine style={{ color: TG_BLUE }} /> Telegram</h1>
            <p>Connect a Telegram bot. The AI answers customers, and your team takes over from the Inbox. Free, with no message limits.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}><RiRefreshLine /> Refresh</button>
        </div>
      </div>

      <section className="wa-card card card-pad">
        <div className="wa-card-head">
          <RiTelegramLine className="wa-card-icon" style={{ color: TG_BLUE }} />
          <div>
            <h2>Your Telegram bot</h2>
            <p>Customers find it by its @name or a t.me link, tap Start and chat. Replies come from the same AI that answers WhatsApp and your website.</p>
          </div>
        </div>

        {!tg && <RiLoader4Line className="spin" />}

        {on && (
          <>
            <div className="wa-connected-row">
              <span className="wa-status-dot connected" style={tg.needsReconnect ? { background: 'var(--color-danger)', boxShadow: 'none' } : undefined} />
              <div className="wa-connected-text">
                <strong>@{tg.botUsername}</strong>
                <span>{tg.botName}{tg.connectedAt ? ` · connected ${new Date(tg.connectedAt).toLocaleDateString()}` : ''}</span>
              </div>
              {canManage && <button className="btn btn-sm btn-secondary" onClick={disconnect}><RiLinkUnlink /> Disconnect</button>}
            </div>

            {tg.needsReconnect && (
              <div className="wa-alert wa-alert-danger" role="alert" style={{ marginTop: 14 }}>
                <RiErrorWarningLine />
                <span><strong>Replies have stopped.</strong> {tg.lastError || 'Telegram no longer accepts this bot token.'} Paste a fresh token below to fix it.</span>
              </div>
            )}
            {!tg.needsReconnect && tg.delivery?.problem && (
              <div className="wa-alert" role="alert" style={{ marginTop: 14 }}>
                <RiErrorWarningLine />
                <span>Telegram recently had trouble delivering chats to BizlyAI: “{tg.delivery.problem}”. It retries by itself; if this stays, reconnect the bot.</span>
              </div>
            )}

            {tg.link && !tg.needsReconnect && (
              <div className="wa-test">
                <label>Share your bot with customers</label>
                <div className="wa-test-row">
                  <input className="form-input" readOnly value={tg.link} onFocus={(e) => e.target.select()} aria-label="Bot link" />
                  <button type="button" className="btn btn-secondary" onClick={() => copy(tg.link)}><RiFileCopyLine /> Copy</button>
                  <a className="btn btn-primary" href={tg.link} target="_blank" rel="noreferrer"><RiExternalLinkLine /> Try it</a>
                </div>
                <small>Put this link on your Instagram bio, flyers or website. Tap “Try it”, press Start and send a question to see the AI reply.</small>
              </div>
            )}

            {canManage && !formOpen && (
              <p className="wa-token-line" style={{ marginTop: 14, marginBottom: 0 }}>
                <RiCheckboxCircleLine style={{ color: 'var(--color-success)' }} /> Working. Bot tokens don’t expire.
                <button type="button" className="wa-link-btn" onClick={() => setChanging(true)}>Use a different bot</button>
              </p>
            )}
          </>
        )}

        {tg && formOpen && (
          <form className={on ? 'wa-test' : 'wa-cloud-form'} onSubmit={connect}>
            {!on && (
              <ol className="wa-steps">
                <li>In Telegram, open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather <RiExternalLinkLine /></a> (the official one, with a blue tick) and send <code>/newbot</code>.</li>
                <li>Give it a name customers will see, e.g. <em>{company?.companyName || 'Ada Fashion'}</em>, then a username ending in “bot”, e.g. <em>AdaFashionBot</em>.</li>
                <li>BotFather replies with a token like <code>1234567890:AAH…</code>. Copy it and paste it here. Keep it private: anyone with it controls your bot.</li>
              </ol>
            )}
            <div className="wa-fields">
              <label className="wa-field-wide">
                {on ? 'New bot token' : 'Bot token'}
                <input className="form-input" type="password" autoComplete="off" placeholder="Paste the token from @BotFather (kept secret)" value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" disabled={saving || token.trim().length < 20}>
                {saving ? <RiLoader4Line className="spin" /> : <RiLink />} {on ? 'Save token' : 'Connect Telegram'}
              </button>
              {on && changing && !tg.needsReconnect && (
                <button type="button" className="btn btn-ghost" onClick={() => { setChanging(false); setToken(''); }}>Cancel</button>
              )}
            </div>
          </form>
        )}

        {tg && !on && !canManage && <p className="wa-muted">Not connected. Ask your business owner or a manager to connect Telegram.</p>}
      </section>

      <section className="wa-card card card-pad">
        <div className="wa-card-head" style={{ marginBottom: 0 }}>
          <RiCheckboxCircleLine className="wa-card-icon" style={{ color: TG_BLUE }} />
          <div>
            <h2>What the AI does on Telegram</h2>
            <p>
              Answers from your products (live prices and stock) and your knowledge base, hands the chat to your team when it can’t help or the customer asks for a person,
              and offers a one-tap “Share my phone number” button so the customer becomes a lead. Interested customers who go quiet get one friendly follow-up
              (Leads → Automation). Photos and voice notes go straight to your team.
            </p>
          </div>
        </div>
      </section>

      <Link to="/inbox?channel=telegram" className="wa-inbox-link card card-pad">
        <RiInboxLine />
        <div>
          <strong>Telegram chats are in the Inbox</strong>
          <p>Answer them next to WhatsApp and website chats, with each customer’s history and purchases beside the conversation.</p>
        </div>
        <RiArrowRightLine />
      </Link>
    </div>
  );
}
