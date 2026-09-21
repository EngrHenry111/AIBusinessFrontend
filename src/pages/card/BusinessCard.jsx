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
      <CardTemplate card={card} onSaveContact={handleSaveContact} saving={saving} />
    </div>
  );
}
