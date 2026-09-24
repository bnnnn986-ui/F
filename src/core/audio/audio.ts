import { zzfx } from 'zzfx';

const MUTE_KEY = 'pp:muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();
const listeners = new Set<(muted: boolean) => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* ignore storage errors (private mode etc.) */
  }
  listeners.forEach((fn) => fn(muted));
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function onMuteChange(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ZzFX parameter arrays, tuned by ear for a cheerful retro-arcade feel.
// See https://github.com/KilledByAPixel/ZzFX for parameter meaning.
const PRESETS = {
  click: [1.1, 0, 220, 0, 0.02, 0.03, 1, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.02],
  join: [1.2, 0, 440, 0.02, 0.06, 0.12, 0, 1.4, 0, 0, 180, 0.06, 0, 0, 0, 0, 0.02, 0.6, 0.05],
  tick: [0.6, 0, 880, 0, 0.01, 0.02, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.01],
  correct: [1.3, 0, 523, 0.02, 0.08, 0.12, 0, 1.6, 0, 0, 400, 0.08, 0.02, 0, 0, 0, 0.02, 0.7, 0.05],
  wrong: [1.2, 0, 160, 0.02, 0.08, 0.2, 1, 1.4, -4, 0, 0, 0, 0, 0.2, 0, 0, 0, 0.6, 0.04],
  countdown: [0.9, 0, 330, 0, 0.02, 0.05, 1, 1.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.01],
  fanfare: [1.4, 0, 660, 0.03, 0.2, 0.3, 0, 1.8, 0, 0, 500, 0.15, 0.05, 0, 0, 0, 0.03, 0.7, 0.1],
} satisfies Record<string, number[]>;

export type SoundName = keyof typeof PRESETS;

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    zzfx(...PRESETS[name]);
  } catch {
    /* audio can fail silently (autoplay policy etc.) */
  }
}
