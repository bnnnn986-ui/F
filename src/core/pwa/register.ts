import { registerSW } from 'virtual:pwa-register';

export type PwaUpdateListener = (available: boolean) => void;

const listeners = new Set<PwaUpdateListener>();
let updateAvailable = false;
let applyUpdateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let offlineReady = false;

function publish(): void {
  listeners.forEach((fn) => fn(updateAvailable));
}

/**
 * Registers the service worker (generateSW build output). `registerType:
 * 'prompt'` in vite.config.ts means a new SW installs but waits — nothing
 * activates until `applyPwaUpdate()` is called (the update toast, wired to
 * a player/host confirmation so a new SW never yanks the page mid-game).
 * Call once from src/main.tsx.
 */
export function initPwa(): void {
  if (import.meta.env.DEV) return; // no SW in dev; `devOptions.enabled: false` in vite.config.ts anyway
  try {
    applyUpdateFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateAvailable = true;
        publish();
      },
      onOfflineReady() {
        offlineReady = true;
      },
      onRegisterError(err) {
        // Registration failing (e.g. sandboxed preview, no HTTPS) should
        // never break the app — it just means no offline/update support.
        console.warn('[pwa] service worker registration failed', err);
      },
    });
  } catch (err) {
    console.warn('[pwa] service worker unsupported', err);
  }
}

export function isPwaUpdateAvailable(): boolean {
  return updateAvailable;
}

export function isPwaOfflineReady(): boolean {
  return offlineReady;
}

export function onPwaUpdateAvailable(fn: PwaUpdateListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Activates the waiting service worker and reloads once it takes control. */
export async function applyPwaUpdate(): Promise<void> {
  if (!applyUpdateFn) return;
  updateAvailable = false;
  publish();
  await applyUpdateFn(true);
}
