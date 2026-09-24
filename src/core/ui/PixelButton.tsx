import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { playSound } from '../audio/audio';

export interface PixelButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  /** Exact heights: sm 36 / md 48 (default) / lg 64px. `big` is a legacy alias for `size="lg"`. */
  size?: 'sm' | 'md' | 'lg';
  big?: boolean;
  block?: boolean;
  children: ComponentChildren;
  silent?: boolean;
}

/** Chunky pixel-styled button with a press animation and a click sound. Sizes: sm 36 / md 48 / lg 64px. */
export function PixelButton({
  variant = 'secondary',
  size,
  big,
  block,
  className = '',
  onClick,
  silent,
  children,
  ...rest
}: PixelButtonProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick: JSX.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (!silent) playSound('click');
    setPressed(true);
    setTimeout(() => setPressed(false), 120);
    onClick?.(e);
  };

  const resolvedSize = size ?? (big ? 'lg' : 'md');
  const classes = [
    'pixel-btn',
    `pixel-btn--${variant}`,
    `pixel-btn--${resolvedSize}`,
    block ? 'pixel-btn--block' : '',
    pressed ? 'is-pressed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
}
