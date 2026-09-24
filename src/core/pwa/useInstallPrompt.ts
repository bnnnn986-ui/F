import { useEffect, useState } from 'preact/hooks';
import { detectInstallPlatform, isStandaloneDisplay, type InstallPlatform } from './platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    listeners.forEach((fn) => fn());
  });
}

export interface InstallPromptState {
  /** Which install affordance to show: a real button, iOS share-sheet instructions, or nothing. */
  platform: InstallPlatform;
  /** True once Chrome/Android/desktop has actually fired beforeinstallprompt — only then is `promptInstall` callable. */
  canPromptNow: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

/** Drives the hub/lobby "ติดตั้งแอป" button across Chrome/Android/desktop (native prompt) and iOS Safari (instructions only). */
export function useInstallPrompt(): InstallPromptState {
  const [, force] = useState(0);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const platform = isStandaloneDisplay() ? 'standalone' : detectInstallPlatform();

  return {
    platform,
    canPromptNow: deferredEvent !== null,
    async promptInstall() {
      if (!deferredEvent) return 'unavailable';
      const evt = deferredEvent;
      deferredEvent = null;
      await evt.prompt();
      const choice = await evt.userChoice;
      return choice.outcome;
    },
  };
}
