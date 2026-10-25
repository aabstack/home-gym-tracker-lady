/*
 * Imported by the generated service worker (vite.config.ts → workbox.importScripts).
 *
 * When a new version activates, every open app window is told about it. Windows running a
 * current build reply (and show their own "Update available" toast, so a set in progress is
 * never interrupted). Windows that don't reply within a few seconds are running an old build
 * that can't show the toast or never activated the update, so the service worker reloads
 * them onto the new version itself. All workout data is in IndexedDB, so nothing is lost.
 */
const GYM_ACTIVATED = 'GYM_SW_ACTIVATED';
const GYM_ACK = 'GYM_ACK';
const ACK_WAIT_MS = 4000;
const acked = new Set();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === GYM_ACK && event.source) acked.add(event.source.id);
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.length === 0) return;
      for (const w of windows) w.postMessage({ type: GYM_ACTIVATED });
      await new Promise((resolve) => setTimeout(resolve, ACK_WAIT_MS));
      await Promise.all(
        windows
          .filter((w) => !acked.has(w.id) && 'navigate' in w)
          .map((w) => w.navigate(w.url).catch(() => undefined)),
      );
    })(),
  );
});
