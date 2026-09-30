import React, { useRef, useState } from "react";
import { renderGraphic, saveRender, saveZip, type RenderResult } from "./api";
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
	const [allPhase, setAllPhase] = useState<"idle" | "rendering" | "saving">("idle");
	const [zipError, setZipError] = useState<string | null>(null);
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

	// Renders, then immediately saves — one click, one combined action. The
	// save dialog fires right in this same handler so it's still within the
	// gesture from the click that started it.
	const runRenderAndSave = async (id: string): Promise<RenderResult | undefined> => {
		const entry = entriesRef.current.find((e) => e.id === id);
		if (!entry) return undefined;

		setEntries((prev) =>
			prev.map((e) =>
				e.id === id ? { ...e, status: "rendering", progress: 0, errorMessage: undefined } : e,
			),
		);
		let result: RenderResult;
		try {
			result = await renderGraphic(entry, (progress) =>
				setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, progress } : e))),
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
			return undefined;
		}

		setEntries((prev) =>
			prev.map((e) =>
				e.id === id
					? { ...e, status: "saving", progress: 1, token: result.token, filename: result.filename }
					: e,
			),
		);
		try {
			await saveRender(result.token, result.filename);
			setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "saved" } : e)));
		} catch (err) {
			setEntries((prev) =>
				prev.map((e) =>
					e.id === id
						? { ...e, status: "error", errorMessage: err instanceof Error ? err.message : String(err) }
						: e,
				),
			);
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
			if (!isRenderable(entry)) continue;
			setEntries((prev) =>
				prev.map((e) =>
					e.id === entry.id ? { ...e, status: "rendering", progress: 0, errorMessage: undefined } : e,
				),
			);
			try {
				const result = await renderGraphic(entry, (progress) =>
					setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, progress } : e))),
				);
				setEntries((prev) =>
					prev.map((e) =>
						e.id === entry.id
							? { ...e, status: "done", progress: 1, token: result.token, filename: result.filename }
							: e,
					),
				);
				rendered.push(result);
			} catch (err) {
				setEntries((prev) =>
					prev.map((e) =>
						e.id === entry.id
							? { ...e, status: "error", errorMessage: err instanceof Error ? err.message : String(err) }
							: e,
					),
				);
			}
		}

		if (rendered.length > 0) {
			setAllPhase("saving");
			try {
				await saveZip(rendered.map((r) => r.token), "graphics.zip");
				const tokens = new Set(rendered.map((r) => r.token));
				setEntries((prev) =>
					prev.map((e) => (e.token && tokens.has(e.token) ? { ...e, status: "saved" } : e)),
				);
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
