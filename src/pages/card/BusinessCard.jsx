import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cardService } from '../../services';
import CardTemplate from './CardTemplates';
import './BusinessCard.css';

export default function BusinessCard() {
  const { username } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    cardService.getPublicCard(username)
      .then(({ data }) => { if (alive) setCard(data.data); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Card not found'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  useEffect(() => {
    if (card?.name) document.title = `${card.name} — Digital Business Card`;
  }, [card]);

  async function handleSaveContact() {
    setSaving(true);
    // The counter ping and the actual download are independent — if the ping
    // fails, the visitor should still get their vCard.
    cardService.saveContact(username).catch(() => {});
    window.location.href = cardService.downloadVCardUrl(username);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bc-page">
        <div className="bc-loading">
          <div className="bc-spinner" />
          <span>Loading card…</span>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="bc-page">
        <div className="bc-notfound">
          <h1>Card not found</h1>
          <p>{error || "This business card doesn't exist or has been disabled."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-page">
      <div className="bc-stack">
        <CardTemplate card={card} onSaveContact={handleSaveContact} saving={saving} />
        {card.acceptsContacts && <ShareDetails username={username} card={card} />}
      </div>
    </div>
  );
}

// "Share your details" — the visitor becomes a lead for the card owner's
// company, assigned to the card owner (backend: cardController.connect).
function ShareDetails({ username, card }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  // Full name, not the first word — "Dr." or "Engr." alone reads oddly.
  const first = card.name || 'us';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSending(true); setErr('');
    try {
      const { data } = await cardService.connect(username, form);
      setDone(data.message || 'Thanks! We will be in touch.');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not send. Please try again.');
    } finally { setSending(false); }
  }

  if (done) return <div className="bc-share bc-share-done" style={{ '--bc-accent': card.primaryColor }}>{done}</div>;
  if (!open) {
    return (
      <button type="button" className="bc-share-open" style={{ '--bc-accent': card.primaryColor }} onClick={() => setOpen(true)}>
        Share your details with {first}
      </button>
    );
  }
  return (
    <form className="bc-share" style={{ '--bc-accent': card.primaryColor }} onSubmit={submit}>
      <h3>Share your details with {first}</h3>
      <input placeholder="Your name *" value={form.name} onChange={set('name')} required maxLength={120} />
      <input placeholder="Email" type="email" value={form.email} onChange={set('email')} maxLength={160} />
      <input placeholder="Phone" type="tel" value={form.phone} onChange={set('phone')} maxLength={30} />
      <textarea placeholder="Message (optional)" value={form.message} onChange={set('message')} rows={3} maxLength={1000} />
      {err && <p className="bc-share-error">{err}</p>}
      <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
      <p className="bc-share-fine">Leave an email or a phone number so {first} can reach you.</p>
    </form>
  );
}
