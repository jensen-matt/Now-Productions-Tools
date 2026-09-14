import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandCardBackground } from "./BrandCardBackground";
import { clamp } from "./easing";
import type { OutroCardProps } from "./schema";
import { enter, exit, pop } from "./timelineHelpers";

const { fontFamily: interFamily } = loadFont("normal", {
	weights: ["400", "700"],
	subsets: ["latin"],
});
const HEADING_FONT_FAMILY = `"ServiceNow Sans Display", "ServiceNow Sans", ${interFamily}, sans-serif`;
const SUB_FONT_FAMILY = `"ServiceNow Sans", ${interFamily}, sans-serif`;

const BAR_END = 0.45;
const HEADING_START = 0.12;
const HEADING_END = 0.62;
const SUBTEXT_START = 0.26;
const SUBTEXT_END = 0.74;
const EXIT_DUR = 0.8;

export const OutroCard: React.FC<OutroCardProps> = ({ heading, subtext }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const localTime = frame / fps;
	const dur = durationInFrames / fps;
	const exitStart = dur - EXIT_DUR;

	const inExit = localTime > exitStart;
	const exitT = inExit ? exit(localTime, exitStart, EXIT_DUR) : 0;

	const barInT = pop(localTime, BAR_END);
	const barScale = inExit ? 1 - exitT : clamp(barInT, 0, 1);

	const headingInT =
		localTime < HEADING_START ? 0 : enter(localTime - HEADING_START, HEADING_END - HEADING_START);
	const headingOpacity = inExit ? 1 - exitT : headingInT;
	const headingY = inExit ? exitT * 18 : (1 - headingInT) * 18;

	const subtextInT =
		localTime < SUBTEXT_START
			? 0
			: enter(localTime - SUBTEXT_START, SUBTEXT_END - SUBTEXT_START);
	const subtextOpacity = inExit ? 1 - exitT : subtextInT;
	const subtextY = inExit ? exitT * 16 : (1 - subtextInT) * 16;

	const hasSubtext = subtext.trim().length > 0;

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
							fontSize: 64,
							lineHeight: 1.15,
							color: "#63DF4E",
							letterSpacing: "-0.01em",
							textAlign: "center",
							opacity: headingOpacity,
							transform: `translateY(${headingY}px)`,
						}}
					>
						{heading}
					</div>
					{hasSubtext ? (
						<div
							style={{
								fontFamily: SUB_FONT_FAMILY,
								fontWeight: 400,
								fontSize: 28,
								lineHeight: 1.4,
								color: "#FFFFFF",
								marginTop: 18,
								textAlign: "center",
								opacity: subtextOpacity,
								transform: `translateY(${subtextY}px)`,
							}}
						>
							{subtext}
						</div>
					) : null}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
