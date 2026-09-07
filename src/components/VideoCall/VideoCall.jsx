import { useState, useEffect, useRef } from 'react';
import { appointmentService } from '../../services';
import {
  RiCloseLine, RiTimeLine, RiFileCopyLine, RiGroupLine, RiLoader4Line, RiLogoutBoxRLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './VideoCall.css';

const pad = (n) => String(n).padStart(2, '0');
const fmtTimer = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

export default function VideoCall({ appointment, roomUrl, onClose }) {
  const [seconds, setSeconds] = useState(0);
  const [participants, setParticipants] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());

  // Timer counting up
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Best-effort participant count from Daily prebuilt's postMessages
  useEffect(() => {
    const onMsg = (e) => {
      if (typeof e.origin === 'string' && !e.origin.includes('daily.co')) return;
      const d = e.data || {};
      const action = d.action || d.event;
      if (action === 'participant-counts' && typeof d.present === 'number') {
        setParticipants(d.present + (d.hidden || 0));
      } else if (action === 'participant-joined' || action === 'participant-left' || action === 'joined-meeting') {
        setParticipants((p) => {
          if (action === 'participant-left') return Math.max(1, (p || 2) - 1);
          return (p || 1) + (action === 'participant-joined' ? 1 : 0);
        });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Lock body scroll while the call is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await appointmentService.endVideoCall(appointment._id);
    } catch {
      // Close the UI regardless — the room expires on its own after 2h.
    }
    onClose?.();
  }

  function copyCustomerLink() {
    const done = () => toast.success('Link copied! Share with your customer');
    const fail = () => toast.error('Could not copy the link');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(roomUrl).then(done, fail);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = roomUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch { fail(); }
    }
  }

  return (
    <div className="vc-overlay" role="dialog" aria-label="Video call">
      <header className="vc-header">
        <div className="vc-title">
          <span className="vc-live"><span className="vc-live-dot" /> LIVE</span>
          <span className="vc-appt-name" title={appointment.title}>{appointment.title}</span>
        </div>

        <div className="vc-center">
          <span className="vc-timer"><RiTimeLine /> {fmtTimer(seconds)}</span>
          <span className="vc-participants">
            <RiGroupLine /> {participants != null ? participants : '—'}
          </span>
        </div>

        <div className="vc-actions">
          <button className="vc-btn vc-btn-ghost" onClick={copyCustomerLink}>
            <RiFileCopyLine /> <span className="vc-btn-label">Copy Customer Link</span>
          </button>
          <button className="vc-btn vc-btn-leave" onClick={handleLeave} disabled={leaving}>
            {leaving ? <RiLoader4Line className="vc-spin" /> : <RiLogoutBoxRLine />}
            <span className="vc-btn-label">Leave</span>
          </button>
          <button className="vc-btn vc-btn-icon" onClick={handleLeave} aria-label="Close call">
            <RiCloseLine />
          </button>
        </div>
      </header>

      <div className="vc-stage">
        {roomUrl ? (
          <iframe
            className="vc-frame"
            title={`Video call — ${appointment.title}`}
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
          />
        ) : (
          <div className="vc-connecting"><RiLoader4Line className="vc-spin" /> Connecting…</div>
        )}
      </div>
    </div>
  );
}
