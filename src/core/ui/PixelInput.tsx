import type { JSX } from 'preact';

export type PixelInputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export function PixelInput({ className = '', ...rest }: PixelInputProps) {
  return <input className={`pixel-input ${className}`.trim()} {...rest} />;
}
