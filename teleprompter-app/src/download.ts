export function downloadTextFile(filename: string, paragraphs: string[]): void {
	const blob = new Blob([paragraphs.join("\n\n")], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
