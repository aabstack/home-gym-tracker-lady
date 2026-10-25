import { registerSW } from 'virtual:pwa-register';

export const UPDATE_EVENT = 'gym:update-ready';

const HOURLY = 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | undefined;
/** A new version has been installed and activated; a reload shows it. */
let updateReady = false;

export function isUpdateReady() {
  return updateReady;
}

function markReady() {
  updateReady = true;
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

/**
 * Registers the service worker. With registerType 'autoUpdate' a new version installs and
 * activates by itself; instead of force-reloading (which could interrupt a set), we raise an
 * event so the UI can show an "Update available" toast.
 *
 * An installed PWA on Android is often resumed from memory rather than reloaded, which
 * never triggers the browser's own update check. So we also check whenever the app comes
 * back to the foreground, and hourly while it stays open.
 */
export function registerPwa() {
  if (import.meta.env.DEV) return;
  const hadController = !!navigator.serviceWorker?.controller;
  // Answer the new service worker (public/sw-update.js) so it knows this window runs a current
  // build and shows the toast, instead of being reloaded mid-set.
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if ((event.data as { type?: string } | null)?.type !== 'GYM_SW_ACTIVATED') return;
    (event.source as ServiceWorker | null)?.postMessage({ type: 'GYM_ACK' });
    // On a first install there was no previous version, so there is nothing to reload into.
    if (hadController) markReady();
  });
  navigator.serviceWorker?.startMessages();
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      registration = reg;
      // A version left waiting by an older build (before skipWaiting was on): activate it.
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      const check = () => {
        if (navigator.onLine) void reg.update().catch(() => {});
      };
      setInterval(check, HOURLY);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onNeedReload: markReady,
  });
}

export type UpdateResult = 'reloading' | 'latest' | 'offline' | 'unavailable';

/** Manual "Check for updates": downloads a newer version if there is one, then reloads. */
export async function checkForUpdate(): Promise<UpdateResult> {
  if (updateReady) {
    window.location.reload();
    return 'reloading';
  }
  if (!navigator.onLine) return 'offline';
  const reg = registration ?? (await navigator.serviceWorker?.getRegistration());
  if (!reg) return 'unavailable';
  try {
    await reg.update();
  } catch {
    return 'offline';
  }
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return 'latest';
  if (sw === reg.waiting) sw.postMessage({ type: 'SKIP_WAITING' });
  await new Promise<void>((resolve) => {
    if (sw.state === 'activated') return resolve();
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated' || sw.state === 'redundant') resolve();
    });
    setTimeout(resolve, 15_000);
  });
  window.location.reload();
  return 'reloading';
}
