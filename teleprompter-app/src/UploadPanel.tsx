import React, { useRef, useState } from "react";
import { extractTextFromFile } from "./api";

type Props = {
	pastedText: string;
	onPastedTextChange: (text: string) => void;
	onFormatted: (rawText: string) => void;
};

export const UploadPanel: React.FC<Props> = ({ pastedText, onPastedTextChange, onFormatted }) => {
	const [isReadingFile, setIsReadingFile] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = async (file: File) => {
		setIsReadingFile(true);
		setError(null);
		try {
			const text = await extractTextFromFile(file);
			onFormatted(text);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsReadingFile(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	return (
		<div className="app">
			<header className="app-header">
				<h1 className="display">Teleprompter Formatter</h1>
				<p>
					Upload a talk track — <code>.txt</code>, <code>.docx</code>, or{" "}
					<code>.pdf</code> — or paste it in below. It comes back as a
					full-screen, scrollable teleprompter view in a large readable font
					with proper spacing, plus a formatted download.
				</p>
			</header>

			<section className="roster-input">
				<label htmlFor="file-input">Upload a file</label>
				<input
					id="file-input"
					ref={fileInputRef}
					type="file"
					accept=".txt,.md,.docx,.pdf"
					disabled={isReadingFile}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void handleFile(file);
					}}
				/>
				{isReadingFile ? <span className="output-dir-hint">Reading file…</span> : null}
				{error ? <span className="output-dir-hint output-dir-error">{error}</span> : null}
			</section>

			<section className="roster-input">
				<label htmlFor="paste-input">…or paste text</label>
				<textarea
					id="paste-input"
					rows={10}
					value={pastedText}
					onChange={(e) => onPastedTextChange(e.target.value)}
					placeholder="Paste your script here"
				/>
				<div className="roster-input-actions">
					<button
						type="button"
						className="primary"
						disabled={!pastedText.trim()}
						onClick={() => onFormatted(pastedText)}
					>
						Format &amp; view
					</button>
					<button
						type="button"
						className="ghost"
						disabled={!pastedText.trim()}
						onClick={() => onPastedTextChange("")}
					>
						Clear
					</button>
				</div>
			</section>
		</div>
	);
};
