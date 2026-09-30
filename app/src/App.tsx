import React, { useRef, useState } from "react";
import { renderEntry, saveRender, saveZip, type RenderResult } from "./api";
import { Card } from "./Card";
import { parseRoster } from "./parseRoster";
import type { Entry } from "./types";

export const App: React.FC = () => {
	const [rosterText, setRosterText] = useState("");
	const [entries, setEntries] = useState<Entry[]>([]);
	const [allPhase, setAllPhase] = useState<"idle" | "rendering" | "saving">("idle");
	const [zipError, setZipError] = useState<string | null>(null);
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

	// Renders, then immediately saves — one click, one combined action. The
	// save dialog fires right in this same handler so it's still within the
	// gesture from the click that started it.
	const runRenderAndSave = async (id: string): Promise<RenderResult | undefined> => {
		const entry = entriesRef.current.find((e) => e.id === id);
		if (!entry) return undefined;

		handleChange(id, { status: "rendering", progress: 0, errorMessage: undefined });
		let result: RenderResult;
		try {
			result = await renderEntry(entry, (progress) => handleChange(id, { progress }));
		} catch (err) {
			handleChange(id, {
				status: "error",
				errorMessage: err instanceof Error ? err.message : String(err),
			});
			return undefined;
		}

		handleChange(id, { status: "saving", progress: 1, token: result.token, filename: result.filename });
		try {
			await saveRender(result.token, result.filename);
			handleChange(id, { status: "saved" });
		} catch (err) {
			handleChange(id, {
				status: "error",
				errorMessage: err instanceof Error ? err.message : String(err),
			});
			return undefined;
		}
		return result;
	};

	// Renders every entry, then saves them all as one zip — same
	// render-then-save shape as a single card, just batched.
	const handleRenderAndSaveAll = async () => {
		setZipError(null);
		setAllPhase("rendering");
		const rendered: RenderResult[] = [];
		for (const entry of entries) {
			if (!entry.name.trim() || !entry.title.trim()) continue;
			handleChange(entry.id, { status: "rendering", progress: 0, errorMessage: undefined });
			try {
				const result = await renderEntry(entry, (progress) => handleChange(entry.id, { progress }));
				handleChange(entry.id, {
					status: "done",
					progress: 1,
					token: result.token,
					filename: result.filename,
				});
				rendered.push(result);
			} catch (err) {
				handleChange(entry.id, {
					status: "error",
					errorMessage: err instanceof Error ? err.message : String(err),
				});
			}
		}

		if (rendered.length > 0) {
			setAllPhase("saving");
			try {
				await saveZip(rendered.map((r) => r.token), "lower-thirds.zip");
				for (const r of rendered) {
					const entry = entriesRef.current.find((e) => e.token === r.token);
					if (entry) handleChange(entry.id, { status: "saved" });
				}
			} catch (err) {
				setZipError(err instanceof Error ? err.message : String(err));
			}
		}
		setAllPhase("idle");
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
					placeholder={"John Smith, Chief Executive Officer"}
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
					<button
						type="button"
						className="primary"
						disabled={allPhase !== "idle"}
						onClick={handleRenderAndSaveAll}
					>
						{allPhase === "rendering"
							? "Rendering all…"
							: allPhase === "saving"
								? "Saving…"
								: `Render & save all (${entries.length})…`}
					</button>
					{zipError ? <span className="output-dir-hint output-dir-error">{zipError}</span> : null}
				</section>
			) : null}

			<section className="cards">
				{entries.map((entry) => (
					<Card
						key={entry.id}
						entry={entry}
						onChange={handleChange}
						onRemove={handleRemove}
						onRender={runRenderAndSave}
					/>
				))}
			</section>
			</div>
		</div>
	);
};
