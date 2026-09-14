export type RenderStatus = "idle" | "rendering" | "done" | "error";

export type Entry = {
	id: string;
	name: string;
	title: string;
	hasTitle2: boolean;
	title2: string;
	hasCustomWidth: boolean;
	width: number;
	status: RenderStatus;
	progress: number;
	outputPath?: string;
	errorMessage?: string;
};

export const DEFAULT_WIDTH = 640;
