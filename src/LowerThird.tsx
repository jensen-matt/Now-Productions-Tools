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
//   1. The frame (bar + plate) squeezes AND slides down together — not
//      sequentially — while the text slides down and fades out,
//      finishing well within that span.
//   2. Once the frame is mostly done shrinking/sliding, it starts fading
//      too, continuing through the rest of its motion and a bit beyond.
// Entrance is the same beats in reverse: the frame travels up into place
// as it un-squeezes (not a separate slide-then-grow), and the text starts
// visibly moving the instant it starts fading in (not after a delay) —
// both are the result of using an accelerating curve for this forward/exit
// direction on every animated value. Reversed for the entrance, an
// accelerating curve reads as decelerating (fast start, easing to a stop),
// which is what makes everything begin moving immediately instead of
// lingering near its start value before rushing at the end.
//
// TRANSITION_EASE is a CSS-style cubic-bezier "accelerate" curve — an
// easeInQuart shape, clearly non-linear (obviously speeds up, not the
// near-constant feel of the gentler Material "accelerate" (0.4, 0, 1, 1)
// this started as) without being as extreme as easeInExpo/Quint, which
// rushed through ~90%+ of the motion in the first few frames and then just
// sat there for a while before the text even started. Bezier control
// points can express a curve that doesn't have to mirror itself, so tweak
// x1/y1/x2/y2 here to reshape the whole transition's feel without
// touching any of the timing fractions below.
const TRANSITION_EASE = cubicBezier(0.5, 0, 0.75, 0);
// The text's own active window is a narrow slice of the full transition
// (see TEXT_FRACTION below), so feeding it through TRANSITION_EASE re-creates,
// inside that slice, exactly the "sits there, then rushes" shape the comment
// above rejected for the frame — on entrance that reads as the text jumping
// from invisible to ~30% opacity in a single frame, then crawling the rest
// of the way.
//
// bezierExit()'s (t - start) / duration runs backwards over real time on
// entrance (t counts down), so whatever curve we hand it gets time-mirrored
// — an ease-in shape (slow start, fast finish) comes out the other side as
// ease-out (fast start, slow finish) in real time. A standard "ease-in"
// bezier here is what reads, on screen, as an ordinary ease-out: it starts
// moving the instant its window opens (no dead-flat lead-in) and settles
// with zero velocity (no rushed finish) — unlike an ease-in-out, whose slow
// start becomes a slow start here too, reading as a delayed fade-in.
const TEXT_EASE = cubicBezier(0.42, 0, 1, 1);
function bezierExit(
	t: number,
	start: number,
	duration: number,
	ease: (x: number) => number = TRANSITION_EASE,
): number {
	return ease(clamp((t - start) / duration, 0, 1));
}

// Shortened from 1.1s — snappier both because of the stronger curve above
// and because the whole thing now just takes less time.
const TRANSITION_DURATION = 0.8;
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
// Fraction of the transition the text takes to finish fading/sliding —
// comfortably inside the frame's own motion. This window is anchored to
// t=0 (see bezierExit's calls below), so on the *entrance* — where t
// counts down from 1 — text stays fully invisible until t drops below
// this fraction: a bigger fraction means less dead time staring at an
// empty-but-formed plate before the text starts moving. 0.5 (text
// invisible for the transition's first half, all motion crammed into the
// second) read as a late, delayed fade-in; 0.75 starts the text while the
// frame is still mid-squeeze instead of waiting for it to finish.
const TEXT_FRACTION = 0.75;
// Within that window, the slide finishes after only this fraction of it —
// well before the fade does. Without this gap, slide and fade finish at
// the exact same instant, which means the last few percent of the slide
// play out while the text is already ~85-98% opaque: a fully-visible object
// still visibly creeping the last couple of px, which reads as a little
// snap/settle even though the underlying values move continuously. Ending
// the slide early means it's already at rest for the back portion of the
// window, while only opacity is still (smoothly) climbing.
const TEXT_SLIDE_FRACTION = 0.7;
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

// Motion distances, in px (pre-scale) — how far the frame slides
// off-screen vs. how far the text slides while fading.
const FRAME_SLIDE = 64 * SCALE;
const TEXT_SLIDE = 14 * SCALE;

// Plate geometry, in px — matches the design spec's padding (20px 32px
// 22px) and type sizes exactly, times SCALE. Height is fixed per mode (one
// line vs. two lines of title) rather than shrinking/growing with content,
// so the two variants each render at a constant, predictable height.
const NAME_SIZE = 40 * SCALE;
const NAME_LINE_HEIGHT = 1.1;
const TITLE_SIZE = 18 * SCALE;
const TITLE_LINE_HEIGHT = 1.15;
const LINE_GAP = 2 * SCALE;
const PLATE_PAD_TOP = 20 * SCALE;
const PLATE_PAD_BOTTOM = 22 * SCALE;
const PLATE_PAD_X = 32 * SCALE;
const PLATE_RADIUS = 14 * SCALE;

