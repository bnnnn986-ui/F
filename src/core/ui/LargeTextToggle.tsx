import { useEffect, useState } from 'preact/hooks';
import { getItem, setItem } from '../storage/storage';

const KEY = 'pp:largeText';

function apply(on: boolean): void {
  document.documentElement.classList.toggle('pp-large-text', on);
}

/** Accessibility: a large-text mode toggle, persisted and applied globally via a root class. */
export function LargeTextToggle() {
  const [on, setOn] = useState(() => getItem(KEY) === '1');

  useEffect(() => {
    apply(on);
  }, [on]);

  return (
    <button
      type="button"
      className="pixel-mute"
      aria-label="ตัวอักษรขนาดใหญ่"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        setItem(KEY, next ? '1' : '0');
      }}
    >
      {on ? '🔎' : '🔤'}
    </button>
  );
}

/** Applies the saved preference immediately at startup, before first paint. */
export function applyStoredLargeTextPreference(): void {
  apply(getItem(KEY) === '1');
}
