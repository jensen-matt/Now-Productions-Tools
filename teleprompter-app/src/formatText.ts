// Normalizes a rough talk track into clean paragraphs for teleprompter
// display. Deliberately does not try to re-break lines at clause
// boundaries — the teleprompter view's CSS (large font, capped line
// width, generous line-height) already keeps wrapped lines readable, so
// duplicating that with a text-splitting heuristic here would just be
// two systems fighting over the same job.
export function formatTalkTrack(raw: string): string[] {
	const normalized = raw.replace(/\r\n?/g, "\n");

	return normalized
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim())
		.filter((paragraph) => paragraph.length > 0);
}
