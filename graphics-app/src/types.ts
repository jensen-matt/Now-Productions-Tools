export type RenderStatus = "idle" | "rendering" | "done" | "saving" | "saved" | "error";

export type GraphicKind = "title" | "outro" | "quote";

export type TitleFields = { title: string; subtitle: string };
export type OutroFields = { heading: string; subtext: string };
export type QuoteFields = { quote: string; name: string; title: string };

type BaseEntry = {
	id: string;
	status: RenderStatus;
	progress: number;
	token?: string;
	filename?: string;
	errorMessage?: string;
};

export type GraphicEntry =
	| (BaseEntry & { kind: "title"; fields: TitleFields })
	| (BaseEntry & { kind: "outro"; fields: OutroFields })
	| (BaseEntry & { kind: "quote"; fields: QuoteFields });

export const KIND_LABELS: Record<GraphicKind, string> = {
	title: "Title Card",
	outro: "Outro Card",
	quote: "Quote Card",
};

// Maps to the Remotion composition id registered in src/Root.tsx.
export const COMPOSITION_IDS: Record<GraphicKind, string> = {
	title: "TitleCard",
	outro: "OutroCard",
	quote: "QuoteCard",
};

let counter = 0;
function nextId(): string {
	counter += 1;
	return `graphic-${Date.now()}-${counter}`;
}

export function createEntry(kind: GraphicKind): GraphicEntry {
	const base = { id: nextId(), status: "idle" as const, progress: 0 };
	if (kind === "title") {
		return { ...base, kind, fields: { title: "", subtitle: "" } };
	}
	if (kind === "outro") {
		return { ...base, kind, fields: { heading: "", subtext: "" } };
	}
	return { ...base, kind, fields: { quote: "", name: "", title: "" } };
}

// True once the entry's required field(s) are filled — mirrors the
// Lower Third Generator's name/title gate on the Render button.
export function isRenderable(entry: GraphicEntry): boolean {
	if (entry.kind === "title") return entry.fields.title.trim().length > 0;
	if (entry.kind === "outro") return entry.fields.heading.trim().length > 0;
	return entry.fields.quote.trim().length > 0;
}
