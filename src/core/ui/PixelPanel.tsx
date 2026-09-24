import type { ComponentChildren, JSX } from 'preact';

export interface PixelPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  dark?: boolean;
  children: ComponentChildren;
}

export function PixelPanel({ dark, className = '', children, ...rest }: PixelPanelProps) {
  const classes = ['pixel-panel', dark ? 'pixel-panel--dark' : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
