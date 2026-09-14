# Lower Third Generator

Renders the ServiceNow-brand "name / title" lower-third graphic (design spec:
`../design_handoff_lower_third_generator/README.md`) as a transparent
**ProRes 4444 RGBA** `.mov`. Paste in a batch of names/titles and generate
one video per person, each fully editable before rendering.

Built with [Remotion](https://remotion.dev).

## One-time setup

This machine has no system Node.js, so a portable copy is bundled at
`.tools/node/` (downloaded from nodejs.org, not installed system-wide).
Put it on `PATH` for each new terminal session:

```bash
export PATH="$(pwd)/.tools/node/bin:$PATH"
```

If you have your own Node.js 18+ already, you can skip `.tools/node` and
just use that instead.

Then install dependencies once:

```bash
npm install
```

## Batch generator app (primary workflow)

```bash
npm run app
```

Builds the app and starts it at **http://localhost:4000**.

1. **Enter details** — paste one person per line: `Name, Title`, then
   click **Generate**. One card is created per line. Only the *first*
   comma on a line splits name from title — everything after it is the
   title verbatim, so titles that contain their own commas (e.g. "Sr.
   Director, Product Marketing") stay on one line instead of getting cut
   in two.
2. Each card has a **live, scrubbable preview** (the actual composition,
   via `@remotion/player`) plus its own editable fields:
   - Name, Title
   - **Add second title line** — check to reveal a second title field;
     the plate switches to its taller fixed height. This is always a
     manual, per-card choice — it's never inferred from the pasted text.
   - **Custom width (px)** — check to force an exact plate width
     (200–1700); leave unchecked to auto-fit the plate to the text
   All edits update the preview immediately.
3. **Save to folder** — defaults to `out/` inside the project. Click
   **Choose folder…** to pick one with a native Finder dialog (macOS
   only — spawns `osascript`/`choose folder` on the server), or type a
   path directly: relative paths resolve inside the project, absolute
   paths (e.g. `/Users/you/Movies/LowerThirds`) save anywhere on disk —
   useful for saving straight into an NLE project's media folder.
   Applies to every render (per-card and Render all).
4. Click **Render** on a card to export just that one, or **Render all**
   at the top to export every card in sequence with a progress bar each.
5. Files are named from the person's name (e.g. `matt-jensen.mov`); a
   repeat name in the same folder gets `-2`, `-3`, etc. so nothing is
   overwritten.

Restart with `npm run app` any time; it rebuilds the frontend and starts
the server fresh (state — the cards you've entered — is only kept in the
browser tab, not saved to disk).

## Alternative: Remotion Studio

```bash
npx remotion studio src/index.ts
```

Useful for scrubbing the timeline frame-by-frame or tweaking the design
itself. The Props panel (right sidebar) edits one composition's fields
(name/title/title2/width) at a time — for batch generation, use the app
above instead.

## Alternative: CLI (scripting / automation)

```bash
node scripts/render.mjs --name "Matt Jensen" --title "Associate Technical Producer" \
  [--title2 "Second line"] [--width 640] [--out out/matt-jensen.mov]
```

## Output format

1920×1080, 30fps, exactly 7 seconds (210 frames), codec `prores` profile
`4444`, pixel format `yuva444p10le` (alpha channel preserved) — ready to
key/composite in any NLE.

## Plate sizing behavior

- **Width** ("physical length"): auto-fits to the longest line of text by
  default. Force an exact pixel width instead via the card's "Custom
  width" field (app), the Studio Props panel, or `--width` (CLI) —
  useful for matching a fixed on-screen size across multiple names. Text
  is clipped (not wrapped) if it doesn't fit a manually forced width.
- **Height**: always one of two fixed values — a shorter height for a
  single title line, a taller fixed height when a second title line is
  present. Height never varies with text length, only with whether the
  second line is present.

## Project layout

- `src/schema.ts` — zod schema for the four editable props (`name`,
  `title`, `title2`, `width`); drives Studio's typed Props panel and is
  reused for validation-shaped defaults in the app.
- `src/LowerThird.tsx` — the composition: layout, colors, fonts, plate
  sizing, and the animation timeline (bar pop-in, plate slide/fade,
  staggered name/title entrance, reverse exit in the last 0.8s). Timeline
  ported 1:1 from the reference `lower-third-scene.jsx` in the design
  handoff. Shared, unchanged, by Studio/CLI/app.
- `src/easing.ts` — `easeOutCubic` / `easeInCubic` / `easeOutBack`,
  matching the exact formulas in the design handoff README.
- `src/config.ts` — shared FPS/duration/dimensions constants used by both
  `Root.tsx` (Studio/CLI) and the app's `<Player>` preview, so they stay
  identical.
- `src/Root.tsx` — registers the `LowerThird` composition for Studio/CLI.
- `public/gradient-navy-green.png` — the brand gradient background asset.
- `scripts/renderLowerThird.mjs` — shared render function
  (`@remotion/renderer`) used by both the CLI and the app's server; caches
  the Remotion bundle across calls so batch renders don't re-bundle each
  time.
- `scripts/render.mjs` — CLI entry point around the shared render
  function.
- `app/` — the batch generator web app:
  - `app/src/App.tsx` — roster textarea, card list, Render/Render all.
  - `app/src/Card.tsx` — one card: `<Player>` live preview + editable
    fields.
  - `app/src/parseRoster.ts` — parses pasted lines into cards.
  - `app/server.mjs` — Express server: serves the built app, a streaming
    `POST /api/render` endpoint, and `POST /api/choose-folder` (native
    macOS folder picker via `osascript`).

## Notes

- Fonts: "ServiceNow Sans Display / Sans" aren't publicly available yet,
  so this uses **Inter** (loaded from Google Fonts at render time) as a
  stand-in, per the design handoff's fallback guidance — **name: 700
  (bold)**, **title: 400 (regular)**. The component already requests the real
  family names first (`"ServiceNow Sans Display", "ServiceNow Sans"`)
  with Inter as fallback — once you hand over the real font files, drop
  them in and wire up an `@font-face` (e.g. in a `src/fonts.css`
  imported from `src/Root.tsx` and `app/index.html`) referencing those
  exact family names via `staticFile(...)`; no changes needed in
  `LowerThird.tsx` itself.
- Long names/titles: text doesn't wrap within a line
  (`whiteSpace: "nowrap"`) — the plate auto-widens to fit by default. It
  only clips if you've manually forced a `width` that's too narrow.
- The app renders one entry at a time, sequentially, so "Render all" on
  a big batch will take roughly (number of people) × (~5-15s per video).
