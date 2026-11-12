import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { inboxService, whatsappService } from '../../services';
import { connectSocket } from '../../services/socket';
import { formatMoney, stageLabel, BUYING_SIGNAL } from '../../constants/leads';
import {
  RiInboxLine, RiSearchLine, RiSendPlane2Line, RiLoader4Line, RiRobot2Line, RiUser3Line,
  RiCustomerService2Line, RiCheckDoubleLine, RiHand, RiArrowLeftLine, RiWhatsappLine,
  RiGlobalLine, RiMessengerLine, RiInstagramLine, RiTelegramLine, RiMailLine, RiPhoneLine,
  RiUserHeartLine, RiCloseLine, RiErrorWarningLine, RiArrowRightSLine, RiSettings3Line,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Inbox.css';

export const CHANNELS = {
  whatsapp: { label: 'WhatsApp', icon: RiWhatsappLine, color: '#25D366' },
  widget: { label: 'Website chat', icon: RiGlobalLine, color: 'var(--color-brand)' },
  facebook: { label: 'Messenger', icon: RiMessengerLine, color: '#0084FF' },
  instagram: { label: 'Instagram', icon: RiInstagramLine, color: '#E1306C' },
  telegram: { label: 'Telegram', icon: RiTelegramLine, color: '#229ED9' },
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unclaimed', label: 'Needs reply' },
  { id: 'mine', label: 'Mine' },
  { id: 'ai', label: 'AI handling' },
  { id: 'resolved', label: 'Resolved' },
];

const statusMeta = (c) => {
  if (c.status === 'resolved') return { label: 'Resolved', cls: 'resolved' };
  if (c.status === 'human') return c.assignedTo ? { label: 'Team', cls: 'team' } : { label: 'Needs reply', cls: 'human' };
  return { label: 'AI', cls: 'ai' };
};

const fmtTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const today = d.toDateString() === new Date().toDateString();
  return today
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtPhone = (p) => (p && /^\d{10,}$/.test(p) ? `+${p}` : p || '');

function ChannelIcon({ channel, size = 14 }) {
  const ch = CHANNELS[channel] || CHANNELS.widget;
  const Icon = ch.icon;
  return <Icon title={ch.label} style={{ color: ch.color, fontSize: size, flexShrink: 0 }} />;
}

export default function Inbox() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;
  const [params, setParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ all: 0, ai: 0, human: 0, resolved: 0, unclaimed: 0, channels: {} });
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [channel, setChannel] = useState(params.get('channel') || 'all');
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);

  const [activeId, setActiveId] = useState(params.get('c') || null);
  const [convo, setConvo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [convoLoading, setConvoLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  const activeIdRef = useRef(activeId);
  const endRef = useRef(null);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await inboxService.getConversations({ status, channel, search: search || undefined });
      setConversations(data.data);
      if (data.counts) setCounts(data.counts);
    } catch { toast.error('Failed to load conversations'); }
    finally { setListLoading(false); }
  }, [status, channel, search]);

  // Official WhatsApp token stopped working → replies can't be sent.
  const [waTokenProblem, setWaTokenProblem] = useState(false);
  const checkWhatsApp = useCallback(async () => {
    try {
      const { data } = await whatsappService.getStatus();
      const c = data.data?.cloud;
      setWaTokenProblem(c?.needsReconnect ? (c.managed ? 'managed' : 'own') : false);
    } catch { /* banner only */ }
  }, []);
  useEffect(() => { checkWhatsApp(); }, [checkWhatsApp]);

  const loadRef = useRef(loadConversations);
  useEffect(() => { loadRef.current = loadConversations; }, [loadConversations]);
  const openRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(loadConversations, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadConversations, search]);

  // Keep filters + open chat in the URL so a link (or refresh) lands in the same place.
  useEffect(() => {
    const next = {};
    if (status !== 'all') next.status = status;
    if (channel !== 'all') next.channel = channel;
    if (activeId) next.c = activeId;
    setParams(next, { replace: true });
  }, [status, channel, activeId, setParams]);

  // Live updates
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = connectSocket();
    socket.on('connect', () => {
      socket.emit('join_company', companyId);
      socket.emit('join_user', user._id);
    });
    socket.on('inbox:handover_needed', (p) => {
      toast(`${p.displayName || 'A customer'} needs a reply (${CHANNELS[p.channel]?.label || p.channel})`, { icon: '🙋', duration: 5000 });
      loadRef.current?.();
    });
    socket.on('inbox:new_message', (p) => {
      if (String(p.conversationId) === String(activeIdRef.current) && p.message) {
        setConvo((c) => (c && !c.messages.some((m) => String(m._id) === String(p.message._id))
          ? { ...c, messages: [...c.messages, p.message], status: p.status || c.status }
          : c));
      }
      loadRef.current?.();
    });
    socket.on('whatsapp:token_status', () => checkWhatsApp());
    socket.on('inbox:conversation_updated', (p) => {
      loadRef.current?.();
      if (String(p.conversationId) === String(activeIdRef.current)) openRef.current?.(activeIdRef.current, true);
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convo?.messages?.length]);

  async function openConversation(id, silent = false) {
    setActiveId(id);
    if (!silent) { setConvo(null); setProfile(null); setConvoLoading(true); }
    try {
      const { data } = await inboxService.getConversation(id);
      setConvo(data.data);
      setProfile(data.profile);
      if (!silent || !notesDirty) { setNotes(data.profile?.contact?.notes || ''); setNotesDirty(false); }
      setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
    } catch {
      if (!silent) { toast.error('Failed to open conversation'); setActiveId(null); }
    } finally { setConvoLoading(false); }
  }
  openRef.current = openConversation;

  // Open the chat named in the URL on first load.
  useEffect(() => {
    if (activeId) openConversation(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !convo) return;
    setInput('');
    setSending(true);
    const optimistic = { _id: `t-${Date.now()}`, from: 'human', content: text, agentName: user.name, timestamp: new Date().toISOString(), temp: true };
    setConvo((c) => ({ ...c, messages: [...c.messages, optimistic] }));
    try {
      const { data } = await inboxService.reply(convo._id, text);
      const saved = data.data.message;
      setConvo((c) => ({
        ...c,
        assignedTo: c.assignedTo || { _id: user._id, name: user.name },
        messages: c.messages.some((m) => String(m._id) === String(saved._id))
          ? c.messages.filter((m) => m._id !== optimistic._id)
          : c.messages.map((m) => (m._id === optimistic._id ? saved : m)),
      }));
      if (!data.data.delivered) toast.error(data.data.reason || 'Saved, but the message could not be delivered');
    } catch (err) {
      setConvo((c) => ({ ...c, messages: c.messages.filter((m) => m._id !== optimistic._id) }));
      setInput(text);
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  }

  async function runAction(fn, label) {
    setBusy(true);
    try {
      await fn();
      await openConversation(convo._id, true);
      loadConversations();
      toast.success(label);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setBusy(false); }
  }

  async function saveNotes() {
    if (!profile?.contact || !notesDirty) return;
    try {
      await inboxService.updateContactNotes(profile.contact._id, notes);
      setNotesDirty(false);
      toast.success('Notes saved');
    } catch { toast.error('Could not save notes'); }
  }

  const assignedId = convo?.assignedTo?._id || convo?.assignedTo;
  const assignedToMe = assignedId && String(assignedId) === String(user._id);
  const canType = convo?.status === 'human' && (!assignedId || assignedToMe);
  const channelList = Object.keys(counts.channels || {}).filter((k) => CHANNELS[k]);
  const name = convo ? (convo.displayName || convo.email || fmtPhone(convo.phone) || `Visitor #${String(convo._id).slice(-4)}`) : '';

  return (
    <div className="ibx-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiInboxLine style={{ color: 'var(--color-brand)' }} /> Inbox</h1>
            <p>Every customer chat in one place. The AI answers first and hands over to your team when needed.</p>
          </div>
          <div className="ibx-header-links">
            <Link to="/whatsapp" className="btn btn-secondary btn-sm"><RiWhatsappLine /> WhatsApp setup</Link>
            <Link to="/widget-settings" className="btn btn-secondary btn-sm"><RiSettings3Line /> Website chat setup</Link>
          </div>
        </div>
      </div>

      {waTokenProblem && (
        <div className="ibx-banner" role="alert">
          <RiErrorWarningLine />
          {waTokenProblem === 'managed' ? (
            <span><strong>WhatsApp replies have paused.</strong> BizlyAI's team has been alerted and is fixing the connection. New messages still arrive here.</span>
          ) : (
            <>
              <span><strong>WhatsApp replies have stopped.</strong> Meta no longer accepts your access token, so WhatsApp customers won't receive answers. New messages still arrive here.</span>
              <Link to="/whatsapp" className="btn btn-sm btn-primary">Fix it</Link>
            </>
          )}
        </div>
      )}

      <div className={`ibx-layout card ${activeId ? 'has-active' : ''} ${showProfile ? 'show-profile' : ''}`}>
        {/* LEFT — conversation list */}
        <div className="ibx-list-panel">
          <div className="ibx-search">
            <RiSearchLine />
            <input placeholder="Search name, phone or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ibx-filters">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} className={`ibx-filter ${status === f.id ? 'active' : ''}`} onClick={() => setStatus(f.id)}>
                {f.label}
                {f.id === 'unclaimed' && counts.unclaimed > 0 && <span className="ibx-filter-badge">{counts.unclaimed}</span>}
              </button>
            ))}
          </div>
          {channelList.length > 1 && (
            <div className="ibx-filters ibx-channels">
              <button className={`ibx-filter ${channel === 'all' ? 'active' : ''}`} onClick={() => setChannel('all')}>All channels</button>
              {channelList.map((k) => (
                <button key={k} className={`ibx-filter ${channel === k ? 'active' : ''}`} onClick={() => setChannel(k)}>
                  <ChannelIcon channel={k} size={13} /> {CHANNELS[k].label}
                </button>
              ))}
            </div>
          )}

          {listLoading ? (
            <div className="ibx-loading"><RiLoader4Line className="spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="ibx-empty">
              <RiInboxLine />
              <p>{counts.all === 0 ? 'No customer chats yet. Connect WhatsApp or add the chat widget to your website to start.' : 'Nothing matches this filter.'}</p>
            </div>
          ) : (
            <div className="ibx-conv-list">
              {conversations.map((c) => {
                const m = statusMeta(c);
                return (
                  <button key={c._id} className={`ibx-conv ${activeId === c._id ? 'active' : ''}`} onClick={() => openConversation(c._id)}>
                    <div className={`ibx-conv-avatar ${m.cls}`}>
                      {(c.displayName || '?')[0].toUpperCase()}
                      <span className="ibx-conv-channel"><ChannelIcon channel={c.channel} size={12} /></span>
                    </div>
                    <div className="ibx-conv-body">
                      <div className="ibx-conv-top">
                        <span className="ibx-conv-name">{fmtPhone(c.displayName)}</span>
                        <span className="ibx-conv-time">{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <div className="ibx-conv-bottom">
                        <span className="ibx-conv-preview">{c.lastMessage}</span>
                        {c.unread > 0 && <span className="ibx-unread">{c.unread}</span>}
                      </div>
                      <div className="ibx-conv-tags">
                        <span className={`ibx-badge ${m.cls}`}>{m.label}</span>
                        {c.assignedTo && <span className="ibx-assignee">{c.assignedTo.name}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MIDDLE — thread */}
        <div className="ibx-thread-panel">
          {!activeId ? (
            <div className="ibx-thread-empty">
              <RiCustomerService2Line />
              <h3>Select a conversation</h3>
              <p>WhatsApp and website chats land here. Take over any chat with one click.</p>
            </div>
          ) : convoLoading || !convo ? (
            <div className="ibx-loading"><RiLoader4Line className="spin" /></div>
          ) : (
            <>
              <div className="ibx-thread-header">
                <button className="ibx-back btn btn-ghost btn-icon" aria-label="Back to list" onClick={() => { setActiveId(null); setConvo(null); setShowProfile(false); }}>
                  <RiArrowLeftLine />
                </button>
                <div className="ibx-thread-title">
                  <div className="ibx-thread-name"><ChannelIcon channel={convo.channel} size={16} /> {fmtPhone(name)}</div>
                  <div className="ibx-thread-sub">
                    <span>{CHANNELS[convo.channel]?.label}</span>
                    {convo.phone && <span><RiPhoneLine /> {fmtPhone(convo.phone)}</span>}
                    {convo.email && <span><RiMailLine /> {convo.email}</span>}
                    {convo.meta?.originHost && <span><RiGlobalLine /> {convo.meta.originHost}</span>}
                    <span className={`ibx-badge ${statusMeta(convo).cls}`}>{statusMeta(convo).label}</span>
                    {convo.assignedTo?.name && <span>· {convo.assignedTo.name}</span>}
                  </div>
                </div>
                <div className="ibx-thread-actions">
                  {convo.status !== 'resolved' && !(convo.status === 'human' && assignedId) && (
                    <button className="btn btn-sm btn-primary" disabled={busy}
                      onClick={() => runAction(() => inboxService.takeover(convo._id), 'You took over this chat')}>
                      <RiHand /> Take over
                    </button>
                  )}
                  {convo.status === 'human' && assignedToMe && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => inboxService.sendToAI(convo._id), 'Handed back to the AI')}>
                      <RiRobot2Line /> Back to AI
                    </button>
                  )}
                  {convo.status !== 'resolved' && (convo.status !== 'human' || !assignedId || assignedToMe) && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => inboxService.resolve(convo._id), 'Marked resolved')}>
                      <RiCheckDoubleLine /> Resolve
                    </button>
                  )}
                  {convo.status === 'resolved' && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => inboxService.sendToAI(convo._id), 'Reopened for the AI')}>
                      <RiRobot2Line /> Reopen
                    </button>
                  )}
                  <button className="btn btn-sm btn-secondary ibx-profile-toggle" onClick={() => setShowProfile((v) => !v)}>
                    <RiUserHeartLine /> Customer
                  </button>
                </div>
              </div>

              <div className="ibx-messages">
                {convo.messages.map((msg, i) => {
                  if (msg.from === 'system') {
                    return (
                      <div key={msg._id || i} className="ibx-system">
                        {msg.notice ? `Sent to customer: ${msg.content}` : msg.content}
                        {msg.delivered === false && <span className="ibx-undelivered"> · not delivered</span>}
                      </div>
                    );
                  }
                  const side = msg.from === 'customer' ? 'in' : 'out';
                  return (
                    <div key={msg._id || i} className={`ibx-msg ${side}`}>
                      <div className={`ibx-bubble ${msg.from} ${msg.temp ? 'sending' : ''}`}>
                        {msg.from === 'ai' && <span className="ibx-msg-label"><RiRobot2Line /> {msg.followUp ? 'AI follow-up' : 'AI Assistant'}</span>}
                        {msg.from === 'human' && <span className="ibx-msg-label"><RiUser3Line /> {msg.agentName || 'Team'}</span>}
                        <div className="ibx-msg-text">{msg.content}</div>
                        <span className="ibx-msg-time">
                          {msg.delivered === false && <span className="ibx-undelivered" title="The channel could not deliver this message"><RiErrorWarningLine /> not delivered · </span>}
                          {fmtTime(msg.timestamp)}
                        </span>
                        {msg.sources?.length > 0 && <span className="ibx-msg-sources">From: {msg.sources.join(', ')}</span>}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {canType ? (
                <form className="ibx-input" onSubmit={send}>
                  <input
                    placeholder={`Reply to ${fmtPhone(name)} on ${CHANNELS[convo.channel]?.label || convo.channel}…`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  />
                  <button type="submit" className="btn btn-primary" aria-label="Send" disabled={!input.trim() || sending}>
                    {sending ? <RiLoader4Line className="spin" /> : <RiSendPlane2Line />}
                  </button>
                </form>
              ) : (
                <div className="ibx-input-locked">
                  {convo.status === 'resolved'
                    ? 'This conversation is resolved. It reopens if the customer writes again.'
                    : convo.status === 'ai'
                      ? 'The AI is handling this conversation. Take over to reply yourself.'
                      : `${convo.assignedTo?.name || 'A teammate'} is handling this conversation.`}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — customer profile */}
        {activeId && convo && (
          <aside className="ibx-profile-panel">
            <div className="ibx-profile-head">
              <h3>Customer</h3>
              <button className="btn btn-ghost btn-icon ibx-profile-close" aria-label="Close" onClick={() => setShowProfile(false)}><RiCloseLine /></button>
            </div>
            {!profile?.contact ? (
              <p className="ibx-muted">
                {convo.channel === 'widget'
                  ? 'Anonymous visitor. Once they share an email or phone number, their history from every channel shows up here.'
                  : 'No profile yet.'}
              </p>
            ) : (
              <>
                <div className="ibx-profile-card">
                  <div className="ibx-profile-name">{fmtPhone(profile.contact.name)}</div>
                  {profile.contact.phone && <div className="ibx-profile-line"><RiPhoneLine /> {fmtPhone(profile.contact.phone)}</div>}
                  {profile.contact.email && <div className="ibx-profile-line"><RiMailLine /> {profile.contact.email}</div>}
                  <div className="ibx-profile-line ibx-profile-channels">
                    {profile.contact.channels.map((ch) => <span key={ch} className="ibx-chip"><ChannelIcon channel={ch} size={12} /> {CHANNELS[ch]?.label || ch}</span>)}
                  </div>
                  <div className="ibx-muted ibx-small">First contact {fmtDate(profile.contact.firstSeenAt)}</div>
                </div>

                <div className="ibx-profile-section">
                  <h4>Purchases</h4>
                  {profile.customer ? (
                    <div className="ibx-kv">
                      <span>Orders</span><strong>{profile.customer.totalOrders}</strong>
                      <span>Total spent</span><strong>{formatMoney(profile.customer.totalSpent)}</strong>
                      <span>Last order</span><strong>{fmtDate(profile.customer.lastOrderAt)}</strong>
                    </div>
                  ) : <p className="ibx-muted">No purchases recorded yet.</p>}
                </div>

                <div className="ibx-profile-section">
                  <h4>Sales lead</h4>
                  {profile.lead ? (
                    <Link to={`/leads/${profile.lead._id}`} className="ibx-lead-link">
                      <div className="ibx-kv">
                        <span>Stage</span><strong>{stageLabel(profile.lead.status)}</strong>
                        {profile.lead.interestedIn?.length > 0 && (<><span>Wants</span><strong>{profile.lead.interestedIn.slice(-3).join(', ')}</strong></>)}
                        {profile.lead.value > 0 && (<><span>Value</span><strong>{formatMoney(profile.lead.value)}</strong></>)}
                        {profile.lead.nextFollowUpAt && (<><span>Follow up</span><strong>{fmtDate(profile.lead.nextFollowUpAt)}</strong></>)}
                      </div>
                      <RiArrowRightSLine />
                    </Link>
                  ) : <p className="ibx-muted">Not a lead yet.</p>}
                </div>

                {convo.sales?.stage && (
                  <div className="ibx-profile-section">
                    <h4>Buying signal <span className="ibx-muted ibx-small">(AI)</span></h4>
                    <div className="ibx-kv">
                      <span>Now</span><strong>{BUYING_SIGNAL[convo.sales.stage] || convo.sales.stage}</strong>
                      {convo.sales.products?.length > 0 && (<><span>Asked about</span><strong>{convo.sales.products.join(', ')}</strong></>)}
                      {convo.followUp?.sentAt && (<><span>Followed up</span><strong>{fmtDate(convo.followUp.sentAt)}</strong></>)}
                    </div>
                    {convo.sales.summary && <p className="ibx-muted ibx-small" style={{ marginTop: 6 }}>{convo.sales.summary}</p>}
                  </div>
                )}

                {profile.otherConversations.length > 0 && (
                  <div className="ibx-profile-section">
                    <h4>Other chats</h4>
                    {profile.otherConversations.map((o) => (
                      <button key={o._id} className="ibx-other" onClick={() => openConversation(o._id)}>
                        <ChannelIcon channel={o.channel} size={14} />
                        <span className="ibx-other-text">{o.lastMessage || CHANNELS[o.channel]?.label}</span>
                        <span className="ibx-conv-time">{fmtTime(o.lastMessageAt)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="ibx-profile-section">
                  <h4>Notes</h4>
                  <textarea
                    className="ibx-notes"
                    rows={4}
                    placeholder="Anything the team should remember about this customer…"
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                    onBlur={saveNotes}
                  />
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
