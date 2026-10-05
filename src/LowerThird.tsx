import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { clamp, cubicBezier } from "./easing";
import type { LowerThirdProps } from "./schema";

// Substitute for "ServiceNow Sans Display" / "ServiceNow Sans" (not
// redistributable) — Inter is a comparable humanist grotesque, per the
// design handoff's fallback guidance. Swap in the real fonts via
// @font-face once available; the family names below already match the
// design spec, so real files fall into this stack with no code changes.
const { fontFamily: interFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const NAME_FONT_FAMILY = `"ServiceNow Sans Display", "ServiceNow Sans", ${interFamily}, sans-serif`;
const TITLE_FONT_FAMILY = `"ServiceNow Sans", ${interFamily}, sans-serif`;

// Overall size multiplier on top of the design spec's original geometry —
// applied to every px constant below (type sizes, padding, position,
// motion distances) so the graphic scales up as one uniform unit rather
// than just growing its text.
const SCALE = 1.3;

// The exit is one choreographed sequence — see transitionState() below —
// and the entrance is that exact sequence played backwards, so the two
// are guaranteed to be mirror images of each other rather than two
// separately hand-tuned approximations.
//
// Exit, forward (t: 0 -> 1 over TRANSITION_DURATION seconds):
//   1. The frame (the plate) squeezes AND slides down together — not
//      sequentially — while the text slides down and fades out,
//      finishing well within that span.
//   2. Once the frame is mostly done shrinking/sliding, it starts fading
//      too, continuing through the rest of its motion and a bit beyond.
// Entrance is the same beats in reverse: the frame settles into place as
// it un-squeezes, and the text eases in the instant its own fade window
// opens.
//
// TRANSITION_EASE and its exponent are fit directly to a reference .mov
// the client supplied of the target animation — not invented by eye. That
// clip was decoded frame-by-frame (ffmpeg, preserving its alpha channel)
// and, per frame, the plate's alpha>=50% bounding box was measured to
// track its height/position over time. Exit height shrinks like
// t^2.3-ish ("accelerate": starts slow, speeds up into the squeeze) with
// no overshoot anywhere — fitting power curves t^n against the measured
// per-frame heights put the best fit at n≈2.3 (least total squared error
// across both the exit and, mirrored, the entrance data). A plain power
// function is used directly rather than approximated as a cubic-bezier,
// since it's both a closer fit and simpler than reverse-engineering
// bezier control points for the same curve.
// bezierExit() plays this same function backwards for the entrance (t
// counts down there — see below), which turns this accelerate shape into
// its mirror image, decelerate: fast off the start, easing smoothly to a
// dead stop with zero velocity exactly at rest — which is what the
// reference clip's entrance measured as too, with no overshoot past the
// settled size/position on either side.
const TRANSITION_EASE = (t: number): number => t ** 2.3;
// Deliberately NOT the same curve as TRANSITION_EASE (tried that):
// t^2.3 has a steep initial slope (as a forward/exit curve, it's meant to
// launch fast), which applied directly to opacity makes each line jump to
// ~40-70% visible within the first fifth of its own fade window, then
// crawl the rest of the way to 100% — multiple lines doing that in
// sequence reads as everything flickering in at once, not a cascade. A
// standard, gentler "ease-in" bezier keeps each line's opacity low for
// longer before it ramps, which is what actually makes the stagger
// between lines (see STAGGER_STEP_T below) read as sequential.
const TEXT_EASE = cubicBezier(0.42, 0, 1, 1);
function bezierExit(
  t: number,
  start: number,
  duration: number,
  ease: (x: number) => number = TRANSITION_EASE,
): number {
  return ease(clamp((t - start) / duration, 0, 1));
}

// Measured off the same reference clip: the exit's alpha>=50% bounding
// box went from fully-settled to fully-gone in ~26 frames at 29.97fps
// (~0.87s), and the entrance's equivalent window measured ~28 frames
// (~0.93s) — close enough to the same number, given some unavoidable
// fuzziness in picking an exact start/end frame off a continuous fade,
// that one shared duration fits both. 0.9s is that shared value.
const TRANSITION_DURATION = 0.9;
// The frame's combined squeeze+slide spans the *entire* transition (not a
// leading fraction of it) — it needs to start changing at t=0 so the exit
// visibly starts right away, but it also needs to still be changing all
// the way to t=1, because whatever's true at t=1 is where the reversed
// entrance BEGINS. A squeeze that finished early (say by t=0.7) would just
// sit idle for the rest of the exit — invisible in the exit's own tail,
// but reversed, that idle stretch becomes a dead zone at the START of the
// entrance where the frame doesn't move yet. Spanning the full [0,1]
// keeps it moving right up to both ends.
// The frame starts fading once this far through that squeeze+slide.
const FADE_START_T = 0.65;
// How much of the transition each individual line's own fade takes —
// deliberately much narrower than the frame's own squeeze/slide (unlike
// an earlier, wider attempt that had every line's fade window open
// almost immediately, just at different rates — which reads as
// everything arriving together, not a cascade).
const TEXT_FRACTION = 0.22;
// Per-line stagger, in the same t-fraction units as TEXT_FRACTION, so the
// name settles first, then the title line(s), then the company — each
// group's fade window starts this much later in t than the one before it
// (see textOpacityAt() below). Bigger than TEXT_FRACTION, so one line is
// essentially done before the next really gets going — a visible gap
// between each arrival, not just a staggered start.
const STAGGER_STEP_T = 0.32;
// Optical left-margin correction for the name line only, in final rendered
// px (not multiplied by SCALE — tuned by eye against the actual output,
// not a design-spec geometry value). The name and title/company blocks
// share the exact same CSS left edge (same padding, no per-line margin),
// but a bold 52px glyph's left-side-bearing and a regular 23px glyph's
// left-side-bearing rarely match, so different name/title text can still
// look unaligned even though the boxes are pixel-identical. Nudging only
// the name (never the title/company) keeps the title block as the fixed
// reference edge.
const NAME_LEFT_NUDGE = -3;
// The squeeze bottoms out here, not at 0 — a hairline sliver stays visible
// so the fade (phase 2) and slide-off (phase 3) have something to animate,
// rather than a zero-height frame that's already invisible either way.
const MIN_SQUEEZE_SCALE = 0.04;

// How far the frame slides off-screen, in px (pre-scale).
const FRAME_SLIDE = 64 * SCALE;

// Plate border/shadow, matching the bordered-card look from the design
// handoff screenshot — a two-layer silver bezel (a softer, thicker inner
// stroke plus a crisper, more opaque outer line right outside it) plus a
// soft drop shadow further out, in place of the old top accent bar.
// CSS only allows one `border` per box, so the outer stroke is a zero-blur
// box-shadow ring instead (see PLATE_SHADOW below) — box-shadow draws
// outward from the border's own outer edge, so it naturally lands flush
// against the inner stroke rather than needing its own offset.
const PLATE_BORDER_WIDTH = 4 * SCALE;
const PLATE_BORDER_COLOR = "rgba(150,154,158,0.5)";
const PLATE_OUTER_STROKE_WIDTH = 1.5 * SCALE;
const PLATE_OUTER_STROKE_COLOR = "rgba(150,154,158,0.9)";
const PLATE_SHADOW = `0 0 0 ${PLATE_OUTER_STROKE_WIDTH}px ${PLATE_OUTER_STROKE_COLOR}, 0 ${4 * SCALE}px ${14 * SCALE}px rgba(0,0,0,0.5)`;

// Plate geometry, in px, times SCALE. Height is fixed per mode (one line
// vs. two lines of title) rather than shrinking/growing with content, so
// the two variants each render at a constant, predictable height.
const NAME_SIZE = 40 * SCALE;
const NAME_LINE_HEIGHT = 1.1;
const TITLE_SIZE = 18 * SCALE;
const TITLE_LINE_HEIGHT = 1.15;
const LINE_GAP = 2 * SCALE;
// PLATE_PAD_TOP/BOTTOM are applied as real CSS padding (below) rather than
// centering the text block in the plate — centering would silently discard
// any top/bottom asymmetry here. Sized to match the bordered-card design
// handoff screenshot's generous, slightly bottom-heavy margins around the
// text block (measured off it directly: ~15% of plate height on top,
// ~16.5% on the bottom).
const PLATE_PAD_TOP = 18 * SCALE;
const PLATE_PAD_BOTTOM = 20 * SCALE;
const PLATE_PAD_X = 36 * SCALE;
const PLATE_RADIUS = 14 * SCALE;

const PLATE_LEFT = 96 * SCALE;
const PLATE_BOTTOM = 90 * SCALE;

const nameLinePx = NAME_SIZE * NAME_LINE_HEIGHT;
const titleLinePx = TITLE_SIZE * TITLE_LINE_HEIGHT;

// Plate height for a given number of title-block lines (title, plus an
// optional second title line, plus an optional company line — all set at
// TITLE_SIZE) below the fixed name line.
function plateHeightFor(titleLineCount: number): number {
  return (
    PLATE_PAD_TOP +
    PLATE_PAD_BOTTOM +
    nameLinePx +
    LINE_GAP +
    titleLineCount * titleLinePx +
    (titleLineCount - 1) * LINE_GAP
  );
}

// Every animated value as a pure function of exit-relative progress t (0
// at fully settled/visible, 1 at fully gone). Every ramp below uses
// bezierExit() (TRANSITION_EASE) for this forward direction — see the
// comment on TRANSITION_EASE for where that curve comes from.
function transitionState(t: number) {
  // Frame: squeezes (plate height) AND slides toward
  // off-screen together, from the same progress value — not
  // sequentially — spanning the full transition so it's already moving
  // at t=0 and still moving at t=1 (see the comment on
  // TRANSITION_DURATION). Bottoms out at MIN_SQUEEZE_SCALE/FRAME_SLIDE
  // rather than 0/further, since a fully-shrunk, fully-displaced frame
  // would leave nothing for the fade below to visibly act on.
  // No "snap to exact identity" here: that trick was only ever needed to
  // dodge a Chrome render-path switch between a transformed element's
  // identity and near-identity states, and willChange: "transform" on the
  // outer frame group this feeds already forces the same composited
  // render path permanently, regardless of value — making that switch a
  // non-issue.
  const frameProgress = bezierExit(t, 0, 1);
  const plateScaleY = 1 - frameProgress * (1 - MIN_SQUEEZE_SCALE);
  // Not rounded (tried that — see the note on the plate's height below,
  // which is the one place rounding actually mattered): this value is
  // smooth and genuinely monotonic on its own, confirmed to 10 decimal
  // places. Rounding it to whole pixels was the real source of a
  // different symptom — a multi-frame "stall" at the same pixel value
  // before a final 1px pop, since this curve's tail (by design, for a
  // smooth deceleration) spends many frames within one pixel of its
  // target. Sub-pixel motion here renders smoothly throughout; only the
  // plate's own animated height needed whole-pixel snapping.
  const frameY = frameProgress * FRAME_SLIDE;

  // Text: fades over its whole window, done well before the frame
  // finishes its own squeeze+slide (see TEXT_FRACTION above). Each group's
  // fade window is [start, start + TEXT_FRACTION] in t, and t counts DOWN
  // during the entrance (1 -> 0) — so a window with a *larger* start is
  // reached sooner in wall-clock time, not later. To get name-then-title-
  // then-company on entrance, name needs the largest start (reached
  // first as t drops), company the smallest (reached last). That same
  // assignment, replayed forward on the exit (t: 0 -> 1), makes company
  // fade out first and name linger longest — a "last in, first out"
  // mirror of the entrance rather than an independently-tuned exit order.
  function textOpacityAt(order: number): number {
    const fadeProgress = bezierExit(
      t,
      order * STAGGER_STEP_T,
      TEXT_FRACTION,
      TEXT_EASE,
    );
    return 1 - fadeProgress;
  }
  const nameOpacity = textOpacityAt(2);
  const titleOpacity = textOpacityAt(1);
  const companyOpacity = textOpacityAt(0);

  // Once the frame is FADE_START_T of the way through the transition,
  // it starts fading too, continuing through to the end.
  const fadeProgress = bezierExit(t, FADE_START_T, 1 - FADE_START_T);
  const frameOpacity = 1 - fadeProgress;

  return {
    frameProgress,
    plateScaleY,
    frameOpacity,
    frameY,
    nameOpacity,
    titleOpacity,
    companyOpacity,
  };
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  title2,
  company,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const localTime = frame / fps;
  // Use the last rendered frame's time (durationInFrames - 1), not
  // durationInFrames/fps — the latter is one frame past what's ever
  // actually rendered, so the exit would still be short of its fully-gone
  // state on the final frame.
  const dur = (durationInFrames - 1) / fps;
  const exitStart = dur - TRANSITION_DURATION;

  const hasSecondLine = title2.trim().length > 0;
  const hasCompany = company.trim().length > 0;
  const titleLineCount = 1 + (hasSecondLine ? 1 : 0) + (hasCompany ? 1 : 0);
  const plateHeight = plateHeightFor(titleLineCount);

  // t is exit-relative progress: 0 while fully settled, ramping to 1 as
  // the exit finishes. During the entrance it's the same scale played
  // backwards (1 -> 0), and it's pinned to 0 in between.
  let t: number;
  if (localTime > exitStart) {
    t = clamp((localTime - exitStart) / TRANSITION_DURATION, 0, 1);
  } else if (localTime < TRANSITION_DURATION) {
    t = 1 - clamp(localTime / TRANSITION_DURATION, 0, 1);
  } else {
    t = 0;
  }

  const {
    frameProgress,
    plateScaleY,
    frameOpacity,
    frameY,
    nameOpacity,
    titleOpacity,
    companyOpacity,
  } = transitionState(t);
  // How far below its resting position the text starts, scaled to this
  // instance's own plateHeight (1 vs. 2 title lines give different
  // heights) rather than a fixed px distance — guarantees the text is
  // fully below the clip region (see clipPath below, which only ever
  // reveals up to plateHeight's worth) at frameProgress=1, regardless of
  // which plate-height variant is rendering.
  const textSlideY = frameProgress * plateHeight;

  const titleLineStyle: React.CSSProperties = {
    fontFamily: TITLE_FONT_FAMILY,
    fontWeight: 400,
    fontSize: TITLE_SIZE,
    color: "#FFFFFF",
    letterSpacing: "0.01em",
    lineHeight: TITLE_LINE_HEIGHT,
    whiteSpace: "nowrap",
  };
  const companyLineStyle: React.CSSProperties = {
    ...titleLineStyle,
    fontWeight: 700,
  };

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: PLATE_LEFT,
          bottom: PLATE_BOTTOM,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          transform: `translateY(${frameY}px)`,
          opacity: frameOpacity,
          // Pins this group onto its own composited layer for its entire
          // lifetime (not just while animating), so Chrome never switches
          // rendering paths mid-transition in a way that reads as a pop
          // on a real downstream decoder (seen via Mitti driving a
          // program feed).
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: width ? `${width}px` : undefined,
            // Fixed at the full, unsqueezed height — layout never
            // animates — only the visual transform below does.
            height: plateHeight,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              // Absolutely positioned (not the normal-flow box it used to
              // be) and now holds *only* the background/border/shadow —
              // the text moved out to its own sibling below, specifically
              // so it's no longer a descendant of this element's
              // transform: scaleY. A transform cascades to every
              // descendant by default, which used to squash the text's
              // own glyphs along with the plate — fine for matching the
              // reference clip's squeeze, but the ask here is for text
              // that never changes height at all, which means it can't
              // share an ancestor with anything that scales.
              position: "absolute",
              inset: 0,
              borderRadius: PLATE_RADIUS,
              border: `${PLATE_BORDER_WIDTH}px solid ${PLATE_BORDER_COLOR}`,
              boxShadow: PLATE_SHADOW,
              overflow: "hidden",
              // Scales the whole box — border and shadow included, so the
              // stroke visibly grows/shrinks in step with the squeeze
              // instead of sitting there fully-formed — anchored at the
              // bottom edge, so that edge never moves and the plate reads
              // as rising up out of/settling down into it, matching the
              // reference clip (measured: its bottom edge barely moves
              // while its top edge does almost all the travel).
              transform: `scaleY(${plateScaleY})`,
              transformOrigin: "center bottom",
            }}
          >
            <Img
              src={staticFile("gradient-navy-green.png")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                // Mirrored so the asset's green corner lands bottom-right
                // (matching the design handoff) instead of its native
                // bottom-left.
                transform: "scaleX(-1)",
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, rgba(3,45,66,0.25) 0%, rgba(3,45,66,0.4) 100%)",
                zIndex: 1,
              }}
            />
          </div>
          <div
            style={{
              // A normal-flow sibling of the (now absolutely positioned)
              // background/border box above, rather than a descendant of
              // it — this is also the element that gives the outer sizing
              // box its width when `width` isn't passed in (shrink-to-fit
              // around this div's own text content), which the
              // background box no longer can now that it's taken out of
              // flow.
              position: "relative",
              zIndex: 2,
              height: "100%",
              boxSizing: "border-box",
              paddingLeft: PLATE_PAD_X,
              paddingRight: PLATE_PAD_X,
              paddingTop: PLATE_PAD_TOP,
              paddingBottom: PLATE_PAD_BOTTOM,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              // Gates visibility to "however much of the plate is
              // currently grown," independently of the slide below —
              // clips away the top portion of this (always full-height,
              // never-scaled) box, same bottom-up reveal as the plate's
              // own scaleY, so text only ever shows within the plate's
              // current visible bounds no matter where the slide has it.
              clipPath: `inset(${plateHeight * (1 - plateScaleY)}px 0 0 0)`,
            }}
          >
            <div
              style={{
                // The slide offset lives here, on a single shared wrapper
                // around all three text groups, rather than repeated on
                // each one — it used to be repeated (one per group) back
                // when there were only two groups (name, title+company),
                // and splitting that second group into title and company
                // for the stagger (see textOpacityAt() above) turned "one
                // repeated offset" into three independently-positioned
                // layout boxes. All three still got the exact same slide
                // value, but each is its own box, and each one's layout
                // position rounds to a whole pixel independently at paint
                // time — so despite sharing one continuous, monotonic
                // value, the title and company boxes could round to
                // different pixels from each other on different frames,
                // visible as the gap between them jittering by a px.
                // Hoisting the offset to one common ancestor means there's
                // only one box being positioned and rounded; the three
                // groups inside it are plain flow children with no
                // position/top of their own, so they move together with
                // no possibility of diverging.
                //
                // translateY, not "top": "top" is a layout property, and
                // this value briefly pushes the block well outside the
                // parent's own height (see textSlideY's comment) — as
                // "top" that would be an out-of-flow-reading position a
                // layout engine has to reconcile with the parent's
                // overflow/clip machinery, whereas transform is purely a
                // paint-time offset that the clipPath above (also
                // paint-time) composes with cleanly.
                position: "relative",
                transform: `translateY(${textSlideY}px)`,
                display: "flex",
                flexDirection: "column",
                gap: LINE_GAP,
                // No counter-scale, and nothing here scales at all —
                // unlike the plate box, this group is never touched by
                // plateScaleY, so the text's own height/proportions never
                // change; clipPath above is what makes it only show
                // within the plate's current (possibly still-growing)
                // visible bounds.
                willChange: "transform",
              }}
            >
              <div
                style={{
                  opacity: nameOpacity,
                  // Keeps this on the same GPU-composited layer at every
                  // opacity value, including 1 — without it, Chrome only
                  // promotes the layer while opacity < 1 (forcing grayscale
                  // AA instead of the direct-paint subpixel AA it uses once
                  // opacity settles at exactly 1), so the glyphs get
                  // re-rasterized slightly differently the instant the fade
                  // finishes, reading as the text's right edge hopping by a
                  // px or two right as the entrance settles. Pinning the
                  // layer for the text's entire lifetime — not just while
                  // animating — makes every frame use the same rendering
                  // path, fade or fully visible alike.
                  willChange: "opacity",
                  position: "relative",
                  left: NAME_LEFT_NUDGE,
                }}
              >
                <div
                  style={{
                    fontFamily: NAME_FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: NAME_SIZE,
                    color: "#63DF4E",
                    letterSpacing: "-0.01em",
                    lineHeight: NAME_LINE_HEIGHT,
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </div>
              </div>
              <div
                style={{
                  opacity: titleOpacity,
                  // See the matching comment on the name block above.
                  willChange: "opacity",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: LINE_GAP,
                  }}
                >
                  <div style={titleLineStyle}>{title}</div>
                  {hasSecondLine ? (
                    <div style={titleLineStyle}>{title2}</div>
                  ) : null}
                </div>
              </div>
              {hasCompany ? (
                <div
                  style={{
                    opacity: companyOpacity,
                    // See the matching comment on the name block above.
                    willChange: "opacity",
                  }}
                >
                  <div style={companyLineStyle}>{company}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
