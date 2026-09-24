# PixelLab assets

Pixel Tavern's hero classes, polymorph critters, tavern/dungeon scenes and
items are real [PixelLab](https://www.pixellab.ai/) PNG art, referenced
directly by path (no build step needed to add/replace one — just drop a
same-named PNG in place and reload):

```
heroes/hero-<id>.png       64x64, side view facing right, running pose
  ids: fighter, wizard, rogue, cleric, ranger, dwarf, bard, barbarian,
       paladin, druid, monk, warlock
polymorph/<id>.png         64x64, same pose, the Phase-1 critters
  ids: cat, dog, frog, ghost, knight, ninja, bear, bunny, alien, duck,
       slime, panda, robot
scenes/tavern-bg.png       384x128, opaque, cozy tavern interior
scenes/dungeon-bg.png      384x128, opaque, torch-lit dungeon corridor
items/treasure-chest.png   race-track finish line
items/trophy.png           podium
items/d20.png              brand mark + loading spinner
items/finish-flag.png      spare
```

`core/sprites/heroes.ts` lists each character's id → PNG path, Thai/English
name and one-line flavour text; `core/sprites/items.ts` lists item ids →
PNG paths. To add a **new** hero or polymorph, add its PNG here and a
matching entry to `HEROES`/`POLYMORPH` in `heroes.ts`.

## Recolor system (no new art needed for bigger groups)

A player's avatar is `{ base: characterId, tint: 0-7 }`. `core/sprites/
recolor.ts` loads the base PNG once, then — client-side, cached as a data
URL — hue-shifts only the "outfit" pixels (skips near-grey/near-white/
near-black pixels like metal and outlines, and skips skin-tone pixels) by
one of 7 preset hue offsets (tint 0 is the PNG's original colours). That's
how 8 players can each look visually distinct from a single hero PNG. If
two connected players end up with the same class+tint, the host
auto-bumps the newer one's tint and tells them why.

## Decorative sprites + fallback avatars (code-drawn)

Small decorations (trophy/star/crown/heart/coin/flag) and a fallback for
every avatar id are still drawn in code (`core/sprites/decor.ts`,
`core/sprites/avatars.ts`, `core/sprites/avatarBuilder.ts`) — palette-
indexed string grids rendered to canvas — so the app never breaks if a PNG
is missing. You can override any of *those* specific sprite ids with your
own PixelLab PNG without touching code:

1. Export a PNG for the sprite you want to replace (ideally 16x16 or a
   clean multiple of it, transparent background).
2. Save it in this folder, e.g. `public/assets/pixellab/cat.png`.
3. Add an entry to `manifest.json` in this same folder, mapping the sprite
   id to the file name:

   ```json
   { "cat": "cat.png", "trophy": "trophy.png" }
   ```

4. Reload the app. `src/core/sprites/engine.ts` fetches this manifest once
   at startup (`loadPixelLabOverrides`) and, for every sprite id listed,
   draws your PNG instead of the built-in code-drawn sprite. (This is
   separate from the hero/polymorph PNGs above, which are always used —
   this manifest only matters for the code-drawn decor/fallback set.)

If `manifest.json` is missing, or a sprite id isn't listed in it, the
built-in code-drawn sprite is used — so it can safely stay absent.
