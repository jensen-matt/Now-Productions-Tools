import type { GraphicEntry } from "./types";

type RenderMessage =
	| { type: "progress"; progress: number }
	| { type: "done"; token: string; filename: string }
	| { type: "error"; message: string };

export type RenderResult = { token: string; filename: string };

export async function renderGraphic(
	entry: GraphicEntry,
	onProgress: (progress: number) => void,
): Promise<RenderResult> {
	const res = await fetch("/api/render-graphic", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			kind: entry.kind,
			fields: entry.fields,
		}),
	});

	if (!res.body) {
		throw new Error("No response stream from server");
	}
	if (!res.ok && res.status !== 200) {
		const text = await res.text();
		throw new Error(text || `Render request failed (${res.status})`);
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			if (!line.trim()) continue;
			const message: RenderMessage = JSON.parse(line);
			if (message.type === "progress") {
				onProgress(message.progress);
			} else if (message.type === "done") {
				return { token: message.token, filename: message.filename };
			} else if (message.type === "error") {
				throw new Error(message.message);
			}
		}
	}

	throw new Error("Render stream ended without a result");
}

type SaveFilePicker = (opts: {
	suggestedName: string;
	types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{
	createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
}>;

// Downloads happen via a native save dialog when the browser supports the
// File System Access API (Chromium, on both Windows and macOS) so the
// destination is always the person's own choice, never a folder this app
// picked. Elsewhere (Safari, Firefox) it falls back to a normal browser
// download, governed by that browser's own download settings.
async function saveBlob(blob: Blob, filename: string, mimeType: string, description: string): Promise<void> {
	const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
	if (typeof picker === "function") {
		try {
			const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";
			const handle = await picker({
				suggestedName: filename,
				types: [{ description, accept: { [mimeType]: [extension] } }],
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err) {
			// User cancelled the save dialog — leave it at that, no fallback.
			if (err instanceof DOMException && err.name === "AbortError") return;
			// Anything else (e.g. a browser that half-implements the API) —
			// fall through to the plain download below.
		}
	}

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

/** Fetches a rendered file by its one-time token and saves it to a destination the user picks. */
export async function saveRender(token: string, filename: string): Promise<void> {
	const res = await fetch(`/api/download/${token}`);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || `Download failed (${res.status})`);
	}
	const blob = await res.blob();
	await saveBlob(blob, filename, "video/quicktime", "QuickTime Movie");
}

/** Bundles multiple rendered files (by token) into one zip and saves it to a destination the user picks. */
export async function saveZip(tokens: string[], zipName: string): Promise<void> {
	const res = await fetch("/api/download-zip", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tokens }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || `Zip download failed (${res.status})`);
	}
	const blob = await res.blob();
	await saveBlob(blob, zipName, "application/zip", "Zip Archive");
}
