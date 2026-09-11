import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService, companyService } from '../../services';
import {
  RiUserLine, RiBuildingLine, RiRobot2Line, RiLockLine,
  RiCheckLine, RiLoader4Line, RiMoonLine, RiSunLine, RiImageAddLine, RiShieldKeyholeLine
} from 'react-icons/ri';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import TwoFactor from './TwoFactor';
import './Settings.css';

const TABS = [
  { id:'profile', label:'Profile', icon: RiUserLine },
  { id:'company', label:'Company', icon: RiBuildingLine },
  { id:'ai', label:'AI Settings', icon: RiRobot2Line },
  { id:'security', label:'Security', icon: RiShieldKeyholeLine },
  { id:'password', label:'Password', icon: RiLockLine },
];

export default function Settings() {
  const { user, company, updateUser, updateCompany } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', preferences: user?.preferences || {} });

  // Company form
  const [companyForm, setCompanyForm] = useState({
    companyName: company?.companyName || '',
    industry: company?.industry || '',
    website: company?.website || '',
    profile: {
      tagline: company?.profile?.tagline || '',
      email: company?.profile?.email || '',
      phone: company?.profile?.phone || '',
      address: company?.profile?.address || '',
      rcNumber: company?.profile?.rcNumber || '',
      tin: company?.profile?.tin || '',
      socials: {
        twitter: company?.profile?.socials?.twitter || '',
        facebook: company?.profile?.socials?.facebook || '',
        instagram: company?.profile?.socials?.instagram || '',
        linkedin: company?.profile?.socials?.linkedin || '',
        whatsapp: company?.profile?.socials?.whatsapp || '',
      },
    },
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const setProfileField = (field, value) =>
    setCompanyForm((p) => ({ ...p, profile: { ...p.profile, [field]: value } }));
  const setSocialField = (field, value) =>
    setCompanyForm((p) => ({ ...p, profile: { ...p.profile, socials: { ...p.profile.socials, [field]: value } } }));

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
      const { data } = await userService.updateProfile({
        name: profileForm.name,
        preferences: profileForm.preferences || {},
      });
      updateUser(data.data);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await userService.updateProfile(fd);
      updateUser(data.data);
      toast.success('Profile photo updated');
    } catch (err) {
      setAvatarPreview(null);
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
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

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be under 5MB'); return; }

    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const { data } = await companyService.update(fd);
      updateCompany(data.data);
      toast.success('Company logo updated');
    } catch (err) {
      setLogoPreview(null);
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
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
                  {(avatarPreview || user?.avatar)
                    ? <img src={avatarPreview || user.avatar} alt={user?.name} />
                    : <span>{user?.name?.[0]?.toUpperCase()}</span>}
                  {uploadingAvatar && <div className="avatar-uploading"><RiLoader4Line className="spin" /></div>}
                </div>
                <div>
                  <div className="avatar-name">{user?.name}</div>
                  <div className="avatar-email">{user?.email}</div>
                  <label className="btn btn-secondary btn-sm avatar-upload-btn">
                    <RiImageAddLine /> {user?.avatar ? 'Change Photo' : 'Add Photo'}
                    <input type="file" accept="image/*" hidden disabled={uploadingAvatar} onChange={handleAvatarChange} />
                  </label>
                  <div className="avatar-hint">JPG or PNG, up to 5MB</div>
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
              <p className="settings-subtitle">
                This information appears on your invoices, AI-generated reminders, your storefront and the customer portal.
              </p>

              {/* Logo */}
              <div className="avatar-section">
                <div className="settings-avatar">
                  {(logoPreview || company?.logo)
                    ? <img src={logoPreview || company.logo} alt={company?.companyName} />
                    : <span>{company?.companyName?.[0]?.toUpperCase()}</span>}
                  {uploadingLogo && <div className="avatar-uploading"><RiLoader4Line className="spin" /></div>}
                </div>
                <div>
                  <div className="avatar-name">{company?.companyName}</div>
                  <div className="avatar-email">Company logo</div>
                  <label className="btn btn-secondary btn-sm avatar-upload-btn">
                    <RiImageAddLine /> {company?.logo ? 'Change Logo' : 'Add Logo'}
                    <input type="file" accept="image/*" hidden disabled={uploadingLogo} onChange={handleLogoChange} />
                  </label>
                  <div className="avatar-hint">JPG or PNG, up to 5MB</div>
                </div>
              </div>

              <form onSubmit={saveCompany} className="settings-form">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={companyForm.companyName}
                    onChange={e=>setCompanyForm(p=>({...p,companyName:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tagline</label>
                  <input className="form-input" placeholder="e.g. Quality you can trust"
                    value={companyForm.profile.tagline}
                    onChange={e=>setProfileField('tagline', e.target.value)} />
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

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Company Email <span className="form-hint">(shown on invoices)</span></label>
                    <input className="form-input" type="email" placeholder="billing@yourcompany.com"
                      value={companyForm.profile.email}
                      onChange={e=>setProfileField('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Phone</label>
                    <input className="form-input" type="tel" placeholder="+234 800 000 0000"
                      value={companyForm.profile.phone}
                      onChange={e=>setProfileField('phone', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Address</label>
                  <input className="form-input" placeholder="Street, City, State, Country"
                    value={companyForm.profile.address}
                    onChange={e=>setProfileField('address', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" type="url" placeholder="https://yourcompany.com"
                    value={companyForm.website}
                    onChange={e=>setCompanyForm(p=>({...p,website:e.target.value}))} />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">RC Number <span className="form-hint">(business registration)</span></label>
                    <input className="form-input" placeholder="RC1234567"
                      value={companyForm.profile.rcNumber}
                      onChange={e=>setProfileField('rcNumber', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TIN <span className="form-hint">(tax ID)</span></label>
                    <input className="form-input" placeholder="12345678-0001"
                      value={companyForm.profile.tin}
                      onChange={e=>setProfileField('tin', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Social Media Handles</label>
                  <div className="form-grid-2">
                    <input className="form-input" placeholder="Twitter / X URL"
                      value={companyForm.profile.socials.twitter}
                      onChange={e=>setSocialField('twitter', e.target.value)} />
                    <input className="form-input" placeholder="Facebook URL"
                      value={companyForm.profile.socials.facebook}
                      onChange={e=>setSocialField('facebook', e.target.value)} />
                    <input className="form-input" placeholder="Instagram URL"
                      value={companyForm.profile.socials.instagram}
                      onChange={e=>setSocialField('instagram', e.target.value)} />
                    <input className="form-input" placeholder="LinkedIn URL"
                      value={companyForm.profile.socials.linkedin}
                      onChange={e=>setSocialField('linkedin', e.target.value)} />
                    <input className="form-input" placeholder="WhatsApp number (+234...)"
                      value={companyForm.profile.socials.whatsapp}
                      onChange={e=>setSocialField('whatsapp', e.target.value)} />
                  </div>
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

          {/* Security */}
          {activeTab==='security' && (
            <div className="card card-pad">
              <h2>Security</h2>
              <p className="settings-subtitle">Protect your account with two-factor authentication</p>
              <TwoFactor />
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
