export type ShapeKind = 'triangle' | 'diamond' | 'circle' | 'square';

/** Crisp CSS-drawn answer-tile shape (no font glyphs) — ▲ ◆ ● ■ replacements. */
export function PixelShape({ kind, className = '' }: { kind: ShapeKind; className?: string }) {
  return <span className={`pp-shape pp-shape--${kind} ${className}`.trim()} aria-hidden="true" />;
}

export type ChevronDirection = 'up' | 'down' | 'left' | 'right';

/** Crisp CSS-drawn arrow/chevron (no font glyphs) — for reorder/next/back controls. */
export function Chevron({ direction, className = '' }: { direction: ChevronDirection; className?: string }) {
  return <span className={`pp-chevron pp-chevron--${direction} ${className}`.trim()} aria-hidden="true" />;
}
