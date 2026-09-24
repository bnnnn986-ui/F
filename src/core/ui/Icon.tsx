import type { JSX } from 'preact';
import { ICONS, EMBLEMS, type IconName, type EmblemName } from '../sprites/icons';

const NATIVE_SIZE = 32;

export interface IconProps {
  name: IconName;
  /** Integer scale only — 1x (32px) or 2x (64px) — so the pixel art never blurs. */
  scale?: 1 | 2;
  className?: string;
  /** Decorative by default (aria-hidden); pass a label when the icon is the only content of a control. */
  label?: string;
  style?: JSX.CSSProperties;
}

/** One PixelLab icon, pixelated and integer-scaled. Use for every icon in the app — no emoji. */
export function Icon({ name, scale = 1, className = '', label, style }: IconProps) {
  const size = NATIVE_SIZE * scale;
  return (
    <img
      src={ICONS[name]}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`pp-icon ${className}`.trim()}
      style={style}
    />
  );
}

export interface EmblemIconProps {
  name: EmblemName;
  scale?: 1 | 2;
  className?: string;
  label?: string;
}

/** A guild's heraldic shield emblem. */
export function EmblemIcon({ name, scale = 1, className = '', label }: EmblemIconProps) {
  const size = NATIVE_SIZE * scale;
  return (
    <img
      src={EMBLEMS[name]}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`pp-icon ${className}`.trim()}
    />
  );
}

/** Muted-sound icon: horn + a small cross badge overlaid bottom-right. */
export function MutedIcon({ scale = 1, className = '' }: { scale?: 1 | 2; className?: string }) {
  const size = NATIVE_SIZE * scale;
  return (
    <span className={`pp-icon-stack ${className}`.trim()} style={{ width: size, height: size }}>
      <Icon name="horn" scale={scale} />
      <img
        src={ICONS.cross}
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pp-icon pp-icon-stack__badge"
      />
    </span>
  );
}
