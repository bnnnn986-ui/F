/** PixelLab icon set (transparent PNGs, ~32px native). See core/ui/Icon.tsx. */
export const ICONS = {
  check: 'assets/pixellab/icons/check.png',
  cross: 'assets/pixellab/icons/cross.png',
  crown: 'assets/pixellab/icons/crown.png',
  flame: 'assets/pixellab/icons/flame.png',
  group: 'assets/pixellab/icons/group.png',
  home: 'assets/pixellab/icons/home.png',
  horn: 'assets/pixellab/icons/horn.png',
  hourglass: 'assets/pixellab/icons/hourglass.png',
  lightning: 'assets/pixellab/icons/lightning.png',
  lock: 'assets/pixellab/icons/lock.png',
  mug: 'assets/pixellab/icons/mug.png',
  paw: 'assets/pixellab/icons/paw.png',
  quill: 'assets/pixellab/icons/quill.png',
  replay: 'assets/pixellab/icons/replay.png',
  scroll: 'assets/pixellab/icons/scroll.png',
  search: 'assets/pixellab/icons/search.png',
  star: 'assets/pixellab/icons/star.png',
  swords: 'assets/pixellab/icons/swords.png',
  target: 'assets/pixellab/icons/target.png',
} as const;

export type IconName = keyof typeof ICONS;

/** Heraldic guild emblems — replace the old emoji per team. See core/room/teams.ts. */
export const EMBLEMS = {
  dragon: 'assets/pixellab/emblems/dragon.png',
  wolf: 'assets/pixellab/emblems/wolf.png',
  owl: 'assets/pixellab/emblems/owl.png',
  lion: 'assets/pixellab/emblems/lion.png',
  snake: 'assets/pixellab/emblems/snake.png',
  rabbit: 'assets/pixellab/emblems/rabbit.png',
} as const;

export type EmblemName = keyof typeof EMBLEMS;
