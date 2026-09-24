import { AVATARS } from '../core/sprites/avatars';
import { AvatarSprite } from '../core/ui/AvatarSprite';

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="avatar-picker" role="radiogroup" aria-label="เลือกตัวละคร">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          className={`avatar-picker__item ${value === a.id ? 'is-selected' : ''}`}
          onClick={() => onChange(a.id)}
          title={`${a.nameTh} / ${a.nameEn}`}
        >
          <AvatarSprite avatarId={a.id} size={48} animation={value === a.id ? 'run' : 'idle'} />
          <span>{a.nameTh}</span>
        </button>
      ))}
    </div>
  );
}
