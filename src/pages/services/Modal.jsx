import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine } from 'react-icons/ri';

// Rendered on <body>: the page wrapper keeps a transform from its fade-in,
// which would otherwise pin a fixed overlay to the page instead of the screen.
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="svc-modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="svc-modal-scrim" onClick={onClose} />
      <div className="svc-modal">
        <div className="svc-modal-head">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close"><RiCloseLine /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
