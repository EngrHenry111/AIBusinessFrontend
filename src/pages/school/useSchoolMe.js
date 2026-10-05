import { useState, useEffect } from 'react';
import { schoolService } from '../../services';
import { useAuth } from '../../context/AuthContext';

// The signed-in user's school role ('admin' | 'bursar' | 'teacher') and the
// classes/subjects they teach. Fetched once per signed-in user and shared by
// every component; a role change by the owner applies on the next page load.
let owner = null; // user id the cache belongs to
let cache = null;
let inflight = null;
const listeners = new Set();

function load(userId) {
  if (owner !== userId) { owner = userId; cache = null; inflight = null; }
  if (!inflight) {
    inflight = schoolService.me()
      .then(({ data }) => data.data)
      .catch(() => ({ role: 'admin', manager: false, teaching: [], failed: true })) // server still enforces every rule
      .then((value) => {
        if (owner === userId) { cache = value; listeners.forEach((l) => l(cache)); }
        return value;
      });
  }
  return inflight;
}

export default function useSchoolMe(enabled = true) {
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

// Helpers for screens (while loading, show everything — the server decides).
export const can = {
  finance: (me) => !me || me.role === 'admin' || me.role === 'bursar',
  admin: (me) => !me || me.role === 'admin',
  academic: (me) => !me || me.role === 'admin' || me.role === 'teacher',
  isTeacher: (me) => me?.role === 'teacher',
};
