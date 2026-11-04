// After a deploy, the old build's page files are gone from the server. A tab
// that was open before the deploy (or an installed app left running) then
// fails the moment it lazy-loads a page it hasn't visited yet, and the user
// sees "Something went wrong". Reloading picks up the new build, so do that
// automatically — once per minute at most, so a real outage can't loop.

const KEY = 'bizly-stale-reload';

export function isStaleBuildError(err) {
  const msg = String(err?.message || err || '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|Unable to preload CSS|ChunkLoadError|Loading chunk \S+ failed/i.test(msg);
}

// Returns true if a reload was started.
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60 * 1000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: still reload once, the guard is best effort */ }
  window.location.reload();
  return true;
}

export function watchForNewBuild() {
  // Vite fires this when a lazy page's file (or its CSS) can't be fetched.
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}
