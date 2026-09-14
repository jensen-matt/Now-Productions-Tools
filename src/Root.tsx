import React from "react";
import { Composition } from "remotion";
import { DURATION_FRAMES, FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./config";
import { LowerThird } from "./LowerThird";
import { OutroCard } from "./OutroCard";
import { QuoteCard } from "./QuoteCard";
import {
	lowerThirdSchema,
	outroCardSchema,
	quoteCardSchema,
	titleCardSchema,
} from "./schema";
import { TitleCard } from "./TitleCard";

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="LowerThird"
				component={LowerThird}
				durationInFrames={DURATION_FRAMES}
				fps={FPS}
				width={VIDEO_WIDTH}
				height={VIDEO_HEIGHT}
				schema={lowerThirdSchema}
				defaultProps={{
					name: "Matt Jensen",
					title: "Associate Technical Producer",
					title2: "",
					width: undefined,
				}}
			/>
			<Composition
				id="TitleCard"
				component={TitleCard}
				durationInFrames={DURATION_FRAMES}
				fps={FPS}
				width={VIDEO_WIDTH}
				height={VIDEO_HEIGHT}
				schema={titleCardSchema}
				defaultProps={{
					title: "2026 Now Assist Roadmap",
					subtitle: "Producer Sync — Q3 Keynote",
				}}
			/>
			<Composition
				id="OutroCard"
				component={OutroCard}
				durationInFrames={DURATION_FRAMES}
				fps={FPS}
				width={VIDEO_WIDTH}
				height={VIDEO_HEIGHT}
				schema={outroCardSchema}
				defaultProps={{
					heading: "Thanks for Watching",
					subtext: "nowproductions@servicenow.com",
				}}
			/>
			<Composition
				id="QuoteCard"
				component={QuoteCard}
				durationInFrames={DURATION_FRAMES}
				fps={FPS}
				width={VIDEO_WIDTH}
				height={VIDEO_HEIGHT}
				schema={quoteCardSchema}
				defaultProps={{
					quote: "Great production is invisible — the audience only notices when it's missing.",
					name: "Matt Jensen",
					title: "Associate Technical Producer",
				}}
			/>
		</>
	);
};
