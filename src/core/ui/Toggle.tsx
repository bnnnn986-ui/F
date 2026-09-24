import type { ComponentChildren } from 'preact';
import { playSound } from '../audio/audio';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ComponentChildren;
  className?: string;
  silent?: boolean;
}

/** Pixel-styled toggle switch (a real checkbox underneath, for a11y/forms) — used wherever a plain native checkbox would look unstyled. */
export function Toggle({ checked, onChange, children, className = '', silent }: ToggleProps) {
  return (
    <label className={`pp-toggle ${className}`.trim()}>
      <input
        type="checkbox"
        className="pp-toggle__input"
        checked={checked}
        onChange={(e) => {
          if (!silent) playSound('click');
          onChange((e.target as HTMLInputElement).checked);
        }}
      />
      <span className="pp-toggle__track" aria-hidden="true">
        <span className="pp-toggle__thumb" />
      </span>
      <span className="pp-toggle__label">{children}</span>
    </label>
  );
}
