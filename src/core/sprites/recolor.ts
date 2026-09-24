import { rgbToHsl, hslToRgb } from './color';

/**
 * Preset hue-shift tints for player avatars. Index 0 is "no change" (the
 * hero's original outfit colour); 1-7 rotate the outfit hue by a fixed
 * amount so 8 players can each look visually distinct without generating
 * more art. Chosen by eye for pleasing, well-separated results.
 */
export const TINT_HUE_SHIFTS: readonly number[] = [0, 200, 265, 325, 15, 150, 95, 45];
export const TINT_COUNT = TINT_HUE_SHIFTS.length;

/**
 * Decides whether a pixel is part of the "outfit" (safe to hue-shift) or
 * should be left alone: transparent pixels, near-grey/near-white/near-black
 * pixels (metal, outlines, cloth trim, beards) and skin-tone pixels (so
 * faces/hands stay natural across every tint).
 */
export function shouldRecolorPixel(r: number, g: number, b: number, a: number): boolean {
  if (a === 0) return false;
  const { h, s, l } = rgbToHsl(r, g, b);

  // Low-saturation or near-white/near-black: greys, metal, outlines, paper.
  if (s < 0.18) return false;
  if (l > 0.93 || l < 0.08) return false;

  // Skin tones: warm hue band, mid-to-high lightness. (Real skin swatches
  // often read as *very* saturated in HSL space once lightness climbs, so
  // unlike the general outfit check this only bounds hue + lightness.)
  if (h >= 8 && h <= 48 && s >= 0.2 && l >= 0.35 && l <= 0.9) return false;

  return true;
}

/** Rotates the hue of every "outfit" pixel in-place by `hueShiftDeg` degrees. */
export function recolorImageData(imageData: ImageData, hueShiftDeg: number): ImageData {
  if (hueShiftDeg === 0) return imageData;
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;
    if (!shouldRecolorPixel(r, g, b, a)) continue;
    const { h, s, l } = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(h + hueShiftDeg, s, l);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
  return imageData;
}

const dataUrlCache = new Map<string, string>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
}

/**
 * Loads a PNG and returns a data URL with tint `tintIndex` applied,
 * caching by (src, tintIndex) so repeated renders (lobby grids, pickers)
 * are cheap.
 */
export async function getRecoloredDataUrl(src: string, tintIndex: number): Promise<string> {
  const key = `${src}|${tintIndex}`;
  const cached = dataUrlCache.get(key);
  if (cached) return cached;

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);

  const hueShift = TINT_HUE_SHIFTS[tintIndex] ?? 0;
  if (hueShift !== 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    recolorImageData(imageData, hueShift);
    ctx.putImageData(imageData, 0, 0);
  }

  const url = canvas.toDataURL('image/png');
  dataUrlCache.set(key, url);
  return url;
}