const BAR_WIDTH = 64 * SCALE;
const BAR_HEIGHT = 5 * SCALE;
const BAR_RADIUS = 3 * SCALE;
const BAR_MARGIN_BOTTOM = 14 * SCALE;

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
// bezierExit() (TRANSITION_EASE, accelerating) for this forward direction
// — see the comment on TRANSITION_EASE for why that's what makes the
// reversed entrance feel immediate rather than laggy.
function transitionState(t: number) {
	// Frame: squeezes (bar width, plate height) AND slides toward
	// off-screen together, from the same progress value — not
	// sequentially — spanning the full transition so it's already moving
	// at t=0 and still moving at t=1 (see the comment on
	// TRANSITION_DURATION). Bottoms out at MIN_SQUEEZE_SCALE/FRAME_SLIDE
	// rather than 0/further, since a fully-shrunk, fully-displaced frame
	// would leave nothing for the fade below to visibly act on.
	let frameProgress = bezierExit(t, 0, 1);
	// Chrome renders a transformed element's text differently depending on
	// whether the transform is the exact identity (scaleY(1) translateY(0))
	// or merely a value that rounds to it on screen — the identity case
	// skips the compositing/resampling path a non-identity value forces,
	// which resamples the text underneath it. TRANSITION_EASE only reaches
	// exactly 0 on the very last rendered frame, so every frame before it
	// carries a microscopic (sub-0.01px) non-zero residual — invisible on
	// its own, but the switch to true identity on that last frame reads as
	// a small pop, because it's a rendering-path change, not a continuation
	// of the animation's own easing. Snapping to exactly 0 a few frames
	// early — while the residual is already far below a pixel — means
	// several consecutive tail frames share the exact same transform, so
	// that rendering-path switch lands where nothing else is visibly
	// changing either, instead of on the frame everyone's eye is on.
	if (frameProgress < 0.002) frameProgress = 0;
	const barScale = 1 - frameProgress * (1 - MIN_SQUEEZE_SCALE);
	const plateScaleY = 1 - frameProgress * (1 - MIN_SQUEEZE_SCALE);
	const frameY = frameProgress * FRAME_SLIDE;

	// Text: fades over its whole window, done well before the frame
	// finishes its own squeeze+slide (see TEXT_FRACTION above).
	const textFadeProgress = bezierExit(t, 0, TEXT_FRACTION, TEXT_EASE);
	const textOpacity = 1 - textFadeProgress;
	// The slide uses the tail end of that same window (see
	// TEXT_SLIDE_FRACTION above) so it comes to rest before the fade does.
	const textSlideProgress = bezierExit(
		t,
		TEXT_FRACTION * (1 - TEXT_SLIDE_FRACTION),
		TEXT_FRACTION * TEXT_SLIDE_FRACTION,
		TEXT_EASE,
	);
	const textY = textSlideProgress * TEXT_SLIDE;

	// Once the frame is FADE_START_T of the way through the transition,
	// it starts fading too, continuing through to the end.
	const fadeProgress = bezierExit(t, FADE_START_T, 1 - FADE_START_T);
	const frameOpacity = 1 - fadeProgress;

	return { barScale, plateScaleY, frameOpacity, frameY, textOpacity, textY };
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

	const { barScale, plateScaleY, frameOpacity, frameY, textOpacity, textY } = transitionState(t);
	// The name/title text sits inside the plate div, which is being
	// scaleY'd for the squeeze — without correction, that scale cascades
	// to the text too, visibly squashing/stretching the glyphs as the
	// plate resizes. This counter-scale cancels it out so the text always
	// renders at its true proportions, on a separate inner wrapper so it
	// doesn't also cancel out the text's own translateY slide.
	const textCounterScaleY = 1 / plateScaleY;

	const titleLineStyle: React.CSSProperties = {
		fontFamily: TITLE_FONT_FAMILY,
		fontWeight: 400,
		fontSize: TITLE_SIZE,
		color: "#FFFFFF",
		letterSpacing: "0.01em",
		lineHeight: TITLE_LINE_HEIGHT,
		whiteSpace: "nowrap",
	};
	const companyLineStyle: React.CSSProperties = { ...titleLineStyle, fontWeight: 700 };

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
				}}
			>
				<div
					style={{
						width: BAR_WIDTH,
						height: BAR_HEIGHT,
						borderRadius: BAR_RADIUS,
						background: "#63DF4E",
						marginBottom: BAR_MARGIN_BOTTOM,
						transform: `scaleX(${barScale})`,
						transformOrigin: "left center",
					}}
				/>
				<div
					style={{
						position: "relative",
						width: width ? `${width}px` : undefined,
						height: plateHeight,
						boxSizing: "border-box",
						borderRadius: PLATE_RADIUS,
						overflow: "hidden",
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
							zIndex: 0,
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: 0,
							background:
								"linear-gradient(120deg, rgba(3,45,66,0.55) 0%, rgba(3,45,66,0.72) 100%)",
							zIndex: 1,
						}}
					/>
					<div
						style={{
							position: "relative",
							zIndex: 2,
							height: "100%",
							boxSizing: "border-box",
							paddingLeft: PLATE_PAD_X,
							paddingRight: PLATE_PAD_X,
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							gap: LINE_GAP,
						}}
					>
						<div
							style={{
								opacity: textOpacity,
								transform: `translateX(${NAME_LEFT_NUDGE}px) translateY(${textY}px)`,
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
									transform: `scaleY(${textCounterScaleY})`,
								}}
							>
								{name}
							</div>
						</div>
						<div
							style={{
								opacity: textOpacity,
								transform: `translateY(${textY}px)`,
								// See the matching comment on the name block above.
								willChange: "opacity",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: LINE_GAP,
									transform: `scaleY(${textCounterScaleY})`,
								}}
							>
								<div style={titleLineStyle}>{title}</div>
								{hasSecondLine ? (
									<div style={titleLineStyle}>{title2}</div>
								) : null}
								{hasCompany ? (
									<div style={companyLineStyle}>{company}</div>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
