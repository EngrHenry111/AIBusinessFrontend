import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  RiHospitalLine, RiUserAddLine, RiTestTubeLine, RiCapsuleLine, RiHotelBedLine, RiMoneyDollarCircleLine,
  RiLoader4Line, RiSettings3Line, RiCheckboxCircleFill, RiCheckboxBlankCircleLine, RiArrowRightSLine, RiLoginBoxLine,
} from 'react-icons/ri';
import { hospitalService } from '../../services';
import useHospitalLive from './useHospitalLive';
import useHospitalMe, { can } from './useHospitalMe';
import { CheckInModal, PatientFormModal } from './HospitalForms';
import { VISIT_STATUS, money, fmtDateTime, fullName, errMsg } from './hospitalConstants';
import '../school/School.css';
import './Hospital.css';

const shortMoney = (n) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `₦${Math.round(n / 1e3)}k` : `₦${n}`);

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const me = useHospitalMe();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await hospitalService.dashboard();
      setData(res.data);
    } catch (e) { toast.error(errMsg(e, 'Failed to load the hospital dashboard')); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useHospitalLive(load);

  if (!data) return <div className="sc-loading"><RiLoader4Line className="spin" /> Loading…</div>;
  const { visits, patients, lab, pharmacy, beds, money: cash, stock, queue, recentPayments, setup } = data;
  const waiting = (visits.byStatus.waiting || 0) + (visits.byStatus.triaged || 0);

  return (
    <div className="school-page fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1><RiHospitalLine style={{ verticalAlign: '-3px' }} /> {data.hospitalName || 'Hospital'}</h1>
          <p>{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })} <span className="sc-live" style={{ marginLeft: 10 }}>Live</span></p>
        </div>
        <div className="sc-actions">
          {can.admin(me) && <Link to="/hospital/settings" className="btn btn-secondary"><RiSettings3Line /> Settings</Link>}
          {can.register(me) && <button className="btn btn-secondary" onClick={() => setModal('register')}><RiUserAddLine /> Register patient</button>}
          {can.register(me) && <button className="btn btn-primary" onClick={() => setModal('checkin')}><RiLoginBoxLine /> Check in</button>}
        </div>
      </div>

      {can.admin(me) && setup.done < setup.total && <SetupChecklist setup={setup} />}

      <div className="sc-stats">
        <Link to="/hospital/queue" className="stat-card" style={{ color: 'inherit' }}>
          <div className="stat-label"><RiHospitalLine /> Patients today</div>
          <div className="stat-value">{visits.total}</div>
          <div className="cell-sub">{waiting} waiting · {visits.byStatus.in_consultation || 0} with doctor · {visits.byStatus.completed || 0} done</div>
        </Link>
        <Link to="/hospital/lab" className="stat-card" style={{ color: 'inherit' }}>
          <div className="stat-label"><RiTestTubeLine /> Lab</div>
          <div className="stat-value">{(lab.requested || 0) + (lab.collected || 0)}</div>
          <div className="cell-sub">{lab.requested || 0} awaiting sample · {lab.collected || 0} in progress</div>
        </Link>
        <Link to="/hospital/pharmacy" className="stat-card" style={{ color: 'inherit' }}>
          <div className="stat-label"><RiCapsuleLine /> Pharmacy</div>
          <div className="stat-value">{(pharmacy.pending || 0) + (pharmacy.billed || 0)}</div>
          <div className="cell-sub">{pharmacy.pending || 0} to price · {pharmacy.billed || 0} to dispense{stock.low ? ` · ${stock.low} low stock` : ''}</div>
        </Link>
        <Link to="/hospital/wards" className="stat-card" style={{ color: 'inherit' }}>
          <div className="stat-label"><RiHotelBedLine /> Beds</div>
          <div className="stat-value">{beds.occupied}/{beds.total}</div>
          <div className="cell-sub">{beds.total ? `${Math.round((beds.occupied / beds.total) * 100)}% occupied` : 'No wards yet'} · {beds.admitted} admitted</div>
        </Link>
      </div>

      <div className="sc-grid-main">
        <div className="card card-pad">
          <div className="sc-card-title"><span>Queue now</span><Link to="/hospital/queue">Full queue</Link></div>
          {queue.length === 0 ? <p className="cell-sub">Nobody waiting.</p> : (
            <ul className="sc-list">
              {queue.map((v) => (
                <li key={v._id} className="sc-row" onClick={() => navigate(`/hospital/visits/${v._id}`)}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`hp-queue-no ${v.priority}`}>{v.queueNumber}</span>
                    <div>
                      <span className="sc-strong">{fullName(v.patientId)}</span>
                      <span className="cell-sub">{v.department}{v.doctorId ? ` · ${v.doctorId.name}` : ''}</span>
                    </div>
                  </div>
                  <span className={`badge badge-${VISIT_STATUS[v.status]?.badge}`}>{VISIT_STATUS[v.status]?.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card-pad">
          <div className="sc-card-title"><span>Today</span></div>
          <div className="sc-kv"><span>New patients</span><div>{patients.newToday}</div></div>
          <div className="sc-kv"><span>Appointments still to come</span><div><Link to="/hospital/appointments">{data.appointmentsToday}</Link></div></div>
          <div className="sc-kv"><span>Patients on record</span><div>{patients.total.toLocaleString()}</div></div>
          {can.cash(me) && <div className="sc-kv"><span>Money received</span><div><b>{money(cash.today.amount)}</b> ({cash.today.n})</div></div>}
          {can.cash(me) && <div className="sc-kv"><span>Owed by patients</span><div><Link to="/hospital/billing?tab=debtors" className="sc-owing">{money(cash.outstanding.amount)}</Link></div></div>}
          {(stock.low > 0 || stock.expiring > 0) && can.seePharmacy(me) && (
            <div className="sc-note warn" style={{ marginTop: 10 }}>
              {stock.low > 0 && <Link to="/hospital/pharmacy?tab=stock&filter=low">{stock.low} drug(s) low on stock</Link>}
              {stock.low > 0 && stock.expiring > 0 && ' · '}
              {stock.expiring > 0 && <Link to="/hospital/pharmacy?tab=stock&filter=expiring">{stock.expiring} expiring within 60 days</Link>}
            </div>
          )}
        </div>
      </div>

      {can.cash(me) && (
        <div className="sc-grid-main">
          <div className="card card-pad">
            <div className="sc-card-title"><span><RiMoneyDollarCircleLine style={{ verticalAlign: '-2px' }} /> Money received: last 30 days</span></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cash.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} formatter={(v) => [money(v), 'Received']}
                    labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                  <Bar dataKey="amount" fill="var(--color-brand)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card card-pad">
            <div className="sc-card-title"><span>Latest payments</span><Link to="/hospital/billing?tab=payments">All</Link></div>
            {recentPayments.length === 0 ? <p className="cell-sub">No payments yet.</p> : (
              <ul className="sc-list">
                {recentPayments.map((p) => (
                  <li key={p._id}>
                    <div><span className="sc-strong">{fullName(p.patientId)}</span><span className="cell-sub">{fmtDateTime(p.paidAt)}</span></div>
                    <Link to={`/hospital/receipts/${p._id}`} className="sc-strong">{money(p.amount)}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {modal === 'checkin' && <CheckInModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'register' && <PatientFormModal onClose={() => setModal(null)} onSaved={(p) => { setModal(null); navigate(`/hospital/patients/${p._id}`); }} />}
    </div>
  );
}

function SetupChecklist({ setup }) {
  const next = setup.steps.find((s) => !s.done);
  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="sc-card-title">
        <span>Set up your hospital: {setup.done} of {setup.total} done</span>
        {next && <Link to={next.to} className="btn btn-primary btn-sm" style={{ textTransform: 'none', letterSpacing: 0 }}>Next: {next.label} <RiArrowRightSLine /></Link>}
      </div>
      <div className="sc-progress" style={{ marginTop: 0, marginBottom: 12 }}><div style={{ width: `${(setup.done / setup.total) * 100}%` }} /></div>
      <ol className="sc-setup">
        {setup.steps.map((s, i) => (
          <li key={s.key} className={s.done ? 'done' : ''}>
            {s.done ? <RiCheckboxCircleFill className="ok" aria-label="Done" /> : <RiCheckboxBlankCircleLine aria-label="To do" />}
            <div><Link to={s.to} className="sc-strong">{i + 1}. {s.label}</Link></div>
            <Link to={s.to} className="btn btn-ghost btn-sm">{s.done ? 'Review' : 'Go'} <RiArrowRightSLine /></Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
