import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiFlashlightLine, RiAlarmWarningLine, RiLoader4Line, RiShoppingBag3Line } from 'react-icons/ri';
import { leadService } from '../../services';
import { STAGE_ORDER, stageLabel, sourceLabel, formatMoney } from '../../constants/leads';

// Pipeline board: one column per stage. Drag a card to move the lead; the AI
// moves chat leads forward by itself (Contacted → Interested → Ready to buy)
// and a purchase moves them to Won.

const COLUMN_HINT = {
  new: 'Just arrived',
  contacted: 'Talking',
  qualified: 'Asked about products',
  proposal: 'Quote or offer sent',
  negotiation: 'Wants to buy',
  won: 'Bought',
  lost: 'Not buying',
};

export default function PipelineBoard({ search, sourceFilter, refreshKey }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [moving, setMoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await leadService.getAll({ view: 'board', limit: 500 });
      setLeads(data.data);
    } catch { toast.error('Could not load the pipeline'); setLeads((l) => l || []); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  async function move(lead, status) {
    if (!lead || lead.status === status) return;
    const before = lead.status;
    setLeads((prev) => prev.map((l) => (l._id === lead._id ? { ...l, status } : l)));
    setMoving(lead._id);
    try {
      await leadService.update(lead._id, { status });
      toast.success(`${lead.name} → ${stageLabel(status)}`);
    } catch (err) {
      setLeads((prev) => prev.map((l) => (l._id === lead._id ? { ...l, status: before } : l)));
      toast.error(err.response?.data?.message || 'Could not move the lead');
    } finally { setMoving(null); }
  }

  if (!leads) return <div className="pipeline-loading"><RiLoader4Line className="spin" /></div>;

  const now = new Date();
  const q = (search || '').toLowerCase();
  const isDue = (l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= now && !['won', 'lost', 'converted'].includes(l.status);
  const shown = leads
    .filter((l) => !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q)
      || (l.interestedIn || []).some((p) => p.toLowerCase().includes(q)))
    .filter((l) => !sourceFilter || (sourceFilter === 'auto' ? l.autoCaptured : sourceFilter === 'due' ? isDue(l) : l.source === sourceFilter));
  const byStage = (s) => shown.filter((l) => (s === 'won' ? ['won', 'converted'].includes(l.status) : l.status === s));
  const openValue = shown.filter((l) => !['won', 'lost', 'converted'].includes(l.status)).reduce((t, l) => t + (l.value || 0), 0);

  return (
    <>
      <p className="pipeline-summary">
        {shown.length} lead{shown.length === 1 ? '' : 's'}
        {openValue > 0 && <> · <strong>{formatMoney(openValue)}</strong> in open deals</>}
        <span> · Drag a card to change its stage. Chat leads move forward by themselves.</span>
      </p>
      <div className="pipeline-board">
        {STAGE_ORDER.map((stage) => {
          const items = byStage(stage);
          const total = items.reduce((t, l) => t + (l.value || 0), 0);
          return (
            <section
              key={stage}
              className={`pipeline-col stage-${stage} ${overCol === stage ? 'is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOverCol(stage); }}
              onDragLeave={() => setOverCol((c) => (c === stage ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                move(leads.find((l) => l._id === (e.dataTransfer.getData('text/plain') || dragId)), stage);
              }}
              aria-label={`${stageLabel(stage)} stage`}
            >
              <header className="pipeline-col-head">
                <div>
                  <h3>{stageLabel(stage)} <span className="pipeline-count">{items.length}</span></h3>
                  <small>{COLUMN_HINT[stage]}</small>
                </div>
                {total > 0 && <span className="pipeline-total">{formatMoney(total)}</span>}
              </header>
              <div className="pipeline-cards">
                {items.map((l) => (
                  <article
                    key={l._id}
                    className={`pipeline-card ${dragId === l._id ? 'is-dragging' : ''} ${moving === l._id ? 'is-moving' : ''}`}
                    draggable
                    onDragStart={(e) => { setDragId(l._id); e.dataTransfer.setData('text/plain', l._id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => navigate(`/leads/${l._id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/leads/${l._id}`); }}
                    tabIndex={0}
                    role="button"
                  >
                    <div className="pipeline-card-top">
                      <strong>{l.name}</strong>
                      {l.value > 0 && <span className="pipeline-card-value">{formatMoney(l.value, l.currency)}</span>}
                    </div>
                    {l.interestedIn?.length > 0 && (
                      <div className="pipeline-card-wants"><RiShoppingBag3Line /> {l.interestedIn.slice(-3).join(', ')}</div>
                    )}
                    {l.ai?.summary && <p className="pipeline-card-summary">{l.ai.summary}</p>}
                    <div className="pipeline-card-foot">
                      <span className={`lead-source ${l.autoCaptured ? 'auto' : ''}`}>{l.autoCaptured && <RiFlashlightLine />}{sourceLabel(l.source)}</span>
                      {isDue(l) && <span className="lead-due"><RiAlarmWarningLine /> Follow up</span>}
                    </div>
                    {/* Keyboard / touch: drag-and-drop isn't available everywhere. */}
                    <select
                      className="pipeline-card-move"
                      value={l.status === 'converted' ? 'won' : l.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => move(l, e.target.value)}
                      aria-label={`Move ${l.name} to another stage`}
                    >
                      {STAGE_ORDER.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                    </select>
                  </article>
                ))}
                {!items.length && <div className="pipeline-empty">No leads</div>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
