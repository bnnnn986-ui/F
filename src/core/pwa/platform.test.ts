import { describe, expect, it } from 'vitest';
import { detectInstallPlatform, isStandaloneDisplay } from './platform';

function fakeWindow(opts: { standaloneMatch?: boolean; standaloneFlag?: boolean; hasBeforeInstallPrompt?: boolean }) {
  const win = {
    navigator: { userAgent: '', standalone: opts.standaloneFlag } as unknown as Navigator,
    matchMedia: (query: string) =>
      ({ matches: query.includes('standalone') ? !!opts.standaloneMatch : false }) as MediaQueryList,
  };
  if (opts.hasBeforeInstallPrompt) {
    (win as unknown as Record<string, unknown>).onbeforeinstallprompt = null;
  }
  return win;
}

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DESKTOP_FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';

describe('isStandaloneDisplay', () => {
  it('is true when display-mode: standalone matches', () => {
    expect(isStandaloneDisplay(fakeWindow({ standaloneMatch: true }))).toBe(true);
  });
  it('is true for the iOS Safari navigator.standalone flag', () => {
    expect(isStandaloneDisplay(fakeWindow({ standaloneFlag: true }))).toBe(true);
  });
  it('is false in an ordinary browser tab', () => {
    expect(isStandaloneDisplay(fakeWindow({}))).toBe(false);
  });
});

describe('detectInstallPlatform', () => {
  it('reports standalone once installed, regardless of UA', () => {
    expect(detectInstallPlatform(fakeWindow({ standaloneMatch: true }), ANDROID_CHROME_UA)).toBe('standalone');
  });

  it('reports ios-safari for iOS Safari (no beforeinstallprompt support)', () => {
    expect(detectInstallPlatform(fakeWindow({}), IOS_SAFARI_UA)).toBe('ios-safari');
  });

  it('does not mistake Chrome-on-iOS (CriOS) for Safari', () => {
    // CriOS still has no beforeinstallprompt (all iOS browsers use WebKit) — falls through to unsupported.
    expect(detectInstallPlatform(fakeWindow({}), IOS_CHROME_UA)).toBe('unsupported');
  });

  it('reports promptable for Android Chrome', () => {
    expect(detectInstallPlatform(fakeWindow({}), ANDROID_CHROME_UA)).toBe('promptable');
  });

  it('reports promptable for desktop Chrome', () => {
    expect(detectInstallPlatform(fakeWindow({}), DESKTOP_CHROME_UA)).toBe('promptable');
  });

  it('reports promptable when the window actually fired beforeinstallprompt, even off-UA-sniff', () => {
    expect(detectInstallPlatform(fakeWindow({ hasBeforeInstallPrompt: true }), DESKTOP_FIREFOX_UA)).toBe('promptable');
  });

  it('reports unsupported for desktop Firefox (no install path)', () => {
    expect(detectInstallPlatform(fakeWindow({}), DESKTOP_FIREFOX_UA)).toBe('unsupported');
  });
});
