// .txt/.md are read directly in-browser; anything else (.docx, .pdf) is
// sent here for server-side text extraction.
const PLAIN_TEXT_EXTENSIONS = [".txt", ".md"];

function hasExtension(filename: string, extensions: string[]): boolean {
	const lower = filename.toLowerCase();
	return extensions.some((ext) => lower.endsWith(ext));
}

export function isPlainTextFile(file: File): boolean {
	return hasExtension(file.name, PLAIN_TEXT_EXTENSIONS) || file.type === "text/plain";
}

export async function readPlainTextFile(file: File): Promise<string> {
	return file.text();
}

export async function parseFileOnServer(file: File): Promise<string> {
	const body = new FormData();
	body.append("file", file);

	const res = await fetch("/api/parse-file", { method: "POST", body });
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error || `Couldn't read "${file.name}" (${res.status})`);
	}
	return data.text;
}

export async function extractTextFromFile(file: File): Promise<string> {
	if (isPlainTextFile(file)) return readPlainTextFile(file);
	return parseFileOnServer(file);
}
