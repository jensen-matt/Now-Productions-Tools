import { Player } from "@remotion/player";
import React from "react";
import { DURATION_FRAMES, FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../../src/config";
import { OutroCard } from "../../src/OutroCard";
import { QuoteCard } from "../../src/QuoteCard";
import { TitleCard } from "../../src/TitleCard";
import { KIND_LABELS, isRenderable, type GraphicEntry } from "./types";

type CardProps = {
	entry: GraphicEntry;
	onChange: (id: string, patch: Record<string, string>) => void;
	onRemove: (id: string) => void;
	onRender: (id: string) => void;
};

const PLAYER_PROPS = {
	durationInFrames: DURATION_FRAMES,
	fps: FPS,
	compositionWidth: VIDEO_WIDTH,
	compositionHeight: VIDEO_HEIGHT,
	style: { width: "100%" },
	controls: true,
	loop: true,
	initialFrame: 90,
} as const;

export const Card: React.FC<CardProps> = ({ entry, onChange, onRemove, onRender }) => {
	return (
		<div className="card">
			<div className="card-preview">
				{entry.kind === "title" ? (
					<Player component={TitleCard} inputProps={entry.fields} {...PLAYER_PROPS} />
				) : entry.kind === "outro" ? (
					<Player component={OutroCard} inputProps={entry.fields} {...PLAYER_PROPS} />
				) : (
					<Player component={QuoteCard} inputProps={entry.fields} {...PLAYER_PROPS} />
				)}
			</div>

			<div className="card-fields">
				<span className="card-kind mono">{KIND_LABELS[entry.kind]}</span>

				{entry.kind === "title" ? (
					<>
						<label>
							Title
							<input
								type="text"
								value={entry.fields.title}
								onChange={(e) => onChange(entry.id, { title: e.target.value })}
							/>
						</label>
						<label>
							Subtitle (optional)
							<input
								type="text"
								value={entry.fields.subtitle}
								onChange={(e) => onChange(entry.id, { subtitle: e.target.value })}
							/>
						</label>
					</>
				) : null}

				{entry.kind === "outro" ? (
					<>
						<label>
							Heading
							<input
								type="text"
								value={entry.fields.heading}
								onChange={(e) => onChange(entry.id, { heading: e.target.value })}
							/>
						</label>
						<label>
							Subtext (optional)
							<input
								type="text"
								value={entry.fields.subtext}
								onChange={(e) => onChange(entry.id, { subtext: e.target.value })}
							/>
						</label>
					</>
				) : null}

				{entry.kind === "quote" ? (
					<>
						<label>
							Quote
							<textarea
								rows={3}
								value={entry.fields.quote}
								onChange={(e) => onChange(entry.id, { quote: e.target.value })}
							/>
						</label>
						<label>
							Attribution name (optional)
							<input
								type="text"
								value={entry.fields.name}
								onChange={(e) => onChange(entry.id, { name: e.target.value })}
							/>
						</label>
						<label>
							Attribution title (optional)
							<input
								type="text"
								value={entry.fields.title}
								onChange={(e) => onChange(entry.id, { title: e.target.value })}
							/>
						</label>
					</>
				) : null}
			</div>

			<div className="card-actions">
				<button
					type="button"
					className="primary"
					disabled={entry.status === "rendering" || entry.status === "saving" || !isRenderable(entry)}
					onClick={() => onRender(entry.id)}
				>
					{entry.status === "rendering"
						? `Rendering… ${Math.round(entry.progress * 100)}%`
						: entry.status === "saving"
							? "Saving…"
							: entry.status === "done" || entry.status === "saved"
								? "Re-render & save…"
								: "Render & save…"}
				</button>
				<button type="button" className="ghost" onClick={() => onRemove(entry.id)}>
					Remove
				</button>
			</div>

			{entry.status === "rendering" ? (
				<div className="progress-bar">
					<div className="progress-bar-fill" style={{ width: `${entry.progress * 100}%` }} />
				</div>
			) : null}

			{entry.status === "done" ? (
				<div className="status status-done">Rendered — saving as part of the batch…</div>
			) : null}
			{entry.status === "saved" ? <div className="status status-done">Saved.</div> : null}
			{entry.status === "error" ? (
				<div className="status status-error">{entry.errorMessage}</div>
			) : null}
		</div>
	);
};
