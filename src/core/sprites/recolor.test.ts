import { describe, expect, it } from 'vitest';
import { hslToRgb, rgbToHsl } from './color';
import { recolorImageData, shouldRecolorPixel, TINT_HUE_SHIFTS } from './recolor';

describe('rgbToHsl / hslToRgb round-trip', () => {
  it('round-trips primary colours', () => {
    for (const [r, g, b] of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
      [0, 0, 0],
      [128, 64, 200],
    ] as const) {
      const { h, s, l } = rgbToHsl(r, g, b);
      const [rr, gg, bb] = hslToRgb(h, s, l);
      expect(Math.abs(rr - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(gg - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(bb - b)).toBeLessThanOrEqual(1);
    }
  });
});

describe('shouldRecolorPixel', () => {
  it('skips transparent pixels', () => {
    expect(shouldRecolorPixel(200, 30, 30, 0)).toBe(false);
  });

  it('skips greys, near-black outlines and near-white highlights (metal/outline)', () => {
    expect(shouldRecolorPixel(20, 20, 22, 255)).toBe(false); // near-black outline
    expect(shouldRecolorPixel(250, 248, 245, 255)).toBe(false); // near-white highlight
    expect(shouldRecolorPixel(120, 122, 118, 255)).toBe(false); // grey metal
  });

  it('skips skin-tone pixels', () => {
    expect(shouldRecolorPixel(255, 219, 172, 255)).toBe(false); // light skin
    expect(shouldRecolorPixel(198, 134, 66, 255)).toBe(false); // tan skin
  });

  it('recolors saturated non-skin outfit pixels', () => {
    expect(shouldRecolorPixel(220, 40, 40, 255)).toBe(true); // saturated red cloth
    expect(shouldRecolorPixel(40, 80, 220, 255)).toBe(true); // saturated blue cloth
    expect(shouldRecolorPixel(40, 180, 90, 255)).toBe(true); // saturated green cloth
  });
});

describe('recolorImageData', () => {
  function makePixelImageData(r: number, g: number, b: number, a = 255): ImageData {
    return { data: new Uint8ClampedArray([r, g, b, a]), width: 1, height: 1, colorSpace: 'srgb' } as ImageData;
  }

  it('is a no-op for tint 0', () => {
    const data = makePixelImageData(220, 40, 40);
    const before = [...data.data];
    recolorImageData(data, TINT_HUE_SHIFTS[0]!);
    expect([...data.data]).toEqual(before);
  });

  it('changes the RGB of an outfit pixel but keeps alpha', () => {
    const data = makePixelImageData(220, 40, 40, 255);
    recolorImageData(data, 200);
    expect(data.data[3]).toBe(255);
    expect([data.data[0], data.data[1], data.data[2]]).not.toEqual([220, 40, 40]);
  });

  it('leaves a skin-tone pixel untouched even with a non-zero shift', () => {
    const data = makePixelImageData(255, 219, 172, 255);
    recolorImageData(data, 200);
    expect([data.data[0], data.data[1], data.data[2]]).toEqual([255, 219, 172]);
  });

  it('leaves a transparent pixel untouched', () => {
    const data = makePixelImageData(220, 40, 40, 0);
    recolorImageData(data, 200);
    expect([...data.data]).toEqual([220, 40, 40, 0]);
  });
});
