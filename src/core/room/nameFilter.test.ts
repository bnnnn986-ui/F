import { describe, expect, it } from 'vitest';
import { containsBannedWord, sanitizeName } from './nameFilter';

describe('nameFilter', () => {
  it('passes ordinary Thai/English names through unchanged', () => {
    expect(sanitizeName('Alice')).toEqual({ name: 'Alice', wasFiltered: false });
    expect(sanitizeName('สมชาย')).toEqual({ name: 'สมชาย', wasFiltered: false });
  });

  it('catches an exact banned word', () => {
    expect(containsBannedWord('shit')).toBe(true);
  });

  it('catches spaced-out and leetspeak variants', () => {
    expect(containsBannedWord('s h i t')).toBe(true);
    expect(containsBannedWord('sh1t')).toBe(true);
  });

  it('replaces a filtered name with a fallback and flags it', () => {
    const result = sanitizeName('fuckboy');
    expect(result.wasFiltered).toBe(true);
    expect(result.name).not.toMatch(/fuck/i);
  });

  it('falls back to a random name for an empty/whitespace-only name', () => {
    const result = sanitizeName('   ');
    expect(result.wasFiltered).toBe(true);
  });
});
