import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Calls `onUpdate(event)` whenever anything in the school changes — a fee
// paid at the desk or online, a new application, attendance saved… — so the
// screen refreshes immediately. Pass `kinds` to ignore unrelated changes.
// Bursts (e.g. a bulk import) are coalesced into one refresh.
export default function useSchoolLive(onUpdate, kinds) {
  const { company } = useAuth();
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const kindsKey = kinds ? kinds.join(',') : '';

  useEffect(() => {
    const companyId = company?.id || company?._id;
    if (!companyId) return undefined;
    const wanted = kindsKey ? new Set(kindsKey.split(',')) : null;
    let timer;
    const socket = io(SOCKET_ORIGIN, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join_company', companyId));
    socket.on('school:update', (evt) => {
      if (wanted && !wanted.has(evt?.kind)) return;
      clearTimeout(timer);
      timer = setTimeout(() => cb.current?.(evt), 250);
    });
    return () => { clearTimeout(timer); socket.disconnect(); };
  }, [company?.id, company?._id, kindsKey]);
}
