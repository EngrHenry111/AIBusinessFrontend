import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { whatsappService } from '../../services';
import { connectSocket } from '../../services/socket';
import { RiWhatsappLine, RiLoader4Line, RiLink, RiLinkUnlink, RiRefreshLine, RiInboxLine, RiArrowRightLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import './WhatsApp.css';

// Connecting the business's WhatsApp number. The chats themselves are
// answered in the shared Inbox, alongside every other channel.
export default function WhatsApp() {
  const { user, company } = useAuth();
  const companyId = company?.id || company?._id;

  const [waStatus, setWaStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [waError, setWaError] = useState(null);
  const [waPhone, setWaPhone] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await whatsappService.getStatus();
      setWaStatus(data.data.status);
      setQr(data.data.qr || null);
      setWaError(data.data.error || null);
      setWaPhone(data.data.phone || null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (waStatus === 'connected' || waStatus === 'disconnected') return undefined;
    const iv = setInterval(loadStatus, 4000);
    return () => clearInterval(iv);
  }, [waStatus, loadStatus]);

  useEffect(() => {
    if (!companyId) return undefined;
    const socket = connectSocket();
    socket.on('connect', () => {
      socket.emit('whatsapp:join', companyId);
      socket.emit('join_user', user._id);
    });
    socket.on('whatsapp:qr', (p) => { setQr(p.qr); setWaStatus('qr_ready'); });
    socket.on('whatsapp:status', (p) => {
      setWaStatus(p.status);
      setWaError(p.error || null);
      if (p.status === 'connected') { setQr(null); setWaPhone(p.phone || null); toast.success('WhatsApp connected'); }
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user._id]);

  async function connect() {
    setConnecting(true);
    try {
      const { data } = await whatsappService.initialize();
      setWaStatus(data.data?.status || 'connecting');
      toast('Starting WhatsApp — scan the QR code', { icon: '📱' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start WhatsApp');
    } finally { setConnecting(false); }
  }

  async function disconnectWa() {
    if (!window.confirm('Disconnect this WhatsApp number?')) return;
    try {
      await whatsappService.disconnect();
      setWaStatus('disconnected'); setQr(null); setWaPhone(null);
      toast.success('WhatsApp disconnected');
    } catch { toast.error('Failed to disconnect'); }
  }

  const connected = waStatus === 'connected';

  return (
    <div className="wa-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><RiWhatsappLine style={{ color: '#25D366' }} /> WhatsApp</h1>
            <p>Connect your business number. The AI answers customers, and your team takes over from the Inbox.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadStatus}>
            <RiRefreshLine /> Refresh
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="wa-connect card card-pad">
          <div className="wa-connect-info">
            <div className={`wa-status-dot ${waStatus}`} />
            <div>
              <strong>
                {waStatus === 'qr_ready' ? 'Scan the QR code'
                  : waStatus === 'connecting' ? 'Starting WhatsApp…'
                    : waStatus === 'error' ? 'Connection error'
                      : 'WhatsApp not connected'}
              </strong>
              <p>
                {waError || (waStatus === 'qr_ready'
                  ? 'Open WhatsApp on your phone → Linked devices → Link a device'
                  : 'Connect your business WhatsApp number so the AI can reply to customers.')}
              </p>
            </div>
          </div>
          <div className="wa-connect-action">
            {qr && waStatus === 'qr_ready' ? (
              <img className="wa-qr" src={qr} alt="WhatsApp QR code" />
            ) : (
              <button className="btn btn-primary" onClick={connect} disabled={connecting || waStatus === 'connecting'}>
                {connecting || waStatus === 'connecting' ? <RiLoader4Line className="spin" /> : <RiLink />}
                {waStatus === 'error' ? 'Retry connection' : 'Connect WhatsApp'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="wa-connected card">
          <span className="wa-status-dot connected" />
          <span>Connected{waPhone ? ` · +${waPhone}` : ''}</span>
          <button className="btn btn-sm btn-secondary" onClick={disconnectWa}><RiLinkUnlink /> Disconnect</button>
        </div>
      )}

      <Link to="/inbox?channel=whatsapp" className="wa-inbox-link card card-pad">
        <RiInboxLine />
        <div>
          <strong>WhatsApp chats are in the Inbox</strong>
          <p>Read and answer them next to your website chats, with each customer's history and purchases beside the conversation.</p>
        </div>
        <RiArrowRightLine />
      </Link>
    </div>
  );
}
