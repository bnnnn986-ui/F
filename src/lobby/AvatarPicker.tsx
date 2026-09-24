import { useState } from 'preact/hooks';
import { HEROES, POLYMORPH, getCharacter } from '../core/sprites/heroes';
import { TINT_COUNT } from '../core/sprites/recolor';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { playSound } from '../core/audio/audio';

export interface AvatarPickerValue {
  avatarId: string;
  tint: number;
}

/** Approximate swatch colour per tint, just for the little colour dots (actual PNG recolor happens in AvatarSprite). */
const SWATCH_HEX = ['#c9a86a', '#5aa9e6', '#9d6bd6', '#ff6ea0', '#ff9f4a', '#6ee36e', '#4fd6c4', '#ffd166'];

export function AvatarPicker({ value, onChange }: { value: AvatarPickerValue; onChange: (v: AvatarPickerValue) => void }) {
  const [tab, setTab] = useState<'hero' | 'polymorph'>(HEROES.some((h) => h.id === value.avatarId) ? 'hero' : 'polymorph');
  const list = tab === 'hero' ? HEROES : POLYMORPH;
  const selected = getCharacter(value.avatarId);

  return (
    <div className="avatar-picker">
      <div className="avatar-picker__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hero'}
          className={`avatar-picker__tab ${tab === 'hero' ? 'is-active' : ''}`}
          onClick={() => setTab('hero')}
        >
          ⚔️ อาชีพนักผจญภัย
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'polymorph'}
          className={`avatar-picker__tab ${tab === 'polymorph' ? 'is-active' : ''}`}
          onClick={() => setTab('polymorph')}
        >
          🐾 ร่างแปลง
        </button>
      </div>

      <div className="avatar-picker__preview">
        <AvatarSprite avatarId={selected.id} tint={value.tint} size={88} animation="run" pop />
        <div>
          <p className="avatar-picker__preview-name">{selected.nameTh}</p>
          <p className="avatar-picker__preview-flavour">{selected.flavourTh}</p>
        </div>
      </div>

      <div className="avatar-picker__grid" role="radiogroup" aria-label="เลือกตัวละคร">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value.avatarId === c.id}
            className={`avatar-picker__item ${value.avatarId === c.id ? 'is-selected' : ''}`}
            onClick={() => {
              playSound('click');
              onChange({ avatarId: c.id, tint: value.tint });
            }}
            title={`${c.nameTh} / ${c.nameEn}`}
          >
            <AvatarSprite avatarId={c.id} tint={value.tint} size={48} animation={value.avatarId === c.id ? 'run' : 'idle'} />
            <span>{c.nameTh}</span>
          </button>
        ))}
      </div>

      <div className="avatar-picker__swatches" role="radiogroup" aria-label="เลือกสี">
        {Array.from({ length: TINT_COUNT }, (_, i) => i).map((tintIndex) => (
          <button
            key={tintIndex}
            type="button"
            role="radio"
            aria-checked={value.tint === tintIndex}
            aria-label={`สีที่ ${tintIndex + 1}`}
            className={`avatar-picker__swatch ${value.tint === tintIndex ? 'is-selected' : ''}`}
            style={{ background: SWATCH_HEX[tintIndex % SWATCH_HEX.length] }}
            onClick={() => {
              playSound('click');
              onChange({ avatarId: value.avatarId, tint: tintIndex });
            }}
          />
        ))}
      </div>
    </div>
  );
}

