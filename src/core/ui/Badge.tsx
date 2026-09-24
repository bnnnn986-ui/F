import type { ComponentChildren } from 'preact';

export interface BadgeProps {
  children: ComponentChildren;
  variant?: 'default' | 'soon' | 'live';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const classes = ['pixel-badge', variant !== 'default' ? `pixel-badge--${variant}` : ''].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}
