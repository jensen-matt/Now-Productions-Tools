import React, { useRef, useState } from "react";
import { chooseFolder, renderEntry } from "./api";
import { Card } from "./Card";
import { parseRoster } from "./parseRoster";
import type { Entry } from "./types";

export const App: React.FC = () => {
	const [rosterText, setRosterText] = useState("");
	const [entries, setEntries] = useState<Entry[]>([]);
	const [outputDir, setOutputDir] = useState("out");
	const [folderPickerError, setFolderPickerError] = useState<string | null>(null);
	const [isChoosingFolder, setIsChoosingFolder] = useState(false);
	const [isRenderingAll, setIsRenderingAll] = useState(false);
	const entriesRef = useRef<Entry[]>(entries);
	entriesRef.current = entries;

	const handleGenerate = () => {
		const parsed = parseRoster(rosterText);
		if (parsed.length === 0) return;
		setEntries((prev) => [...prev, ...parsed]);
		setRosterText("");
	};

	const handleChange = (id: string, patch: Partial<Entry>) => {
		setEntries((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
		);
	};

	const handleRemove = (id: string) => {
		setEntries((prev) => prev.filter((entry) => entry.id !== id));
	};

	const runRender = async (id: string) => {
		const entry = entriesRef.current.find((e) => e.id === id);
		if (!entry) return;

		handleChange(id, { status: "rendering", progress: 0, errorMessage: undefined });
		try {
			const outputPath = await renderEntry(
				entry,
				outputDir.trim() || "out",
				(progress) => handleChange(id, { progress }),
			);
			handleChange(id, { status: "done", progress: 1, outputPath });
		} catch (err) {
			handleChange(id, {
				status: "error",
				errorMessage: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleChooseFolder = async () => {
		setIsChoosingFolder(true);
		setFolderPickerError(null);
		try {
			const path = await chooseFolder();
			if (path) setOutputDir(path);
		} catch (err) {
			setFolderPickerError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsChoosingFolder(false);
		}
	};

	const handleRenderAll = async () => {
		setIsRenderingAll(true);
		for (const entry of entries) {
			if (!entry.name.trim() || !entry.title.trim()) continue;
			await runRender(entry.id);
		}
		setIsRenderingAll(false);
	};

	return (
		<div>
			<nav className="topbar">
				<span className="brand-mark">
					<span className="glyph" aria-hidden="true"></span>
					<span className="word">servicenow</span>
				</span>
				<div className="topbar-right">
					<span className="topbar-tool mono">Lower Third Generator</span>
					<a className="back-link" href="/">
						← All tools
					</a>
				</div>
			</nav>

			<div className="app">
				<header className="app-header">
					<h1 className="display">Lower Third Generator</h1>
				<p>
					Paste one person per line as <code>Name, Title</code> — only the
					first comma splits name from title, so titles with their own commas
					(e.g. "Sr. Director, Product Marketing") stay intact. Generate a
					card per line, then edit any field — including adding a second
					title line — before you render.
				</p>
			</header>

			<section className="roster-input">
				<label htmlFor="roster">Enter details</label>
				<textarea
					id="roster"
					placeholder={
						"Matt Jensen, Associate Technical Producer\nAda Lovelace, Chief Analytical Engine Officer"
					}
					value={rosterText}
					onChange={(e) => setRosterText(e.target.value)}
					rows={4}
				/>
				<button type="button" className="primary" onClick={handleGenerate}>
					Generate
				</button>
			</section>

			{entries.length > 0 ? (
				<section className="roster-actions">
					<div className="output-dir-field">
						<label htmlFor="outputDir">Save to folder</label>
						<div className="output-dir-controls">
							<input
								id="outputDir"
								type="text"
								value={outputDir}
								onChange={(e) => setOutputDir(e.target.value)}
								placeholder="out"
							/>
							<button
								type="button"
								disabled={isChoosingFolder}
								onClick={handleChooseFolder}
							>
								{isChoosingFolder ? "Choosing…" : "Choose folder…"}
							</button>
						</div>
					</div>
					{folderPickerError ? (
						<span className="output-dir-hint output-dir-error">
							{folderPickerError} — you can still type a path directly.
						</span>
					) : (
						<span className="output-dir-hint">
							Click "Choose folder…" to pick with Finder, or type a path —
							relative paths resolve inside the project, absolute paths (e.g.
							/Users/you/Movies/LowerThirds) save anywhere else.
						</span>
					)}
					<button
						type="button"
						className="primary"
						disabled={isRenderingAll}
						onClick={handleRenderAll}
					>
						{isRenderingAll ? "Rendering all…" : `Render all (${entries.length})`}
					</button>
				</section>
			) : null}

			<section className="cards">
				{entries.map((entry) => (
					<Card
						key={entry.id}
						entry={entry}
						onChange={handleChange}
						onRemove={handleRemove}
						onRender={runRender}
					/>
				))}
			</section>
			</div>
		</div>
	);
};
