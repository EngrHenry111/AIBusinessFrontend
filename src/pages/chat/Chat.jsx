import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '../../services';
import ReactMarkdown from 'react-markdown';
import {
  RiSendPlane2Line, RiAddLine, RiDeleteBinLine, RiThumbUpLine, RiThumbDownLine,
  RiFileLine, RiRobot2Line, RiUserLine, RiCopperCoinLine, RiRefreshLine,
  RiSearchLine, RiArchiveLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Chat.css';

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => {
    if (chatId) loadChat(chatId);
    else setCurrentChat(null);
  }, [chatId]);
  useEffect(() => { scrollToBottom(); }, [currentChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function loadChats() {
    try {
      const { data } = await chatService.getAll({ limit: 30 });
      setChats(data.data);
    } catch {} finally { setLoadingChats(false); }
  }

  async function loadChat(id) {
    try {
      const { data } = await chatService.getOne(id);
      setCurrentChat(data.data);
    } catch {
      navigate('/chat');
    }
  }

  const handleNewChat = async () => {
    try {
      const { data } = await chatService.create({ title: 'New conversation' });
      setChats(prev => [data.data, ...prev]);
      navigate(`/chat/${data.data._id}`);
    } catch { toast.error('Failed to create conversation'); }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    // Optimistically add user message
    const optimisticMsg = { role: 'user', content: question, _id: Date.now() };
    if (currentChat) {
      setCurrentChat(prev => ({ ...prev, messages: [...prev.messages, optimisticMsg] }));
    }

    try {
      const { data } = await chatService.ask({
        question,
        chatId: currentChat?._id || chatId,
      });

      if (!currentChat) {
        navigate(`/chat/${data.chatId}`);
        await loadChats();
      } else {
        await loadChat(data.chatId);
        await loadChats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get answer');
      // Remove optimistic message
      if (currentChat) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages.filter(m => m._id !== optimisticMsg._id),
        }));
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleFeedback = async (msgIndex, feedback) => {
    if (!currentChat) return;
    try {
      await chatService.feedback(currentChat._id, msgIndex, feedback);
      setCurrentChat(prev => ({
        ...prev,
        messages: prev.messages.map((m, i) => i === msgIndex ? { ...m, feedback } : m),
      }));
    } catch { toast.error('Failed to record feedback'); }
  };

  const handleDeleteChat = async (id) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await chatService.delete(id);
      setChats(prev => prev.filter(c => c._id !== id));
      if (currentChat?._id === id) navigate('/chat');
      toast.success('Conversation deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filteredChats = chats.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ConfidenceBadge = ({ confidence }) => {
    if (!confidence) return null;
    const cls = confidence >= 70 ? 'high' : confidence >= 40 ? 'mid' : 'low';
    const label = confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low';
    return (
      <div className="confidence-display">
        <span className="confidence-label">Confidence: <strong>{label}</strong> ({confidence}%)</span>
        <div className="confidence-bar">
          <div className={`confidence-fill confidence-${cls}`} style={{ width: `${confidence}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn btn-primary btn-sm" onClick={handleNewChat}>
            <RiAddLine /> New chat
          </button>
        </div>

        <div className="chat-search">
          <RiSearchLine />
          <input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="chat-list">
          {loadingChats ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, margin: '4px 8px', borderRadius: 8 }} />
            ))
          ) : filteredChats.length === 0 ? (
            <div className="chat-list-empty">
              <p>No conversations yet</p>
              <span>Ask your first question</span>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat._id}
                className={`chat-list-item ${currentChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => navigate(`/chat/${chat._id}`)}
              >
                <div className="chat-item-content">
                  <span className="chat-item-title">{chat.title || 'Untitled'}</span>
                  {chat.lastMessage && (
                    <span className="chat-item-preview">{chat.lastMessage}</span>
                  )}
                </div>
                <button
                  className="chat-item-delete"
                  onClick={e => { e.stopPropagation(); handleDeleteChat(chat._id); }}
                  title="Delete"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {!currentChat && !chatId ? (
          /* Welcome screen */
          <div className="chat-welcome">
            <div className="welcome-icon"><RiRobot2Line /></div>
            <h2>AI Knowledge Assistant</h2>
            <p>Ask questions about your company's documents, policies, and data. I'll search your knowledge base and provide answers with citations.</p>
            <div className="welcome-examples">
              {[
                'What is our refund policy?',
                'Summarize the Q3 report',
                'What software does our team use?',
                'What are the onboarding steps?',
              ].map(q => (
                <button key={q} className="example-btn" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="chat-messages">
            {currentChat?.messages?.map((msg, idx) => (
              <div key={msg._id || idx} className={`message message-${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <RiUserLine /> : <RiRobot2Line />}
                </div>
                <div className="message-body">
                  <div className="message-content">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {/* Confidence + Citations */}
                  {msg.role === 'assistant' && msg.confidence !== undefined && (
                    <div className="message-meta">
                      <ConfidenceBadge confidence={msg.confidence} />

                      {msg.sources?.length > 0 && (
                        <div className="citations">
                          <span className="citations-label">Sources:</span>
                          <div className="citations-list">
                            {msg.sources.map((s, si) => (
                              <div key={si} className="citation-card">
                                <RiFileLine />
                                <div className="citation-info">
                                  <span className="citation-doc">{s.document}</span>
                                  {s.preview && <span className="citation-preview">{s.preview}</span>}
                                </div>
                                <span className="citation-score">{(s.score * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      <div className="message-feedback">
                        <button
                          className={`feedback-btn ${msg.feedback === 'up' ? 'active-up' : ''}`}
                          onClick={() => handleFeedback(idx, msg.feedback === 'up' ? null : 'up')}
                        >
                          <RiThumbUpLine />
                        </button>
                        <button
                          className={`feedback-btn ${msg.feedback === 'down' ? 'active-down' : ''}`}
                          onClick={() => handleFeedback(idx, msg.feedback === 'down' ? null : 'down')}
                        >
                          <RiThumbDownLine />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* AI Thinking */}
            {loading && (
              <div className="message message-assistant">
                <div className="message-avatar"><RiRobot2Line /></div>
                <div className="message-body">
                  <div className="ai-thinking">
                    <span>Searching your knowledge base</span>
                    <div className="ai-thinking-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          <form className="chat-input-form" onSubmit={handleSend}>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask anything about your company knowledge..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              className={`btn btn-primary chat-send ${loading ? 'btn-loading' : ''}`}
              disabled={loading || !input.trim()}
            >
              {!loading && <RiSendPlane2Line />}
            </button>
          </form>
          <p className="chat-hint">Press Enter to send · Shift+Enter for new line · Answers are based on your uploaded documents</p>
        </div>
      </div>
    </div>
  );
}
