// Shared render logic used by the CLI (scripts/render.mjs) and both batch
// web apps (app/server.mjs). Bundling is cached across calls within the
// same process, so a long-lived server can render many entries — of any
// registered composition — without re-bundling each time.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

let bundleLocationPromise;

function getBundleLocation() {
	if (!bundleLocationPromise) {
		bundleLocationPromise = bundle({
			entryPoint: path.join(projectRoot, "src", "index.ts"),
		});
	}
	return bundleLocationPromise;
}

/**
 * @param {{ compositionId: string, inputProps: Record<string, unknown>, outputLocation: string, onProgress?: (progress: number) => void }} options
 */
export async function renderComposition({
	compositionId,
	inputProps,
	outputLocation,
	onProgress,
}) {
	const bundleLocation = await getBundleLocation();

	const composition = await selectComposition({
		serveUrl: bundleLocation,
		id: compositionId,
		inputProps,
	});

	await renderMedia({
		composition,
		serveUrl: bundleLocation,
		codec: "prores",
		proResProfile: "4444",
		pixelFormat: "yuva444p10le",
		imageFormat: "png",
		outputLocation,
		inputProps,
		muted: true,
		onProgress: onProgress
			? ({ progress }) => onProgress(progress)
			: undefined,
	});

	return outputLocation;
}

export { projectRoot };
