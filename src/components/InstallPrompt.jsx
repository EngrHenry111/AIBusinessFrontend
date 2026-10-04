import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { FiX, FiDownload, FiShare } from 'react-icons/fi';
import { subscribe, getInstallEvent, getAppInfo, isStandalone, isIos, promptInstall, syncAppForPath } from '../pwa';
import './InstallPrompt.css';

// Pages where an install banner would get in the way of finishing a task.
const HIDDEN_ON = [/^\/auth\//, /^\/2fa-login/, /^\/verify-email/, /\/checkout$/, /^\/reset-password/];

// "Dismiss" only lasts for this browser session, so the offer comes back
// on the shopper's next visit until they install.
const dismissKey = (name) => `install-dismissed:${name}`;
function wasDismissed(name) {
  try { return sessionStorage.getItem(dismissKey(name)) === '1'; } catch { return false; }
}

export default function InstallPrompt() {
  const { pathname } = useLocation();
  const installEvent = useSyncExternalStore(subscribe, getInstallEvent);
  const app = useSyncExternalStore(subscribe, getAppInfo);
  const [dismissed, setDismissed] = useState(() => wasDismissed(app.name));
  const [ready, setReady] = useState(false);

  useEffect(() => { syncAppForPath(pathname); }, [pathname]);
  useEffect(() => { setDismissed(wasDismissed(app.name)); }, [app.name]);

  // Short delay so the banner doesn't compete with the page's first paint.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const ios = isIos();
  const canShow = ready && !dismissed && !isStandalone()
    && !HIDDEN_ON.some((re) => re.test(pathname))
    && (installEvent || ios);
  if (!canShow) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(dismissKey(app.name), '1'); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <div className="install-prompt" role="dialog" aria-label={`Install ${app.name}`} style={{ '--install-accent': app.themeColor }}>
      <img className="install-prompt__icon" src={app.icon} alt="" width="44" height="44" />
      <div className="install-prompt__text">
        <strong>Install {app.name}</strong>
        {ios ? (
          <span>Tap <FiShare aria-label="Share" className="install-prompt__inline-icon" /> then <b>Add to Home Screen</b></span>
        ) : (
          <span>Add it to your home screen for quick access</span>
        )}
      </div>
      {!ios && (
        <button type="button" className="install-prompt__btn" onClick={() => promptInstall().then((o) => { if (o === 'dismissed') dismiss(); })}>
          <FiDownload /> Install
        </button>
      )}
      <button type="button" className="install-prompt__close" onClick={dismiss} aria-label="Not now">
        <FiX />
      </button>
    </div>
  );
}
