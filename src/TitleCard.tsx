import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandCardBackground } from "./BrandCardBackground";
import { clamp } from "./easing";
import type { TitleCardProps } from "./schema";
import { enter, exit, pop } from "./timelineHelpers";

// Substitute for "ServiceNow Sans Display" / "ServiceNow Sans" — see
// LowerThird.tsx for the full rationale; same fallback stack, same brand
// animation signature (bar pop-in, staggered fade/slide, reverse exit).
const { fontFamily: interFamily } = loadFont("normal", {
	weights: ["400", "700"],
	subsets: ["latin"],
});
const HEADING_FONT_FAMILY = `"ServiceNow Sans Display", "ServiceNow Sans", ${interFamily}, sans-serif`;
const SUB_FONT_FAMILY = `"ServiceNow Sans", ${interFamily}, sans-serif`;

const BAR_END = 0.45;
const TITLE_START = 0.12;
const TITLE_END = 0.62;
const SUBTITLE_START = 0.26;
const SUBTITLE_END = 0.74;
const EXIT_DUR = 0.8;

export const TitleCard: React.FC<TitleCardProps> = ({ title, subtitle }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const localTime = frame / fps;
	const dur = durationInFrames / fps;
	const exitStart = dur - EXIT_DUR;

	const inExit = localTime > exitStart;
	const exitT = inExit ? exit(localTime, exitStart, EXIT_DUR) : 0;

	const barInT = pop(localTime, BAR_END);
	const barScale = inExit ? 1 - exitT : clamp(barInT, 0, 1);

	const titleInT =
		localTime < TITLE_START ? 0 : enter(localTime - TITLE_START, TITLE_END - TITLE_START);
	const titleOpacity = inExit ? 1 - exitT : titleInT;
	const titleY = inExit ? exitT * 18 : (1 - titleInT) * 18;

	const subtitleInT =
		localTime < SUBTITLE_START
			? 0
			: enter(localTime - SUBTITLE_START, SUBTITLE_END - SUBTITLE_START);
	const subtitleOpacity = inExit ? 1 - exitT : subtitleInT;
	const subtitleY = inExit ? exitT * 16 : (1 - subtitleInT) * 16;

	const hasSubtitle = subtitle.trim().length > 0;

	return (
		<AbsoluteFill>
			<BrandCardBackground />
			<AbsoluteFill style={{ zIndex: 2, alignItems: "center", justifyContent: "center" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						maxWidth: 1600,
						padding: "0 80px",
					}}
				>
					<div
						style={{
							width: 88,
							height: 6,
							borderRadius: 3,
							background: "#63DF4E",
							marginBottom: 28,
							transform: `scaleX(${barScale})`,
							transformOrigin: "center",
						}}
					/>
					<div
						style={{
							fontFamily: HEADING_FONT_FAMILY,
							fontWeight: 700,
							fontSize: 72,
							lineHeight: 1.15,
							color: "#63DF4E",
							letterSpacing: "-0.01em",
							textAlign: "center",
							opacity: titleOpacity,
							transform: `translateY(${titleY}px)`,
						}}
					>
						{title}
					</div>
					{hasSubtitle ? (
						<div
							style={{
								fontFamily: SUB_FONT_FAMILY,
								fontWeight: 400,
								fontSize: 30,
								lineHeight: 1.4,
								color: "#FFFFFF",
								marginTop: 18,
								textAlign: "center",
								opacity: subtitleOpacity,
								transform: `translateY(${subtitleY}px)`,
							}}
						>
							{subtitle}
						</div>
					) : null}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
