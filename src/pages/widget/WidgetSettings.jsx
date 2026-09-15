import { useState, useEffect, useCallback } from 'react';
import { widgetService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiCodeLine, RiFileCopyLine, RiCheckLine, RiChat3Line, RiSendPlane2Line,
  RiCloseLine, RiInformationLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './WidgetSettings.css';

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  );
}

const EMBED_LIMIT = { trial: 'unlimited external websites (trial)', starter: 'your own store only', professional: '1 external website', business: 'unlimited external websites', enterprise: 'unlimited external websites' };

export default function WidgetSettings() {
  const { company } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await widgetService.getSettings();
      setSettings(data.data);
    } catch {
      toast.error('Could not load widget settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await widgetService.updateSettings({
        widgetEnabled: settings.widgetEnabled,
        greeting: settings.greeting,
        placeholder: settings.placeholder,
        primaryColor: settings.primaryColor,
        position: settings.position,
        collectEmail: settings.collectEmail,
        offlineMessage: settings.offlineMessage,
        humanHandoverEnabled: settings.humanHandoverEnabled,
      });
      setSettings((s) => ({ ...s, ...data.data }));
      toast.success('Widget settings saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="widget-settings">
        <div className="page-header"><h1>Widget Settings</h1></div>
        <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
      </div>
    );
  }

  const embedCode = `<script src="https://bislyai.com/widget.js" data-company="${settings.storeSlug}"></script>`;
  const plan = company?.plan || settings.plan || 'trial';

  const copy = () => {
    navigator.clipboard?.writeText(embedCode).then(() => {
      setCopied(true);
      toast.success('Embed code copied');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="widget-settings fade-in">
      <div className="page-header">
        <h1><RiCodeLine style={{ verticalAlign: '-3px' }} /> Widget Settings</h1>
        <p>Configure the AI chat widget visitors see on your store and on any website you embed it on.</p>
      </div>

      <div className="ws-grid">
        {/* ── Settings column ── */}
        <div className="ws-settings-col">
          <div className="card card-pad">
            <div className="ss-toggle-row">
              <div>
                <div className="t-label">Enable chat widget</div>
                <div className="t-help">Turn the widget off everywhere — your store and any embedded website.</div>
              </div>
              <Switch checked={settings.widgetEnabled} onChange={(v) => set('widgetEnabled', v)} />
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Greeting message</label>
              <input className="form-input" value={settings.greeting}
                onChange={(e) => set('greeting', e.target.value)}
                placeholder="Hi! How can I help you today?" maxLength={300} />
            </div>

            <div className="form-group">
              <label className="form-label">Input placeholder</label>
              <input className="form-input" value={settings.placeholder}
                onChange={(e) => set('placeholder', e.target.value)}
                placeholder="Ask me anything..." maxLength={100} />
            </div>

            <div className="form-group">
              <label className="form-label">Primary colour</label>
              <div className="ss-color-row">
                <input type="color" value={settings.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
                <input className="form-input" style={{ maxWidth: 140 }} value={settings.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Position</label>
              <select className="form-input form-select" value={settings.position} onChange={(e) => set('position', e.target.value)}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Offline / no-answer message</label>
              <textarea className="form-input" rows={2} value={settings.offlineMessage}
                onChange={(e) => set('offlineMessage', e.target.value)}
                placeholder="I couldn't find an answer to that. A team member will follow up with you soon." maxLength={300} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shown when the AI can't find an answer in your knowledge base.</span>
            </div>

            <div className="ss-toggle-row">
              <div>
                <div className="t-label">Collect visitor name &amp; email</div>
                <div className="t-help">Ask visitors for their name/email so you can follow up later.</div>
              </div>
              <Switch checked={settings.collectEmail} onChange={(v) => set('collectEmail', v)} />
            </div>

            <div className="ss-toggle-row">
              <div>
                <div className="t-label">Human handover</div>
                <div className="t-help">When the AI can't answer, flag the chat for your team in the Chat Inbox.</div>
              </div>
              <Switch checked={settings.humanHandoverEnabled} onChange={(v) => set('humanHandoverEnabled', v)} />
            </div>

            <button className="btn btn-primary" disabled={saving} onClick={save} style={{ marginTop: 8 }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* ── Embed code ── */}
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Embed on your website</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Your own <strong>bislyai.com</strong> store already has the widget built in — no code needed.
              To add it to an external website, paste this snippet just before the closing <code>&lt;/body&gt;</code> tag.
            </p>
            <div className="ws-embed-box">
              <code>{embedCode}</code>
              <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? <RiCheckLine /> : <RiFileCopyLine />} {copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div className="ws-plan-note">
              <RiInformationLine />
              <span>Your <strong>{plan}</strong> plan covers the widget on <strong>{EMBED_LIMIT[plan] || 'your own store only'}</strong>.
                {plan === 'starter' && ' Upgrade to Professional or Business to embed it on an external website.'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Live preview column ── */}
        <div className="ws-preview-col">
          <div className="ws-preview-frame">
            <div className="ws-preview-label">Live preview</div>
            <div className="ws-preview-stage">
              {previewOpen && (
                <div className="ws-preview-window">
                  <div className="ws-preview-header" style={{ background: settings.primaryColor }}>
                    <div className="ws-preview-avatar" style={{ background: 'rgba(255,255,255,0.3)' }}>
                      {(company?.name || 'B')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="ws-preview-company">{company?.name || 'Your Business'}</div>
                      <div className="ws-preview-online">● Online — replies instantly</div>
                    </div>
                    <button className="ws-preview-close" onClick={() => setPreviewOpen(false)}><RiCloseLine /></button>
                  </div>
                  <div className="ws-preview-messages">
                    <div className="ws-preview-msg bot">{settings.greeting || 'Hi! How can I help you today?'}</div>
                  </div>
                  <div className="ws-preview-input-area">
                    <input disabled placeholder={settings.placeholder || 'Ask me anything...'} />
                    <button style={{ background: settings.primaryColor }}><RiSendPlane2Line /></button>
                  </div>
                  <div className="ws-preview-footer">Powered by <a>BizlyAI</a></div>
                </div>
              )}
              <button
                className={`ws-preview-bubble ${settings.position === 'bottom-left' ? 'left' : 'right'}`}
                style={{ background: settings.primaryColor }}
                onClick={() => setPreviewOpen((o) => !o)}
              >
                <RiChat3Line />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
