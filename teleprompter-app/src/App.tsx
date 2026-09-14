import React, { useState } from "react";
import { formatTalkTrack } from "./formatText";
import { TeleprompterView } from "./TeleprompterView";
import { UploadPanel } from "./UploadPanel";

export const App: React.FC = () => {
	const [paragraphs, setParagraphs] = useState<string[] | null>(null);
	const [pastedText, setPastedText] = useState("");

	if (paragraphs) {
		return (
			<TeleprompterView
				paragraphs={paragraphs}
				onExit={(editedParagraphs) => {
					setPastedText(editedParagraphs.join("\n\n"));
					setParagraphs(null);
				}}
			/>
		);
	}

	return (
		<div>
			<nav className="topbar">
				<span className="brand-mark">
					<span className="glyph" aria-hidden="true"></span>
					<span className="word">servicenow</span>
				</span>
				<div className="topbar-right">
					<span className="topbar-tool mono">Teleprompter Formatter</span>
					<a className="back-link" href="/">
						← All tools
					</a>
				</div>
			</nav>

			<UploadPanel
				pastedText={pastedText}
				onPastedTextChange={setPastedText}
				onFormatted={(raw) => setParagraphs(formatTalkTrack(raw))}
			/>
		</div>
	);
};
