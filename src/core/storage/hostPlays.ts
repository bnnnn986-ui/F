import { getItem, setItem } from './storage';

const KEY = 'pp:hostPlays';

/**
 * "โฮสต์ร่วมเล่นด้วย" — the host is also a player, with the phone-style
 * answer UI embedded in the host screen. `null` means "no explicit choice
 * yet, use the viewport default"; an explicit true/false is the host's own
 * choice, persisted, and always wins over the default.
 */
export function loadHostPlaysChoice(): boolean | null {
  const raw = getItem(KEY);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

export function saveHostPlaysChoice(on: boolean): void {
  setItem(KEY, on ? '1' : '0');
}

/** Default when the host hasn't made an explicit choice: ON on a narrow (phone) viewport. */
export function defaultHostPlays(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

export function effectiveHostPlays(explicit: boolean | null): boolean {
  return explicit ?? defaultHostPlays();
}
