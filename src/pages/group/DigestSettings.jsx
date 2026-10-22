import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiCloseLine, RiLoader4Line, RiSendPlaneLine, RiAddLine, RiDeleteBinLine, RiWhatsappLine, RiMailLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';
import { groupService } from '../../services';

// WhatsApp-style preview: *bold* → bold, keep line breaks.
function Preview({ text }) {
  if (!text) return <p className="muted" style={{ fontSize: 13 }}>Add branches and reports, and today's summary will appear here.</p>;
  return (
    <div className="grp-wa-preview">
      {text.split('\n').map((line, i) => (
        <div key={i}>
          {line ? line.split(/(\*[^*]+\*)/g).map((part, j) => (part.startsWith('*') && part.endsWith('*') && part.length > 2
            ? <strong key={j}>{part.slice(1, -1)}</strong>
            : <span key={j}>{part}</span>)) : ' '}
        </div>
      ))}
    </div>
  );
}

export default function DigestSettings({ onClose }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    groupService.getDigest()
      .then(({ data: r }) => { setData(r.data); setForm(r.data.settings); })
      .catch((e) => { toast.error(e.response?.data?.message || 'Could not load summary settings'); onClose(); });
    // Load once on open — the parent re-renders on its own timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(quiet) {
    setSaving(true);
    try {
      const { data: r } = await groupService.updateDigest(form);
      setForm(r.data);
      if (!quiet) toast.success('Nightly summary saved');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save');
      return false;
    } finally { setSaving(false); }
  }

  async function sendNow() {
    if (!(await save(true))) return;
    setSending(true);
    setResults(null);
    try {
      const { data: r } = await groupService.sendDigestNow();
      setResults(r.data.results || []);
      const ok = (r.data.results || []).filter((x) => x.ok).length;
      if (ok) toast.success(`Summary sent (${ok} delivered)`);
      else toast.error('Nothing was delivered. See the details below.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send the summary');
    } finally { setSending(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><RiWhatsappLine style={{ verticalAlign: '-3px', color: '#25d366' }} /> Nightly summary</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        {!form ? (
          <div className="modal-body" style={{ textAlign: 'center', fontSize: 26, color: 'var(--text-muted)' }}><RiLoader4Line className="spin" /></div>
        ) : (
          <div className="modal-body grp-digest-grid">
            <div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Every night, one message with the whole day across all branches: sales, who was short, meter gaps,
                missing reports and approvals waiting. No need to open the app.
              </p>
              <label className="grp-row" style={{ gap: 8, fontSize: 14, fontWeight: 600, flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Send the nightly summary
              </label>

              <div className="form-group" style={{ marginTop: 12, maxWidth: 200 }}>
                <label className="form-label">Send at (Lagos time)</label>
                <input type="time" className="form-input" value={form.time} onChange={(e) => set('time', e.target.value)} disabled={!form.enabled} />
              </div>

              <label className="form-label">Send by</label>
              <div className="grp-row" style={{ gap: 16 }}>
                <label className="grp-row" style={{ gap: 6, fontSize: 14, flexWrap: 'nowrap' }}>
                  <input type="checkbox" checked={form.whatsapp} onChange={(e) => set('whatsapp', e.target.checked)} /> <RiWhatsappLine /> WhatsApp
                </label>
                <label className="grp-row" style={{ gap: 6, fontSize: 14, flexWrap: 'nowrap' }}>
                  <input type="checkbox" checked={form.email} onChange={(e) => set('email', e.target.checked)} /> <RiMailLine /> Email
                </label>
              </div>
              {form.whatsapp && (
                <p className="muted" style={{ fontSize: 12 }}>
                  WhatsApp messages go out from your business's connected number. <Link to="/whatsapp">Check the connection</Link>.
                </p>
              )}

              <label className="form-label" style={{ marginTop: 12 }}>Recipients</label>
              <div className="grp-recipient">
                <strong>You (owner)</strong>
                <span className="muted">{data.ownerPhone || <span className="grp-neg">No phone number. <Link to="/settings">Add one</Link> to get WhatsApp.</span>}</span>
                <span className="muted">{data.ownerEmail}</span>
              </div>
              {form.recipients.map((r, i) => (
                <div key={i} className="grp-dept-row" style={{ gridTemplateColumns: '1fr 1fr 1.2fr auto' }}>
                  <input className="form-input" placeholder="Name (e.g. GM, Accountant)" value={r.name} onChange={(e) => set('recipients', form.recipients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="form-input" placeholder="WhatsApp number" value={r.phone} onChange={(e) => set('recipients', form.recipients.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                  <input className="form-input" placeholder="Email (optional)" value={r.email} onChange={(e) => set('recipients', form.recipients.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                  <button className="btn btn-ghost btn-icon" onClick={() => set('recipients', form.recipients.filter((_, j) => j !== i))} aria-label="Remove recipient"><RiDeleteBinLine /></button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => set('recipients', [...form.recipients, { name: '', phone: '', email: '' }])}><RiAddLine /> Add recipient</button>

              {form.lastSentYmd && <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Last sent: {form.lastSentYmd}</p>}

              {results && (
                <div style={{ marginTop: 12 }}>
                  {results.length === 0 && <div className="grp-neg" style={{ fontSize: 13 }}>No recipients have a phone number or email.</div>}
                  {results.map((x, i) => (
                    <div key={i} className="grp-row" style={{ fontSize: 13, gap: 6 }}>
                      {x.ok ? <RiCheckLine style={{ color: 'var(--color-success)' }} /> : <RiErrorWarningLine style={{ color: 'var(--color-danger)' }} />}
                      <span>{x.to} · {x.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                      {!x.ok && <span className="muted">{x.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Today's message (preview)</label>
              <Preview text={data.preview} />
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-secondary" onClick={sendNow} disabled={!form || sending || saving}>
            {sending ? <RiLoader4Line className="spin" /> : <RiSendPlaneLine />} Send today's summary now
          </button>
          <button className="btn btn-primary" onClick={async () => { if (await save()) onClose(); }} disabled={!form || saving}>Save</button>
        </div>
      </div>
    </div>
  );
}
