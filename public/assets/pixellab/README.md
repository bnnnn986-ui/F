# PixelLab asset overrides

Pixel Party draws all sprites in code by default (see `src/core/sprites`),
so the game works with zero image assets. If you generate nicer art with
[PixelLab](https://www.pixellab.ai/) (or any other tool) later, you can
drop PNGs in here to override specific sprites **without touching code**.

## How it works

1. Export a PNG for the sprite you want to replace (ideally 16x16 or a
   clean multiple of it, transparent background).
2. Save it in this folder, e.g. `public/assets/pixellab/cat.png`.
3. Add an entry to `manifest.json` in this same folder, mapping the sprite
   id to the file name:

   ```json
   {
     "cat": "cat.png",
     "trophy": "trophy.png"
   }
   ```

4. Reload the app. `src/core/sprites/engine.ts` fetches this manifest once
   at startup (`loadPixelLabOverrides`) and, for every sprite id listed,
   draws your PNG instead of the built-in code-drawn sprite.

## Sprite ids

Avatars: `cat`, `dog`, `frog`, `robot`, `ghost`, `knight`, `ninja`, `bear`,
`bunny`, `alien`, `duck`, `slime`.

Decorations: `trophy`, `star`, `crown`, `heart`, `coin`, `flag`.

If `manifest.json` is missing, or a sprite id isn't listed in it, the
built-in code-drawn sprite is used — so this folder can safely stay empty.
