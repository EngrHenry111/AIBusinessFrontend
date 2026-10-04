// Installable-app plumbing shared by main.jsx, InstallPrompt and the
// storefront pages.
//
// Chrome fires `beforeinstallprompt` once it decides the page is
// installable — often before React has mounted — so it's captured here at
// module load and handed to whoever subscribes later.

const ROOT_MANIFEST = '/manifest.webmanifest';
const ROOT_APP = { name: 'BizlyAI', themeColor: '#6366f1', icon: '/icon-192.png' };

let deferredPrompt = null;
let appInfo = ROOT_APP;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getInstallEvent = () => deferredPrompt;
export const getAppInfo = () => appInfo;

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// iOS never fires beforeinstallprompt — Safari users have to use
// Share → "Add to Home Screen", so the banner shows them that instead.
export function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const evt = deferredPrompt;
  deferredPrompt = null; // a prompt event can only be used once
  emit();
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  return outcome;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // suppress Chrome's mini-infobar; our banner replaces it
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function setHeadTag(selector, create, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

// Points the page at a different web-app manifest. On a storefront this
// makes Chrome offer to install THAT store (its name and logo) rather than
// BizlyAI. The edge middleware already serves the right manifest on a
// direct visit; this covers in-app navigation (e.g. marketplace → store).
export function setAppManifest({ manifest, name, themeColor, icon }) {
  const href = manifest || ROOT_MANIFEST;
  const current = document.head.querySelector('link[rel="manifest"]')?.getAttribute('href');
  setHeadTag('link[rel="manifest"]', () => Object.assign(document.createElement('link'), { rel: 'manifest' }), 'href', href);
  setHeadTag('meta[name="theme-color"]', () => Object.assign(document.createElement('meta'), { name: 'theme-color' }), 'content', themeColor || ROOT_APP.themeColor);
  setHeadTag('meta[name="apple-mobile-web-app-title"]', () => Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-title' }), 'content', name || ROOT_APP.name);
  setHeadTag('link[rel="apple-touch-icon"]', () => Object.assign(document.createElement('link'), { rel: 'apple-touch-icon' }), 'href', icon || '/apple-touch-icon.png');

  // A captured prompt belongs to the manifest it was fired for — installing
  // it after switching would install the wrong app. Chrome re-evaluates the
  // new manifest and fires a fresh beforeinstallprompt if it qualifies.
  if (current && current !== href) deferredPrompt = null;
  appInfo = { name: name || ROOT_APP.name, themeColor: themeColor || ROOT_APP.themeColor, icon: icon || ROOT_APP.icon };
  emit();
}

// Called on every route change. Inside /store/:slug/* the store's own
// manifest (served by the API, same-origin via the /api rewrite or the Vite
// proxy — it must be same-origin or Chrome rejects its start_url) supplies
// the name/colour/icon; anywhere else the page reverts to BizlyAI.
let currentSlug = null;
export async function syncAppForPath(pathname) {
  const slug = pathname.match(/^\/store\/([a-z0-9-]+)/i)?.[1]?.toLowerCase() || null;
  if (slug === currentSlug) return;
  currentSlug = slug;
  if (!slug) {
    setAppManifest({});
    return;
  }
  const manifest = `/api/v1/seo/store/${slug}/manifest.webmanifest`;
  try {
    const res = await fetch(manifest);
    if (!res.ok) throw new Error(String(res.status));
    const m = await res.json();
    if (currentSlug !== slug) return; // navigated elsewhere meanwhile
    const icon = m.icons?.find((i) => i.sizes === '192x192')?.src || m.icons?.[0]?.src;
    setAppManifest({ manifest, name: m.name, themeColor: m.theme_color, icon });
  } catch {
    if (currentSlug === slug) setAppManifest({}); // unknown/disabled store
  }
}
