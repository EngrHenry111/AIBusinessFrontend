import { useState, useEffect, useCallback, useRef } from 'react';
import { userService, departmentService, auditService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  RiAddLine, RiUserLine, RiMailLine, RiShieldLine,
  RiDeleteBinLine, RiEditLine, RiCheckLine, RiCloseLine,
  RiMailSendLine, RiUploadCloud2Line, RiHistoryLine, RiTimeLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Team.css';

// company_owner is deliberately never in here — there is exactly one owner
// per company and no transfer-of-ownership flow, so it's never something a
// dropdown assigns. The backend enforces this too (see userController).
const ROLES = ['employee','manager'];
const ROLE_LABELS = { employee:'Employee', manager:'Manager', company_owner:'Owner' };
const ROLE_COLORS = { employee:'neutral', manager:'info', company_owner:'brand', super_admin:'danger' };

export default function Team() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'company_owner' || currentUser?.role === 'super_admin';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'employee' });
  const [editingRole, setEditingRole] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [departments, setDepartments] = useState({ standard: [], custom: [] });
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [activity, setActivity] = useState(null);

  useEffect(() => { loadTeam(); loadDepartments(); loadActivity(); }, []);

  async function loadActivity() {
    try {
      const { data } = await auditService.getLogs({ action: 'team', limit: 8 });
      setActivity(data.logs);
    } catch { setActivity([]); }
  }

  async function loadTeam() {
    setLoading(true);
    try {
      const { data } = await userService.getTeam();
      setMembers(data.data);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }

  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await departmentService.getAll();
      setDepartments(data.data);
    } catch { /* non-critical — department UI just stays empty */ }
  }, []);

  const allDepartments = [...departments.standard, ...departments.custom];

  async function handleDepartmentChange(id, department) {
    try {
      const { data } = await userService.updateMemberDepartment(id, department || null);
      setMembers(prev => prev.map(m => m._id===id ? data.data : m));
      setEditingDept(null);
      toast.success('Department updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
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
      loadActivity();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite'); }
    finally { setInviting(false); }
  }

  async function handleResendInvite(id, email) {
    setResendingId(id);
    try {
      await userService.resendInvite(id);
      toast.success(`Invite reminder sent to ${email}`);
      loadActivity();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to resend'); }
    finally { setResendingId(null); }
  }

  async function handleRoleChange(id, role) {
    try {
      const { data } = await userService.updateMemberRole(id, role);
      setMembers(prev => prev.map(m => m._id===id ? data.data : m));
      setEditingRole(null);
      toast.success('Role updated');
      loadActivity();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function handleRemove(id, name) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await userService.removeMember(id);
      setMembers(prev => prev.map(m => m._id===id ? {...m, status:'inactive'} : m));
      toast.success(`${name} removed`);
      loadActivity();
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
          <div style={{display:'flex',gap:8}}>
            {isOwner && (
              <button className="btn btn-secondary" onClick={() => setShowDeptManager(v=>!v)}>
                Manage Departments
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowBulkInvite(v=>!v)}>
              <RiUploadCloud2Line /> Bulk Invite (CSV)
            </button>
            <button className="btn btn-primary" onClick={() => setShowInvite(v=>!v)}>
              <RiAddLine /> Invite Member
            </button>
          </div>
        </div>
      </div>

      {showDeptManager && isOwner && (
        <DepartmentManager departments={departments} onChanged={loadDepartments} />
      )}

      {showBulkInvite && (
        <BulkInviteForm
          isOwner={isOwner}
          onClose={() => setShowBulkInvite(false)}
          onDone={() => { setShowBulkInvite(false); loadTeam(); loadActivity(); }}
        />
      )}

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
                {ROLES.filter(role => role === 'employee' || isOwner).map(role => (
                  <button key={role} type="button"
                    className={`role-btn ${inviteForm.role===role?'active':''}`}
                    onClick={() => setInviteForm(p=>({...p,role}))}>
                    <RiShieldLine />
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
              {!isOwner && <p style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>Only the company owner can invite someone as a manager.</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" className={`btn btn-primary ${inviting?'btn-loading':''}`} disabled={inviting}>
                {!inviting && 'Send Invitation'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowInvite(false)}>Cancel</button>
            </div>
            <p style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>
              They'll get an email with a link to set their own password and get started.
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
                    {!member.lastLogin && <span className="badge badge-warning" style={{marginLeft:8,fontSize:11}}>Pending</span>}
                  </div>
                  <div className="member-email"><RiMailLine /> {member.email}</div>
                  {member.lastLogin ? (
                    <div className="member-last-login">
                      Last login: {new Date(member.lastLogin).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="member-last-login">Hasn't set up their account yet</div>
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
                      {isOwner && member._id!==currentUser?._id && member.role!=='company_owner' && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Change role (owner only)"
                          onClick={()=>setEditingRole(member._id)}>
                          <RiEditLine />
                        </button>
                      )}
                    </div>
                  )}

                  {editingDept===member._id ? (
                    <div className="role-edit">
                      <select className="form-input form-select" defaultValue={member.department || ''}
                        onChange={e=>handleDepartmentChange(member._id, e.target.value)}>
                        <option value="">No department</option>
                        {allDepartments.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setEditingDept(null)}>
                        <RiCloseLine />
                      </button>
                    </div>
                  ) : (
                    <div className="role-display">
                      <span className="badge badge-neutral">{member.department || 'No department'}</span>
                      {member.role!=='company_owner' && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Change department"
                          onClick={()=>setEditingDept(member._id)}>
                          <RiEditLine />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!member.lastLogin && (
                  <button className="btn btn-ghost btn-icon btn-sm" title="Resend invite reminder"
                    disabled={resendingId===member._id}
                    onClick={()=>handleResendInvite(member._id, member.email)}>
                    <RiMailSendLine />
                  </button>
                )}

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

      {activity !== null && (
        <div className="card card-pad" style={{marginTop:20}}>
          <h3 style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}><RiHistoryLine /> Recent Team Activity</h3>
          {activity.length === 0 ? (
            <p style={{fontSize:13,color:'var(--text-muted)'}}>No team activity yet.</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {activity.map(log => (
                <div key={log._id} style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:13,borderBottom:'1px solid var(--border)',paddingBottom:8}}>
                  <span><strong>{log.user?.name || 'System'}</strong> — {log.description}</span>
                  <span style={{color:'var(--text-muted)',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
                    <RiTimeLine /> {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
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

// Minimal CSV parser — handles quoted fields with embedded commas, which is
// as much as a "name,email,role" invite sheet realistically needs.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const splitRow = (line) => {
    const cells = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === ',' && !inQuotes) { cells.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cells.push(cur.trim());
    return cells;
  };
  let rows = lines.map(splitRow);
  const header = rows[0]?.map(c => c.toLowerCase());
  if (header?.includes('email')) rows = rows.slice(1); // drop header row if present

  return rows.map(cells => {
    const nameIdx = header?.indexOf('name') ?? 0;
    const emailIdx = header?.indexOf('email') ?? 1;
    const roleIdx = header?.indexOf('role') ?? 2;
    return {
      name: cells[nameIdx >= 0 ? nameIdx : 0] || '',
      email: cells[emailIdx >= 0 ? emailIdx : 1] || '',
      role: (cells[roleIdx >= 0 ? roleIdx : 2] || 'employee').toLowerCase() === 'manager' ? 'manager' : 'employee',
    };
  }).filter(r => r.name || r.email);
}

function downloadSampleCSV() {
  const csv = 'name,email,role\nJane Doe,jane@example.com,employee\nJohn Smith,john@example.com,manager\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'bizlyai-team-invite-template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function BulkInviteForm({ isOwner, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCSV(String(reader.result || '')));
    reader.readAsText(file);
  }

  async function submit() {
    if (rows.length === 0) return toast.error('Add at least one row first.');
    setSubmitting(true);
    try {
      const { data } = await userService.bulkInviteMembers(rows);
      setResults(data.data);
      if (data.invited > 0) toast.success(`Invited ${data.invited} of ${rows.length} member(s)`);
      if (data.failed > 0) toast.error(`${data.failed} row(s) failed — see details below`);
      if (data.failed === 0) onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk invite failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card card-pad" style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h3 style={{marginBottom:4}}>Bulk Invite from CSV</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:0}}>
            Columns: name, email, role (role optional — employee, {isOwner ? 'or manager' : 'manager rows will be rejected unless you\'re the owner'}).
          </p>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><RiCloseLine /></button>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center',margin:'16px 0'}}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={downloadSampleCSV}>Download template</button>
      </div>

      {rows.length > 0 && !results && (
        <>
          <div className="table-wrapper" style={{marginBottom:16}}>
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
              <tbody>
                {rows.map((r,i) => <tr key={i}><td>{r.name}</td><td>{r.email}</td><td>{ROLE_LABELS[r.role]}</td></tr>)}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? 'Inviting…' : `Invite ${rows.length} Member${rows.length===1?'':'s'}`}
          </button>
        </>
      )}

      {results && (
        <div className="table-wrapper" style={{marginTop:8}}>
          <table className="table">
            <thead><tr><th>Email</th><th>Result</th></tr></thead>
            <tbody>
              {results.map((r,i) => (
                <tr key={i}>
                  <td>{r.email}</td>
                  <td>
                    {r.status === 'invited'
                      ? <span className="badge badge-success">Invited</span>
                      : <span className="badge badge-danger" title={r.message}>{r.message}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-secondary" style={{marginTop:12}} onClick={onDone}>Done</button>
        </div>
      )}
    </div>
  );
}

function DepartmentManager({ departments, onChanged }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await departmentService.add(name.trim());
      setName('');
      toast.success('Department added');
      onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add department'); }
    finally { setSaving(false); }
  }

  async function remove(dept) {
    if (!confirm(`Remove the "${dept}" department? Anyone assigned to it will become unassigned.`)) return;
    try { await departmentService.remove(dept); toast.success('Department removed'); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
  }

  return (
    <div className="card card-pad" style={{marginBottom:20}}>
      <h3 style={{marginBottom:8}}>Departments</h3>
      <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>
        Standard departments are free for every company. Add your own below — only you, as the owner, can create or remove them.
      </p>

      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
        {departments.standard.map(d => (
          <span key={d} className="badge badge-neutral">{d}</span>
        ))}
        {departments.custom.map(d => (
          <span key={d} className="badge badge-info" style={{display:'inline-flex',alignItems:'center',gap:6}}>
            {d}
            <button onClick={()=>remove(d)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',padding:0,color:'inherit'}} title="Remove">
              <RiCloseLine size={12} />
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={add} style={{display:'flex',gap:8}}>
        <input className="form-input" placeholder="e.g. Warehouse, Compliance…" value={name} onChange={e=>setName(e.target.value)} maxLength={60} />
        <button className="btn btn-secondary" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
      </form>
    </div>
  );
}
