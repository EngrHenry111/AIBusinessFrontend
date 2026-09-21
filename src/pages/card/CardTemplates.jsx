import {
  RiGlobalLine, RiWhatsappLine, RiInstagramLine, RiTwitterXLine, RiLinkedinBoxLine,
  RiFacebookBoxLine, RiYoutubeLine, RiTiktokLine, RiMailLine, RiPhoneLine, RiLinkM,
  RiUserAddLine, RiExternalLinkLine,
} from 'react-icons/ri';

export const LINK_TYPES = [
  { value: 'website', label: 'Website', icon: RiGlobalLine },
  { value: 'whatsapp', label: 'WhatsApp', icon: RiWhatsappLine },
  { value: 'instagram', label: 'Instagram', icon: RiInstagramLine },
  { value: 'twitter', label: 'X / Twitter', icon: RiTwitterXLine },
  { value: 'linkedin', label: 'LinkedIn', icon: RiLinkedinBoxLine },
  { value: 'facebook', label: 'Facebook', icon: RiFacebookBoxLine },
  { value: 'youtube', label: 'YouTube', icon: RiYoutubeLine },
  { value: 'tiktok', label: 'TikTok', icon: RiTiktokLine },
  { value: 'custom', label: 'Other Link', icon: RiLinkM },
];

const ICON_MAP = LINK_TYPES.reduce((m, t) => ({ ...m, [t.value]: t.icon }), {});
export const iconFor = (type) => ICON_MAP[type] || RiLinkM;

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

function Avatar({ card, size }) {
  return (
    <div className={`bc-avatar bc-avatar-${size}`}>
      {card.avatar
        ? <img src={card.avatar} alt={card.name} className="bc-avatar-img" />
        : <span className="bc-avatar-fallback">{initials(card.name)}</span>}
    </div>
  );
}

function ContactRow({ card }) {
  if (!card.phone && !card.email) return null;
  return (
    <div className="bc-contact-row">
      {card.phone && <a href={`tel:${card.phone}`} className="bc-contact-chip"><RiPhoneLine /> {card.phone}</a>}
      {card.email && <a href={`mailto:${card.email}`} className="bc-contact-chip"><RiMailLine /> {card.email}</a>}
    </div>
  );
}

function LinksList({ card }) {
  if (!card.links?.length) return null;
  return (
    <div className="bc-links">
      {card.links.map((l, i) => {
        const Icon = iconFor(l.type);
        return (
          <a key={i} href={l.url} target="_blank" rel="noreferrer" className="bc-link-item">
            <span className="bc-link-icon"><Icon /></span>
            <span className="bc-link-label">{l.label || LINK_TYPES.find((t) => t.value === l.type)?.label || l.url}</span>
            <RiExternalLinkLine className="bc-link-go" />
          </a>
        );
      })}
    </div>
  );
}

function SaveButton({ onSaveContact, saving }) {
  if (!onSaveContact) {
    // Decorative, inert — used inside the in-app editor's live preview only.
    return (
      <button type="button" className="bc-save-btn" disabled>
        <RiUserAddLine /> Save Contact
      </button>
    );
  }
  return (
    <button type="button" className="bc-save-btn" onClick={onSaveContact} disabled={saving}>
      <RiUserAddLine /> {saving ? 'Saving…' : 'Save Contact'}
    </button>
  );
}

export default function CardTemplate({ card, onSaveContact, saving }) {
  const tpl = card.template || 'modern';
  const color = card.primaryColor || '#6366f1';
  const subtitle = [card.role, card.company].filter(Boolean).join(' · ');
  const style = { '--bc-color': color };

  if (tpl === 'minimal') {
    return (
      <div className="bc-card bc-minimal" style={style}>
        <div className="bc-min-head">
          <Avatar card={card} size="sm" />
          <div className="bc-min-head-text">
            <h1 className="bc-name">{card.name}</h1>
            {subtitle && <p className="bc-role">{subtitle}</p>}
          </div>
        </div>
        {card.tagline && <p className="bc-tagline">{card.tagline}</p>}
        {card.bio && <p className="bc-bio">{card.bio}</p>}
        <ContactRow card={card} />
        <LinksList card={card} />
        <SaveButton onSaveContact={onSaveContact} saving={saving} />
        <p className="bc-footer">Powered by BizlyAI</p>
      </div>
    );
  }

  if (tpl === 'bold') {
    return (
      <div className="bc-card bc-bold" style={style}>
        <div className="bc-bold-glow" />
        <Avatar card={card} size="lg" />
        <h1 className="bc-name">{card.name}</h1>
        {subtitle && <p className="bc-role">{subtitle}</p>}
        {card.tagline && <p className="bc-tagline">{card.tagline}</p>}
        {card.bio && <p className="bc-bio">{card.bio}</p>}
        <ContactRow card={card} />
        <LinksList card={card} />
        <SaveButton onSaveContact={onSaveContact} saving={saving} />
        <p className="bc-footer">Powered by BizlyAI</p>
      </div>
    );
  }

  if (tpl === 'elegant') {
    return (
      <div className="bc-card bc-elegant" style={style}>
        <Avatar card={card} size="lg" />
        <h1 className="bc-name">{card.name}</h1>
        {subtitle && <p className="bc-role">{subtitle}</p>}
        <div className="bc-divider" />
        {card.tagline && <p className="bc-tagline">{card.tagline}</p>}
        {card.bio && <p className="bc-bio">{card.bio}</p>}
        <ContactRow card={card} />
        <LinksList card={card} />
        <SaveButton onSaveContact={onSaveContact} saving={saving} />
        <p className="bc-footer">Powered by BizlyAI</p>
      </div>
    );
  }

  // modern (default)
  return (
    <div className="bc-card bc-modern" style={style}>
      <div className="bc-modern-banner" />
      <Avatar card={card} size="lg" />
      <h1 className="bc-name">{card.name}</h1>
      {subtitle && <p className="bc-role">{subtitle}</p>}
      {card.tagline && <p className="bc-tagline">{card.tagline}</p>}
      <div className="bc-divider" />
      {card.bio && <p className="bc-bio">{card.bio}</p>}
      <ContactRow card={card} />
      <LinksList card={card} />
      <SaveButton onSaveContact={onSaveContact} saving={saving} />
      <p className="bc-footer">Powered by BizlyAI</p>
    </div>
  );
}
