import type { Entry } from "./types";

type RenderMessage =
	| { type: "progress"; progress: number }
	| { type: "done"; outputPath: string }
	| { type: "error"; message: string };

export async function renderEntry(
	entry: Entry,
	outputDir: string,
	onProgress: (progress: number) => void,
): Promise<string> {
	const res = await fetch("/api/render", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: entry.name,
			title: entry.title,
			title2: entry.hasTitle2 ? entry.title2 : "",
			width: entry.hasCustomWidth ? entry.width : undefined,
			outputDir,
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
				return message.outputPath;
			} else if (message.type === "error") {
				throw new Error(message.message);
			}
		}
	}

	throw new Error("Render stream ended without a result");
}

/** Opens a native folder picker (macOS only). Returns null if the user cancels. */
export async function chooseFolder(): Promise<string | null> {
	const res = await fetch("/api/choose-folder", { method: "POST" });
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error || `Folder picker failed (${res.status})`);
	}
	if (data.cancelled) return null;
	return data.path;
}
