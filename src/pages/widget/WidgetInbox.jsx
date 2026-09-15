import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { widgetService } from '../../services';
import { API_ORIGIN } from '../../services/api';
import { io } from 'socket.io-client';
import {
  RiChat3Line, RiSearchLine, RiSendPlane2Line, RiLoader4Line,
  RiRobot2Line, RiUser3Line, RiCustomerService2Line, RiCheckDoubleLine,
  RiHand, RiArrowLeftLine, RiGlobalLine, RiTimeLine, RiMailLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './WidgetInbox.css';

const SOCKET_URL = API_ORIGIN || 'http://localhost:5000';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'needs_human', label: 'Needs Human' },
  { id: 'resolved', label: 'Resolved' },
];

const statusMeta = (c) => {
  if (c.isResolved) return { label: 'Resolved', cls: 'resolved' };
  if (c.handedToHuman) return { label: 'Needs human', cls: 'human' };
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

export default function WidgetInbox() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;

  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ totalToday: 0, activeNow: 0, needsHuman: 0, resolved: 0 });
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

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await widgetService.getConversations({ filter, search: search || undefined });
      setConversations(data.data);
      if (data.counts) setCounts(data.counts);
    } catch { toast.error('Failed to load conversations'); }
    finally { setListLoading(false); }
  }, [filter, search]);

  const loadRef = useRef(loadConversations);
  useEffect(() => { loadRef.current = loadConversations; }, [loadConversations]);
  const openRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(loadConversations, 200);
    return () => clearTimeout(t);
  }, [loadConversations]);

  // Socket — real-time updates for new widget messages / handovers
  useEffect(() => {
    if (!companyId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join_company', companyId);
      socket.emit('join_user', user._id);
    });
    socket.on('widget:handover_needed', (p) => {
      toast(`🙋 A website visitor needs a human`, { icon: '⚠️', duration: 5000 });
      loadRef.current?.();
    });
    socket.on('widget:new_message', (p) => {
      loadRef.current?.();
      if (String(p.conversationId) === String(activeIdRef.current)) openRef.current?.(activeIdRef.current, true);
    });
    socket.on('widget:conversation_updated', (p) => {
      loadRef.current?.();
      if (String(p.conversationId) === String(activeIdRef.current)) openRef.current?.(activeIdRef.current, true);
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convo?.messages?.length]);

  async function openConversation(id, silent = false) {
    setActiveId(id);
    if (!silent) { setConvo(null); setConvoLoading(true); }
    try {
      const { data } = await widgetService.getConversation(id);
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
    const optimistic = { _id: `t-${Date.now()}`, role: 'assistant', sentBy: 'human', content: text, agentName: user.name, timestamp: new Date().toISOString(), temp: true };
    setConvo((c) => ({ ...c, messages: [...c.messages, optimistic] }));
    try {
      const { data } = await widgetService.humanReply(convo._id, text);
      setConvo((c) => ({ ...c, messages: c.messages.map((m) => (m._id === optimistic._id ? data.data : m)) }));
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
  const canType = convo?.handedToHuman && !convo?.isResolved && assignedToMe;

  return (
    <div className="wgt-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiChat3Line style={{ color: 'var(--color-brand)' }} /> Website Chat Inbox</h1>
            <p>AI-answered visitor chat from your embedded website widget</p>
          </div>
        </div>
        <div className="wgt-stats">
          <div className="wgt-stat"><span className="s-value">{counts.totalToday}</span><span className="s-label">Chats today</span></div>
          <div className="wgt-stat"><span className="s-value">{counts.activeNow}</span><span className="s-label">Active now</span></div>
          <div className="wgt-stat warn"><span className="s-value">{counts.needsHuman}</span><span className="s-label">Needs human</span></div>
          <div className="wgt-stat"><span className="s-value">{counts.resolved}</span><span className="s-label">Resolved</span></div>
        </div>
      </div>

      <div className={`wgt-layout card ${activeId ? 'has-active' : ''}`}>
        {/* LEFT — list */}
        <div className="wgt-list-panel">
          <div className="wgt-search">
            <RiSearchLine />
            <input placeholder="Search visitors…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="wgt-filters">
            {FILTERS.map((f) => (
              <button key={f.id} className={`wgt-filter ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
                {f.id === 'needs_human' && counts.needsHuman > 0 && <span className="wgt-filter-badge">{counts.needsHuman}</span>}
              </button>
            ))}
          </div>

          {listLoading ? (
            <div className="wgt-loading"><RiLoader4Line className="spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="wgt-empty"><RiChat3Line /><p>No conversations yet</p></div>
          ) : (
            <div className="wgt-conv-list">
              {conversations.map((c) => {
                const m = statusMeta(c);
                return (
                  <button key={c._id} className={`wgt-conv ${activeId === c._id ? 'active' : ''}`} onClick={() => openConversation(c._id)}>
                    <div className={`wgt-conv-avatar ${m.cls}`}>{(c.displayName || '?')[0].toUpperCase()}</div>
                    <div className="wgt-conv-body">
                      <div className="wgt-conv-top">
                        <span className="wgt-conv-name">{c.displayName}</span>
                        <span className="wgt-conv-time">{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <div className="wgt-conv-bottom">
                        <span className="wgt-conv-preview">{c.lastMessage}</span>
                        {c.unread > 0 && <span className="wgt-unread">{c.unread}</span>}
                      </div>
                      <div className="wgt-conv-tags">
                        <span className={`wgt-badge ${m.cls}`}>{m.label}</span>
                        {c.assignedTo && <span className="wgt-assignee">{c.assignedTo.name}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — thread */}
        <div className="wgt-thread-panel">
          {!activeId ? (
            <div className="wgt-thread-empty">
              <RiCustomerService2Line />
              <h3>Select a conversation</h3>
              <p>Website visitor chats handled by AI, with one-click human takeover</p>
            </div>
          ) : convoLoading || !convo ? (
            <div className="wgt-loading"><RiLoader4Line className="spin" /></div>
          ) : (
            <>
              <div className="wgt-thread-header">
                <button className="wgt-back btn btn-ghost btn-icon" onClick={() => { setActiveId(null); setConvo(null); }}>
                  <RiArrowLeftLine />
                </button>
                <div className="wgt-thread-title">
                  <div className="wgt-thread-name">{convo.visitorName || `Visitor #${String(convo._id).slice(-4)}`}</div>
                  <div className="wgt-thread-sub">
                    {convo.visitorEmail && <span><RiMailLine /> {convo.visitorEmail}</span>}
                    {convo.originHost && <span><RiGlobalLine /> {convo.originHost}</span>}
                    <span><RiTimeLine /> Started {fmtTime(convo.createdAt)}</span>
                  </div>
                  <div className="wgt-thread-sub">
                    <span className={`wgt-badge ${statusMeta(convo).cls}`}>{statusMeta(convo).label}</span>
                    {convo.assignedTo && <span className="wgt-assignee">· {convo.assignedTo.name}</span>}
                    {convo.ipAddress && <span className="wgt-assignee">· IP {convo.ipAddress}</span>}
                  </div>
                </div>
                <div className="wgt-thread-actions">
                  {!convo.isResolved && (!convo.handedToHuman || !assignedToMe) && (
                    <button className="btn btn-sm btn-primary" disabled={busy}
                      onClick={() => runAction(() => widgetService.takeover(convo._id), 'You took over')}>
                      <RiHand /> Take Over
                    </button>
                  )}
                  {!convo.isResolved && convo.handedToHuman && assignedToMe && (
                    <>
                      <button className="btn btn-sm btn-secondary" disabled={busy}
                        onClick={() => runAction(() => widgetService.sendToAI(convo._id), 'Handed back to AI')}>
                        <RiRobot2Line /> Back to AI
                      </button>
                      <button className="btn btn-sm btn-secondary" disabled={busy}
                        onClick={() => runAction(() => widgetService.resolve(convo._id), 'Marked resolved')}>
                        <RiCheckDoubleLine /> Mark Resolved
                      </button>
                    </>
                  )}
                  {convo.isResolved && (
                    <button className="btn btn-sm btn-secondary" disabled={busy}
                      onClick={() => runAction(() => widgetService.sendToAI(convo._id), 'Reopened')}>
                      <RiRobot2Line /> Reopen
                    </button>
                  )}
                </div>
              </div>

              <div className="wgt-messages">
                {convo.messages.map((msg, i) => {
                  const side = msg.role === 'user' ? 'in' : 'out';
                  return (
                    <div key={msg._id || i} className={`wgt-msg ${side}`}>
                      <div className={`wgt-bubble ${msg.role === 'user' ? 'visitor' : msg.sentBy} ${msg.temp ? 'sending' : ''}`}>
                        {msg.role === 'assistant' && msg.sentBy === 'ai' && <span className="wgt-msg-label"><RiRobot2Line /> AI Assistant</span>}
                        {msg.role === 'assistant' && msg.sentBy === 'human' && <span className="wgt-msg-label"><RiUser3Line /> {msg.agentName || 'Agent'}</span>}
                        <div className="wgt-msg-text">{msg.content}</div>
                        <span className="wgt-msg-time">{fmtTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {canType ? (
                <form className="wgt-input" onSubmit={send}>
                  <input
                    placeholder={`Reply to ${convo.visitorName || 'visitor'}…`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
                    {sending ? <RiLoader4Line className="spin" /> : <RiSendPlane2Line />}
                  </button>
                </form>
              ) : (
                <div className="wgt-input-locked">
                  {convo.isResolved
                    ? 'This conversation is resolved'
                    : !convo.handedToHuman
                    ? '🤖 The AI is handling this conversation'
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
