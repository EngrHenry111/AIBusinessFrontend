import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { documentService, knowledgeBaseService, userService } from '../../services';
import {
  RiRobot2Line, RiCheckLine, RiArrowRightLine,
  RiUploadLine, RiTeamLine, RiRocketLine, RiSkipRightLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Onboarding.css';

const STEPS = [
  { id: 'welcome', title: 'Welcome!', icon: RiRobot2Line },
  { id: 'upload', title: 'Upload Documents', icon: RiUploadLine },
  { id: 'invite', title: 'Invite Team', icon: RiTeamLine },
  { id: 'done', title: "You're Ready!", icon: RiRocketLine },
];

export default function Onboarding() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    let count = 0;
    for (const file of files.slice(0, 3)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        await documentService.upload(fd);
        count++;
      } catch {}
    }
    setUploaded(prev => prev + count);
    toast.success(`${count} document${count > 1 ? 's' : ''} uploaded`);
    setUploading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviting(true);
    try {
      await userService.inviteMember({ name: inviteName, email: inviteEmail, role: 'employee' });
      setInvited(prev => [...prev, { name: inviteName, email: inviteEmail }]);
      setInviteName(''); setInviteEmail('');
      toast.success(`${inviteName} invited!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite');
    } finally { setInviting(false); }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Progress */}
        <div className="ob-progress">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`ob-step ${i <= step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="ob-step-dot">
                {i < step ? <RiCheckLine /> : i + 1}
              </div>
              <span className="ob-step-label">{s.title}</span>
              {i < STEPS.length - 1 && <div className="ob-step-line" />}
            </div>
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="ob-content">
            <div className="ob-icon"><RiRobot2Line /></div>
            <h1>Welcome to EngrHenryTech BusinessAI!</h1>
            <p>Hello <strong>{user?.name}</strong>! Your workspace <strong>{company?.name || company?.companyName}</strong> is ready.</p>
            <p>Let's take 2 minutes to set everything up so you get the most out of the platform.</p>
            <div className="ob-features">
              {[
                ['📄', 'Upload your documents to build your AI knowledge base'],
                ['💬', 'Ask AI anything about your business documents'],
                ['👥', 'Invite your team to collaborate'],
                ['📊', 'Track leads, invoices, orders and more'],
              ].map(([icon, text], i) => (
                <div key={i} className="ob-feature">
                  <span className="ob-feature-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="ob-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                Get Started <RiArrowRightLine />
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                <RiSkipRightLine /> Skip setup
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Upload */}
        {step === 1 && (
          <div className="ob-content">
            <div className="ob-icon" style={{ background: '#eef2ff' }}><RiUploadLine style={{ color: '#6366f1' }} /></div>
            <h1>Upload Your Documents</h1>
            <p>Upload PDFs, Word docs, or text files. The AI will read them and answer questions about your business.</p>
            <div className="ob-upload-area">
              <input type="file" id="ob-file" multiple accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display: 'none' }} />
              <label htmlFor="ob-file" className="ob-upload-label">
                <RiUploadLine />
                <span>{uploading ? 'Uploading...' : 'Click to upload (PDF, DOCX, TXT)'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Up to 3 files · Max 50MB each</span>
              </label>
              {uploaded > 0 && (
                <div className="ob-uploaded">
                  <RiCheckLine style={{ color: '#10b981' }} />
                  {uploaded} document{uploaded > 1 ? 's' : ''} uploaded successfully
                </div>
              )}
            </div>
            <div className="ob-actions">
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                {uploaded > 0 ? 'Continue' : 'Skip for now'} <RiArrowRightLine />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Invite */}
        {step === 2 && (
          <div className="ob-content">
            <div className="ob-icon" style={{ background: '#f0fdf4' }}><RiTeamLine style={{ color: '#10b981' }} /></div>
            <h1>Invite Your Team</h1>
            <p>Add team members so they can collaborate with you on the platform.</p>
            <form onSubmit={handleInvite} className="ob-invite-form">
              <input className="form-input" placeholder="e.g. EngrHenryTech" value={inviteName}
                onChange={e => setInviteName(e.target.value)} />
              <input className="form-input" type="email" placeholder="e.g. engrhenrytech@gmail.com" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)} />
              <button type="submit" className={`btn btn-secondary ${inviting ? 'btn-loading' : ''}`} disabled={inviting}>
                {!inviting && 'Send Invite'}
              </button>
            </form>
            {invited.length > 0 && (
              <div className="ob-invited-list">
                {invited.map((m, i) => (
                  <div key={i} className="ob-invited-item">
                    <RiCheckLine style={{ color: '#10b981' }} />
                    <span>{m.name} ({m.email})</span>
                  </div>
                ))}
              </div>
            )}
            <div className="ob-actions">
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                {invited.length > 0 ? 'Continue' : 'Skip for now'} <RiArrowRightLine />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="ob-content ob-done">
            <div className="ob-done-icon"><RiRocketLine /></div>
            <h1>You're all set! 🎉</h1>
            <p>Your workspace is ready. Here's what you can do next:</p>
            <div className="ob-next-steps">
              {[
                { icon: '💬', label: 'Ask AI a question', url: '/chat' },
                { icon: '👤', label: 'Add your first lead', url: '/leads' },
                { icon: '📊', label: 'View your dashboard', url: '/dashboard' },
                { icon: '⚙️', label: 'Configure settings', url: '/settings' },
              ].map(({ icon, label, url }, i) => (
                <button key={i} className="ob-next-btn" onClick={() => navigate(url)}>
                  <span className="ob-next-icon">{icon}</span>
                  <span>{label}</span>
                  <RiArrowRightLine />
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <RiArrowRightLine />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
