import { Player } from "@remotion/player";
import React from "react";
import { LowerThird } from "../../src/LowerThird";
import { DURATION_FRAMES, FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../../src/config";
import type { Entry } from "./types";

type CardProps = {
	entry: Entry;
	onChange: (id: string, patch: Partial<Entry>) => void;
	onRemove: (id: string) => void;
	onRender: (id: string) => void;
};

export const Card: React.FC<CardProps> = ({
	entry,
	onChange,
	onRemove,
	onRender,
}) => {
	const inputProps = {
		name: entry.name,
		title: entry.title,
		title2: entry.hasTitle2 ? entry.title2 : "",
		width: entry.hasCustomWidth ? entry.width : undefined,
	};

	return (
		<div className="card">
			<div className="card-preview">
				<Player
					component={LowerThird}
					inputProps={inputProps}
					durationInFrames={DURATION_FRAMES}
					fps={FPS}
					compositionWidth={VIDEO_WIDTH}
					compositionHeight={VIDEO_HEIGHT}
					style={{ width: "100%" }}
					controls
					loop
					initialFrame={90}
				/>
			</div>

			<div className="card-fields">
				<label>
					Name
					<input
						type="text"
						value={entry.name}
						onChange={(e) => onChange(entry.id, { name: e.target.value })}
					/>
				</label>

				<label>
					Title
					<input
						type="text"
						value={entry.title}
						onChange={(e) => onChange(entry.id, { title: e.target.value })}
					/>
				</label>

				<label className="checkbox-row">
					<input
						type="checkbox"
						checked={entry.hasTitle2}
						onChange={(e) =>
							onChange(entry.id, { hasTitle2: e.target.checked })
						}
					/>
					Add second title line
				</label>
				{entry.hasTitle2 ? (
					<label>
						Second title line
						<input
							type="text"
							value={entry.title2}
							onChange={(e) =>
								onChange(entry.id, { title2: e.target.value })
							}
						/>
					</label>
				) : null}

				<label className="checkbox-row">
					<input
						type="checkbox"
						checked={entry.hasCustomWidth}
						onChange={(e) =>
							onChange(entry.id, { hasCustomWidth: e.target.checked })
						}
					/>
					Custom width (px)
				</label>
				{entry.hasCustomWidth ? (
					<label>
						Width
						<input
							type="number"
							min={200}
							max={1700}
							value={entry.width}
							onChange={(e) =>
								onChange(entry.id, { width: Number(e.target.value) })
							}
						/>
					</label>
				) : null}
			</div>

			<div className="card-actions">
				<button
					type="button"
					className="primary"
					disabled={
						entry.status === "rendering" ||
						!entry.name.trim() ||
						!entry.title.trim()
					}
					onClick={() => onRender(entry.id)}
				>
					{entry.status === "rendering"
						? `Rendering… ${Math.round(entry.progress * 100)}%`
						: entry.status === "done"
							? "Re-render"
							: "Render"}
				</button>
				<button
					type="button"
					className="ghost"
					onClick={() => onRemove(entry.id)}
				>
					Remove
				</button>
			</div>

			{entry.status === "rendering" ? (
				<div className="progress-bar">
					<div
						className="progress-bar-fill"
						style={{ width: `${entry.progress * 100}%` }}
					/>
				</div>
			) : null}

			{entry.status === "done" ? (
				<div className="status status-done">Saved to {entry.outputPath}</div>
			) : null}
			{entry.status === "error" ? (
				<div className="status status-error">{entry.errorMessage}</div>
			) : null}
		</div>
	);
};
