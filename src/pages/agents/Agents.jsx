import { useState, useEffect } from 'react';
import { agentService } from '../../services';
import {
  RiRobot2Line, RiSendPlane2Line, RiLoader4Line,
  RiUserLine, RiMoneyDollarCircleLine, RiVideoLine,
  RiMegaphoneLine, RiBarChartLine, RiTeamLine,
  RiFileChartLine, RiCustomerService2Line, RiBookOpenLine,
  RiFileCopyLine, RiCheckLine, RiFlashlightLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Agent.css';

const AGENT_ICONS = {
  knowledge_assistant: RiBookOpenLine,
  lead_agent: RiUserLine,
  meeting_agent: RiVideoLine,
  invoice_agent: RiMoneyDollarCircleLine,
  support_agent: RiCustomerService2Line,
  social_agent: RiMegaphoneLine,
  report_agent: RiFileChartLine,
  hr_agent: RiTeamLine,
  analytics_agent: RiBarChartLine,
};

const AGENT_COLORS = {
  knowledge_assistant: '#6366f1',
  lead_agent: '#3b82f6',
  meeting_agent: '#8b5cf6',
  invoice_agent: '#f59e0b',
  support_agent: '#10b981',
  social_agent: '#ec4899',
  report_agent: '#06b6d4',
  hr_agent: '#f97316',
  analytics_agent: '#84cc16',
};

const AGENT_EXAMPLES = {
  knowledge_assistant: [
    'What is our refund policy?',
    'Summarize the employee handbook',
    'What are our service offerings?',
  ],
  lead_agent: [
    'Analyze this lead: John Smith, CEO at TechCorp, budget $50k, interested in enterprise plan',
    'Write a follow-up email for a lead who went cold after 2 weeks',
    'Score this prospect: Small startup, no budget confirmed, very engaged',
  ],
  meeting_agent: [
    'We discussed Q4 targets, John will handle marketing, Sarah owns product. Launch date set for Nov 1.',
    'Meeting covered: budget cut of 20%, team restructuring, new hire freeze until Q1.',
    'Client approved the proposal. Next steps: contract review by legal, kickoff scheduled for Monday.',
  ],
  invoice_agent: [
    'Draft a reminder for Invoice #INV-2024-0042, $5,000, 15 days overdue',
    'Write an urgent payment notice for a 60-day overdue invoice',
    'Professional reminder for first-time late payment, keep it friendly',
  ],
  support_agent: [
    'Customer says: "I have been waiting 3 days for my order and no update"',
    'Ticket: "Your software keeps crashing when I try to export PDF files"',
    'Complaint: "I was charged twice for the same subscription"',
  ],
  social_agent: [
    'Write a LinkedIn post announcing we just hit 1000 customers',
    'Create an Instagram caption for our team photo at the office',
    'Twitter thread about 5 productivity tips for entrepreneurs',
  ],
  report_agent: [
    'Summarize our Q3 performance: 45 new leads, 12 converted, $85k revenue',
    'Write an executive summary for: revenue up 23%, costs up 8%, team grew by 3',
    'Analyze: customer churn increased from 5% to 9% this quarter',
  ],
  hr_agent: [
    'Write a job description for a Senior React Developer, remote, 3+ years experience',
    'Draft a performance review template for a sales manager',
    'Create an onboarding checklist for a new marketing hire',
  ],
  analytics_agent: [
    'Interpret this: website traffic up 40%, but conversions down 15%',
    'What does it mean if CAC is $120 and LTV is $350?',
    'Analyze trend: sales peak on Tuesdays and Thursdays, lowest on Mondays',
  ],
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    agentService.getAll()
      .then(({ data }) => {
        setAgents(data.data);
        setSelected(data.data[0]);
      })
      .catch(() => toast.error('Failed to load agents'));
  }, []);

  async function handleRun(e) {
    e?.preventDefault();
    if (!input.trim() || !selected || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);
    setResult(null);

    // Add to history
    const entry = { agentId: selected.id, agentName: selected.name, input: userInput, result: null, timestamp: new Date() };
    setHistory(prev => [entry, ...prev.slice(0, 9)]);

    try {
      const { data } = await agentService.run(selected.id, userInput);
      setResult(data.result);
      setHistory(prev => prev.map((h, i) => i === 0 ? { ...h, result: data.result } : h));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Agent failed to respond');
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  function useExample(example) {
    setInput(example);
    setResult(null);
  }

  if (!agents.length) {
    return (
      <div className="agents-page fade-in">
        <div className="page-header"><h1>AI Agents</h1></div>
        <div className="agents-loading">
          <RiLoader4Line className="spin" />
          <p>Loading agents...</p>
        </div>
      </div>
    );
  }

  const Icon = selected ? (AGENT_ICONS[selected.id] || RiRobot2Line) : RiRobot2Line;
  const color = selected ? (AGENT_COLORS[selected.id] || '#6366f1') : '#6366f1';
  const examples = selected ? (AGENT_EXAMPLES[selected.id] || []) : [];

  return (
    <div className="agents-page fade-in">
      <div className="page-header">
        <h1>AI Agents</h1>
        <p>9 specialized AI agents trained for different business tasks</p>
      </div>

      <div className="agents-layout">
        {/* Agent selector */}
        <div className="agents-sidebar">
          <div className="agents-sidebar-title">Choose Agent</div>
          <div className="agents-list">
            {agents.map(agent => {
              const AgentIcon = AGENT_ICONS[agent.id] || RiRobot2Line;
              const agentColor = AGENT_COLORS[agent.id] || '#6366f1';
              return (
                <button
                  key={agent.id}
                  className={`agent-btn ${selected?.id === agent.id ? 'active' : ''}`}
                  onClick={() => { setSelected(agent); setResult(null); setInput(''); }}
                >
                  <div className="agent-btn-icon" style={{ background:`${agentColor}18`, color:agentColor }}>
                    <AgentIcon />
                  </div>
                  <div className="agent-btn-info">
                    <span className="agent-btn-name">{agent.name}</span>
                    <span className="agent-btn-cat">{agent.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main panel */}
        <div className="agents-main">
          {/* Agent header */}
          {selected && (
            <div className="agent-header card">
              <div className="agent-header-icon" style={{ background:`${color}18`, color }}>
                <Icon />
              </div>
              <div className="agent-header-info">
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
              </div>
              <div className="agent-header-badge">
                <RiFlashlightLine />
                <span>Powered by Groq</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="agent-input-card card">
            <form onSubmit={handleRun}>
              <div className="agent-input-label">
                <RiRobot2Line /> What would you like {selected?.name} to do?
              </div>
              <textarea
                className="agent-textarea"
                placeholder={`Type your request for ${selected?.name}...\n\nOr click an example below to get started.`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && (e.metaKey||e.ctrlKey)) handleRun(); }}
                rows={4}
                disabled={loading}
              />
              <div className="agent-input-footer">
                <span className="agent-hint">Ctrl+Enter to run</span>
                <button
                  type="submit"
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading || !input.trim()}
                >
                  {!loading && <><RiSendPlane2Line /> Run Agent</>}
                </button>
              </div>
            </form>

            {/* Examples */}
            {examples.length > 0 && !result && !loading && (
              <div className="agent-examples">
                <span className="examples-label">Try an example:</span>
                <div className="examples-list">
                  {examples.map((ex, i) => (
                    <button key={i} className="example-chip" onClick={() => useExample(ex)}>
                      {ex.length > 60 ? ex.slice(0, 60) + '…' : ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="agent-thinking card">
              <div className="thinking-icon" style={{ color }}>
                <RiLoader4Line className="spin" />
              </div>
              <div>
                <p className="thinking-title">{selected?.name} is working...</p>
                <p className="thinking-sub">Analyzing your request and generating a response</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="agent-result card">
              <div className="result-header">
                <div className="result-agent-tag" style={{ background:`${color}18`, color }}>
                  <Icon /> {selected?.name}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={copyResult}>
                  {copied ? <><RiCheckLine /> Copied</> : <><RiFileCopyLine /> Copy</>}
                </button>
              </div>
              <div className="result-body">
                {result.split('\n').map((line, i) => (
                  <p key={i} className={line.startsWith('#') ? 'result-heading' :
                    line.startsWith('-') || line.startsWith('•') ? 'result-bullet' :
                    line.trim() === '' ? 'result-spacer' : 'result-line'}>
                    {line}
                  </p>
                ))}
              </div>
              <div className="result-footer">
                <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setInput(''); }}>
                  New request
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setInput(input)}>
                  Refine
                </button>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div className="agent-history card card-pad">
              <h3>Recent</h3>
              <div className="history-list">
                {history.slice(1, 5).map((h, i) => {
                  const HIcon = AGENT_ICONS[h.agentId] || RiRobot2Line;
                  const hColor = AGENT_COLORS[h.agentId] || '#6366f1';
                  return (
                    <div key={i} className="history-item"
                      onClick={() => { setInput(h.input); setResult(h.result); setSelected(agents.find(a=>a.id===h.agentId)||selected); }}>
                      <div className="history-icon" style={{color:hColor}}><HIcon /></div>
                      <div className="history-info">
                        <span className="history-agent">{h.agentName}</span>
                        <span className="history-input">{h.input.slice(0, 80)}{h.input.length>80?'…':''}</span>
                      </div>
                      <span className="history-time">
                        {new Date(h.timestamp).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
