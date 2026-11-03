import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiSparkling2Line, RiSendPlane2Fill, RiAddLine, RiDeleteBin6Line, RiCheckLine, RiCloseLine,
  RiLoader4Line, RiChatHistoryLine, RiCheckboxCircleFill, RiErrorWarningFill, RiTimeLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { assistantService } from '../../services';
import './Assistant.css';

const SUGGESTIONS = [
  { text: 'Chase everyone who owes me more than ₦50,000', send: true },
  { text: 'How is my business doing this month?', send: true },
  { text: 'Which leads have gone cold? Draft a follow-up to the best one.', send: true },
  { text: 'Which products are running low on stock?', send: true },
  { text: 'Who are my top 5 customers?', send: true },
  { text: 'Create an invoice for ', send: false, label: 'Create an invoice for…' },
];

const STATUS = {
  pending: { label: 'Waiting for you', icon: RiTimeLine },
  running: { label: 'Working…', icon: RiLoader4Line },
  done: { label: 'Done', icon: RiCheckboxCircleFill },
  failed: { label: 'Failed', icon: RiErrorWarningFill },
  rejected: { label: 'Declined', icon: RiCloseLine },
  expired: { label: 'Expired', icon: RiTimeLine },
};

const errText = (err, fallback) => err?.response?.data?.message || (err?.code === 'ECONNABORTED' ? 'That took too long. Please try again.' : fallback);

// Plain text from the agent: "- " lines become a list, links become links.
function linkify(line) {
  return line.split(/(https?:\/\/[^\s)]+)/g).map((part, i) => (
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
      : part
  ));
}

function AgentText({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      if (!list) { list = []; blocks.push({ list }); }
      list.push(bullet[1]);
      return;
    }
    list = null;
    if (line.trim()) blocks.push({ p: line, key: i });
  });
  return (
    <div className="as-text">
      {blocks.map((b, i) => (b.list
        ? <ul key={i}>{b.list.map((item, j) => <li key={j}>{linkify(item)}</li>)}</ul>
        : <p key={i}>{linkify(b.p)}</p>))}
    </div>
  );
}

