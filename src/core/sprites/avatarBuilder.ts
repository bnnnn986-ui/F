/**
 * Procedural builder for the 16x16 avatar critters. Rather than hand-typing
 * 16 rows x 16 chars for every frame of every character (error prone and
 * hard to keep consistent), every critter shares one "blob body" silhouette
 * defined by a per-row inset profile, plus composable overlays (eyes, feet,
 * head features). The *output* of this module is still plain palette-index
 * string arrays — exactly what `engine.ts` expects — just generated instead
 * of hand-typed.
 */

const SIZE = 16;

export type Cell = string; // one palette key, or '.' for transparent
export type Grid = Cell[][]; // [row][col]

function blankGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => '.'));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row]);
}

export function toStrings(g: Grid): string[] {
  return g.map((row) => row.join(''));
}

/** Body profile: inset (transparent cols on each side) for rows 0-13. Row 14-15 reserved for feet. */
const DEFAULT_PROFILE = [7, 5, 3, 2, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4];

/** Builds the filled-body boolean mask from a profile array (length 14). */
function bodyMask(profile: number[]): boolean[][] {
  const mask = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  profile.forEach((inset, y) => {
    if (inset >= 8) return;
    for (let x = inset; x < SIZE - inset; x++) {
      const row = mask[y];
      if (row) row[x] = true;
    }
  });
  return mask;
}

export interface BodyOptions {
  bodyColor: Cell;
  shadeColor: Cell;
  profile?: number[];
  shadeFromRow?: number;
  outline?: Cell;
}

/** Draws the base body with an automatic 1px outline and bottom shading. */
export function buildBody(opts: BodyOptions): Grid {
  const profile = opts.profile ?? DEFAULT_PROFILE;
  const shadeFromRow = opts.shadeFromRow ?? 9;
  const outline = opts.outline ?? 'k';
  const mask = bodyMask(profile);
  const grid = blankGrid();

  const filled = (x: number, y: number) => x >= 0 && x < SIZE && y >= 0 && y < SIZE && (mask[y]?.[x] ?? false);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!filled(x, y)) continue;
      const isEdge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      const row = grid[y];
      if (!row) continue;
      row[x] = isEdge ? outline : y >= shadeFromRow ? opts.shadeColor : opts.bodyColor;
    }
  }
  return grid;
}

export type FeetPhase = 'idle' | 'runA' | 'runB';

/** Draws two little feet in the reserved bottom rows (14-15). */
export function addFeet(grid: Grid, footColor: Cell, phase: FeetPhase): Grid {
  const g = cloneGrid(grid);
  const set = (x: number, y: number, c: Cell) => {
    const row = g[y];
    if (row && x >= 0 && x < SIZE) row[x] = c;
  };
  const outline = 'k';
  if (phase === 'idle') {
    for (const x of [3, 4, 5, 10, 11, 12]) {
      set(x, 14, outline);
      set(x, 15, x === 3 || x === 5 || x === 10 || x === 12 ? outline : footColor);
    }
  } else if (phase === 'runA') {
    // left foot forward/up, right foot back/down
    for (const x of [2, 3, 4]) set(x, 15, x === 3 ? footColor : outline);
    for (const x of [11, 12, 13]) {
      set(x, 14, outline);
      set(x, 15, x === 12 ? footColor : outline);
    }
  } else {
    for (const x of [3, 4, 5]) {
      set(x, 14, outline);
      set(x, 15, x === 4 ? footColor : outline);
    }
    for (const x of [10, 11, 12]) set(x, 15, x === 11 ? footColor : outline);
  }
  return g;
}

export type EyeStyle = 'round' | 'blink' | 'wide' | 'sleepy';

/** Draws a pair of cute eyes centred around row 6-8. */
export function addEyes(grid: Grid, style: EyeStyle = 'round', spread = 3, centerY = 7): Grid {
  const g = cloneGrid(grid);
  const set = (x: number, y: number, c: Cell) => {
    const row = g[y];
    if (row && x >= 0 && x < SIZE) row[x] = c;
  };
  const cx = 8;
  const leftX = cx - spread;
  const rightX = cx + spread - 1;
  if (style === 'blink') {
    set(leftX, centerY, 'k');
    set(leftX + 1, centerY, 'k');
    set(rightX, centerY, 'k');
    set(rightX + 1, centerY, 'k');
    return g;
  }
  for (const baseX of [leftX, rightX]) {
    set(baseX, centerY - 1, 'w');
    set(baseX + 1, centerY - 1, 'w');
    set(baseX, centerY, 'w');
    set(baseX + 1, centerY, style === 'sleepy' ? 'w' : 'k');
    if (style === 'wide') {
      set(baseX - 1, centerY, 'w');
    }
  }
  return g;
}

/** Small closed-mouth smile, purely decorative. */
export function addSmile(grid: Grid, y = 10): Grid {
  const g = cloneGrid(grid);
  const row = g[y];
  if (row) {
    row[7] = 'k';
    row[8] = 'k';
  }
  return g;
}

export function paintPixels(grid: Grid, pixels: Array<[number, number, Cell]>): Grid {
  const g = cloneGrid(grid);
  for (const [x, y, c] of pixels) {
    const row = g[y];
    if (row && x >= 0 && x < SIZE && y >= 0 && y < SIZE) row[x] = c;
  }
  return g;
}
