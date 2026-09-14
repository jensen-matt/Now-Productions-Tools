import React, { useRef, useState } from "react";
import { chooseFolder, renderGraphic } from "./api";
import { Card } from "./Card";
import {
	createEntry,
	isRenderable,
	KIND_LABELS,
	type GraphicEntry,
	type GraphicKind,
} from "./types";

const KINDS: GraphicKind[] = ["title", "outro", "quote"];

export const App: React.FC = () => {
	const [entries, setEntries] = useState<GraphicEntry[]>([]);
	const [outputDir, setOutputDir] = useState("out");
	const [folderPickerError, setFolderPickerError] = useState<string | null>(null);
	const [isChoosingFolder, setIsChoosingFolder] = useState(false);
	const [isRenderingAll, setIsRenderingAll] = useState(false);
	const entriesRef = useRef<GraphicEntry[]>(entries);
	entriesRef.current = entries;

	const handleAdd = (kind: GraphicKind) => {
		setEntries((prev) => [...prev, createEntry(kind)]);
	};

	const handleChange = (id: string, patch: Record<string, string>) => {
		setEntries((prev) =>
			prev.map((entry) =>
				entry.id === id
					? ({ ...entry, fields: { ...entry.fields, ...patch } } as GraphicEntry)
					: entry,
			),
		);
	};

	const handleRemove = (id: string) => {
		setEntries((prev) => prev.filter((entry) => entry.id !== id));
	};

	const runRender = async (id: string) => {
		const entry = entriesRef.current.find((e) => e.id === id);
		if (!entry) return;

		setEntries((prev) =>
			prev.map((e) =>
				e.id === id ? { ...e, status: "rendering", progress: 0, errorMessage: undefined } : e,
			),
		);
		try {
			const outputPath = await renderGraphic(entry, outputDir.trim() || "out", (progress) =>
				setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, progress } : e))),
			);
			setEntries((prev) =>
				prev.map((e) => (e.id === id ? { ...e, status: "done", progress: 1, outputPath } : e)),
			);
		} catch (err) {
			setEntries((prev) =>
				prev.map((e) =>
					e.id === id
						? {
								...e,
								status: "error",
								errorMessage: err instanceof Error ? err.message : String(err),
							}
						: e,
				),
			);
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
			if (!isRenderable(entry)) continue;
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
					<span className="topbar-tool mono">Graphics Generator</span>
					<a className="back-link" href="/">
						← All tools
					</a>
				</div>
			</nav>

			<div className="app">
				<header className="app-header">
					<h1 className="display">Graphics Generator</h1>
					<p>
						Title cards, outro cards, and quote cards — one batch tool for the
						three full-frame brand graphics. Add a card of whichever kind you
						need, fill in its fields, then render.
					</p>
				</header>

				<section className="roster-input">
					<label>Add a card</label>
					<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						{KINDS.map((kind) => (
							<button key={kind} type="button" onClick={() => handleAdd(kind)}>
								+ {KIND_LABELS[kind]}
							</button>
						))}
					</div>
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
								/Users/you/Movies/Graphics) save anywhere else.
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
