import { DEFAULT_WIDTH, type Entry } from "./types";

let counter = 0;
function nextId() {
	counter += 1;
	return `entry-${Date.now()}-${counter}`;
}

/**
 * One person per line: "Name, Title". Only the first comma splits
 * name from title — everything after it is the title verbatim, so
 * titles that themselves contain commas (e.g. "Sr. Director, Product
 * Marketing") stay on one line instead of being cut into a second line.
 * A second title line is never inferred from the paste; add it per-card
 * via the "Add second title line" toggle instead. Blank lines are
 * ignored.
 */
export function parseRoster(text: string): Entry[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const commaIndex = line.indexOf(",");
			const name = (commaIndex === -1 ? line : line.slice(0, commaIndex)).trim();
			const title = commaIndex === -1 ? "" : line.slice(commaIndex + 1).trim();
			return {
				id: nextId(),
				name,
				title,
				hasTitle2: false,
				title2: "",
				company: "",
				hasCustomWidth: false,
				width: DEFAULT_WIDTH,
				status: "idle",
				progress: 0,
			} satisfies Entry;
		});
}
