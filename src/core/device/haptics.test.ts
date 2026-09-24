import { beforeEach, describe, expect, it, vi } from 'vitest';

// haptics.ts reads its persisted state at module-load time (mirrors
// MuteToggle/LargeTextToggle), so each test re-imports it fresh against a
// clean localStorage to exercise a different starting state.
async function freshHaptics() {
  vi.resetModules();
  return import('./haptics');
}

describe('haptics persistence + toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to enabled when nothing is persisted yet', async () => {
    const { isHapticsEnabled } = await freshHaptics();
    expect(isHapticsEnabled()).toBe(true);
  });

  it('toggling persists the new value to localStorage', async () => {
    const { isHapticsEnabled, toggleHaptics } = await freshHaptics();
    expect(isHapticsEnabled()).toBe(true);
    toggleHaptics();
    expect(isHapticsEnabled()).toBe(false);
    expect(localStorage.getItem('pp:haptics')).toBe('0');
    toggleHaptics();
    expect(isHapticsEnabled()).toBe(true);
    expect(localStorage.getItem('pp:haptics')).toBe('1');
  });

  it('a fresh import picks up a previously persisted "off" state', async () => {
    localStorage.setItem('pp:haptics', '0');
    const { isHapticsEnabled } = await freshHaptics();
    expect(isHapticsEnabled()).toBe(false);
  });

  it('notifies listeners on toggle', async () => {
    const { onHapticsChange, toggleHaptics } = await freshHaptics();
    const fn = vi.fn();
    const unsubscribe = onHapticsChange(fn);
    toggleHaptics();
    expect(fn).toHaveBeenCalledWith(false);
    unsubscribe();
    toggleHaptics();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('haptic() no-ops without throwing when the Vibration API is unavailable', async () => {
    const { haptic } = await freshHaptics();
    expect(() => haptic('correct')).not.toThrow();
  });

  it('haptic() calls navigator.vibrate with the right pattern when enabled, and skips it when disabled', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { haptic, toggleHaptics } = await freshHaptics();

    haptic('lock');
    expect(vibrate).toHaveBeenCalledWith(15);

    toggleHaptics(); // now disabled
    haptic('wrong');
    expect(vibrate).toHaveBeenCalledTimes(1); // not called again

    // @ts-expect-error cleanup the test shim
    delete navigator.vibrate;
  });
});
