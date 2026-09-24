import { describe, expect, it } from 'vitest';
import { renderSprite, createFrameClock } from './engine';
import { AVATARS, getAvatar, randomAvatarId } from './avatars';

describe('sprite engine', () => {
  it('renders a grid to a canvas of the right pixel size', () => {
    const grid = ['..', 'kk'];
    const canvas = renderSprite(grid, 4);
    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
  });

  it('caches identical grids at the same scale', () => {
    const grid = ['kk', 'kk'];
    const a = renderSprite(grid, 2);
    const b = renderSprite(grid, 2);
    expect(a).toBe(b);
  });

  it('frame clock cycles through frame indices', () => {
    const clock = createFrameClock(2, 100);
    expect(clock.tick(0)).toBe(0);
    expect(clock.tick(100)).toBe(1);
    expect(clock.tick(200)).toBe(0);
  });
});

describe('avatars', () => {
  it('defines at least 12 distinct avatars, each 16x16 with 2 idle + 2 run frames', () => {
    expect(AVATARS.length).toBeGreaterThanOrEqual(12);
    const ids = new Set(AVATARS.map((a) => a.id));
    expect(ids.size).toBe(AVATARS.length);
    for (const a of AVATARS) {
      expect(a.idle).toHaveLength(2);
      expect(a.run).toHaveLength(2);
      for (const frame of [...a.idle, ...a.run]) {
        expect(frame).toHaveLength(16);
        for (const row of frame) expect(row).toHaveLength(16);
      }
    }
  });

  it('getAvatar falls back to a default for unknown ids', () => {
    const a = getAvatar('nonexistent');
    expect(a).toBeTruthy();
  });

  it('randomAvatarId returns a valid id', () => {
    const id = randomAvatarId();
    expect(AVATARS.some((a) => a.id === id)).toBe(true);
  });
});
