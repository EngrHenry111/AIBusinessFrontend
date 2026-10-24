import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiUserHeartLine, RiSearchLine, RiAddLine, RiLoader4Line } from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { PatientFormModal, useHospitalSettings } from './HospitalForms';
import { money, fmtDate, sexAge, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

export default function Patients() {
  const navigate = useNavigate();
  const me = useHospitalMe();
  const settings = useHospitalSettings();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [hmo, setHmo] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await hospitalService.getPatients({ search: search || undefined, status, hmo: hmo || undefined, page, limit: 50 });
      setRows(data.data);
      setPagination(data.pagination);
    } catch (e) { toast.error(errMsg(e, 'Failed to load patients')); } finally { setLoading(false); }
  }, [search, status, hmo, page]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useHospitalLive(load, ['patients', 'payment', 'bills']);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiUserHeartLine style={{ verticalAlign: '-3px' }} /> Patients</h1>
          <p>{pagination.total.toLocaleString()} patient{pagination.total === 1 ? '' : 's'}{hmo ? ` on ${hmo}` : ''}.</p>
        </div>
        {can.register(me) && <button className="btn btn-primary" onClick={() => setModal(true)}><RiAddLine /> Register patient</button>}
      </div>
      <div className="card">
        <div className="sc-filters">
          <div className="sc-search"><RiSearchLine /><input placeholder="Search name, hospital no., phone or enrollee ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <select className="form-input form-select" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="deceased">Deceased</option><option value="all">All</option>
          </select>
          <select className="form-input form-select" aria-label="HMO" value={hmo} onChange={(e) => { setHmo(e.target.value); setPage(1); }}>
            <option value="">All payers</option>
            {(settings?.hmos || []).map((h) => <option key={h._id} value={h.name}>{h.name}</option>)}
          </select>
        </div>
        {loading ? <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div> : rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RiUserHeartLine /></div>
            <h3>No patients found</h3>
            <p>Register a patient to give them a hospital number and card.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Patient</th><th>Hospital no.</th><th>Phone</th><th>Payer</th><th>Last visit</th>{can.cash(me) && <th className="num">Owes</th>}</tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p._id} className="sc-row" onClick={() => navigate(`/hospital/patients/${p._id}`)}>
                      <td><div className="sc-strong">{p.fullName}</div><span className="cell-sub">{sexAge(p)}{p.allergies?.length ? ' · allergies' : ''}{p.status !== 'active' ? ` · ${p.status}` : ''}</span></td>
                      <td>{p.hospitalNumber}</td>
                      <td>{p.phone || '—'}</td>
                      <td>{p.insurance?.hmo ? <span className="badge badge-info">{p.insurance.hmo}</span> : <span className="cell-sub">Self</span>}</td>
                      <td>{p.lastVisitAt ? fmtDate(p.lastVisitAt) : <span className="cell-sub">—</span>}</td>
                      {can.cash(me) && <td className="num">{p.balance > 0 ? <span className="sc-owing">{money(p.balance)}</span> : <span className="cell-sub">—</span>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="sc-table-foot">
                <span>Page {pagination.page} of {pagination.pages}</span>
                <div className="sc-actions">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((x) => x + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {modal && <PatientFormModal onClose={() => setModal(false)} onSaved={(p) => navigate(`/hospital/patients/${p._id}`)} />}
    </div>
  );
}
