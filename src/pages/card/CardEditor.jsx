import { useState, useEffect, useCallback } from 'react';
import { cardService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiContactsLine, RiFileCopyLine, RiCheckLine, RiExternalLinkLine, RiAddLine,
  RiDeleteBinLine, RiDownload2Line, RiWhatsappLine, RiArrowUpLine, RiArrowDownLine,
} from 'react-icons/ri';
import CardTemplate, { LINK_TYPES, iconFor } from './CardTemplates';
import './CardEditor.css';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'links', label: 'Links' },
  { id: 'design', label: 'Design' },
  { id: 'username', label: 'Username' },
];

const TEMPLATES = [
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'elegant', label: 'Elegant' },
];

function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  );
}

export default function CardEditor() {
  const { company } = useAuth();
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [url, setUrl] = useState(null);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cardService.getMyCard();
      setProfile(data.data.profile);
      setSettings(data.data.cardSettings);
      setUrl(data.data.url);
      setStats(data.data.stats);
    } catch {
      toast.error('Could not load your card');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(patch) {
    setSaving(true);
    try {
      const { data } = await cardService.updateMyCard(patch);
      setSettings(data.data);
      if (patch.username && data.data.username) {
        setUrl((u) => (u ? `${u.replace(/\/[^/]*$/, '')}/${data.data.username}` : u));
      }
      toast.success('Card updated');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile || !settings) {
    return (
      <div className="card-editor">
        <div className="page-header"><h1>My Card</h1></div>
        <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
      </div>
    );
  }

  const previewCard = {
    name: profile.name,
    company: company?.name || null,
    role: profile.role,
    tagline: settings.tagline,
    bio: settings.bio,
    avatar: profile.avatar,
    email: settings.showEmail !== false ? profile.email : null,
    phone: settings.showPhone !== false ? profile.phone : null,
    links: settings.links || [],
    primaryColor: settings.primaryColor || '#6366f1',
    template: settings.template || 'modern',
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const waShareText = url ? encodeURIComponent(`Check out my digital business card: ${url}`) : '';

  return (
    <div className="card-editor fade-in">
      <div className="page-header">
        <h1><RiContactsLine style={{ verticalAlign: '-3px' }} /> My Card</h1>
        <p>Your shareable digital business card — one link for every way people can reach you.</p>
      </div>

      <div className="ce-layout">
        <div className="ce-panel">
          <div className="ce-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === 'profile' && <ProfileTab settings={settings} setSettings={setSettings} onSave={save} saving={saving} />}
          {tab === 'links' && <LinksTab settings={settings} setSettings={setSettings} onSave={save} saving={saving} />}
          {tab === 'design' && <DesignTab settings={settings} setSettings={setSettings} onSave={save} saving={saving} />}
          {tab === 'username' && <UsernameTab settings={settings} url={url} onSave={save} saving={saving} />}

          <div className="ce-stats">
            <div className="ce-stat"><span className="ce-stat-num">{stats.views}</span><span className="ce-stat-label">Views</span></div>
            <div className="ce-stat"><span className="ce-stat-num">{stats.saves}</span><span className="ce-stat-label">Contacts Saved</span></div>
            <div className="ce-stat"><span className="ce-stat-num">{stats.shareRate}%</span><span className="ce-stat-label">Save Rate</span></div>
          </div>

          <div className="card card-pad ce-share">
            <h3>Share your card</h3>
            {url ? (
              <>
                <div className="ce-share-url">
                  <input readOnly value={url} onFocus={(e) => e.target.select()} />
                  <button className="btn btn-secondary btn-icon" onClick={copy} title="Copy link">{copied ? <RiCheckLine /> : <RiFileCopyLine />}</button>
                  <a className="btn btn-secondary btn-icon" href={url} target="_blank" rel="noreferrer" title="Open card"><RiExternalLinkLine /></a>
                </div>
                <div className="ce-share-row">
                  {settings.username && (
                    <img className="ce-qr" src={cardService.qrCodeUrl(settings.username)} alt="Card QR code" />
                  )}
                  <div className="ce-share-actions">
                    {settings.username && (
                      <a className="btn btn-secondary" href={cardService.qrCodeUrl(settings.username)} download="my-card-qrcode.png">
                        <RiDownload2Line /> Download QR
                      </a>
                    )}
                    <a className="btn btn-primary" href={`https://api.whatsapp.com/send?text=${waShareText}`} target="_blank" rel="noreferrer">
                      <RiWhatsappLine /> Share on WhatsApp
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p className="ce-hint">Set a username to get your shareable card link.</p>
            )}
          </div>
        </div>

        <div className="ce-preview">
          <div className="ce-phone">
            <div className="ce-phone-notch" />
            <div className="ce-phone-screen">
              <CardTemplate card={previewCard} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Profile ─────────────────────────────────────────────────────── */
function ProfileTab({ settings, setSettings, onSave, saving }) {
  const [tagline, setTagline] = useState(settings.tagline || '');
  const [bio, setBio] = useState(settings.bio || '');
  const [showEmail, setShowEmail] = useState(settings.showEmail !== false);
  const [showPhone, setShowPhone] = useState(settings.showPhone !== false);
  const [enabled, setEnabled] = useState(settings.enabled !== false);

  async function handleSave() {
    const ok = await onSave({ tagline, bio, showEmail, showPhone, enabled });
    if (ok) setSettings((s) => ({ ...s, tagline, bio, showEmail, showPhone, enabled }));
  }

  return (
    <div className="card card-pad ce-tab">
      <label className="ce-field">
        <span>Tagline</span>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={100} placeholder="e.g. Helping businesses grow with AI" />
      </label>
      <label className="ce-field">
        <span>Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} placeholder="A short intro people see on your card" />
      </label>
      <div className="ce-switch-row">
        <span>Show email on card</span>
        <Switch checked={showEmail} onChange={setShowEmail} />
      </div>
      <div className="ce-switch-row">
        <span>Show phone on card</span>
        <Switch checked={showPhone} onChange={setShowPhone} />
      </div>
      <div className="ce-switch-row">
        <span>Card is live (visible to anyone with your link)</span>
        <Switch checked={enabled} onChange={setEnabled} />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
    </div>
  );
}

/* ── Tab: Links ───────────────────────────────────────────────────────── */
function LinksTab({ settings, setSettings, onSave, saving }) {
  const [links, setLinks] = useState(settings.links?.length ? settings.links.map((l) => ({ ...l })) : []);

  const addLink = () => setLinks((l) => [...l, { type: 'website', label: '', url: '' }]);
  const removeLink = (i) => setLinks((l) => l.filter((_, idx) => idx !== i));
  const updateLink = (i, patch) => setLinks((l) => l.map((link, idx) => (idx === i ? { ...link, ...patch } : link)));
  const move = (i, dir) => setLinks((l) => {
    const j = i + dir;
    if (j < 0 || j >= l.length) return l;
    const next = [...l];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  async function handleSave() {
    const clean = links.filter((l) => l.url.trim());
    const ok = await onSave({ links: clean });
    if (ok) setSettings((s) => ({ ...s, links: clean }));
  }

  return (
    <div className="card card-pad ce-tab">
      {links.length === 0 && <p className="ce-hint">No links yet — add your website, WhatsApp, or socials below.</p>}
      {links.map((link, i) => {
        const Icon = iconFor(link.type);
        return (
          <div key={i} className="ce-link-row">
            <Icon className="ce-link-row-icon" />
            <select value={link.type} onChange={(e) => updateLink(i, { type: e.target.value })}>
              {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input placeholder="Label (optional)" value={link.label || ''} onChange={(e) => updateLink(i, { label: e.target.value })} className="ce-link-label-input" />
            <input placeholder="https://…" value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} className="ce-link-url-input" />
            <div className="ce-link-actions">
              <button className="btn btn-ghost btn-icon" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><RiArrowUpLine /></button>
              <button className="btn btn-ghost btn-icon" onClick={() => move(i, 1)} disabled={i === links.length - 1} title="Move down"><RiArrowDownLine /></button>
              <button className="btn btn-ghost btn-icon" onClick={() => removeLink(i)} title="Remove"><RiDeleteBinLine /></button>
            </div>
          </div>
        );
      })}
      <button className="btn btn-secondary" onClick={addLink}><RiAddLine /> Add Link</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Links'}</button>
    </div>
  );
}

/* ── Tab: Design ──────────────────────────────────────────────────────── */
function DesignTab({ settings, setSettings, onSave, saving }) {
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#6366f1');
  const [template, setTemplate] = useState(settings.template || 'modern');

  async function handleSave() {
    const ok = await onSave({ primaryColor, template });
    if (ok) setSettings((s) => ({ ...s, primaryColor, template }));
  }

  return (
    <div className="card card-pad ce-tab">
      <label className="ce-field">
        <span>Accent Color</span>
        <div className="ce-color-row">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} maxLength={7} />
        </div>
      </label>
      <div className="ce-field">
        <span>Template</span>
        <div className="ce-template-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className={`ce-template-opt ${template === t.id ? 'active' : ''}`} onClick={() => setTemplate(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Design'}</button>
    </div>
  );
}

/* ── Tab: Username ────────────────────────────────────────────────────── */
function UsernameTab({ settings, url, onSave, saving }) {
  const [username, setUsername] = useState(settings.username || '');

  async function handleSave() {
    await onSave({ username });
  }

  return (
    <div className="card card-pad ce-tab">
      <label className="ce-field">
        <span>Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={30} placeholder="yourname" />
      </label>
      <p className="ce-hint">3-30 characters — lowercase letters, numbers and dots only.</p>
      {url && <p className="ce-hint">Your card: <strong>{url}</strong></p>}
      <button className="btn btn-primary" onClick={handleSave} disabled={saving || username.trim() === (settings.username || '')}>
        {saving ? 'Saving…' : 'Save Username'}
      </button>
    </div>
  );
}
