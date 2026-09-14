import React, { useEffect, useRef, useState } from "react";
import { downloadTextFile } from "./download";

type Props = {
	paragraphs: string[];
	onExit: (paragraphs: string[]) => void;
};

type Alignment = "left" | "center" | "right";

const MIN_SPEED = 20; // px/sec
const MAX_SPEED = 200;
const SPEED_STEP = 10;
const MIN_FONT_SIZE = 28;
const MAX_FONT_SIZE = 72;
const MIN_LINE_HEIGHT = 1.2;
const MAX_LINE_HEIGHT = 2.6;
const BOOKMARK_TOLERANCE = 20; // px, for dedupe + "am I at a bookmark" checks

const TEXT_COLOR_SWATCHES = ["#ffffff", "#000000", "#ffe066", "#ff6b6b", "#69db7c", "#74c0fc"];
const HIGHLIGHT_SWATCHES = ["#ffe066", "#69db7c", "#74c0fc", "#ff6b6b", "#ffffff"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Arrow-key speed control and single-letter bookmark shortcuts must not
// fire while the user is typing in a form field or editing the script
// text in place — otherwise "b" would insert a bookmark instead of the
// letter, and arrow keys would hijack the text cursor.
const isTextInputContext = (target: EventTarget | null): boolean => {
	const el = target as HTMLElement | null;
	if (!el) return false;
	if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
	return el.isContentEditable;
};

const escapeHtml = (text: string): string =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildInitialHtml = (paragraphs: string[]): string =>
	paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

export const TeleprompterView: React.FC<Props> = ({ paragraphs, onExit }) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(60);
	const [fontSize, setFontSize] = useState(44);
	const [lineHeight, setLineHeight] = useState(1.7);
	const [alignment, setAlignment] = useState<Alignment>("center");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [bookmarks, setBookmarks] = useState<number[]>([]);
	const [initialHtml] = useState(() => buildInitialHtml(paragraphs));

	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const editableRef = useRef<HTMLDivElement>(null);
	const printRef = useRef<HTMLDivElement>(null);
	const selectionRangeRef = useRef<Range | null>(null);
	const frameRef = useRef<number>(0);
	const lastTimeRef = useRef<number>(0);

	useEffect(() => {
		if (!isPlaying) return;

		lastTimeRef.current = performance.now();
		const step = (now: number) => {
			const container = scrollRef.current;
			if (!container) return;
			const dt = (now - lastTimeRef.current) / 1000;
			lastTimeRef.current = now;

			container.scrollTop += speed * dt;
			if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
				setIsPlaying(false);
				return;
			}
			frameRef.current = requestAnimationFrame(step);
		};
		frameRef.current = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frameRef.current);
	}, [isPlaying, speed]);

	useEffect(() => {
		const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	// Force a consistent paragraph element on Enter so exported text can be
	// reconstructed by walking <p> elements regardless of browser defaults.
	useEffect(() => {
		try {
			document.execCommand("defaultParagraphSeparator", false, "p");
		} catch {
			// Unsupported in some browsers; editing still works, just with
			// that browser's default paragraph element.
		}
	}, []);

	// Toolbar buttons steal focus from the editable text, which collapses
	// the browser's selection — so remember the last real selection and
	// restore it before applying a formatting command.
	useEffect(() => {
		const handleSelectionChange = () => {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
			const range = selection.getRangeAt(0);
			if (editableRef.current?.contains(range.commonAncestorContainer)) {
				selectionRangeRef.current = range.cloneRange();
			}
		};
		document.addEventListener("selectionchange", handleSelectionChange);
		return () => document.removeEventListener("selectionchange", handleSelectionChange);
	}, []);

	// Keep the print-only copy in sync right before printing, since the
	// on-screen script is now edited in place rather than passed in fresh.
	useEffect(() => {
		const syncPrintContent = () => {
			if (printRef.current && editableRef.current) {
				printRef.current.innerHTML = editableRef.current.innerHTML;
			}
		};
		window.addEventListener("beforeprint", syncPrintContent);
		return () => window.removeEventListener("beforeprint", syncPrintContent);
	}, []);

	const getCurrentParagraphs = (): string[] => {
		const root = editableRef.current;
		if (!root) return paragraphs;
		const blocks = root.querySelectorAll("p");
		const elements = blocks.length > 0 ? Array.from(blocks) : [root];
		return elements
			.map((el) => (el as HTMLElement).innerText.replace(/[ \t]+/g, " ").trim())
			.filter((text) => text.length > 0);
	};

	const restoreSelection = (): boolean => {
		const range = selectionRangeRef.current;
		const editable = editableRef.current;
		if (!range || !editable) return false;
		editable.focus();
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		return true;
	};

	const applyToSelection = (command: "foreColor" | "hiliteColor" | "removeFormat", value?: string) => {
		if (!restoreSelection()) return;
		document.execCommand("styleWithCSS", false, "true");
		document.execCommand(command, false, value);
	};

	const addBookmark = () => {
		const top = scrollRef.current?.scrollTop ?? 0;
		setBookmarks((prev) => {
			if (prev.some((b) => Math.abs(b - top) < BOOKMARK_TOLERANCE)) return prev;
			return [...prev, top].sort((a, b) => a - b);
		});
	};

	const jumpToBookmark = (top: number) => {
		scrollRef.current?.scrollTo({ top, behavior: "smooth" });
	};

	const jumpToAdjacentBookmark = (direction: "next" | "prev") => {
		const container = scrollRef.current;
		if (!container || bookmarks.length === 0) return;
		const current = container.scrollTop;
		const target =
			direction === "next"
				? bookmarks.find((b) => b > current + BOOKMARK_TOLERANCE)
				: [...bookmarks].reverse().find((b) => b < current - BOOKMARK_TOLERANCE);
		if (target !== undefined) jumpToBookmark(target);
	};

	const removeBookmark = (index: number) => {
		setBookmarks((prev) => prev.filter((_, i) => i !== index));
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && document.activeElement === editableRef.current) {
				editableRef.current?.blur();
				return;
			}

			if (isTextInputContext(e.target)) return;

			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				setSpeed((s) => clamp(s + (e.key === "ArrowUp" ? SPEED_STEP : -SPEED_STEP), MIN_SPEED, MAX_SPEED));
			} else if (e.key === "b" || e.key === "B") {
				addBookmark();
			} else if (e.key === "]") {
				jumpToAdjacentBookmark("next");
			} else if (e.key === "[") {
				jumpToAdjacentBookmark("prev");
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [bookmarks]);

	const handleRestart = () => {
		setIsPlaying(false);
		if (scrollRef.current) scrollRef.current.scrollTop = 0;
	};

	const toggleFullscreen = () => {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void containerRef.current?.requestFullscreen();
		}
	};

	return (
		<div className="teleprompter" ref={containerRef}>
			<div className="teleprompter-scroll" ref={scrollRef}>
				<div
					className="teleprompter-text"
					style={{ fontSize, textAlign: alignment, lineHeight }}
					ref={editableRef}
					contentEditable
					suppressContentEditableWarning
					spellCheck={false}
					title="Click to edit the script in place"
					dangerouslySetInnerHTML={{ __html: initialHtml }}
				/>
			</div>

			<div className="teleprompter-controls">
				<button type="button" className="primary" onClick={() => setIsPlaying((p) => !p)}>
					{isPlaying ? "Pause" : "Play"}
				</button>
				<button type="button" onClick={handleRestart}>
					Restart
				</button>
				<button type="button" onClick={toggleFullscreen}>
					{isFullscreen ? "Exit fullscreen" : "Fullscreen"}
				</button>

				<label
					className="teleprompter-slider"
					title="Also adjustable with the ↑ / ↓ arrow keys (while not editing the script)"
				>
					Speed
					<input
						type="range"
						min={MIN_SPEED}
						max={MAX_SPEED}
						value={speed}
						onChange={(e) => setSpeed(Number(e.target.value))}
					/>
				</label>

				<label className="teleprompter-slider">
					Font size
					<input
						type="range"
						min={MIN_FONT_SIZE}
						max={MAX_FONT_SIZE}
						value={fontSize}
						onChange={(e) => setFontSize(Number(e.target.value))}
					/>
				</label>

				<label className="teleprompter-slider">
					Line spacing
					<input
						type="range"
						min={MIN_LINE_HEIGHT}
						max={MAX_LINE_HEIGHT}
						step={0.1}
						value={lineHeight}
						onChange={(e) => setLineHeight(Number(e.target.value))}
					/>
				</label>

				<label className="teleprompter-select">
					Align
					<select value={alignment} onChange={(e) => setAlignment(e.target.value as Alignment)}>
						<option value="left">Left</option>
						<option value="center">Center</option>
						<option value="right">Right</option>
					</select>
				</label>

				<div className="teleprompter-format-group" title="Select script text, then pick a color">
					<span className="teleprompter-format-label">Selection color</span>
					{TEXT_COLOR_SWATCHES.map((color) => (
						<button
							key={color}
							type="button"
							className="swatch"
							style={{ backgroundColor: color }}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => applyToSelection("foreColor", color)}
							aria-label={`Set selected text color to ${color}`}
						/>
					))}
					<input
						type="color"
						aria-label="Custom selected text color"
						onChange={(e) => applyToSelection("foreColor", e.target.value)}
					/>
				</div>

				<div className="teleprompter-format-group" title="Select script text, then pick a highlight">
					<span className="teleprompter-format-label">Selection highlight</span>
					{HIGHLIGHT_SWATCHES.map((color) => (
						<button
							key={color}
							type="button"
							className="swatch"
							style={{ backgroundColor: color }}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => applyToSelection("hiliteColor", color)}
							aria-label={`Set selected highlight to ${color}`}
						/>
					))}
					<input
						type="color"
						aria-label="Custom selected highlight color"
						onChange={(e) => applyToSelection("hiliteColor", e.target.value)}
					/>
					<button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyToSelection("removeFormat")}>
						Clear formatting
					</button>
				</div>

				<button type="button" onClick={addBookmark} title="Add a bookmark at the current position (B)">
					+ Bookmark
				</button>
				<button
					type="button"
					onClick={() => jumpToAdjacentBookmark("prev")}
					disabled={bookmarks.length === 0}
					title="Jump to previous bookmark ([)"
				>
					◀ Bookmark
				</button>
				<button
					type="button"
					onClick={() => jumpToAdjacentBookmark("next")}
					disabled={bookmarks.length === 0}
					title="Jump to next bookmark (])"
				>
					Bookmark ▶
				</button>
				{bookmarks.length > 0 ? (
					<div className="teleprompter-bookmarks">
						{bookmarks.map((top, i) => (
							<span className="bookmark-chip" key={top}>
								<button type="button" onClick={() => jumpToBookmark(top)}>
									{i + 1}
								</button>
								<button
									type="button"
									className="bookmark-remove"
									onClick={() => removeBookmark(i)}
									aria-label={`Remove bookmark ${i + 1}`}
								>
									×
								</button>
							</span>
						))}
					</div>
				) : null}

				<button type="button" onClick={() => downloadTextFile("teleprompter-script.txt", getCurrentParagraphs())}>
					Download .txt
				</button>
				<button type="button" onClick={() => window.print()}>
					Download .pdf
				</button>
				<button type="button" className="ghost" onClick={() => onExit(getCurrentParagraphs())}>
					← Edit script
				</button>
			</div>

			{/* Rendered a second time, print-only, so exporting to PDF doesn't
			    capture the scroll clipping or the on-screen controls. Synced
			    from the editable copy right before printing. */}
			<div className="teleprompter-print" style={{ fontSize, textAlign: alignment, lineHeight }} ref={printRef} />
		</div>
	);
};
