export type RenderStatus = "idle" | "rendering" | "done" | "saving" | "saved" | "error";

export type Entry = {
	id: string;
	name: string;
	title: string;
	hasTitle2: boolean;
	title2: string;
	company: string;
	hasCustomWidth: boolean;
	width: number;
	status: RenderStatus;
	progress: number;
	token?: string;
	filename?: string;
	errorMessage?: string;
};

export const DEFAULT_WIDTH = 640;