function ActionCard({ action, busy, onDecide }) {
  const meta = STATUS[action.status] || STATUS.pending;
  const Icon = meta.icon;
  const isEmail = action.tool === 'send_email';
  return (
    <div className={`as-card is-${action.status}`}>
      <div className="as-card-head">
        <span className="as-card-kicker"><RiShieldCheckLine /> Needs your approval</span>
        <span className={`as-badge is-${action.status}`}><Icon className={action.status === 'running' ? 'spin' : ''} /> {meta.label}</span>
      </div>
      <p className="as-card-title">{action.summary}</p>
      {action.details?.length > 0 && (
        isEmail
          ? <div className="as-email">{action.details[0]}</div>
          : <ul className="as-card-details">{action.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
      )}
      {action.result && <p className={`as-card-result is-${action.status}`}>{linkify(action.result)}</p>}
      {action.status === 'pending' && (
        <div className="as-card-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onDecide(action, 'approve')}>
            {busy === 'approve' ? <RiLoader4Line className="spin" /> : <RiCheckLine />} {isEmail ? 'Approve and send' : 'Approve'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onDecide(action, 'reject')}>
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');
  const [chats, setChats] = useState([]);
  const [convo, setConvo] = useState(null);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(null); // text being worked on
  const [deciding, setDeciding] = useState({}); // actionId -> 'approve' | 'reject'
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const loadChats = useCallback(() => {
    assistantService.list().then(({ data }) => setChats(data.data)).catch(() => {});
  }, []);

  useEffect(loadChats, [loadChats]);

  useEffect(() => {
    if (!activeId) { setConvo(null); return; }
    if (convo?.id === activeId) return;
    setLoadingConvo(true);
    assistantService.get(activeId)
      .then(({ data }) => setConvo(data.data))
      .catch((err) => { toast.error(errText(err, 'Could not open that chat.')); setParams({}); })
      .finally(() => setLoadingConvo(false));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [convo, sending]);

  function openChat(id) {
    setShowHistory(false);
    setParams(id ? { c: id } : {});
  }

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(text);
    try {
      const { data } = await assistantService.chat(text, convo?.id);
      setConvo(data.data);
      if (data.data.id !== activeId) setParams({ c: data.data.id }, { replace: Boolean(activeId) });
      loadChats();
    } catch (err) {
      toast.error(errText(err, 'The agent could not reply. Please try again.'));
      setInput(text);
    } finally {
      setSending(null);
      inputRef.current?.focus();
    }
  }

  async function decide(action, decision) {
    if (!convo) return;
    setDeciding((d) => ({ ...d, [action.id]: decision }));
    try {
      const fn = decision === 'approve' ? assistantService.approve : assistantService.reject;
      const { data } = await fn(convo.id, action.id);
      setConvo(data.data);
      const after = data.data.items.find((i) => i.action?.id === action.id)?.action;
      if (decision === 'approve') {
        if (after?.status === 'done') toast.success('Done');
        else if (after?.status === 'failed') toast.error(after.result || 'That did not work.');
      }
      loadChats();
    } catch (err) {
      toast.error(errText(err, 'Could not do that. Please try again.'));
      assistantService.get(convo.id).then(({ data }) => setConvo(data.data)).catch(() => {});
    } finally {
      setDeciding((d) => { const n = { ...d }; delete n[action.id]; return n; });
    }
  }

  async function approveAll(pending) {
    for (const a of pending) {
      // One at a time: each approval updates the same chat.
      // eslint-disable-next-line no-await-in-loop
      await decide(a, 'approve');
    }
  }

  async function removeChat(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this chat? Anything already approved stays done.')) return;
    try {
      await assistantService.remove(id);
      setChats((c) => c.filter((x) => x.id !== id));
      if (id === activeId) openChat(null);
    } catch (err) { toast.error(errText(err, 'Could not delete the chat.')); }
  }

  function useSuggestion(s) {
    if (s.send) send(s.text);
    else { setInput(s.text); inputRef.current?.focus(); }
  }

  const items = convo?.items || [];
  const pending = items.filter((i) => i.type === 'action' && i.action.status === 'pending').map((i) => i.action);
  const anyDeciding = Object.keys(deciding).length > 0;
  const empty = !activeId && !sending;

  return (
    <div className="as-layout">
      <aside className={`as-history ${showHistory ? 'is-open' : ''}`}>
        <div className="as-history-head">
          <button type="button" className="btn btn-primary btn-sm as-new" onClick={() => openChat(null)}>
            <RiAddLine /> New chat
          </button>
          <button type="button" className="as-icon-btn as-history-close" aria-label="Close chats" onClick={() => setShowHistory(false)}><RiCloseLine /></button>
        </div>
        <div className="as-history-list">
          {chats.length === 0 && <p className="as-history-empty">Your chats with the agent will show here.</p>}
          {chats.map((c) => (
            <div
              key={c.id} role="button" tabIndex={0}
              className={`as-history-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => openChat(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') openChat(c.id); }}
            >
              <span className="as-history-title">{c.title}</span>
              {c.pending > 0 && <span className="as-pill" title="Waiting for your approval">{c.pending}</span>}
              <button type="button" className="as-icon-btn as-history-del" aria-label="Delete chat" onClick={(e) => removeChat(e, c.id)}><RiDeleteBin6Line /></button>
            </div>
          ))}
        </div>
      </aside>
      {showHistory && <div className="as-scrim" onClick={() => setShowHistory(false)} />}

      <section className="as-main">
        <header className="as-top">
          <button type="button" className="as-icon-btn as-history-toggle" aria-label="Show chats" onClick={() => setShowHistory(true)}><RiChatHistoryLine /></button>
          {activeId && <button type="button" className="as-icon-btn as-back" aria-label="New chat" title="New chat" onClick={() => openChat(null)}><RiAddLine /></button>}
          <div className="as-top-title">
            <span className="as-avatar sm"><RiSparkling2Line /></span>
            <div>
              <h1>Business Agent</h1>
              <p>Looks things up and gets work done. You approve anything it sends or changes.</p>
            </div>
          </div>
        </header>

        <div className="as-scroll">
          {empty && (
            <div className="as-welcome">
              <span className="as-avatar lg"><RiSparkling2Line /></span>
              <h2>What should we get done?</h2>
              <p>Ask about your invoices, sales, leads, customers, stock or appointments, or give it a job. It plans the steps and checks your records itself. Nothing is sent or changed until you approve it.</p>
              <div className="as-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} type="button" className="as-suggestion" onClick={() => useSuggestion(s)}>{s.label || s.text}</button>
                ))}
              </div>
            </div>
          )}

          {loadingConvo && <div className="as-loading"><RiLoader4Line className="spin" /> Opening chat…</div>}

          <div className="as-thread">
            {items.map((it, i) => {
              if (it.type === 'user') return <div key={i} className="as-msg user"><div className="as-bubble">{it.text}</div></div>;
              if (it.type === 'step') return <div key={i} className="as-step"><RiCheckLine /> {it.text}</div>;
              if (it.type === 'action') return <ActionCard key={it.action.id} action={it.action} busy={deciding[it.action.id]} onDecide={decide} />;
              return (
                <div key={i} className={`as-msg agent ${it.error ? 'is-error' : ''}`}>
                  <span className="as-avatar sm"><RiSparkling2Line /></span>
                  <div className="as-bubble"><AgentText text={it.text} /></div>
                </div>
              );
            })}

            {sending && (
              <>
                <div className="as-msg user"><div className="as-bubble">{sending}</div></div>
                <div className="as-msg agent">
                  <span className="as-avatar sm"><RiSparkling2Line /></span>
                  <div className="as-bubble as-working"><span className="as-dots"><i /><i /><i /></span> Checking your records and working it out…</div>
                </div>
              </>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {pending.length > 1 && (
          <div className="as-approve-all">
            <span>{pending.length} actions are waiting for you</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={anyDeciding || Boolean(sending)} onClick={() => approveAll(pending)}>
              <RiCheckLine /> Approve all
            </button>
          </div>
        )}

        <form className="as-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask, or give the agent a job…"
            rows={1}
            maxLength={4000}
            disabled={Boolean(sending)}
          />
          <button type="submit" className="as-send" aria-label="Send" disabled={!input.trim() || Boolean(sending)}>
            {sending ? <RiLoader4Line className="spin" /> : <RiSendPlane2Fill />}
          </button>
        </form>
      </section>
    </div>
  );
}
