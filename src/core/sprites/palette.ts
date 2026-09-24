/**
 * Shared colour palette used by every pixel-string sprite. Sprites are
 * defined as arrays of strings, one character per pixel, where each
 * character indexes into this palette. '.' is always transparent.
 */
export const PALETTE: Record<string, string> = {
  '.': 'transparent',
  // neutrals / outline
  k: '#1a1c2c', // black/outline
  w: '#fff6e0', // white/highlight
  g: '#8b8ea3', // grey
  // skin / warm tones
  s: '#ffd9a0',
  t: '#e8a86c',
  // browns
  b: '#7a4a32',
  d: '#4a2c1f',
  // reds/pinks
  r: '#ff6b6b',
  R: '#c73e3e',
  p: '#ff9fc7',
  // oranges/yellows
  o: '#ff9f4a',
  y: '#ffd166',
  Y: '#e8a93a',
  // greens
  e: '#6ee36e',
  E: '#2f9e44',
  m: '#4fd6c4',
  // blues
  c: '#5aa9e6',
  C: '#2c6bb0',
  n: '#2b2e4a',
  // purples
  u: '#9d6bd6',
  U: '#5e3b96',
  // misc
  h: '#ffffff',
  x: '#ff2e63',
};

export type PixelGrid = string[];
