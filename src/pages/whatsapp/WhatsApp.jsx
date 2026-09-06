import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { whatsappService } from '../../services';
import { API_ORIGIN } from '../../services/api';
import { io } from 'socket.io-client';
import {
  RiWhatsappLine, RiSearchLine, RiSendPlane2Line, RiLoader4Line,
  RiRobot2Line, RiUser3Line, RiCustomerService2Line, RiCheckDoubleLine,
  RiLink, RiLinkUnlink, RiRefreshLine, RiHand, RiArrowLeftLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './WhatsApp.css';

const SOCKET_URL = API_ORIGIN || 'http://localhost:5000';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI Active' },
  { id: 'human', label: 'Needs Human' },
  { id: 'resolved', label: 'Resolved' },
];

const statusMeta = (s) => ({
  ai: { label: 'AI', cls: 'ai' },
  active: { label: 'AI', cls: 'ai' },
  human_takeover: { label: 'Needs human', cls: 'human' },
  resolved: { label: 'Resolved', cls: 'resolved' },
}[s] || { label: s, cls: 'ai' });

const fmtPhone = (p) => (p ? (p.startsWith('+') ? p : `+${p}`) : '');
const fmtTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const today = d.toDateString() === new Date().toDateString();
  return today
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function WhatsApp() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;

  const [waStatus, setWaStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [waError, setWaError] = useState(null);
  const [waPhone, setWaPhone] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ all: 0, ai: 0, human: 0, resolved: 0, unclaimed: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);

  const [activeId, setActiveId] = useState(null);
  const [convo, setConvo] = useState(null);
  const [convoLoading, setConvoLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  const socketRef = useRef(null);
  const activeIdRef = useRef(null);
  const endRef = useRef(null);

  activeIdRef.current = activeId;

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await whatsappService.getStatus();
      setWaStatus(data.data.status);
      setQr(data.data.qr || null);
      setWaError(data.data.error || null);
      setWaPhone(data.data.phone || null);
    } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await whatsappService.getConversations({ filter, search: search || undefined });
      setConversations(data.data);
      if (data.counts) setCounts(data.counts);
    } catch { toast.error('Failed to load conversations'); }
    finally { setListLoading(false); }
  }, [filter, search]);

  // Keep a stable handle to the latest loader for socket callbacks
  const loadRef = useRef(loadConversations);
  useEffect(() => { loadRef.current = loadConversations; }, [loadConversations]);
  const openRef = useRef(null);

  // Initial load + polling fallback for connection status
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const t = setTimeout(loadConversations, 200);
    return () => clearTimeout(t);
  }, [loadConversations]);
  useEffect(() => {
    if (waStatus === 'connected' || waStatus === 'disconnected') return;
    const iv = setInterval(loadStatus, 4000);
    return () => clearInterval(iv);
  }, [waStatus, loadStatus]);

  // Socket
  useEffect(() => {
    if (!companyId) return;
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('whatsapp:join', companyId);
      socket.emit('join_user', user._id);
    });
    socket.on('whatsapp:qr', (p) => { setQr(p.qr); setWaStatus('qr_ready'); });
    socket.on('whatsapp:status', (p) => {
      setWaStatus(p.status);
      setWaError(p.error || null);
      if (p.status === 'connected') { setQr(null); setWaPhone(p.phone || null); toast.success('WhatsApp connected'); }
    });
    socket.on('whatsapp:handover_needed', (p) => {
      toast(`🙋 ${p.customerName || p.customerPhone} needs a human`, { icon: '⚠️', duration: 5000 });
      loadRef.current?.();
    });
    socket.on('whatsapp:new_message', (p) => {
      if (String(p.conversationId) === String(activeIdRef.current)) {
        setConvo((c) => (c ? { ...c, messages: [...c.messages, p.message] } : c));
      }
      loadRef.current?.();
    });
    socket.on('whatsapp:conversation_claimed', () => loadRef.current?.());
    socket.on('whatsapp:conversation_updated', (p) => {
      loadRef.current?.();
      if (String(p.conversationId) === String(activeIdRef.current)) openRef.current?.(activeIdRef.current, true);
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convo?.messages?.length]);

  async function connect() {
    setConnecting(true);
    try {
      const { data } = await whatsappService.initialize();
      setWaStatus(data.data?.status || 'connecting');
      toast('Starting WhatsApp — scan the QR code', { icon: '📱' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start WhatsApp');
    } finally { setConnecting(false); }
  }

  async function disconnectWa() {
    if (!window.confirm('Disconnect this WhatsApp number?')) return;
    try {
      await whatsappService.disconnect();
      setWaStatus('disconnected'); setQr(null); setWaPhone(null);
      toast.success('WhatsApp disconnected');
    } catch { toast.error('Failed to disconnect'); }
  }

  async function openConversation(id, silent = false) {
    setActiveId(id);
    if (!silent) { setConvo(null); setConvoLoading(true); }
    try {
      const { data } = await whatsappService.getConversation(id);
      setConvo(data.data);
      setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
    } catch { toast.error('Failed to open conversation'); }
    finally { setConvoLoading(false); }
  }
  openRef.current = openConversation;

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !convo) return;
    setInput('');
    setSending(true);
    const optimistic = { _id: `t-${Date.now()}`, from: 'human', content: text, agentName: user.name, timestamp: new Date().toISOString(), temp: true };
    setConvo((c) => ({ ...c, messages: [...c.messages, optimistic] }));
    try {
      const { data } = await whatsappService.sendMessage(convo._id, text);
      setConvo((c) => ({ ...c, messages: c.messages.map((m) => (m._id === optimistic._id ? data.data.message : m)) }));
      if (!data.data.delivered) toast.error('Saved, but WhatsApp delivery failed (not connected?)');
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

  const assignedToMe = convo?.assignedTo && String(convo.assignedTo._id || convo.assignedTo) === String(user._id);
  const canType = convo?.status === 'human_takeover' && assignedToMe;
  const filtered = conversations;
  const connected = waStatus === 'connected';

  return (
    <div className="wa-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiWhatsappLine style={{ color: '#25D366' }} /> WhatsApp</h1>
            <p>AI-answered customer chat with human handover</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { loadStatus(); loadConversations(); }}>
            <RiRefreshLine /> Refresh
          </button>
        </div>
      </div>

      {/* Connection panel */}
      {!connected ? (
        <div className="wa-connect card card-pad">
          <div className="wa-connect-info">
            <div className={`wa-status-dot ${waStatus}`} />
            <div>
              <strong>
                {waStatus === 'qr_ready' ? 'Scan the QR code'
                  : waStatus === 'connecting' ? 'Starting WhatsApp…'
                  : waStatus === 'error' ? 'Connection error'
                  : 'WhatsApp not connected'}
              </strong>
              <p>
                {waError || (waStatus === 'qr_ready'
                  ? 'Open WhatsApp on your phone → Linked devices → Link a device'
                  : 'Connect your business WhatsApp number so the AI can reply to customers.')}
              </p>
            </div>
          </div>
          <div className="wa-connect-action">
            {qr && waStatus === 'qr_ready' ? (
              <img className="wa-qr" src={qr} alt="WhatsApp QR code" />
            ) : (
              <button className="btn btn-primary" onClick={connect} disabled={connecting || waStatus === 'connecting'}>
                {connecting || waStatus === 'connecting' ? <RiLoader4Line className="spin" /> : <RiLink />}
                {waStatus === 'error' ? 'Retry connection' : 'Connect WhatsApp'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="wa-connected card">
          <span className="wa-status-dot connected" />
          <span>Connected{waPhone ? ` · +${waPhone}` : ''}</span>
          <button className="btn btn-sm btn-secondary" onClick={disconnectWa}><RiLinkUnlink /> Disconnect</button>
        </div>
      )}

      {/* Two-panel */}
      <div className={`wa-layout card ${activeId ? 'has-active' : ''}`}>
        {/* LEFT — list */}
        <div className="wa-list-panel">
          <div className="wa-search">
            <RiSearchLine />
            <input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="wa-filters">
            {FILTERS.map((f) => (
              <button key={f.id} className={`wa-filter ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
                {f.id === 'human' && counts.human > 0 && <span className="wa-filter-badge">{counts.human}</span>}
              </button>
            ))}
          </div>

          {listLoading ? (
            <div className="wa-loading"><RiLoader4Line className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="wa-empty"><RiWhatsappLine /><p>No conversations</p></div>
          ) : (
            <div className="wa-conv-list">
              {filtered.map((c) => {
                const m = statusMeta(c.status);
                const needsHuman = c.status === 'human_takeover' && !c.assignedTo;
                return (
                  <button key={c._id} className={`wa-conv ${activeId === c._id ? 'active' : ''}`} onClick={() => openConversation(c._id)}>
                    <div className={`wa-conv-avatar ${m.cls}`}>{(c.customerName || '?')[0].toUpperCase()}</div>
                    <div className="wa-conv-body">
                      <div className="wa-conv-top">
                        <span className="wa-conv-name">{c.customerName || fmtPhone(c.customerPhone)}</span>
                        <span className="wa-conv-time">{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <div className="wa-conv-bottom">
                        <span className="wa-conv-preview">{c.lastMessage || fmtPhone(c.customerPhone)}</span>
                        {c.unread > 0 && <span className="wa-unread">{c.unread}</span>}
                      </div>
                      <div className="wa-conv-tags">
                        <span className={`wa-badge ${needsHuman ? 'human' : m.cls}`}>{needsHuman ? 'Needs human' : m.label}</span>
                        {c.assignedTo && <span className="wa-assignee">{c.assignedTo.name}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — thread */}
        <div className="wa-thread-panel">
          {!activeId ? (
            <div className="wa-thread-empty">
              <RiCustomerService2Line />
              <h3>Select a conversation</h3>
              <p>Customer chats handled by AI, with one-click human takeover</p>
            </div>
          ) : convoLoading || !convo ? (
            <div className="wa-loading"><RiLoader4Line className="spin" /></div>
          ) : (
            <>
              <div className="wa-thread-header">
                <button className="wa-back btn btn-ghost btn-icon" onClick={() => { setActiveId(null); setConvo(null); }}>
                  <RiArrowLeftLine />
                </button>
                <div>
                  <div className="wa-thread-name">{convo.customerName || fmtPhone(convo.customerPhone)}</div>
                  <div className="wa-thread-sub">
                    {fmtPhone(convo.customerPhone)}
                    <span className={`wa-badge ${statusMeta(convo.status).cls}`}>{statusMeta(convo.status).label}</span>
                    {convo.assignedTo && <span className="wa-assignee">· {convo.assignedTo.name}</span>}
                  </div>
                </div>
                <div className="wa-thread-actions">
                  {convo.status === 'human_takeover' && !assignedToMe && (
                    <button className="btn btn-sm btn-primary" disabled={busy}
                      onClick={() => runAction(() => whatsappService.takeover(convo._id), 'You took over')}>
                      <RiHand /> Take Over
                    </button>
                  )}
                  {convo.status === 'human_takeover' && assignedToMe && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => whatsappService.resolve(convo._id), 'Marked resolved')}>
                      <RiCheckDoubleLine /> Mark Resolved
                    </button>
                  )}
                  {convo.status !== 'ai' && convo.status !== 'active' && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => whatsappService.sendToAI(convo._id), 'Handed back to AI')}>
                      <RiRobot2Line /> Send to AI
                    </button>
                  )}
                </div>
              </div>

              <div className="wa-messages">
                {convo.messages.map((msg, i) => {
                  if (msg.from === 'system') {
                    return <div key={msg._id || i} className="wa-system">{msg.content}</div>;
                  }
                  const side = msg.from === 'customer' ? 'in' : 'out';
                  return (
                    <div key={msg._id || i} className={`wa-msg ${side}`}>
                      <div className={`wa-bubble ${msg.from} ${msg.temp ? 'sending' : ''}`}>
                        {msg.from === 'ai' && <span className="wa-msg-label"><RiRobot2Line /> AI Assistant</span>}
                        {msg.from === 'human' && <span className="wa-msg-label"><RiUser3Line /> {msg.agentName || 'Agent'}</span>}
                        <div className="wa-msg-text">{msg.content}</div>
                        <span className="wa-msg-time">{fmtTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {canType ? (
                <form className="wa-input" onSubmit={send}>
                  <input
                    placeholder={`Reply to ${convo.customerName || 'customer'}…`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
                    {sending ? <RiLoader4Line className="spin" /> : <RiSendPlane2Line />}
                  </button>
                </form>
              ) : (
                <div className="wa-input-locked">
                  {convo.status === 'ai' || convo.status === 'active'
                    ? '🤖 The AI is handling this conversation'
                    : convo.status === 'resolved'
                    ? 'This conversation is resolved'
                    : convo.assignedTo
                    ? `Assigned to ${convo.assignedTo.name} — take over to reply`
                    : 'Take over this conversation to reply'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
