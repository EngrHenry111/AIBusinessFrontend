import { useState, useEffect, useRef } from 'react';
import { appointmentService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiCloseLine, RiTimeLine, RiFileCopyLine, RiLoader4Line,
  RiExternalLinkLine, RiCloseCircleLine, RiVideoLine,
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
  const { user } = useAuth();
  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const startedAt = useRef(Date.now());
  const openedOnce = useRef(false);

  const roomName = (roomUrl || '').split('/').filter(Boolean).pop() || 'video room';
  const userName = user?.name || 'Host';

  // The call runs in a real browser tab (no iframe → no time limit). Config
  // params only tune the UX; the room is the same as the shared link.
  const jitsiUrl = roomUrl
    ? `${roomUrl}#userInfo.displayName="${userName}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","hangup","chat","fullscreen"]`
    : null;

  function openCallTab() {
    if (!jitsiUrl) return;
    const w = window.open(jitsiUrl, '_blank', 'noopener');
    if (!w) toast.error('Allow pop-ups for bislyai.com, then click "Open call"');
  }

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Launch the call tab once, right after the card mounts
  useEffect(() => {
    if (openedOnce.current || !jitsiUrl) return;
    openedOnce.current = true;
    openCallTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      await appointmentService.endVideoCall(appointment._id);
    } catch {
      // Close the card regardless — the room expires on its own.
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
    <div className="vc-card" role="dialog" aria-label="Active video call">
      <div className="vc-card-head">
        <span className="vc-status"><span className="vc-dot" /> Call in progress</span>
        <button className="vc-x" onClick={handleEnd} aria-label="End call"><RiCloseLine /></button>
      </div>

      <div className="vc-card-body">
        <div className="vc-icon"><RiVideoLine /></div>
        <div className="vc-meta">
          <div className="vc-appt" title={appointment.title}>{appointment.title}</div>
          <div className="vc-room" title={roomName}>{roomName}</div>
          <div className="vc-time"><RiTimeLine /> {fmtTimer(seconds)}</div>
        </div>
      </div>

      <div className="vc-card-actions">
        <button className="vc-abtn" onClick={openCallTab}>
          <RiExternalLinkLine /> Open call
        </button>
        <button className="vc-abtn" onClick={copyCustomerLink}>
          <RiFileCopyLine /> Copy Customer Link
        </button>
        <button className="vc-abtn vc-end" onClick={handleEnd} disabled={ending}>
          {ending ? <RiLoader4Line className="vc-spin" /> : <RiCloseCircleLine />} End Call
        </button>
      </div>
    </div>
  );
}
