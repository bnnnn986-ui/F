import { useEffect, useState } from 'preact/hooks';
import { getItem, setItem } from '../storage/storage';

const KEY = 'pp:haptics';

type HapticPattern = 'lock' | 'correct' | 'wrong';

// Short vibration patterns (ms): on/off/on/... Kept subtle — this fires a
// lot (every lock-in) and must never feel buzzy/annoying.
const PATTERNS: Record<HapticPattern, number | number[]> = {
  lock: 15,
  correct: [20, 40, 20],
  wrong: [40, 60, 40, 60, 40],
};

function isEnabled(): boolean {
  // Default ON: matches the sound toggle's default and the brief's "vibrate
  // on lock-in" behaviour out of the box.
  const raw = getItem(KEY);
  return raw === null ? true : raw === '1';
}

let enabled = isEnabled();
const listeners = new Set<(on: boolean) => void>();

function setEnabled(on: boolean): void {
  enabled = on;
  setItem(KEY, on ? '1' : '0');
  listeners.forEach((fn) => fn(on));
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

export function toggleHaptics(): void {
  setEnabled(!enabled);
}

export function onHapticsChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Fires a short device vibration for a game moment, if supported and not
 * muted by the "สั่น" toggle. Safe to call unconditionally — no-ops on
 * desktop/iOS Safari (no Vibration API) and never throws.
 */
export function haptic(pattern: HapticPattern): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    /* ignore — vibration is best-effort */
  }
}

/** React/Preact hook mirroring the persisted haptics-enabled flag. */
export function useHapticsEnabled(): boolean {
  const [on, setOn] = useState(enabled);
  useEffect(() => onHapticsChange(setOn), []);
  return on;
}
