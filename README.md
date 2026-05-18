# Brushstroke

> An Appraisal.
> Identify the painting in as few guesses as possible. Each wrong attribution doubles the resolution.
> Starts at 8 tiles (4×2); ends at 512.

A single-screen browser game. Start at 2 tiles, fail your way to 512.

## Play

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

A local web server is required because the game samples pixel colors via canvas, which is blocked under `file://` for cross-origin images.

## Structure

```
index.html                   markup only — no inline styles, no inline script
assets/style.css             design tokens, layout, components, motion
assets/game.js               round lifecycle, color sampling, fuzzy matching, share card
assets/paintings/*.jpg       vendored public-domain artwork, downsized to 1024px long edge
scripts/fetch-paintings.sh   re-download originals from Wikimedia Commons and resize via sips
```

Images are vendored rather than hot-linked because Wikimedia's thumbnailer
intermittently 400s smaller widths under load. Run `scripts/fetch-paintings.sh`
to refresh.

## Credits

Imagery — public domain · Wikimedia Commons.

