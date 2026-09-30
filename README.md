# NowProductions Tools

A small hub of internal video tools NowProductions builds, all served from
one Express process:

- **Lower Third Generator** — ServiceNow-brand name/title lower thirds.
- **Graphics Generator** — title cards, outro cards, and quote cards in the
  same brand style.
- **Teleprompter Formatter** — turns a talk track into a full-screen,
  scrollable teleprompter.

Every video composition (design spec:
`../design_handoff_lower_third_generator/README.md`) renders as a
transparent **ProRes 4444 RGBA** `.mov`, built with
[Remotion](https://remotion.dev).

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

## Running the hub

```bash
npm run app
```

Builds all three sub-apps and starts the Express server at
**http://localhost:4000**. The landing page (`/`) lists whichever tools are
currently marked visible — see below — as tiles linking to `/lower-third`,
`/graphics`, and `/teleprompter`.

Restart with `npm run app` any time; it rebuilds every frontend and starts
the server fresh (each app's in-progress cards live only in that browser
tab, not saved to disk).

## Which tools show up on the landing page

`app/tools.json` is the allowlist the landing page reads to decide which
tiles to render. Each entry also carries the tile's `icon`, `href`, and
`desc`, trimmed here to just the field that matters for visibility:

```json
[
  { "id": "lower-third", "name": "Lower Third Generator", "visible": true },
  { "id": "graphics", "name": "Graphics Generator", "visible": false },
  { "id": "teleprompter", "name": "Teleprompter Formatter", "visible": true }
]
```

The server exposes it at `GET /tools.json`; `app/landing.html` fetches it
client-side and builds one tile per entry with `visible: true`, in file
order. Flip `visible` and refresh — no rebuild or restart needed, since it's
read fresh off disk on every request.

Hiding a tool here only removes its tile from `/` — its routes and render
API stay reachable at their own URL (e.g. `/graphics`) for anyone with the
link.

## Lower Third Generator (`/lower-third`)

1. **Enter details** — paste one person per line: `Name, Title`, then
   click **Generate**. One card is created per line. Only the *first*
   comma on a line splits name from title — everything after it is the
   title verbatim, so titles that contain their own commas (e.g. "Sr.
   Director, Product Marketing") stay on one line instead of getting cut
   in two.
2. Each card has a **live, scrubbable preview** (the actual composition,
   via `@remotion/player`) plus its own editable fields:
   - Name, Title
   - **Company (optional)** — an extra bold line below the title (and
     below the second title line, if present).
   - **Add second title line** — check to reveal a second title field;
     the plate switches to its taller fixed height. This is always a
     manual, per-card choice — it's never inferred from the pasted text.
   - **Custom width (px)** — check to force an exact plate width
     (200–1700); leave unchecked to auto-fit the plate to the text.
   All edits update the preview immediately.
3. Click **Render & save…** on a card to render it and immediately save
   it, or **Render & save all…** at the top to render every card in
   sequence and save them together as one zip.
4. **Saving** happens through your browser: in Chromium-based browsers
   (Chrome, Edge) a native "Save As" dialog lets you pick the destination
   directly; elsewhere it falls back to a normal browser download. Renders
   themselves live briefly on the server (in the OS temp directory, keyed
   by a one-time token) purely so the browser can fetch them — they're
   deleted the moment they're downloaded, or after 30 minutes if never
   picked up.

Because saving is just a browser download, this works the same way for a
teammate hitting `http://<host's-LAN-IP-or-hostname>:4000/lower-third`
over the network as it does at the host's own keyboard — the file lands
wherever *their* browser saves it, not on the host's disk. Keep in mind
there's no authentication and no render queueing, so it's fine for a small
trusted team on the same network, but simultaneous renders from multiple
people will compete for the host's CPU, and the server only stays up while
`npm run app` is running (and the host is awake) — for always-on shared
access, run it under something like `pm2` or `launchd` and disable sleep
on the host.

## Graphics Generator (`/graphics`)

One batch tool for the three full-frame brand graphics — add as many cards
of each kind as you need, fill in their fields, then render:

- **Title Card** — title + optional subtitle.
- **Outro Card** — heading + optional subtext.
- **Quote Card** — quote + optional attribution name/title.

Same live-preview-per-card and render/save flow as the Lower Third
Generator (single card, or **Render & save all…** as one zip).

## Teleprompter Formatter (`/teleprompter`)

Upload a talk track (`.txt`, `.md`, `.docx`, or `.pdf`) or paste it in
directly, then **Format & view**. `.txt`/`.md` are read in-browser;
`.docx`/`.pdf` are sent to `POST /api/parse-file` for server-side text
extraction (`mammoth` / `pdf-parse`).

The formatted script opens full-screen and scrollable:

- **Play/Pause/Restart**, with scroll **Speed** adjustable via its slider
  or the ↑/↓ arrow keys (disabled while a text field or the script itself
  has focus).
- **Font size**, **Line spacing**, and text **Align**ment controls.
- The script is **editable in place** — click into it and type; edits are
  preserved when you go back to re-format, download, or print.
- Select text to apply a **color** or **highlight** swatch (or a custom
  color), or clear formatting.
- **Bookmarks** — `B` (or the **+ Bookmark** button) drops one at the
  current scroll position; `[` / `]` jump to the previous/next one.
- **Download .txt** saves the current script as plain text;
  **Download .pdf** opens the browser's print dialog against a
  print-only, unscrolled copy of the same script.

## Alternative: Remotion Studio

```bash
npx remotion studio src/index.ts
```

Useful for scrubbing any composition's timeline frame-by-frame or tweaking
the design itself. Four compositions are registered: `LowerThird`,
`TitleCard`, `OutroCard`, `QuoteCard`. The Props panel (right sidebar)
edits one composition's fields at a time — for batch generation, use the
web apps above instead.

## Alternative: CLI (scripting / automation)

Covers the Lower Third only — there's no CLI entry point for the graphics
cards yet (use the Graphics Generator app for those).

```bash
node scripts/render.mjs --name "Matt Jensen" --title "Associate Technical Producer" \
  [--title2 "Second line"] [--company "ServiceNow"] [--width 640] [--out out/matt-jensen.mov]
```

Unlike the app (which renders to a temp file and hands it to the browser),
the CLI writes straight to `--out` (default `out/lower-third.mov`) on
disk.

## Output format

1920×1080, 30fps, exactly 7 seconds (210 frames), codec `prores` profile
`4444`, pixel format `yuva444p10le` (alpha channel preserved) — ready to
key/composite in any NLE. Shared by every composition (Lower Third,
Title/Outro/Quote cards).

## Lower Third plate sizing behavior

- **Width** ("physical length"): auto-fits to the longest line of text by
  default. Force an exact pixel width instead via the card's "Custom
  width" field (app), the Studio Props panel, or `--width` (CLI) —
  useful for matching a fixed on-screen size across multiple names. Text
  is clipped (not wrapped) if it doesn't fit a manually forced width.
- **Height**: fixed per combination of second-title-line/company presence
  (never varies with text length otherwise).

The Title/Outro/Quote cards are always full-frame (1920×1080, `cover`-fit
background) with a fixed layout — they have no width/height controls.

## Project layout

- `src/schema.ts` — zod schemas for all four compositions' editable props
  (`lowerThirdSchema`, `titleCardSchema`, `outroCardSchema`,
  `quoteCardSchema`); drives Studio's typed Props panels and the apps'
  validation-shaped defaults.
- `src/LowerThird.tsx` — the lower-third composition: layout, colors,
  fonts, plate sizing, and its own squeeze/slide/fade entrance-exit
  timeline (a mirrored cubic-bezier transition, see the comments at the
  top of the file for the full choreography).
- `src/TitleCard.tsx` / `src/OutroCard.tsx` / `src/QuoteCard.tsx` — the
  three full-frame graphics, sharing `BrandCardBackground` and the generic
  `enter`/`exit`/`pop` timeline helpers below.
- `src/BrandCardBackground.tsx` — the full-bleed brand gradient + navy
  overlay used by the three full-frame cards.
- `src/timelineHelpers.ts` — generic `enter`/`exit`/`pop` easing wrappers
  shared by TitleCard/OutroCard/QuoteCard; each composition still owns its
  own timing constants.
- `src/easing.ts` — `easeInCubic`/`easeOutCubic`/`easeOutBack` (ported from
  the design handoff) plus `cubicBezier`, a general CSS-style
  cubic-bezier solver used by LowerThird's transition.
- `src/config.ts` — shared FPS/duration/dimensions constants used by
  `Root.tsx` (Studio/CLI) and every app's `<Player>` preview, so they stay
  identical.
- `src/Root.tsx` — registers all four compositions for Studio/CLI.
- `public/gradient-navy-green.png` — the shared brand gradient background
  asset.
- `scripts/renderComposition.mjs` — shared render function
  (`@remotion/renderer`), generic over composition id/props; used by the
  CLI and by `app/server.mjs`. Caches the Remotion bundle across calls so
  batch renders don't re-bundle each time.
- `scripts/render.mjs` — CLI entry point (Lower Third only) around the
  shared render function.
- `scripts/slugify.mjs` — turns a person/graphic's label into a safe
  filename, with a `-2`/`-3`… suffix on repeats.
- `app/` — the hub server plus the Lower Third Generator's frontend:
  - `app/landing.html` — the "all tools" hub page (`/`); builds its tile
    grid at runtime from `app/tools.json`.
  - `app/tools.json` — the visibility allowlist described above.
  - `app/server.mjs` — Express server: serves the landing page and
    `tools.json`; mounts each built sub-app's static files
    (`/lower-third`, `/graphics`, `/teleprompter`); and exposes the shared
    render/download APIs (`POST /api/render`, `POST /api/render-graphic`,
    `POST /api/parse-file`, `GET /api/download/:token`,
    `POST /api/download-zip`).
  - `app/src/App.tsx` — roster textarea, card list, Render/Render all.
  - `app/src/Card.tsx` — one Lower Third card: `<Player>` live preview +
    editable fields.
  - `app/src/parseRoster.ts` — parses pasted lines into cards.
  - `app/src/api.ts` — talks to `/api/render`, `/api/download/:token`, and
    `/api/download-zip`; saves via the File System Access API where
    available, else a plain browser download.
- `graphics-app/` — the Graphics Generator frontend (same shape as
  `app/`: `App.tsx`, `Card.tsx`, `types.ts`, `api.ts`), rendering whichever
  of TitleCard/OutroCard/QuoteCard each card is.
- `teleprompter-app/` — the Teleprompter Formatter frontend: `App.tsx`,
  `UploadPanel.tsx` (upload/paste), `formatText.ts` (raw text → clean
  paragraphs), `TeleprompterView.tsx` (the full-screen scrolling/editing
  view), `api.ts` (server-side file parsing), `download.ts` (`.txt`
  export).

## Notes

- Fonts: "ServiceNow Sans Display / Sans" aren't publicly available yet,
  so this uses **Inter** (loaded from Google Fonts at render time) as a
  stand-in, per the design handoff's fallback guidance — **name: 700
  (bold)**, **title: 400 (regular)**. Components already request the real
  family names first (`"ServiceNow Sans Display", "ServiceNow Sans"`)
  with Inter as fallback — once you hand over the real font files, drop
  them in and wire up an `@font-face` (e.g. in a `src/fonts.css` imported
  from `src/Root.tsx` and each app's `index.html`) referencing those exact
  family names via `staticFile(...)`; no changes needed in the composition
  files themselves.
- Long names/titles on the Lower Third: text doesn't wrap within a line
  (`whiteSpace: "nowrap"`) — the plate auto-widens to fit by default. It
  only clips if you've manually forced a `width` that's too narrow.
- Every batch app renders one entry at a time, sequentially, so "Render &
  save all" on a big batch will take roughly (number of entries) ×
  (~5-15s per video).
