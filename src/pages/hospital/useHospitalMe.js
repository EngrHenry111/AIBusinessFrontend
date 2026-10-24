import { useState, useEffect } from 'react';
import { hospitalService } from '../../services';
import { useAuth } from '../../context/AuthContext';

// The signed-in user's hospital role. Fetched once per signed-in user and
// shared by every component; a role change applies on the next page load.
let owner = null;
let cache = null;
let inflight = null;
const listeners = new Set();

function load(userId) {
  if (owner !== userId) { owner = userId; cache = null; inflight = null; }
  if (!inflight) {
    inflight = hospitalService.me()
      .then(({ data }) => data.data)
      .catch(() => ({ role: 'admin', manager: false, failed: true })) // the server still enforces every rule
      .then((value) => {
        if (owner === userId) { cache = value; listeners.forEach((l) => l(cache)); }
        return value;
      });
  }
  return inflight;
}

export default function useHospitalMe(enabled = true) {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const [me, setMe] = useState(owner === userId ? cache : null);
  useEffect(() => {
    if (!enabled || !userId) return undefined;
    listeners.add(setMe);
    if (owner !== userId || !cache) { setMe(null); load(userId); } else setMe(cache);
    return () => listeners.delete(setMe);
  }, [enabled, userId]);
  return me;
}

// Screen helpers mirror the server's guards (routes/hospitalRoutes.js).
// While loading, show everything — the server decides.
const is = (me, ...roles) => !me || me.role === 'admin' || roles.includes(me.role);
export const can = {
  register: (me) => is(me, 'records', 'nurse', 'doctor', 'cashier'),
  triage: (me) => is(me, 'doctor', 'nurse'),
  consult: (me) => is(me, 'doctor'),
  orderLab: (me) => is(me, 'doctor', 'lab', 'nurse'),
  lab: (me) => is(me, 'lab'),
  seeLab: (me) => is(me, 'doctor', 'nurse', 'lab'),
  prescribe: (me) => is(me, 'doctor', 'pharmacist'),
  pharmacy: (me) => is(me, 'pharmacist'),
  seePharmacy: (me) => is(me, 'pharmacist', 'doctor', 'nurse'),
  cash: (me) => is(me, 'cashier'),
  charge: (me) => is(me, 'doctor', 'nurse', 'cashier'),
  ward: (me) => is(me, 'doctor', 'nurse'),
  clinical: (me) => !me || me.role !== 'cashier',
  admin: (me) => is(me),
  manager: (me) => Boolean(me?.manager),
};
