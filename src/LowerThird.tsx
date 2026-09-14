import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import {
	AbsoluteFill,
	Img,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";
import { clamp } from "./easing";
import type { LowerThirdProps } from "./schema";
import { enter, exit, pop } from "./timelineHelpers";

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

// Timeline constants, in seconds — ported 1:1 from
// design_handoff_lower_third_generator/lower-third-scene.jsx
const ENTER_END = 0.6;
const BAR_END = 0.45;
const NAME_START = 0.12;
const NAME_END = 0.62;
const TITLE_START = 0.26;
const TITLE_END = 0.74;
const EXIT_DUR = 0.8;

// Plate geometry, in px — matches the design spec's padding (20px 32px
// 22px) and type sizes exactly. Height is fixed per mode (one line vs.
// two lines of title) rather than shrinking/growing with content, so the
// two variants each render at a constant, predictable height.
const NAME_SIZE = 40;
const NAME_LINE_HEIGHT = 1.1;
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 1.3;
const LINE_GAP = 4;
const PLATE_PAD_TOP = 20;
const PLATE_PAD_BOTTOM = 22;
const PLATE_PAD_X = 32;

const nameLinePx = NAME_SIZE * NAME_LINE_HEIGHT;
const titleLinePx = TITLE_SIZE * TITLE_LINE_HEIGHT;

const PLATE_HEIGHT_1_LINE =
	PLATE_PAD_TOP + PLATE_PAD_BOTTOM + nameLinePx + LINE_GAP + titleLinePx;
const PLATE_HEIGHT_2_LINE = PLATE_HEIGHT_1_LINE + LINE_GAP + titleLinePx;

export const LowerThird: React.FC<LowerThirdProps> = ({
	name,
	title,
	title2,
	width,
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const localTime = frame / fps;
	const dur = durationInFrames / fps;
	const exitStart = dur - EXIT_DUR;

	const hasSecondLine = title2.trim().length > 0;
	const plateHeight = hasSecondLine ? PLATE_HEIGHT_2_LINE : PLATE_HEIGHT_1_LINE;

	const inExit = localTime > exitStart;
	const exitT = inExit ? exit(localTime, exitStart, EXIT_DUR) : 0;

	// Plate: slides up + fades in, then reverses out.
	const plateInT = enter(localTime, ENTER_END);
	const plateY = inExit ? exitT * 36 : (1 - plateInT) * 36;
	const plateOpacity = inExit ? 1 - exitT : plateInT;

	// Accent bar: grows width in with slight overshoot, shrinks out.
	const barInT = pop(localTime, BAR_END);
	const barScaleIn = clamp(barInT, 0, 1);
	const barScale = inExit ? 1 - exitT : barScaleIn;

	// Name: staggered slide/fade in, exits with the plate.
	const nameInT =
		localTime < NAME_START ? 0 : enter(localTime - NAME_START, NAME_END - NAME_START);
	const nameOpacity = inExit ? 1 - exitT : nameInT;
	const nameY = inExit ? exitT * 14 : (1 - nameInT) * 14;

	// Title (both lines move as one unit): staggered further, exits with the plate.
	const titleInT =
		localTime < TITLE_START ? 0 : enter(localTime - TITLE_START, TITLE_END - TITLE_START);
	const titleOpacity = inExit ? 1 - exitT : titleInT;
	const titleY = inExit ? exitT * 14 : (1 - titleInT) * 14;

	const titleLineStyle: React.CSSProperties = {
		fontFamily: TITLE_FONT_FAMILY,
		fontWeight: 400,
		fontSize: TITLE_SIZE,
		color: "#FFFFFF",
		letterSpacing: "0.01em",
		lineHeight: TITLE_LINE_HEIGHT,
		whiteSpace: "nowrap",
	};

	return (
		<AbsoluteFill>
			<div
				style={{
					position: "absolute",
					left: 96,
					bottom: 90,
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					transform: `translateY(${plateY}px)`,
					opacity: plateOpacity,
				}}
			>
				<div
					style={{
						width: 64,
						height: 5,
						borderRadius: 3,
						background: "#63DF4E",
						marginBottom: 14,
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
						borderRadius: 14,
						boxShadow: "0 12px 32px rgba(3,45,66,0.35)",
						overflow: "hidden",
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
								fontFamily: NAME_FONT_FAMILY,
								fontWeight: 700,
								fontSize: NAME_SIZE,
								color: "#63DF4E",
								letterSpacing: "-0.01em",
								lineHeight: NAME_LINE_HEIGHT,
								opacity: nameOpacity,
								transform: `translateY(${nameY}px)`,
								whiteSpace: "nowrap",
							}}
						>
							{name}
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: LINE_GAP,
								opacity: titleOpacity,
								transform: `translateY(${titleY}px)`,
							}}
						>
							<div style={titleLineStyle}>{title}</div>
							{hasSecondLine ? (
								<div style={titleLineStyle}>{title2}</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
