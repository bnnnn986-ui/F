export type InstallPlatform = 'ios-safari' | 'promptable' | 'standalone' | 'unsupported';

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

/** True once the app is running as an installed PWA (any platform). */
export function isStandaloneDisplay(win: Pick<Window, 'matchMedia' | 'navigator'> = window): boolean {
  const nav = win.navigator as NavigatorStandalone;
  if (nav.standalone) return true; // iOS Safari's own flag — no matchMedia support pre-install
  try {
    return win.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function isIosSafari(ua: string): boolean {
  const isIosDevice = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  return isIosDevice && isSafari;
}

/**
 * Classifies how to offer "ติดตั้งแอป" for the current browser:
 *  - 'standalone': already installed — hide the install UI entirely.
 *  - 'promptable': Chrome/Edge/Android/desktop that fires
 *    `beforeinstallprompt` — the caller should wait for that event before
 *    showing the button (see useInstallPrompt).
 *  - 'ios-safari': no native prompt API — show the 2-step share-sheet
 *    instructions instead.
 *  - 'unsupported': neither (e.g. Firefox desktop) — hide the install UI.
 */
export function detectInstallPlatform(
  win: Pick<Window, 'matchMedia' | 'navigator'> = window,
  ua: string = window.navigator.userAgent,
): InstallPlatform {
  if (isStandaloneDisplay(win)) return 'standalone';
  if (isIosSafari(ua)) return 'ios-safari';
  if ('onbeforeinstallprompt' in win || /chrome|chromium|crios|edg\//i.test(ua)) return 'promptable';
  return 'unsupported';
}
