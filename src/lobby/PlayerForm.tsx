import { useState } from 'preact/hooks';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelInput } from '../core/ui/PixelInput';
import { PixelButton } from '../core/ui/PixelButton';
import { AvatarPicker } from './AvatarPicker';
import type { PlayerProfile } from '../core/storage/profile';

export function PlayerForm({
  initial,
  roomCode,
  onSubmit,
}: {
  initial: PlayerProfile;
  roomCode: string;
  onSubmit: (profile: PlayerProfile) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [avatarId, setAvatarId] = useState(initial.avatarId);

  const submit = (e: Event) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, avatarId });
  };

  return (
    <PixelPanel className="player-form">
      <p className="player-form__room">ห้อง #{roomCode}</p>
      <h2>ตั้งชื่อและเลือกตัวละคร</h2>
      <form onSubmit={submit}>
        <label htmlFor="player-name" className="visually-hidden">
          ชื่อของคุณ
        </label>
        <PixelInput
          id="player-name"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder="ชื่อของคุณ"
          maxLength={20}
          autoFocus
          required
        />
        <AvatarPicker value={avatarId} onChange={setAvatarId} />
        <PixelButton type="submit" variant="primary" big block disabled={!name.trim()}>
          เข้าร่วมห้อง
        </PixelButton>
      </form>
    </PixelPanel>
  );
}
