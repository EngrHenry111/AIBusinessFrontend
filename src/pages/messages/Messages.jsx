import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services';
import { io } from 'socket.io-client';
import {
  RiSendPlane2Line, RiSearchLine, RiTeamLine,
  RiCircleFill, RiDeleteBinLine, RiRobot2Line,
  RiLoader4Line, RiEmotionLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Messages.css';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Setup Socket.io
  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_user', user._id);
    });

    // New message received
    socket.on('message:new', (msg) => {
      setConversations(prev => prev.map(c =>
        c.user._id === msg.senderId._id
          ? { ...c, lastMessage: msg, unreadCount: activeConv === msg.senderId._id ? 0 : c.unreadCount + 1 }
          : c
      ));
      if (activeConv === msg.senderId._id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    // Own sent message confirmation
    socket.on('message:sent', (msg) => {
      setConversations(prev => prev.map(c =>
        c.user._id === msg.recipientId
          ? { ...c, lastMessage: msg }
          : c
      ));
    });

    // Message deleted
    socket.on('message:deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    // Read receipts
    socket.on('messages:read', () => {
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    });

    // Typing
    socket.on('typing:start', (fromUser) => {
      if (fromUser._id === activeConv) setTyping(true);
    });
    socket.on('typing:stop', ({ fromUserId }) => {
      if (fromUserId === activeConv) setTyping(false);
    });

    return () => socket.disconnect();
  }, [user._id]);

  // Update activeConv ref for socket handlers
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off('message:new');
    socket.on('message:new', (msg) => {
      setConversations(prev => prev.map(c =>
        c.user._id === msg.senderId._id
          ? { ...c, lastMessage: msg, unreadCount: activeConv === msg.senderId._id ? 0 : c.unreadCount + 1 }
          : c
      ));
      if (activeConv === msg.senderId._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      } else {
        toast(`💬 ${msg.senderId.name}: ${msg.content.slice(0, 40)}`, { duration: 3000 });
      }
    });
  }, [activeConv]);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const { data } = await messageService.getConversations();
      setConversations(data.data);
    } catch { toast.error('Failed to load conversations'); }
    finally { setLoading(false); }
  }

  async function openConversation(conv) {
    setActiveConv(conv.user._id);
    setOtherUser(conv.user);
    setTyping(false);
    setMessages([]);

    // Mark as read
    setConversations(prev => prev.map(c =>
      c.user._id === conv.user._id ? { ...c, unreadCount: 0 } : c
    ));

    try {
      const { data } = await messageService.getConversation(conv.user._id);
      setMessages(data.data.messages);
    } catch { toast.error('Failed to load messages'); }

    inputRef.current?.focus();
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!input.trim() || !activeConv || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Stop typing indicator
    socketRef.current?.emit('typing:stop', { toUserId: activeConv, fromUserId: user._id });

    // Optimistic update
    const optimistic = {
      _id: `temp-${Date.now()}`,
      senderId: { _id: user._id, name: user.name, avatar: user.avatar },
      recipientId: activeConv,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
      temp: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data } = await messageService.sendMessage(activeConv, content);
      setMessages(prev => prev.map(m => m._id === optimistic._id ? data.data : m));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setInput(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleTyping(e) {
    setInput(e.target.value);
    if (!activeConv || !socketRef.current) return;

    socketRef.current.emit('typing:start', { toUserId: activeConv, fromUser: { _id: user._id, name: user.name } });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { toUserId: activeConv, fromUserId: user._id });
    }, 1500);
  }

  async function handleDelete(messageId) {
    try {
      await messageService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch { toast.error('Failed to delete'); }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const filtered = conversations.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const fmtTime = (dt) => {
    const d = new Date(dt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isMe = (msg) => msg.senderId._id === user._id || msg.senderId === user._id;

  return (
    <div className="messages-page fade-in">
      <div className="messages-layout">
        {/* Left panel — conversation list */}
        <div className="conv-panel">
          <div className="conv-header">
            <h2>
              Messages
              {totalUnread > 0 && <span className="unread-total">{totalUnread}</span>}
            </h2>
          </div>
          <div className="conv-search">
            <RiSearchLine />
            <input
              placeholder="Search team members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="conv-loading"><RiLoader4Line className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="conv-empty">
              <RiTeamLine />
              <p>No team members yet</p>
              <span>Invite members from the Team page</span>
            </div>
          ) : (
            <div className="conv-list">
              {filtered.map(conv => (
                <button
                  key={conv.user._id}
                  className={`conv-item ${activeConv === conv.user._id ? 'active' : ''}`}
                  onClick={() => openConversation(conv)}
                >
                  <div className="conv-avatar">
                    {conv.user.avatar
                      ? <img src={conv.user.avatar} alt={conv.user.name} />
                      : <span>{conv.user.name[0]?.toUpperCase()}</span>
                    }
                    <div className="conv-status-dot online" />
                  </div>
                  <div className="conv-info">
                    <div className="conv-name-row">
                      <span className="conv-name">{conv.user.name}</span>
                      {conv.lastMessage && (
                        <span className="conv-time">{fmtTime(conv.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <div className="conv-preview-row">
                      <span className="conv-preview">
                        {conv.lastMessage
                          ? `${conv.lastMessage.senderId === user._id ? 'You: ' : ''}${conv.lastMessage.content.slice(0, 40)}${conv.lastMessage.content.length > 40 ? '…' : ''}`
                          : conv.user.role?.replace('_', ' ')
                        }
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel — message thread */}
        <div className="thread-panel">
          {!activeConv ? (
            <div className="thread-empty">
              <RiRobot2Line />
              <h3>Select a conversation</h3>
              <p>Choose a team member from the left to start messaging</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="thread-header">
                <div className="thread-user-info">
                  <div className="thread-avatar">
                    {otherUser?.avatar
                      ? <img src={otherUser.avatar} alt={otherUser.name} />
                      : <span>{otherUser?.name[0]?.toUpperCase()}</span>
                    }
                    <div className="conv-status-dot online" />
                  </div>
                  <div>
                    <div className="thread-name">{otherUser?.name}</div>
                    <div className="thread-role">
                      {typing ? (
                        <span className="typing-indicator">typing...</span>
                      ) : (
                        otherUser?.role?.replace('_', ' ')
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="thread-messages">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <RiEmotionLine />
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const mine = isMe(msg);
                    const showDate = i === 0 ||
                      new Date(msg.createdAt).toDateString() !== new Date(messages[i-1].createdAt).toDateString();

                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="date-divider">
                            <span>{new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        <div className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                          {!mine && (
                            <div className="msg-avatar">
                              {otherUser?.avatar
                                ? <img src={otherUser.avatar} alt={otherUser.name} />
                                : <span>{otherUser?.name[0]?.toUpperCase()}</span>
                              }
                            </div>
                          )}
                          <div className={`message-bubble ${mine ? 'mine' : 'theirs'} ${msg.temp ? 'sending' : ''}`}>
                            <div className="message-content">{msg.content}</div>
                            <div className="message-meta">
                              <span className="message-time">{fmtTime(msg.createdAt)}</span>
                              {mine && (
                                <span className="message-read">{msg.isRead ? '✓✓' : '✓'}</span>
                              )}
                            </div>
                            {mine && !msg.temp && (
                              <button className="msg-delete" onClick={() => handleDelete(msg._id)}>
                                <RiDeleteBinLine />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {typing && (
                  <div className="message-row theirs">
                    <div className="msg-avatar">
                      <span>{otherUser?.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="message-bubble theirs typing-bubble">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="thread-input" onSubmit={handleSend}>
                <input
                  ref={inputRef}
                  className="message-input"
                  placeholder={`Message ${otherUser?.name}...`}
                  value={input}
                  onChange={handleTyping}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!input.trim() || sending}
                >
                  {sending ? <RiLoader4Line className="spin" /> : <RiSendPlane2Line />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
