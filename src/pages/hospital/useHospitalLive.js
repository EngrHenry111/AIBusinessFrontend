import { useEffect, useRef } from 'react';
import { connectSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

// Calls `onUpdate(event)` whenever anything in the hospital changes — a
// patient checked in, results ready, a payment at the desk… — so every open
// screen (queue, lab, pharmacy, cashier) stays current. Pass `kinds` to
// ignore unrelated changes. Bursts are coalesced into one refresh.
export default function useHospitalLive(onUpdate, kinds) {
  const { company } = useAuth();
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const kindsKey = kinds ? kinds.join(',') : '';

  useEffect(() => {
    const companyId = company?.id || company?._id;
    if (!companyId) return undefined;
    const wanted = kindsKey ? new Set(kindsKey.split(',')) : null;
    let timer;
    const socket = connectSocket();
    socket.on('connect', () => socket.emit('join_company', companyId));
    socket.on('hospital:update', (evt) => {
      if (wanted && !wanted.has(evt?.kind)) return;
      clearTimeout(timer);
      timer = setTimeout(() => cb.current?.(evt), 250);
    });
    return () => { clearTimeout(timer); socket.disconnect(); };
  }, [company?.id, company?._id, kindsKey]);
}
