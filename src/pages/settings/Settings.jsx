import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService, companyService } from '../../services';
import {
  RiUserLine, RiBuildingLine, RiRobot2Line, RiLockLine,
  RiCheckLine, RiLoader4Line, RiMoonLine, RiSunLine
} from 'react-icons/ri';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import './Settings.css';

const TABS = [
  { id:'profile', label:'Profile', icon: RiUserLine },
  { id:'company', label:'Company', icon: RiBuildingLine },
  { id:'ai', label:'AI Settings', icon: RiRobot2Line },
  { id:'password', label:'Password', icon: RiLockLine },
];

export default function Settings() {
  const { user, company, updateUser, updateCompany } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', preferences: user?.preferences || {} });

  // Company form
  const [companyForm, setCompanyForm] = useState({
    companyName: company?.companyName || '',
    industry: company?.industry || '',
    website: company?.website || '',
  });

  // AI settings
  const [aiForm, setAiForm] = useState({
    aiModel: company?.settings?.aiModel || 'llama-3.1-8b-instant',
    confidenceThreshold: company?.settings?.confidenceThreshold || 0.3,
    requireApprovalForActions: company?.settings?.requireApprovalForActions ?? true,
  });

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userService.updateProfile(profileForm);
      updateUser(data.data);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function saveCompany(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await companyService.update(companyForm);
      updateCompany(data.data);
      toast.success('Company updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function saveAI(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await companyService.updateAISettings(aiForm);
      toast.success('AI settings updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await userService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      toast.success('Password changed successfully');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="settings-page fade-in">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile, company, and preferences</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-nav card">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} className={`settings-nav-btn ${activeTab===t.id?'active':''}`}
                onClick={() => setActiveTab(t.id)}>
                <Icon /> {t.label}
              </button>
            );
          })}

          {/* Theme toggle in sidebar */}
          <div className="settings-nav-divider" />
          <div className="theme-toggle-section">
            <span className="theme-label">Appearance</span>
            <div className="theme-buttons">
              <button className={`theme-btn ${theme==='light'?'active':''}`} onClick={()=>setTheme('light')}>
                <RiSunLine /> Light
              </button>
              <button className={`theme-btn ${theme==='dark'?'active':''}`} onClick={()=>setTheme('dark')}>
                <RiMoonLine /> Dark
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="settings-content">

          {/* Profile */}
          {activeTab==='profile' && (
            <div className="card card-pad">
              <h2>Profile Settings</h2>
              <p className="settings-subtitle">Update your personal information</p>

              {/* Avatar */}
              <div className="avatar-section">
                <div className="settings-avatar">
                  {user?.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{user?.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <div className="avatar-name">{user?.name}</div>
                  <div className="avatar-email">{user?.email}</div>
                  <div className="avatar-role">{user?.role?.replace('_',' ')}</div>
                </div>
              </div>

              <form onSubmit={saveProfile} className="settings-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profileForm.name}
                    onChange={e=>setProfileForm(p=>({...p,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email} disabled style={{opacity:0.6}} />
                  <span className="form-hint">Email cannot be changed</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Notification Preferences</label>
                  <div className="pref-toggles">
                    <label className="pref-toggle">
                      <input type="checkbox"
                        checked={profileForm.preferences?.notifications?.email ?? true}
                        onChange={e=>setProfileForm(p=>({...p,preferences:{...p.preferences,notifications:{...p.preferences?.notifications,email:e.target.checked}}}))} />
                      Email notifications
                    </label>
                    <label className="pref-toggle">
                      <input type="checkbox"
                        checked={profileForm.preferences?.notifications?.browser ?? true}
                        onChange={e=>setProfileForm(p=>({...p,preferences:{...p.preferences,notifications:{...p.preferences?.notifications,browser:e.target.checked}}}))} />
                      Browser notifications
                    </label>
                  </div>
                </div>
                <button type="submit" className={`btn btn-primary ${saving?'btn-loading':''}`} disabled={saving}>
                  {!saving && <><RiCheckLine /> Save Profile</>}
                </button>
              </form>
            </div>
          )}

          {/* Company */}
          {activeTab==='company' && (
            <div className="card card-pad">
              <h2>Company Settings</h2>
              <p className="settings-subtitle">Update your company information</p>
              <form onSubmit={saveCompany} className="settings-form">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={companyForm.companyName}
                    onChange={e=>setCompanyForm(p=>({...p,companyName:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <select className="form-input form-select" value={companyForm.industry}
                    onChange={e=>setCompanyForm(p=>({...p,industry:e.target.value}))}>
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="consulting">Consulting</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" type="url" placeholder="https://yourcompany.com"
                    value={companyForm.website}
                    onChange={e=>setCompanyForm(p=>({...p,website:e.target.value}))} />
                </div>
                <div className="info-row">
                  <span>Subscription Plan</span>
                  <span className={`badge badge-brand`}>{company?.subscription?.plan || 'trial'}</span>
                </div>
                <button type="submit" className={`btn btn-primary ${saving?'btn-loading':''}`} disabled={saving}>
                  {!saving && <><RiCheckLine /> Save Company</>}
                </button>
              </form>
            </div>
          )}

          {/* AI Settings */}
          {activeTab==='ai' && (
            <div className="card card-pad">
              <h2>AI Settings</h2>
              <p className="settings-subtitle">Configure how AI behaves in your workspace</p>
              <form onSubmit={saveAI} className="settings-form">
                <div className="form-group">
                  <label className="form-label">AI Model</label>
                  <select className="form-input form-select" value={aiForm.aiModel}
                    onChange={e=>setAiForm(p=>({...p,aiModel:e.target.value}))}>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Smart)</option>
                    <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 (Reasoning)</option>
                  </select>
                  <span className="form-hint">Faster models respond quicker; smarter models give better answers</span>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Confidence Threshold: <strong>{Math.round(aiForm.confidenceThreshold * 100)}%</strong>
                  </label>
                  <input type="range" min={0} max={1} step={0.05} value={aiForm.confidenceThreshold}
                    onChange={e=>setAiForm(p=>({...p,confidenceThreshold:Number(e.target.value)}))}
                    style={{width:'100%'}} />
                  <span className="form-hint">
                    Minimum confidence required to show an answer. Higher = more conservative.
                  </span>
                </div>
                <div className="form-group">
                  <label className="pref-toggle">
                    <input type="checkbox" checked={aiForm.requireApprovalForActions}
                      onChange={e=>setAiForm(p=>({...p,requireApprovalForActions:e.target.checked}))} />
                    Require approval before AI takes actions
                  </label>
                </div>
                <div className="ai-model-info">
                  <h4>Current Model Info</h4>
                  <div className="model-info-grid">
                    {[
                      { name:'Llama 3.1 8B (Fast)', speed:'~1s', quality:'Good', use:'Chat, quick answers' },
                      { name:'Llama 3.3 70B (Smart)', speed:'~3s', quality:'Excellent', use:'Analysis, reports' },
                      { name:'DeepSeek R1', speed:'~5s', quality:'Best', use:'Complex reasoning' },
                    ].map(m => (
                      <div key={m.name} className={`model-card ${aiForm.aiModel===m.name.split(' ')[0].toLowerCase()?'active':''}`}>
                        <div className="model-name">{m.name}</div>
                        <div className="model-stats">
                          <span>Speed: {m.speed}</span>
                          <span>Quality: {m.quality}</span>
                        </div>
                        <div className="model-use">{m.use}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className={`btn btn-primary ${saving?'btn-loading':''}`} disabled={saving}>
                  {!saving && <><RiCheckLine /> Save AI Settings</>}
                </button>
              </form>
            </div>
          )}

          {/* Password */}
          {activeTab==='password' && (
            <div className="card card-pad">
              <h2>Change Password</h2>
              <p className="settings-subtitle">Use a strong password with at least 8 characters</p>
              <form onSubmit={savePassword} className="settings-form">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input" type="password" value={pwForm.currentPassword}
                    onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" value={pwForm.newPassword}
                    onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} minLength={8} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password" value={pwForm.confirmPassword}
                    onChange={e=>setPwForm(p=>({...p,confirmPassword:e.target.value}))} minLength={8} required />
                  {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                    <span className="form-error">Passwords do not match</span>
                  )}
                </div>
                <button type="submit" className={`btn btn-primary ${saving?'btn-loading':''}`}
                  disabled={saving || (pwForm.confirmPassword && pwForm.newPassword!==pwForm.confirmPassword)}>
                  {!saving && <><RiCheckLine /> Change Password</>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
