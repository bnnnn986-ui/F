/** PixelLab item PNGs (treasure chest, trophy, d20, finish flag). */
export const ITEMS: Record<string, string> = {
  'treasure-chest': 'assets/pixellab/items/treasure-chest.png',
  trophy: 'assets/pixellab/items/trophy.png',
  d20: 'assets/pixellab/items/d20.png',
  'finish-flag': 'assets/pixellab/items/finish-flag.png',
};
export type ItemId = keyof typeof ITEMS;
export function isItemId(id: string): id is ItemId {
  return id in ITEMS;
}
