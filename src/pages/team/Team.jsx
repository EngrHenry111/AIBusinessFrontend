import { useState, useEffect } from 'react';
import { userService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiAddLine, RiUserLine, RiMailLine, RiShieldLine,
  RiDeleteBinLine, RiEditLine, RiCheckLine, RiCloseLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Team.css';

const ROLES = ['employee','manager','company_owner'];
const ROLE_LABELS = { employee:'Employee', manager:'Manager', company_owner:'Owner' };
const ROLE_COLORS = { employee:'neutral', manager:'info', company_owner:'brand', super_admin:'danger' };

export default function Team() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'employee' });
  const [editingRole, setEditingRole] = useState(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadTeam(); }, []);

  async function loadTeam() {
    setLoading(true);
    try {
      const { data } = await userService.getTeam();
      setMembers(data.data);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      const { data } = await userService.inviteMember(inviteForm);
      setMembers(prev => [...prev, data.data]);
      setShowInvite(false);
      setInviteForm({ name:'', email:'', role:'employee' });
      toast.success(`${inviteForm.name} invited successfully`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite'); }
    finally { setInviting(false); }
  }

  async function handleRoleChange(id, role) {
    try {
      const { data } = await userService.updateMemberRole(id, role);
      setMembers(prev => prev.map(m => m._id===id ? data.data : m));
      setEditingRole(null);
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleRemove(id, name) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await userService.removeMember(id);
      setMembers(prev => prev.map(m => m._id===id ? {...m, status:'inactive'} : m));
      toast.success(`${name} removed`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  const activeMembers = members.filter(m => m.status==='active');
  const inactiveMembers = members.filter(m => m.status!=='active');

  return (
    <div className="team-page fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Team</h1>
            <p>{activeMembers.length} active members</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(v=>!v)}>
            <RiAddLine /> Invite Member
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card card-pad">
          <h3 style={{marginBottom:16}}>Invite Team Member</h3>
          <form onSubmit={handleInvite} className="invite-form">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={inviteForm.name}
                onChange={e=>setInviteForm(p=>({...p,name:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" value={inviteForm.email}
                onChange={e=>setInviteForm(p=>({...p,email:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <div className="role-selector">
                {ROLES.map(role => (
                  <button key={role} type="button"
                    className={`role-btn ${inviteForm.role===role?'active':''}`}
                    onClick={() => setInviteForm(p=>({...p,role}))}>
                    <RiShieldLine />
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" className={`btn btn-primary ${inviting?'btn-loading':''}`} disabled={inviting}>
                {!inviting && 'Send Invitation'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowInvite(false)}>Cancel</button>
            </div>
            <p style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>
              A temporary password will be generated. Share it with the team member to log in.
            </p>
          </form>
        </div>
      )}

      {/* Active members */}
      {loading ? (
        Array(4).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:72,marginBottom:10,borderRadius:12}} />)
      ) : (
        <div className="team-section">
          <div className="team-list">
            {activeMembers.map(member => (
              <div key={member._id} className={`member-card card ${member._id===currentUser?._id?'is-you':''}`}>
                <div className="member-avatar">
                  {member.avatar
                    ? <img src={member.avatar} alt={member.name} />
                    : <span>{member.name?.[0]?.toUpperCase()}</span>
                  }
                  <div className={`avatar-status ${member.status}`} />
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.name}
                    {member._id===currentUser?._id && <span className="you-tag">You</span>}
                  </div>
                  <div className="member-email"><RiMailLine /> {member.email}</div>
                  {member.lastLogin && (
                    <div className="member-last-login">
                      Last login: {new Date(member.lastLogin).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="member-role-section">
                  {editingRole===member._id ? (
                    <div className="role-edit">
                      <select className="form-input form-select" defaultValue={member.role}
                        onChange={e=>handleRoleChange(member._id, e.target.value)}>
                        {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setEditingRole(null)}>
                        <RiCloseLine />
                      </button>
                    </div>
                  ) : (
                    <div className="role-display">
                      <span className={`badge badge-${ROLE_COLORS[member.role]||'neutral'}`}>
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                      {member._id!==currentUser?._id && member.role!=='company_owner' && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Change role"
                          onClick={()=>setEditingRole(member._id)}>
                          <RiEditLine />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {member._id!==currentUser?._id && member.role!=='company_owner' && (
                  <button className="btn btn-ghost btn-icon btn-sm remove-btn"
                    onClick={()=>handleRemove(member._id, member.name)} title="Remove">
                    <RiDeleteBinLine />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div className="team-section">
          <h3 className="section-title">Inactive Members</h3>
          <div className="team-list">
            {inactiveMembers.map(member => (
              <div key={member._id} className="member-card card inactive">
                <div className="member-avatar"><span>{member.name?.[0]?.toUpperCase()}</span></div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-email"><RiMailLine /> {member.email}</div>
                </div>
                <span className="badge badge-neutral">Inactive</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeMembers.length===0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><RiUserLine /></div>
          <h3>No team members yet</h3>
          <p>Invite your first team member to collaborate.</p>
          <button className="btn btn-primary" onClick={()=>setShowInvite(true)}><RiAddLine /> Invite Member</button>
        </div>
      )}
    </div>
  );
}
