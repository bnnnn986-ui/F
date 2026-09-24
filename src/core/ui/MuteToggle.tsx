import { useEffect, useState } from 'preact/hooks';
import { isMuted, onMuteChange, toggleMuted } from '../audio/audio';
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
