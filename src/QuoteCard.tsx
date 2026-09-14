import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandCardBackground } from "./BrandCardBackground";
import { clamp } from "./easing";
import type { QuoteCardProps } from "./schema";
import { enter, exit, pop } from "./timelineHelpers";

const { fontFamily: interFamily } = loadFont("normal", {
	weights: ["400", "700"],
	subsets: ["latin"],
});
const QUOTE_FONT_FAMILY = `"ServiceNow Sans Display", "ServiceNow Sans", ${interFamily}, sans-serif`;
const ATTRIBUTION_FONT_FAMILY = `"ServiceNow Sans", ${interFamily}, sans-serif`;

const BAR_END = 0.45;
const QUOTE_START = 0.12;
const QUOTE_END = 0.62;
const ATTRIBUTION_START = 0.34;
const ATTRIBUTION_END = 0.82;
const EXIT_DUR = 0.8;

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, name, title }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const localTime = frame / fps;
	const dur = durationInFrames / fps;
	const exitStart = dur - EXIT_DUR;

	const inExit = localTime > exitStart;
	const exitT = inExit ? exit(localTime, exitStart, EXIT_DUR) : 0;

	const barInT = pop(localTime, BAR_END);
	const barScale = inExit ? 1 - exitT : clamp(barInT, 0, 1);

	const quoteInT =
		localTime < QUOTE_START ? 0 : enter(localTime - QUOTE_START, QUOTE_END - QUOTE_START);
	const quoteOpacity = inExit ? 1 - exitT : quoteInT;
	const quoteY = inExit ? exitT * 18 : (1 - quoteInT) * 18;

	const attributionInT =
		localTime < ATTRIBUTION_START
			? 0
			: enter(localTime - ATTRIBUTION_START, ATTRIBUTION_END - ATTRIBUTION_START);
	const attributionOpacity = inExit ? 1 - exitT : attributionInT;
	const attributionY = inExit ? exitT * 14 : (1 - attributionInT) * 14;

	const hasName = name.trim().length > 0;
	const hasTitle = title.trim().length > 0;
	const hasAttribution = hasName || hasTitle;

	return (
		<AbsoluteFill>
			<BrandCardBackground />
			<AbsoluteFill style={{ zIndex: 2, alignItems: "center", justifyContent: "center" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						maxWidth: 1500,
						padding: "0 96px",
					}}
				>
					<div
						style={{
							width: 64,
							height: 5,
							borderRadius: 3,
							background: "#63DF4E",
							marginBottom: 32,
							transform: `scaleX(${barScale})`,
							transformOrigin: "center",
						}}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "flex-start",
							gap: 20,
							opacity: quoteOpacity,
							transform: `translateY(${quoteY}px)`,
						}}
					>
						<div
							style={{
								fontFamily: QUOTE_FONT_FAMILY,
								fontWeight: 700,
								fontSize: 96,
								lineHeight: 1,
								color: "#63DF4E",
								marginTop: -8,
							}}
						>
							&ldquo;
						</div>
						<div
							style={{
								fontFamily: QUOTE_FONT_FAMILY,
								fontWeight: 400,
								fontSize: 52,
								lineHeight: 1.3,
								color: "#FFFFFF",
								textAlign: "left",
								whiteSpace: "pre-wrap",
							}}
						>
							{quote}
						</div>
					</div>
					{hasAttribution ? (
						<div
							style={{
								marginTop: 36,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								opacity: attributionOpacity,
								transform: `translateY(${attributionY}px)`,
							}}
						>
							{hasName ? (
								<div
									style={{
										fontFamily: ATTRIBUTION_FONT_FAMILY,
										fontWeight: 700,
										fontSize: 30,
										color: "#63DF4E",
										letterSpacing: "-0.01em",
									}}
								>
									{name}
								</div>
							) : null}
							{hasTitle ? (
								<div
									style={{
										fontFamily: ATTRIBUTION_FONT_FAMILY,
										fontWeight: 400,
										fontSize: 22,
										color: "#FFFFFF",
										marginTop: 4,
									}}
								>
									{title}
								</div>
							) : null}
						</div>
					) : null}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
