import { useEffect, useState } from 'preact/hooks';
import { isMuted, onMuteChange, toggleMuted } from '../audio/audio';
import { isHapticsEnabled, onHapticsChange, toggleHaptics } from '../device/haptics';
import { Icon, MutedIcon } from './Icon';

export function MuteToggle() {
  const [muted, setMuted] = useState(isMuted());
  useEffect(() => onMuteChange(setMuted), []);
  return (
    <button
      type="button"
      className="pixel-mute"
      aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
      aria-pressed={muted}
      onClick={() => toggleMuted()}
    >
      {muted ? <MutedIcon /> : <Icon name="horn" />}
    </button>
  );
}

/** "สั่น" — toggles device-vibration haptics (lock-in / correct / wrong). Only useful on touch devices, but harmless everywhere. */
export function HapticToggle() {
  const [on, setOn] = useState(isHapticsEnabled());
  useEffect(() => onHapticsChange(setOn), []);
  return (
    <button
      type="button"
      className="pixel-mute"
      aria-label={on ? 'ปิดการสั่น' : 'เปิดการสั่น'}
      aria-pressed={on}
      onClick={() => toggleHaptics()}
      style={{ opacity: on ? 1 : 0.5 }}
    >
      <Icon name="lightning" />
    </button>
  );
}
